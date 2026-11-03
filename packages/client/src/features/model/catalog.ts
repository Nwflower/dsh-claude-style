import { MODEL_EFFORT_DEFAULT } from './model-labels'
import { currentSessionId, hostModelDirectories, hostSessions } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { HostModelCatalogSnapshot, HostModelDirectory, HostModelEntry, HostModelGroup, HostModelReasoning } from '@dsh-claude-style/contracts/services'
import { notifyAll } from '@dsh-claude-style/engine/notify'

/** One provider the catalog lists, with how many models it carries. */
export interface CatalogProvider {
  id: string
  name: string
  count: number
}

/** The catalog handle createModelCatalog returns. */
export type ModelCatalog = ReturnType<typeof createModelCatalog>

/**
 * Model catalog: the per-session ModelDirectory and its reactive store — the
 * catalog half of the model picker feature. It reaches outside its own closure
 * only through its options — `ctx` (the host context, for
 * `sessions` / `modelDirectories`) and `schedule()` (the scheduler
 * wake-up the directory's store subscription calls). The directory
 * instance, the session id, the warm-up flag, the last usable snapshot and the
 * provider listeners stay in this closure and are handed back through the
 * returned handle.
 *
 * The host re-enumerates the whole directory after every selection, and for
 * seconds its snapshot can carry no groups and no seat. That window is one
 * fact, so it is held here once rather than in each reader: `snapshot()`
 * answers with the last directory that named the seat, and `inFlight()` is the
 * loading state a reader asks for by name.
 *
 * @param options - { ctx, schedule }.
 */
