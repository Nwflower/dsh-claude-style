import { subscribeMutations } from '../../core/bus'
import { requestFrame } from '../../core/frame'
import { CHAT_FLYING_ATTR } from '../../constants'
import { motionReduced } from '../../core/prefs'
import { startMorph } from './send-morph'
import { CHAT_FLIGHT_MS, CHAT_LANDING_MS } from './send-shape'
import { chatSendAlpha, snapshotComposer } from './send-snapshot'
import { CHAT_FLOW_SELECTOR, COMPOSER_CARD_SELECTOR, COMPOSER_INPUT_SELECTOR, SUBMISSION_ECHO_SELECTOR } from '../../contracts/dom'
import type { HostContext } from '../../core/host'
import type { Ui } from '../../core/scheduler'
import type { ComposerSnapshot } from './send-snapshot'

/** A submission's origin: the composer card read at the press. */
interface SendOrigin {
  capturedAt: number
  snapshot: ComposerSnapshot
}

/** One flight in progress. */
interface Flight {
  morph: NonNullable<ReturnType<typeof startMorph>>
  /** Where the bubble was at take-off, and how far the stand-in has followed it since. */
  targetAt: { left: number, top: number }
  shiftedX: number
  shiftedY: number
  previous: HTMLElement | null
  hidden: HTMLElement | null
  landing: boolean
  landedRow: HTMLElement | null
  bubble: HTMLElement | null
}

/** The origin is only trusted this long: an echo that appears later than this is not this submission's. */
export const CHAT_ORIGIN_TTL_MS = 1500
/**
 * The floor under the displacement limit; a screen narrower than it uses the
 * floor.
 *
 * This used to be a fixed 900px ceiling, which misfires on wide screens: the
 * host caps its content column at 920px and the composer card is 16px wider
 * than the column on each side, so the two ends sit about 890 apart
 * horizontally, right on the threshold; vertically it grows with the window —
 * in a short session the messages sit at the top of the column while the
 * composer sticks to the bottom, and a thousand-odd pixels across one screen is
 * ordinary. Neither axis should be decided by how large the screen is.
 */
export const CHAT_FLIGHT_LIMIT_FLOOR_PX = 900

/** The backstop keeps a little longer than the flight itself: a throttled background timer still has to release the message before the reader comes back. */
export const CHAT_RESCUE_MARGIN_MS = 400

/** Only an echo inside the chat flow counts: one waiting in the queue dock is another transition, not this one. */
export const CHAT_ECHO_SELECTOR = CHAT_FLOW_SELECTOR + ' ' + SUBMISSION_ECHO_SELECTOR

/** A settled user row. It and the echo row are two faces of one component, a level apart. */
export const CHAT_USER_ROW_SELECTOR = CHAT_FLOW_SELECTOR + ' [data-chat-flow-kind="user"]'

/** The two kinds of row a flight watches for, asked in one query: the real user row and the echo before it. */
export const CHAT_ROW_SELECTOR = CHAT_USER_ROW_SELECTOR + ', ' + CHAT_ECHO_SELECTOR

