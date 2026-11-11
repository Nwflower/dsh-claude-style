import { HOME_SESSION_SCOPE_WORKSPACE, USAGE_ROUTE } from '../../constants'
import { readPrefs } from '../../core/prefs'
import { pad2 } from '../../shared/format'
import { notifyAll } from '@dsh-claude-style/engine/notify'
import { currentSessionId, hostRemoteSession, hostSessions, hostWorkspaces } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { HostRemoteListAnswer, HostSessionRow } from '@dsh-claude-style/contracts/services'
import type { UsageAnswer, UsageReport } from '@dsh-claude-style/contracts/usage'
import { homeRefreshDue } from './usage-refresh'
import type { HomeRefreshReason } from './usage-refresh'

/**
 * The roll-up store's snapshot: the route's last answer (the host half's
 * usage fold, packages/host/src/usage-fold.ts), whether more is coming, and why not.
 */
export interface HomeUsageState {
  value: UsageReport | null
  computing: boolean
  error: string | null
  loading: boolean
  /** When this page last heard from the route, on the page's clock; null before the first answer. */
  answeredAt: number | null
}

/** One model's share in the session list's roll-up. */
export interface ListedModel {
  id: string
  tokens: number
  sessions: number
  lastAt: number
}

/** The session list's roll-up (summarizeSessionList). */
export interface ListSummary {
  tokens: number
  sessions: number
  activeDays: number
  model: string | null
  models: ListedModel[]
  days: { date: string, total: number }[]
  entries: { at: number, tokens: number, model: string | null }[]
}

/** Where the roll-up lands while the host half is still folding. */
export const HOME_POLL_MS = 800
/** Stop waiting after this many cold-fold polls; the next read starts over. */
export const HOME_POLL_MAX = 180

/** A local calendar day, matching the host half's day keys. */
export function homeDayKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/**
 * The usage roll-up store. The route answers immediately while a cold fold polls;
 * the session list is a coarser fallback, so the panel names its source.
 */
