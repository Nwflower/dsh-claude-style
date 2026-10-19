import { AUTO_POPOVER_ALL } from '../../constants'
import { MODEL_EFFORT_LABEL } from '../model/copy-fallbacks'
import { readPrefs } from '../../core/prefs'
import { createEffortControl } from './control'
import type { EffortTrackBox } from './control'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { CloseReason } from '@dsh-claude-style/engine/scheduler'
import type { FeatureUi } from '../../core/feature'
import type manifest from './effort-picker.manifest'
import type { ModelCatalog } from '../model/catalog'
import { setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { POPOVER_CLOSE_DELAY, POPOVER_OPEN_DELAY, closeOtherPopovers, createHoverIntent, positionAnchoredPopover, pressKeepsPopoverOpen, registerPopover, removeStrayNodes, setMenuPopoverOpen, unregisterPopover } from '../../shared/popover'
import { inPageBox } from '../../shared/page-zoom'
import { EFFORT_ROW_SELECTOR, releaseEffortRoom, reserveEffortRoom } from './room'
import { copy } from './copy'

/**
 * The reasoning-effort picker: its own seat trigger and its own card.
 *
 * The level and the model are two decisions with two different cadences — the
 * model changes rarely, the level is nudged often — so the level owns a trigger
 * of its own beside the model's, and a card of its own. The model card keeps
 * only the model list and the More-models row.
 *
 * Everything else follows the model picker's discipline: the trigger is
 * created once and reused, the card is a fixed-position sibling on <body>,
 * hover opens it under the "all" scope and click does so otherwise, and the
 * slider element is NEVER detached once built — re-inserting it restarts its
 * CSS animations (the name's blur-in, the apex matrix's entrance sweep) and
 * reads as a flicker on every host round-trip.
 *
 * @param ctx - the plugin context (unused; kept for the installer shape).
 * @param ui - the shared UI registry. `ui.model` provides the seat element
 *   (`seat()`), the model trigger (`trigger()`), the catalog's state
 *   (`effort()`, `named()`, `settled()`), the commit call (`pickEffort()`)
 *   and `close()`.
 * @returns a teardown function.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  let effortBtn: HTMLButtonElement | null = null
  let effortPop: HTMLElement | null = null
  let effortSlider: ReturnType<typeof createEffortControl> | null = null
  /**
   * The last ladder the seat named. A selection makes the host re-enumerate
   * the whole directory for seconds, and the snapshot can go blank in that
   * window — the trigger must not vanish and the knob must not fall into its
   * empty state just because the answer is in flight. Only a SETTLED seat
   * that names no ladder takes the trigger away.
   */
  let lastEffort: ReturnType<ModelCatalog['effort']> = null
  const effortHoverIntent = createHoverIntent(
    () => { openEffortPopover() },
    () => { closeEffortPopover() },
    POPOVER_OPEN_DELAY,
    POPOVER_CLOSE_DELAY
  )

  /** What the catalog currently says about the seat's ladder. */
  function effortInfo() {
    return typeof ui.model?.effort === 'function' ? ui.model.effort() : null
  }

  /** True while the catalog cannot name the seat (a selection in flight). */
  function seatInFlight() {
    return typeof ui.model?.settled === 'function' && !ui.model.settled()
  }

  /**
   * The ladder to draw: the catalog's when it has one, otherwise the last one
   * it named — but only while the seat is in flight. A settled seat with no
   * ladder returns null, which is the control's empty state.
   */
  function readEffort() {
    const info = effortInfo()
    if (info !== null) {
      lastEffort = info
      return info
    }
    return seatInFlight() ? lastEffort : null
  }

  /** The host slot the seat lives in (owned by the model picker). */
  function seat() {
    return typeof ui.model?.seat === 'function' ? ui.model.seat() : null
  }

  /** The model trigger this one sits beside (owned by the model picker), or null. */
  function modelTrigger() {
    return typeof ui.model?.trigger === 'function' ? ui.model.trigger() : null
  }

  /**
   * Hand back the room this trigger reserves on the model trigger (see
   * room.ts), or the shorter model name outlives the trigger.
   */
  function releaseModelRoom() {
    const modelBtn = modelTrigger()
    if (modelBtn !== null) releaseEffortRoom(modelBtn)
  }

  function cancelCloseEffort() {
    effortHoverIntent.cancel()
  }

  /** Whether the hover preference covers this picker: the `all` scope alone. */
  function effortHoverOn() {
    return readPrefs().autoPopover === AUTO_POPOVER_ALL
  }

  function closeEffortPopover() {
    effortHoverIntent.cancel()
    if (effortPop !== null) setMenuPopoverOpen(effortPop, false, effortBtn)
  }

  function openEffortPopover() {
    effortHoverIntent.cancel()
    ensureEffortChrome()
    // One card at a time: the model trigger sits beside this one, so leaving
    // its card up would stack two panels over the same corner.
    closeOtherPopovers('effort')
    if (effortSlider !== null) effortSlider.update()
    // Open BEFORE placing: the placement reads the card only while it is
    // marked open, so positioning first would skip it and leave the card
    // where it stood.
    if (effortPop !== null) setMenuPopoverOpen(effortPop, true, effortBtn)
    positionEffortPopover()
  }

  function positionEffortPopover() {
    if (effortBtn === null || effortPop === null) return
    // A shut card has no anchor to re-read, so a scroll or resize costs it nothing.
    if (effortPop.getAttribute('data-open') !== 'true') return
    positionAnchoredPopover(effortBtn, effortPop, { side: 'above', gap: 6 })
  }

  /** The measurements behind the trigger's placement, as of the last positioning. */
  const effortPlace = { left: -1, top: -1, need: 0, width: 0, widthLabel: '', height: 0 }

  /** What the read phase resolved for this frame's placement of the trigger. */
  let effortPlan: { modelBtn: HTMLElement, box: DOMRect, row: DOMRect | null, need: number, width: number, height: number, fresh: boolean, settle: boolean, marginChanged: boolean } | null | 'hide' | 'none' = null
  /** The slider's track as the same read phase found it, for the pass's update of the slider. */
  let sliderBox: EffortTrackBox | null = null

  /**
   * The pass's read phase: where the seat stands, how much room this trigger
   * needs on its right edge, and the slider's track. The seat moves with the
   * window and with the composer's own growth, so it is read every pass —
   * before this frame's writes, which is where a read of it is cheap.
   */
  function measureEffortTrigger(settle = false) {
    sliderBox = effortSlider === null ? null : effortSlider.measure()
    if (effortBtn === null) {
      effortPlan = 'none'
      return
    }
    const modelBtn = modelTrigger()
    if (modelBtn === null) {
      effortPlan = 'hide'
      return
    }
    // A seat the host keeps in the DOM without laying it out (another view is
    // up, or an ancestor is hidden) reports a zero box; pinning to it put the
    // trigger in the window's top-left corner. No box, no trigger.
    const box = modelBtn.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) {
      effortPlan = 'hide'
      return
    }
    // The trigger's size follows its label: re-measure only when it moved
    // (offsetWidth/offsetHeight force a layout the pass would rather not pay).
    const labelEl = effortBtn.querySelector('.dsh-claude-effort-btn-label')
    const label = labelEl === null ? '' : labelEl.textContent
    const fresh = label !== effortPlace.widthLabel
    if (fresh) {
      effortPlace.widthLabel = label
      effortPlace.width = effortBtn.offsetWidth
      effortPlace.need = Math.max(0, effortPlace.width - 6)
      effortPlace.height = effortBtn.offsetHeight
    }
    const row = modelBtn.closest(EFFORT_ROW_SELECTOR)
    effortPlan = {
      modelBtn,
      box,
      row: row === null ? null : row.getBoundingClientRect(),
      need: effortPlace.need,
      width: effortPlace.width,
      height: effortPlace.height,
      fresh,
      settle,
      marginChanged: modelBtn.style.marginRight !== `${effortPlace.need}px`,
    }
  }

  /**
   * The wall this trigger may not pass on the row's line: the context meter's
   * left edge while the meter is on it. The meter is placed absolutely in the
   * dock (features/composer/inline-bar.css) and the row never sees it, so the
   * row's own right edge is not that wall — clamping to it pinned the level's
   * name into the reading's band on a narrow card.
   */
  function meterWall(): number | null {
    const meter = document.querySelector<HTMLElement>('[data-dsh-claude-context-meter]')
    if (meter === null) return null
    const box = meter.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) return null
    return Math.round(box.left)
  }

  /**
   * Pin the body-mounted trigger beside the model trigger from that reading.
   *
   * The row's own rhythm is the 12px flex gap (8px in narrow cards) the host
   * puts between the trailing cluster's children: sit 2px past the model
   * trigger, and with its 8px right padding and this trigger's 2px left
   * padding the two texts land 12px apart — the same 12 the meter's ring (8px
   * into its pill) and the send icon then keep. The model trigger is OUR
   * element, so the effort picker reserves room for itself on its right edge (a
   * margin on it shifts the trigger left, out from under the context meter /
   * send button) and then sits in that reserved space: the row's 12px gap
   * covers 12 of the needed width+2, the margin covers the rest. Measured, not
   * a magic number: the width follows the current level's name, and the room
   * the row can give it (room.ts).
   */
  function applyEffortTrigger() {
    const plan = effortPlan
    effortPlan = null
    if (plan === null || plan === 'none') return
    if (plan === 'hide') {
      hideEffortTrigger()
      return
    }
    const { modelBtn, box, row, need, width, height, fresh, settle, marginChanged } = plan
    // Show it BEFORE placing: a trigger coming back from the hidden state (its
    // seat returned) would otherwise read offsetWidth 0, reserve no room for
    // that one pass and overlap the control that follows.
    if (effortBtn === null) return
    if (effortBtn.style.display !== 'inline-flex') effortBtn.style.display = 'inline-flex'
    // A settled seat re-reads the room; every other pass keeps what it found,
    // since the room only changes with the name or the card.
    const measured = fresh || settle ? reserveEffortRoom(modelBtn, need) : null
    if (measured === null && marginChanged) modelBtn.style.marginRight = `${need}px`
    // An unchanged margin leaves the box at the one just read: a second
    // getBoundingClientRect after the write would force a reflow for the same
    // numbers every pass. The box arrives in the pixels the style writes
    // below are read in, the same ones the trigger's size is given in.
    const shifted = inPageBox(measured ?? (marginChanged ? modelBtn.getBoundingClientRect() : box))
    // A row too narrow for its controls leaves the model trigger's box outside
    // the card, and this trigger is not clipped by the card: pinned from that
    // box it would paint over whatever stands beside the composer, the sidebar
    // included. The row's own edges are the last word on where it may stand —
    // except at the right, where the meter stands in the row's way without
    // being in the row: it is placed absolutely in the dock
    // (features/composer/inline-bar.css), so the row never grows around it and
    // clamping to the row's right edge pinned the level's name into the
    // reading's band on a narrow card. Stop at the meter's left edge while the
    // meter is on this line; a meter that is hidden or lives elsewhere (the
    // hero, the reading moved under the row) leaves the row's own edge in
    // charge, which is the behaviour this trigger shipped with.
    const wall = meterWall() ?? (row === null ? null : Math.round(row.right))
    const wanted = Math.round(shifted.right + 2)
    const left = wall === null
      ? wanted
      : Math.min(Math.max(wanted, row === null ? wanted : Math.round(row.left)), Math.round(wall - width))
    const top = Math.round(shifted.top + (shifted.height - height) / 2)
    if (left !== effortPlace.left) {
      effortPlace.left = left
      effortBtn.style.left = `${left}px`
    }
    if (top !== effortPlace.top) {
      effortPlace.top = top
      effortBtn.style.top = `${top}px`
    }
  }

  /**
   * The immediate path — a viewport or composer-card change, which the
   * scheduler calls outside a pass: read and write in the same call, as
   * `reposition` has to land in the frame of the CSS reflow.
   */
  function positionEffortTrigger() {
    measureEffortTrigger(true)
    applyEffortTrigger()
  }

  /** The slider, built once; the card holds this node for its whole life. */
  function effortControlElement() {
    if (effortSlider === null) {
      effortSlider = createEffortControl({
        read: readEffort,
        onPick(levelId) {
          if (typeof ui.model?.pickEffort === 'function') ui.model.pickEffort(levelId)
        },
        // A drag must not be cut short by the hover-close timer: the pointer
        // is inside the control the whole time.
        onDragStart: cancelCloseEffort,
        // ...and a hold that leaves the card closes it on the RELEASE, not
        // at the boundary crossing (the mouseleave guard stands down while
        // the button is held; this is the other half).
        onDragEnd(e) {
          if (effortPop === null || effortPop.getAttribute('data-open') !== 'true') return
          const under = e && typeof e.clientX === 'number' ? document.elementFromPoint(e.clientX, e.clientY) : null
          if (under !== null && effortPop.contains(under)) return
          closeEffortPopover()
        },
      })
    }
    return effortSlider.el
  }

  /**
   * Build (or re-find) the trigger and the card. Idempotence guards, not
   * null checks: client HMR drops the previous generation's disposals, so a
   * stale trigger or card can still be in the document while this scope
   * starts from null. The model picker sweeps its own strays the same way.
   */
  function ensureEffortChrome() {
    const slot = seat()
    if (slot !== null) removeStrayNodes(slot, '.dsh-claude-effort-btn', [effortBtn])
    removeStrayNodes(document, 'body > .dsh-claude-effort-popover', [effortPop])
    if (effortPop === null || effortPop.parentElement === null) {
      effortPop = document.createElement('div')
      effortPop.className = 'dsh-claude-popover-card dsh-claude-effort-popover'
      setMenuPopoverOpen(effortPop, false)
      effortPop.addEventListener('mouseenter', cancelCloseEffort)
      effortPop.addEventListener('mouseleave', () => {
        // A hold must not be cut short by the hover-close timer: the
        // slider settles at its own edge while the pointer travels on
        // with the button down, and the card closing mid-hold read as a
        // crash. A release OUTSIDE the card closes it (onDragEnd).
        if (effortSlider !== null && effortSlider.isHeld()) return
        effortHoverIntent.scheduleClose()
      })
      document.body.appendChild(effortPop)
    }
    // Append the slider only when it is not already the card's child: a
    // detach/re-append would restart its animations (see the header note).
    const control = effortControlElement()
    if (control.parentElement !== effortPop) effortPop.appendChild(control)
  }

  /**
   * Take the body-mounted trigger down with its seat. It is removed rather
   * than hidden: the stylesheet pins `display: inline-flex` with !important,
   * which beats an inline `display: none`, so a hidden trigger stayed on
   * screen at its last coordinates after the seat lost its box (the
   * trajectory and context views) or went away with the composer. The model
   * trigger's reserved room goes back with it — margin and cap both — and so
   * does every value the placement caches: the replacement is a new node.
   */
  function hideEffortTrigger() {
    // The next trigger is a NEW node, so the placement cache starts over.
    // A left/top left behind here is a value the new node never received:
    // the same-value guards below would skip both writes and the trigger
    // would sit at its static position, the end of the document.
    effortPlace.widthLabel = ''
    effortPlace.width = 0
    effortPlace.left = -1
    effortPlace.top = -1
    if (effortBtn !== null) {
      if (effortBtn.parentElement !== null) effortBtn.parentElement.removeChild(effortBtn)
      effortBtn = null
    }
    releaseModelRoom()
    closeEffortPopover()
  }

  /** Re-point the trigger and the slider at the seat in force (every pass). */
  function syncEffortControl() {
    const slot = seat()
    // No seat to sit beside, or no model trigger to attach to: the trigger
    // comes down (see hideEffortTrigger).
    if (slot === null || modelTrigger() === null) {
      hideEffortTrigger()
      return
    }
    // Never take the trigger away on an in-flight catalog: that is the
    // "selector crashed" report — a pick blanks the snapshot for seconds and
    // the trigger (with its open card) disappeared with it.
    if (seatInFlight()) {
      if (effortSlider !== null) effortSlider.update(sliderBox)
      return
    }
    const info = effortInfo()
    if (info === null) {
      // A catalog that cannot name the seat (the current selection is not in
      // its snapshot yet) has said nothing about that seat's levels: the
      // trigger stays as it is, the way the in-flight branch above keeps it.
      // Only a named model without a ladder takes it away.
      if (typeof ui.model?.named === 'function' && !ui.model.named()) return
      // No ladder on this seat: the trigger goes away with it, exactly as the
      // model card drew no effort row for such a model.
      hideEffortTrigger()
      return
    }
    ensureEffortChrome()
    if (effortBtn === null || effortBtn.parentElement !== document.body) {
      if (effortBtn !== null && effortBtn.parentElement !== null) effortBtn.parentElement.removeChild(effortBtn)
      effortBtn = document.createElement('button')
      effortBtn.type = 'button'
      effortBtn.className = 'dsh-claude-effort-btn'
      effortBtn.setAttribute('aria-haspopup', 'menu')
      effortBtn.innerHTML = '<span class="dsh-claude-effort-btn-label"></span>'
      // Same contract as the model trigger: hover under the "All" scope,
      // click-only otherwise.
      effortBtn.addEventListener('mouseenter', () => {
        if (effortHoverOn()) effortHoverIntent.scheduleOpen()
      })
      effortBtn.addEventListener('mouseleave', () => {
        if (effortHoverOn()) effortHoverIntent.scheduleClose()
      })
      effortBtn.addEventListener('click', e => {
        e.stopPropagation()
        // A press on the card the dwell just opened keeps it up
        // (shared/popover.ts::pressKeepsPopoverOpen); the leave closes it.
        const open = effortPop !== null && effortPop.getAttribute('data-open') === 'true'
        if (pressKeepsPopoverOpen(effortHoverOn(), open)) return
        if (open) closeEffortPopover()
        else openEffortPopover()
      })
      // NOT inside the seat slot: that subtree is React-managed, and no foreign
      // node may be inserted into it. The button lives on <body> like the card
      // and is pinned beside the model trigger on every pass instead.
      document.body.appendChild(effortBtn)
    }
    // Same-value guards: sync runs on every scheduler pass, and an identical
    // write still mutates the DOM (textContent replaces the text node;
    // setAttribute queues a record the scheduler's observer sees).
    const labelEl = effortBtn.querySelector('.dsh-claude-effort-btn-label')
    if (labelEl !== null && labelEl.textContent !== info.label) labelEl.textContent = info.label
    const aria = `${copy('effortLabel')} ${info.label}`
    setAttributeIfChanged(effortBtn, 'aria-label', aria)
    if (effortSlider !== null) effortSlider.update(sliderBox)
    applyEffortTrigger()

    if (effortPop !== null && effortPop.getAttribute('data-open') === 'true') positionEffortPopover()
  }

  function ownsEffort(target: Node) {
    if (!target) return false
    return (effortBtn !== null && effortBtn.contains(target)) ||
           (effortPop !== null && effortPop.contains(target))
  }

  function teardown() {
    effortHoverIntent.cancel()
    // The slider's own waits — a hold's document listeners, a pending move, the
    // wait for the host's echo — go before the card it lives in is dropped.
    if (effortSlider !== null) effortSlider.dispose()
    if (effortBtn !== null && effortBtn.parentElement !== null) effortBtn.parentElement.removeChild(effortBtn)
    if (effortPop !== null && effortPop.parentElement !== null) effortPop.parentElement.removeChild(effortPop)
    effortBtn = null
    effortPop = null
    effortSlider = null
    effortPlace.left = -1
    effortPlace.top = -1
    effortPlace.widthLabel = ''
    effortPlace.width = 0
    releaseModelRoom()
    unregisterPopover('effort')
  }

  registerPopover('effort', closeEffortPopover)

  ui.effort = {
    measure: measureEffortTrigger,
    sync: syncEffortControl,
    // The trigger sits on the composer, outside the column a streaming batch
    // touches, so such a batch skips this pass (D40).
    skipOnContentOnly: true,
    /**
     * The effort card closes on an outside press and on Esc. Composer focus
     * is NOT one of its dismiss routes (the model picker closes there, this
     * one does not), so that reason is ignored.
     */
    close(reason?: CloseReason) {
      if (reason === 'composer') return
      closeEffortPopover()
    },
    owns: ownsEffort,
    /**
     * The trigger is JS-pinned beside the model trigger, so a viewport or
     * composer-card change has to re-pin it in the SAME frame as the CSS
     * reflow. The scheduler calls this on resize / scroll (and on a card
     * resize); without it the pin waited for the next pass and visibly
     * trailed the controls it sits between.
     */
    reposition() {
      positionEffortTrigger()
      positionEffortPopover()
    },
    teardown,
  }
  return teardown
}
