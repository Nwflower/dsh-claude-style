import { COMPOSER_VARIANT_ATTRIBUTE, CONVERSATION_CONTENT_SELECTOR, CONVERSATION_MAIN_SLOT_SELECTOR, PHASE_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { HOLDS_ATTR } from '../../constants'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { observeSize } from '@dsh-claude-style/engine/bus'
import { setAttributeIfChanged } from '@dsh-claude-style/engine/dom'

const TOOLBAR = 'data-dsh-claude-composer-toolbar'
const LAYOUT = 'data-dsh-claude-composer-layout'
const FRAME = 'data-dsh-claude-composer-frame'
const HEIGHT = '--dsh-claude-composer-toolbar-height'
const TRAILING_MIN = '--dsh-claude-composer-trailing-min'
const TRAILING = '[data-dsh-claude-part~="trailing"]'
const MODEL_FLEX = '.dsh-claude-model-seat, .dsh-claude-model-seat-model, .dsh-claude-model-btn'
const MODEL_LABEL = '.dsh-claude-model-btn-label'

function number(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function horizontalMargins(style: CSSStyleDeclaration) {
  return number(style.marginLeft) + number(style.marginRight)
}

function horizontalInsets(style: CSSStyleDeclaration) {
  return number(style.paddingLeft) + number(style.paddingRight) + number(style.borderLeftWidth) + number(style.borderRightWidth)
}

/** The children that really take a flex seat; slot anchors themselves draw no box. */
function flexItems(container: HTMLElement): HTMLElement[] {
  const items: HTMLElement[] = []
  for (const child of Array.from(container.children)) {
    if (!(child instanceof HTMLElement)) continue
    const style = getComputedStyle(child)
    if (style.display === 'none' || style.position === 'absolute' || style.position === 'fixed') continue
    if (style.display === 'contents') items.push(...flexItems(child))
    else items.push(child)
  }
  return items
}

/**
 * The width at which the trailing cluster has every fixed control and the
 * model's ten-character recognition floor. Only the model's nested flex boxes
 * need their contents summed; every other effective item has a fixed width.
 */
function minimumItemWidth(item: HTMLElement): number {
  const style = getComputedStyle(item)
  const margins = horizontalMargins(style)
  if (item.matches(MODEL_LABEL)) {
    const floor = number(style.minWidth) + (style.boxSizing === 'border-box' ? 0 : horizontalInsets(style))
    return floor + margins
  }
  if (item.matches(MODEL_FLEX)) return minimumFlexWidth(item) + margins
  return item.getBoundingClientRect().width + margins
}

function minimumFlexWidth(container: HTMLElement): number {
  const style = getComputedStyle(container)
  const items = flexItems(container)
  const gap = number(style.columnGap) * Math.max(0, items.length - 1)
  return horizontalInsets(style) + gap + items.reduce((sum, item) => sum + minimumItemWidth(item), 0)
}

/** Null while no independent right-hand control is occupying the cluster. */
export function composerTrailingMinimum(card: HTMLElement, row: HTMLElement): number | null {
  const held = (card.getAttribute(HOLDS_ATTR) ?? '').split(/\s+/).includes('composer-right-filled')
  if (!held) return null
  const trailing = row.querySelector<HTMLElement>(TRAILING)
  if (trailing === null || trailing.querySelector(MODEL_LABEL) === null) return null
  return Math.ceil(minimumFlexWidth(trailing))
}

/** Share the composer's scheduler and size notifications; no second observer. */
export function createComposerResponsive() {
  const rows = new Map<HTMLElement, HTMLElement>()
  const frames = new Set<HTMLElement>()
  let sizeStops: (() => void)[] = []
  let cancel: (() => void) | null = null

  function stopSizes() {
    for (const stop of sizeStops) stop()
    sizeStops = []
  }

  function sameRows(next: ReadonlyMap<HTMLElement, HTMLElement>) {
    if (rows.size !== next.size) return false
    for (const [card, row] of next) if (rows.get(card) !== row) return false
    return true
  }

  function clear(card: HTMLElement, row: HTMLElement) {
    row.removeAttribute(TOOLBAR)
    card.removeAttribute(LAYOUT)
    card.style.removeProperty(HEIGHT)
    row.style.removeProperty(TRAILING_MIN)
  }

  /** Claim only the main native frame, even before its toolbar has arrived. */
  function syncFrames(cards: readonly HTMLElement[], active: boolean) {
    const knownFrames = new Set<HTMLElement>()
    const nextFrames = new Set<HTMLElement>()
    for (const card of cards) {
      const content = card.closest<HTMLElement>(CONVERSATION_CONTENT_SELECTOR)
      if (content === null) continue
      const frame = content.parentElement
      if (frame === null) continue
      const outlet = frame.parentElement
      if (outlet === null || outlet.matches(CONVERSATION_MAIN_SLOT_SELECTOR) === false) continue
      knownFrames.add(frame)
      const phase = frame.getAttribute(PHASE_ATTRIBUTE)
      if (active && frame.isConnected && (phase === 'hero' || phase === 'settling' || phase === 'active')) nextFrames.add(frame)
    }
    // Include structurally known frames from this batch: a fresh HMR scope
    // has no old Set, but still releases its predecessor when inactive.
    for (const frame of new Set([...frames, ...knownFrames])) {
      if (nextFrames.has(frame) === false) frame.removeAttribute(FRAME)
    }
    frames.clear()
    for (const frame of nextFrames) {
      setAttributeIfChanged(frame, FRAME, '')
      frames.add(frame)
    }
  }

  function measure() {
    if (cancel !== null || rows.size === 0) return
    const readings: { card: HTMLElement; row: HTMLElement; layout: string; height: number; trailingMin: number | null }[] = []
    cancel = requestFrame({
      read() {
        for (const [card, row] of rows) {
          if (card.isConnected === false || card.clientWidth === 0) continue
          const width = card.clientWidth
          const inline = card.getAttribute(COMPOSER_VARIANT_ATTRIBUTE) === 'inline'
          const layout = inline ? (width <= 320 ? 'stacked' : width < 440 ? 'compact' : 'wide') : 'wide'
          readings.push({ card, row, layout, height: row.offsetHeight, trailingMin: composerTrailingMinimum(card, row) })
        }
      },
      write() {
        cancel = null
        let changed = false
        for (const { card, row, layout, height, trailingMin } of readings) {
          if (rows.get(card) !== row) continue
          const minimum = trailingMin === null ? '' : `${trailingMin}px`
          changed = changed || card.getAttribute(LAYOUT) !== layout || row.style.getPropertyValue(TRAILING_MIN) !== minimum
          setAttributeIfChanged(card, LAYOUT, layout)
          if (trailingMin === null) row.style.removeProperty(TRAILING_MIN)
          else row.style.setProperty(TRAILING_MIN, minimum)
          const value = `${height}px`
          if (card.style.getPropertyValue(HEIGHT) !== value) card.style.setProperty(HEIGHT, value)
        }
        // Changing the row arrangement changes the send/stop anchor too. Read
        // the resulting row on the next shared frame before publishing it.
        if (changed) measure()
      },
    })
  }

  return {
    sync(cards: readonly HTMLElement[], active: boolean) {
      syncFrames(cards, active)
      const next = new Map<HTMLElement, HTMLElement>()
      if (active) {
        for (const card of cards) {
          const tools = card.querySelector<HTMLElement>('[data-dsh-claude-part~="tools"]')
          const row = tools?.parentElement
          if (row?.matches('[data-dsh-claude-part~="row"]')) next.set(card, row)
        }
      }
      const unchanged = sameRows(next)
      for (const [card, row] of rows) if (next.get(card) !== row) clear(card, row)
      rows.clear()
      for (const [card, row] of next) {
        rows.set(card, row)
        setAttributeIfChanged(row, TOOLBAR, '')
      }
      if (unchanged) return
      stopSizes()
      // A repeated scheduler sync with the same boxes has nothing to measure.
      // Real width or content-height changes arrive through these subscriptions.
      for (const [card, row] of rows) sizeStops.push(observeSize([card, row], measure))
      measure()
    },
    measure,
    dispose() {
      stopSizes()
      cancel?.()
      cancel = null
      for (const [card, row] of rows) clear(card, row)
      rows.clear()
      for (const frame of frames) frame.removeAttribute(FRAME)
      frames.clear()
    },
  }
}
