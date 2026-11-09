import { observeSize } from '@dsh-claude-style/engine/bus'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { motionReduced } from '../core/prefs'
import { motionMs } from './motion'
import { buildSweepBand } from './sweep-band'

/** The hidden sizer keeps absolutely positioned copies from collapsing the box during swaps.
 * Widths come from ResizeObserver and motion starts only after the starting layout has rendered (D40).
 * Visual values and the transition contract are in shared/swapping-text.css.
 */

/** The class on the hidden sizer the box takes its width from. */
const SIZER_CLASS = 'dsh-claude-swap-sizer'
/** The class on one wording inside the sizer; they share one grid cell (shared/swapping-text.css). */
const SIZER_WORD_CLASS = 'dsh-claude-swap-sizer-word'
/** The class on one copy of the words (shared/swapping-text.css). */
const COPY_CLASS = 'dsh-claude-swap-copy'

interface SwapState {
  /** Suppresses a redundant swap for text already present on the first write. */
  written: boolean
  /** Last observed width in the page's written pixel space. */
  sizerWidth: number | null
  unobserve: (() => void) | null
  swap: { leaving: HTMLElement, entering: HTMLElement, moving: boolean } | null
  settle: number | null
  width: number | null
  travel: number | null
  /** Cancels frames waiting for the newest writes to render. */
  frame: (() => void) | null
}

const swapped = new WeakMap<HTMLElement, SwapState>()

function stateOf(element: HTMLElement) {
  let state = swapped.get(element)
  if (state === undefined) {
    state = { written: false, sizerWidth: null, unobserve: null, swap: null, settle: null, width: null, travel: null, frame: null }
    swapped.set(element, state)
  }
  return state
}

/**
 * The words the box is carrying right now: every copy standing in it, and the
 * one the line is heading for. A swap may overlap the one before it, and the
 * box has to stay as wide as the widest of them all.
 */
function wordsIn(element: HTMLElement) {
  const texts: string[] = []
  for (const copy of element.querySelectorAll(`.${COPY_CLASS}`)) texts.push(copy.textContent ?? '')
  texts.push(element.dataset.text ?? '')
  return texts
}

/**
 * Write the words onto one copy. A copy carrying the highlight takes a band of
 * its own (shared/sweep-band.ts) beside its words, built fresh with them, so a
 * copy rewritten mid-swap starts its band over with its new words; the band
 * draws its copy from `data-text`, which keeps the copy's own text the words
 * alone for every measure that reads it (wordsIn). The class carrying the band
 * is written on the copy showing the words and never on the label: the label's
 * box stands taller than the text by the swap's travel (shared/swapping-text.css),
 * and a band laid over that box would sweep that far above the glyphs.
 */
function fillCopy(copy: HTMLElement, text: string, withShimmer: boolean) {
  copy.replaceChildren(text)
  copy.setAttribute('data-text', text)
  if (withShimmer) copy.appendChild(buildSweepBand(text).band)
}

function buildCopy(text: string, withShimmer: boolean, extraClass = '') {
  const copy = document.createElement('span')
  copy.className = COPY_CLASS + extraClass + (withShimmer ? ' dsh-claude-swap-shimmer' : '')
  fillCopy(copy, text, withShimmer)
  return copy
}

/**
 * The sizer: the box's only child in the flow, the one thing that gives it a
 * width while the copies lie out of it. It is made on the first write, which is
 * why a label already carrying words loses them there, and its width is heard
 * from then on.
 */
function sizerOf(element: HTMLElement, state: SwapState): HTMLElement {
  const first = element.firstElementChild
  if (first !== null && first.classList.contains(SIZER_CLASS)) return first as HTMLElement
  const sizer = document.createElement('span')
  sizer.className = SIZER_CLASS
  sizer.setAttribute('aria-hidden', 'true')
  element.textContent = ''
  element.appendChild(sizer)
  state.unobserve?.()
  state.unobserve = observeSize(sizer, (entries) => {
    state.sizerWidth = entries[entries.length - 1].borderBoxSize[0].inlineSize
    // A pinned box follows a sizer that changed width on its own (a font
    // arriving, the brand's face): the pin would otherwise hold the old width.
    if (state.width !== null) afterRender(element, state)
  })
  return sizer
}

