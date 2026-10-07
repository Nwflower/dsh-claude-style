import { BRAND_ATTR, COMPOSER_ATTR, FEATURE_PREF_DEFAULTS, FOOTER_ATTR, HANDOFF_ATTR, HOME_HERO_ATTR, HOME_LAYOUT_ATTR, MASCOT_ATTR, MOTION_ATTR, PALETTE_ATTR, TYPEFACE_ATTR, WINDOW_BLUR_ATTR } from './constants'
import { loadHdsl, loadUsername, setHostContext } from './core/host'
import type { HostContext } from './core/host'
import { loadModelCopy } from './core/model-copy'
import { adoptPrefs, adoptSettingsForm, disposePrefsBinding, prefs, readPrefs, retireComposerRestyle, retireFooterTakeover, subscribePrefs } from './core/prefs'
import { installScheduler, reportFeatureFailure } from './core/scheduler'
import type { Ui } from './core/scheduler'
import { mountStylesheet, parkForeignSheets } from './core/stylesheet'
import { peerPresent, subscribePeerPresence } from './shared/peer-plugin'
import { externalOwnerActive, subscribeExternalOwner } from './shared/visual-owner'
import { setFeatureRegistry } from './core/feature'
import type { Feature } from './core/feature'
import { FEATURES } from 'virtual:dsh-claude-style/features'
import { BUILD_ID } from 'virtual:dsh-claude-style/generated'

// At module scope on purpose: the sweep runs right after this factory
// returns, so an `apply()` body would be too late. The head watch
// (shared/peer-plugin.ts) covers the sheets that arrive later.
parkForeignSheets()

/** A feature its preference switches on and off live (a key of FEATURE_PREF_DEFAULTS). */
type SwitchedFeature = Feature & { pref: keyof typeof FEATURE_PREF_DEFAULTS }

const isSwitched = (feature: Feature): feature is SwitchedFeature => Object.hasOwn(FEATURE_PREF_DEFAULTS, feature.pref ?? '')

/**
 * Whether a feature comes and goes during the generation: its preference is
 * a live switch, or it yields to a plugin that can arrive or leave.
 */
const isLive = (feature: Feature) => isSwitched(feature) || feature.yieldsTo !== undefined

/** Whether a live feature is wanted now: its switch is on and no plugin it yields to is on the page. */
function isWanted(feature: Feature) {
  if (isSwitched(feature) && readPrefs()[feature.pref] === false) return false
  return feature.yieldsTo === undefined || !peerPresent(feature.yieldsTo)
}

