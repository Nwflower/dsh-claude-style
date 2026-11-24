import { COMPOSER_DOCK_SELECTOR, COMPOSER_TRAILING_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeSize } from '@dsh-claude-style/engine/bus'
import { buildElement, setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { closestComposerCard, findComposerRowIn } from '@dsh-claude-style/engine/host'
import { FOOTER_LINE_ATTR } from '../../constants'
import { readPrefs } from '../../core/prefs'
import { inPagePixels } from '../../shared/page-zoom'
import type { DetailStep } from './inline-line'

const FOOTER_ALIGN_ATTR = 'data-dsh-claude-footer-align'
type FooterMode = '' | 'toolbar' | 'below'

const TOOLBAR_STEPS: readonly DetailStep[] = [2, 1, 0]
const BELOW_STEPS: readonly DetailStep[] = [3, 2, 1, 0]

/**
 * Seats the composer statistics line either in the toolbar flex slot when width
 * permits (`footer`) or directly on the dock line below (`inline` and narrow
 * `footer`), applying horizontal alignment to both seats (D43, D113).
 */
export function createFooterLayout(refit: () => void) {
  const slot = buildElement('span', 'dsh-claude-footer-slot')
  const seat = buildElement('span', 'dsh-claude-footer-seat')
  slot.append(seat)
  let line: HTMLElement | null = null
  let dock: HTMLElement | null = null
  let observedCard: HTMLElement | null = null
  let trailing: HTMLElement | null = null
  let toolbarPreferred = true
  let mode: FooterMode = ''
  let stopSize: (() => void) | null = null

  function dropToolbarSlot() {
    stopSize?.()
    stopSize = null
    observedCard = null
    slot.remove()
    trailing = null
  }

  function clear() {
    dropToolbarSlot()
    line?.removeAttribute(FOOTER_LINE_ATTR)
    line?.removeAttribute(FOOTER_ALIGN_ATTR)
    line = null
    dock = null
    mode = ''
  }

  function draw() {
    if (line === null || dock === null) return
    const seated = toolbarPreferred && slot.isConnected && mode !== 'below'
    const parent = seated ? seat : dock
    const placement = !toolbarPreferred ? 'below' : mode === '' || seated ? mode : 'below'
    setAttributeIfChanged(line, FOOTER_LINE_ATTR, placement)
    if (line.parentElement !== parent) parent.prepend(line)
  }

  function place(next: HTMLElement, hostStats: HTMLElement, toolbar: boolean) {
    const nextDock = hostStats.closest<HTMLElement>(COMPOSER_DOCK_SELECTOR)
    if (nextDock === null) return false
    toolbarPreferred = toolbar
    const card = closestComposerCard(nextDock.previousElementSibling)
    if (!toolbar) {
      if (slot.parentElement !== null) {
        dropToolbarSlot()
        refit()
      }
      if (card !== observedCard) {
        stopSize?.()
        stopSize = card === null ? null : observeSize([card], refit)
        observedCard = card
      }
      mode = 'below'
    } else {
      const row = card === null ? null : findComposerRowIn(card)
      trailing = row?.querySelector<HTMLElement>(COMPOSER_TRAILING_SELECTOR) ?? null
      const parent = trailing?.parentElement === row ? row : null
      if (parent !== slot.parentElement || (parent !== null && slot.nextElementSibling !== trailing)) {
        stopSize?.()
        stopSize = null
        observedCard = null
        if (parent === null) slot.remove()
        else {
          parent.insertBefore(slot, trailing)
          // The meter ring and model label can change width after the row mounts (D40).
          stopSize = observeSize([parent, seat], refit)
        }
        refit()
      }
    }
    const align = readPrefs().statsFooterAlign
    setAttributeIfChanged(seat, FOOTER_ALIGN_ATTR, align)
    setAttributeIfChanged(next, FOOTER_ALIGN_ATTR, align)
    line = next
    dock = nextDock
    draw()
    return true
  }

  function fit(toolbarRoom: number, cardRoom: number, toolbar: boolean, widthFor: (detail: DetailStep) => number) {
    if (toolbar && toolbarRoom > 0) {
      for (const detail of TOOLBAR_STEPS) {
        if (widthFor(detail) <= toolbarRoom) return { detail, placement: 'toolbar' as const }
      }
    }
    if (cardRoom > 0) {
      for (const detail of BELOW_STEPS) {
        if (widthFor(detail) <= cardRoom) return { detail, placement: 'below' as const }
      }
    }
    return { detail: 0 as DetailStep, placement: 'below' as const }
  }

  return {
    clear,
    place,
    fit,
    // The flex seat gives up all intrinsic width, so the current figures never
    // take part in deciding whether the next figures fit (D40).
    room() {
      if (!toolbarPreferred || trailing === null || !slot.isConnected) return 0
      const slotBox = slot.getBoundingClientRect()
      const modelBox = trailing.getBoundingClientRect()
      // When the model wraps onto another row there is no space between the
      // two groups, even if the seat's side of the toolbar has room.
      if (slotBox.top > modelBox.bottom || slotBox.bottom < modelBox.top) return 0
      return inPagePixels(seat.getBoundingClientRect().width)
    },
    setPlacement(placement: Exclude<FooterMode, ''>) {
      mode = placement
      draw()
    },
  }
}
