import { copyLabel } from '../../core/i18n'
import { sessionStatsCacheHit, sessionStatsDuration, sessionStatsSpeed, sessionStatsTokens } from './stats-format'
import type { HostText } from '../../core/host'
import type { HostSessionStatsProjection, HostTokenUsageProjection } from '@dsh-claude-style/contracts/services'

/**
 * The block's rows and sections: the host's own row rules
 * over the two projections, with no knowledge of the panel they land in.
 */

/** One row of the block: a label and its figure. */
interface StatsRow {
  label: string
  value: string
}

/** One projection's current whole value, or undefined while it is absent. */
export type StatsValueReader = <Value>(key: string) => Value | undefined

/**
 * The time and throughput rows, in both widths: the host's own 模型用时
 * and 工具调用用时 while the row is detailed, their sum under the skin's
 * 总用时 while it is compact (the host has no single figure for the time
 * a session has taken). The first-token average and the output speed are
 * the same two rows either way.
 */
function statsTimeRows(stats: HostSessionStatsProjection, chat: HostText, compact: boolean) {
  const rows: StatsRow[] = []
  if (compact) {
    const totalMs = (stats.llmMs > 0 ? stats.llmMs : 0) + (stats.toolMs > 0 ? stats.toolMs : 0)
    if (totalMs > 0) {
      rows.push({ label: copyLabel('contextTotalTime', 'Total time'), value: sessionStatsDuration(totalMs, chat) })
    }
  } else {
    if (stats.llmMs > 0) rows.push({ label: chat('stats.dialog.llmTime'), value: sessionStatsDuration(stats.llmMs, chat) })
    if (stats.toolMs > 0) rows.push({ label: chat('stats.dialog.toolTime'), value: sessionStatsDuration(stats.toolMs, chat) })
  }
  if (stats.ttftSteps > 0) rows.push({ label: chat('stats.dialog.ttft'), value: sessionStatsDuration(stats.ttftMs / stats.ttftSteps, chat) })
  if (stats.decodeMs > 0) {
    rows.push({
      label: chat('stats.dialog.speed'),
      value: chat('message.tokensPerSecond', { tps: sessionStatsSpeed(stats.decodeTokens / (stats.decodeMs / 1_000)) }),
    })
  }
  return rows
}

/**
 * The block's sections, with the host's own row rules: a row appears
 * only when its input exists, so a session without tool time or without
 * a recorded first token shows fewer rows rather than zeros, and a
 * session that never billed shows no usage section.
 *
 * `compact` follows the host's statistics row: its compact form carries
 * the output speed and the cache-hit share on the composer line and
 * nothing else, so the usage section keeps only the cache-hit row — the
 * four figures a reader who chose that row still wants.
 *
 * @param read - one projection's current whole value.
 * @param chat - the host's `chat` translate seat.
 * @param compact - whether the host rendered its compact statistics row.
 */
export function sessionStatsSections(read: StatsValueReader, chat: HostText, compact: boolean) {
  const sections: { title: string, rows: StatsRow[] }[] = []
  const stats = read<HostSessionStatsProjection>('sessionStats')
  if (compact) {
    const rows: StatsRow[] = []
    if (stats !== undefined && stats !== null) {
      const timeRows = statsTimeRows(stats, chat, true)
      for (let i = 0; i < timeRows.length; i++) rows.push(timeRows[i])
    }
    const usage = read<HostTokenUsageProjection>('tokenUsage')
    if (usage !== undefined && usage !== null) {
      const billed = usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
      if (billed > 0 || usage.outputTokens > 0) {
        const hit = sessionStatsCacheHit(usage.cacheReadTokens, billed)
        if (hit !== null) rows.push({ label: chat('message.turnUsage.cacheHit'), value: `${hit}%` })
      }
    }
    if (rows.length > 0) sections.push({ title: '', rows })
    return sections
  }
  if (stats !== undefined && stats !== null) {
    const rows = statsTimeRows(stats, chat, false)
    if (rows.length > 0) sections.push({ title: chat('stats.dialog.title'), rows })
  }
  const usage = read<HostTokenUsageProjection>('tokenUsage')
  if (usage !== undefined && usage !== null) {
    const billed = usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
    if (billed > 0 || usage.outputTokens > 0) {
      const rows: StatsRow[] = []
      const hit = sessionStatsCacheHit(usage.cacheReadTokens, billed)
      if (hit !== null) rows.push({ label: chat('message.turnUsage.cacheHit'), value: `${hit}%` })
      rows.push({ label: chat('message.turnUsage.input'), value: sessionStatsTokens(usage.uncachedInputTokens, chat) })
      rows.push({ label: chat('message.turnUsage.cacheRead'), value: sessionStatsTokens(usage.cacheReadTokens, chat) })
      if (usage.cacheWriteTokens !== 0) {
        rows.push({ label: chat('message.turnUsage.cacheWrite'), value: sessionStatsTokens(usage.cacheWriteTokens, chat) })
      }
      rows.push({ label: chat('message.turnUsage.output'), value: sessionStatsTokens(usage.outputTokens, chat) })
      if (rows.length > 0) sections.push({ title: chat('stats.dialog.usageTitle'), rows })
    }
  }
  return sections
}
