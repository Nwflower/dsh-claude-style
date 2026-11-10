import { requestFrame } from '@dsh-claude-style/engine/frame'
import { MODEL_EFFORT_DEFAULT, MODEL_EFFORT_FASTER, MODEL_EFFORT_LABEL, MODEL_EFFORT_NONE, MODEL_EFFORT_SMARTER } from '../model/model-labels'
import { effortSteps } from './ladder'
import type { EffortStep } from './ladder'
import { createEffortMatrix } from './matrix'
import { buildElement, setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { inPagePixels } from '../../shared/page-zoom'
import { withoutTransition } from '../../shared/transition'
import { createNameSwap } from './name-swap'
import type { ModelCatalog } from '../model/catalog'
import { copy } from './copy'

/** The words around the slider. */
interface EffortLabels {
  label: string
  faster: string
  smarter: string
  none: string
}

/** The knob's width and the track's, in the pixels the travel is written in. */
export interface EffortTrackBox {
  size: number
  width: number
}

/**
 * The reasoning-effort slider in the effort picker's card
 * (features/effort/effort-picker.ts): the catalog's discrete ladder drawn as a
 * track ordered by strength (ladder.ts). The knob follows the pointer
 * continuously and settles on the nearest level at the release; the top rung
 * swaps the fill for the dot matrix (effort/matrix.ts). A seat that names no
 * levels keeps the travel and eases back, with nothing to select.
 *
 * The element is built once and never detached (effort-picker.ts): a detach
 * mid-gesture drops the pointer capture, and a re-insertion restarts the CSS
 * animations.
 *
 * @param opts - `read()` returns the current seat's effort descriptor or null,
 *   `onPick(levelId)` commits one level (`undefined` is the model's own
 *   default), and `onDragEnd(event)` hears the release wherever it lands.
 * @returns `{ el, update, measure, isHeld, dispose }`.
 */
export function createEffortControl(opts: {
  read: () => ReturnType<ModelCatalog['effort']>
  onPick: (levelId: string | undefined) => void
  onDragStart?: () => void
  onDragEnd?: (event: PointerEvent) => void
}) {
  const root = buildElement('div', 'dsh-claude-effort')
  const head = buildElement('div', 'dsh-claude-effort-head')
  const labelEl = buildElement('span', 'dsh-claude-effort-label')
  const valueEl = buildElement('span', 'dsh-claude-effort-value')
  /* The name being travelled to, absolutely positioned over the value: the
     incoming words sit where the knob has not reached and take no layout space. */
  const valuePreview = buildElement('span', 'dsh-claude-effort-value-preview')
  const ends = buildElement('div', 'dsh-claude-effort-ends')
  const fasterEl = buildElement('span', 'dsh-claude-effort-end')
  const smarterEl = buildElement('span', 'dsh-claude-effort-end')
  const track = buildElement('div', 'dsh-claude-effort-track')
  const fill = buildElement('div', 'dsh-claude-effort-fill')
  const ticks = buildElement('div', 'dsh-claude-effort-ticks')
  const matrix = buildElement('div', 'dsh-claude-effort-matrix')
  const knob = buildElement('div', 'dsh-claude-effort-knob')

  head.appendChild(labelEl)
  head.appendChild(valueEl)
  head.appendChild(valuePreview)
  ends.appendChild(fasterEl)
  ends.appendChild(smarterEl)
  /* Paint order is DOM order: the fill under the ticks, the matrix over
     both, and the opaque knob on top — it covers whatever it rides over. */
  track.appendChild(fill)
  track.appendChild(ticks)
  track.appendChild(matrix)
  track.appendChild(knob)
  root.appendChild(head)
  root.appendChild(ends)
  root.appendChild(track)
  track.setAttribute('role', 'slider')
  track.setAttribute('tabindex', '0')
  /** The top rung's dot matrix (effort/matrix.ts). */
  const dotMatrix = createEffortMatrix(track, matrix)

  /** The ladder in force, the level it is on, and the words around it. */
  let steps: EffortStep[] = []
  let selected = -1
  let live = -1
  /** The knob's travel, in the same pixels its translate uses. */
  let liveTravel = 0
  /** Which way the knob last moved: 1 toward stronger, -1 toward weaker, 0 still. */
  let moveDirection = 0
  /**
   * A press and a drag are two states. `pressed` starts on pointerdown and the
   * knob GLIDES to the press position on the stylesheet's transition;
   * `dragging` starts on the first move and switches the transition off so the
   * knob keeps up. Setting the drag flag at pointerdown would kill the glide:
   * the transition list is read at the next style recalc, by then already on.
   *
   * The hold spans the whole gesture: the pointer capture keeps the moves
   * coming outside the control, and only the release ends it, so the picker's
   * hover-close hears the button up first (onRelease).
   */
  let pressed = false
  let dragging = false
  let painted = false
  let pointerId: number | null = null
  /** The dash shown when there is no level to name; cached, not re-read per move. */
  let noneLabel = ''
  /** The two name layers, driven by the knob's own travel. */
  const nameSwap = createNameSwap({
    root,
    value: valueEl,
    preview: valuePreview,
    steps: () => steps,
    selected: () => selected,
    none: () => noneLabel,
  })
  /** Whether the top-rung treatment (the matrix) is on. */
  let apexOn = false
  /** The track width the ticks were laid out for, so a late layout re-does them. */
  let ticksWidth = -1
  /**
   * The level just committed, and whether the host has echoed it back yet.
   * The host's catalog snapshot TRAILS the commit, so between the release and
   * the echo it still names the OLD level: following it would drag the knob
   * back and forward again — the "bounce" on release. While this flag is set,
   * update() keeps the knob on the committed level; the echo, or the safety
   * timeout, ends the wait.
   */
  let pendingEcho = false
  let pendingId: string | undefined = undefined
  let pendingTimer = 0
  /** Longest a commit waits for its echo before the host is trusted again. */
  const PENDING_ECHO_MS = 12000

  /**
   * The ladder as ordered steps, the step in force, and the words. A model
   * with no reasoning (or no catalog entry yet) resolves to an empty ladder:
   * the slider shows with nothing to select. A missing `defaultEffort` is a
   * real position on the track, so it leads the steps with an undefined id.
   */
  function state(): { steps: EffortStep[], index: number, labels: EffortLabels } {
    const effort = opts.read()
    const ladder = effort === null
      ? { steps: [] as EffortStep[], index: -1 }
      : effortSteps(effort, MODEL_EFFORT_DEFAULT)
    return {
      steps: ladder.steps,
      index: ladder.index,
      labels: {
        label: copy('effortLabel'),
        faster: copy('effortFaster'),
        smarter: copy('effortSmarter'),
        none: MODEL_EFFORT_NONE,
      },
    }
  }

  /** The knob's width and the track's, as the pass's read phase took them for the update in hand. */
  let passBox: EffortTrackBox | null = null

  /** The knob's width and the track's: the pass's reading inside its update, a fresh one anywhere else. */
  function trackBox(): EffortTrackBox {
    return passBox ?? measureTrack()
  }

  /** Read the knob's width and the track's off the layout. */
  function measureTrack(): EffortTrackBox {
    return { size: knob.offsetWidth || 16, width: track.clientWidth }
  }

  /** How wide the knob is, and how far its centre may travel. */
  function geometry() {
    const box = trackBox()
    return { size: box.size, span: Math.max(0, box.width - box.size) }
  }

  /** The knob's x for one level. No levels (or a single one) rest at the end. */
  function positionFor(index: number) {
    const box = geometry()
    if (index < 0 || steps.length < 2) return box.span
    return (index / (steps.length - 1)) * box.span
  }

  /**
   * Move the knob. While the gesture runs this is ONE compositor write: the
   * stylesheet drops `translate` from the transition under `data-dragging`, so
   * an inline transition dance and its forced reflow would be pure overhead.
   * That dance survives only for the rare non-drag instant move (a ladder swap
   * on first paint), where the stylesheet would otherwise animate the jump.
   *
   * The travel goes through the INDIVIDUAL `translate`, never `transform`: the
   * drag lift is `scale`, and the individual properties compose as
   * translate → scale, so a travel in `transform` would be scaled by the lift.
   */
  let lastTravel = ''
  let lastWidth = ''

  function place(x: number, animate: boolean) {
    const px = Math.round(x)
    const value = `${px}px`
    /* The fill runs from the track's left end to the knob's centre (+8 is half
       the 16px knob) and disappears under the opaque knob. An empty ladder
       selects nothing, and nothing stays unfilled. */
    const width = steps.length === 0 ? '0px' : `${px + 8}px`
    /* Same-value guard: update() runs on every scheduler pass, and re-writing
       an unchanged position would run the transition dance's forced reflow —
       worse, mid-glide it cancels the transition and snaps the knob. */
    if (value === lastTravel && width === lastWidth) return
    lastTravel = value
    lastWidth = width
    if (animate || dragging) {
      knob.style.translate = value
      fill.style.width = width
      return
    }
    withoutTransition([knob, fill], () => {
      knob.style.translate = value
      fill.style.width = width
    })
  }

  /** Where the pointer sits along the track, in knob-travel units. */
  function pointerTravel(clientX: number) {
    const box = geometry()
    // The distance the pointer covers, in the pixels the travel is written in;
    // the knob's own size already is (shared/page-zoom.ts).
    const raw = inPagePixels(clientX - track.getBoundingClientRect().left) - box.size / 2
    return Math.max(0, Math.min(box.span, raw))
  }

  /**
   * How strongly the knob resists leaving a stop: 0 is pure 1:1 tracking;
   * 0.8 makes it creep out at a fifth of the pointer's speed and overtake it
   * mid-segment. Must stay below 1, or the slope `1 - D·cos(2πt)` reaches zero
   * and the travel stops being monotone.
   */
  const DETENT = 0.8
  /**
   * How far the pointer must travel before a press becomes a drag. A click
   * brings a pixel or two, and treating that as a drag would switch the
   * transition off before the press glide has played.
   */
  const DRAG_THRESHOLD_PX = 3

  /**
   * The detent transfer: raw pointer travel → knob travel. Within one segment
   * the knob lags near the ends and catches up in the middle
   * (`t - D·sin(2πt)/2π`). The curve fixes every stop and midpoint and is
   * monotone, so `nearest()` may keep reading the RAW position. Applied on the
   * pointer paths only — settle and the host echo place the knob on a stop.
   */
  function dampTravel(x: number) {
    if (steps.length < 2) return x
    const box = geometry()
    if (box.span === 0) return x
    const seg = box.span / (steps.length - 1)
    const index = Math.floor(x / seg)
    if (index >= steps.length - 1) return x
    const t = (x - index * seg) / seg
    return (index + t - DETENT * Math.sin(2 * Math.PI * t) / (2 * Math.PI)) * seg
  }

  /** The level nearest a travel position: the one a release settles on. */
  function nearest(x: number) {
    if (steps.length === 0) return -1
    if (steps.length === 1) return 0
    const box = geometry()
    const ratio = box.span === 0 ? 0 : x / box.span
    return Math.max(0, Math.min(steps.length - 1, Math.round(ratio * (steps.length - 1))))
  }

  /**
   * The top rung is the showpiece: reaching it (a settled level or a drag's
   * live position) swaps the plain fill for the matrix, tints the knob and
   * colours the name. Everything hangs off `data-apex`; the guard keeps the
   * attribute writes — which the scheduler's observer sees — to transitions.
   */
  function paintApex(at: number) {
    const want = steps.length > 1 && at === steps.length - 1
    if (want === apexOn) return
    if (want && !dotMatrix.ensure()) return
    apexOn = want
    if (want) root.setAttribute('data-apex', '')
    else root.removeAttribute('data-apex')
  }

  /**
   * One tick dot per stop, centred on the stop's resting position. Rebuilt when
   * the track's width moves out from under the last layout (first paint can run
   * before the picker has its width). The dots carry no state: the fill and the
   * opaque knob swallow the passed ones.
   */
  function paintTicks() {
    const w = trackBox().width
    if (!w || w === ticksWidth) return
    ticksWidth = w
    while (ticks.firstChild) ticks.removeChild(ticks.firstChild)
    const box = geometry()
    for (let i = 0; i < steps.length; i++) {
      const dot = buildElement('span', 'dsh-claude-effort-tick')
      dot.style.left = `${Math.round(positionFor(i) + box.size / 2)}px`
      ticks.appendChild(dot)
    }
  }

  /**
   * The level's name while the gesture runs, the committed one otherwise. The
   * two layers live in name-swap.ts; this reads the slider's travel into them.
   */
  function paintValue() {
    const at = pressed ? live : selected
    nameSwap.paint(at, pressed, dragging, liveTravel, moveDirection, geometry().span)
    paintApex(at)
  }

  function paintAria(labels: EffortLabels) {
    noneLabel = labels.none
    // Same-value guards throughout: update() runs on every scheduler pass, and
    // an identical write here (the aria-label is in the observer's
    // attributeFilter) re-schedules the next pass — a self-sustaining loop.
    if (labelEl.textContent !== labels.label) labelEl.textContent = labels.label
    if (fasterEl.textContent !== labels.faster) fasterEl.textContent = labels.faster
    if (smarterEl.textContent !== labels.smarter) smarterEl.textContent = labels.smarter
    setAttributeIfChanged(track, 'aria-label', labels.label)
    if (steps.length === 0) {
      root.setAttribute('data-empty', '')
      track.setAttribute('aria-disabled', 'true')
      track.removeAttribute('aria-valuemin')
      track.removeAttribute('aria-valuemax')
      track.removeAttribute('aria-valuenow')
      track.removeAttribute('aria-valuetext')
      return
    }
    const at = Math.max(0, selected)
    root.removeAttribute('data-empty')
    track.removeAttribute('aria-disabled')
    track.setAttribute('aria-valuemin', '0')
    track.setAttribute('aria-valuemax', String(steps.length - 1))
    track.setAttribute('aria-valuenow', String(at))
    track.setAttribute('aria-valuetext', steps[at] ? steps[at].name : '')
  }

  /** Drop the wait for the host's echo (echo seen, ladder changed, or timeout). */
  function clearPending() {
    if (pendingTimer !== 0) {
      clearTimeout(pendingTimer)
      pendingTimer = 0
    }
    pendingEcho = false
    pendingId = undefined
  }

  /** Commit one level, once: the host is told only when the level moved. */
  function commit(index: number) {
    if (index < 0 || index >= steps.length || index === selected) return
    selected = index
    /* Hold the knob here until the host's snapshot agrees (see pendingEcho). */
    pendingEcho = true
    pendingId = steps[index].id
    if (pendingTimer !== 0) clearTimeout(pendingTimer)
    pendingTimer = setTimeout(clearPending, PENDING_ECHO_MS)
    opts.onPick(steps[index].id)
  }

  function releaseCapture() {
    if (pointerId !== null && track.hasPointerCapture(pointerId)) track.releasePointerCapture(pointerId)
    pointerId = null
  }

  /** The gesture ends: the knob lands on the nearest level and commits it. */
  function settle() {
    if (!pressed) return
    if (moveQueued) {
      // Land the still-pending position first, so the release settles on
      // where the pointer actually is rather than one event behind.
      if (cancelPendingFrame !== null) cancelPendingFrame()
      moveQueued = false
      cancelPendingFrame = null
      applyPending()
      if (!pressed) return
    }
    pressed = false
    dragging = false
    root.removeAttribute('data-dragging')
    releaseCapture()
    const index = live
    const previous = selected
    live = -1
    /* Commit FIRST, then paint ONCE on the committed level: painting before the
       commit read the OLD `selected`, flipping the apex off and on — which hid
       the matrix and restarted its entrance sweep, a visible double take. */
    commit(index)
    place(positionFor(selected), true)
    paintApex(selected)
    nameSwap.settle(selected, previous)
  }

  /**
   * The physical release, wherever it lands: the pointer may be outside the
   * card, where the picker closes it. It is heard on the document in the
   * capture phase, so a host handler's stopPropagation cannot steal it, and it
   * fires BEFORE the track's bubble-phase pointerup (settle) — safe, since the
   * close it may cause only flips data-open.
   */
  function onRelease(e: PointerEvent) {
    if (e.pointerId !== pointerId) return
    document.removeEventListener('pointerup', onRelease, true)
    document.removeEventListener('pointercancel', onRelease, true)
    if (typeof opts.onDragEnd === 'function') opts.onDragEnd(e)
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    painted = true
    pointerId = e.pointerId
    document.addEventListener('pointerup', onRelease, true)
    document.addEventListener('pointercancel', onRelease, true)
    track.setPointerCapture(e.pointerId)
    if (typeof opts.onDragStart === 'function') opts.onDragStart()
    // A pending settle no longer owns the words: this gesture does.
    nameSwap.reset()
    const x = pointerTravel(e.clientX)
    /* Glide to the press position; the drag state (and its transition-off flag)
       starts only on the first MOVE — setting it here would suppress the very
       transition that makes this read as travel. */
    pressed = true
    downX = e.clientX
    liveTravel = dampTravel(x)
    const delta = liveTravel - positionFor(selected)
    moveDirection = Math.abs(delta) < 0.5 ? 0 : Math.sign(delta)
    place(liveTravel, true)
    live = nearest(x)
    paintValue()
  }

  /**
   * The gesture's latest pointer position. pointermove fires faster than frames
   * render; the event stores the position and ONE animation-frame callback
   * reads the geometry and then writes (one transform + the name), so the drag
   * costs one layout flush per frame instead of one forced reflow per event.
   */
  let cancelPendingFrame: (() => void) | null = null
  let moveQueued = false
  let pendingX = 0
  /** Where the press landed, so a click's incidental movement is not a drag. */
  let downX = 0

  function applyPending() {
    if (!pressed) return
    // The pointer may run past either end or off the control with the button
    // down: the travel clamps to the track and the gesture goes on, so an end
    // stop stays reachable.
    const x = pointerTravel(pendingX)
    const travel = dampTravel(x)
    const delta = travel - liveTravel
    if (Math.abs(delta) > 0.1) moveDirection = Math.sign(delta)
    liveTravel = travel
    // Until the press has become a drag, the knob keeps the press glide's
    // transition: a click's one-pixel move must not snap it.
    place(travel, !dragging)
    live = nearest(x)
    paintValue()
  }

  function onPointerMove(e: PointerEvent) {
    if (!pressed) return
    if (!dragging && Math.abs(inPagePixels(e.clientX - downX)) >= DRAG_THRESHOLD_PX) {
      // The pointer has left the click's tolerance: the knob must follow it
      // without easing.
      dragging = true
      root.setAttribute('data-dragging', '')
    }
    pendingX = e.clientX
    if (moveQueued) return
    moveQueued = true
    cancelPendingFrame = requestFrame({
      write() {
        moveQueued = false
        cancelPendingFrame = null
        applyPending()
      },
    })
  }

  track.addEventListener('pointerdown', onPointerDown)
  track.addEventListener('pointermove', onPointerMove)
  track.addEventListener('pointerup', () => { settle() })
  track.addEventListener('pointercancel', () => { settle() })
  track.addEventListener('keydown', e => {
    if (steps.length === 0) return
    const base = selected < 0 ? 0 : selected
    let next = base
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(0, base - 1)
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(steps.length - 1, base + 1)
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = steps.length - 1
    else return
    e.preventDefault()
    e.stopPropagation()
    const previous = selected
    commit(next)
    place(positionFor(next), true)
    paintAria(state().labels)
    paintApex(selected)
    nameSwap.start(previous, selected)
  })

  /**
   * Re-point the control at the model in force. The ladder is rebuilt only when
   * the levels themselves change; the knob is animated only when the selected
   * level moved on its own (the host echoing a selection back).
   *
   * @param box - the track's reading from the pass's read phase (D40): the card
   *   keeps its layout box while closed, so reading it after the pass's writes
   *   would force a layout on every pass. Left out, the update reads it itself.
   */
  function update(box?: EffortTrackBox | null) {
    passBox = box ?? null
    const next = state()
    let changed = next.steps.length !== steps.length
    if (!changed) {
      for (let i = 0; i < next.steps.length; i++) {
        if (next.steps[i].id !== steps[i].id) { changed = true; break }
      }
    }
    if (changed) {
      steps = next.steps.slice()
      ticksWidth = -1
      /* A different ladder is a different question; the old commit's echo
         will never come. */
      clearPending()
    }
    /* The echo test: the snapshot now names the level we committed. */
    if (pendingEcho && next.index >= 0 && next.steps[next.index] !== undefined && next.steps[next.index].id === pendingId) {
      clearPending()
    }
    let swapFrom = -1
    if (!pressed && !pendingEcho) {
      const moved = painted && !changed && selected !== next.index
      swapFrom = moved ? selected : -1
      selected = next.index
      place(positionFor(selected), moved)
      painted = true
    }
    paintTicks()
    paintAria(next.labels)
    if (swapFrom >= 0) {
      paintApex(selected)
      nameSwap.start(swapFrom, selected)
    } else {
      paintValue()
    }
    // The box this pass measured stands for this pass alone: a drag or a key
    // between passes reads the layout it acts on, in the pass that follows (D40).
    passBox = null
  }

  return {
    el: root,
    update,
    measure: measureTrack,
    // The picker's hover-close guard keys on the hold, from pointerdown until
    // the release wherever it lands: a gesture out of the card keeps it open,
    // and the release outside closes it (onDragEnd).
    isHeld() { return pressed },
    /**
     * The control's own teardown: the document listeners a hold left, the
     * pending frame and the echo wait outlive the card, so the picker calls
     * this rather than letting the node's removal drop them.
     */
    dispose() {
      dotMatrix.dispose()
      document.removeEventListener('pointerup', onRelease, true)
      document.removeEventListener('pointercancel', onRelease, true)
      if (cancelPendingFrame !== null) cancelPendingFrame()
      cancelPendingFrame = null
      nameSwap.dispose()
      moveQueued = false
      releaseCapture()
      clearPending()
    },
  }
}