/**
 * The send bubble's take-off, ported from dsh-chat-ux.
 *
 * After a submission the host mounts an echo bubble at once and swaps it for
 * the real row the moment that arrives. Measured: the echo lives 159 ms while
 * the real row takes over a second. An animation hung on either node is dead on
 * arrival (on the echo it loses its node midway; waiting for the real row leaves
 * a second of nothing), so this draws a stand-in of its own: a copy of the
 * composer card lifts off and narrows into the bubble as it travels. How the
 * stand-in is built and how the shape is worked out is in send-morph.ts; this
 * module decides when it takes off, where it flies and when it lands.
 *
 *   capture   the submission's capture phase takes the whole composer card
 *             (clone, geometry, looks), all before React clears the draft.
 *   notice    the echo row is noticed the moment it mounts, through a
 *             MutationObserver rather than a per-frame poll.
 *   launch    the stand-in goes on the page and the whole animation goes to
 *             the compositor; the real row is marked and hidden (keeping its
 *             layout box, so the destination can be measured every frame).
 *   per frame exactly two things: how far the destination moved (the host
 *             scrolling to the end, the echo becoming the real row) is added to
 *             the stand-in's outer layer; and once the shape's stretch is over,
 *             the shell is normalised (see send-morph.ts's compact). Position,
 *             shape, colour and the words' re-flow are all on the compositor,
 *             so they keep moving while the host parses a response on the main
 *             thread.
 *   land      unmark the real row and fade the stand-in out over it
 *             (CHAT_LANDING_MS), then drop the stand-in — the real row is
 *             already at the destination, so the hand-over moves nothing,
 *             and the fade carries the words from the stand-in's rendering
 *             to the page's (see land()).
 *
 * Five edges:
 *
 *   Hide in the same frame   the observer's callback runs before this frame
 *                            paints, so the real row is never shown for a frame;
 *                            a frame later the reader sees a normal bubble
 *                            flash and then be wiped.
 *   Notice outside the frame  "at once" is not "every frame": the echo being
 *                            swapped for the real row is recognised
 *                            synchronously before this frame paints, and asking
 *                            again in the frame is wasted work.
 *   No origin, no flight     when the origin cannot be captured (a keyboard
 *                            shortcut, a programmatic submission) nothing is
 *                            done and the reader sees the host's own behaviour.
 *   Hidden must be returned  while the real row is hidden the reader cannot see
 *                            that message, so besides the normal landing there
 *                            is a timer as a backstop: rAF stops in a hidden
 *                            tab, the stand-in stops, and the mark must not stay.
 *   One screen only          with either end off screen the stand-in would
 *                            vanish at the edge and the message would look like
 *                            it appeared out of nothing, so it does not fly.
 *
 * @param ctx - client context.
 * @param ui - shared handle table.
 * @returns teardown: the listeners go, and a flight in progress — a hidden
 *     message included — is settled.
 */
