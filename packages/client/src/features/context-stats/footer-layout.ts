import { COMPOSER_DOCK_SELECTOR, COMPOSER_TRAILING_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeSize } from '@dsh-claude-style/engine/bus'
import { buildElement, setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { closestComposerCard, findComposerRowIn } from '@dsh-claude-style/engine/host'
import { readPrefs } from '../../core/prefs'
import { inPagePixels } from '../../shared/page-zoom'

const FOOTER_LINE_ATTR = 'data-dsh-claude-footer-line'
type FooterMode = '' | 'toolbar' | 'below'

/** The figures take a flex seat between the host's controls (D43). */
export function createFooterLayout(refit: () => void) {
  const slot = buildElement('span', 'dsh-claude-footer-slot')
  const seat = buildElement('span', 'dsh-claude-footer-seat')
  slot.append(seat)
  let line: HTMLElement | null = null
  let dock: HTMLElement | null = null
  let trailing: HTMLElement | null = null
  let mode: FooterMode = ''
  let stopSize: (() => void) | null = null

  function clear() {
    stopSize?.()
    stopSize = null
    slot.remove()
    line?.removeAttribute(FOOTER_LINE_ATTR)
    line = null
    dock = null
    trailing = null
    mode = ''
  }

  function draw() {
    if (line === null || dock === null) return
    const seated = slot.isConnected && mode !== 'below'
    const parent = seated ? seat : dock
    const placement = mode === '' || seated ? mode : 'below'
    setAttributeIfChanged(line, FOOTER_LINE_ATTR, placement)
    if (line.parentElement !== parent) parent.prepend(line)
  }

  function place(next: HTMLElement, hostStats: HTMLElement) {
    const nextDock = hostStats.closest<HTMLElement>(COMPOSER_DOCK_SELECTOR)
    if (nextDock === null) return false
    const card = closestComposerCard(nextDock.previousElementSibling)
    const row = card === null ? null : findComposerRowIn(card)
    trailing = row?.querySelector<HTMLElement>(COMPOSER_TRAILING_SELECTOR) ?? null
    const parent = trailing?.parentElement === row ? row : null
    if (parent !== slot.parentElement || (parent !== null && slot.nextElementSibling !== trailing)) {
      stopSize?.()
      stopSize = null
      if (parent === null) slot.remove()
      else {
        parent.insertBefore(slot, trailing)
        // The meter and the model can change width after the row mounts (D40).
        stopSize = observeSize([parent, seat], refit)
      }
      refit()
    }
    setAttributeIfChanged(seat, 'data-dsh-claude-footer-align', readPrefs().statsFooterAlign)
    line = next
    dock = nextDock
    draw()
    return true
  }

  function fit(room: number, widthFor: (detail: number) => number) {
    for (const detail of room > 0 ? [2, 1, 0] : [0]) {
      if (widthFor(detail) <= room) return { detail, placement: 'toolbar' as const }
    }
    return { detail: 0, placement: 'below' as const }
  }

  return {
    clear,
    place,
    fit,
    // The flex seat gives up all intrinsic width, so the current figures never
    // take part in deciding whether the next figures fit (D40).
    room() {
      if (trailing === null || !slot.isConnected) return 0
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
