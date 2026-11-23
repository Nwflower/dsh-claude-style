import { FOOTER_TOKEN_UNITS } from '../../constants'
import { readPrefs } from '../../core/prefs'
import { buildElement, writeTextInPlace } from '@dsh-claude-style/engine/dom'
import { findComposerStats } from '@dsh-claude-style/engine/host'
import { createStatsCount } from './stats-count'
import { sessionStatsSections } from './stats-model'
import { CONTEXT_STATS_ATTR, contextPanel, hostStatsDetailed } from './stats-panel'
import type { HostText } from '@dsh-claude-style/engine/host'
import type { Currency } from '@dsh-claude-style/contracts/prices'
import type { StatsReading } from './stats-count'

/**
 * The block this feature keeps at the host panel's end:
 * the rows written from the sections, and the skeleton that holds the
 * numbers' place until the projections answer. Runtime strings land as
 * text nodes, never as markup.
 *
 * The figures count from what the panel shows to a new reading
 * (stats-count.ts), the same motion the line of its own makes: a number that
 * moves while the panel is open travels there instead of jumping. The text is
 * plain, rewritten in place.
 *
 * The block's own content state is per generation, like the rest of this
 * feature: a client hot reload reuses the host's nodes and must not read the
 * previous generation's signature, count or skeleton timer.
 */

/** The mark on the block while it holds the numbers' place. */
const CONTEXT_SKELETON_ATTR = 'data-dsh-claude-context-skeleton'
/**
 * How long the block may hold the numbers' place.
 *
 * A projection that has not answered yet is what this covers: the block
 * reserves the height it will need, so the panel opens whole. A host that
 * serves no such projection never answers, and the place is given up at
 * this deadline rather than standing there as a lie.
 */
const STATS_SKELETON_MS = 2000
/** Rows of each section the placeholder reserves (a session's usual count). */
const STATS_SKELETON_ROWS = 4
/** The same, for the compact block: four items in a single 2x2 grid. */
const COMPACT_SKELETON_ITEMS = 4

/**
 * The block's writer.
 *
 * @param read - the whole reading the block writes.
 * @param chatText - the host's `chat` translate seat, or null when it is absent.
 * @param currency - which price table the cost figure follows.
 * @returns { render, stopSkeleton, resetContent }.
 */
