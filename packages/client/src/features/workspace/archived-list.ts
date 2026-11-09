import { buildElement } from '@dsh-claude-style/engine/dom'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import type { HostSessionSummary, HostSessionsService, HostWorkspacesService } from '@dsh-claude-style/contracts/services'
import type { HostTooltip, HostTooltipOptions } from '../../shared/host-tooltip'
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
  /** The session the shell shows, which keeps its row even while it is blank. */
  currentSession(): string | null
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
  /**
   * 宿主自己的提示气泡（shared/host-tooltip.ts）：列表的控件由皮肤拼出来，
   * 提示仍然用宿主那一份。不交时行上不挂提示 —— 逻辑规范在 React 之外读这个
   * 模块，行照常画出来。
   */
  tooltip?(control: HTMLElement, label: string, options?: HostTooltipOptions): HostTooltip
  /** Ask for a pass (the scheduler's), so a snapshot change re-renders in the write phase (D40). */
  schedule(): void
}

/**
 * One row action's glyph, drawn from the skin's own paths rather than the
 * host's icon sprite: a host release without that sprite leaves a `<use>`
 * naming it empty, and the button is left with its hover wash alone. The paths
 * are the host's own glyphs at its own 14px, stroked in currentColor so the
 * button's ink and hover tones reach them.
 */
function iconSvg(viewBox: string, paths: readonly IconPath[]) {
  const shapes = paths
    .map((path) => `<path d="${path.d}"${path.fill === 'currentColor' ? ' fill="currentColor" fill-rule="evenodd" stroke="none"' : ''}/>`)
    .join('')
  return `<svg width="14" height="14" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true">${shapes}</svg>`
}

/** One path of a glyph: its data, and a fill when it paints a shape rather than a stroke. */
interface IconPath {
  d: string
  fill?: 'currentColor'
}

/** The unarchive entry's glyph: the host's archive box with an arrow leaving it. */
const UNARCHIVE_SVG = iconSvg('0 0 20 20', [
  { d: 'M15.8659 2.05975C17.2603 2.05995 18.3913 3.19096 18.3914 4.58527V5.4874C18.3914 6.02747 18.2192 6.52672 17.9303 6.93735C17.9336 6.96524 17.9388 6.99318 17.9388 7.02195V12.8884C17.9388 13.6345 17.9395 14.2379 17.8996 14.7254C17.8642 15.1593 17.7936 15.5499 17.6373 15.9141L17.5654 16.0685C17.278 16.6328 16.8405 17.1046 16.3038 17.434L16.0679 17.5661C15.66 17.7739 15.2196 17.8598 14.7237 17.9003C14.2362 17.9401 13.6327 17.9405 12.8867 17.9405H7.11122C6.36511 17.9405 5.76171 17.9406 5.27418 17.9003C4.84051 17.8649 4.44949 17.7952 4.08545 17.6391L3.93104 17.5661C3.36673 17.2785 2.89392 16.8414 2.56465 16.3044L2.43245 16.0685C2.22473 15.6608 2.13878 15.2211 2.09825 14.7254C2.05841 14.2379 2.05912 13.6345 2.05912 12.8884V7.02195C2.05912 6.99284 2.06422 6.96449 2.06758 6.93629C1.77931 6.52592 1.60858 6.02687 1.60858 5.4874V4.58527C1.60876 3.19084 2.73962 2.05975 4.1341 2.05975H15.8659ZM16.4984 7.92936C16.296 7.98169 16.0847 8.01387 15.8659 8.0139H4.1341C3.91478 8.0139 3.70246 7.98194 3.49955 7.92936V12.8884C3.49955 13.6582 3.50053 14.1927 3.53445 14.608C3.56769 15.0146 3.62923 15.244 3.71635 15.415L3.7925 15.5514C3.98339 15.8627 4.25749 16.1165 4.58464 16.2833L4.72529 16.3435C4.88095 16.3993 5.08638 16.4402 5.39158 16.4651C5.80685 16.4991 6.34138 16.5001 7.11122 16.5001H12.8867C13.6564 16.5001 14.1911 16.499 14.6063 16.4651C15.0128 16.432 15.2423 16.3703 15.4133 16.2833L15.5508 16.2061C15.8618 16.0152 16.116 15.7419 16.2827 15.415L16.3429 15.2732C16.3985 15.1177 16.4396 14.9128 16.4645 14.608C16.4985 14.1927 16.4984 13.6583 16.4984 12.8884V7.92936ZM4.1341 3.50019C3.53511 3.50019 3.0492 3.98631 3.04902 4.58527V5.4874C3.04902 6.08649 3.535 6.57248 4.1341 6.57248H15.8659C16.4648 6.57228 16.951 6.08638 16.951 5.4874V4.58527C16.9509 3.98644 16.4647 3.50038 15.8659 3.50019H4.1341Z', fill: 'currentColor' },
  { d: 'M10 14.1V10.1M7.85 12.05L10 9.9L12.15 12.05' },
])
/** The delete entry's glyph: the host's trash can. */
const DELETE_SVG = iconSvg('0 0 16 16', [
  { d: 'M1.28149 3.88831H14.7187' },
  { d: 'M5.41602 3.88833V2.47962C5.41602 2.29282 5.52492 2.11366 5.71876 1.98157C5.9126 1.84948 6.17551 1.77527 6.44964 1.77527H9.55053C9.82466 1.77527 10.0876 1.84948 10.2814 1.98157C10.4753 2.11366 10.5842 2.29282 10.5842 2.47962V3.88833' },
  { d: 'M2.57349 3.88831L3.19366 13.2943C3.21937 13.5502 3.33952 13.7872 3.53065 13.9593C3.72178 14.1313 3.97016 14.2259 4.22729 14.2246H11.7728C12.0299 14.2259 12.2783 14.1313 12.4694 13.9593C12.6605 13.7872 12.7807 13.5502 12.8064 13.2943L13.4266 3.88831' },
  { d: 'M6.44946 6.98926V11.1238' },
  { d: 'M9.55054 6.98926V11.1238' },
])

