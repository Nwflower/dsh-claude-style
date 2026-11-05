import { CONTEXT_DISPLAY_PIE, CONTEXT_DISPLAY_RING_BAND, SLOT_NODE_ATTR, STATS_POSITION_CONTEXT, STATS_POSITION_FOOTER } from '../../constants'
import { COMPOSER_VARIANT_ATTRIBUTE, DIALOG_TRIGGER_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { closestComposerCard, findModelSlotIn, findPrimaryModelSlot, observeComposerCards } from '@dsh-claude-style/engine/host'
import { readPrefs } from '../../core/prefs'
import { removeStrayNodes } from '../../shared/popover'
import { setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { CONTEXT_STOPS, rampPosition, writeRamp } from './stats-ramp'
import { composerCardOf, contextMeterOf, findContextMeter, markContextMeter, meterOccupancy } from './stats-panel'
import { paintContextPie, readPieColours, releaseContextPie } from './context-meter-pie'
import { METER_RING_RADIUS, METER_RING_SIZE, ringDash, writeContextBand } from './context-meter-face'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureHandle } from '@dsh-claude-style/engine/scheduler'
import type { FeatureUi } from '../../core/feature'
import type { PieColours } from './context-meter-pie'
import type manifest from './meter-ring.manifest'

/**
 * The context meter's own ring in the composer row.
 *
 * The host's meter cannot leave the dock the host renders it in — moving it out
 * crashed React's unmount — so the skin draws the ring itself, and the host's
 * node stays where it is and leaves the row unpainted: it keeps only the job of
 * opening its own context panel, which stats-binding.ts presses its trigger
 * for. The ring is the skin's own node, appended after the seat box in the
 * host's model slot (features/model/seat-box.ts is the same arrangement), so
 * the row lays it out and shortens the model's name before it.
 *
 * A page can carry more than one composer card — a sub-agent's sidebar mounts an
 * embedded conversation — and every card the skin has restyled gets a ring of
 * its own: the reading the reader sees belongs in the card it stands over, not
 * under the card (issue: the context ring dropped onto a line below the row).
 * The card's own host meter keeps the place it is rendered in and stops
 * painting, hidden by the same mark in every card.
 *
 * The reading is the host's projection of the session's context pressure. A
 * host that serves none is read off its own ring's text, which is still in the
 * document behind the paint. The ring's look is the face the reader picked
 * (context-meter-face.ts): the pie in the continuous band, dsh's thin ring in
 * that band, or the measured ring in three bands, with the number beside it.
 */

/** The mark on the ring's root, which the ring's own rules and the specs read. */
export const METER_RING_ATTR = 'data-dsh-claude-meter-ring'
/**
 * The mark on the host's meter while the skin's ring stands in its place: the
 * stylesheet drops the host's node out of the row without moving it.
 */
export const METER_HIDDEN_ATTR = 'data-dsh-claude-meter-hidden'

/**
 * The ring standing in the composer card `node` belongs to, or null. The card
 * is answered through stats-panel.ts::composerCardOf, which also knows a card's
 * own dock line, so a meter in that line finds its card's ring.
 */
export function meterRingOf(node: Element | null | undefined): HTMLElement | null {
  const card = composerCardOf(node)
  return card === null ? null : card.querySelector<HTMLElement>(`[${METER_RING_ATTR}]`)
}

/** One drawn ring, with the state of the card it stands in. */
interface RingFace {
  /** The composer card this ring answers, which is what the ring's presses are read against. */
  card: HTMLElement
  ring: HTMLElement
  button: HTMLButtonElement
  value: HTMLElement
  fill: SVGCircleElement
  /** The host's meter this ring hides right now, or null. */
  hiddenMeter: HTMLElement | null
  /** The watch on that meter's open state, or null while no meter is hidden. */
  stopExpandedWatch: (() => void) | null
  /** The occupancy the context statistics answered for this ring, or null while their projection says nothing. */
  answered: number | null
  /** The percentage the ring was last drawn for, so an unmoved reading writes nothing. */
  shown: number | null
  /** The pie's colours, read in a pass's own read phase (D40). */
  colours: PieColours | null
}

/** What the context statistics read off the ring (ui.meterRing). */
export interface MeterRingHandle extends FeatureHandle {
  /** The main card's ring root while it stands in the row, else null. */
  root(): HTMLElement | null
  /** Every ring standing in the row right now, one per restyled composer card. */
  roots(): HTMLElement[]
  /** Say what the main card's ring reads: the occupancy as a percentage, or null while none can be taken. */
  setReading(percent: number | null): void
}

/**
 * @param ctx - the plugin context (unused; the ring reads the page through the engine).
 * @param ui - the shared registry. `ui.model` answers the seat box the ring stands after.
 * @returns the teardown.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  /** The rings on the page, one per composer card the skin has restyled. */
  const faces = new Map<HTMLElement, RingFace>()
  /** The composer cards, kept current by the bus (D40): the pass reads the list rather than the document. */
  const cards = observeComposerCards()

  /**
   * The card the page's main composer draws: the one the skin's seat box stands
   * in, else the one holding the main model slot. A sub-agent's docked
   * conversation draws a card of its own, and this one is the shell the reader
   * types in.
   */
  function primaryCard() {
    const seat = typeof ui.model?.seatBox === 'function' ? ui.model.seatBox() : null
    const seatCard = seat === null ? null : closestComposerCard(seat)
    if (seatCard !== null) return seatCard
    const slot = findPrimaryModelSlot()
    return slot === null ? null : closestComposerCard(slot)
  }

  /** The main card's ring, which the session's own projection feeds. */
  function primaryFace() {
    const card = primaryCard()
    return card === null ? null : faces.get(card) ?? null
  }

  /**
   * Whether this ring answers the page's main composer. Only that card falls
   * back to the document's first meter: a docked conversation's own meter is
   * its only reading, and the main card's number is not its own.
   */
  function isPrimary(face: RingFace) {
    const card = primaryCard()
    return card !== null && card === face.card
  }

  /** The host meter a ring stands for: its own card's, or the document's first for the main card. */
  function meterOf(face: RingFace) {
    return contextMeterOf(face.ring) ?? (isPrimary(face) ? findContextMeter() : null)
  }

  /** The trigger inside that meter: the words the ring mirrors and the panel's open state. */
  function triggerOf(face: RingFace) {
    const meter = meterOf(face)
    return meter === null ? null : meter.querySelector('button')
  }

  /**
   * The number a ring shows: the projection the context statistics followed,
   * else the reading the card's own host meter still carries behind the paint.
   */
  function readingOf(face: RingFace) {
    if (face.answered !== null) return face.answered
    const meter = meterOf(face)
    return meter === null ? null : meterOccupancy(meter)
  }

  /** Build a card's ring once: the button, its ring and the number beside it, in the host's own anatomy. */
  function ensureFace(card: HTMLElement): RingFace {
    const existing = faces.get(card)
    if (existing !== undefined) return existing
    const root = document.createElement('span')
    root.setAttribute(METER_RING_ATTR, '')
    root.setAttribute(SLOT_NODE_ATTR, '')
    const button = document.createElement('button')
    button.type = 'button'
    button.setAttribute('aria-haspopup', 'dialog')
    button.setAttribute('aria-expanded', 'false')
    button.innerHTML = `<svg viewBox="0 0 ${METER_RING_SIZE} ${METER_RING_SIZE}" width="${METER_RING_SIZE}" height="${METER_RING_SIZE}" aria-hidden="true"><circle class="dsh-claude-meter-ring-track" cx="${METER_RING_SIZE / 2}" cy="${METER_RING_SIZE / 2}" r="${METER_RING_RADIUS}"></circle><circle class="dsh-claude-meter-ring-fill" cx="${METER_RING_SIZE / 2}" cy="${METER_RING_SIZE / 2}" r="${METER_RING_RADIUS}" transform="rotate(-90 ${METER_RING_SIZE / 2} ${METER_RING_SIZE / 2})"></circle></svg><span class="dsh-claude-meter-ring-value"></span>`
    root.appendChild(button)
    const face: RingFace = {
      card,
      ring: root,
      button,
      value: button.querySelector('span') as HTMLElement,
      fill: button.querySelector('circle.dsh-claude-meter-ring-fill') as SVGCircleElement,
      hiddenMeter: null,
      stopExpandedWatch: null,
      answered: null,
      shown: null,
      colours: null,
    }
    faces.set(card, face)
    return face
  }

  /**
   * Stand the ring in the card's row: after the seat box, which the model picker
   * keeps first in the slot; with the picker's own redraw off there is no seat
   * box, and the ring closes the slot instead of giving the row back to the
   * host's meter (issue #162).
   */
  function placeRing(face: RingFace, slot: HTMLElement, seat: HTMLElement | null) {
    const ring = face.ring
    if (seat !== null) {
      if (ring.parentElement !== slot || ring.previousElementSibling !== seat) slot.insertBefore(ring, seat.nextSibling)
    } else if (ring.parentElement !== slot || ring.nextElementSibling !== null) {
      slot.appendChild(ring)
    }
  }

  /**
   * Where a card's ring belongs, or null when the card is one the composer
   * restyle has stood down from or has no row to lay the ring out in: a card
   * with no variant is one the restyle stood down from, and the home page's
   * composer keeps the host's line, as does the line of their own.
   */
  function placeOf(card: HTMLElement) {
    const variant = card.getAttribute(COMPOSER_VARIANT_ATTRIBUTE)
    if (variant === null || variant === 'hero') return null
    const slot = findModelSlotIn(card)
    if (slot === null) return null
    const seat = typeof ui.model?.seatBox === 'function' ? ui.model.seatBox() : null
    return { slot, seat: seat !== null && card.contains(seat) ? seat : null }
  }

  /** The ring's own words and arc for the percentage it shows. */
  function drawReading(face: RingFace, percent: number | null) {
    if (percent === face.shown) return
    face.shown = percent
    const text = percent === null ? '' : `${percent}%`
    if (face.value.textContent !== text) face.value.textContent = text
    // The arc the host draws for the same reading: the dash covers the share
    // taken and the gap the rest of the ring.
    face.fill.setAttribute('stroke-dasharray', ringDash(percent))
    face.fill.toggleAttribute('data-empty', percent === null || percent <= 0)
  }

  /** Read the colours a ring's pie takes: their band, mixed by the browser (stats-ramp.ts). A drawn ring takes its colour from the stylesheet, so only the pie is read. */
  function readColoursFor(face: RingFace) {
    face.colours = readPrefs().contextDisplay !== CONTEXT_DISPLAY_PIE ? null : readPieColours(face.ring)
    return face.colours
  }

  /**
   * Paint the reading on the face the reader picked, with the host's trigger's
   * own words for a screen reader, so the control the reader finds is named the
   * same as the one it stands for.
   */
  function paintRing(face: RingFace) {
    const percent = readingOf(face)
    const display = readPrefs().contextDisplay
    // The ring stands in the card whose meter it hides, so the words it mirrors
    // are that card's trigger's: a docked conversation's meter is its own.
    const trigger = triggerOf(face)
    if (trigger !== null) {
      const label = trigger.getAttribute('aria-label')
      if (label !== null) setAttributeIfChanged(face.button, 'aria-label', label)
    }
    mirrorExpanded(face)
    drawReading(face, percent)
    if (display === CONTEXT_DISPLAY_PIE) {
      writeContextBand(face.ring, null)
      const moved = writeRamp(face.ring, 'context', percent === null ? null : rampPosition(percent, CONTEXT_STOPS))
      // A band that moved carries a new colour: the plate's image is drawn from
      // the colours read for it, and only a moved band needs a new reading.
      paintContextPie(face.ring, percent, moved || face.colours === null ? readColoursFor(face) : face.colours)
      return
    }
    // The drawn ring: no plate, and the colour rule the reader picked — the
    // continuous band, or the three bands with their floor at 70 and 90.
    releaseContextPie(face.ring)
    if (display === CONTEXT_DISPLAY_RING_BAND) {
      writeRamp(face.ring, 'context', null)
      writeContextBand(face.ring, percent)
    } else {
      writeContextBand(face.ring, null)
      writeRamp(face.ring, 'context', percent === null ? null : rampPosition(percent, CONTEXT_STOPS))
    }
  }

  /** Say on the ring whether the host's panel is open, as that card's trigger says it. */
  function mirrorExpanded(face: RingFace) {
    const trigger = triggerOf(face)
    setAttributeIfChanged(face.button, 'aria-expanded', trigger !== null && trigger.getAttribute('aria-expanded') === 'true' ? 'true' : 'false')
  }

  /**
   * Follow the hidden meter's open state as the host writes it. The host shows
   * its panel in the batch its trigger flips in, and the skin places it in that
   * same batch (stats-binding.ts), so a ring that waited for the next pass
   * would say "closed" over a panel the reader already sees.
   */
  function watchExpanded(face: RingFace, meter: HTMLElement | null) {
    if (face.stopExpandedWatch !== null) face.stopExpandedWatch()
    face.stopExpandedWatch = meter === null ? null : subscribeMutations(meter, { subtree: true, attributeFilter: ['aria-expanded'] }, () => mirrorExpanded(face))
  }

  /** Take a ring down and hand its card's meter back. */
  function dropFace(face: RingFace) {
    if (face.ring.parentElement !== null) face.ring.parentElement.removeChild(face.ring)
    if (face.hiddenMeter !== null) face.hiddenMeter.removeAttribute(METER_HIDDEN_ATTR)
    face.hiddenMeter = null
    watchExpanded(face, null)
    faces.delete(face.card)
  }

  function dropAll() {
    for (const face of Array.from(faces.values())) dropFace(face)
  }

  function syncRing() {
    const position = readPrefs().statsPosition
    if (position !== STATS_POSITION_CONTEXT && position !== STATS_POSITION_FOOTER) {
      dropAll()
      return
    }
    const drawn = new Set<HTMLElement>()
    const all = cards.all()
    for (let i = 0; i < all.length; i += 1) {
      const place = placeOf(all[i])
      if (place === null) continue
      const face = ensureFace(all[i])
      drawn.add(all[i])
      placeRing(face, place.slot, place.seat)
      hideHostMeter(face)
      paintRing(face)
    }
    // A card the sidebar closed takes its ring with it; the ring cannot outlive
    // the card it answers.
    for (const face of Array.from(faces.values())) {
      if (!drawn.has(face.card)) dropFace(face)
    }
  }

  /**
   * The card's host meter keeps the host's place and stops painting: its
   * trigger is the panel's, the reading is the ring's. It is marked the way the
   * context statistics mark it, since the hiding rule reads both marks.
   */
  function hideHostMeter(face: RingFace) {
    const meter = meterOf(face)
    if (face.hiddenMeter !== meter) {
      if (face.hiddenMeter !== null) face.hiddenMeter.removeAttribute(METER_HIDDEN_ATTR)
      watchExpanded(face, meter)
    }
    face.hiddenMeter = meter
    if (meter === null) return
    markContextMeter(meter)
    meter.setAttribute(METER_HIDDEN_ATTR, '')
  }

  // The host renders its meter anew at moments of its own (a turn ending), and
  // the new node would paint in the dock for the frame before the next pass,
  // pushing the card up by its height: it is hidden in the batch that brought it.
  const triggers = observeMatches<HTMLElement>(DIALOG_TRIGGER_SELECTOR, () => {
    for (const face of Array.from(faces.values())) hideHostMeter(face)
  })

  function teardown() {
    triggers.release()
    cards.release()
    dropAll()
  }

  // A generation whose teardown a client reload dropped leaves its ring in the
  // slot: this one sweeps it out before drawing its own.
  removeStrayNodes(document, `[${METER_RING_ATTR}]`, [])
  ui.meterRing = {
    sync: syncRing,
    // The ring's colours come off the page's own styles, which a pass reads in
    // its read phase alone (D40).
    measure() {
      const face = primaryFace()
      return face === null ? null : readColoursFor(face)
    },
    /** The main card's ring, as the pass that drew it left it. */
    root() {
      const face = primaryFace()
      return face === null || !face.ring.isConnected ? null : face.ring
    },
    /** Every ring standing in the row: the statistics bind each as its own panel's face. */
    roots() {
      const out: HTMLElement[] = []
      for (const face of faces.values()) {
        if (face.ring.isConnected) out.push(face.ring)
      }
      return out
    },
    /**
     * The occupancy the session's own projection answered. The main card's ring
     * is drawn from it in the same pass, and a projection frame arriving
     * between passes repaints the number at once rather than waiting for the
     * next one. The other cards' rings read their own meters: the projection
     * is the session the reader types in.
     */
    setReading(percent: number | null) {
      const face = primaryFace()
      if (face === null || face.answered === percent) return
      face.answered = percent
      paintRing(face)
    },
    teardown,
  }

  return teardown
}