export function apply(ctx: HostContext) {
  const body = document.body
  const ui: Ui = { retire }
  /** Installed features in install order, as `{ id, handle, stop }`. */
  let installed: { id: string, handle: string, stop: () => void }[] = []
  /** Features retired after failing: a preference flip never brings one back this generation. */
  const failed = new Set<string>()
  /** Unsubscribes the live features from the preferences; set once the features install. */
  let offSwitches: (() => void) | null = null
  /** Keeps the other chat plugin's presence watch alive; set once the features install. */
  let offPeerWatch: (() => void) | null = null
  /** Watches the skin center's stamp on the page; D49. */
  let offOwnerWatch: (() => void) | null = null
  /** Unmounts this generation's stylesheet; set once the sheet is mounted. */
  let stopStylesheet: (() => void) | null = null
  let disposed = false
  /** True while a skin owns the page and this theme stands down (D49). */
  let yielded = externalOwnerActive()

  /**
   * Give the page back, keeping the features `keep` names: run every other
   * feature's teardown and take this package's body attributes and stylesheet
   * away. A yield keeps the settings section and the preference binding: the
   * reader must still reach the plugin's own page, and another plugin taking
   * the screen uninstalls nothing of the reader's (D49).
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
    body.removeAttribute('data-dsh-claude-style')
    body.removeAttribute(HANDOFF_ATTR)
    body.removeAttribute(BRAND_ATTR)
    body.removeAttribute(PALETTE_ATTR)
    body.removeAttribute(TYPEFACE_ATTR)
    body.removeAttribute(MASCOT_ATTR)
    body.removeAttribute(MOTION_ATTR)
    body.removeAttribute(FOOTER_ATTR)
    body.removeAttribute(COMPOSER_ATTR)
    body.removeAttribute(HOME_LAYOUT_ATTR)
    body.removeAttribute(HOME_HERO_ATTR)
    body.removeAttribute(WINDOW_BLUR_ATTR)
    // This generation's own sheet, handed over rather than taken away when a
    // newer generation has mounted after it (mountStylesheet).
    if (stopStylesheet !== null) {
      stopStylesheet()
      stopStylesheet = null
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
      const stop = installed[index].stop
      installed.splice(index, 1)
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
   * @param handle - the name the piece registers on `ui`.
   * @returns whether the piece installed.
   */
  function install(id: string, handle: string, run: () => (() => void) | void) {
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

  const installFeature = (feature: Feature) => install(feature.id, feature.handle ?? feature.id, () => feature.install(ctx, ui))

  /**
   * Bring a live feature in line with its switch and the plugins it yields to
   * (isWanted): wanted installs it, unwanted runs its teardown and drops its
   * handle, which hands its surface back to the host. Runs at startup and on
   * every preference adoption — the other plugin arriving or leaving re-runs
   * that stream too (packages/client/src/shared/peer-plugin.ts) — so neither needs a reload.
   * A feature retired after failing stays retired.
   */
  function applySwitch(feature: Feature) {
    const handle = feature.handle ?? feature.id
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
   * Take the page: stamp, mount the sheet, install the features, schedule.
   * Idempotent over what is already installed, so taking the page back after
   * a yield leaves the settings section alone (D49); a feature retired after
   * failing stays retired (D12).
   *
   * FEATURES is the registry the build generates from the manifests (D42),
   * in install order; the scheduler's pass order is the same order. A live
   * feature follows its switch and the plugins it yields to; the rest
   * install once. A `pref` outside FEATURE_PREF_DEFAULTS is read by the
   * feature itself.
   */
  function own() {
    // The value is the build id (scripts/build.mjs): the stylesheet keys on
    // the attribute alone, and a live page reads which lib/client.js it runs.
    body.setAttribute('data-dsh-claude-style', BUILD_ID)
    // The handoff marker rides the live stamp: its presence is what lets the
    // skin center offer this theme as a selectable look (D49).
    body.setAttribute(HANDOFF_ATTR, BUILD_ID)
    adoptPrefs(prefs)
    // The sheet carries this package's own tags and is unmounted by
    // release(); the features install onto a page that already wears it.
    if (stopStylesheet === null) stopStylesheet = mountStylesheet()
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
    if (!install('scheduler', 'scheduler', () => installScheduler(ctx, ui, handleNames))) teardown()
  }

  setHostContext(ctx)
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
  // behaviour when it never does. This runs while yielded too: the reader
  // must still reach the settings page and see their own values (D49).
  adoptPrefs(prefs)

  setFeatureRegistry(FEATURES)
  const live = FEATURES.filter(isLive)
  const handleNames = FEATURES.map(feature => feature.handle ?? feature.id)
  // Keep the presence watch alive for the page's lifetime: another plugin
  // arriving or leaving re-runs the preference stream, which brings the
  // features that yield to it in or out (packages/client/src/shared/peer-plugin.ts). The
  // subscription itself carries no logic.
  offPeerWatch = subscribePeerPresence(() => {})
  // A skin can arrive or leave whichever way the page booted; the
  // verdict is read again on every flip rather than remembered (D49).
  offOwnerWatch = subscribeExternalOwner(active => {
    if (active === yielded) return
    yielded = active
    if (active) release(['settings'])
    else own()
  })

  if (yielded) {
    // A skin already has this page (D49). The settings section is the
    // one feature that stays: the reader still has to reach this theme's own
    // page. adoptPrefs above stamped this theme's own body attributes; a
    // yielded page carries none of them, so the release strips exactly what
    // it stamped and leaves the section alone.
    installFeature(FEATURES.find(feature => feature.id === 'settings')!)
    release(['settings'])
    return
  }
  own()
}
