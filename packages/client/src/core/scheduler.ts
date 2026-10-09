import { closestComposerCard, findComposerCard, onHdslLoaded, onUsernameLoaded } from './host'
import { onModelCopyLoaded } from './model-copy'
import { loadPrefs, refreshMotionAttribute, subscribePrefs } from './prefs'
import type { HostContext } from './host'
import { observeSize, subscribeMutations } from './bus'
import { requestFrame } from './frame'
import { closestFrom } from '../shared/dom'
import type { FooterHandle } from '../features/account/account-footer'
import type { BanHandle } from '../features/ban-screen/ban-screen'
import type { ChatFoldHandle } from '../features/chat-fold/chat-fold'
import type { ComposerHandle } from '../features/composer/composer'
import type { ModelHandle } from '../features/model/model-picker'
import type { PeakRateHandle } from '../features/peakrate/peakrate'
import type { QuickProvidersHandle } from '../features/settings/quick-providers'

/** Why the scheduler asks a feature to close. Features ignore the reasons they do not act on. */
export type CloseReason = 'outside' | 'escape' | 'composer'

/**
 * A feature's handle on the shared `ui` registry. Every hook is optional: the
 * scheduler calls the ones a feature implements and skips the rest (D42).
 */
export interface FeatureHandle {
  /** Every scheduler pass, in FEATURES order. */
  sync?(): void
  /** Whether the press landed inside the feature's own DOM; a press it does not own closes it through `close('outside')`. */
  owns?(target: Node): boolean
  /** Every press. */
  onPointerDown?(target: EventTarget | null): void
  close?(reason?: CloseReason): void
  /** A composer-input event. */
  onInput?(target: EventTarget | null): void
  /** Every focusin, after the composer route. */
  onFocusIn?(target: HTMLElement): void
  /** `'viewport'` (page scroll or resize) or `'composer'` (the composer card changed size). */
  reposition?(reason: 'viewport' | 'composer'): void
  /** The locale, the preferences or the model copy changed. */
  onCopyChange?(): void
  /** Every keydown, after the Esc route; a feature that takes the key calls `event.preventDefault()` itself. */
  onKey?(event: KeyboardEvent): void
  /** The reader moved the pointer, pressed it or pressed a key (the skin's own synthetic Esc aside). */
  onActivity?(): void
  /** The feature's own teardown, for a handle that also hands it to its install. */
  teardown?(): void
}

/**
 * Every feature's handle, under the name it registers on `ui` (its manifest's
 * `handle`, or its `id`). A feature that other features read publishes a
 * handle type of its own; the others are plain scheduler hooks.
 */
export interface Handles {
  selection: FeatureHandle
  composer: ComposerHandle
  homeLayout: FeatureHandle
  mascot: FeatureHandle
  copy: FeatureHandle
  permissions: FeatureHandle
  contextStats: FeatureHandle
  chatProcess: FeatureHandle
  chatReader: FeatureHandle
  model: ModelHandle
  peakrate: PeakRateHandle
  effort: FeatureHandle
  heroMenu: FeatureHandle
  quickProviders: QuickProvidersHandle
  footer: FooterHandle
  ban: BanHandle
  themeFlip: FeatureHandle
  workspace: FeatureHandle
  search: FeatureHandle
  turnStatus: FeatureHandle
  turnNav: FeatureHandle
  chatFollow: FeatureHandle
  chatFold: ChatFoldHandle
  chatReveal: FeatureHandle
  chatFiles: FeatureHandle
  chatSend: FeatureHandle
  caret: FeatureHandle
  viewTabs: FeatureHandle
  headerBand: FeatureHandle
  settingsNav: FeatureHandle
}

export type HandleName = keyof Handles

/** The two calls on `ui` that are no feature's: entry.ts and the scheduler put them there. */
export interface UiCalls {
  /** Ask for a pass on the next frame (installScheduler). */
  schedule?: () => void
  /** Switch one feature off for the rest of this generation (entry.ts). */
  retire: (name: string) => void
}

/**
 * The whole registry, as entry.ts and the scheduler hold it: each installed
 * feature's handle under its handle name. A feature sees only its own part of
 * it (FeatureUi in core/feature.ts): its handle and the ones its manifest
 * `reads`.
 */
export type Ui = UiCalls & { [K in HandleName]?: Handles[K] }
/** Say once, loudly, that a feature was switched off: the console line is its only trace. */
export function reportFeatureFailure(name: string, error: unknown) {
  console.error(`[dsh-claude-style] "${name}" failed and was switched off:`, error)
}

/**
 * @param features - every feature's `ui` handle name, in FEATURES order: a
 *     switched feature comes and goes during the generation, so each use
 *     checks whether the handle exists.
 */