export function install(ctx: HostContext, ui: Ui) {
  /** The origin captured last. */
  let origin: SendOrigin | null = null
  /** The echo rows already dealt with; the ones lying on the page at install time are included (a restored session has them). */
  const handled = new WeakSet<Element>()
  /** The flight in progress. With the reader sending twice, the last one wins. */
  let flight: Flight | null = null
  /** The backstop timer. */
  let rescue = 0

  for (const echo of document.querySelectorAll(CHAT_ECHO_SELECTOR)) handled.add(echo)

  /**
   * Watch the row during a flight: the echo being swapped for the real row is
   * the one thing that has to be known at once.
   *
   * It runs before this frame paints, so one synchronous look is enough; and
   * only rows arriving or leaving are looked at — the pre-filter checks the
   * added and removed nodes themselves, since both marks sit on the row
   * element and finding the row needs no subtree walk.
   */
  const onRowRecords = (records: MutationRecord[]) => {
    const activeFlight = flight
    if (activeFlight === null || !touchesUserRow(records)) return
    const row = currentRow(activeFlight.previous)
    if (row === null || row === activeFlight.hidden || row === activeFlight.landedRow) return
    // Landing, the real row is already showing under the fading stand-in:
    // a row swapped in now is followed, not hidden.
    if (activeFlight.landing) {
      activeFlight.landedRow = row
    } else {
      activeFlight.hidden?.removeAttribute(CHAT_FLYING_ATTR)
      row.setAttribute(CHAT_FLYING_ATTR, '')
      activeFlight.hidden = row
    }
    activeFlight.bubble = findBubble(row)
    followTarget(activeFlight)
  }
  /** Stops the row watch; set only while a flight is in the air. */
  let stopRowWatch: (() => void) | null = null
  const unwatchRows = () => {
    if (stopRowWatch !== null) stopRowWatch()
    stopRowWatch = null
  }

  /**
   * Hand the stand-in over to the real bubble: show the real row under it and
   * fade the stand-in out over CHAT_LANDING_MS, still following the
   * destination, then settle.
   *
   * The two are the same bubble in the same place, but they are not drawn
   * alike: the stand-in flies on compositor layers, and a transparent layer
   * draws its words with greyscale antialiasing where the page draws the
   * real bubble's with the screen's subpixel antialiasing (ClearType on
   * Windows). Swapped in one frame, the words visibly darken and change
   * weight the instant the flight ends; faded across, they sharpen into the
   * real ones.
   */
  const land = () => {
    const activeFlight = flight
    if (activeFlight === null || activeFlight.landing) return
    activeFlight.landing = true
    const row = activeFlight.hidden
    row?.removeAttribute(CHAT_FLYING_ATTR)
    activeFlight.hidden = null
    activeFlight.landedRow = row
    const fade = activeFlight.morph.wrapper.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: CHAT_LANDING_MS,
      easing: 'ease-out',
      fill: 'forwards',
    })
    activeFlight.morph.animations.push(fade)
    // The handler rather than the `finished` promise: settling cancels this
    // animation, and a cancelled animation rejects its promise.
    fade.onfinish = () => {
      if (flight === activeFlight) settle()
    }
  }

  /** Land: release the real row first, then drop the stand-in. Reversed, a blank flashes. */
  const settle = () => {
    const activeFlight = flight
    if (activeFlight === null) return
    flight = null
    unwatchRows()
    window.clearTimeout(rescue)
    rescue = 0
    activeFlight.hidden?.removeAttribute(CHAT_FLYING_ATTR)
    // The stand-in leaves the document **before** its animations are
    // cancelled, never the other way round. Cancelling returns the halo to
    // "never moved" — as large as the whole composer card — and the halo's
    // run mixes scale and opacity into one compositable animation: the cancel
    // goes through the compositor, the node removal goes through the
    // compositor, and the wrong order paints one extra frame, which the reader
    // sees as the width stretching and snapping back. Once the node is out of
    // the document its animations are void, and the cancel below only clears
    // the references.
    activeFlight.morph.wrapper.remove()
    for (const animation of activeFlight.morph.animations) animation.cancel()
  }

  /**
   * Three things per frame: notice the shape's stretch is over and normalise
   * the shell, add the destination's movement, and book the next frame.
   * Recognising the row is the observer's job above — it is not a
   * per-frame question.
   *
   * Neither the displacement nor the shape is written here: the two keyframe
   * runs share one timeline (one duration, one set of offsets) and keep running
   * together through the tens to hundreds of milliseconds the host holds the
   * main thread, so the right-edge equation in send-shape.ts holds throughout.
   * This path was burnt once: the displacement on the compositor with the shape
   * left in a main-thread `clip-path`, and a stall flew a card that had not
   * narrowed to the destination.
   *
   * The other two are main-thread work: `compact` writes styles once, and
   * `followTarget` reads the current layout.
   */
  const tick = () => {
    const activeFlight = flight
    if (activeFlight === null) return
    const u = activeFlight.morph.progress()
    activeFlight.morph.compact(u)
    if (u >= 1) land()
    followTarget(activeFlight)
    requestFrame({ write: tick })
  }

  /** Start one flight: stand-in up, real row hidden. All of it synchronously — a frame later the reader sees the real bubble flash. */
  const startFlight = (echo: HTMLElement, draft: SendOrigin) => {
    // A flight still going is settled first: otherwise the old stand-in stays
    // on the page for ever (one ghost per extra send) and the old real row
    // keeps its hide mark, so the reader never sees that message again. With
    // the reader sending twice, the last flight wins.
    settle()
    const bubble = findBubble(echo)
    if (bubble === null) return
    const box = bubble.getBoundingClientRect()
    const card = draft.snapshot.box
    const onSameScreen = sameScreen(card.left, box.left, window.innerWidth)
      && sameScreen(card.top, box.top, window.innerHeight)
    if (!onSameScreen) return
    const morph = startMorph(draft.snapshot, bubble, box)
    if (morph === null) return
    echo.setAttribute(CHAT_FLYING_ATTR, '')
    flight = {
      morph,
      targetAt: { left: box.left, top: box.top },
      shiftedX: 0,
      shiftedY: 0,
      previous: lastUserRow(),
      hidden: echo,
      // Whether the flight has landed and is fading across to the real row, and that row.
      landing: false,
      landedRow: null,
      bubble,
    }
    if (stopRowWatch === null) stopRowWatch = subscribeMutations(document.body, { childList: true, subtree: true }, onRowRecords)
    rescue = window.setTimeout(settle, CHAT_FLIGHT_MS + CHAT_LANDING_MS + CHAT_RESCUE_MARGIN_MS)
    // The flight compacts the card and follows the destination's layout: write phase (D40).
    requestFrame({ write: tick })
  }

  /**
   * Wait for this submission's echo.
   *
   * Only hung up once an origin has been captured (so there are no callbacks the
   * rest of the time), and taken off the moment it is recognised, times out or
   * is given up on.
   */
  let stopEchoWatch: (() => void) | null = null
  const unwatchEcho = () => {
    if (stopEchoWatch !== null) stopEchoWatch()
    stopEchoWatch = null
  }
  const onEchoRecords = () => {
    const draft = origin
    if (draft === null) {
      unwatchEcho()
      return
    }
    if (performance.now() - draft.capturedAt > CHAT_ORIGIN_TTL_MS) {
      origin = null
      unwatchEcho()
      return
    }
    const echo = takeFreshEcho(handled)
    if (echo === null) return
    origin = null
    unwatchEcho()
    startFlight(echo, draft)
  }

  /** Capture an origin once. Not capturing it counts as "this was not a submission", and doing nothing is always safe. */
  const captureOrigin = () => {
    // The reader's animation choice, resolved and read here rather than once
    // at install (D26): a still page is a decision the reader can change
    // without a reload, and the resolved answer is what the rest of the skin
    // reads — the media query cannot express "always play".
    if (motionReduced()) return
    const input = document.querySelector(COMPOSER_INPUT_SELECTOR)
    if (!(input instanceof HTMLElement)) return
    const card = input.closest(COMPOSER_CARD_SELECTOR)
    if (!(card instanceof HTMLElement)) return
    // An empty draft submits no message, and measuring it would only waste a clone.
    if ((input.textContent ?? '').trim() === '') return
    const snapshot = snapshotComposer(input, card)
    if (snapshot === null) return
    origin = { capturedAt: performance.now(), snapshot }
    if (stopEchoWatch === null) stopEchoWatch = subscribeMutations(document.body, { childList: true, subtree: true }, onEchoRecords)
  }

  /**
   * The two manual submission paths: Enter, and pressing a button inside the
   * composer card. Both run before React clears the draft, so the origin can be
   * measured. Pressing without submitting costs nothing — no echo, no flight.
   */
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.isComposing) return
    captureOrigin()
  }

  const onClick = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return
    if (event.target.closest(COMPOSER_CARD_SELECTOR) === null) return
    captureOrigin()
  }

  document.addEventListener('keydown', onKeyDown, true)
  document.addEventListener('click', onClick, true)

  return () => {
    document.removeEventListener('keydown', onKeyDown, true)
    document.removeEventListener('click', onClick, true)
    unwatchEcho()
    unwatchRows()
    origin = null
    settle()
  }
}

