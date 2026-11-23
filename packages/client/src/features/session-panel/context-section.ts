import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { formatCompactTokens } from '../../shared/format'
import { copy } from './copy'
import { usePanelReading, useLiveOccupancy } from './session-panel-data'
import { contextRows, contextOverview } from './context-rows'
import type { ContextOverview, ContextRow } from './context-rows'
import { compactOffer, requestCompaction } from './compact-offer'
import type { CompactOffer } from './compact-offer'
import { Skeleton, panelEntry } from './panel-rows'
import type { CompactionFailure } from '@dsh-claude-style/contracts/compaction'

const h = React.createElement

/** The headline occupancy; detailed rows keep one decimal of the window. */
export function sharePercent(value: number, whole: number) {
  if (whole <= 0) return '0'
  const percent = Math.max(0, Math.min(100, value / whole * 100))
  // A reading just under 100% keeps its decimal: it is not a full window.
  if (percent >= 99.95) return '100'
  return percent >= 10 && Math.round(percent) < 100 ? String(Math.round(percent)) : String(Math.round(percent * 10) / 10)
}

/** The overview of one session: the provider's occupancy, else the route's fold. */
export function useOverview(sessionId: string) {
  const { value, failed } = usePanelReading(sessionId)
  const occupancy = useLiveOccupancy(sessionId)
  return { context: value?.context ?? null, answered: value !== null, failed, overview: contextOverview(occupancy, value?.context ?? null) }
}

/**
 * The context window's occupancy, its composition, and the room left (D112).
 *
 * The overview is the provider's own reading, so it stands on the frame the
 * section mounts; the composition is the host's fold, and while that has not
 * answered the legend holds its rows under placeholders. Before either answers,
 * the head holds its two figures the same way. Once the session stands near the
 * host's own compaction threshold, the section offers the manual request beside
 * the distance to it (D100).
 */
export const ContextSection = panelEntry(function ContextBody({ sessionId }) {
  const { context, answered, failed, overview } = useOverview(sessionId)
  if (overview === null && failed && !answered) return h('p', { className: 'dsh-claude-panel-note' }, copy('unavailable'))
  if (overview === null && context !== null) return h('p', { className: 'dsh-claude-panel-note' }, copy('noContext'))
  if (overview === null) {
    return h('div', { className: 'dsh-claude-panel-context', 'aria-hidden': true },
      h('div', { className: 'dsh-claude-panel-context-head' }, h(Skeleton, { width: '28%' }), h(Skeleton, { width: '30%' })),
      h('div', { className: 'dsh-claude-panel-bar' }),
      pendingLegend())
  }
  const percent = sharePercent(overview.used, overview.window)
  const rows = context === null ? null : contextRows({ ...context, used: overview.used, window: overview.window })
  const offer = compactOffer(context, overview)
  return h('div', { className: 'dsh-claude-panel-context' },
    h('div', { className: 'dsh-claude-panel-context-head' },
      h('span', { className: 'dsh-claude-panel-percent' }, copy('contextUsedPct', { percent })),
      h('span', { className: 'dsh-claude-panel-figures' },
        `${formatCompactTokens(overview.used)} / ${formatCompactTokens(overview.window)}`)),
    contextBar(overview, rows),
    contextLegend(rows, overview),
    offer === null ? null : h(CompactControl, { key: 'compact', sessionId, offer }))
})

/** How the compact request stands: waiting, running, or what the host answered. */
type CompactPhase =
  | { state: 'idle' }
  | { state: 'running' }
  | { state: 'done', text?: string }
  | { state: 'failed', code?: CompactionFailure, text?: string }

/**
 * The distance to automatic compaction and the request that closes it (D100).
 *
 * One press is in flight at a time. The host's own sentence about the attempt is
 * kept as the line's hint; the section's polls carry the new numbers once the host
 * has written the summary, and the offer withdraws itself when the session has moved
 * away from the threshold.
 */
