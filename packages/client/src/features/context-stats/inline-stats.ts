import { COMPOSER_ATTR, QUIET_ATTR, STATS_POSITION_FOOTER, STATS_POSITION_OFF } from '../../constants'
import { readPrefs } from '../../core/prefs'
import { findComposerCard, findComposerStats } from '@dsh-claude-style/engine/host'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { inPagePixels } from '../../shared/page-zoom'
import { createStatsCount } from './stats-count'
import { createFooterLayout } from './footer-layout'
import { INLINE_PROBE_ATTR, INLINE_STATS_ATTR, buildLine, writeLine } from './inline-line'
import type { DetailStep, Line } from './inline-line'
import type { Currency } from '@dsh-claude-style/contracts/prices'
import type { HostText } from '@dsh-claude-style/engine/host'
import type { StatsReading } from './stats-count'

export { INLINE_PROBE_ATTR, INLINE_STATS_ATTR }

/**
 * The composer's live statistics bar (D113): one unified line for both
 * placements — `footer` (toolbar when width permits, wrapping onto the dock
 * below when narrow) and `inline` (always on the dock line below). Both share
 * horizontal alignment, the six session-aggregate figure switches, the token
 * unit format, and the detail ladder (`full` → `directions` → `exact` → `compact`).
 */
export function createInlineStats(read: () => StatsReading, chatText: () => HostText | null, currency: () => Currency | null) {
  const footer = createFooterLayout(() => scheduleFit(true))
  let positionMode = ''
  let line: Line | null = null
  /** Out-of-flow measuring twin, built on first fit. */
  let probe: Line | null = null
  let detail: DetailStep = 2
  let fitted = false
  let fittedToolbarWidth = -1
  let fittedCardWidth = -1
  let fittedShape = -1
  let holdUntil = 0

  const count = createStatsCount((reading: StatsReading) => {
    const chat = chatText()
    if (line !== null && chat !== null) {
      writeLine(line, detail, chat, reading.stats, reading.usage, reading.cost, reading.billing, reading.costPending, currency())
    }
  })

  function place(root: HTMLElement, toolbar: boolean) {
    const row = findComposerStats()
    if (row === null || row.parentElement === null) return false
    return footer.place(root, row, toolbar)
  }

  function refit() {
    scheduleFit(false)
  }

  function clear() {
    footer.clear()
    cancelFit?.()
    cancelFit = null
    forceFit = false
    count.reset()
    if (probe !== null && probe.root.parentElement !== null) probe.root.remove()
    if (line !== null && line.root.parentElement !== null) line.root.parentElement.removeChild(line.root)
    detail = 2
    fitted = false
    fittedToolbarWidth = -1
    fittedCardWidth = -1
    fittedShape = -1
  }

  function ensureProbe() {
    if (probe === null) {
      probe = buildLine()
      probe.root.removeAttribute(INLINE_STATS_ATTR)
      probe.root.setAttribute(INLINE_PROBE_ATTR, '')
      probe.root.setAttribute(QUIET_ATTR, '')
      probe.root.setAttribute('aria-hidden', 'true')
    }
    return probe
  }

  function mountProbe(shown: Line) {
    const twin = ensureProbe()
    if (twin.root.parentElement !== shown.root.parentElement) shown.root.before(twin.root)
    return twin
  }

  function lineShape(reading: StatsReading, chat: HostText) {
    const twin = ensureProbe()
    writeLine(twin, detail, chat, reading.stats, reading.usage, reading.cost, reading.billing, reading.costPending, currency())
    let length = 0
    for (let i = 0; i < twin.root.children.length; i++) {
      const segment = twin.root.children[i] as HTMLElement
      if (!segment.hidden) length += (segment.textContent ?? '').length
    }
    return length
  }

  function probeDetailWidth(shown: Line, step: DetailStep, chat: HostText, reading: StatsReading) {
    const twin = mountProbe(shown)
    writeLine(twin, step, chat, reading.stats, reading.usage, reading.cost, reading.billing, reading.costPending, currency())
    return inPagePixels(twin.root.getBoundingClientRect().width)
  }

  function chooseFit(force: boolean) {
    const shown = line
    if (shown === null || shown.root.parentElement === null) return null
    const card = findComposerCard()
    const chat = chatText()
    const goal = count.goal()
    if (card === null || chat === null || goal === null) return null
    const toolbar = readPrefs().statsPosition === STATS_POSITION_FOOTER
    const toolbarRoom = toolbar ? footer.room() : 0
    const cardRoom = card.clientWidth
    if (!toolbar && cardRoom <= 0) return null
    if (!force && fitted && toolbarRoom === fittedToolbarWidth && cardRoom === fittedCardWidth) return null
    return {
      toolbarWidth: toolbarRoom,
      cardWidth: cardRoom,
      ...footer.fit(toolbarRoom, cardRoom, toolbar, step => probeDetailWidth(shown, step, chat, goal)),
    }
  }

  function applyFit(choice: NonNullable<ReturnType<typeof chooseFit>>) {
    const shown = line
    const chat = chatText()
    const goal = count.goal()
    if (shown === null || shown.root.parentElement === null || chat === null || goal === null) return
    detail = choice.detail
    fittedToolbarWidth = choice.toolbarWidth
    fittedCardWidth = choice.cardWidth
    const displayed = count.current()
    writeLine(shown, detail, chat, displayed.stats, displayed.usage, displayed.cost, displayed.billing, displayed.costPending, currency())
    fitted = true
    fittedShape = lineShape(goal, chat)
    footer.setPlacement(choice.placement)
  }

  let cancelFit: (() => void) | null = null
  let forceFit = false
  function scheduleFit(force: boolean) {
    if (force) forceFit = true
    if (cancelFit !== null) return
    let choice: ReturnType<typeof chooseFit> = null
    cancelFit = requestFrame({
      read() {
        const forced = forceFit
        forceFit = false
        choice = chooseFit(forced)
      },
      write() {
        cancelFit = null
        if (choice !== null) applyFit(choice)
        if (forceFit) scheduleFit(true)
      },
    })
  }

  function render() {
    if (!document.body.hasAttribute(COMPOSER_ATTR)) {
      clear()
      return
    }
    const position = readPrefs().statsPosition
    if (position === STATS_POSITION_OFF) {
      clear()
      return
    }
    if (positionMode !== position) {
      positionMode = position
      fitted = false
      fittedToolbarWidth = -1
      fittedCardWidth = -1
      detail = position === STATS_POSITION_FOOTER ? 2 : 3
    }
    const chat = chatText()
    if (chat === null) {
      clear()
      return
    }
    const toolbar = position === STATS_POSITION_FOOTER
    const held = Date.now() < holdUntil && line !== null && line.root.parentElement !== null
    const reading = read()
    if (reading.stats === null && reading.usage === null) {
      if (held && line !== null) {
        place(line.root, toolbar)
        return
      }
      clear()
      return
    }
    if (line === null) line = buildLine()
    if (!place(line.root, toolbar)) {
      if (held) return
      clear()
      return
    }
    const changed = count.to(reading)
    if (!changed && fitted) return
    const goal = count.goal()
    const shape = goal === null ? -1 : lineShape(goal, chat)
    if (!fitted || shape !== fittedShape) scheduleFit(true)
  }

  return {
    render,
    refit,
    hold(ms: number) {
      holdUntil = Date.now() + ms
      count.reset()
    },
    clear,
    invalidate() {
      fitted = false
      fittedToolbarWidth = -1
      fittedCardWidth = -1
      fittedShape = -1
    },
    root() {
      return line === null || line.root.parentElement === null ? null : line.root
    },
  }
}
