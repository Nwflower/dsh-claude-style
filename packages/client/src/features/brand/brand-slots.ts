import { observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { BRAND_ATTR, BRAND_CLAUDE, CUSTOM_MARK_ATTR, CUSTOM_WORD_ATTR } from '../../constants'
import { heldWrites } from '../../shared/held-writes'

/**
 * The host's own art inside a brand seat gives way to the art the skin paints
 * there (D43), and comes back when the reader supplied none of their own.
 *
 * The host wraps its art in a slot element whose inline `display: contents` is
 * what keeps that art in the page, so no sheet rule reaches it by weight alone.
 * The host writes the declaration again each time it renders the seat, and a node
 * it renders for the first time carries nothing of this skin's, so the value is
 * written on the slot element after the host's own (D9) and written again when
 * the host's render puts its own back. The declaration the host wrote is what
 * teardown and the switch back hand over as it stood.
 */

/** The mark's two seats: the expanded sidebar's and the collapsed rail's. */
const MARK_SEATS = ':is([data-dsh-claude-part~="brand-mark"], [data-dsh-claude-part~="rail-mark"])'
/** The wordmark's seat, inside the identity that holds the mark beside it. */
const WORD_SEAT = '[data-dsh-claude-part~="brand-identity"] > [data-dsh-claude-part~="brand-name"]'
/** The new-conversation hero's mark, which the Claude brand takes over as well. */
const HERO_SEAT = '[data-dsh-claude-part~="hero-mark"]'
const DISPLAY = 'display'

export function installBrandSlots() {
  const body = document.body
  const writes = heldWrites()
  /** The seats heard right now, so a seat the host replaced takes its subscription with it. */
  const heard: (() => void)[] = []

  const groups = [
    { seats: observeMatches<HTMLElement>(MARK_SEATS, rederive), givesWay: () => body.hasAttribute(CUSTOM_MARK_ATTR) },
    { seats: observeMatches<HTMLElement>(WORD_SEAT, rederive), givesWay: () => body.hasAttribute(CUSTOM_WORD_ATTR) },
    // The hero's art is the host's own, drawn for the DeepSeek brand; the Claude
    // brand paints the hitbox's mark and keeps nothing of the host's there.
    {
      seats: observeMatches<HTMLElement>(HERO_SEAT, rederive),
      givesWay: () => body.hasAttribute(CUSTOM_MARK_ATTR) || body.getAttribute(BRAND_ATTR) === BRAND_CLAUDE,
    },
  ]

  /**
   * Write this pass's answer onto every slot the standing seats hold. A slot that
   * already reads as the answer is left alone, so the style record this pass
   * causes settles in the pass after it instead of feeding itself.
   */
  function pass() {
    for (const group of groups) {
      const hidden = group.givesWay() ? 'none' : null
      for (const seat of group.seats.all()) {
        for (const child of seat.children) {
          // The slot wrapper is the element carrying the declaration no sheet
          // beats. A bare art node carries none, and the sheets that draw the
          // seat hide those, so nothing here needs a write.
          if (!(child instanceof HTMLElement)) continue
          const current = child.style.getPropertyValue(DISPLAY)
          const host = writes.hostValue(child, DISPLAY, current)
          writes.write(child, DISPLAY, host, hidden ?? host)
        }
      }
    }
  }

  /**
   * Read the seats again once the host replaced one: the subscriptions of the
   * seats that stood before are dropped and their declarations handed back, so a
   * seat that left the page keeps nothing of this skin's (D12).
   */
  function rederive() {
    for (const stop of heard.splice(0)) stop()
    writes.restore()
    for (const group of groups) {
      for (const seat of group.seats.all()) {
        heard.push(subscribeMutations(seat, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style'],
          // The host's render writes over this skin's value in the task that
          // mounts the batch, and the frame after it paints the seat: the write
          // is put back inside that task, as a mark the paint reads (D40).
          beforePaint: true,
        }, pass))
      }
    }
    pass()
  }

  // A seat's slot arrives after the seat itself, and the host's next render writes
  // the declaration again on the node already standing: both are heard at the
  // seat. The three document attributes are the states a seat gives way under.
  const stopSwitches = subscribeMutations(body, {
    attributes: true,
    attributeFilter: [CUSTOM_MARK_ATTR, CUSTOM_WORD_ATTR, BRAND_ATTR],
  }, pass)
  rederive()

  return () => {
    stopSwitches()
    for (const stop of heard.splice(0)) stop()
    for (const group of groups) group.seats.release()
    writes.restore()
  }
}
