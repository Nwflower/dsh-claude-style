import { buildElement } from '@dsh-claude-style/engine/dom'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { TRASH_ICON_SYMBOL, UNARCHIVE_ICON_SYMBOL } from '@dsh-claude-style/contracts/dom'
import type { HostSessionSummary, HostSessionsService, HostWorkspacesService } from '@dsh-claude-style/contracts/services'
import { copy } from './copy'

/** How many archived conversations one page carries; the next page appends when the reader reaches the foot. */
export const ARCHIVED_PAGE_SIZE = 30

/**
 * The archived conversations the host's own filter would show: the archive
 * set's ids that still carry a live summary in the session list, newest first.
 * The host's own tree prunes by the full list the same way (a deleted session's
 * stale summary leaves when the baseline is re-pulled), and orders its rows by
 * when they last moved; both come from the host's snapshots, so the skin's list
 * and the host's filter never disagree about what 已归档 holds.
 */
export function archivedOrder(archivedIds: readonly string[], byId: Record<string, HostSessionSummary>, current?: string | null): string[] {
  const out: string[] = []
  for (let i = 0; i < archivedIds.length; i++) {
    const id = archivedIds[i]
    const summary = byId[id]
    if (summary === undefined || summary.origin === 'subagent' || (summary.blank === true && id !== current)) continue
    out.push(id)
  }
  out.sort((a, b) => (byId[b].updatedAt - byId[a].updatedAt) || (a < b ? -1 : a > b ? 1 : 0))
  return out
}

/** The host services the list reads; both are acquired once the host's registration stands. */
export interface ArchivedListHost {
  workspaces(): HostWorkspacesService | null
  sessions(): HostSessionsService | null
}

/** The host actions one row takes; each is the host's own, checked at the call. */
export interface ArchivedListActions {
  /** Open one conversation the host's own way (uiWorkspace.openSession). */
  open(id: string): void
  /** Take one conversation out of the archive (workspaces.unarchiveSession). */
  unarchive(id: string): void
  /** Delete one stored conversation through the host half's route, then re-pull the baseline. */
  remove(id: string): void
}

export interface ArchivedListDeps {
  host: ArchivedListHost
  actions: ArchivedListActions
  /** Ask for a pass (the scheduler's), so a snapshot change re-renders in the write phase (D40). */
  schedule(): void
}

/**
 * One row action's glyph, borrowed from the host's own icon sprite: the host's
 * row actions draw these symbols at 14px, so the archived page's buttons keep
 * the weight of the icons beside them (contracts/dom.ts names the two).
 */
function iconSvg(symbol: string) {
  return `<svg width="14" height="14" aria-hidden="true"><use href="#${symbol}"></use></svg>`
}
/** The delete entry's glyph: the host's own trash icon. */
const DELETE_SVG = iconSvg(TRASH_ICON_SYMBOL)
/** The unarchive entry's glyph: the host's own unarchive icon. */
const UNARCHIVE_SVG = iconSvg(UNARCHIVE_ICON_SYMBOL)

/** One row's own classes, read by workspace.css. */
const ROW_CLASS = 'dsh-claude-ws-archived-row'
const UNARCHIVE_CLASS = 'dsh-claude-ws-archived-unarchive'
const DELETE_CLASS = 'dsh-claude-ws-archived-delete'

export interface ArchivedList {
  /** Seat the list in the section root at the first page; re-entering 已归档 starts over at the top. */
  mount(root: Element): void
  /** Take the list off the page; the host's tree is back where the segment left it. */
  unmount(): void
  /** Whether the list stands in the section. */
  mounted(): boolean
  /** Re-read the host snapshots and re-render when what the page shows moved. */
  sync(): void
  /** Re-render against the copy's current language. */
  copyChanged(): void
  /** Release the snapshot subscriptions with the feature. */
  dispose(): void
}

/** How close to the foot the next page stands ready, in pixels of the scroll room. */
const APPEND_THRESHOLD_PX = 48

