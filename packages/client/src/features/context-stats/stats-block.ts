import { buildElement } from '../../shared/dom'
import { findComposerStats } from '../../core/host'
import { sessionStatsSections } from './stats-model'
import { CONTEXT_STATS_ATTR, contextPanel, hostStatsDetailed } from './stats-panel'
import type { HostText } from '../../core/host'
import type { StatsValueReader } from './stats-model'

/**
 * The block this feature keeps at the host panel's end:
 * the rows written from the sections, and the skeleton that holds the
 * numbers' place until the projections answer. Runtime strings land as
 * text nodes, never as markup.
 *
 * The block's own content state is per generation, like the rest of this
 * feature: a client hot reload reuses the host's nodes and must not read the
 * previous generation's signature or skeleton timer.
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
 * @param read - one projection's current whole value.
 * @param chatText - the host's `chat` translate seat, or null when it is absent.
 * @returns { render, stopSkeleton, resetContent }.
 */
export function createStatsBlock(read: StatsValueReader, chatText: () => HostText | null) {
  /** The block's last written content, so an unchanged pass writes nothing. */
  let blockSignature = ''
  /** Whether the block is holding the numbers' place, and since when. */
  let skeleton = false
  let skeletonSince = 0
  /** The timer that gives the place up at the deadline, while one runs. */
  let skeletonTimer: ReturnType<typeof setTimeout> | null = null

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
   * drew it while there is nothing to show. A block whose content has not
   * changed is left alone; a block with no sections at all is taken out,
   * so no hairline is left standing over nothing.
   */
  function renderContextStats() {
    const panel = contextPanel()
    if (panel === null) return
    const root = findComposerStats()
    if (root === null) return
    const chat = chatText()
    if (chat === null) return
    const compact = !hostStatsDetailed(root)
    const waiting = read('sessionStats') === undefined && read('tokenUsage') === undefined
    const sections = waiting ? [] : sessionStatsSections(read, chat, compact)
    if (sections.length === 0) {
      if (waiting) renderContextSkeleton(panel, chat, compact)
      else removeContextBlock(panel)
      return
    }
    stopSkeleton()
    let signature = compact ? 'compact' : ''
    for (const section of sections) {
      if (section.title) signature += `\u0001${section.title}`
      for (const row of section.rows) signature += `\u0001${row.label}\u0002${row.value}`
    }
    const block = ensureContextBlock(panel)
    block.removeAttribute(CONTEXT_SKELETON_ATTR)
    if (signature === blockSignature && block.childElementCount > 0) return
    blockSignature = signature
    const parts: HTMLElement[] = []
    for (const section of sections) {
      if (section.title) parts.push(buildElement('div', 'dsh-claude-context-stats-section', section.title))
      const grid = buildElement('div', 'dsh-claude-context-stats-grid')
      for (const row of section.rows) {
        const item = buildElement('div', 'dsh-claude-context-stats-item')
        item.append(buildElement('div', 'dsh-claude-context-stats-label', row.label), buildElement('div', 'dsh-claude-context-stats-value', row.value))
        grid.appendChild(item)
      }
      parts.push(grid)
    }
    block.replaceChildren(...parts)
  }

  return {
    /** Write the numbers into the open panel, or hold their place. */
    render: renderContextStats,
    /** Give up the numbers' place, if the block is holding it. */
    stopSkeleton,
    /** Forget the last written content, so the next pass writes (a switch of session). */
    resetContent() {
      blockSignature = ''
    },
  }
}