/** One row's own classes, read by workspace.css. */
const ROW_CLASS = 'dsh-claude-ws-archived-row'
const UNARCHIVE_CLASS = 'dsh-claude-ws-archived-unarchive'
const DELETE_CLASS = 'dsh-claude-ws-archived-delete'
const TITLE_CLASS = 'dsh-claude-ws-archived-title'
/** The title's tooltip anchor: the flex item the elided words now stand in. */
const TITLE_ANCHOR_CLASS = 'dsh-claude-ws-archived-title-anchor'

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
  /** Each control's own host tooltip, by the control it belongs to. */
  const tips = new Map<Element, HostTooltip>()
  /** Each row's tooltips, taken down with the row. */
  const rowTips = new Map<HTMLElement, HostTooltip[]>()
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
    const current = deps.host.currentSession()
    const order = archivedOrder(archived, byId, current)
    // The window the list draws is what a re-render has to see: a change below
    // it cannot move a row the reader holds, and signing the whole archive
    // would build a string over every archived title on each pass.
    const sig = JSON.stringify([
      current,
      cursor,
      order.slice(0, cursor).map((id) => [id, byId[id]?.updatedAt, byId[id]?.displayTitle]),
    ])
    return { order, byId, sig }
  }

  /** Keep both row actions readable in the copy's current language, including on a reused row. */
  function syncActionCopy(row: HTMLElement) {
    const unarchive = row.querySelector(`.${UNARCHIVE_CLASS}`)
    unarchive?.setAttribute('aria-label', copy('archiveUnarchive'))
    relabel(unarchive, copy('archiveUnarchive'))
    const remove = row.querySelector(`.${DELETE_CLASS}`)
    remove?.setAttribute('aria-label', copy('archiveDelete'))
    relabel(remove, copy('archiveDelete'))
  }

  /** A control's own tooltip, when it has one: the skin's rows draw the host's bubble, not the browser's. */
  function relabel(control: Element | null, label: string) {
    if (control === null) return
    tips.get(control)?.setLabel(label)
  }

  /** One row's tooltips, taken down with the row. */
  function releaseRow(row: HTMLElement) {
    const taken = rowTips.get(row)
    if (taken === undefined) return
    for (const tip of taken) tip.release()
    rowTips.delete(row)
    for (const control of [row.querySelector(`.${TITLE_CLASS}`), row.querySelector(`.${UNARCHIVE_CLASS}`), row.querySelector(`.${DELETE_CLASS}`)]) {
      if (control !== null) tips.delete(control)
    }
  }

  /**
   * One row's own box: the title and the two host actions, open by pressing the
   * row itself. Each control wears the host's own tooltip when the caller hands
   * one in (workspace-view.ts does); the logic specs read this module without
   * React, and their rows stand without bubbles.
   */
  function buildRow(id: string, summary: HostSessionSummary) {
    const row = buildElement('div', ROW_CLASS)
    row.setAttribute('role', 'button')
    row.setAttribute('tabindex', '0')
    row.setAttribute('data-session-id', id)
    const title = summary.displayTitle === '' ? id : summary.displayTitle
    const made: HostTooltip[] = []
    /** The node to insert for one control: its tooltip's anchor, or the control itself. */
    function wear<T extends HTMLElement>(control: T, label: string, options?: HostTooltipOptions): HTMLElement {
      if (deps.tooltip === undefined) return control
      const tip = deps.tooltip(control, label, options)
      made.push(tip)
      tips.set(control, tip)
      return tip.node
    }
    const titleNode = buildElement('span', TITLE_CLASS, title)
    // The elided title carries the full words in the host's own bubble: the skin's
    // rows draw the same tooltip the page's controls do.
    const titleAnchor = wear(titleNode, title, { side: 'bottom', className: TITLE_ANCHOR_CLASS })
    const actions = buildElement('span', 'dsh-claude-ws-archived-actions')
    const unarchive = buildElement('button', UNARCHIVE_CLASS)
    unarchive.type = 'button'
    unarchive.innerHTML = UNARCHIVE_SVG
    // The name is written here as well: the button stands in the tooltip's anchor,
    // which React mounts a beat after this row is built.
    unarchive.setAttribute('aria-label', copy('archiveUnarchive'))
    const remove = buildElement('button', DELETE_CLASS)
    remove.type = 'button'
    remove.innerHTML = DELETE_SVG
    remove.setAttribute('aria-label', copy('archiveDelete'))
    actions.appendChild(wear(unarchive, copy('archiveUnarchive'), { side: 'bottom' }))
    actions.appendChild(wear(remove, copy('archiveDelete'), { side: 'bottom' }))
    row.appendChild(titleAnchor)
    row.appendChild(actions)
    if (made.length > 0) rowTips.set(row, made)
    syncActionCopy(row)
    return row
  }

  /**
   * Bring the container to the fresh window: rows the archive no longer shows
   * leave, new ones arrive, and a row standing out of place moves into it — a
   * row already in its place is left where it stands. A title that moved is
   * written again.
   */
  function render() {
    if (container === null) return
    signature = latest.sig
    const order = latest.order
    const shown = order.slice(0, cursor)
    if (shown.length === 0) {
      for (const row of rows.values()) {
        releaseRow(row)
        row.remove()
      }
      rows.clear()
      if (emptyLine === null) emptyLine = buildElement('div', 'dsh-claude-ws-archived-empty', copy('archiveEmpty'))
      if (emptyLine.parentElement !== container) container.appendChild(emptyLine)
      return
    }
    if (emptyLine !== null && emptyLine.parentElement === container) container.removeChild(emptyLine)
    const wanted = new Set(shown)
    for (let at = 0; at < shown.length; at += 1) {
      const id = shown[at]!
      const summary = latest.byId[id]
      let row = rows.get(id)
      if (row === undefined) {
        row = buildRow(id, summary)
        rows.set(id, row)
      } else {
        const title = summary.displayTitle === '' ? id : summary.displayTitle
        const titleNode = row.querySelector(`.${TITLE_CLASS}`)
        if (titleNode !== null && titleNode.textContent !== title) titleNode.textContent = title
        relabel(titleNode, title)
        syncActionCopy(row)
      }
      // A row already standing at its place costs nothing: appendChild on it
      // would detach and re-insert it, which is a mutation the reader's scroll
      // and the bus both have to handle for a list that did not move.
      if (container.children[at] !== row) container.insertBefore(row, container.children[at] ?? null)
    }
    for (const [id, row] of rows) {
      if (wanted.has(id)) continue
      releaseRow(row)
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
    for (const row of rows.values()) releaseRow(row)
    rows.clear()
    tips.clear()
    cancelAppend?.()
    cancelAppend = null
    container = null
    signature = ''
    cursor = ARCHIVED_PAGE_SIZE
    // The freshest reading holds every shown summary and its titles: a list
    // taken off the page has nothing left to draw from it.
    latest = { order: [], byId: {}, sig: '' }
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
