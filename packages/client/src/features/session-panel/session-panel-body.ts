import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { formatCompactTokens } from '../../shared/format'
import { sessionStatsCacheHit, sessionStatsDuration, sessionStatsSpeed, sessionStatsTokens } from '../../shared/stats-format'
import { hostChatSeat } from '../../core/i18n'
import { copy } from './copy'
import { openPanelFile } from './session-panel-host'
import { billingCurrency, statsCostText } from './stats-cost'
import { readPrefs, subscribePrefs } from '../../core/prefs'
import { usePanelReading, useLiveOccupancy } from './session-panel-data'
import { panelFiguresOf } from './session-panel-figures'
import { useLiveFigures } from './session-panel-live'
import { contextRows, contextOverview } from './context-rows'
import type { ContextOccupancy, ContextOverview, ContextRow } from './context-rows'
import { compactOffer, requestCompaction } from './compact-offer'
import type { CompactOffer } from './compact-offer'
import type { CompactionFailure } from '@dsh-claude-style/contracts/compaction'
import { Row, Chip, Section, FoldedList } from './panel-rows'
import { hasRunningWork, WorkSections } from './session-panel-work'
import type { PanelChange, PanelContext, PanelEnvironment, PanelOutput, PanelStats } from '@dsh-claude-style/contracts/session-panel'

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
 * what it produced, what it changed, and its processes, tasks, subagents and
 * team. The first two always appear; figures need a host reading, and work
 * sections appear only with something to show.
 */
export function PanelBody(props: PanelBodyProps) {
  const sessionId = typeof props.sessionId === 'string' && props.sessionId !== '' ? props.sessionId : null
  if (sessionId === null) return null
  return h(PanelView, { sessionId, preset: props.preset, active: props.active })
}

function PanelView({ sessionId, preset, active }: { sessionId: string, preset: PanelPreset, active: boolean }) {
  const { value, failed } = usePanelReading(sessionId, active)
  // The two figures tables print the statistics feature's live reading — the one
  // the composer's line prints — so the numbers beside the chat move with the
  // numbers under it instead of one settlement behind them (D94).
  const live = useLiveFigures(sessionId)
  // The occupancy is a projection frame, so the context section can state its
  // overview on the frame the rail mounts; its breakdown is the route's fold and
  // takes its place when that answers (D94).
  const occupancy = useLiveOccupancy(sessionId)
  const currency = useBillingCurrency()
  // A running row's clock has to move between the panel's own polls.
  const running = value !== null && hasRunningWork(value.background)
  const [, tick] = React.useState(0)
  React.useEffect(() => {
    if (!running) return undefined
    const timer = window.setInterval(() => tick(count => count + 1), 1000)
    return () => window.clearInterval(timer)
  }, [running])
  if (value === null) {
    // The first frame carries what the page already knows: the context overview.
    // The sections that need the host's fold join it when that answers, so the
    // rail never stands as one loading line (D94).
    return h('div', { className: 'dsh-claude-panel' },
      failed
        ? h('p', { className: 'dsh-claude-panel-note' }, copy('unavailable'))
        : h(ContextSection, { key: 'context', sessionId, context: null, occupancy }))
  }
  const settled = value.stats ?? null
  const figures = live !== null
    ? panelFiguresOf(live, settled)
    : settled === null ? null : { stats: settled, cost: statsCostText(settled.cost, currency) }
  return h('div', { className: 'dsh-claude-panel' },
    value.environment === null ? null : h(EnvironmentSection, { key: 'environment', environment: value.environment, preset }),
    h(ContextSection, { key: 'context', sessionId, context: value.context, occupancy }),
    figures === null ? null : h(StatsSection, { key: 'stats', stats: figures.stats }),
    figures === null ? null : h(TokensSection, { key: 'tokens', stats: figures.stats, cost: figures.cost }),
    value.outputs.length === 0 ? null : h(OutputsSection, { key: 'outputs', sessionId, directory: value.environment?.directory, outputs: value.outputs }),
    value.changes.length === 0 ? null : h(ChangesSection, { key: 'changes', changes: value.changes }),
    h(WorkSections, { key: 'work', sessionId, background: value.background }))
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

/**
 * The context window's occupancy, its composition, and the room left.
 *
 * The overview is the provider's own reading, so it stands on the frame the rail
 * mounts; the composition is the host's fold, and while that has not answered
 * the section states the overview alone with the breakdown's own line under it (D94).
 * Once the session stands near the host's own compaction threshold, the section
 * offers the manual request beside the distance to it (D100).
 */
function ContextSection({ sessionId, context, occupancy }: { sessionId: string, context: PanelContext | null, occupancy: ContextOccupancy | null }) {
  const overview = contextOverview(occupancy, context)
  if (overview === null) {
    return h(Section, { title: copy('context') },
      h('p', { className: 'dsh-claude-panel-note' }, copy(context === null ? 'loading' : 'noContext')))
  }
  const percent = sharePercent(overview.used, overview.window)
  const rows = context === null ? null : contextRows({ ...context, used: overview.used, window: overview.window })
  const offer = compactOffer(context, overview)
  return h(Section, {
    title: copy('context'),
    summary: h(React.Fragment, null,
      h('span', null, `${percent}%`),
      h('span', { className: 'dsh-claude-panel-context-mini', 'aria-hidden': true },
        h('span', { style: { width: `${Math.min(100, overview.used / overview.window * 100)}%` } }))),
  },
    h('div', { className: 'dsh-claude-panel-context' },
      h('div', { className: 'dsh-claude-panel-context-head' },
        h('span', { className: 'dsh-claude-panel-percent' }, copy('contextUsedPct', { percent })),
        h('span', { className: 'dsh-claude-panel-figures' },
          `${formatCompactTokens(overview.used)} / ${formatCompactTokens(overview.window)}`)),
      contextBar(overview, rows),
      contextLegend(rows, overview)),
    offer === null ? null : h(CompactControl, { key: 'compact', sessionId, offer }))
}

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
  // The host's own outlined control carries its height, corners, hover, focus and
  // disabled states; the row only places it.
  const action = phase.state === 'done'
    ? h('span', { className: 'dsh-claude-panel-compact-note', title: phase.text }, copy('compactDone'))
    : h(primitives.Button, {
      variant: 'outline',
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

/** What a failed request says: the reason the rail can name, or the attempt itself. */
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

/**
 * The parts' legend and the room left, or the breakdown's own line until the
 * host's fold answers: the occupancy above is already the provider's own reading.
 * The legend's hint carries how the parts are priced.
 */
function contextLegend(rows: ContextRow[] | null, overview: ContextOverview) {
  if (rows === null) return h('p', { className: 'dsh-claude-panel-note' }, copy('contextBreakdownLoading'))
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
function TokensSection({ stats, cost }: { stats: PanelStats, cost: string | null }) {
  const chat = hostChatSeat()
  const tokens = (count: number) => (chat === null ? `${formatCompactTokens(count)} tok` : sessionStatsTokens(count, chat))
  const rows: Figure[] = []
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
      hint: output.path,
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
