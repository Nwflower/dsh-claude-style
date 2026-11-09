import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { isChatFoldToggle } from '../chat-fold/fold-toggle'
import { STREAMING_ATTRIBUTE, STREAMING_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { createRevealScanner } from './reveal-diff'
import { createRevealPainter } from './reveal-paint'
import { CHAT_REVEAL_COLOR_VAR, CHAT_REVEAL_FOLD_QUIET_MS, CHAT_REVEAL_HIGHLIGHT_PREFIX, CHAT_REVEAL_STEPS, createRevealState } from './reveal-params'
import type { RevealState } from './reveal-params'

/**
 * The token reveal's engine, ported from dsh-chat-ux: new characters arrive
 * faint and settle to their own colour.
 *
 * The reveal is a change of the text's own alpha, not a swap of colours:
 * characters arrive faint and come to rest, with nothing repainted in some
 * highlight colour. ::highlight() accepts no opacity — its property set is
 * small and does not include it — so alpha rides on `color`, one rule per
 * step, which the build writes from constants.ts (scripts/feature-sheets.mjs).
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
 * The engine's Custom Highlight table: one highlight per step, its segments
 * swapped every frame.
 *
 * @param registry - `CSS.highlights`, checked for existence by the factory.
 * @param HighlightConstructor - the page's `Highlight`, checked to be a function.
 */
function createRevealHighlights(registry: HighlightRegistry, HighlightConstructor: typeof Highlight) {
  /** One highlight per step: registered once, its segments swapped every frame. */
  const highlights: (Highlight | null)[] = new Array(CHAT_REVEAL_STEPS).fill(null)

  /** Unregister every step's highlight. */
  const clearHighlights = () => {
    for (let step = 0; step < CHAT_REVEAL_STEPS; step += 1) {
      if (highlights[step] === null) continue
      registry.delete(CHAT_REVEAL_HIGHLIGHT_PREFIX + step)
      highlights[step] = null
    }
  }

  /**
   * Swap this step's segments for this batch.
   *
   * The registry is written once per step, the first time it is used; after
   * that only the highlight's own segments change. Unregistering and
   * registering all twenty-four names every frame would make the browser
   * rebuild its highlight markers each time. A step that is empty this frame
   * is cleared rather than unregistered — the next frame very likely needs it.
   */
  const showStep = (step: number, ranges: StaticRange[]) => {
    let highlight = highlights[step] ?? null
    if (ranges.length === 0) {
      if (highlight !== null && highlight.size > 0) highlight.clear()
      return
    }
    if (highlight === null) {
      highlight = new HighlightConstructor()
      highlights[step] = highlight
      registry.set(CHAT_REVEAL_HIGHLIGHT_PREFIX + step, highlight)
    } else {
      highlight.clear()
    }
    for (const range of ranges) highlight.add(range)
  }

  return { clearHighlights, showStep }
}

/**
 * Publish an element's own colour to CHAT_REVEAL_COLOR_VAR.
 *
 * What matters is the colour the markdown layer actually paints — a link's
 * token, a syntax token, a list marker — not what this module last wrote.
 * The computed colour is read, and skipped entirely when the element still
 * carries the colour recorded for it, which is every frame after the first.
 *
 * A value inherited from an ancestor already is its colour (bold inside a
 * paragraph, body text inside a list item), so nothing is written then: an
 * inline style is a style invalidation, and it would wake anything else on
 * the page watching style attributes.
 *
 * @returns the publisher: give it the element a segment renders in.
 */
function createRunColorPublisher() {
  /** Colours already written onto elements, so an unchanged one skips the style read. */
  const writtenColors = new WeakMap<Element, string>()

  return (element: HTMLElement | null) => {
    if (element === null) return
    const style = window.getComputedStyle(element)
    const color = style.color
    if (writtenColors.get(element) === color) return
    writtenColors.set(element, color)
    if (style.getPropertyValue(CHAT_REVEAL_COLOR_VAR).trim() === color) return
    element.style.setProperty(CHAT_REVEAL_COLOR_VAR, color)
  }
}

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

  const state: RevealState = createRevealState()
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
    const changes = new Map<Element, MutationRecord[]>()
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
      if (container !== null) {
        touched.add(container)
        const batch = changes.get(container) ?? []
        batch.push(record)
        changes.set(container, batch)
      }
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
    else if (touched.size > 0) scan(touched, changes)
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
