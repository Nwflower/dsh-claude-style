import * as React from 'react'
import { FOOTER_TOKEN_UNITS, QUIET_ATTR } from '../../constants'
import { formatCompactTokens, formatUnitTokens } from '../../shared/format'
import { sessionStatsCacheHit, sessionStatsDuration, sessionStatsSpeed, sessionStatsTokens } from '../../shared/stats-format'
import { hostChatSeat } from '../../core/i18n'
import { readPrefs, subscribePrefs } from '../../core/prefs'
import { copy } from './copy'
import type { CopyKey } from './copy'
import { panelFiguresOf } from './session-panel-figures'
import type { PanelFigures, PanelRunFigures } from './session-panel-figures'
import { useLiveFigures } from './session-panel-live'
import { Skeleton, panelEntry } from './panel-rows'

const h = React.createElement

/** The token format the reader chose, followed across a settings change. */
function useTokenUnits() {
  const [units, setUnits] = React.useState(() => readPrefs().statsFooterTokenFormat === FOOTER_TOKEN_UNITS)
  React.useEffect(() => subscribePrefs(prefs => setUnits(prefs.statsFooterTokenFormat === FOOTER_TOKEN_UNITS)), [])
  return units
}

/**
 * One session's figures, as both tables print them (D113).
 *
 * The tables print the statistics feature's live reading of the host's
 * projections — the one the composer's line prints — so the numbers beside the
 * chat move with the numbers under it. Null while that reading has not answered
 * for this session; `live` false stops following it.
 */
export function useFigures(sessionId: string, live = true): PanelFigures | null {
  const liveFigures = useLiveFigures(sessionId, live)
  return liveFigures === null ? null : panelFiguresOf(liveFigures)
}

/** The session's tokens in the host's own words and the reader's chosen format. */
export function useTokenText() {
  const units = useTokenUnits()
  const chat = hostChatSeat()
  return (count: number) => (chat === null
    ? `${units ? formatUnitTokens(count) : formatCompactTokens(count)} tok`
    : sessionStatsTokens(count, chat, units))
}

/** One figure of a table: its label and its value as written, or its placeholder. */
interface Figure {
  key: string
  label: string
  value: React.ReactNode
}

/**
 * A table's rows: each figure gets a full row, so a long elapsed time or token
 * count keeps its value beside its label. The list is quiet (QUIET_ATTR, D40):
 * the figures' count rewrites its values every frame it travels, and no
 * page-wide pass reads them.
 */
function Figures({ rows }: { rows: readonly Figure[] }) {
  return h('dl', { className: 'dsh-claude-panel-stats', [QUIET_ATTR]: '' },
    rows.map(row => h('div', { key: row.key, className: 'dsh-claude-panel-stat' },
      h('dt', null, row.label),
      h('dd', null, row.value))))
}

/** A table before any reading answers (D113): the rows every session has, their values under placeholders. */
function PendingFigures({ labels }: { labels: readonly CopyKey[] }) {
  return h(Figures, { rows: labels.map(label => ({ key: label, label: copy(label), value: h(Skeleton, { width: '40px' }) })) })
}

/** The output speed in the host's own words, or null while the session decoded nothing. */
export function speedText(stats: PanelRunFigures) {
  if (stats.decodeMs <= 0) return null
  const speed = sessionStatsSpeed(stats.decodeTokens / (stats.decodeMs / 1000))
  const chat = hostChatSeat()
  return chat === null ? `${speed} tok/s` : chat('message.tokensPerSecond', { tps: speed })
}

/**
 * How the session ran (D113): its turns and steps, its speed and its time.
 *
 * The figures are written in the host's own words, through the same formatters
 * the composer's readout uses (shared/stats-format.ts): the panel is a second
 * surface of one session, not a second set of numbers.
 */
export const StatsSection = panelEntry(function StatsBody({ sessionId }) {
  const stats = useFigures(sessionId)?.run ?? null
  if (stats === null) return h(PendingFigures, { labels: ['statsTurns', 'statsSteps', 'statsModelTime', 'statsToolTime'] })
  const chat = hostChatSeat()
  const duration = (ms: number) => (chat === null ? `${Math.max(0, Math.round(ms / 1000))}s` : sessionStatsDuration(ms, chat))
  const rows: Figure[] = []
  rows.push({ key: 'turns', label: copy('statsTurns'), value: String(stats.turns) })
  rows.push({ key: 'steps', label: copy('statsSteps'), value: String(stats.steps) })
  const speed = speedText(stats)
  if (speed !== null) rows.push({ key: 'speed', label: copy('statsOutputSpeed'), value: speed })
  if (stats.ttftSteps > 0) rows.push({ key: 'ttft', label: copy('statsFirstToken'), value: duration(stats.ttftMs / stats.ttftSteps) })
  rows.push({ key: 'model', label: copy('statsModelTime'), value: duration(stats.llmMs) })
  rows.push({ key: 'tool', label: copy('statsToolTime'), value: duration(stats.toolMs) })
  return h(Figures, { rows })
})

/**
 * What the session spent (D113): its cost, its cache share and its token buckets.
 *
 * With billing off or a model no table prices, the cost row is left out.
 */
export const TokensSection = panelEntry(function TokensBody({ sessionId }) {
  const figures = useFigures(sessionId)
  const tokens = useTokenText()
  const usage = figures?.usage ?? null
  if (figures === null || usage === null) return h(PendingFigures, { labels: ['statsUncachedInput', 'statsCacheRead', 'statsCacheWrite', 'statsOutput'] })
  const cost = figures.cost
  const chat = hostChatSeat()
  const rows: Figure[] = []
  if (cost !== null) rows.push({ key: 'cost', label: copy('statsCost'), value: cost })
  const billed = usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
  if (billed > 0) {
    const hit = chat === null ? String(Math.round((usage.cacheReadTokens / billed) * 100)) : sessionStatsCacheHit(usage.cacheReadTokens, billed)
    if (hit !== null) rows.push({ key: 'cache', label: copy('statsCacheHit'), value: `${hit}%` })
  }
  rows.push({ key: 'uncached', label: copy('statsUncachedInput'), value: tokens(usage.uncachedInputTokens) })
  rows.push({ key: 'read', label: copy('statsCacheRead'), value: tokens(usage.cacheReadTokens) })
  rows.push({ key: 'write', label: copy('statsCacheWrite'), value: tokens(usage.cacheWriteTokens) })
  rows.push({ key: 'out', label: copy('statsOutput'), value: tokens(usage.outputTokens) })
  return h(Figures, { rows })
})
