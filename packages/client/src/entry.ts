import { ACCOUNT_MENU_ATTR, HANDOFF_ATTR, HERO_MENU_ATTR, HOLDS_ATTR, MORE_MENU_ATTR, PACKAGE_NAME, PART_ATTR, QUIET_ATTR, READER_HOLD_ATTR } from './constants'
import { installParts } from '@dsh-claude-style/engine/parts'
import { installPageScale } from './shared/page-scale'
import { adoptSkin } from '@dsh-claude-style/engine/skin'
import { motionReduced } from './core/prefs'
import { setHostContext } from './core/host-context'
import { loadHdsl, loadUsername } from './shared/identity'
import { installWebfonts } from './shared/webfonts'
import type { HostContext } from '@dsh-claude-style/engine/host'
import { loadModelCopy } from './features/model/model-copy'
import { installExternalControls } from './core/external-controls'
import { mountModelPicker } from './features/model/external'
import { adoptPrefs, adoptSettingsForm, clearPrefsAttributes, disposePrefsBinding, prefs, readPrefs, retireComposerRestyle, retireFooterTakeover, subscribePrefs } from './core/prefs'
import { reportFeatureFailure } from '@dsh-claude-style/engine/scheduler'
import { installScheduler } from './core/scheduler'
import type { HandleName, Ui } from './core/scheduler'
import { installPageVisibility } from './core/page-visibility'
import { mountStylesheet, parkForeignSheets } from './core/stylesheet'
import { peerPresent, subscribePeerPresence } from './shared/peer-plugin'
import { pageOwner, subscribePageOwner } from './shared/visual-owner'
import type { PageOwner } from './shared/visual-owner'
import { loadFeatureChunk } from './core/chunks'
import { handleName, setFeatureRegistry } from './core/feature'
import type { Feature, FeatureInstall } from './core/feature'
import { FEATURES } from 'virtual:dsh-claude-style/features'
import { BUILD_ID } from 'virtual:dsh-claude-style/generated'

// The engine runs on the skin's own vocabulary: the attributes this package
// writes, and the two answers only the skin can give (D73). Handed over before
// anything installs, and before the module-scope sweep below reads any of it.
adoptSkin({
  packageName: PACKAGE_NAME,
  quiet: QUIET_ATTR,
  readerHold: READER_HOLD_ATTR,
  motionReduced,
})

// At module scope on purpose: the sweep runs right after this factory
// returns, so an `apply()` body would be too late. The head watch
// (shared/peer-plugin.ts) covers the sheets that arrive later.
parkForeignSheets()

/**
 * Whether a feature comes and goes during the generation: its preference is a
 * switch, or it yields to a plugin that can arrive or leave.
 */
const isLive = (feature: Feature) => feature.pref !== undefined || feature.yieldsTo !== undefined

/** Boolean switches default on; choice switches require a listed value and no yielding peer. */
function isWanted(feature: Feature) {
  if (feature.pref !== undefined) {
    const value = readPrefs()[feature.pref]
    const on = feature.prefValues === undefined
      ? value !== false
      : typeof value === 'string' && feature.prefValues.includes(value)
    if (!on) return false
  }
  return feature.yieldsTo === undefined || !peerPresent(feature.yieldsTo)
}

/**
 * The features that stay while another owner has the page (D74). A skin takes
 * the page whole: the way back is the skin center's own row for this theme.
 * Beside ds-bot's Bot surface the Chat / Code switch stays, because it is the
 * reader's way back to the theme's own interface and carries the one sheet
 * that reads the host's tokens alone.
 */
const KEPT_FOR: Record<PageOwner, string[]> = {
  'skin': [],
  'ds-bot': ['surface'],
}

