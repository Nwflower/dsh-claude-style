import { closestComposerCard, findComposerCard, findConversationScroller, hostLocale } from './host'
import type { HostContext } from './host'
import { observeSize, subscribeMutations } from './bus'
import { requestFrame } from './frame'
import { closestFrom } from './dom'
import { PHASE_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { skin } from './skin'

/**
 * The feature scheduler (D40, D73): one pass a frame over every installed
 * feature's handle, and the page-wide events (presses, keys, focus, resize,
 * scroll) routed to the handles that listen. The engine knows the hooks a
 * handle may carry; which features exist, and what makes their copy change, are
 * the skin's to hand over.
 */

/** Why the scheduler asks a feature to close. Features ignore the reasons they do not act on. */
export type CloseReason = 'outside' | 'escape' | 'composer'

/**
 * A feature's handle on the shared `ui` registry. Every hook is optional: the
 * scheduler calls the ones a feature implements and skips the rest (D72).
 */
export interface FeatureHandle {
  /** Every scheduler pass, in FEATURES order. */
  sync?(): void
  /**
   * The pass's read phase, before every feature's `sync` of the same frame
   * (D40): a feature that places boxes reads them here and writes them in
   * `sync`, so no feature's write forces a layout under another's read.
   */
  measure?(): void
  /**
   * Whether a batch confined to the conversation column cannot change what this
   * feature reads: such a batch skips its pass (D40). Leave it out when the
   * answer is not certain — the pass then runs as it always did.
   */
  skipOnContentOnly?: boolean
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
  /**
   * The read phase of the frame a page scroll or resize repositions in, before
   * every feature's `reposition('viewport')` (D40): a feature that pins boxes
   * reads them here, so no feature's reposition forces a layout under another's.
   */
  measureReposition?(): void
  /** The locale, the preferences or the model copy changed. */
  onCopyChange?(): void
  /** Every keydown, after the Esc route; a feature that takes the key calls `event.preventDefault()` itself. */
  onKey?(event: KeyboardEvent): void
  /** The reader moved the pointer, pressed it or pressed a key (the skin's own synthetic Esc aside). */
  onActivity?(): void
  /** The feature's own teardown, for a handle that also hands it to its install. */
  teardown?(): void
}

/** The two calls on the registry that are no feature's: the entry and the scheduler put them there. */
export interface SchedulerCalls {
  /** Ask for a pass on the next frame (installScheduler). */
  schedule?: () => void
  /** Switch one feature off for the rest of this generation. */
  retire: (name: string) => void
}

/** The registry the scheduler reads: each installed feature's handle under its handle name. */
export type SchedulerUi<Name extends string> = SchedulerCalls & { [K in Name]?: FeatureHandle }

/** Where a change comes from: it hears the listener, and answers the function that stops hearing. */
export type ChangeSource = (listener: () => void) => () => void

/** What the skin hands the scheduler: the sources it listens to and the two answers only the skin gives. */
export interface SchedulerSources {
  /** Changes that rebuild a feature's copy and ask for a pass: the preferences, the model copy. */
  copyChange: ChangeSource[]
  /** Changes that only ask for a pass: the account's name, the launcher's contract. */
  refresh: ChangeSource[]
  /**
   * Read the stored preferences. A form that is already served answers
   * synchronously, so it runs once the sources above are subscribed.
   */
  start(): void
  /** The system's reduced-motion flag flipped: the skin's own attribute follows it. */
  systemMotionChanged(): void
}

/** Say once, loudly, that a feature was switched off: the console line is its only trace. */
export function reportFeatureFailure(name: string, error: unknown) {
  console.error(`[${skin().packageName}] "${name}" failed and was switched off:`, error)
}

/**
 * The handle's hooks `dispatch` may call. The flag beside them
 * (`skipOnContentOnly`) is read by the pass itself.
 */
type FeatureHook = 'sync' | 'measure' | 'owns' | 'onPointerDown' | 'close' | 'onInput' | 'onFocusIn' | 'reposition' | 'measureReposition' | 'onCopyChange' | 'onKey' | 'onActivity' | 'teardown'

/**
 * @param features - every feature's `ui` handle name, in install order: a
 *     switched feature comes and goes during the generation, so each use
 *     checks whether the handle exists.
 */
export function installScheduler<Name extends string>(ctx: HostContext, ui: SchedulerUi<Name>, features: Name[], sources: SchedulerSources) {
  // The pass state comes first: subscribing to the preferences below can call
  // schedule() before this function returns (a settings form that is already
  // served answers synchronously — a hot reload does exactly that).
  let scheduled = false
  /** Cancels the frame the pending pass waits on, so the teardown can cancel it. */
  let cancelPass: (() => void) | null = null
  /** Set by the teardown: no pass may be scheduled, or run, after it. */
  let stopped = false
  /** Whether everything that asked for the pending pass was a batch inside the conversation column. */
  let passContentOnly = false

  /** The handle a feature registered under `name`, while that feature is installed. */
  function handleOf(name: Name): FeatureHandle | undefined {
    return ui[name]
  }

  /**
   * Call one hook on every feature that implements it, in FEATURES order. Each
   * call is isolated (D12): an event route that throws must not keep the rest
   * of the page's features from hearing the same event, and the failure is
   * reported where it happened rather than retiring the feature.
   */
  function dispatch<K extends FeatureHook>(hook: K, ...args: Parameters<NonNullable<FeatureHandle[K]>>) {
    for (const name of features) {
      const handle = handleOf(name)
      const call = handle?.[hook] as ((...args: unknown[]) => void) | undefined
      if (!handle || typeof call !== 'function') continue
      try {
        call.apply(handle, args)
      } catch (error) {
        reportError(error)
      }
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
    // keep their own dismiss route. One feature's close throwing must not keep
    // the others from closing (D12).
    for (const name of features) {
      const handle = handleOf(name)
      if (!handle || typeof handle.owns !== 'function' || typeof handle.close !== 'function') continue
      try {
        if (target instanceof Node && !handle.owns(target)) handle.close('outside')
      } catch (error) {
        reportError(error)
      }
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
  // Scroll fires per frame at most, and a window drag fires far faster: the
  // callbacks are coalesced into one frame the way the pass is (D40).
  let cancelViewportFrame: (() => void) | null = null
  function onFixedPopoverViewportChange() {
    if (cancelViewportFrame !== null) return
    cancelViewportFrame = requestFrame({
      read() {
        dispatch('measureReposition')
      },
      write() {
        cancelViewportFrame = null
        dispatch('reposition', 'viewport')
      },
    })
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
  const localeService = hostLocale(ctx)
  const localeUnsubscribe = typeof localeService?.subscribe === 'function' ? localeService.subscribe(onCopyChange) : null

  // The skin's copy sources gate the stylesheet and this scheduler both. The
  // first preference read also arrives through here, which is what replaces the
  // defaults with the stored values.
  const copyUnsubscribes = sources.copyChange.map((source) => source(onCopyChange))
  sources.start()

  // Under "follow the system", the system's own reduced-motion flip is a
  // preference change like any other.
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  function onSystemMotionChange() {
    sources.systemMotionChanged()
    schedule()
  }
  motionQuery.addEventListener('change', onSystemMotionChange)

  // The account's name and the launcher's contract land after the first pass
  // too: they ask for a pass and nothing more.
  const refreshUnsubscribes = sources.refresh.map((source) => source(() => { schedule() }))

  let observedCard: HTMLElement | null = null
  /** Stops watching the observed card's size. */
  let stopCardSize: (() => void) | null = null
  // The card resizing moves the anchors pinned to it with no window resize:
  // re-pin in the same frame, or a JS-pinned control trails the reflow.
  const onCardResize = () => { dispatch('reposition', 'composer') }

  /** Failed passes in a row after which one of a feature's hooks is switched off. */
  const FAILURE_LIMIT = 3
  /** Sync failures in a row, per feature. */
  const syncFailures: Record<string, number> = {}
  /** Measure failures in a row, per feature: a read that keeps throwing does not ride on a write that succeeds. */
  const measureFailures: Record<string, number> = {}

  /**
   * Run one feature's sync in isolation: a throw is retried on the next pass,
   * and after FAILURE_LIMIT failures in a row the feature is reported once and
   * retired while the rest of the pass carries on (D12).
   */
  function runSync(name: Name) {
    const feature = handleOf(name)
    if (!feature || typeof feature.sync !== 'function') return
    const failures = syncFailures[name] || 0
    if (failures >= FAILURE_LIMIT) return
    try {
      feature.sync()
      syncFailures[name] = 0
    } catch (error) {
      syncFailures[name] = failures + 1
      if (failures + 1 < FAILURE_LIMIT) return
      reportFeatureFailure(name, error)
      ui.retire(name)
    }
  }

  /**
   * Run one feature's measurement, in the pass's read phase, counted apart from
   * its sync (D12): the two halves fail independently, so a pass whose read
   * throws every frame still retires the feature after FAILURE_LIMIT failures in
   * a row — a sync succeeding in the same pass does not zero this count.
   */
  function runMeasure(name: Name) {
    const feature = handleOf(name)
    if (!feature || typeof feature.measure !== 'function') return
    const failures = measureFailures[name] || 0
    if (failures >= FAILURE_LIMIT) return
    try {
      feature.measure()
      measureFailures[name] = 0
    } catch (error) {
      measureFailures[name] = failures + 1
      if (failures + 1 < FAILURE_LIMIT) return
      reportFeatureFailure(name, error)
      ui.retire(name)
    }
  }

  /**
   * Whether every record of the batch lies inside the conversation column.
   * A removal's target is the parent it left, which is still the column's
   * node, so removed nodes are read off the target alone.
   */
  function contentOnly(records: MutationRecord[]) {
    const column = findConversationScroller()
    if (column === null) return false
    for (const record of records) {
      if (!column.contains(record.target)) return false
      for (const added of record.addedNodes) {
        if (!column.contains(added)) return false
      }
    }
    return true
  }

  /** Chat streaming mutates the tree constantly; coalesce to one pass a frame. */
  function schedule(options?: { contentOnly?: boolean }) {
    if (stopped) return
    if (scheduled) {
      // A reason that reads the whole page joins the pass already queued.
      if (options?.contentOnly !== true) passContentOnly = false
      return
    }
    scheduled = true
    passContentOnly = options?.contentOnly === true
    // The pass measures in the read phase and writes in the write phase, so a
    // feature that reads a box reads the layout the frame started with, and
    // every measurement happens before any feature's write can invalidate it
    // (D40). The flag says whether this frame's read phase ran, so a task
    // cancelled between the phases writes from the previous measurements.
    let measured = false
    cancelPass = requestFrame({
      read() {
        measured = true
        if (stopped) return
        const content = passContentOnly
        for (const name of features) {
          if (content && handleOf(name)?.skipOnContentOnly === true) continue
          runMeasure(name)
        }
      },
      write() {
        scheduled = false
        cancelPass = null
        if (stopped) return
        // A stand-in page counts scheduler passes, not frames: a feature that
        // paints its own frames (the effort field's canvas) asks the page for a
        // frame every tick, and the probe's settle rule must still see the skin
        // as quiet once the passes stop (D92).
        if ((window as unknown as { __dshStandIn?: unknown }).__dshStandIn === true) {
          const counts = window as unknown as { __dshClaudePasses?: number }
          counts.__dshClaudePasses = (counts.__dshClaudePasses ?? 0) + 1
        }
        const content = passContentOnly
        passContentOnly = false
        if (!measured) {
          // The write phase is running without this frame's read phase (the
          // task was queued after the frame's reads): measure now, before any
          // feature writes.
          for (const name of features) {
            if (content && handleOf(name)?.skipOnContentOnly === true) continue
            runMeasure(name)
          }
        }
        for (const name of features) {
          if (content && handleOf(name)?.skipOnContentOnly === true) continue
          runSync(name)
        }
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
  // no feature reads. A batch the conversation column holds alone (streaming)
  // asks for the pass its readers need and skips the page-wide ones.
  const stopMutations = subscribeMutations(document.body, {
    childList: true,
    characterData: true,
    subtree: true,
    // Only the two attributes a paint depends on: the shipped trigger carries
    // the current preset in its aria-label, the conversation tabs the view in
    // aria-selected.
    attributeFilter: ['aria-label', 'aria-selected'],
    skipQuiet: true,
  }, records => schedule({ contentOnly: contentOnly(records) }))
  schedule()

  // Copy that follows the clock (the hero greeting rolls over on the hour) has
  // no DOM change to wake a pass; skip background tabs and active conversations.
  const clockTimer = setInterval(() => {
    if (document.hidden) return
    schedule()
  }, 60000)

  return () => {
    // A pass already requested would run against torn-down features and build
    // their DOM again, so it is cancelled and every later schedule() refused —
    // a feature's pending promise may still call it.
    stopped = true
    if (cancelPass !== null) cancelPass()
    cancelPass = null
    if (cancelViewportFrame !== null) cancelViewportFrame()
    cancelViewportFrame = null
    scheduled = false
    clearInterval(clockTimer)
    window.removeEventListener('resize', onFixedPopoverViewportChange)
    window.removeEventListener('scroll', onFixedPopoverViewportChange, true)
    if (localeUnsubscribe !== null) localeUnsubscribe()
    for (const stop of copyUnsubscribes) stop()
    motionQuery.removeEventListener('change', onSystemMotionChange)
    for (const stop of refreshUnsubscribes) stop()
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
