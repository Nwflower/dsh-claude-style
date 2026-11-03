import { AUTO_POPOVER_ALL } from '../../constants'
import { MODEL_EFFORT_DEFAULT } from '../model/model-labels'
import { readPrefs } from '../../core/prefs'
import { createEffortControl } from './slider'
import type { EffortTrackBox } from './slider'
import { effortSteps } from './ladder'
import { paintEffortTint } from './tint'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { CloseReason } from '@dsh-claude-style/engine/scheduler'
import type { FeatureUi } from '../../core/feature'
import type manifest from './effort-picker.manifest'
import { setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { POPOVER_CLOSE_DELAY, POPOVER_OPEN_DELAY, closeOtherPopovers, createHoverIntent, positionAnchoredPopover, pressKeepsPopoverOpen, registerPopover, removeStrayNodes, setMenuPopoverOpen, unregisterPopover } from '../../shared/popover'
import { copy } from './copy'

/**
 * The reasoning-effort level: the second text in the composer's seat box, and a
 * card of its own.
 *
 * The level and the model are two decisions with two different cadences — the
 * model changes rarely, the level is nudged often — so the level gets its own hit
 * area and its own card. Both texts live in one box the row lays out as a single
 * item (features/model/seat-box.ts): it stands against the row's right end and
 * grows leftward, so the edge both cards hang from does not move when a level's
 * name changes.
 *
 * Everything else follows the model picker's discipline: the button is created
 * once and reused, the card is a fixed-position sibling on <body>, hover opens it
 * under the "all" scope and click does so otherwise, and the slider element is
 * NEVER detached once built — re-inserting it restarts its CSS animations (the
 * name's blur-in, the apex matrix's entrance sweep) and reads as a flicker on
 * every host round-trip.
 *
 * @param ctx - the plugin context (unused; kept for the installer shape).
 * @param ui - the shared UI registry. `ui.model` provides the seat box
 *   (`seatBox()`), the catalog's state (`effort()`, `named()`), the
 *   commit call (`pickEffort()`) and `close()`.
 * @returns a teardown function.
 */
export interface EffortPickerMount {
  popoverKey?: string
  owner?: string
  disabled?: boolean
}

export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>, mount: EffortPickerMount = {}) {
  const popoverKey = mount.popoverKey ?? 'effort'
  const owner = mount.owner ?? 'composer'
  const popoverSelector = `.dsh-claude-effort-popover[data-dsh-claude-model-owner="${owner}"]`
  let effortBtn: HTMLButtonElement | null = null
  let effortPop: HTMLElement | null = null
  let effortSlider: ReturnType<typeof createEffortControl> | null = null
  /** The slider's track as the pass's read phase found it, for the pass's update of the slider. */
  let sliderBox: EffortTrackBox | null = null
  const effortHoverIntent = createHoverIntent(
    () => { openEffortPopover() },
    () => { closeEffortPopover() },
    POPOVER_OPEN_DELAY,
    POPOVER_CLOSE_DELAY
  )

  /**
   * The ladder to draw: what the catalog says about the seat. The catalogue
   * answers with the last directory that named it while the host re-enumerates
   * (features/model/catalog.ts), so the level holds through a selection on its
   * own, and null means the seat itself names no ladder.
   */
  function effortInfo() {
    return typeof ui.model?.effort === 'function' ? ui.model.effort() : null
  }

  /** The box this level shares with the model's name (owned by the model picker). */
  function seatBox() {
    return typeof ui.model?.seatBox === 'function' ? ui.model.seatBox() : null
  }

  /** This level's own part of that box, the plate its pointer answers. */
  function effortSeat() {
    const part = typeof ui.model?.seatPart === 'function' ? ui.model.seatPart('effort') : null
    return part ?? seatBox()
  }

  /** Whether the level's card stands open right now. */
  function cardOpen() {
    return effortPop !== null && effortPop.getAttribute('data-open') === 'true'
  }

  /** Whether the hover preference covers this picker: the `all` scope alone. */
  function effortHoverOn() {
    return readPrefs().autoPopover === AUTO_POPOVER_ALL
  }

  function closeEffortPopover() {
    effortHoverIntent.cancel()
    if (effortPop === null) return
    setMenuPopoverOpen(effortPop, false, effortBtn)
  }

  function openEffortPopover() {
    effortHoverIntent.cancel()
    ensureEffortChrome()
    // One card at a time: the model's text sits in the same box, so leaving its
    // card up would stack two panels over the same corner.
    closeOtherPopovers(popoverKey)
    if (effortSlider !== null) effortSlider.update()
    // Open BEFORE placing: the placement reads the card only while it is
    // marked open, so positioning first would skip it and leave the card
    // where it stood.
    if (effortPop !== null) setMenuPopoverOpen(effortPop, true, effortBtn)
    positionEffortPopover()
  }

  function positionEffortPopover() {
    if (effortPop === null) return
    // A shut card has no anchor to re-read, so a scroll or resize costs it nothing.
    if (effortPop.getAttribute('data-open') !== 'true') return
    const anchor = seatBox() ?? effortBtn
    if (anchor === null) return
    positionAnchoredPopover(anchor, effortPop, { side: 'above', gap: 6 })
  }

  /** The slider, built once; the card holds this node for its whole life. */
  function effortControlElement() {
    if (effortSlider === null) {
      effortSlider = createEffortControl({
        read: effortInfo,
        onPick(levelId) {
          if (typeof ui.model?.pickEffort === 'function') ui.model.pickEffort(levelId)
        },
        // A drag must not be cut short by the hover-close timer, wherever
        // the pointer travels with the button down.
        onDragStart() { effortHoverIntent.cancel() },
        // ...and the release closes the card when it lands outside: the
        // mouseleave guard stands down while the button is held, and this is
        // the other half.
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
   * Build (or re-find) the card. Idempotence guards, not null checks: client HMR
   * drops the previous generation's disposals, so a stale card can still be in
   * the document while this scope starts from null. The model picker sweeps its
   * own strays the same way.
   */
  function ensureEffortChrome() {
    removeStrayNodes(document, popoverSelector, [effortPop])
    if (effortPop === null || effortPop.parentElement === null) {
      effortPop = document.createElement('div')
      effortPop.className = 'dsh-claude-popover-card dsh-claude-effort-popover'
      effortPop.setAttribute('data-dsh-claude-model-owner', owner)
      setMenuPopoverOpen(effortPop, false)
      effortPop.addEventListener('mouseenter', () => effortHoverIntent.cancel())
      effortPop.addEventListener('mouseleave', () => {
        // A hold must not be cut short by the hover-close timer: the pointer
        // may travel out of the card with the button down and the gesture
        // goes on; a release OUTSIDE the card closes it (onDragEnd).
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
   * Put the level's button in the seat box, after the model's name, or take it
   * out with the seat.
   *
   * The box is the skin's own node inside the host's slot (features/model/
   * seat-box.ts), so a button may live in it; the host's slot above stays
   * React's. The button is removed rather than hidden when the seat loses its
   * ladder: the replacement is a new node, and the ramp written on the old one
   * belongs to it alone.
   */
  function ensureEffortButton(box: HTMLElement): HTMLButtonElement {
    if (effortBtn !== null && effortBtn.parentElement === box) return effortBtn
    removeStrayNodes(box, '.dsh-claude-effort-btn', [effortBtn])
    if (effortBtn !== null && effortBtn.parentElement !== null) effortBtn.parentElement.removeChild(effortBtn)
    effortBtn = document.createElement('button')
    effortBtn.type = 'button'
    effortBtn.className = 'dsh-claude-effort-btn'
    effortBtn.setAttribute('aria-haspopup', 'menu')
    effortBtn.disabled = mount.disabled === true
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
      if (pressKeepsPopoverOpen(effortHoverOn(), cardOpen())) return
      if (cardOpen()) closeEffortPopover()
      else openEffortPopover()
    })
    // After the model's name, which the model picker keeps first in the box.
    box.appendChild(effortBtn)
    return effortBtn
  }

  /** Take the level's button and card down with its seat. */
  function hideEffortTrigger() {
    if (effortBtn !== null) {
      if (effortBtn.parentElement !== null) effortBtn.parentElement.removeChild(effortBtn)
      effortBtn = null
    }
    closeEffortPopover()
  }

  /** Re-point the level's button and the slider at the seat in force (every pass). */
  function syncEffortControl() {
    const box = effortSeat()
    // No box to sit in: the level comes down (see hideEffortTrigger).
    if (box === null) {
      hideEffortTrigger()
      return
    }
    const info = effortInfo()
    if (info === null) {
      // A catalog that has not named the seat yet (the first load) has said
      // nothing about its levels: the level keeps what it stands on. Only a
      // named model without a ladder takes it away.
      if (typeof ui.model?.named === 'function' && !ui.model.named()) return
      hideEffortTrigger()
      return
    }
    ensureEffortChrome()
    const button = ensureEffortButton(box)
    // Same-value guards: sync runs on every scheduler pass, and an identical
    // write still mutates the DOM (textContent replaces the text node;
    // setAttribute queues a record the scheduler's observer sees).
    const ladder = effortSteps(info, MODEL_EFFORT_DEFAULT)
    // Where the rung stands on the level's colour ramp. The stylesheet reads the
    // tint only while the Composer tab's effort-accent row is on; a rung with no
    // place on the ramp takes the mark off and keeps the resting ink.
    paintEffortTint(button, ladder.steps, ladder.index)
    const labelEl = button.querySelector('.dsh-claude-effort-btn-label')
    if (labelEl !== null && labelEl.textContent !== info.label) labelEl.textContent = info.label
    setAttributeIfChanged(button, 'aria-label', `${copy('effortLabel')} ${info.label}`)
    if (effortSlider !== null) effortSlider.update(sliderBox)
    positionEffortPopover()
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
    removeStrayNodes(document, popoverSelector, [])
    effortBtn = null
    effortPop = null
    effortSlider = null
    sliderBox = null
    unregisterPopover(popoverKey)
  }

  registerPopover(popoverKey, closeEffortPopover)

  ui.effort = {
    measure() {
      sliderBox = effortSlider === null ? null : effortSlider.measure()
    },
    sync: syncEffortControl,
    // The level sits in the composer's seat box, outside the column a streaming
    // batch touches, so such a batch skips this pass (D40).
    skipOnContentOnly: true,
    /**
     * The level's card closes on an outside press and on Esc. Composer focus
     * is NOT one of its dismiss routes (the model picker closes there, this
     * one does not), so that reason is ignored.
     */
    close(reason?: CloseReason) {
      if (reason === 'composer') return
      closeEffortPopover()
    },
    owns: ownsEffort,
    /**
     * The card hangs from the seat box, which a viewport or composer-card change
     * moves; the scheduler calls this in the same frame as the CSS reflow.
     */
    reposition() {
      positionEffortPopover()
    },
    teardown,
  }
  return teardown
}