/**
 * Lay every wording into the sizer at once. They share one grid cell, so the
 * sizer is as wide as the widest of them without a measure per wording, and it
 * keeps its own content's width whatever is written on the box
 * (shared/swapping-text.css). Answers whether anything changed.
 */
function layWords(sizer: HTMLElement, texts: readonly string[]) {
  const unique = [...new Set(texts)]
  const standing = Array.from(sizer.children, (word) => word.textContent ?? '')
  if (standing.length === unique.length && standing.every((text, at) => text === unique[at])) return false
  sizer.replaceChildren(...unique.map((text) => {
    const word = document.createElement('span')
    word.className = SIZER_WORD_CLASS
    word.textContent = text
    return word
  }))
  return true
}

/** Let the box be the sizer's own width again, and drop the timer that would have done it. */
function letGo(element: HTMLElement, state: SwapState) {
  if (state.travel !== null) window.clearTimeout(state.travel)
  state.travel = null
  if (state.width === null) return
  state.width = null
  element.style.width = ''
}

/**
 * Advance the label one frame after the render that lays out the newest
 * writes. A frame asked for from a write phase belongs to the next frame, one
 * asked for from a task between frames to this one, so the second frame is the
 * first one certain to follow that render; newer writes start the wait over.
 */
function afterRender(element: HTMLElement, state: SwapState) {
  state.frame?.()
  state.frame = requestFrame({
    write() {
      state.frame = requestFrame({
        write() {
          state.frame = null
          advance(element, state)
        },
      })
    },
  })
}

/**
 * Hold the box at the widest of the words going into it. The box is pinned at
 * the width last heard — the width it stands at — before the sizer takes the
 * new words, so nothing laid out beside the line moves until the travel starts.
 * A box already carrying a written width keeps it: the sizer cannot move it.
 */
function holdWords(element: HTMLElement, state: SwapState) {
  const changed = layWords(sizerOf(element, state), wordsIn(element))
  if (changed && state.width === null && state.sizerWidth !== null && !motionReduced()) {
    element.style.width = `${state.sizerWidth}px`
    state.width = state.sizerWidth
  }
  afterRender(element, state)
}

/**
 * The frame after the render: set the copies moving, and take the box to the
 * width the sizer was heard at. The pin and the start poses were laid out by
 * that render, so the stylesheet's transitions carry both from them
 * (shared/swapping-text.css). A width already being travelled to leaves that
 * move running, since a swap settles inside the travel it began.
 */
function advance(element: HTMLElement, state: SwapState) {
  if (state.swap !== null && !state.swap.moving) startSwap(element, state, state.swap)
  if (state.width === null || state.sizerWidth === null) return
  const to = state.sizerWidth
  if (motionReduced()) letGo(element, state)
  else if (state.width === to) {
    if (state.travel === null) letGo(element, state)
  } else {
    element.style.width = `${to}px`
    state.width = to
    if (state.travel !== null) window.clearTimeout(state.travel)
    state.travel = window.setTimeout(() => {
      state.travel = null
      // Words written since decide the box's next width from this pin.
      if (state.frame === null) letGo(element, state)
    }, motionMs('--dsh-claude-duration-slide'))
  }
}

/**
 * Write the classes that move the two copies. The copy that left is taken down
 * once the arriving one has settled: the sizer holds the box through the whole
 * swap, so nothing depends on it any more. The words left standing take the box
 * over there, which is what brings the clock back to sit right after them. The
 * box's own width travels at its own duration (--dsh-claude-duration-slide),
 * which is longer than the two halves: letting the pin go before that move has
 * landed drops the rest of it in one step, and the clock jumps instead of
 * sliding.
 */
function startSwap(element: HTMLElement, state: SwapState, swap: NonNullable<SwapState['swap']>) {
  swap.moving = true
  swap.leaving.classList.add('is-exit')
  const gap = motionMs('--dsh-claude-duration-swap-gap')
  if (gap > 0) window.setTimeout(() => swap.entering.classList.remove('is-enter-start'), gap)
  else swap.entering.classList.remove('is-enter-start')
  state.settle = window.setTimeout(() => {
    state.settle = null
    state.swap = null
    if (!element.isConnected) return
    swap.leaving.remove()
    holdWords(element, state)
  }, Math.max(motionMs('--dsh-claude-duration-swap') + gap, motionMs('--dsh-claude-duration-slide')))
}

