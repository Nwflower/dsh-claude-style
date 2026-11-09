import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { CHAT_FLYING_ATTR, MESSAGE_ENTER_GROW, MESSAGE_FOLD_ATTR } from '../../constants'
import { motionReduced, readPrefs } from '../../core/prefs'
import { startMorph } from './send-morph'
import { currentRow, lastUserRow, takeFreshEcho, touchesUserRow } from './send-rows'
import { watchGrowEnter } from './send-grow'
import { CHAT_FLIGHT_MS, CHAT_LANDING_MS } from './send-shape'
import { snapshotComposer } from './send-snapshot'
import { CHAT_FLOW_SELECTOR, COMPOSER_CARD_SELECTOR, COMPOSER_INPUT_SELECTOR, FLOW_KIND_ATTRIBUTE, SUBMISSION_ECHO_SELECTOR, USER_ROW_KIND } from '@dsh-claude-style/contracts/dom'
import { CHAT_USER_ROW_SELECTOR, userBubble } from '@dsh-claude-style/engine/chat-dom'
import { motionEase } from '../../shared/motion'
import { inPageBox, pageViewport } from '../../shared/page-zoom'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureHandle } from '@dsh-claude-style/engine/scheduler'
import type { FeatureUi } from '../../core/feature'
import type manifest from './send-flight.manifest'
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
  /** Whether the flight is holding for a row to land on (see land()). */
  waiting: boolean
  /** Frames the stand-in and the row have both held still for (see arrived()). */
  stable: number
  /** The row's own box last frame, what `held` in arrived() compares against. */
  rowTop: number | null
  rowHeight: number
  /** When the stand-in first stood close enough to the row to end the wait early (arrived()). */
  nearAt: number | null
  /** When the flight's own animation ended, the start of the wait's hard ceiling (arrived()). */
  endedAt: number | null
  landedRow: HTMLElement | null
  bubble: HTMLElement | null
}

/** The origin is only trusted this long: an echo that appears later than this is not this submission's. */
export const CHAT_ORIGIN_TTL_MS = 1500
/**
 * The floor under the displacement limit; a screen narrower than it uses the
 * floor.
 */
export const CHAT_FLIGHT_LIMIT_FLOOR_PX = 900

/** Release hidden rows even when landing stalls or background timers are throttled. */
export const CHAT_RESCUE_MARGIN_MS = 1500

/** Keep the stand-in visible when the echo disappears before the real row mounts, with a bounded wait. */
export const CHAT_HANDOVER_WAIT_MS = 2500

/** Only an echo inside the chat flow counts: one waiting in the queue dock is another transition, not this one. */
export const CHAT_ECHO_SELECTOR = CHAT_FLOW_SELECTOR + ' ' + SUBMISSION_ECHO_SELECTOR

/** Require subpixel agreement before exposing the real row beneath the stand-in. */
export const CHAT_ARRIVED_PX = 0.5

/** At this gap, a bounded near-arrival wait may replace exact stillness. */
export const CHAT_ARRIVED_NEAR_PX = 3

/** Bound the stillness wait so scrolling or streaming cannot hide the row indefinitely. */
export const CHAT_ARRIVED_CEILING_MS = 500

/** Require several stable frames because host layout changes are observed one frame later. */
export const CHAT_ARRIVED_FRAMES = 8

/** A settled user row. It and the echo row are two faces of one component, a level apart (send-rows.ts). */

/** What the rest of the skin reads off the entrance (ui.chatSend). */
export interface ChatSendHandle extends FeatureHandle {
  /** Whether the reader's message is still taking its place: a flight in the air, or its row growing where it landed. */
  isEntering(): boolean
}

/* Capture before React clears the draft, observe the echo/real-row swap synchronously, and hide
   the destination without removing its layout box. No captured origin or offscreen endpoints means
   no flight; rescue and teardown must always restore hidden rows. */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  /** The origin captured last. */
  let origin: SendOrigin | null = null
  /** The echo rows already dealt with; the ones lying on the page at install time are included (a restored session has them). */
  const handled = new WeakSet<Element>()
  /** The flight in progress. With the reader sending twice, the last one wins. */
  let flight: Flight | null = null
  /** The backstop timer. */
  let rescue = 0

  for (const echo of document.querySelectorAll(CHAT_ECHO_SELECTOR)) handled.add(echo)

  /** Handle row replacement before paint; touchesUserRow avoids walking unchanged subtrees. */
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
    activeFlight.bubble = userBubble(row)
    followTarget(activeFlight)
  }
  /** Stops the row watch; set only while a flight is in the air. */
  let stopRowWatch: (() => void) | null = null
  const unwatchRows = () => {
    if (stopRowWatch !== null) stopRowWatch()
    stopRowWatch = null
  }

