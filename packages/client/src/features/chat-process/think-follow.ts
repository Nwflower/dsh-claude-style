import { THINK_EDGES_ATTR, THINK_MODE_ATTR, THINK_TRACK_ATTR } from '../../constants'
import { motionReduced } from '../../core/prefs'
import { RUNNING_STATE, THINK_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'

/**
 * The thinking rows' automatic glide (D55, D56): while a reasoning block is
 * still being written, the lane scrolls the row's own viewport after the text
 * at a reading pace — dsh-better-display's ReasoningCard, at its numbers.
 *
 * The reference's shape is kept whole here: the viewport clips at a preview
 * height, the transcript sits on a track the lane moves with one transform
 * transition per step (never a per-frame scrollTop write), the edges fade while
 * text waits on either side, and the first wheel, pointer or selection hands the
 * row back to native scrolling — the position crossing over in the same task,
 * before a frame can paint.
 */

/** Reading pace: two lines, then a hold. */
export const REASON_LINES = 2
export const REASON_HOLD_MS = 840
/** One glide step. */
export const REASON_STEP_MS = 500
/** Ceiling on how much text one catch-up step may cover. */
export const REASON_MAX_LINES = 40
/** Beat between catch-up steps, while the transcript is still well behind. */
export const REASON_CHASE_HOLD_MS = 40
/** The smallest step worth a transition. */
export const REASON_MIN_STEP_PX = 1
/** The step's transition curve (the reference's `--reason-ease`). */
const REASON_EASE = 'cubic-bezier(.22,1,.36,1)'

/**
 * The scroll box a running thinking row offers, when it has one: the row's own
 * overflowing descendant. The host's row is a column whose text sits in the box
 * that grew a scrollbar.
 */
function scrollBoxOf(row: HTMLElement): HTMLElement | null {
  const candidates = [row, ...row.querySelectorAll<HTMLElement>('*')]
  for (const element of candidates) {
    if (element.scrollHeight - element.clientHeight > 1 && element.clientHeight > 0) return element
  }
  return null
}

/** One row's follow, as long as the lane is the one scrolling it. */
interface RowFollow {
  /** Turn it off for good: listeners off, track unwrapped, the viewport handed back. */
  end: () => void
  /** Whether the lane is still the one scrolling this row. */
  automatic: () => boolean
}

const follows = new Map<HTMLElement, RowFollow>()
/**
 * The rows the reader took over himself: the lane leaves them until the thinking
 * settles. A plain Set, because the pass that settles a row is what takes the
 * mark off, and that pass has to see the rows it holds.
 */
const takenByReader = new Set<HTMLElement>()

/**
 * Follow one running thinking row: walk its transcript after the newest text at
 * the reading pace, until the row stops running or the reader takes it over.
 */
function follow(row: HTMLElement, state: HTMLElement, box: HTMLElement) {
  // The reference's viewport: one track between the scroll box and its content,
  // moved by a single transform per step.
  const track = document.createElement('div')
  track.setAttribute(THINK_TRACK_ATTR, '')
  while (box.firstChild !== null) track.append(box.firstChild)
  box.append(track)
  // The viewport's own overflow comes back exactly as it was: the lane writes
  // the longhand so a host's inline `overflow-y` is not clobbered by it.
  const wasOverflowY = box.style.overflowY
  let automatic = false
  let alive = true
  let frame = 0
  let timer = 0
  let lastPainted = box.scrollTop
  let nextAt = performance.now() + REASON_HOLD_MS
  const tail = () => Math.max(0, track.offsetHeight - box.clientHeight)
  const clamp = (value: number) => Math.max(0, Math.min(tail(), value))
  const paintedOffset = () => {
    if (!automatic) return box.scrollTop
    const transform = getComputedStyle(track).transform
    // Reduced-motion CSS may win before the preference reaches this module:
    // keep the last painted position rather than snapping back to the top.
    return clamp(transform === 'none' ? lastPainted : box.scrollTop - new DOMMatrixReadOnly(transform).m42)
  }
  const hasSelection = () => {
    const selection = document.getSelection()
    return selection !== null && !selection.isCollapsed && selection.anchorNode !== null && track.contains(selection.anchorNode)
  }
  const stopClocks = () => {
    cancelAnimationFrame(frame)
    frame = 0
    window.clearTimeout(timer)
    timer = 0
  }
  /** The reader's own viewport: the track stands still and native scrolling takes the offset. */
  const takeOver = () => {
    if (!automatic) return
    const top = paintedOffset()
    automatic = false
    track.style.transition = 'none'
    track.style.transform = 'none'
    box.style.overflowY = 'auto'
    box.scrollTop = top
    lastPainted = box.scrollTop
    box.setAttribute(THINK_MODE_ATTR, 'manual')
    takenByReader.add(row)
  }
  /** The lane's own viewport: the track carries the offset and the box stops scrolling. */
  const assume = () => {
    if (automatic) return
    lastPainted = clamp(box.scrollTop)
    track.style.transition = 'none'
    track.style.transform = `translateY(-${lastPainted}px)`
    box.scrollTop = 0
    box.style.overflowY = 'hidden'
    automatic = true
    box.setAttribute(THINK_MODE_ATTR, 'transform')
  }
  /** How much text waits on each side, which is what the edge fades read. */
  const measure = () => {
    lastPainted = paintedOffset()
    const top = lastPainted > 1
    const bottom = tail() - lastPainted > 1
    const edges = top ? (bottom ? 'both' : 'top') : (bottom ? 'bottom' : 'none')
    if (box.getAttribute(THINK_EDGES_ATTR) !== edges) box.setAttribute(THINK_EDGES_ATTR, edges)
  }
  const canFollow = () => alive && !document.hidden && !hasSelection() && box.clientHeight > 0
    && state.isConnected && state.getAttribute('data-state') === RUNNING_STATE && !motionReduced()
  const start = () => {
    timer = 0
    if (!canFollow()) return
    const from = paintedOffset()
    const lineHeight = parseFloat(getComputedStyle(track).lineHeight) || 24
    const backlogLines = Math.max(0, (tail() - from) / lineHeight)
    const lines = Math.max(REASON_LINES, Math.min(REASON_MAX_LINES, Math.ceil(backlogLines)))
    const to = Math.min(tail(), from + Math.max(REASON_MIN_STEP_PX, lineHeight * lines))
    if (to - from < REASON_MIN_STEP_PX) return
    const began = performance.now()
    // Still behind after this step: take the next one almost immediately instead
    // of holding the reading beat, so the motion tracks the text.
    nextAt = began + (backlogLines > REASON_LINES ? REASON_CHASE_HOLD_MS : REASON_HOLD_MS)
    // The reference's step: commit the start pose, then transition the track.
    track.style.transition = 'none'
    track.style.transform = `translateY(-${from}px)`
    void track.offsetHeight
    track.style.transition = `transform ${REASON_STEP_MS}ms ${REASON_EASE}`
    track.style.transform = `translateY(-${to}px)`
    const tick = (now: number) => {
      frame = 0
      if (!alive) return
      if (!canFollow()) { takeOver(); measure(); return }
      measure()
      if (now - began < REASON_STEP_MS || Math.abs(lastPainted - to) > .05) frame = requestAnimationFrame(tick)
      else schedule()
    }
    frame = requestAnimationFrame(tick)
  }
  const schedule = () => {
    if (!canFollow() || frame !== 0 || timer !== 0) return
    assume()
    measure()
    if (tail() - paintedOffset() < 1) return
    timer = window.setTimeout(start, Math.max(0, nextAt - performance.now()))
  }
  const onScroll = () => {
    measure()
    // A focus- or keyboard-driven native scroll wins even while the track moves.
    if (automatic && box.scrollTop > 1) takeOver()
  }
  const onWheel = (event: WheelEvent) => {
    if (event.deltaY === 0) return
    // The compositor picks a wheel scroller before handlers run: the first
    // gesture has to be consumed here or it scrolls the conversation instead.
    const handoff = automatic && event.cancelable
    if (handoff) event.preventDefault()
    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? parseFloat(getComputedStyle(track).lineHeight) || 24
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? box.clientHeight : 1
    const top = clamp(paintedOffset() + event.deltaY * unit)
    takeOver()
    if (handoff) {
      box.scrollTop = top
      measure()
    }
  }
  const onPointer = () => takeOver()
  const onSelection = () => { if (hasSelection()) takeOver() }
  const onVisibility = () => {
    stopClocks()
    if (document.hidden) takeOver()
    else {
      nextAt = performance.now() + REASON_HOLD_MS
      schedule()
    }
  }
  const end = () => {
    if (!alive) return
    alive = false
    stopClocks()
    takeOver()
    box.removeEventListener('scroll', onScroll)
    box.removeEventListener('wheel', onWheel)
    box.removeEventListener('pointerdown', onPointer)
    document.removeEventListener('selectionchange', onSelection)
    document.removeEventListener('visibilitychange', onVisibility)
    // The row still running keeps the mode it was left in: it is the reader's
    // now, and the marks say so until the thinking settles.
    if (state.isConnected && state.getAttribute('data-state') === RUNNING_STATE) {
      box.setAttribute(THINK_MODE_ATTR, 'manual')
    } else {
      box.removeAttribute(THINK_MODE_ATTR)
      box.removeAttribute(THINK_EDGES_ATTR)
    }
    // Unwrap the track: the box's own children are restored in order.
    track.style.transform = 'none'
    track.style.transition = 'none'
    if (wasOverflowY === '') box.style.removeProperty('overflow-y')
    else box.style.overflowY = wasOverflowY
    while (track.firstChild !== null) box.insertBefore(track.firstChild, track)
    track.remove()
  }
  box.addEventListener('scroll', onScroll, { passive: true })
  box.addEventListener('wheel', onWheel, { passive: false })
  box.addEventListener('pointerdown', onPointer)
  document.addEventListener('selectionchange', onSelection)
  document.addEventListener('visibilitychange', onVisibility)
  follows.set(row, { end, automatic: () => automatic })
  schedule()
}

/**
 * Bring the running thinking rows' follows in line with the page: start the ones
 * that appeared, stop the ones that settled or went away.
 */
export function syncThinkFollows() {
  const running = new Set<HTMLElement>()
  for (const row of document.querySelectorAll<HTMLElement>(`${THINK_ROW_SELECTOR}[data-state="${RUNNING_STATE}"]`)) {
    // The lane keys a follow by the member the row belongs to — one follow per
    // process row — while the row itself is what carries the running phase.
    const outer = row.closest<HTMLElement>('[data-turn-process-member]') ?? row
    running.add(outer)
    if (follows.has(outer) || takenByReader.has(outer)) continue
    const box = scrollBoxOf(row)
    if (box !== null) follow(outer, row, box)
  }
  for (const [row, entry] of [...follows]) {
    if (running.has(row) && entry.automatic()) continue
    // The thinking settled, or the reader took the row: the track comes off. A
    // row taken over keeps his mark while it still runs, so the lane does not
    // take it back on the next pass.
    entry.end()
    follows.delete(row)
    if (!running.has(row)) takenByReader.delete(row)
  }
  for (const row of [...takenByReader]) {
    if (running.has(row)) continue
    // The thinking settled on a row the reader had taken: the marks of the
    // lane's mode come off with it.
    takenByReader.delete(row)
    for (const box of row.querySelectorAll<HTMLElement>(`[${THINK_MODE_ATTR}]`)) {
      box.removeAttribute(THINK_MODE_ATTR)
      box.removeAttribute(THINK_EDGES_ATTR)
    }
  }
}

/** Stop every follow; the feature's teardown. */
export function stopThinkFollows() {
  for (const [row, entry] of [...follows]) {
    entry.end()
    follows.delete(row)
  }
  takenByReader.clear()
}
