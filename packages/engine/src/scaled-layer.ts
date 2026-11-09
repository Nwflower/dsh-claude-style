import { subscribeMutations } from './bus'

/**
 * Host floating cards use viewport-pixel placement inside the body's zoomed space (D43, D81).
 * Counter-scale only those cards so host-written lengths and measurements stay one-to-one;
 * skin-owned cards handle scale themselves and must be left alone.
 */

/** What this mechanism needs from the skin it serves (D73). */
export interface PageScaleVocabulary {
  /** Whether a node belongs to the skin's own floating layer. */
  isOwn(node: Element): boolean
  /** The scale the page is drawn at right now: 1 while the page is not scaled. */
  scale(): number
  /** Runs inside the body child observer; must not mutate those children. */
  onChange?(): void
  /** Every card is handed back; the readings of the page in hand wait to be read again. */
  onRelease?(): void
}

/** The scale one card's own space is drawn at: the page's scale taken out again. */
export function counterScale(scale: number) {
  if (!(scale > 0) || scale === 1) return 1
  // Rounded: the number goes into a style string the mechanism compares itself
  // against on every pass, and a longer fraction would only lengthen it.
  return Math.round(1e6 / scale) / 1e6
}

/**
 * Counter-scale only body-level floating cards with inline `left` and `top`;
 * stylesheet-positioned cards already scale normally. Watch others for late inline placement.
 * `settle` refreshes after scale changes; `stop` restores every written card.
 */
export function installScaledLayer(vocabulary: PageScaleVocabulary) {
  /** The body-level nodes being heard, each with the subscription that hears it. */
  const heard = new Map<HTMLElement, () => void>()
  /** The cards this mechanism has written to, so the teardown hands each one back as it was. */
  const written = new Set<HTMLElement>()

  /** Give one card the page's own space back. A card never carried is left untouched. */
  const hand = (card: HTMLElement) => {
    if (!written.delete(card)) return
    card.style.removeProperty('zoom')
  }

  /** Whether this node is one of the host's own floating cards. */
  const isFloatingCard = (node: Element): node is HTMLElement => {
    if (!(node instanceof HTMLElement) || vocabulary.isOwn(node)) return false
    // Read before the computed style: a card the host positioned itself is the
    // only one that mixes the two spaces, and this test costs no style pass.
    if (node.style.left === '' || node.style.top === '') return false
    const position = getComputedStyle(node).position
    return position === 'fixed' || position === 'absolute'
  }

  /** Bring one body-level node in line: carry it, or hand it back when it stops being a card. */
  const carry = (node: HTMLElement) => {
    if (!isFloatingCard(node)) {
      hand(node)
      return
    }
    const value = String(counterScale(vocabulary.scale()))
    if (value === '1') {
      hand(node)
      return
    }
    if (node.style.zoom === value) return
    node.style.zoom = value
    written.add(node)
  }

  /** Hear every body-level node the skin does not own, and drop the ones that left. */
  const sync = () => {
    const present = new Set<HTMLElement>()
    for (const child of document.body.children) {
      if (!(child instanceof HTMLElement) || vocabulary.isOwn(child)) continue
      present.add(child)
      if (!heard.has(child)) {
        heard.set(child, subscribeMutations(child, { attributes: true, attributeFilter: ['style'] }, () => carry(child)))
      }
      carry(child)
    }
    for (const [node, off] of [...heard]) {
      if (present.has(node)) continue
      heard.delete(node)
      off()
      written.delete(node)
    }
  }

  const stopWatch = subscribeMutations(document.body, { childList: true }, () => {
    sync()
    vocabulary.onChange?.()
  })
  sync()

  return {
    settle: sync,
    stop() {
      stopWatch()
      for (const [node, off] of heard) {
        off()
        hand(node)
      }
      heard.clear()
      vocabulary.onRelease?.()
    },
  }
}
