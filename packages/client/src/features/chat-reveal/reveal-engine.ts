import { subscribeMutations } from '../../core/bus'
import { isChatFoldToggle } from '../chat-fold/fold-toggle'
import { STREAMING_ATTRIBUTE, STREAMING_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { createRevealScanner } from './reveal-diff'
import { createRevealHighlights, createRunColorPublisher } from './reveal-highlights'
import { createRevealPainter } from './reveal-paint'
import { CHAT_REVEAL_FOLD_QUIET_MS } from './reveal-params'
import type { RevealSnapshot, RevealState } from './reveal-params'

/**
 * The token reveal's engine, ported from dsh-chat-ux: new characters arrive
 * faint and settle to their own colour.
 *
 * The reveal is a change of the text's own alpha, not a swap of colours:
 * characters arrive faint and come to rest, with nothing repainted in some
 * highlight colour. ::highlight() accepts no opacity — its property set is
 * small and does not include it — so alpha rides on `color`, one rule per
 * step (reveal-rules.css).
 *
 * The engine keeps its scope inside the streaming containers: the step rules
 * are scoped under [data-streaming], so elements outside one are filtered out
 * by their ancestor during style matching and pay nothing, and the observer
 * only looks at what changes inside a streaming container. The step count is
 * bounded by what those rules cost: 24 already reads as a continuous fade.
 *
 * A character is drawn the moment it arrives, at the faintest step, by a
 * synchronous paint right after the scan — a scheduled frame would leave one
 * frame of full-strength text, which the eye reads as a flash.
 */

export {
  CHAT_REVEAL_STEPS,
  CHAT_REVEAL_MIN_OPACITY,
  CHAT_REVEAL_MS,
  CHAT_REVEAL_HIGHLIGHT_PREFIX,
  CHAT_REVEAL_COLOR_VAR,
  CHAT_REVEAL_STAGGER_DIVISOR,
  CHAT_REVEAL_MIN_STAGGER_MS,
  CHAT_REVEAL_MAX_STAGGER_MS,
  CHAT_REVEAL_FOLD_QUIET_MS,
  CHAT_REVEAL_BURST_LIMIT,
  CHAT_REVEAL_FIRST_SIGHT_LIMIT,
  CHAT_REVEAL_FRAME_GAP_MS,
  CHAT_REVEAL_NOMINAL_FRAME_MS,
  CHAT_REVEAL_SLOW_FRAME_MS,
  CHAT_REVEAL_SLOW_FRAME_RUN,
  CHAT_REVEAL_HIDDEN_GAP_MS,
  CHAT_REVEAL_YIELD_MS,
  CHAT_REVEAL_REWRITE_DIFF_BUDGET,
  CHAT_REVEAL_LOCAL_REWRITE_LIMIT,
} from './reveal-params'

/**
 * Install the reveal engine: the step rules' mark, the scan observer, the
 * paint frames and the reader-fold guard.
 *
 * @returns the disposer, or null when this browser cannot draw the fade at all.
 *     The reader's animation choice is the installer's business
 *     (chat-reveal.ts), which has to take a running engine down with it.
 */
export function createChatRevealEngine() {
  const registry = globalThis.CSS?.highlights
  const HighlightConstructor = globalThis.Highlight
  if (registry === undefined || registry === null || typeof HighlightConstructor !== 'function') return null

  const state: RevealState = {
    liveRuns: [],
    historyContainers: new WeakSet<Element>(),
    textSnapshots: new WeakMap<Element, RevealSnapshot>(),
    foldQuietUntil: new WeakMap<Element, number>(),
    liveContainers: [],
    lastFrameAt: 0,
    slowFrames: 0,
    yieldUntil: 0,
    cancelPaintFrame: null,
  }
  for (const container of document.querySelectorAll(STREAMING_SELECTOR)) state.historyContainers.add(container)

  const { clearHighlights, showStep } = createRevealHighlights(registry, HighlightConstructor)
  const publishRunColor = createRunColorPublisher()
  const paint = createRevealPainter(state, { clearHighlights, showStep, publishRunColor })
  const scan = createRevealScanner(state, { publishRunColor, paint })

  /**
   * Note the containers a fold is about to reflow.
   *
   * Pressing a thinking row is not the model emitting characters, but the row
   * it toggles lives inside a container that still carries data-streaming, and
   * when the folded summary happens to be a prefix of the expanded content the
   * mutation looks exactly like an append. The click is the only signal that
   * tells them apart, so it is caught before React's handler runs and the
   * containers it can reach are taken out of the reveal.
   */
  const rememberReaderFold = (event: Event) => {
    // This feature's own automatic folding is not the reader's intent: it
    // lands exactly where the reasoning stops and the answer begins.
    if (isChatFoldToggle()) return
    const target = event.target
    if (!(target instanceof Element)) return
    const until = performance.now() + CHAT_REVEAL_FOLD_QUIET_MS
    const ownContainer = target.closest(STREAMING_SELECTOR)
    if (ownContainer !== null) state.foldQuietUntil.set(ownContainer, until)
    // The control that triggers a fold can live outside the container it
    // reflows, so the subtree is swept too — on clicks only: a key event's
    // target is often the whole body, and sweeping its subtree would quiet
    // every streaming container on the page for one PageUp.
    if (event.type !== 'click') return
    for (const container of target.querySelectorAll(STREAMING_SELECTOR)) state.foldQuietUntil.set(container, until)
  }

  // Only changes inside a streaming container are looked at: a DOM change
  // anywhere else on the page (another plugin, the sidebar, a timer, the
  // composer) triggers no scan, and a change inside a container rescans only
  // that one. A full look is left to a container appearing, disappearing, or
  // gaining or losing data-streaming.
  const onRecords = (records: MutationRecord[]) => {
    let everything = false
    const touched = new Set<Element>()
    for (const record of records) {
      // data-streaming is watched too: a streaming container is not always "a
      // newly inserted node" — when React adds the attribute to a div already
      // on the page it is one attribute change, and missing it would miss the
      // whole start of that answer.
      if (record.type === 'attributes') {
        everything = true
        continue
      }
      const target = record.target
      const element = target instanceof Element ? target : target.parentElement
      const container = element?.closest(STREAMING_SELECTOR) ?? null
      if (container !== null) touched.add(container)
      if (record.type !== 'childList' || everything) continue
      for (const added of record.addedNodes) {
        if (!(added instanceof Element)) continue
        if (added.matches(STREAMING_SELECTOR) || added.querySelector(STREAMING_SELECTOR) !== null) everything = true
      }
      for (const removed of record.removedNodes) {
        if (state.liveContainers.some(live => live === removed || removed.contains(live))) everything = true
      }
    }
    if (everything) scan(null)
    else if (touched.size > 0) scan(touched)
  }
  const stopMutations = subscribeMutations(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributeFilter: [STREAMING_ATTRIBUTE],
  }, onRecords)
  document.addEventListener('click', rememberReaderFold, true)
  document.addEventListener('keydown', rememberReaderFold, true)
  scan(null)

  return () => {
    stopMutations()
    document.removeEventListener('click', rememberReaderFold, true)
    document.removeEventListener('keydown', rememberReaderFold, true)
    if (state.cancelPaintFrame !== null) state.cancelPaintFrame()
    state.cancelPaintFrame = null
    state.liveRuns.length = 0
    clearHighlights()
  }
}