export function apply(ctx: HostContext) {
  const body = document.body
  const ui: Ui = { retire }
  /** Installed features in install order, as `{ id, handle, stop }`. */
  let installed: { id: string, handle: HandleName | null, stop: () => void }[] = []
  /** Features retired after failing: a preference flip never brings one back this generation. */
  const failed = new Set<string>()
  /** Unsubscribes the live features from the preferences; set once the features install. */
  let offSwitches: (() => void) | null = null
  /** Keeps the other chat plugin's presence watch alive; set once the features install. */
  let offPeerWatch: (() => void) | null = null
  /** Watches the page owners' marks; D74. */
  let offOwnerWatch: (() => void) | null = null
  /** Unmounts this generation's stylesheet; set once the sheet is mounted. */
  let stopStylesheet: (() => void) | null = null
  /** Unmounts the sheet registering the optional webfonts in place; set with that sheet. */
  let stopWebfonts: (() => void) | null = null
  /** Mirrors the page's visibility onto the document; set with the sheet that reads it. */
  let stopVisibility: (() => void) | null = null
  /** Carries the host's floating layer in a page drawn at a scale; set with the sheet that scales it. */
  let stopScale: (() => void) | null = null
  /** Stops the part-marking pass; set once the page is taken (D3). */
  let stopParts: (() => void) | null = null
  let stopExternalControls: (() => void) | null = null
  let disposed = false
  /** Who has the page while this theme stands down; null while the theme has it (D74). */
  let owner = pageOwner()

  /**
   * Give the page back, keeping the features `keep` names: run every other
   * feature's teardown and take this package's body attributes and stylesheet
   * away. A yield keeps the owner's KEPT_FOR features and the preference
   * binding: another plugin taking the screen uninstalls nothing of the
   * reader's (D74).
   */
  function release(keep: string[] = []) {
    // First, so no preference flip installs a feature mid-release.
    if (offSwitches !== null) {
      offSwitches()
      offSwitches = null
    }
    const kept = []
    for (let i = installed.length - 1; i >= 0; i--) {
      if (keep.includes(installed[i].id)) {
        kept.push(installed[i])
        continue
      }
      // One teardown must not block the rest (D12); a failing one is reported.
      try { installed[i].stop() } catch (error) { reportError(error) }
    }
    installed = kept.reverse()
    // Each body attribute goes with whoever writes it: a feature's own with
    // its teardown above, the preference mirror's here, the stamps last.
    clearPrefsAttributes()
    body.removeAttribute('data-dsh-claude-style')
    body.removeAttribute(HANDOFF_ATTR)
    // The visibility mark is the sheet's to read, so it goes before the sheet does.
    if (stopVisibility !== null) {
      stopVisibility()
      stopVisibility = null
    }
    // This generation's own sheet, handed over rather than taken away when a
    // newer generation has mounted after it (mountStylesheet). The carried layer
    // goes with it: it is this sheet's own zoom those cards are carried under.
    if (stopScale !== null) {
      stopScale()
      stopScale = null
    }
    if (stopStylesheet !== null) {
      stopStylesheet()
      stopStylesheet = null
    }
    if (stopWebfonts !== null) {
      stopWebfonts()
      stopWebfonts = null
    }
    // Last: the part marks name host elements for the sheet, and the features
    // above may have stamped a menu card the pass had marked (D3).
    if (stopParts !== null) {
      stopParts()
      stopParts = null
    }
  }

  /**
   * Undo everything this generation installed. Idempotent: the host runs it
   * on dispose (the effect below), and own() runs it itself when the
   * scheduler cannot be installed.
   */
  function teardown() {
    if (disposed) return
    disposed = true
    if (offOwnerWatch !== null) {
      offOwnerWatch()
      offOwnerWatch = null
    }
    release()
    if (offPeerWatch !== null) {
      offPeerWatch()
      offPeerWatch = null
    }
    if (stopExternalControls !== null) {
      stopExternalControls()
      stopExternalControls = null
    }
    setHostContext(null)
    disposePrefsBinding()
  }

  // Registered before anything is installed: registered last, a feature that
  // threw half-way through left the stylesheet and every listener installed
  // so far on the page with no teardown the host could ever run.
  ctx.effect(() => teardown, 'dsh-claude-style: Claude Code desktop theme')

  /**
   * Switch one feature off for the rest of this generation: run its own
   * teardown, and give back the host surface it had taken over. The footer
   * takeover and the composer restyle HIDE host controls (their gates are
   * body attributes the preferences and the composer pass write), so with
   * the feature gone they must stop hiding them. The permission control's
   * own hiding rules key on the attribute its teardown removes, so it needs
   * no branch here. The scheduler calls this for a sync that keeps failing.
   *
   * `name` may be the feature's id or its handle name. The scheduler retires
   * a failing sync through the handle; a handle that differs from the install
   * name (settings → settingsNav) stops the sync alone — the failure counter
   * already refuses the next pass, and the install keeps running so the
   * settings page stays.
   */
  function retire(name: string) {
    failed.add(name)
    const index = installed.findIndex(entry => entry.id === name || entry.handle === name)
    // A handle-only match does not tear the install down.
    if (index !== -1 && installed[index].id === name) {
      const { stop, handle } = installed[index]
      installed.splice(index, 1)
      // The handle goes with the install: with it left on `ui`, every pass and
      // every pointer, key and activity event would still reach a feature that
      // has been torn down (applySwitch drops it the same way).
      if (handle !== null) delete ui[handle]
      // Retiring goes through even when the feature's own teardown fails too.
      try { stop() } catch (error) { reportError(error) }
    }
    if (name === 'footer') retireFooterTakeover()
    if (name === 'composer') retireComposerRestyle()
  }

  /**
   * Install one piece in isolation. One that throws is reported and retired,
   * and the rest of the skin carries on without it.
   * @param id - the failure report's label and the teardown's key.
   * @param handle - the name the piece registers on `ui`; null for the scheduler, which registers none.
   * @returns whether the piece installed.
   */
  function install(id: string, handle: HandleName | null, run: () => (() => void) | void) {
    try {
      const stop = run()
      if (typeof stop === 'function') installed.push({ id, handle, stop })
      return true
    } catch (error) {
      reportFeatureFailure(id, error)
      retire(id)
      return false
    }
  }

  /** The deferred features' installs that have arrived this generation, by id (D72). */
  const arrived = new Map<string, FeatureInstall>()
  /** The deferred features whose chunk is on its way. */
  const awaited = new Set<string>()

  /**
   * Install one feature, or, for a deferred one whose chunk has not arrived
   * yet, send for the chunk: the arrival installs it (D72).
   */
  function installFeature(feature: Feature) {
    if (feature.chunk === undefined) {
      const run = feature.install
      install(feature.id, handleName(feature), () => run(ctx, ui))
      return
    }
    const run = arrived.get(feature.id)
    if (run === undefined) awaitFeature(feature, feature.chunk)
    else install(feature.id, handleName(feature), () => run(ctx, ui))
  }

  /**
   * Whether a feature whose chunk just arrived still belongs on the page: the
   * page may have been given to another owner (only its KEPT_FOR features
   * stay, D74), the feature switched off, or the generation ended while the
   * chunk was on its way.
   */
  function belongs(feature: Feature) {
    if (disposed || failed.has(feature.id) || installed.some(entry => entry.id === feature.id)) return false
    if (owner !== null && !KEPT_FOR[owner].includes(feature.id)) return false
    return !isLive(feature) || isWanted(feature)
  }

  /**
   * Fetch a deferred feature's chunk once and install the feature on arrival
   * if it still belongs. A chunk that cannot load is the feature failing to
   * install: reported once, and the feature retires (D12).
   */
  function awaitFeature(feature: Feature, chunk: string) {
    if (awaited.has(feature.id)) return
    awaited.add(feature.id)
    loadFeatureChunk(chunk).then((run) => {
      awaited.delete(feature.id)
      arrived.set(feature.id, run)
      if (!belongs(feature)) return
      install(feature.id, handleName(feature), () => run(ctx, ui))
      // The feature's handle joins the next pass, which nothing else asks for.
      if (typeof ui.schedule === 'function') ui.schedule()
    }, (error: unknown) => {
      awaited.delete(feature.id)
      // This generation is gone (a hot reload replaced it): reporting names a
      // feature nobody is left to install, and retiring has nothing to retire.
      if (disposed) return
      reportFeatureFailure(feature.id, error)
      retire(feature.id)
    })
  }

  /**
   * Bring a live feature in line with its switch and the plugins it yields to
   * (isWanted): wanted installs it, unwanted runs its teardown and drops its
   * handle, which hands its surface back to the host. Runs at startup and on
   * every preference adoption — the other plugin arriving or leaving re-runs
   * that stream too (packages/client/src/shared/peer-plugin.ts) — so neither needs a reload.
   * A feature retired after failing stays retired.
   */
  function applySwitch(feature: Feature) {
    const handle = handleName(feature)
    const wanted = isWanted(feature)
    const index = installed.findIndex(entry => entry.id === feature.id)
    if (wanted && index === -1 && !failed.has(feature.id)) {
      installFeature(feature)
      return
    }
    if (wanted || index === -1) return
    const stop = installed[index].stop
    installed.splice(index, 1)
    delete ui[handle]
    // Isolation (D12): a teardown that throws is reported, and the feature
    // stays off for the rest of the generation.
    try {
      stop()
    } catch (error) {
      reportFeatureFailure(feature.id, error)
      failed.add(feature.id)
    }
  }

  /**
   * Stand down for another owner (D74): install the features it leaves on the
   * page that are not installed yet — a page booting yielded, or going from
   * one owner to the other — and release the rest. A kept feature that is
   * deferred installs when its chunk arrives (D72).
   */
  function yieldTo(next: PageOwner) {
    const keep = KEPT_FOR[next]
    for (const feature of FEATURES) {
      if (!keep.includes(feature.id) || failed.has(feature.id) || installed.some(entry => entry.id === feature.id)) continue
      installFeature(feature)
    }
    release(keep)
  }

  /**
   * Take the page: stamp, mount the sheet, install the features, schedule.
   * Idempotent over what is already installed, so taking the page back after
   * a yield leaves the features it kept alone (D74); a feature retired after
   * failing stays retired (D12).
   *
   * FEATURES is the registry the build generates from the manifests (D72),
   * in install order; the scheduler's pass order is the same order. A feature
   * with a `pref` follows that switch and the plugins it yields to; a feature
   * that only reads preferences installs once. A deferred feature installs
   * when its chunk arrives, after this pass and the scheduler (D72).
   */
  function own() {
    // The value is the build id (scripts/build.mjs): the stylesheet keys on
    // the attribute alone, and a live page reads which lib/client.js it runs.
    body.setAttribute('data-dsh-claude-style', BUILD_ID)
    // The handoff marker rides the live stamp: its presence is what lets the
    // skin center offer this theme as a selectable look (D74).
    body.setAttribute(HANDOFF_ATTR, BUILD_ID)
    adoptPrefs(prefs)
    // The sheet carries this package's own tags and is unmounted by
    // release(); the features install onto a page that already wears it.
    if (stopStylesheet === null) stopStylesheet = mountStylesheet()
    // The faces the reader supplied are declared apart from the sheet, once the
    // host half says which ones the drop point holds (shared/webfonts.ts).
    if (stopWebfonts === null) stopWebfonts = installWebfonts()
    // The page's visibility, mirrored for the sheet just mounted and for the
    // clocks in script that stop with it (core/page-visibility.ts).
    if (stopVisibility === null) stopVisibility = installPageVisibility()
    // Before the features: every rule they and the theme's own sheets write
    // reads the part names this pass puts on the host's elements (D3). A batch
    // that moved a mark asks for one more pass, so a feature that measures what
    // the marks style reads the settled numbers; the scheduler is installed
    // below, so `schedule` is looked up when the batch runs.
    if (stopParts === null) {
      stopParts = installParts({
    part: PART_ATTR,
    holds: HOLDS_ATTR,
    regions: { account: ACCOUNT_MENU_ATTR, hero: HERO_MENU_ATTR, more: MORE_MENU_ATTR },
  }, () => {
        if (typeof ui.schedule === 'function') ui.schedule()
      })
    }
    // With the sheet: the page is drawn at the reader's own scale from here on,
    // and the host's floating cards are carried under it (engine/src/scaled-layer.ts).
    if (stopScale === null) stopScale = installPageScale()
    for (const feature of FEATURES) {
      if (failed.has(feature.id) || installed.some(entry => entry.id === feature.id)) continue
      if (isLive(feature)) applySwitch(feature)
      else installFeature(feature)
    }
    if (offSwitches === null) {
      offSwitches = subscribePrefs(() => {
        for (const feature of live) applySwitch(feature)
        if (typeof ui.schedule === 'function') ui.schedule()
      })
    }
    // Last: its passes read the `ui` handles lazily. Without it nothing syncs,
    // and a live stylesheet over overrides that never run is worse than no
    // skin at all — so if it cannot install, the whole skin rolls back.
    if (installed.some(entry => entry.id === 'scheduler')) return
    if (!install('scheduler', null, () => installScheduler(ctx, ui, handleNames))) teardown()
  }

  setHostContext(ctx)
  stopExternalControls = installExternalControls({ 'model-picker': options => mountModelPicker(ctx, options) })
  // Bind the official settings form before anything reads a preference:
  // the host serves namespaces through `ctx.configForms`. Bound once here,
  // and retried when the settings page installs.
  adoptSettingsForm(ctx)
  // The service can mount after this plugin: wait for it declaratively and
  // bind then, so the first settings change never meets an unbound store.
  if (typeof ctx.inject === 'function') ctx.inject(['configForms'], () => { adoptSettingsForm(ctx) })
  loadModelCopy()
  loadUsername()
  loadHdsl()
  // Preferences are read asynchronously from the host settings namespace;
  // applying the defaults first keeps every gated rule in a defined state
  // for the frames before that read settles, and is exactly the shipped
  // behaviour when it never does. This runs while yielded too, so the page
  // comes back wearing the reader's own values (D74).
  adoptPrefs(prefs)

  setFeatureRegistry(FEATURES)
  const live = FEATURES.filter(isLive)
  const handleNames = FEATURES.map(handleName)
  // Keep the presence watch alive for the page's lifetime: another plugin
  // arriving or leaving re-runs the preference stream, which brings the
  // features that yield to it in or out (packages/client/src/shared/peer-plugin.ts). The
  // subscription itself carries no logic.
  offPeerWatch = subscribePeerPresence(() => {})
  // An owner can arrive or leave whichever way the page booted; the
  // verdict is read again on every change rather than remembered (D74).
  offOwnerWatch = subscribePageOwner(next => {
    if (next === owner) return
    owner = next
    if (next === null) own()
    else yieldTo(next)
  })

  // Another owner already has this page (D74): adoptPrefs mirrors nothing
  // onto it, and the release leaves the owner's KEPT_FOR features alone.
  if (owner !== null) yieldTo(owner)
  else own()
}
