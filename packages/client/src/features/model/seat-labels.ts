/**
 * The model picker's seat: the trigger the reader presses, the words on it, the
 * model mark on <body> and the box the two cards hang from.
 *
 * model-picker.ts keeps the catalog, the rows and the pass's paint, and reads
 * what each seat pass did from its answer. This half is the seat's own: the
 * host's own seat is hidden and re-marked on every pass, because React owns that
 * node and a swap puts it back, and the trigger is rebuilt whenever the slot it
 * stands in is replaced.
 */
import { SLOT_NODE_ATTR } from '../../constants'
import { COMPOSER_CARD_SELECTOR, COMPOSER_VARIANT_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { buildElement, setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { findPrimaryModelSlot } from '@dsh-claude-style/engine/host'
import { readPrefs } from '../../core/prefs'
import { ensureSeatBox, ensureSeatPart } from './seat-box'
import { pressKeepsPopoverOpen, removeStrayNodes } from '../../shared/popover'
import { releaseSwappingText, setSwappingText } from '../../shared/swapping-text'
import { loadModelCopy } from './model-copy'
import { thirdPartyHoldsSeat } from './seat-ledger'
import { releaseTag } from './release-tag'
import { copy } from './copy'
import type { FeatureUi } from '../../core/feature'
import type manifest from './model-picker.manifest'
import type { ModelCatalog } from './catalog'
import type { HostModelEntry, HostModelGroup, HostSlotsService } from '@dsh-claude-style/contracts/services'
import type { ModelPickerMount } from './model-picker'
import type { createModelCards } from './model-cards'

/**
 * The mark naming the model in force on <body>. A reader's own tooling reads it
 * to know which model the session is on; the value is the catalog's
 * `provider/id`, the pair the copy rules read (features/model/model-copy.ts).
 */
const MODEL_ATTR = 'data-dsh-claude-model'

/** What the seat reads from the picker that owns the catalog and the cards. */
export interface SeatLabelOptions {
  /** The mount this instance was installed with: an external seat or the page's own. */
  mount: ModelPickerMount
  /** The feature's handles, read lazily (the composer restyle among them). */
  ui: FeatureUi<typeof manifest>
  /** The two cards: their chrome, open state and placement. */
  cards: ReturnType<typeof createModelCards>
  /** The session's catalog, the one store the seat reads. */
  modelCatalog: ModelCatalog
  /** The slot registry from the scope that injected it (D75); null while the host serves none. */
  slots(): HostSlotsService | null
}

/**
 * What a seat pass did, which decides the picker's paint after it: the seat was
 * handed back (the body the rows were built into went with it), there was no
 * slot to stand in, or the seat was drawn — into the cards' existing chrome, or
 * into chrome built new, which holds no rows yet.
 */
export type SeatPass = 'handedBack' | 'noSlot' | 'drawn' | 'drawnInNewChrome'

export function createSeatLabels(options: SeatLabelOptions) {
  const { mount, ui, cards, modelCatalog } = options
  let modelBtn: HTMLButtonElement | null = null
  /** The box the model's text and the effort level's share inside the host slot (seat-box.ts). */
  let seatBox: HTMLElement | null = null
  /** The host slot the seat lives in; the effort picker anchors there too. */
  let modelSlot: HTMLElement | null = null
  /** The hero slot this instance marked as an external seat; the mark is ours to take back. */
  let heroMarkedSlot: HTMLElement | null = null
  /**
   * Let a label's swap go before its node leaves the page. The swap keeps a
   * frame, a timer and a size subscription of its own (shared/swapping-text.ts);
   * none of them follows the node out, and the size registry holds them by
   * strong reference, so a trigger rebuilt or dropped without this leaves its
   * sizer and its subscription behind for the page's lifetime.
   */
  function releaseModelLabels(scope: ParentNode = document) {
    const labels = scope.querySelectorAll<HTMLElement>('.dsh-claude-model-btn-label')
    for (let i = 0; i < labels.length; i++) releaseSwappingText(labels[i])
  }

  /**
   * Hand the host's own model seat and menu back: unmark the seat, remove the
   * skin's trigger and popovers, drop the catalog subscription.
   */
  function dropModelControl() {
    const allHosts = (modelSlot ?? document).querySelectorAll('[data-dsh-claude-model-host]')
    for (let h = 0; h < allHosts.length; h++) {
      allHosts[h].removeAttribute('data-dsh-claude-model-host')
    }
    releaseModelLabels()
    removeStrayNodes(modelSlot ?? document, '.dsh-claude-model-seat', [])
    seatBox = null
    if (heroMarkedSlot !== null) {
      heroMarkedSlot.removeAttribute('data-dsh-claude-external-control')
      heroMarkedSlot = null
    }
    removeStrayNodes(modelSlot ?? document, '.dsh-claude-model-btn', [])
    modelBtn = null
    cards.dropNodes()
    modelCatalog.reset()
    markSeatModel(null)
  }

  /**
   * Name the model in force on <body>: its `provider/id`, which separates two
   * providers' same-named models. The mark carries the catalog's data and no
   * judgement drawn from it — the family, the brand and the display name stay in
   * the picker. One model sits in force at a time, so a seat that names none (no
   * session, a catalog still answering, an id its groups do not hold) leaves the
   * mark off.
   */
  function markSeatModel(current: { group: HostModelGroup, model: HostModelEntry } | null) {
    if (current === null) {
      document.body.removeAttribute(MODEL_ATTR)
      return
    }
    setAttributeIfChanged(document.body, MODEL_ATTR, `${current.group.id}/${current.model.id}`)
  }

  /** Build or refresh the trigger, its label and the model mark. */
  function syncModelControl(): SeatPass {
    // The picker's own switch tears this feature down, so the composer restyle
    // is the one way left to be off the page: it hands the host's own model
    // seat and menu back through the same sweep.
    if (mount.slot === undefined && ui.composer?.isActive() !== true) {
      dropModelControl()
      return 'handedBack'
    }

    // A third-party winner holding the model seat takes the whole seat: the
    // skin's trigger and cards come down and the node the host renders for
    // the winner stands unmarked and reachable. The reasoning
    // level's button lives in the same box, so it goes with this drop and
    // returns on the pass the seat comes back (features/effort/effort-picker.ts).
    if (thirdPartyHoldsSeat(options.slots())) {
      dropModelControl()
      return 'handedBack'
    }

    // The copy document is fetched on first paint of the picker rather than
    // at install, so a session that never opens it never pays for it.
    loadModelCopy()
    modelCatalog.directory()
    modelCatalog.warm()
    // The seat stands in the page's main composer: a sub-agent's docked
    // conversation draws a card of its own, and the shell the reader types in
    // must not lose its model seat to one (engine/host.ts::findPrimaryModelSlot).
    const slot = mount.slot ?? findPrimaryModelSlot()
    modelSlot = slot
    if (slot === null) {
      // A page with no composer seat in it names no model either.
      markSeatModel(null)
      return 'noSlot'
    }
    // Hide the host's own seat (React owns the node; re-mark on swap).
    // Idempotent against a torn-down-less reload, like the account footer:
    // client HMR drops the old fiber's disposals, so a previous generation's
    // trigger and popovers are still in the DOM while this fresh scope starts
    // from null. Sweep the strays, or the seat renders twice. The popovers'
    // own sweep runs once at install: it walks the whole document, and this
    // path runs every pass.
    removeStrayNodes(slot, '.dsh-claude-model-seat', [seatBox])
    removeStrayNodes(slot, '.dsh-claude-model-btn', [modelBtn])
    // The host's own seat root, not the nodes the skin appended beside it: a
    // swap can put React's node after ours, and the effort level and the
    // context meter's ring stand in the same slot. It is hidden only while the
    // skin draws the effort slider: with that switch off the host's own seat —
    // and any third-party effort control mounted in this slot — stays visible
    // and reachable.
    const hostRoot = slot.querySelector(`:scope > :not([${SLOT_NODE_ATTR}])`)
    if (hostRoot !== null) hostRoot.toggleAttribute('data-dsh-claude-model-host', readPrefs().effortSlider === true)
    seatBox = ensureSeatBox(slot, seatBox)
    // The home card stands outside the conversation region the trailing rules
    // read, so its seat takes the external-control gate the picker's own block
    // styles: one line, capsule and height together.
    if (slot.closest(COMPOSER_CARD_SELECTOR)?.getAttribute(COMPOSER_VARIANT_ATTRIBUTE) === 'hero') {
      slot.setAttribute('data-dsh-claude-external-control', 'model-picker')
      heroMarkedSlot = slot
    } else if (heroMarkedSlot !== null) {
      heroMarkedSlot.removeAttribute('data-dsh-claude-external-control')
      heroMarkedSlot = null
    }
    const modelPart = ensureSeatPart(seatBox, 'model')
    if (modelBtn === null || modelBtn.parentElement !== modelPart) {
      // The old trigger carries the old label: its swap goes before the node does.
      if (modelBtn !== null) releaseModelLabels(modelBtn)
      if (modelBtn !== null && modelBtn.parentElement !== null) modelBtn.parentElement.removeChild(modelBtn)
      modelBtn = document.createElement('button')
      modelBtn.type = 'button'
      modelBtn.className = 'dsh-claude-model-btn'
      modelBtn.setAttribute('aria-haspopup', 'menu')
      modelBtn.innerHTML = '<span class="dsh-claude-model-btn-label"></span>'
      // Same contract as the account trigger: hover under the "All" scope,
      // click-only otherwise.
      modelBtn.addEventListener('mouseenter', () => {
        if (cards.hoverOn()) cards.scheduleOpenMain()
      })
      modelBtn.addEventListener('mouseleave', () => {
        if (cards.hoverOn()) cards.scheduleClose()
      })
      modelBtn.addEventListener('click', e => {
        e.stopPropagation()
        // Is the card up because the dwell opened it, with the pointer still
        // on this trigger? Then the press keeps it up
        // (shared/popover.ts::pressKeepsPopoverOpen) and the leave closes it.
        const open = cards.mainOpen()
        if (pressKeepsPopoverOpen(cards.hoverOn(), open)) return
        if (open) cards.closeAll()
        else cards.openMain()
      })
      // First part of the box: the model's name; the effort picker appends its
      // own button into the second part.
      modelPart.appendChild(modelBtn)
    }
    // Fresh chrome is empty chrome: the body the last paint built is gone, so
    // the answer tells the picker to rebuild the rows into the new one.
    const newChrome = cards.ensureChrome() === true

    const snap = modelCatalog.snapshot()
    const current = modelCatalog.current(snap)
    // The seat in force is the one fact the mark carries: written here, where the
    // name below is taken from the same reading, so the two never disagree.
    markSeatModel(current)
    const label = current ? current.model.name : copy('fallbackLabel')
    const labelEl = modelBtn.querySelector('.dsh-claude-model-btn-label')
    if (labelEl) {
      // The name swaps in place on the way from one model to the next, the way
      // the wait line's own words do (shared/swapping-text.ts): the copy leaving
      // rises through a blur while the arriving copy comes up from below. The
      // helper writes nothing when the words stand already, so a pass costs no
      // mutation — which is what keeps the scheduler's observer quiet.
      setSwappingText(labelEl as HTMLElement, label)
      // The dimmed tone means "no seat to name yet". A re-enumeration no longer
      // counts: the catalogue stands on the last seat it named (catalog.ts), so
      // the words in the box are the seat in force and keep the normal tone.
      labelEl.classList.toggle('dsh-claude-model-btn-loading', current === null)
    }
    // The official Flash model's release tag rides beside the seat's name, the
    // way the host's own label draws it (release-tag.ts). The label's swap
    // touches the label element alone, so the tag stands beside it and follows
    // the model in force.
    const seatTag = current === null ? null : releaseTag(current.group.id, current.model)
    let seatTagEl = modelBtn.querySelector<HTMLElement>('.dsh-claude-model-tag')
    if (seatTag === null) {
      seatTagEl?.remove()
    } else {
      if (seatTagEl === null) {
        seatTagEl = buildElement('span', 'dsh-claude-model-tag')
        modelBtn.appendChild(seatTagEl)
      }
      if (seatTagEl.textContent !== seatTag) seatTagEl.textContent = seatTag
    }
    // The level is NOT part of this trigger any more: it has its own button
    // beside it (packages/client/src/features/effort/effort-picker.ts). A stale "· High" span from
    // an older generation is swept rather than reused.
    const staleEffortEl = modelBtn.querySelector('.dsh-claude-model-btn-effort')
    if (staleEffortEl !== null) staleEffortEl.remove()
    // The tag is part of the model's name for a screen reader too, the way the
    // host's own label reads the badge beside the words.
    const triggerAria = copy('triggerLabel', { model: label }) + (seatTag === null ? '' : ` ${seatTag}`)
    setAttributeIfChanged(modelBtn, 'aria-label', triggerAria)
    modelBtn.disabled = mount.disabled === true
    return newChrome ? 'drawnInNewChrome' : 'drawn'
  }

  return {
    /** The seat's part of the pass's write: the seat, its label and the mark. */
    sync: syncModelControl,
    /** Hand the host's own seat and the skin's trigger back. */
    drop: dropModelControl,
    /** The seat box while it is in the document; the effort picker appends its button to it. */
    seatBox() { return seatBox !== null && seatBox.isConnected ? seatBox : null },
    /** The skin's trigger while it is in the document. */
    trigger() { return modelBtn !== null && modelBtn.isConnected ? modelBtn : null },
  }
}