function CompactControl({ sessionId, offer }: { sessionId: string, offer: CompactOffer }) {
  const [phase, setPhase] = React.useState<CompactPhase>({ state: 'idle' })
  const press = () => {
    if (phase.state === 'running') return
    setPhase({ state: 'running' })
    requestCompaction(sessionId).then((answer) => {
      if (answer.ok === true) {
        setPhase({ state: 'done', text: answer.text })
        return
      }
      setPhase({ state: 'failed', code: answer.code, text: answer.text })
    }, () => {
      setPhase({ state: 'failed' })
    })
  }
  const failed = phase.state === 'failed'
  // The host's own borderless control carries its corners, press, focus and
  // disabled states; the row gives it the resting plate Claude's panel puts
  // under this request, the small size and the reading line's height
  // (session-panel-context.css).
  const action = phase.state === 'done'
    ? h('span', { className: 'dsh-claude-panel-compact-note', title: phase.text }, copy('compactDone'))
    : h(primitives.Button, {
      variant: 'ghost',
      className: 'dsh-claude-panel-compact-action',
      size: 'sm',
      disabled: phase.state === 'running',
      onClick: press,
    }, phase.state === 'running' ? copy('compactRunning') : copy('compactNow'))
  return h('div', { className: 'dsh-claude-panel-compact' },
    h('span', { className: 'dsh-claude-panel-compact-distance' },
      copy('compactDistance', { tokens: formatCompactTokens(Math.max(0, offer.remaining)) })),
    action,
    failed
      ? h('p', { className: 'dsh-claude-panel-note', role: 'alert', title: phase.text }, compactFailure(phase.code))
      : null)
}

/** What a failed request says: the reason the section can name, or the attempt itself. */
function compactFailure(code: CompactionFailure | undefined) {
  switch (code) {
    case 'no-agent': return copy('compactNoAgent')
    case 'unavailable': return copy('compactUnavailable')
    default: return copy('compactFailed')
  }
}

/** The occupancy bar: the parts' own colours once they answer, one used-ink bar before. */
function contextBar(overview: ContextOverview, rows: ContextRow[] | null) {
  const share = `${Math.min(100, overview.used / overview.window * 100)}%`
  return h('div', {
    className: 'dsh-claude-panel-bar',
    role: 'img',
    'aria-label': copy('contextUsedPct', { percent: sharePercent(overview.used, overview.window) }),
  }, rows === null
    // The occupancy before its composition is read: one bar, in the ink the
    // whole used context wears, until the parts take their own colours.
    ? h('span', { className: 'dsh-claude-panel-segment is-used', style: { width: share } })
    : rows.map(row => h('span', {
      key: row.kind,
      className: `dsh-claude-panel-segment is-${row.kind}`,
      style: { width: `${row.share}%` },
    })))
}

/** How many legend rows the placeholder holds: the parts a session most often carries. */
const PENDING_LEGEND_ROWS = 6

/**
 * The legend before the host's fold answers: rows of the legend's own shape,
 * each a swatch and its three readings under placeholders (D112).
 */
function pendingLegend() {
  return h('dl', { className: 'dsh-claude-panel-legend', 'aria-hidden': true },
    Array.from({ length: PENDING_LEGEND_ROWS }, (_, index) => h('div', { key: index, className: 'dsh-claude-panel-legend-row' },
      h('dt', null,
        h('i', { className: 'dsh-claude-panel-dot is-pending' }),
        h(Skeleton, { width: `${44 + (index % 3) * 12}%` })),
      h('dd', null, h(Skeleton, { width: '36px' })),
      h('dd', { className: 'dsh-claude-panel-share' }, h(Skeleton, { width: '36px' })))))
}

/**
 * The parts' legend and the room left, or the legend's placeholder rows until
 * the host's fold answers: the occupancy above is already the provider's own
 * reading. The legend's hint carries how the parts are priced.
 */
function contextLegend(rows: ContextRow[] | null, overview: ContextOverview) {
  if (rows === null) return pendingLegend()
  const free = Math.max(0, overview.window - overview.used)
  return h('dl', { className: 'dsh-claude-panel-legend', title: copy('contextEstimate') },
    rows.map(row => h('div', { key: row.kind, className: 'dsh-claude-panel-legend-row' },
      h('dt', null,
        h('i', { className: `dsh-claude-panel-dot is-${row.kind}`, 'aria-hidden': true }),
        copy(row.label)),
      h('dd', null, formatCompactTokens(row.tokens)),
      h('dd', { className: 'dsh-claude-panel-share' }, `${row.share.toFixed(1)}%`))),
    h('div', { className: 'dsh-claude-panel-legend-row is-free' },
      h('dt', null,
        h('i', { className: 'dsh-claude-panel-dot is-free', 'aria-hidden': true }),
        copy('contextFree')),
      h('dd', null, formatCompactTokens(free)),
      h('dd', { className: 'dsh-claude-panel-share' }, `${(free / overview.window * 100).toFixed(1)}%`)))
}