export function createStatsBlock(read: () => StatsReading, chatText: () => HostText | null, currency: () => Currency | null) {
  /** The block's last written rows, so an unchanged pass rebuilds nothing. */
  let blockSignature = ''
  /** The value cells of the block as built, in section order. */
  let blockCells: HTMLElement[] = []
  /** Whether the block is holding the numbers' place, and since when. */
  let skeleton = false
  let skeletonSince = 0
  /** The timer that gives the place up at the deadline, while one runs. */
  let skeletonTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * The figures' count. Each frame writes the rows the count is standing on, so
   * a reading that moves travels there; the panel being closed stops it (the
   * next render's reset), and a panel just opened writes its reading as it is.
   */
  const count = createStatsCount((reading) => paint(reading))

  /** One reading with every number a whole one, the way the formatters read them. */
  function whole(reading: StatsReading): StatsReading {
    const stats = reading.stats === null ? null : {
      turns: Math.round(reading.stats.turns),
      steps: Math.round(reading.stats.steps),
      llmMs: Math.round(reading.stats.llmMs),
      toolMs: Math.round(reading.stats.toolMs),
      ttftMs: Math.round(reading.stats.ttftMs),
      ttftSteps: Math.round(reading.stats.ttftSteps),
      decodeMs: Math.round(reading.stats.decodeMs),
      decodeTokens: Math.round(reading.stats.decodeTokens),
    }
    const usage = reading.usage === null ? null : {
      uncachedInputTokens: Math.round(reading.usage.uncachedInputTokens),
      cacheReadTokens: Math.round(reading.usage.cacheReadTokens),
      cacheWriteTokens: Math.round(reading.usage.cacheWriteTokens),
      outputTokens: Math.round(reading.usage.outputTokens),
    }
    return { stats, usage, cost: reading.cost, billing: reading.billing, costPending: reading.costPending }
  }

  /** Write one reading onto the open panel, wherever the count stands between two. */
  function paint(reading: StatsReading) {
    const panel = contextPanel()
    if (panel === null) return
    const root = findComposerStats()
    const chat = chatText()
    if (root === null || chat === null) return
    writeBlock(panel, whole(reading), chat, !hostStatsDetailed(root))
  }

  /** Give up the numbers' place, if the block is holding it. */
  function stopSkeleton() {
    skeleton = false
    skeletonSince = 0
    if (skeletonTimer !== null) {
      clearTimeout(skeletonTimer)
      skeletonTimer = null
    }
  }

  /** The block this feature keeps at the panel's end, created on first sight. */
  function ensureContextBlock(panel: Element) {
    let block = panel.querySelector(`[${CONTEXT_STATS_ATTR}]`)
    if (block === null) {
      block = document.createElement('div')
      block.className = 'dsh-claude-context-stats'
      block.setAttribute(CONTEXT_STATS_ATTR, '')
      panel.appendChild(block)
    }
    return block
  }

  /** Take the block out of the panel (nothing to show, or the place given up). */
  function removeContextBlock(panel: Element) {
    const block = panel.querySelector(`[${CONTEXT_STATS_ATTR}]`)
    if (block !== null && block.parentElement !== null) block.parentElement.removeChild(block)
    blockSignature = ''
    blockCells = []
  }

  /**
   * Hold the numbers' place while the projections have answered nothing:
   * the two real headings over bars at a row's own size, so the panel
   * opens at the height the numbers will take. The place is given up at
   * STATS_SKELETON_MS — a host that serves no such projection never
   * answers, and the block then leaves rather than standing there as
   * placeholder bars.
   */
  function renderContextSkeleton(panel: Element, chat: HostText, compact: boolean) {
    if (!skeleton) {
      skeleton = true
      skeletonSince = Date.now()
    }
    const held = Date.now() - skeletonSince
    if (held >= STATS_SKELETON_MS) {
      stopSkeleton()
      removeContextBlock(panel)
      return
    }
    if (skeletonTimer === null) {
      skeletonTimer = setTimeout(() => {
        skeletonTimer = null
        stopSkeleton()
        renderContextStats()
      }, STATS_SKELETON_MS - held)
    }
    let signature = compact ? 'skeleton-compact' : 'skeleton'
    const titles = compact ? null : [chat('stats.dialog.title'), chat('stats.dialog.usageTitle')]
    if (titles !== null) for (const title of titles) signature += `\u0001${title}`
    const block = ensureContextBlock(panel)
    if (signature === blockSignature && block.childElementCount > 0) return
    blockSignature = signature
    block.setAttribute(CONTEXT_SKELETON_ATTR, '')
    if (compact) {
      block.replaceChildren(skeletonGrid(COMPACT_SKELETON_ITEMS))
    } else {
      const parts: HTMLElement[] = []
      for (const title of titles!) {
        parts.push(buildElement('div', 'dsh-claude-context-stats-section', title), skeletonGrid(STATS_SKELETON_ROWS))
      }
      block.replaceChildren(...parts)
    }
  }

  /** A grid of placeholder bars at a row's own size. */
  function skeletonGrid(rows: number) {
    const grid = buildElement('div', 'dsh-claude-context-stats-grid')
    for (let r = 0; r < rows; r++) {
      const item = buildElement('div', 'dsh-claude-context-stats-item')
      item.append(buildElement('span', 'dsh-claude-context-stats-skeleton-label'), buildElement('span', 'dsh-claude-context-stats-skeleton-value'))
      grid.appendChild(item)
    }
    return grid
  }

  /**
   * Write the numbers into the open panel, or keep the panel as the host
   * drew it while there is nothing to show. The structure is the sections and
   * their labels; the figures are written into the cells that structure built,
   * so a frame that only moved a number rewrites that one value. A block with
   * no sections at all is taken out, so no hairline is left standing over
   * nothing.
   */
  function writeBlock(panel: Element, reading: StatsReading, chat: HostText, compact: boolean) {
    const units = readPrefs().statsFooterTokenFormat === FOOTER_TOKEN_UNITS
    const sections = sessionStatsSections(reading.stats, reading.usage, reading.cost, currency(), chat, compact, units)
    if (sections.length === 0) {
      removeContextBlock(panel)
      return
    }
    stopSkeleton()
    let structure = compact ? 'compact' : ''
    for (const section of sections) {
      if (section.title) structure += `\u0001${section.title}`
      for (const row of section.rows) structure += `\u0001${row.label}`
    }
    const block = ensureContextBlock(panel)
    block.removeAttribute(CONTEXT_SKELETON_ATTR)
    if (structure !== blockSignature || block.childElementCount === 0) {
      blockSignature = structure
      const parts: HTMLElement[] = []
      const cells: HTMLElement[] = []
      for (const section of sections) {
        if (section.title) parts.push(buildElement('div', 'dsh-claude-context-stats-section', section.title))
        const grid = buildElement('div', 'dsh-claude-context-stats-grid')
        for (const row of section.rows) {
          const item = buildElement('div', 'dsh-claude-context-stats-item')
          const value = buildElement('div', 'dsh-claude-context-stats-value')
          cells.push(value)
          item.append(buildElement('div', 'dsh-claude-context-stats-label', row.label), value)
          grid.appendChild(item)
        }
        parts.push(grid)
      }
      block.replaceChildren(...parts)
      blockCells = cells
    }
    let cell = 0
    for (const section of sections) {
      for (const row of section.rows) {
        const value = blockCells[cell]
        if (value !== undefined) writeTextInPlace(value, row.value)
        cell += 1
      }
    }
  }

  /**
   * Write the numbers into the open panel, or hold their place: the reading
   * counts to its new value while the panel is open, and a closed panel stops
   * the count so the next open writes the reading of that moment.
   */
  function renderContextStats() {
    const panel = contextPanel()
    const root = panel === null ? null : findComposerStats()
    const chat = root === null ? null : chatText()
    if (panel === null || root === null || chat === null) {
      count.reset()
      return
    }
    const compact = !hostStatsDetailed(root)
    const reading = read()
    if (reading.stats === null && reading.usage === null) {
      count.reset()
      renderContextSkeleton(panel, chat, compact)
      return
    }
    const changed = count.to(reading)
    // A new reading is written by its own frames; a pass that found the same
    // reading still writes the block, so a label that followed the language
    // lands and the figures are left where they stood.
    if (!changed) writeBlock(panel, whole(count.current()), chat, compact)
  }

  return {
    /** Write the numbers into the open panel, or hold their place. */
    render: renderContextStats,
    /** Give up the numbers' place, if the block is holding it. */
    stopSkeleton,
    /** Stop the count and forget the block (the teardown). */
    stop() {
      count.reset()
      blockSignature = ''
      blockCells = []
    },
    /** Forget the last written content, so the next pass writes (a switch of session). */
    resetContent() {
      blockSignature = ''
    },
  }
}