/* Hold until a real row exists, then snap to it and crossfade. The fade bridges compositor
   greyscale text and the page's subpixel text without a visible weight change. */
  const land = () => {
    const activeFlight = flight
    if (activeFlight === null || activeFlight.landing) return
    const row = activeFlight.hidden
    if (row === null || !row.isConnected) {
      // One re-arm only: this runs every frame, and the wait is the page's
      // last resort rather than a per-frame timer.
      if (!activeFlight.waiting) {
        activeFlight.waiting = true
        window.clearTimeout(rescue)
        rescue = window.setTimeout(settle, CHAT_HANDOVER_WAIT_MS)
      }
      return
    }
    activeFlight.landing = true
    row.removeAttribute(CHAT_FLYING_ATTR)
    activeFlight.hidden = null
    activeFlight.landedRow = row
    // The stand-in is put exactly on the row in this frame. arrived() has just
    // said the two are within a pixel or two, and this fade is the only thing
    // between the reader and the real row: a stand-in that is a few pixels out is
    // a second copy of the same message drifting over it.
    followTarget(activeFlight, true)
    const fade = activeFlight.morph.wrapper.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: CHAT_LANDING_MS,
      easing: motionEase('--dsh-claude-ease-out'),
      fill: 'forwards',
    })
    activeFlight.morph.animations.push(fade)
    // The handler rather than the `finished` promise: settling cancels this
    // animation, and a cancelled animation rejects its promise.
    fade.onfinish = () => {
      if (flight === activeFlight) settle()
    }
  }

/* Require close geometry and several stable frames because the host can keep moving the row.
   Near-arrival and post-animation ceilings prevent indefinite hiding; land() snaps before fading. */
  const arrived = (value: Flight) => {
    const row = value.hidden
    const bubble = value.bubble
    if (row === null || bubble === null) return false
    const shell = value.morph.shell
    if (shell === null) return false
    const here = shell.getBoundingClientRect()
    const there = bubble.getBoundingClientRect()
    // A row with no box yet is not somewhere to land: hold, as land() does.
    if (there.width === 0) return false
    const gap = Math.max(Math.abs(here.top - there.top), Math.abs(here.left - there.left), Math.abs(here.height - there.height))
    const held = value.rowTop !== null
      && Math.abs(there.top - value.rowTop) < CHAT_ARRIVED_PX
      && Math.abs(there.height - value.rowHeight) < CHAT_ARRIVED_PX
    value.rowTop = there.top
    value.rowHeight = there.height
    if (gap >= CHAT_ARRIVED_NEAR_PX) {
      value.nearAt = null
      value.stable = 0
    } else {
      if (gap < CHAT_ARRIVED_PX && held) {
        value.stable += 1
        if (value.stable >= CHAT_ARRIVED_FRAMES) return true
      } else {
        value.stable = 0
      }
      const now = performance.now()
      if (value.nearAt === null) value.nearAt = now
      if (now - value.nearAt >= CHAT_ARRIVED_CEILING_MS) return true
    }
    const ended = value.endedAt
    return ended !== null && performance.now() - ended >= CHAT_ARRIVED_CEILING_MS
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
    // Remove before cancelling: cancellation can otherwise paint the compositor's initial halo for one frame.
    activeFlight.morph.wrapper.remove()
    for (const animation of activeFlight.morph.animations) animation.cancel()
  }