/** A draft the instant before it takes off: the whole composer card's snapshot. */
/** A flight in progress. `hidden` is repointed when the echo is swapped for the real row. */
/**
 * Add how far the destination moved to the stand-in's outer layer.
 *
 * This is the frame's only JavaScript: one rect read and at most one style
 * write. The destination usually moves a few dozen pixels during a flight (the
 * host scrolls to the end after a submission, the echo becomes the real row),
 * so adding the difference whole looks the same as recomputing the position
 * from the curve every frame.
 */
export function followTarget(value: Flight) {
  const bubble = value.bubble
  if (bubble === null) return
  const box = bubble.getBoundingClientRect()
  // While the row is taken away and the new one is not in yet the box measured
  // is off the document (all zeroes). Holding still beats throwing the stand-in
  // to the top left: the next frame the observer recognises the new row and
  // picks up again.
  if (box.width === 0) return
  const shiftX = box.left - value.targetAt.left
  const shiftY = box.top - value.targetAt.top
  if (shiftX === value.shiftedX && shiftY === value.shiftedY) return
  value.shiftedX = shiftX
  value.shiftedY = shiftY
  value.morph.wrapper.style.transform = 'translate(' + shiftX + 'px, ' + shiftY + 'px)'
}

/**
 * Take one echo row that has not been dealt with.
 *
 * Of a batch only the newest is taken (querySelectorAll is in document order)
 * and the rest are noted too, or they would be treated as new in later frames
 * and fly again.
 */
