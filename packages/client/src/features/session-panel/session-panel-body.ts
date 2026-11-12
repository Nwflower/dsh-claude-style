import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { formatCompactTokens, formatHostDuration } from '../../shared/format'
import { sessionStatsCacheHit, sessionStatsDuration, sessionStatsSpeed, sessionStatsTokens } from '../../shared/stats-format'
import { hostChatSeat } from '../../core/i18n'
import { copy } from './copy'
import { openPanelFile, openPanelSession } from './session-panel-host'
import { billingCurrency, statsCostText } from './stats-cost'
import { readPrefs, subscribePrefs } from '../../core/prefs'
import { useJobOutput, usePanelReading } from './session-panel-data'
import { contextRows } from './context-rows'
import { JobStop } from './job-stop'
import type { PanelBackground, PanelChange, PanelContext, PanelEnvironment, PanelJob, PanelOutput, PanelStats, PanelSubagent } from '@dsh-claude-style/contracts/session-panel'

const h = React.createElement

/** The conversation session whose details the rail's body reads. */
export interface PanelBodyProps {
  sessionId?: unknown
  preset: PanelPreset
  /** Whether the rail still stands; a rail on its way out keeps its words and reads nothing more. */
  active: boolean
}

/** The preset as the header's label carries it: its words, and the description the label keeps as its hint. */
export interface PanelPreset {
  label: string
  hint: string
}

/** The size every row's mark is drawn at. */
const MARK_SIZE = 16

/**
 * A file's own mark: the page and its folded corner, drawn in the rail's one
 * stroke so an output row reads in the same ink as every other row's mark.
 */