/* Per frame only normalize and follow the destination; row replacement stays in the observer.
   Displacement and shape remain shared compositor keyframe runs so main-thread stalls cannot separate them. */
  const tick = () => {
    const activeFlight = flight
    if (activeFlight === null) return
    const u = activeFlight.morph.progress()
    activeFlight.morph.compact(u)
    if (activeFlight.endedAt === null && u >= 1) activeFlight.endedAt = performance.now()
    if (!activeFlight.landing) {
      followTarget(activeFlight)
      if (u >= 1 && arrived(activeFlight)) land()
    } else {
      // Through the fade the stand-in is pinned to the row: read and write in the
      // same task, so no frame of lag. The row has settled by then — arrived()
      // waits for that — but the host can still move it a few pixels (the
      // transcript gliding to its tail), and a stand-in left a few pixels short
      // uncovers the row's own foot, which reads as a line under the message.
      followTarget(activeFlight, true)
    }
    requestFrame({ write: tick })
  }

  /** Start one flight: stand-in up, real row hidden. All of it synchronously — a frame later the reader sees the real bubble flash. */
  const startFlight = (echo: HTMLElement, draft: SendOrigin) => {
    // A flight still going is settled first: otherwise the old stand-in stays
    // on the page for ever (one ghost per extra send) and the old real row
    // keeps its hide mark, so the reader never sees that message again. With
    // the reader sending twice, the last flight wins.
    settle()
    const bubble = userBubble(echo)
    if (bubble === null) return
    // Both ends of the flight, and the window they have to share, in the page's
    // own pixels: that is the space the stand-in's styles are read in
    // (shared/page-zoom.ts).
    const box = inPageBox(bubble.getBoundingClientRect())
    const card = draft.snapshot.box
    const viewport = pageViewport()
    const onSameScreen = sameScreen(card.left, box.left, viewport.width)
      && sameScreen(card.top, box.top, viewport.height)
    if (!onSameScreen) return
    // A message the fold holds flies as the folded message it will stand as
    // (send-morph.ts's capped flight).
    const morph = startMorph(draft.snapshot, bubble, box, bubble.hasAttribute(MESSAGE_FOLD_ATTR))
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
      waiting: false,
      stable: 0,
      rowTop: null,
      rowHeight: 0,
      nearAt: null,
      endedAt: null,
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
    // at install (D40): a still page is a decision the reader can change
    // without a reload, and the resolved answer is what the rest of the skin
    // reads — the media query cannot express "always play".
    if (motionReduced()) return
    // Growing into place needs no origin: the echo alone says a message was
    // sent, and snapshotting the card would only cost a clone (send-grow.ts).
    if (readPrefs().messageEnter === MESSAGE_ENTER_GROW) return
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
  // The other answer to the same question (constants.ts MESSAGE_ENTER_MODES):
  // the message grows where it lands instead of flying, and that path needs no
  // origin snapshot at all. Both run; whichever the reader picked does the work.
  const grow = watchGrowEnter()

  /**
   * Whether the reader's message is still taking its place: a flight is in the
   * air (through its landing fade) or the row is growing where it landed. The
   * follow reads this where it used to wait out a window timed from the row's
   * arrival (features/chat-follow): the slide stands down exactly while this
   * entrance reads the row's own box, and not a moment longer.
   */
  ui.chatSend = {
    isEntering: () => flight !== null || grow.entering(),
  }

  return () => {
    delete ui.chatSend
    document.removeEventListener('keydown', onKeyDown, true)
    document.removeEventListener('click', onClick, true)
    grow.stop()
    unwatchEcho()
    unwatchRows()
    origin = null
    settle()
  }
}

/** A draft the instant before it takes off: the whole composer card's snapshot. */
/** A flight in progress. `hidden` is repointed when the echo is swapped for the real row. */
/**
 * Add how far the destination moved to the stand-in's outer layer, and take the
 * destination's own node again when the one held is gone.
 *
 * This is the frame's only JavaScript: one rect read and at most one style
 * write. The destination usually moves a few dozen pixels during a flight (the
 * host scrolls to the end after a submission, the echo becomes the real row),
 * and the echo row is taken away and a new row mounted in its place, so the node
 * the flight was pointed at can leave the document mid-flight. A remembered node
 * off the document measures as a zero box: the stand-in then holds where it is
 * for the rest of the flight, lands tens of pixels away from the row, and both
 * are on screen at once through the landing fade (arrived() in the installer).
 */
export function followTarget(value: Flight, snap = false) {
  let bubble = value.bubble
  // The node the destination was taken from can stop being the row's own: the
  // echo row is unmounted once the real one is there, and the host can mount
  // another echo or swap the row again while this flight still points at the
  // one before it. A stale node off the document measures as a zero box, and the
  // stand-in then holds where it is for the rest of the flight — the reader
  // waits on a message that never arrives. So the destination is taken from the
  // row the flight is holding, every frame.
  const held = value.hidden === null ? null : userBubble(value.hidden)
  if (held !== null && bubble !== held) bubble = held
  if (bubble === null) return
  let box = inPageBox(bubble.getBoundingClientRect())
  // The row the flight holds can leave the document while the stand-in still
  // flies (the echo becoming the real row), and a node off the document measures
  // a zero box. Holding still there leaves the stand-in hundreds of pixels off a
  // row that is already showing — the same message twice, one above the other —
  // so the destination is taken from the row on the page, by the rule the row
  // watch uses. Once the row is back, the frame closes the difference whole.
  if (box.width === 0) {
    const row = currentRow(value.previous) ?? value.landedRow
    const fresh = row === null ? null : userBubble(row)
    if (fresh === null || fresh === bubble) return
    bubble = fresh
    box = inPageBox(bubble.getBoundingClientRect())
    if (box.width === 0) return
  }
  if (bubble !== value.bubble) {
    value.bubble = bubble
    // The new node's own position is where the stand-in is being carried from,
    // so the shift is measured against it rather than against the old row's.
    value.targetAt = { left: box.left, top: box.top }
    value.shiftedX = 0
    value.shiftedY = 0
    // The stand-in is elsewhere in the frame the destination is taken again —
    // this is also the hand-over's own frame (land()) — so that frame closes the
    // difference whole rather than gliding it: a fade across two pictures of the
    // same message is exactly what the reader sees as a flicker.
    snap = true
  }
  const shiftX = box.left - value.targetAt.left
  const shiftY = box.top - value.targetAt.top
  if (!snap && shiftX === value.shiftedX && shiftY === value.shiftedY) return
  value.shiftedX = shiftX
  value.shiftedY = shiftY
  value.morph.wrapper.style.transform = 'translate(' + shiftX + 'px, ' + shiftY + 'px)'
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