export function createHomeUsage(ctx: HostContext) {
  /** What the panel draws: the last answer, whether more is coming, and why not. */
  const usage: HomeUsageState = { value: null, computing: false, error: null, loading: false, answeredAt: null }
  let listSummary: ListSummary | null = null
  let listLoading = false
  const listeners: (() => void)[] = []
  let pollTimer: ReturnType<typeof setTimeout> | null = null
  /** Polls this read has made; reset by each ask (loadUsage). */
  let polls = 0
  let disposed = false
  let requestSerial = 0
  let target = { scope: readPrefs().homeSessionScope, workspace: '' }

  /** The current blank's Workspace, falling back to the most recently active one. */
  function currentWorkspaceId() {
    const service = hostWorkspaces(ctx)
    if (service === null) return ''
    const snapshot = service.list.getSnapshot()
    if (!Array.isArray(snapshot.items)) return ''
    const current = currentSessionId(ctx)
    if (current !== null) {
      const owned = snapshot.items.find((workspace) => workspace.sessionIds.includes(current))
      if (owned !== undefined) return owned.workspaceId
    }
    const sessions = hostSessions(ctx)?.list.getSnapshot()
    const archived = new Set(snapshot.archivedSessionIds)
    let newest = -1
    let selected = ''
    for (const workspace of snapshot.items) {
      for (const id of workspace.sessionIds) {
        if (archived.has(id)) continue
        const updatedAt = sessions?.byId[id]?.updatedAt ?? 0
        if (updatedAt > newest) {
          newest = updatedAt
          selected = workspace.workspaceId
        }
      }
    }
    return selected
  }

  function emit() {
    notifyAll(listeners)
  }

  function subscribe(listener: () => void) {
    listeners.push(listener)
    return () => {
      const index = listeners.indexOf(listener)
      if (index !== -1) listeners.splice(index, 1)
    }
  }

  function stopPolling() {
    if (pollTimer !== null) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  /**
   * Read the roll-up once. `computing` schedules a poll; exhausted polls leave the
   * panel on its current data until the next ask. The next ask starts the
   * count over.
   *
   * @param force - read even though numbers are on show and nothing is folding.
   */
  function syncTarget() {
    const scope = readPrefs().homeSessionScope
    const workspace = scope === HOME_SESSION_SCOPE_WORKSPACE ? currentWorkspaceId() : ''
    if (target.scope === scope && target.workspace === workspace) return
    target = { scope, workspace }
    requestSerial += 1
    stopPolling()
    usage.value = null
    usage.computing = false
    usage.error = null
    usage.loading = false
    usage.answeredAt = null
    emit()
  }

  function loadUsage(force?: boolean) {
    syncTarget()
    if (disposed || usage.loading) return
    if (!force && usage.value !== null && !usage.computing) return
    // Each ask is its own count: a fold behind a cold start may take minutes,
    // and a limit carried across asks would spend the whole budget on the first.
    polls = 0
    read()
  }

  /** One request to the route, and the poll its answer asks for while the host half is folding. */
  function read() {
    usage.loading = true
    const serial = requestSerial
    const params = new URLSearchParams({ scope: target.scope })
    if (target.workspace !== '') params.set('workspace', target.workspace)
    const request = fetch(USAGE_ROUTE + '?' + params.toString(), { credentials: 'same-origin', headers: { accept: 'application/json' } })
    request.then(response => response !== null && response.ok === true ? response.json() : null).then((body: UsageAnswer | null) => {
      if (disposed || serial !== requestSerial) return
      usage.loading = false
      // A route that refused still answered: the next ask waits out the same
      // period instead of retrying on every pass.
      usage.answeredAt = Date.now()
      if (body === null || body.ok !== true) {
        usage.error = 'unavailable'
        emit()
        return
      }
      usage.value = body.value === undefined ? null : body.value
      usage.computing = body.computing === true
      usage.error = body.error === undefined ? null : body.error
      emit()
      if (usage.computing) {
        if (polls >= HOME_POLL_MAX) return
        polls += 1
        stopPolling()
        pollTimer = setTimeout(() => {
          pollTimer = null
          read()
        }, HOME_POLL_MS)
      }
    // A failed usage fetch is the panel's "unavailable" state, not an exception: the panel renders without the numbers (D12).
    }).catch(() => {
      if (disposed || serial !== requestSerial) return
      usage.loading = false
      usage.answeredAt = Date.now()
      usage.error = 'unavailable'
      emit()
    })
  }

/**
 * Refresh stale figures for a tick or wake (usage-refresh.ts). A pending poll
 * keeps the read in flight; exhausted polls let the next period ask again.
 */
  function refreshUsage(reason: HomeRefreshReason) {
    if (disposed) return false
    const due = homeRefreshDue(Date.now(), { answeredAt: usage.answeredAt, busy: usage.loading || pollTimer !== null }, reason)
    if (!due) return false
    loadUsage(true)
    return true
  }

  /**
   * Sum the list rows' usage projections as the fallback source. A session's
   * whole total lands on its last-activity day because the list has no split.
   */
  function summarizeSessionList(rows: HostSessionRow[]): ListSummary {
    let tokens = 0
    const dayCount: Record<string, boolean> = {}
    const byDay: Record<string, number> = {}
    const byModel: Record<string, { tokens: number, sessions: number, lastAt: number }> = {}
    const entries: ListSummary['entries'] = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const values = row !== null && row !== undefined && row.projections !== undefined && row.projections !== null
        ? row.projections.values
        : null
      if (values === null || values === undefined) continue
      const meta = values.sessionListMetadata
      if (meta !== null && meta !== undefined && meta.blank === true) continue
      const bucket = values.tokenUsage
      const total = bucket === null || bucket === undefined ? 0
        : (bucket.uncachedInputTokens || 0) + (bucket.outputTokens || 0)
          + (bucket.cacheReadTokens || 0) + (bucket.cacheWriteTokens || 0)
      tokens += total
      const at = meta !== null && meta !== undefined && typeof meta.lastPromptAt === 'number'
        ? meta.lastPromptAt
        : row.updatedAt
      const selection = values.modelSelection
      const picked = selection !== null && selection !== undefined ? (selection.next || selection.lastUsed) : null
      const id = picked !== null && picked !== undefined && typeof picked.model === 'string' ? picked.model : null
      entries.push({ at: typeof at === 'number' ? at : 0, tokens: total, model: id })
      if (typeof at === 'number') {
        const day = homeDayKey(new Date(at))
        dayCount[day] = true
        byDay[day] = (byDay[day] || 0) + total
      }
      if (id !== null) {
        let cell = byModel[id]
        if (cell === undefined) {
          cell = { tokens: 0, sessions: 0, lastAt: 0 }
          byModel[id] = cell
        }
        cell.tokens += total
        cell.sessions += 1
        if (typeof at === 'number' && at > cell.lastAt) cell.lastAt = at
      }
    }
    let favorite: string | null = null
    let best = 0
    const models: ListedModel[] = []
    for (const name in byModel) {
      models.push({ id: name, tokens: byModel[name].tokens, sessions: byModel[name].sessions, lastAt: byModel[name].lastAt })
      if (byModel[name].sessions > best) {
        best = byModel[name].sessions
        favorite = name
      }
    }
    models.sort((left, right) => right.tokens - left.tokens)
    const days: ListSummary['days'] = []
    for (const date in byDay) days.push({ date, total: byDay[date] })
    return { tokens, sessions: entries.length, activeDays: Object.keys(dayCount).length, model: favorite, models, days, entries }
  }

  /** Read the session list once; a host without the remote service keeps the route's answer. */
  function loadSessionSummary() {
    if (disposed || listLoading || listSummary !== null) return
    const sessions = hostRemoteSession(ctx)
    if (sessions === undefined || sessions === null || typeof sessions.list !== 'function') return
    listLoading = true
    sessions.list({}).then((result: HostRemoteListAnswer) => {
      listLoading = false
      if (disposed) return
      const items = result !== null && result !== undefined && result.ok === true
        && result.value !== null && result.value !== undefined && Array.isArray(result.value.items)
        ? result.value.items
        : null
      if (items === null) return
      listSummary = summarizeSessionList(items)
      emit()
    // The roll-up is a summary the panel can do without: a failed fetch just ends the loading mark (D12).
    }).catch(() => {
      listLoading = false
    })
  }

  return {
    state() { return usage },
    list() { return listSummary },
    listLoading() { return listLoading },
    subscribe,
    /** Ask every view to re-render; a state change outside the store uses it. */
    notify: emit,
    load: loadUsage,
    refresh: refreshUsage,
    loadList: loadSessionSummary,
    stop() {
      disposed = true
      requestSerial += 1
      stopPolling()
      listeners.length = 0
    },
  }
}