/** Whether the page stands within the threshold of the scroll room's foot. */
function nearBottom(element: HTMLElement): boolean {
  let node: HTMLElement | null = element
  while (node !== null) {
    const overflow = getComputedStyle(node).overflowY
    if ((overflow === 'auto' || overflow === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node.scrollTop + node.clientHeight >= node.scrollHeight - APPEND_THRESHOLD_PX
    }
    node = node.parentElement
  }
  const page = document.documentElement
  return window.innerHeight + window.scrollY >= page.scrollHeight - APPEND_THRESHOLD_PX
}

/**
 * The 已归档 segment's own list, rendered by the skin in plain DOM — the skin's
 * self-drawn surfaces are plain nodes, and the stand-in host's React is inert
 * by design. One page of ARCHIVED_PAGE_SIZE rows stands first and the reader's
 * scroll to the foot appends the next; the empty archive says so in the
 * section's own room. Rows are reconciled against the host's snapshots, so a
 * delete, an unarchive or a refresh drops its row without a reload.
 */
export function createArchivedList(deps: ArchivedListDeps): ArchivedList {
  let container: HTMLElement | null = null
  /** The rows the container holds, by session id; re-used across renders, moved into order. */
  const rows = new Map<string, HTMLElement>()
  /** The empty archive's own line, mounted only while the archive answers nothing. */
  let emptyLine: HTMLElement | null = null
  /** How many rows the page currently carries; the first page is ARCHIVED_PAGE_SIZE. */
  let cursor = ARCHIVED_PAGE_SIZE
  /** What the last render answered; unchanged snapshots write nothing. */
  let signature = ''
  /** The freshest reading, what append and render draw from. */
  let latest = { order: [] as string[], byId: {} as Record<string, HostSessionSummary>, sig: '' }
  /** One queued append per frame: a scroll storm at the foot adds one page, not many. */
  let cancelAppend: (() => void) | null = null
  /** The snapshot subscriptions, taken once both services stand. */
  let stopSources: (() => void) | null = null

  function read() {
    const workspaces = deps.host.workspaces()
    const sessions = deps.host.sessions()
    const archived = workspaces?.list.getSnapshot().archivedSessionIds ?? []
    const snapshot = sessions?.list.getSnapshot()
    const byId = snapshot?.byId ?? {}
    const current = snapshot?.current
    const order = archivedOrder(archived, byId, current)
    const sig = JSON.stringify([current, order.map((id) => [id, byId[id].updatedAt, byId[id].displayTitle])])
    return { order, byId, sig }
  }

  /** Keep both row actions readable in the copy's current language, including on a reused row. */
  function syncActionCopy(row: HTMLElement) {
    const unarchive = row.querySelector(`.${UNARCHIVE_CLASS}`)
    unarchive?.setAttribute('aria-label', copy('archiveUnarchive'))
    unarchive?.setAttribute('title', copy('archiveUnarchive'))
    const remove = row.querySelector(`.${DELETE_CLASS}`)
    remove?.setAttribute('aria-label', copy('archiveDelete'))
    remove?.setAttribute('title', copy('archiveDelete'))
  }

  /** One row's own box: the title and the two host actions, open by pressing the row itself. */
  function buildRow(id: string, summary: HostSessionSummary) {
    const row = buildElement('div', ROW_CLASS)
    row.setAttribute('role', 'button')
    row.setAttribute('tabindex', '0')
    row.setAttribute('data-session-id', id)
    const title = summary.displayTitle === '' ? id : summary.displayTitle
    row.setAttribute('title', title)
    const titleNode = buildElement('span', 'dsh-claude-ws-archived-title', title)
    const actions = buildElement('span', 'dsh-claude-ws-archived-actions')
    const unarchive = buildElement('button', UNARCHIVE_CLASS)
    unarchive.type = 'button'
    unarchive.innerHTML = UNARCHIVE_SVG
    const remove = buildElement('button', DELETE_CLASS)
    remove.type = 'button'
    remove.innerHTML = DELETE_SVG
    actions.appendChild(unarchive)
    actions.appendChild(remove)
    row.appendChild(titleNode)
    row.appendChild(actions)
    syncActionCopy(row)
    return row
  }

  /**
   * Bring the container to the fresh window: rows the archive no longer shows
   * leave, new ones arrive, and appendChild on a standing row moves it into the
   * fresh order — the reader's place holds as long as the archive still shows
   * it. A title that moved is written again.
   */
  function render() {
    if (container === null) return
    signature = latest.sig
    const order = latest.order
    const shown = order.slice(0, cursor)
    if (shown.length === 0) {
      for (const row of rows.values()) row.remove()
      rows.clear()
      if (emptyLine === null) emptyLine = buildElement('div', 'dsh-claude-ws-archived-empty', copy('archiveEmpty'))
      if (emptyLine.parentElement !== container) container.appendChild(emptyLine)
      return
    }
    if (emptyLine !== null && emptyLine.parentElement === container) container.removeChild(emptyLine)
    const wanted = new Set(shown)
    for (const id of shown) {
      const summary = latest.byId[id]
      let row = rows.get(id)
      if (row === undefined) {
        row = buildRow(id, summary)
        rows.set(id, row)
      } else {
        const title = summary.displayTitle === '' ? id : summary.displayTitle
        const titleNode = row.firstElementChild
        if (titleNode !== null && titleNode.textContent !== title) titleNode.textContent = title
        if (row.getAttribute('title') !== title) row.setAttribute('title', title)
      }
      syncActionCopy(row)
      container.appendChild(row)
    }
    for (const [id, row] of rows) {
      if (wanted.has(id)) continue
      row.remove()
      rows.delete(id)
    }
  }

  /** Append the next page: a no-op at the archive's end and under a running append. */
  function append() {
    if (container === null) return
    latest = read()
    if (cursor >= latest.order.length) {
      if (signature !== latest.sig) render()
      return
    }
    cursor = Math.min(cursor + ARCHIVED_PAGE_SIZE, latest.order.length)
    render()
  }

  function onScroll() {
    if (container === null || cancelAppend !== null || !nearBottom(container)) return
    cancelAppend = requestFrame({
      write() {
        cancelAppend = null
        append()
      },
    })
  }

  /**
   * A press anywhere in the list: a row's own buttons stop the press, so what
   * reaches the list is the row itself asking to open.
   */
  function onPress(event: Event) {
    const target = event.target instanceof Element ? event.target : null
    if (target === null || container === null) return
    const row = target.closest(`.${ROW_CLASS}`)
    if (row === null || !container.contains(row)) return
    const id = row.getAttribute('data-session-id')
    if (id === null) return
    if (target.closest('button') !== null) return
    deps.actions.open(id)
  }

  function onKey(event: Event) {
    if (!(event instanceof KeyboardEvent)) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    const target = event.target instanceof Element ? event.target : null
    if (target === null || container === null) return
    // A button's own keypress is its native click; the open route is the row's alone.
    if (target.closest('button') !== null) return
    const row = target.closest(`.${ROW_CLASS}`)
    if (row === null || !container.contains(row)) return
    const id = row.getAttribute('data-session-id')
    if (id === null) return
    event.preventDefault()
    deps.actions.open(id)
  }

  /**
   * A row's own buttons: the press's target names the action, the row names
   * the conversation. stopPropagation keeps the open route out of the way.
   */
  function onAction(event: Event) {
    const target = event.target instanceof Element ? event.target : null
    if (target === null || container === null) return
    const button = target.closest('button')
    const row = target.closest(`.${ROW_CLASS}`)
    if (button === null || row === null || !container.contains(row)) return
    const id = row.getAttribute('data-session-id')
    if (id === null) return
    event.stopPropagation()
    if (button.classList.contains(UNARCHIVE_CLASS)) deps.actions.unarchive(id)
    else if (button.classList.contains(DELETE_CLASS)) deps.actions.remove(id)
  }

  function ensureSources() {
    if (stopSources !== null) return
    const workspaces = deps.host.workspaces()
    const sessions = deps.host.sessions()
    if (workspaces === null || sessions === null) return
    const stops = [
      workspaces.list.subscribe(() => deps.schedule()),
      sessions.list.subscribe(() => deps.schedule()),
    ]
    stopSources = () => {
      for (const stop of stops) stop()
    }
  }

  function mount(into: Element) {
    if (container !== null && container.parentElement === into) return
    if (container === null) {
      container = buildElement('div', 'dsh-claude-ws-archived')
      container.addEventListener('click', onAction)
      container.addEventListener('click', onPress)
      container.addEventListener('keydown', onKey)
      into.appendChild(container)
    } else if (container.parentElement !== into) {
      into.appendChild(container)
    }
    cursor = ARCHIVED_PAGE_SIZE
    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    ensureSources()
    signature = ''
    sync()
  }

  function unmount() {
    if (container === null) return
    window.removeEventListener('scroll', onScroll, { capture: true })
    container.parentElement?.removeChild(container)
    cancelAppend?.()
    cancelAppend = null
    container = null
    signature = ''
    cursor = ARCHIVED_PAGE_SIZE
  }

  function sync() {
    if (container === null) return
    ensureSources()
    const next = read()
    if (next.sig === signature) return
    latest = next
    render()
  }

  function copyChanged() {
    signature = ''
    sync()
  }

  function dispose() {
    unmount()
    stopSources?.()
    stopSources = null
  }

  return { mount, unmount, mounted: () => container !== null, sync, copyChanged, dispose }
}