export function takeFreshEcho(handled: WeakSet<Element>) {
  const fresh: Element[] = []
  for (const echo of document.querySelectorAll(CHAT_ECHO_SELECTOR)) {
    if (!handled.has(echo)) fresh.push(echo)
  }
  if (fresh.length === 0) return null
  for (const echo of fresh) handled.add(echo)
  const latest = fresh.at(-1)
  return latest instanceof HTMLElement ? latest : null
}

/** The row to hide right now: the echo while it is there, and the real row once it has been swapped in. */
export function currentRow(previous: HTMLElement | null) {
  const echo = document.querySelector(CHAT_ECHO_SELECTOR)
  if (echo instanceof HTMLElement && echo !== previous) return echo
  const row = lastUserRow()
  return row === previous ? null : row
}

/** The last user row in the chat flow. */
export function lastUserRow() {
  const rows = document.querySelectorAll(CHAT_USER_ROW_SELECTOR)
  const last = rows.item(rows.length - 1)
  return last instanceof HTMLElement ? last : null
}

/**
 * The element inside a user row that really paints a fill, which is the bubble.
 *
 * The depth cannot be assumed: the echo row is the bubble's own row (the echo
 * mark sits on it) while the real row has a flow-block wrapper around it, so
 * the two differ by a level. So the walk goes down level by level and takes the
 * first element that paints a fill; attachment rows and quote summaries paint
 * none and are skipped.
 */
export function findBubble(row: Element) {
  const queue = Array.from(row.children)
  while (queue.length > 0) {
    const node = queue.shift()
    if (node === undefined) break
    if (node instanceof HTMLElement && chatSendAlpha(window.getComputedStyle(node).backgroundColor) > 0) return node
    for (const child of node.children) queue.push(child)
  }
  return null
}

/**
 * Whether this batch of DOM changes touched a user row or an echo row.
 *
 * Only the added and removed nodes themselves are looked at: both marks sit on
 * the row element, and finding the row needs no subtree walk — on a long
 * session one walk is thousands of nodes.
 * @returns true when a row is worth recognising.
 */
export function touchesUserRow(records: MutationRecord[]) {
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (isRowNode(node)) return true
    }
    for (const node of record.removedNodes) {
      if (isRowNode(node)) return true
    }
  }
  return false
}

/** Whether a node, or the subtree it brings, holds a user row or an echo row. */
export function isRowNode(node: Node) {
  return node instanceof HTMLElement
    && (node.matches(CHAT_ROW_SELECTOR) || node.querySelector(CHAT_ROW_SELECTOR) !== null)
}

/**
 * Are the two ends still on one screen?
 *
 * The screen's extent is read from the viewport on that axis (the floor is
 * CHAT_FLIGHT_LIMIT_FLOOR_PX): while both boxes are still on the screen the
 * flight is visible, and with one end off it the stand-in would vanish at the
 * edge and the message would look like it appeared out of nothing, so it does
 * not fly.
 */
export function sameScreen(start: number, end: number, viewportExtent: number) {
  return Math.abs(start - end) <= Math.max(CHAT_FLIGHT_LIMIT_FLOOR_PX, viewportExtent)
}
