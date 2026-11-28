import { CHAT_CALL_SELECTOR, CURRENT_SUBCALL_SELECTOR, FLOW_BLOCK_SELECTOR, PROCESS_CONTENT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { notifyAll } from '@dsh-claude-style/engine/notify'
import type { FileHunk, FileReadCard, FileRowState } from './file-row-model'
import type { FileToolOperation } from '../../shared/file-tool'

/**
 * The file row's read-across-calls half: the calls that touched one file
 * inside one process group stand as a single row.
 *
 * The host renders one row per call and hands each of them only its own block,
 * so a row that has to know what the others did reads it here: every row
 * registers the file it touched, the operation it performed and what its own
 * call changed, and the row the registry names as the group's head draws the
 * whole file's tail, its whole diff card and the operation the file's work last
 * reached. A file touched once is drawn exactly as it was before this module
 * existed.
 *
 * A group is one process group's content layer (D3), so two pieces of work in
 * one turn are never read together, and the head is the group's earliest call
 * in document order: a number that grows stays where the file was first
 * touched, and the operation it wears moves on in place. The calls a program
 * dispatched are the case with several rows of one file on the page at once:
 * the host renders them side by side under the program's own row, inside the
 * same content layer.
 */

/** One file row as the registry knows it: its element, its call, its file, what its own call did. */
export interface FileMergeRow {
  element: HTMLElement
  /**
   * The host's own id for this call. The host draws one row element per call
   * step and hands it to the file's next call, so on one element this id is what
   * tells the calls apart: a new one adds to the file's tail, the same one
   * replaces what it registered before.
   */
  callId: string
  path: string
  operation: FileToolOperation
  hunks: readonly FileHunk[]
  state: FileRowState
  /** The window it read, for a read call that has one. */
  read: FileReadCard | null
}

/** What one row draws once its file's calls are read together. */
export interface FileMergeView {
  /** This row stands for the file: it draws the merged tail and the merged diff card. */
  head: boolean
  /** How many calls of the file are read together. */
  count: number
  /** Every call's hunks, in document order. */
  hunks: FileHunk[]
  /** Whether any call of the file is still running. */
  running: boolean
  /** The operation the file's work last reached: the row wears its icon and title. */
  operation: FileToolOperation
  /** The file's last read, for a group whose calls changed nothing. */
  read: FileReadCard | null
}

/** The content layer a row sits in, or null outside a process group or inside a collapsed program call's inert sub-call preview. */
export function rowContainer(element: HTMLElement) {
  if (element.closest(CURRENT_SUBCALL_SELECTOR) !== null) return null
  return element.closest(PROCESS_CONTENT_SELECTOR)
}

/**
 * The element whose box a row takes in its list. A directly called tool can
 * stand in a flow block of its own, which one host version spaces with margins
 * of its own: hiding the call row inside would leave those margins behind, so
 * the block is the carrier. A call a program dispatched shares the program's
 * block with the program's own call, and the carrier is the sub-call's row; the
 * program's row around it must stay. Where the host draws the call row with no
 * block of its own, the call row is the carrier.
 *
 * @returns the carrier, or null for a row the host drew outside a call row.
 */
export function rowCarrier(element: HTMLElement) {
  const call = element.closest(CHAT_CALL_SELECTOR)
  if (call === null) return null
  // The process group itself is a flow block too: only a block inside the
  // content layer can be the call's own.
  const layer = rowContainer(element)
  const block = call.parentElement === null ? null : call.parentElement.closest(FLOW_BLOCK_SELECTOR)
  if (layer === null || block === null || block === layer || !layer.contains(block)) return call
  return block.querySelectorAll(CHAT_CALL_SELECTOR).length === 1 ? block : call
}

/** The earlier of two rows first, by document order. */
export function byDocumentOrder(a: FileMergeRow, b: FileMergeRow) {
  if (a.element === b.element) return 0
  return a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1
}

function groupRows(rows: readonly FileMergeRow[]) {
  const groups = new Map<Element, Map<string, FileMergeRow[]>>()
  for (const row of rows) {
    const container = rowContainer(row.element)
    if (container === null) continue
    let byPath = groups.get(container)
    if (byPath === undefined) {
      byPath = new Map()
      groups.set(container, byPath)
    }
    const members = byPath.get(row.path)
    if (members === undefined) byPath.set(row.path, [row])
    else members.push(row)
  }
  return groups
}

function mergeGroup(members: readonly FileMergeRow[]) {
  const ordered = [...members].sort(byDocumentOrder)
  // One group shares one hunk list: the tail and the diff card both read it.
  const hunks = ordered.flatMap(member => [...member.hunks])
  const running = ordered.some(member => member.state === 'running')
  const last = ordered[ordered.length - 1]
  let read: FileReadCard | null = null
  for (let at = ordered.length - 1; at >= 0 && read === null; at -= 1) read = ordered[at].read
  const head = ordered[0].element
  return ordered.map(member => [member.element, {
    head: member.element === head, count: ordered.length, hunks, running, operation: last.operation, read,
  }] as const)
}

function emptyViews() {
  return new Map<HTMLElement, FileMergeView>()
}

/** Read every registered row's group. */
export function mergeViews(rows: readonly FileMergeRow[]) {
  const views = emptyViews()
  for (const byPath of groupRows(rows).values()) {
    for (const members of byPath.values()) {
      for (const [element, view] of mergeGroup(members)) views.set(element, view)
    }
  }
  return views
}

/**
 * The registry one install owns: rows put themselves in, their views are read
 * back out. The views are rebuilt whole on every change and each one stands
 * until the next change, which is the stable snapshot a React subscriber reads
 * between renders.
 *
 * One row element holds the calls the host ran through it: the host gives a
 * direct call the content layer's own row and then hands that element to the
 * file's next call, so the element carries the file's tail across a read that
 * changed nothing. An element that moves to another file or another group starts
 * its own record.
 */
export function createFileMerge() {
  const rows = new Map<HTMLElement, { container: Element, path: string, calls: Map<string, FileMergeRow> }>()
  /** Rows whose unregister is waiting to see whether the host moves them on. */
  const leaving = new Set<HTMLElement>()
  const listeners: (() => void)[] = []
  let views = new Map<HTMLElement, FileMergeView>()
  /** Per install: unchanged file groups keep their merged entries; removed groups leave on rebuild. */
  let groupCache: { container: Element, path: string, members: readonly FileMergeRow[], entries: ReturnType<typeof mergeGroup> }[] = []

  const rebuild = () => {
    const registered = [...rows.values()].flatMap(held => [...held.calls.values()])
    const nextViews = emptyViews()
    const nextCache: typeof groupCache = []
    for (const [container, byPath] of groupRows(registered)) {
      for (const [path, members] of byPath) {
        const held = groupCache.find(group => group.container === container && group.path === path)
        const unchanged = held !== undefined && held.members.length === members.length && held.members.every((member, at) => member === members[at])
        const entries = unchanged ? held.entries : mergeGroup(members)
        for (const [element, view] of entries) nextViews.set(element, view)
        nextCache.push({ container, path, members, entries })
      }
    }
    groupCache = nextCache
    views = nextViews
    notifyAll(listeners)
  }

  return {
    /** The view one row draws, or null while it is not registered. */
    viewFor(element: HTMLElement | null) {
      return element === null ? null : views.get(element) ?? null
    },
    /**
     * Register one call on one row element, replacing what the same call
     * registered before.
     * @returns the unregister, which takes the element out when the host has
     * moved it on to the file's next call and no row landed in its place.
     */
    put(row: FileMergeRow) {
      const element = row.element
      const container = rowContainer(element)
      leaving.delete(element)
      if (container === null) {
        rows.delete(element)
      } else {
        const held = rows.get(element)
        if (held === undefined || held.container !== container || held.path !== row.path) {
          rows.set(element, { container, path: row.path, calls: new Map([[row.callId, row]]) })
        } else {
          held.calls.set(row.callId, row)
        }
      }
      rebuild()
      return () => {
        // The row that lands next puts itself in during the same flush, before
        // this microtask runs, and clears the mark.
        leaving.add(element)
        queueMicrotask(() => {
          if (!leaving.has(element)) return
          leaving.delete(element)
          rows.delete(element)
          rebuild()
        })
      }
    },
    /** Hear about every change; returns the unsubscriber. */
    subscribe(listener: () => void) {
      listeners.push(listener)
      return () => {
        const at = listeners.indexOf(listener)
        if (at !== -1) listeners.splice(at, 1)
      }
    },
  }
}
