/**
 * Trailing summary readings rendered into the host panel's
 * `conversation.session.panel.section.actions` slot while a skin section is
 * folded (D113). When the skin yields section folding back to the host, every
 * reading renders nothing.
 */
import * as React from 'react'
import { QUIET_ATTR } from '../../constants'
import { copy } from './copy'
import { sharePercent, useOverview } from './context-section'
import { speedText, useFigures, useTokenText } from './figures-sections'
import { usePanelReading } from './session-panel-data'
import { Skeleton, panelEntry } from './panel-rows'
import { useSectionFoldActive } from './section-fold'

const h = React.createElement

function Reading({ children }: { children: React.ReactNode }) {
  return h('span', { className: 'dsh-claude-panel-section-reading', [QUIET_ATTR]: '' }, children)
}

export const ContextReading = panelEntry(function ContextReadingBody({ sessionId }) {
  const active = useSectionFoldActive()
  const { context, answered, failed, overview } = useOverview(sessionId)
  if (!active) return null
  if (overview === null && failed && !answered) return null
  if (overview === null && context !== null) return null
  if (overview === null) return h(Reading, null, h(Skeleton, { width: '48px' }))
  const share = `${Math.min(100, overview.used / overview.window * 100)}%`
  return h(Reading, null,
    h('span', null, `${sharePercent(overview.used, overview.window)}%`),
    h('span', { className: 'dsh-claude-panel-context-mini', 'aria-hidden': true },
      h('span', { style: { width: share } })))
})

export const StatsReading = panelEntry(function StatsReadingBody({ sessionId }) {
  const active = useSectionFoldActive()
  const { figures, failed } = useFigures(sessionId)
  if (!active || failed) return null
  if (figures === null) return h(Reading, null, h(Skeleton, { width: '48px' }))
  const speed = speedText(figures.stats)
  return h(Reading, null, speed ?? copy('sectionTurns', { count: figures.stats.turns }))
})

export const TokensReading = panelEntry(function TokensReadingBody({ sessionId }) {
  const active = useSectionFoldActive()
  const { figures, failed } = useFigures(sessionId)
  const tokens = useTokenText()
  if (!active || failed) return null
  if (figures === null) return h(Reading, null, h(Skeleton, { width: '48px' }))
  const { stats, cost } = figures
  const billed = stats.uncachedInputTokens + stats.cacheReadTokens + stats.cacheWriteTokens
  return h(Reading, null, cost ?? tokens(billed + stats.outputTokens))
})

export const OutputsReading = panelEntry(function OutputsReadingBody({ sessionId }) {
  const active = useSectionFoldActive()
  const { value } = usePanelReading(sessionId)
  if (!active || value === null || value.outputs.length === 0) return null
  return h(Reading, null, copy('sectionItems', { count: value.outputs.length }))
})