export function installScheduler(ctx: HostContext, ui: Ui, features: HandleName[]) {
  // The pass state comes first: subscribing to the preferences below can call
  // schedule() before this function returns (a settings form that is already
  // served answers synchronously — a hot reload does exactly that).
  let scheduled = false
  /** Cancels the frame the pending pass waits on, so the teardown can cancel it. */
  let cancelPass: (() => void) | null = null
  /** Set by the teardown: no pass may be scheduled, or run, after it. */
  let stopped = false

  /** The handle a feature registered under `name`, while that feature is installed. */
  function handleOf(name: HandleName): FeatureHandle | undefined {
    return ui[name]
  }

  /** Call one hook on every feature that implements it, in FEATURES order. */
  function dispatch<K extends keyof FeatureHandle>(hook: K, ...args: Parameters<NonNullable<FeatureHandle[K]>>) {
    for (const name of features) {
      const handle = handleOf(name)
      const call = handle?.[hook] as ((...args: unknown[]) => void) | undefined
      if (handle && typeof call === 'function') call.apply(handle, args)
    }
  }

  /** The reader is at the page: every feature with an `onActivity` hears it. */
  function onGlobalActivity() {
    dispatch('onActivity')
  }

  function onGlobalPointerDown(e: PointerEvent) {
    onGlobalActivity()
    const target = e.target
    // A press a feature does not own closes it; features without an `owns`
    // keep their own dismiss route.
    for (const name of features) {
      const handle = handleOf(name)
      if (!handle || typeof handle.owns !== 'function' || typeof handle.close !== 'function') continue
      if (target instanceof Node && !handle.owns(target)) handle.close('outside')
    }
    dispatch('onPointerDown', target)
  }

  function onGlobalKeyDown(e: KeyboardEvent) {
    // The account footer dismisses the host's account menu with a synthetic
    // Escape addressed to the host's Menu alone (account-footer.ts). Taking it
    // for the reader's Esc would run every feature's Esc route behind it.
    if (e.__dshHostMenuEscape === true) return
    onGlobalActivity()
    if (e.key === 'Escape') dispatch('close', 'escape')
    dispatch('onKey', e)
    // Enter is deliberately not handled here: the host's composer keymap
    // already sends, picks a highlighted `/` or `@` item, holds back for IME
    // and ignores key repeat, and this listener runs before the editor.
  }

  // Focus moving into the composer means the reader is about to type, and every
  // popover the skin keeps open around the card is in the way there. `focusin`
  // bubbles, so one listener covers the card and everything inside it.
  function onGlobalFocusIn(e: FocusEvent) {
    // Every handler below reads `tagName` and `closest` off the target, so a
    // non-element focus target (a text node) is turned away here.
    const target = closestFrom(e.target, '*')
    if (target === null) return
    if (closestComposerCard(target) !== null) dispatch('close', 'composer')
    dispatch('onFocusIn', target)
  }

  function onComposerInput(e: Event) {
    // The [data-composer-input] filter stays in this event pipe; a feature is
    // only told that a composer-input event happened.
    const input = closestFrom(e.target, '[data-composer-input]')
    if (input !== null) dispatch('onInput', e.target)
  }

  document.addEventListener('pointerdown', onGlobalPointerDown)
  document.addEventListener('pointermove', onGlobalActivity, { passive: true })
  document.addEventListener('keydown', onGlobalKeyDown, true)
  document.addEventListener('input', onComposerInput, true)
  document.addEventListener('compositionend', onComposerInput, true)
  document.addEventListener('focusin', onGlobalFocusIn, true)

  // Fixed popovers are anchored to their trigger, and page scroll or a resize
  // moves that anchor, so whichever is open re-resolves it in the same frame.
  function onFixedPopoverViewportChange() {
    dispatch('reposition', 'viewport')
  }
  window.addEventListener('resize', onFixedPopoverViewportChange)
  window.addEventListener('scroll', onFixedPopoverViewportChange, true)

  // A locale switch has to rebuild rows a popover already painted, so the copy
  // sources subscribe here rather than being read at render time only.
  function onCopyChange() {
    dispatch('onCopyChange')
    schedule()
  }
  // Without a locale service the picker keeps the fallback language.
  const localeService = ctx.get('locale')
  const localeUnsubscribe = typeof localeService?.subscribe === 'function' ? localeService.subscribe(onCopyChange) : null

  // Preferences gate the stylesheet and this scheduler both. The first read
  // also arrives through here, which is what replaces the defaults with the
  // stored values.
  const prefsUnsubscribe = subscribePrefs(onCopyChange)
  loadPrefs()

  // Under "follow the system", the system's own reduced-motion flip is a
  // preference change like any other.
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  function onSystemMotionChange() {
    refreshMotionAttribute()
    schedule()
  }
  motionQuery.addEventListener('change', onSystemMotionChange)

  const modelCopyUnsubscribe = onModelCopyLoaded(onCopyChange)

  const usernameUnsubscribe = onUsernameLoaded(() => {
    schedule()
  })

  // The HDSL contract lands after the first pass too, and can carry both the
  // nickname and the picture.
  const hdslUnsubscribe = onHdslLoaded(() => {
    schedule()
  })

  let observedCard: HTMLElement | null = null
  /** Stops watching the observed card's size. */
  let stopCardSize: (() => void) | null = null
  // The card resizing moves the anchors pinned to it with no window resize:
  // re-pin in the same frame, or a JS-pinned control trails the reflow.
  const onCardResize = () => { dispatch('reposition', 'composer') }

  /** Failed passes in a row after which a feature's sync is switched off. */
  const SYNC_FAILURE_LIMIT = 3
  const syncFailures: Record<string, number> = {}

  /**
   * Run one feature's sync in isolation: a throw is retried on the next pass,
   * and after SYNC_FAILURE_LIMIT failures in a row the feature is reported
   * once and retired while the rest of the pass carries on (D12).
   */
  function runSync(name: HandleName) {
    const feature = handleOf(name)
    if (!feature || typeof feature.sync !== 'function') return
    const failures = syncFailures[name] || 0
    if (failures >= SYNC_FAILURE_LIMIT) return
    try {
      feature.sync()
      syncFailures[name] = 0
    } catch (error) {
      syncFailures[name] = failures + 1
      if (failures + 1 < SYNC_FAILURE_LIMIT) return
      reportFeatureFailure(name, error)
      ui.retire(name)
    }
  }

  /** Chat streaming mutates the tree constantly; coalesce to one pass a frame. */
  function schedule() {
    if (scheduled || stopped) return
    scheduled = true
    // The pass reads and writes feature by feature, so it runs in the write
    // phase: the frame's reads have all happened before it (D40).
    cancelPass = requestFrame({
      write() {
        scheduled = false
        cancelPass = null
        if (stopped) return
        for (const name of features) runSync(name)
        const currentCard = findComposerCard()
        if (currentCard !== observedCard) {
          if (stopCardSize !== null) stopCardSize()
          stopCardSize = null
          observedCard = currentCard
          if (observedCard) stopCardSize = observeSize(observedCard, onCardResize)
        }
      },
    })
  }
  ui.schedule = schedule

  // Every change under <body> asks for a pass, the skin's own quiet writes
  // (QUIET_ATTR) aside: the caret motion measures through probes and redraws
  // per frame, and without this every keystroke would schedule a pass for work
  // no feature reads.
  const stopMutations = subscribeMutations(document.body, {
    childList: true,
    characterData: true,
    subtree: true,
    // Only the two attributes a paint depends on: the shipped trigger carries
    // the current preset in its aria-label, the conversation tabs the view in
    // aria-selected.
    attributeFilter: ['aria-label', 'aria-selected'],
    skipQuiet: true,
  }, schedule)
  schedule()

  // Copy that follows the clock (the hero greeting rolls over on the hour) has
  // no DOM change to wake a pass. The syncs skip identical writes, so this
  // cannot feed the observer.
  const clockTimer = setInterval(schedule, 60000)

  return () => {
    // A pass already requested would run against torn-down features and build
    // their DOM again, so it is cancelled and every later schedule() refused —
    // a feature's pending promise may still call it.
    stopped = true
    if (cancelPass !== null) cancelPass()
    cancelPass = null
    scheduled = false
    clearInterval(clockTimer)
    window.removeEventListener('resize', onFixedPopoverViewportChange)
    window.removeEventListener('scroll', onFixedPopoverViewportChange, true)
    if (localeUnsubscribe !== null) localeUnsubscribe()
    prefsUnsubscribe()
    motionQuery.removeEventListener('change', onSystemMotionChange)
    modelCopyUnsubscribe()
    usernameUnsubscribe()
    hdslUnsubscribe()
    stopMutations()
    if (stopCardSize !== null) stopCardSize()
    stopCardSize = null
    observedCard = null
    document.removeEventListener('pointerdown', onGlobalPointerDown)
    document.removeEventListener('pointermove', onGlobalActivity)
    document.removeEventListener('keydown', onGlobalKeyDown, true)
    document.removeEventListener('input', onComposerInput, true)
    document.removeEventListener('compositionend', onComposerInput, true)
    document.removeEventListener('focusin', onGlobalFocusIn, true)
  }
}
