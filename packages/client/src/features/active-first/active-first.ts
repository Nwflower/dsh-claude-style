import { SESSION_ONGOING_SELECTOR, SESSION_PHASE_ATTRIBUTE, SESSION_ROW_KEY_ATTRIBUTE, SESSION_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { hostSnapshot, hostWorkspaceView, hostWorkspaces } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'
import { PART_ATTR } from '../../constants'
import { sessionSeatSegments } from '../../shared/element-order'

const GROUP = '[' + PART_ATTR + '~="group-section"]'
const LIST = '[' + PART_ATTR + '~="list"], ' + GROUP
const DATE_MODE = 'data-dsh-claude-date-groups'
const ACTIVE_LIST = 'data-dsh-claude-active-first'
const ORDER = '--dsh-claude-active-first-order'
const SEAT = 'data-dsh-claude-active-first-seat'

type Source = { subscribe?(listener: () => void): () => void }

/** The host owns every seat. Only a shown workspace list supports this layout (D3, D43). */
function visualOrder(list: HTMLElement, seats: Map<Element, HTMLElement>, pins: ReadonlySet<string>) {
  const children = Array.from(list.children)
  if (!children.every((child): child is HTMLElement => child instanceof HTMLElement)) return null
  // 按行：成员只在这次分段计算期间有效。
  const facts = new Map<Element, { box: HTMLElement, running: boolean, rank: number }>()
  for (const box of children) {
    const row = seats.get(box)
    if (!row) continue
    const running = box.matches(SESSION_ONGOING_SELECTOR) || box.querySelector(SESSION_ONGOING_SELECTOR) !== null
    const pinned = pins.has(row.getAttribute(SESSION_ROW_KEY_ATTRIBUTE)!)
    facts.set(box, { box, running, rank: pinned ? 0 : running ? 1 : 2 })
  }
  const ordered = children.slice()
  for (const segment of sessionSeatSegments(list, facts)) {
    // The host puts the current blank before pins when no session is running.
    if (!segment.some(seat => seat.running)) continue
    const at = children.indexOf(segment[0]!.box)
    segment.sort((a, b) => a.rank - b.rank)
    ordered.splice(at, segment.length, ...segment.map(seat => seat.box))
  }
  return ordered.some((child, index) => child !== children[index]) ? ordered : null
}

export function install(ctx: HostContext) {
  // Native sequential focus navigation follows this same visual order. Older
  // browsers retain their host's list and its keyboard order together.
  if (!CSS.supports('reading-flow', 'flex-visual')) return () => {}
  const subscriptions = new Map<Source, () => void>()
  // 按行：仅保留下次刷新或拆卸时需要清理的列表与直接子节点。
  let applied = new Map<HTMLElement, HTMLElement[]>()
  let cancelFrame: (() => void) | null = null

  function render(next: Map<HTMLElement, HTMLElement[]>) {
    const children = new Set([...next.values()].flat())
    for (const [list, prior] of applied) {
      if (!next.has(list)) list.removeAttribute(ACTIVE_LIST)
      for (const child of prior) {
        if (children.has(child)) continue
        child.style.removeProperty(ORDER)
        child.removeAttribute(SEAT)
      }
    }
    for (const [list, ordered] of next) {
      // Only the flat list starts with a session. Group headers and their
      // inter-section margins stay in their original positions.
      const shifted = !list.matches(GROUP) && ordered[0] !== list.firstElementChild
      const state = shifted ? 'shifted' : ''
      if (list.getAttribute(ACTIVE_LIST) !== state) list.setAttribute(ACTIVE_LIST, state)
      ordered.forEach((child, index) => {
        if (child.style.getPropertyValue(ORDER) !== String(index)) child.style.setProperty(ORDER, String(index))
        const seat = shifted && index === 0 ? 'leader' : ''
        if (child.getAttribute(SEAT) !== seat) child.setAttribute(SEAT, seat)
      })
    }
    applied = next
  }

  function refresh() {
    const view = hostWorkspaceView(ctx)
    const workspaces = hostWorkspaces(ctx)?.list
    const sources = new Set<Source>()
    if (view !== null) sources.add(view)
    if (workspaces !== undefined) sources.add(workspaces)
    for (const [source, release] of subscriptions) {
      if (sources.has(source)) continue
      release()
      subscriptions.delete(source)
    }
    for (const source of sources) {
      if (!subscriptions.has(source) && typeof source.subscribe === 'function') {
        subscriptions.set(source, source.subscribe(schedule))
      }
    }
    // 按行：本次刷新生成当前需要显示排序的列表。
    const next = new Map<HTMLElement, HTMLElement[]>()
    if (view?.subscribe && view.getSnapshot().orderBy === 'updated' && !document.body.hasAttribute(DATE_MODE)) {
      const snapshot = hostSnapshot(workspaces)
      if (snapshot?.phase !== 'pending' && Array.isArray(snapshot?.pinnedSessionIds) && Array.isArray(snapshot.archivedSessionIds)) {
        const archived = new Set(snapshot.archivedSessionIds)
        const pins = new Set(snapshot.pinnedSessionIds.filter(id => !archived.has(id)).map(id => 'session:' + id))
        // 按行：本次刷新内按父节点收集宿主当前的座位。
        const lists = new Map<HTMLElement, Map<Element, HTMLElement>>()
        for (const row of rows.all()) {
          const box = row.parentElement
          const list = box?.parentElement
          if (!box || !list?.matches(LIST) || box.firstElementChild !== row) continue
          let seats = lists.get(list)
          if (!seats) lists.set(list, seats = new Map())
          seats.set(box, row)
        }
        for (const [list, seats] of lists) {
          const ordered = visualOrder(list, seats, pins)
          if (ordered) next.set(list, ordered)
        }
      }
    }
    render(next)
  }

  function schedule() {
    if (cancelFrame !== null) return
    cancelFrame = requestFrame({ write() { cancelFrame = null; refresh() } })
  }

  const rows = observeMatches<HTMLElement>(SESSION_ROW_SELECTOR, schedule)
  const stopDate = subscribeMutations(document.body, { attributeFilter: [DATE_MODE] }, schedule)
  const stopRows = subscribeMutations(document.body, {
    childList: true, subtree: true, attributeFilter: [SESSION_PHASE_ATTRIBUTE, SESSION_ROW_KEY_ATTRIBUTE, PART_ATTR],
  }, records => {
    for (const { target, type, attributeName } of records) {
      if (!(target instanceof HTMLElement)) continue
      if (attributeName === PART_ATTR ? target.matches(LIST) || applied.has(target) :
        target.closest(SESSION_ROW_SELECTOR) || type === 'childList' && target.matches(LIST)) {
        schedule()
        return
      }
    }
  })
  refresh()
  return () => {
    stopRows()
    stopDate()
    rows.release()
    for (const release of subscriptions.values()) release()
    subscriptions.clear()
    cancelFrame?.()
    render(new Map())
  }
}