/** Drop every swap, frame and timer the label has in flight, and let its box go. */
function halt(element: HTMLElement, state: SwapState) {
  if (state.settle !== null) window.clearTimeout(state.settle)
  state.settle = null
  state.frame?.()
  state.frame = null
  state.swap = null
  letGo(element, state)
}

/**
 * Write the words onto a label, swapping them in when they differ from the ones
 * standing. The first write (and every write while the animation choice is
 * reduced) lands without motion, so a label never animates on the way in.
 *
 * @param element - the label; it takes a hidden sizer and, while a swap runs,
 *     the copies the two halves move.
 * @param text - the words to stand.
 * @param withShimmer - carry the masked highlight the recipe pairs with a
 *     state line.
 */
export function setSwappingText(element: HTMLElement, text: string, withShimmer = false) {
  const state = stateOf(element)
  const was = element.dataset.text
  if (state.written && was === text) return
  const first = !state.written
  // The copies read their geometry off the box they sit in: the class that
  // carries it belongs to the label (shared/swapping-text.css).
  if (!element.classList.contains('dsh-claude-swap-label')) element.classList.add('dsh-claude-swap-label')
  state.written = true

  if (first || motionReduced()) {
    halt(element, state)
    // The sizer comes first, so the copy written below stands after it: it is
    // the box's only child in the flow, and everything past it is a copy.
    const sizer = sizerOf(element, state)
    const standing = buildCopy(text, withShimmer)
    // The sizer is the only thing in the flow, so the words standing are
    // replaced outright; nothing moves and nothing measures them.
    while (element.childNodes.length > 1) element.removeChild(element.lastChild!)
    element.appendChild(standing)
    element.dataset.text = text
    // The box comes down onto the words standing — the copies the last swap
    // left behind are gone — so the clock sits right after them again.
    layWords(sizer, [text])
    return
  }

  // A swap already in flight: the words arriving take these ones and the two
  // halves keep moving. A wording that changes again inside a swap is one call's
  // own words cutting in ahead of the wording lock (wait-state.ts), and the line
  // settles on the newest of them rather than playing the ones in between back.
  if (state.swap !== null && state.swap.entering.parentNode === element) {
    fillCopy(state.swap.entering, text, withShimmer)
    element.dataset.text = text
    holdWords(element, state)
    return
  }
  // A swap whose copies are no longer in the box is dropped: the settle timer it
  // left would bring the box down in the middle of the swap started below.
  if (state.settle !== null) window.clearTimeout(state.settle)
  state.settle = null

  // The two halves travel together: the copy holding the words leaves upward,
  // and the copy arriving stands parked below it until the gap has passed. Both
  // are in the box for the rest of the swap, so the line never stands empty the
  // way it does when the words leaving have finished before the arriving ones
  // start. Both are written in their start poses here and set moving after the
  // render that lays them out.
  const leaving = buildCopy(was ?? '', withShimmer)
  leaving.setAttribute('aria-hidden', 'true')
  sizerOf(element, state)
  while (element.childNodes.length > 1) element.removeChild(element.lastChild!)
  element.appendChild(leaving)
  const entering = buildCopy(text, withShimmer, ' is-enter-start')
  entering.setAttribute('aria-hidden', 'true')
  element.appendChild(entering)
  element.dataset.text = text
  state.swap = { leaving, entering, moving: false }
  // The box takes the widest of the words going into it, the arriving one
  // included: nothing laid out beside the line moves while the two halves do.
  holdWords(element, state)
}

/**
 * Let go of a label's swap: a row leaving the page takes no frame, timer or
 * size subscription with it, and neither its exit nor a width still travelling
 * may outlive it. The words standing stay where they are.
 */
export function releaseSwappingText(element: HTMLElement) {
  const state = swapped.get(element)
  if (state === undefined) return
  halt(element, state)
  state.unobserve?.()
  swapped.delete(element)
}
