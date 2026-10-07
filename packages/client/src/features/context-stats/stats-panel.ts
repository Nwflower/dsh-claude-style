import { COMPOSER_STAT_SELECTOR, DIALOG_TRIGGER_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { removeStrayNodes } from '../../shared/popover'

/**
 * The host's context panel and the marks this feature puts on the host's
 * nodes: which node is the panel, whether the host drew
 * its detailed statistics row, and what a generation before this one left
 * behind.
 */

/** The mark on the block this feature appends to the host's panel. */
export const CONTEXT_STATS_ATTR = 'data-dsh-claude-context-stats'
/** The mark on the host's panel itself, which is what takes the entrance. */
export const CONTEXT_PANEL_ATTR = 'data-dsh-claude-context-panel'
/** The mark that turns that reading on; written with the property, never without it. */
export const CONTEXT_PANEL_ALIGNED_ATTR = 'data-dsh-claude-context-aligned'

/**
 * The host's own marks on its three statistics dialogs — the two session
 * pills' and the per-turn token panel's. Their rows are a `dl` as well,
 * so the context panel is told from them by these marks.
 */
const HOST_STATS_DIALOGS = '[data-session-stats-details], [data-session-stats-usage], [data-turn-usage-details]'

/**
 * The context meter, stamped by the composer pass
 * (features/composer/composer.ts), which is also what tells this feature the
 * composer restyle covers the page.
 */
export function findContextMeter() {
  return document.querySelector<HTMLElement>('[data-dsh-claude-context-meter]')
}

/**
 * The meter's trigger: the host's own button, whose click opens and
 * closes the context panel.
 */
export function contextTrigger() {
  const meter = findContextMeter()
  return meter === null ? null : meter.querySelector('button')
}

/**
 * The host's context panel: the dialog it portals to <body>.
 *
 * A `dl` alone does not name it. The host's three statistics dialogs
 * carry one too, and so does a popover whose content holds one
 * (dsh-better-sidebar's agent node detail, portaled to the same <body>).
 * The three are excluded by the marks on them, and the panel is named by
 * where its rows sit: the host puts the grid directly in the panel, while
 * a popover keeps its `dl` inside the card that paints the surface. The
 * box carrying that card holds the positioning only, and paints nothing,
 * so a walk that stops there writes the numbers onto the page.
 */
export function contextPanel() {
  const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"]')
  for (let i = 0; i < dialogs.length; i++) {
    const dialog = dialogs[i]
    if (dialog.getAttribute('aria-modal') === 'true') continue
    if (dialog.querySelector(HOST_STATS_DIALOGS) !== null) continue
    if (dialog.querySelector(':scope > dl') === null) continue
    return dialog
  }
  return null
}

/**
 * Take the block and the panel marks off the dialogs a generation before
 * this one wrote them on: a client hot reload drops the previous
 * generation's disposals without running them, so what it left on a node
 * it wrongly took for the panel would stay there for good. The host's
 * panel keeps the block it holds, and the pass that follows fills it.
 */
export function clearStrayContextNodes() {
  const panel = contextPanel()
  const kept = panel === null ? null : panel.querySelector(`[${CONTEXT_STATS_ATTR}]`)
  removeStrayNodes(document, `[${CONTEXT_STATS_ATTR}]`, [kept])
  const marked = document.querySelectorAll(`[${CONTEXT_PANEL_ATTR}]`)
  for (let i = 0; i < marked.length; i++) {
    if (marked[i] === panel) continue
    marked[i].removeAttribute(CONTEXT_PANEL_ATTR)
    marked[i].removeAttribute(CONTEXT_PANEL_ALIGNED_ATTR)
  }
}

/**
 * Whether the host rendered its DETAILED statistics row, which is the
 * host's own answer to how much of these numbers it shows: detailed gets
 * the whole set, compact the four figures the compact row leaves out.
 *
 * The host keeps the performanceUsage mode in React state and puts no
 * marker on the DOM, so the two structures have to be told apart by
 * shape. Detailed wraps each pill in an anchor span and makes the
 * dialog-carrying ones buttons; compact renders bare span pills with no
 * trigger and no dialog. The wrapper check catches the detailed pill
 * whose dialog has no rows yet — a static span, not a button. The row is
 * HIDDEN by the stylesheet but still rendered, which is what makes this
 * readable.
 */
export function hostStatsDetailed(root: Element) {
  // The current host marks each figure and leaves the container unmarked; an
  // older one marks the container alone. Detailed reads the same in both: a
  // figure carries the dialog trigger, compact is a bare reading.
  const figures = root.querySelectorAll(COMPOSER_STAT_SELECTOR)
  if (figures.length > 0) {
    for (let i = 0; i < figures.length; i++) {
      if (figures[i].querySelector(DIALOG_TRIGGER_SELECTOR) !== null) return true
    }
    return false
  }
  if (root.querySelector(DIALOG_TRIGGER_SELECTOR) !== null) return true
  const children = root.children
  for (let i = 0; i < children.length; i++) {
    if (children[i].querySelector('button, span') !== null) return true
  }
  return false
}