export function createModelCatalog(options: { ctx: HostContext, schedule?: () => void, directory?: HostModelDirectory }) {
  const ctx = options.ctx
  const schedule = options.schedule
  let modelSub: (() => void) | null = null
  let modelDir: HostModelDirectory | null = null
  let modelSessionId: string | null = null
  let modelWarmRequested = false
  /** The last snapshot that could name the seat, kept while the host re-enumerates (readers' one copy). */
  let lastGood: HostModelCatalogSnapshot | null = null
  /** Settings-page listeners waiting on the provider list. */
  const providerListeners: ((providers: CatalogProvider[]) => void)[] = []

  /**
   * The current session id. The Session Controller dropped
   * `list.current` in dsh 0.2 (the main-view selection now comes from the
   * `uiSession` projection), so this MUST go through the shared
   * currentSessionId() in packages/engine/src/host.ts — reading the legacy
   * field directly resolves to null on current hosts and the picker never
   * loads.
   */
  function currentModelSessionId() {
    const sessions = hostSessions(ctx)
    if (sessions === undefined || sessions === null) return null
    return currentSessionId(ctx, sessions) ?? null
  }

  function dropSubscription() {
    if (modelSub) modelSub()
    modelSub = null
  }

  /** Resolve the session's directory (and observe it) once per session. */
  function directory() {
    if (options.directory !== undefined) {
      if (modelDir === options.directory) return modelDir
      dropSubscription()
      modelDir = options.directory
      modelSessionId = 'external'
      lastGood = null
      if (typeof modelDir.store?.subscribe === 'function') {
        modelSub = modelDir.store.subscribe(() => { notifyProviders(); if (schedule) schedule() })
      }
      return modelDir
    }
    const id = currentModelSessionId()
    if (id === null) {
      dropSubscription()
      modelDir = null
      modelSessionId = null
      lastGood = null
      return null
    }
    if (modelSessionId === id && modelDir !== null) return modelDir
    dropSubscription()
    modelDir = null
    modelSessionId = null
    // The catalogue belongs to the session: a snapshot standing in for one
    // session must never name a seat in the next.
    lastGood = null
    const dirs = hostModelDirectories(ctx)
    if (typeof dirs?.directoryFor === 'function') {
      try {
        modelDir = dirs.directoryFor(id)
      } catch (error) {
        // The host throws for a session id that has not materialized
        // its scope yet (ui-model-selection directoryFor): no directory
        // this time, and the next pass asks again.
        modelDir = null
      }
    }
    modelSessionId = id
    // The directory INSTANCE only carries load/select — its reactive state
    // hangs off the `.store` snapshot store (the host hands that same store
    // to its own menu as `directory`). Subscribe to the store, never to the
    // instance.
    if (typeof modelDir?.store?.subscribe === 'function') {
      modelSub = modelDir.store.subscribe(() => { notifyProviders(); if (schedule) schedule() })
    }
    return modelDir
  }

  /** The store's own answer, whether or not it can name the seat. */
  function fresh(): HostModelCatalogSnapshot | null {
    if (modelDir === null || !modelDir.store) return null
    return modelDir.store.getSnapshot()
  }

  /**
   * The directory as readers should see it: the host's own answer when it names
   * the seat, and otherwise the last one that did. A first load has no last
   * good yet, so it still hands the loading snapshot through and the picker
   * shows that the catalog is on its way.
   */
  function snapshot(): HostModelCatalogSnapshot | null {
    const answer = fresh()
    if (answer !== null && current(answer) !== null) {
      lastGood = answer
      return answer
    }
    return lastGood ?? answer
  }

  /**
   * Whether the host is re-enumerating the directory: the load before the first
   * list, or the whole selectModel round trip after every selection. The
   * snapshot stands on its last good through it, so a reader asks here when it
   * wants to show the loading state.
   */
  function inFlight(): boolean {
    const answer = fresh()
    if (answer === null) return true
    return answer.status === 'idle' || answer.status === 'loading' || answer.status === 'selecting'
  }

  /**
   * The catalog's providers, in catalog order, each with its model count.
   *
   * The settings page's quick-provider picker is the other consumer, and it
   * may be opened before the picker itself ever was — so this resolves the
   * directory and starts the shared catalog load rather than requiring a
   * first popover open.
   */
  function providers() {
    directory()
    warm()
    const snap = snapshot()
    const groups = (snap && snap.groups) || []
    const out: CatalogProvider[] = []
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].models.length === 0) continue
      out.push({ id: groups[i].id, name: groups[i].name || groups[i].id, count: groups[i].models.length })
    }
    return out
  }

  /** Tell the settings picker the provider list moved (catalog arrived, changed). */
  function notifyProviders() {
    if (providerListeners.length === 0) return
    notifyAll(providerListeners, providers())
  }

  /**
   * Start the host's model catalog load as soon as a session resolves, rather
   * than waiting for the first popover open.
   *
   * The catalog is one RPC per Host generation (`remote.session.modelCatalog`)
   * and nothing else fetches it: the host kicks it off from its own menu's
   * `show()`, and this skin hides that seat, so leaving it to the first open
   * pays the whole round-trip inside a popover the user is waiting on. Starting
   * it here moves that wait into the startup the user is already sitting
   * through, and the trigger's label needs the same catalog anyway: the current
   * model's name comes out of it. The load is shared and cached host-side, so
   * the popover's own `load()` becomes a no-op instead of a second request.
   *
   * Failures are the store's to report — the popover shows the error and the
   * host offers a retry — so this only has to avoid throwing into a pass.
   */
  function warm() {
    if (modelWarmRequested || modelDir === null || typeof modelDir.load !== 'function') return
    modelWarmRequested = true
    const pending = modelDir.load()
    if (pending && typeof pending.catch === 'function') {
      pending.catch(() => { /* surfaced by the store, not here */ })
    }
  }

  /** The current selection resolved to its group + model entries. */
  function current(snap: HostModelCatalogSnapshot | null): { group: HostModelGroup, model: HostModelEntry } | null {
    if (!snap || snap.current === null) return null
    for (let g = 0; g < snap.groups.length; g++) {
      const group = snap.groups[g]
      if (group.id !== snap.current.provider) continue
      for (let m = 0; m < group.models.length; m++) {
        if (group.models[m].id === snap.current.model) return { group, model: group.models[m] }
      }
    }
    return null
  }

  /** Reasoning metadata + the effective effort for the current model. */
  function effort(snap: HostModelCatalogSnapshot | null): { reasoning: HostModelReasoning, effective: string | undefined, label: string } | null {
    const active = current(snap)
    if (active === null || !active.model.reasoning || snap === null || snap.current === null) return null
    const reasoning = active.model.reasoning
    const selection = snap.current
    const effective = selection.reasoningEffort !== undefined ? selection.reasoningEffort : reasoning.defaultEffort
    let label = MODEL_EFFORT_DEFAULT
    if (effective !== undefined) {
      label = effective
      for (let i = 0; i < reasoning.efforts.length; i++) {
        if (reasoning.efforts[i].id === effective) {
          label = reasoning.efforts[i].name
          break
        }
      }
    }
    return { reasoning, effective, label }
  }

  /** Register a provider-list listener; the returned call removes it again. */
  function onProviders(listener: (providers: CatalogProvider[]) => void) {
    providerListeners.push(listener)
    return () => {
      const at = providerListeners.indexOf(listener)
      if (at !== -1) providerListeners.splice(at, 1)
    }
  }

  /** Drop the directory, its subscription and its standing snapshot (a feature switch-off). */
  function reset() {
    dropSubscription()
    modelDir = null
    modelSessionId = null
    lastGood = null
  }

  /** Let a fresh install warm the catalog again (teardown). */
  function resetWarm() {
    modelWarmRequested = false
  }

  return {
    directory,
    snapshot,
    inFlight,
    providers,
    notifyProviders,
    warm,
    current,
    effort,
    onProviders,
    reset,
    resetWarm
  }
}