function SheetMark() {
  return h('svg', {
    width: MARK_SIZE, height: MARK_SIZE, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round',
  },
  h('path', { d: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z' }),
  h('path', { d: 'M14 3v5h5' }))
}

/** An image's own mark: a frame, a sun and the ground it holds. */
function PictureMark() {
  return h('svg', {
    width: MARK_SIZE, height: MARK_SIZE, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round',
  },
  h('rect', { x: 4, y: 4, width: 16, height: 16, rx: 2 }),
  h('circle', { cx: 9, cy: 9.5, r: 1.5 }),
  h('path', { d: 'M5 17.5 9 13l3.5 3.5L15 14l4 4' }))
}

/** What an output row wears: the frame of a picture, the sheet of everything else. */
function outputMark(kind: PanelOutput['kind']) {
  return kind === 'image' ? h(PictureMark) : h(SheetMark)
}

/**
 * The session details rail's body (D94): the sections the rail shows for the
 * conversation's session, mounted by the rail beside the chat.
 *
 * The body is one column of sections in the order a reader asks about a
 * session — where it works, what the context holds, how it ran, what it spent,
 * what it produced, what it changed, and what runs behind it. The first two
 * always appear; the figures appear once the host reports them, and the last
 * three only with something to show.
 */
export function PanelBody(props: PanelBodyProps) {
  const sessionId = typeof props.sessionId === 'string' && props.sessionId !== '' ? props.sessionId : null
  if (sessionId === null) return null
  return h(PanelView, { sessionId, preset: props.preset, active: props.active })
}

function PanelView({ sessionId, preset, active }: { sessionId: string, preset: PanelPreset, active: boolean }) {
  const { value, failed } = usePanelReading(sessionId, active)
  // A running row's clock has to move between the panel's own polls.
  const running = value !== null && hasRunningWork(value.background)
  const [, tick] = React.useState(0)
  React.useEffect(() => {
    if (!running) return undefined
    const timer = window.setInterval(() => tick(count => count + 1), 1000)
    return () => window.clearInterval(timer)
  }, [running])
  if (value === null) {
    return h('div', { className: 'dsh-claude-panel' },
      h('p', { className: 'dsh-claude-panel-note' }, copy(failed ? 'unavailable' : 'loading')))
  }
  return h('div', { className: 'dsh-claude-panel' },
    value.environment === null ? null : h(EnvironmentSection, { key: 'environment', environment: value.environment, preset }),
    h(ContextSection, { key: 'context', context: value.context }),
    value.stats === null || value.stats === undefined ? null : h(StatsSection, { key: 'stats', stats: value.stats }),
    value.stats === null || value.stats === undefined ? null : h(TokensSection, { key: 'tokens', stats: value.stats }),
    value.outputs.length === 0 ? null : h(OutputsSection, { key: 'outputs', sessionId, directory: value.environment?.directory, outputs: value.outputs }),
    value.changes.length === 0 ? null : h(ChangesSection, { key: 'changes', changes: value.changes }),
    hasBackgroundWork(value.background) ? h(BackgroundSection, { key: 'background', sessionId, background: value.background }) : null)
}

/** Each section owns a native disclosure (D94): its children stay mounted so
 * folding preserves list expansion and an opened job's output. An unchanged
 * `open` prop lets the browser keep the reader's choice across data refreshes.
 * A `folded` section starts closed, with its reading beside the heading.
 */
function Section({ title, summary, folded, children }: { title: string, summary?: React.ReactNode, folded?: boolean, children?: React.ReactNode }) {
  return h('details', { className: 'dsh-claude-panel-section', open: folded !== true },
    h('summary', { className: 'dsh-claude-panel-section-toggle' },
      h('h2', { className: 'dsh-claude-panel-heading' },
        h('span', { className: 'dsh-claude-panel-section-title' }, title),
        h('span', { className: 'dsh-claude-panel-section-chevron', 'aria-hidden': true },
          h(primitives.IconChevronRightOutlineRegular, { size: 12 })),
        summary === undefined ? null : h('span', { className: 'dsh-claude-panel-section-reading' }, summary))),
    h('div', { className: 'dsh-claude-panel-section-content' }, children))
}

/** How many rows a section or a background category shows before folding the rest behind its own control. */
const FOLD_LIMIT = 2

/**
 * One section's rows, folded after two while the reader has not asked for the
 * rest: the panel is a summary, and a long list would push every section after
 * it out of the column. A row opened in place (a job's output) folds with the
 * rows it belongs to.
 */
function FoldedList({ rows }: { rows: readonly React.ReactNode[] }) {
  const [expanded, setExpanded] = React.useState(false)
  if (rows.length <= FOLD_LIMIT) return h('div', { className: 'dsh-claude-panel-list' }, rows)
  return h('div', { className: 'dsh-claude-panel-list' },
    expanded ? rows : rows.slice(0, FOLD_LIMIT),
    h('button', {
      type: 'button',
      className: 'dsh-claude-panel-more',
      'aria-expanded': expanded,
      onClick() { setExpanded(!expanded) },
    }, expanded ? copy('showLess') : copy('showMore', { count: rows.length - FOLD_LIMIT })))
}

/**
 * One labeled group of background rows. The categories are the kinds of work
 * the host reports — commands, subagents, team — so a reader finds the row they
 * mean without reading every label; each group folds on its own.
 */
function BackgroundGroup({ title, rows }: { title: string, rows: readonly React.ReactNode[] }) {
  return h('div', { className: 'dsh-claude-panel-group' },
    h('h3', { className: 'dsh-claude-panel-group-title' }, title),
    h(FoldedList, { rows }))
}

/**
 * One row on one line: a mark, a title with its detail after it, and a trailing
 * side. The line's hint is the row's whole reading, for a title or a detail the
 * line cut short; `hint` replaces it where the row has words of its own to say.
 */
function Row(props: { mark?: React.ReactNode, title: string, detail?: string, hint?: string, kind?: string, side?: React.ReactNode, href?: string, onClick?: () => void, expanded?: boolean }) {
  const detail = props.detail === undefined || props.detail === '' ? null : props.detail
  const content = [
    props.mark === undefined ? null : h('span', { key: 'mark', className: 'dsh-claude-panel-mark', 'aria-hidden': true }, props.mark),
    h('span', { key: 'main', className: 'dsh-claude-panel-main', title: props.hint ?? (detail === null ? props.title : `${props.title} · ${detail}`) },
      h('span', { className: 'dsh-claude-panel-title' }, props.title),
      detail === null ? null : h('span', { className: 'dsh-claude-panel-detail' }, detail)),
    props.side === undefined ? null : h('span', { key: 'side', className: 'dsh-claude-panel-side' }, props.side),
  ]
  const rowClass = props.kind === undefined ? 'dsh-claude-panel-row' : `dsh-claude-panel-row ${props.kind}`
  if (props.href !== undefined) {
    return h('a', {
      className: `${rowClass} is-link`,
      href: props.href,
      target: '_blank',
      rel: 'noreferrer',
      title: props.title,
    }, content)
  }
  if (props.onClick !== undefined) {
    return h('button', {
      type: 'button',
      className: `${rowClass} is-button`,
      onClick: props.onClick,
      title: props.title,
      ...(props.expanded === undefined ? {} : { 'aria-expanded': props.expanded }),
    }, content)
  }
  return h('div', { className: rowClass }, content)
}

/** One trailing state word. */
function Chip({ text, tone }: { text: string, tone?: 'success' | 'failure' | 'pending' }) {
  return h('span', { className: tone === undefined ? 'dsh-claude-panel-chip' : `dsh-claude-panel-chip is-${tone}` }, text)
}

/** A path with the reader's home replaced by `~`. */
export function shortPath(path: string, home: string) {
  const normalized = path.replaceAll('\\', '/').replace(/\/+$/, '')
  const base = home.replaceAll('\\', '/').replace(/\/+$/, '')
  if (base === '') return normalized
  if (normalized === base) return '~'
  if (normalized.startsWith(`${base}/`)) return `~${normalized.slice(base.length)}`
  return normalized
}

/** The last segment of a `/` or `\` separated path. */
export function baseName(path: string) {
  const normalized = path.replaceAll('\\', '/').replace(/\/+$/, '')
  const index = normalized.lastIndexOf('/')
  return index === -1 ? normalized : normalized.slice(index + 1)
}

/** The folder a `/` or `\` separated path lies in; empty for a path of one segment. */
export function parentPath(path: string) {
  const normalized = path.replaceAll('\\', '/').replace(/\/+$/, '')
  const index = normalized.lastIndexOf('/')
  return index === -1 ? '' : normalized.slice(0, index)
}

/** The headline occupancy; detailed rows keep one decimal of the window. */
function sharePercent(value: number, whole: number) {
  if (whole <= 0) return '0'
  const percent = Math.max(0, Math.min(100, value / whole * 100))
  // A reading just under 100% keeps its decimal: it is not a full window.
  if (percent >= 99.95) return '100'
  return percent >= 10 && Math.round(percent) < 100 ? String(Math.round(percent)) : String(Math.round(percent * 10) / 10)
}

function pad2(value: number) {
  return value < 10 ? `0${value}` : String(value)
}

/** A duration as a clock: minutes and seconds, hours once it takes one. */
export function elapsedText(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor(total / 60) % 60
  const seconds = total % 60
  return hours > 0 ? `${hours}:${pad2(minutes)}:${pad2(seconds)}` : `${minutes}:${pad2(seconds)}`
}

/** Where the session works: the machine, the directory, and the checkouts around it. */
function EnvironmentSection({ environment, preset }: { environment: PanelEnvironment, preset: PanelPreset }) {
  const rows: React.ReactNode[] = [
    h(Row, {
      key: 'computer',
      mark: h('svg', { width: MARK_SIZE, height: MARK_SIZE, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinejoin: 'round' },
        h('rect', { x: 5, y: 3, width: 14, height: 12, rx: 2 }),
        h('path', { d: 'M5 15 2 19v1h20v-1l-3-4M2 19h20' })),
      title: copy('thisComputer'),
    }),
    h(Row, {
      key: 'directory',
      mark: h(primitives.IconFolderOpenOutlineRegular, { size: MARK_SIZE }),
      title: baseName(environment.directory),
      detail: parentPath(shortPath(environment.directory, environment.home)),
    }),
  ]
  const checkout = environment.checkout
  // A directory that is no checkout names the folder alone: the branch belongs
  // to a checkout, and a folder without one has none to show (D94).
  if (checkout !== null) {
    rows.push(h(RepositoryRow, {
      key: `checkout:${checkout.root}`,
      name: shortPath(checkout.root, environment.home) === shortPath(environment.directory, environment.home) ? undefined : baseName(checkout.root),
      branch: checkout.branch,
      linked: checkout.linked,
      detail: checkout.repository ?? undefined,
      commit: checkout.commit,
    }))
  }
  // The preset closes the section: the header's own label steps aside while the
  // rail stands, so this row is where its words and its description are read (D94).
  if (preset.label !== '') {
    rows.push(h(Row, {
      key: 'preset',
      kind: 'dsh-claude-details-preset',
      mark: h(primitives.IconAgentPresetOutlineRegular, { size: MARK_SIZE }),
      title: preset.label,
      hint: preset.hint === '' ? undefined : preset.hint,
    }))
  }
  return h(Section, { title: copy('environment'), summary: baseName(environment.directory) },
    h('div', { className: 'dsh-claude-panel-list' }, rows))
}

function RepositoryRow(props: { name?: string, branch: string | null, linked: boolean, detail?: string, commit?: string | null }) {
  // A checkout already named by the directory needs only its branch (D94).
  // Additional checkouts keep their folder row immediately above the branch.
  return h(React.Fragment, null,
    props.name === undefined ? null : h(Row, {
      mark: h(primitives.IconFolderOpenOutlineRegular, { size: MARK_SIZE }),
      title: props.name, detail: props.detail,
    }),
    h(Row, {
      mark: h(primitives.IconBranchOutlineRegular, { size: MARK_SIZE }),
      title: props.branch ?? props.commit ?? copy('detachedHead'),
      side: props.linked ? h(Chip, { text: copy('worktree') }) : undefined,
    }))
}

/** The context window's occupancy, its composition, and the room left. */
function ContextSection({ context }: { context: PanelContext | null }) {
  if (context === null) {
    return h(Section, { title: copy('context') },
      h('p', { className: 'dsh-claude-panel-note' }, copy('noContext')))
  }
  const rows = contextRows(context)
  const free = Math.max(0, context.window - context.used)
  const percent = sharePercent(context.used, context.window)
  return h(Section, {
    title: copy('context'),
    summary: h(React.Fragment, null,
      h('span', null, `${percent}%`),
      h('span', { className: 'dsh-claude-panel-context-mini', 'aria-hidden': true },
        h('span', { style: { width: `${Math.min(100, Math.max(0, context.used / context.window * 100))}%` } }))),
  },
    h('div', { className: 'dsh-claude-panel-context' },
      h('div', { className: 'dsh-claude-panel-context-head' },
        h('span', { className: 'dsh-claude-panel-percent' }, copy('contextUsedPct', { percent })),
        h('span', { className: 'dsh-claude-panel-figures' },
          `${formatCompactTokens(context.used)} / ${formatCompactTokens(context.window)}`)),
      h('div', {
        className: 'dsh-claude-panel-bar',
        role: 'img',
        'aria-label': copy('contextUsedPct', { percent }),
      }, rows.map(row => h('span', {
        key: row.kind,
        className: `dsh-claude-panel-segment is-${row.kind}`,
        style: { width: `${row.share}%` },
      }))),
      h('dl', { className: 'dsh-claude-panel-legend', title: copy('contextEstimate') },
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
          h('dd', { className: 'dsh-claude-panel-share' }, `${(free / context.window * 100).toFixed(1)}%`))),
      // The parts are estimates and the occupancy above them is the provider's
      // own reading: the legend says so once, and its hint carries the method.
      h('p', { className: 'dsh-claude-panel-caption', title: copy('contextEstimate') }, copy('contextEstimateNote'))))
}

/** One figure of a figures section: its label and its value as written. */
interface Figure {
  key: string
  label: string
  value: string
}

/** A figures section's rows: each figure gets a full row, so a long elapsed time
 * or token count keeps its value beside its label.
 */
function Figures({ rows }: { rows: readonly Figure[] }) {
  return h('dl', { className: 'dsh-claude-panel-stats' },
    rows.map(row => h('div', { key: row.key, className: 'dsh-claude-panel-stat' },
      h('dt', null, row.label),
      h('dd', null, row.value))))
}

/**
 * How the session ran (D94): its turns and steps, its speed and its time.
 *
 * The figures are written in the host's own words, through the same formatters
 * the composer's readout uses (shared/stats-format.ts): the rail is a second
 * surface of one session, not a second set of numbers. The section starts
 * folded with the output speed beside its heading, the one figure a reader
 * follows while a turn runs.
 */
function StatsSection({ stats }: { stats: PanelStats }) {
  const chat = hostChatSeat()
  const duration = (ms: number) => (chat === null ? `${Math.max(0, Math.round(ms / 1000))}s` : sessionStatsDuration(ms, chat))
  const rows: Figure[] = []
  rows.push({ key: 'turns', label: copy('statsTurns'), value: String(stats.turns) })
  rows.push({ key: 'steps', label: copy('statsSteps'), value: String(stats.steps) })
  let speedText: string | null = null
  if (stats.decodeMs > 0) {
    const speed = sessionStatsSpeed(stats.decodeTokens / (stats.decodeMs / 1000))
    speedText = chat === null ? `${speed} tok/s` : chat('message.tokensPerSecond', { tps: speed })
    rows.push({ key: 'speed', label: copy('statsOutputSpeed'), value: speedText })
  }
  if (stats.ttftSteps > 0) rows.push({ key: 'ttft', label: copy('statsFirstToken'), value: duration(stats.ttftMs / stats.ttftSteps) })
  rows.push({ key: 'model', label: copy('statsModelTime'), value: duration(stats.llmMs) })
  rows.push({ key: 'tool', label: copy('statsToolTime'), value: duration(stats.toolMs) })
  // A session with no decoded output yet has no speed: its turn count stands in.
  return h(Section, { title: copy('sessionStats'), summary: speedText ?? copy('sectionTurns', { count: stats.turns }), folded: true },
    h(Figures, { rows }))
}

/**
 * What the session spent (D94): its cost, its cache share and its token buckets.
 *
 * The section starts folded with the cost beside its heading; with billing off
 * or a model no table prices, the tokens the session moved stand in.
 */
function TokensSection({ stats }: { stats: PanelStats }) {
  const currency = useBillingCurrency()
  const chat = hostChatSeat()
  const tokens = (count: number) => (chat === null ? `${formatCompactTokens(count)} tok` : sessionStatsTokens(count, chat))
  const rows: Figure[] = []
  const cost = statsCostText(stats.cost, currency)
  if (cost !== null) rows.push({ key: 'cost', label: copy('statsCost'), value: cost })
  const billed = stats.uncachedInputTokens + stats.cacheReadTokens + stats.cacheWriteTokens
  if (billed > 0) {
    const hit = chat === null ? String(Math.round((stats.cacheReadTokens / billed) * 100)) : sessionStatsCacheHit(stats.cacheReadTokens, billed)
    if (hit !== null) rows.push({ key: 'cache', label: copy('statsCacheHit'), value: `${hit}%` })
  }
  rows.push({ key: 'uncached', label: copy('statsUncachedInput'), value: tokens(stats.uncachedInputTokens) })
  rows.push({ key: 'read', label: copy('statsCacheRead'), value: tokens(stats.cacheReadTokens) })
  rows.push({ key: 'write', label: copy('statsCacheWrite'), value: tokens(stats.cacheWriteTokens) })
  rows.push({ key: 'out', label: copy('statsOutput'), value: tokens(stats.outputTokens) })
  return h(Section, { title: copy('tokenUsage'), summary: cost ?? tokens(billed + stats.outputTokens), folded: true },
    h(Figures, { rows }))
}

/** The currency the reader's billing setting chose, followed across a settings change. */
function useBillingCurrency() {
  const [choice, setChoice] = React.useState<string | null>(() => readPrefs().billingCurrency ?? null)
  React.useEffect(() => subscribePrefs(prefs => setChoice(prefs.billingCurrency ?? null)), [])
  return billingCurrency(choice)
}

/**
 * The files the session presented or wrote.
 *
 * A row names the file and the folder it lies in. Writing is what nearly every
 * row would say, so only a file the model presented carries its word.
 */
function OutputsSection({ sessionId, directory, outputs }: { sessionId: string, directory?: string, outputs: readonly PanelOutput[] }) {
  return h(Section, { title: copy('outputs'), summary: copy('sectionItems', { count: outputs.length }) },
    h(FoldedList, { rows: outputs.map(output => h(Row, {
      key: output.path,
      mark: outputMark(output.kind),
      title: output.name,
      detail: parentPath(output.display),
      hint: output.display,
      side: output.origin === 'presented' ? h(Chip, { text: copy('presented') }) : undefined,
      onClick: () => openPanelFile(sessionId, directory, output.path),
    })) }))
}

/** The change requests bound to the session, with the status the code host last reported. */
function ChangesSection({ changes }: { changes: readonly PanelChange[] }) {
  const rows = changes.map(change => {
      const reference = [change.repository, change.number === null ? null : `#${change.number}`].filter(part => part !== null && part !== '').join(' ')
      const title = change.title ?? (reference === '' ? change.url : reference)
      const side: React.ReactNode[] = []
      if (change.draft) side.push(h(Chip, { key: 'draft', text: copy('draft') }))
      if (change.checks === 'failure') side.push(h(Chip, { key: 'checks', tone: 'failure', text: copy('checksFailing', { count: change.failing }) }))
      else if (change.checks === 'pending') side.push(h(Chip, { key: 'checks', tone: 'pending', text: copy('checksPending') }))
      else if (change.checks === 'success') side.push(h(Chip, { key: 'checks', tone: 'success', text: copy('checksPassing') }))
      if (change.state === 'merged') side.push(h(Chip, { key: 'state', text: copy('merged') }))
      else if (change.state === 'closed') side.push(h(Chip, { key: 'state', text: copy('closed') }))
      return h(Row, {
        key: change.url,
        mark: h(primitives.IconBranchOutlineRegular, { size: MARK_SIZE }),
        title,
        detail: change.title === null || reference === '' ? undefined : reference,
        side: side.length === 0 ? undefined : side,
        href: change.url,
      })
  })
  return h(Section, { title: copy('changes'), summary: copy('sectionItems', { count: changes.length }) }, h(FoldedList, { rows }))
}

/** Whether any background row is still moving. */
function hasRunningWork(background: PanelBackground) {
  if (background.jobs.some(job => job.status === 'running' || job.status === 'stopping')) return true
  if (background.subagents.some(child => child.running === true)) return true
  return (background.team?.members ?? []).some(member => member.running === true)
}

/** Whether any background row exists at all. */
function hasBackgroundWork(background: PanelBackground) {
  if (background.jobs.length > 0 || background.subagents.length > 0) return true
  const team = background.team
  return team !== null && (team.members.length > 0 || team.tasks.length > 0)
}

/**
 * The word a job row still needs: one running, stopping or failed. A finished
 * command is what most rows are, and it says so with its clock stopping; a word
 * on every row would make the state the row's loudest part (D94).
 */
function jobStatusText(status: string) {
  if (status === 'running') return copy('running')
  if (status === 'stopping') return copy('stopping')
  if (status === 'failed') return copy('failed')
  return null
}

/** One job's clock: how long it ran, or how long it has been running. */
function jobElapsed(startedAt: number, finishedAt: number | undefined, now: number) {
  if (startedAt <= 0) return ''
  return elapsedText((finishedAt ?? now) - startedAt)
}

/** A clock the host's own chat surfaces write: minutes from the first minute, hours from the first hour. */
function hostDuration(ms: number) {
  const seat = hostChatSeat()
  return seat === null ? `${Math.max(0, Math.round(ms / 1000))}s` : formatHostDuration(ms, seat)
}

/** One job's clock: how long it ran, or how long it has been running. */
function jobDuration(job: PanelJob, now: number) {
  if (job.startedAt <= 0) return ''
  return hostDuration((job.finishedAt ?? now) - job.startedAt)
}

/**
 * One child's clock: the turns it closed plus the open one.
 *
 * A finished child's figure stands still; only a child with a turn open at the
 * reading moves, because only then is `activeSince` carried.
 */
function childDuration(child: PanelSubagent, now: number) {
  const total = child.settledMs + (child.running && child.activeSince !== null ? Math.max(0, now - child.activeSince) : 0)
  return total <= 0 ? '' : hostDuration(total)
}

/** What a child row's second line carries: its clock and its tokens. */
function childDetail(child: PanelSubagent, now: number) {
  const parts = [childDuration(child, now)]
  if (child.tokens > 0) parts.push(`${formatCompactTokens(child.tokens)} tok`)
  return parts.filter(part => part !== '').join(' · ')
}

/** A child's own state words, in the order the host's subagent panel shows them.
 * A child that has finished keeps its clock alone, like a finished command (D94). */
function childChips(child: PanelSubagent) {
  const chips: React.ReactNode[] = []
  if (child.running) chips.push(h(Chip, { key: 'state', tone: 'pending', text: copy('running') }))
  if (child.mode === 'continuable') chips.push(h(Chip, { key: 'mode', text: copy('continuable') }))
  return chips.length === 0 ? undefined : chips
}

/** A team member's state word. */
function memberStatusText(running: boolean | null) {
  if (running === true) return copy('running')
  if (running === false) return copy('idle')
  return copy('finished')
}

/**
 * One job's retained output, read when the reader opens its row.
 * @param props.sessionId - the session that owns the job.
 * @param props.jobId - the job whose output is shown.
 * @returns the output block, or the reason there is none.
 */
function JobOutput({ sessionId, jobId }: { sessionId: string, jobId: string }) {
  const reading = useJobOutput(sessionId, jobId)
  const text = reading.loading ? copy('loading') : reading.failed ? copy('unavailable') : reading.text === null || reading.text === '' ? copy('noOutput') : reading.text
  return h('pre', { className: 'dsh-claude-panel-job-output' }, text)
}

/** What runs behind the conversation. */
function BackgroundSection({ sessionId, background }: { sessionId: string, background: PanelBackground }) {
  const now = Date.now()
  const [expandedJob, setExpandedJob] = React.useState<string | null>(null)
  const jobRows: React.ReactNode[] = []
  const childRows: React.ReactNode[] = []
  const teamRows: React.ReactNode[] = []
  // The host answers newest first (running work included); the rail keeps that order.
  const jobs = background.jobs
  for (const job of jobs) {
    const expanded = expandedJob === job.id
    const status = jobStatusText(job.status)
    // A command that finished keeps its clock and drops the exit code: the code
    // is what the reader opens the row for when it is not zero.
    const settled = status === null
    jobRows.push(h(React.Fragment, { key: `job:${job.id}` },
      h('div', { className: 'dsh-claude-panel-job-line' }, h(Row, {
        mark: h(primitives.IconCodeOutlineRegular, { size: MARK_SIZE }),
        title: job.label === '' ? copy('jobs') : job.label,
        // The clock leads: it is the part a detail cut short still has to show.
        detail: [jobDuration(job, now), settled ? null : job.detail, job.progress].filter(part => part !== undefined && part !== null && part !== '').join(' · '),
        side: status === null ? undefined : h(Chip, { text: status, tone: job.status === 'failed' ? 'failure' : 'pending' }),
        expanded,
        onClick() { setExpandedJob(expanded ? null : job.id) },
      }), h(JobStop, { sessionId, jobId: job.id, label: job.label === '' ? copy('jobs') : job.label, status: job.status })),
      expanded ? h(JobOutput, { key: 'output', sessionId, jobId: job.id }) : null))
  }
  for (const child of background.subagents) {
    childRows.push(h('div', { key: `subagent:${child.id}`, className: 'dsh-claude-panel-job-line' }, h(Row, {
      mark: h(primitives.IconAgentPresetOutlineRegular, { size: MARK_SIZE }),
      title: child.label === '' ? copy('subagents') : child.label,
      detail: childDetail(child, now),
      side: childChips(child),
      onClick() { openPanelSession(child.id) },
    }), child.mode === 'continuable' && child.running ? h(JobStop, {
      key: child.activeSince,
      sessionId, jobId: child.id, label: child.label === '' ? copy('subagents') : child.label, status: 'running', subagent: true,
    }) : null))
  }
  const team = background.team
  if (team !== null) {
    for (const member of team.members) {
      teamRows.push(h(Row, {
        key: `member:${member.id}`,
        mark: h(primitives.IconUsersOutlineRegular, { size: MARK_SIZE }),
        title: member.role === 'lead' ? `${member.name} · ${copy('team')}` : member.name,
        detail: member.phase,
        side: h(Chip, { text: memberStatusText(member.running), tone: member.running === true ? 'pending' : undefined }),
        onClick() { openPanelSession(member.id) },
      }))
    }
    for (const task of team.tasks) {
      teamRows.push(h(Row, {
        key: `task:${task.id}`,
        mark: h(primitives.IconChecklistOutlineRegular, { size: MARK_SIZE }),
        title: task.subject,
        detail: task.ownerName ?? copy('tasks'),
        side: h(Chip, { text: task.status, tone: task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'pending' : undefined }),
      }))
    }
  }
  return h(Section, { title: copy('background'), summary: copy('sectionItems', { count: jobRows.length + childRows.length + teamRows.length }) },
    jobRows.length === 0 ? null : h(BackgroundGroup, { key: 'jobs', title: copy('jobs'), rows: jobRows }),
    childRows.length === 0 ? null : h(BackgroundGroup, { key: 'subagents', title: copy('subagents'), rows: childRows }),
    teamRows.length === 0 ? null : h(BackgroundGroup, { key: 'team', title: copy('team'), rows: teamRows }))
}
