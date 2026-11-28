/**
 * The rows one piece of work wrote to one file read as one row: within a
 * process group's content layer, the earliest row stands for the file and
 * carries every call's changes, the operation the work last reached, and the
 * file's last read. The host's own call rows decide what carries a row.
 *
 * @capability file-rows
 * @features chat-files
 * @risk The same file edited three times shows three rows with partial numbers, two files are folded into one row, or the figures of an edit vanish once the file is read again.
 */
import { expect, test } from 'vitest'
import { byDocumentOrder, createFileMerge, mergeViews, rowCarrier } from '@dsh-claude-style/client/pure'
import type { FileHunk, FileMergeRow, FileReadCard, FileToolOperation, FileRowState } from '@dsh-claude-style/client/pure'
import { CHAT_CALL_SELECTOR, CURRENT_SUBCALL_SELECTOR, FLOW_BLOCK_SELECTOR, PROCESS_CONTENT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { hostElement } from '../../fixtures/host-markup'

/** One change of the shape the row model derives: the path, what it replaced and what it wrote. */
function hunk(path: string, added: number, removed: number): FileHunk {
  return {
    path,
    oldText: removed === 0 ? null : Array.from({ length: removed }, (_, at) => `old ${at}`).join('\n'),
    newText: Array.from({ length: added }, (_, at) => `new ${at}`).join('\n'),
  }
}

/** One read window of the shape a read call derives. */
function readCard(path: string): FileReadCard {
  return { path, lines: [{ number: 1, text: 'const first = 1' }], totalLines: 4 }
}

/** One process group's content layer, detached: the merge only reads ancestors and document order. */
const content = () => hostElement(PROCESS_CONTENT_SELECTOR)

let calls = 0
/** One file row inside a content layer: the host's call row holding the row's root, as the host nests them. */
function row(layer: Element, path: string, hunks: FileHunk[], state: FileRowState = 'ok', operation: FileToolOperation = 'edit', read: FileReadCard | null = null): FileMergeRow {
  calls += 1
  const callId = `call-${calls}`
  const carrier = hostElement(CHAT_CALL_SELECTOR, callId)
  const element = document.createElement('div')
  carrier.append(element)
  layer.append(carrier)
  return { element, callId, path, operation, hunks, state, read }
}

/** One call the host runs through a row element it keeps for the file's next call. */
function call(element: HTMLElement, callId: string, operation: FileToolOperation, hunks: FileHunk[], read: FileReadCard | null = null): FileMergeRow {
  return { element, callId, path: 'app.js', operation, hunks, state: 'ok', read }
}

/** Let the registry's deferred unregister run. */
const flushed = () => new Promise((resolve) => { queueMicrotask(() => resolve(null)) })

test('the rows of one file in one content layer read as one group, the earliest of them standing for it', () => {
  const layer = content()
  const first = row(layer, 'app.js', [hunk('app.js', 2, 1)])
  const second = row(layer, 'app.js', [hunk('app.js', 3, 0)])
  const views = mergeViews([second, first])
  expect(views.get(first.element)).toEqual({ head: true, count: 2, hunks: [...first.hunks, ...second.hunks], running: false, operation: 'edit', read: null })
  expect(views.get(second.element)).toEqual({ head: false, count: 2, hunks: [...first.hunks, ...second.hunks], running: false, operation: 'edit', read: null })
})

test('the head is the earliest row in document order, whichever order the rows registered in', () => {
  const layer = content()
  const first = row(layer, 'app.js', [hunk('app.js', 1, 0)])
  const second = row(layer, 'app.js', [hunk('app.js', 1, 0)])
  expect(byDocumentOrder(first, second)).toBeLessThan(0)
  expect(byDocumentOrder(second, first)).toBeGreaterThan(0)
  expect(mergeViews([second, first]).get(first.element)?.head).toBe(true)
})

test('two content layers are never read together: two pieces of work keep their own rows', () => {
  const early = row(content(), 'app.js', [hunk('app.js', 1, 0)])
  const late = row(content(), 'app.js', [hunk('app.js', 1, 0)])
  const views = mergeViews([early, late])
  expect(views.get(early.element)).toEqual({ head: true, count: 1, hunks: early.hunks, running: false, operation: 'edit', read: null })
  expect(views.get(late.element)).toEqual({ head: true, count: 1, hunks: late.hunks, running: false, operation: 'edit', read: null })
})

test('two files in one content layer stay two rows', () => {
  const layer = content()
  const app = row(layer, 'app.js', [hunk('app.js', 1, 0)])
  const note = row(layer, 'note.md', [hunk('note.md', 0, 1)])
  const views = mergeViews([app, note])
  expect(views.get(app.element)?.count).toBe(1)
  expect(views.get(note.element)?.count).toBe(1)
})

test('a group is still under way while any of its calls runs', () => {
  const layer = content()
  const settled = row(layer, 'app.js', [hunk('app.js', 1, 0)])
  const running = row(layer, 'app.js', [hunk('app.js', 1, 0)], 'running')
  const views = mergeViews([settled, running])
  expect(views.get(settled.element)?.running).toBe(true)
  expect(views.get(running.element)?.running).toBe(true)
})

test('a row in no content layer is left alone', () => {
  const loose = document.createElement('div')
  const element = document.createElement('div')
  loose.append(element)
  expect(mergeViews([{ element, callId: 'c1', path: 'app.js', hunks: [hunk('app.js', 1, 0)], state: 'ok', operation: 'edit', read: null }]).size).toBe(0)
})

test('the carrier is the host\'s call row, whether the call stands in the content layer or under a program\'s call', () => {
  const layer = content()
  const program = hostElement(CHAT_CALL_SELECTOR, 'program')
  const subCalls = document.createElement('div')
  const dispatched = hostElement(CHAT_CALL_SELECTOR, 'dispatched')
  const element = document.createElement('div')
  dispatched.append(element)
  subCalls.append(dispatched)
  program.append(subCalls)
  layer.append(program)
  expect(rowCarrier(element)).toBe(dispatched)
  expect(rowCarrier(program)).toBe(program)
  expect(rowCarrier(document.createElement('div'))).toBe(null)
})

test('a call standing in a flow block of its own is carried by that block, so the block\'s spacing goes with it', () => {
  const group = hostElement(FLOW_BLOCK_SELECTOR, 'process')
  const layer = content()
  group.append(layer)
  // A direct call: its own block, through a slot that draws no box.
  const block = hostElement(FLOW_BLOCK_SELECTOR, 'direct')
  const slot = document.createElement('div')
  const direct = hostElement(CHAT_CALL_SELECTOR, 'direct')
  const element = document.createElement('div')
  direct.append(element)
  slot.append(direct)
  block.append(slot)
  layer.append(block)
  expect(rowCarrier(element)).toBe(block)
  // A call a program dispatched shares the program's block, which stays.
  const programBlock = hostElement(FLOW_BLOCK_SELECTOR, 'program')
  const program = hostElement(CHAT_CALL_SELECTOR, 'program')
  const dispatched = hostElement(CHAT_CALL_SELECTOR, 'dispatched')
  const inner = document.createElement('div')
  dispatched.append(inner)
  program.append(dispatched)
  programBlock.append(program)
  layer.append(programBlock)
  expect(rowCarrier(inner)).toBe(dispatched)
  // A call row with no block of its own inside the layer: the group's own block is never the carrier.
  const loose = hostElement(CHAT_CALL_SELECTOR, 'loose')
  const looseElement = document.createElement('div')
  loose.append(looseElement)
  layer.append(loose)
  expect(rowCarrier(looseElement)).toBe(loose)
})

test('the row wears the operation the file\'s work last reached, whichever order the rows registered in', () => {
  const layer = content()
  const read = row(layer, 'app.js', [], 'ok', 'read', readCard('app.js'))
  const edit = row(layer, 'app.js', [hunk('app.js', 2, 1)])
  const views = mergeViews([edit, read])
  expect(views.get(read.element)?.operation).toBe('edit')
  expect(views.get(edit.element)?.operation).toBe('edit')
})

test('a read after a change wears the read while the numbers keep counting the changes', () => {
  const layer = content()
  const edit = row(layer, 'app.js', [hunk('app.js', 2, 1)])
  const read = row(layer, 'app.js', [], 'ok', 'read', readCard('app.js'))
  const view = mergeViews([edit, read]).get(edit.element)
  expect(view?.operation).toBe('read')
  expect(view?.hunks).toEqual(edit.hunks)
})

test('a group that only read its file draws no hunks and carries the file\'s last read', () => {
  const layer = content()
  const first = row(layer, 'app.js', [], 'ok', 'read', readCard('app.js'))
  const second = row(layer, 'app.js', [], 'ok', 'read', { ...readCard('app.js'), totalLines: 9 })
  const views = mergeViews([first, second])
  expect(views.get(first.element)?.hunks).toEqual([])
  expect(views.get(first.element)?.read?.totalLines).toBe(9)
  expect(views.get(second.element)?.read?.totalLines).toBe(9)
})

test('a group that wrote its file keeps the last read beside its changes', () => {
  const layer = content()
  const read = row(layer, 'app.js', [], 'ok', 'read', readCard('app.js'))
  const write = row(layer, 'app.js', [hunk('app.js', 3, 0)], 'ok', 'write')
  const view = mergeViews([read, write]).get(read.element)
  expect(view?.operation).toBe('write')
  expect(view?.read?.path).toBe('app.js')
})

test('the registry reads a row back out, and the view stands until the next change', async () => {
  const layer = content()
  const merge = createFileMerge()
  const first = row(layer, 'app.js', [hunk('app.js', 1, 0)])
  const second = row(layer, 'app.js', [hunk('app.js', 2, 0)])
  const dropFirst = merge.put(first)
  merge.put(second)
  const before = merge.viewFor(first.element)
  expect(before).toEqual({ head: true, count: 2, hunks: [...first.hunks, ...second.hunks], running: false, operation: 'edit', read: null })
  expect(merge.viewFor(first.element)).toBe(before)
  dropFirst()
  await flushed()
  expect(merge.viewFor(first.element)).toBe(null)
  expect(merge.viewFor(second.element)?.count).toBe(1)
})

test('a listener hears every change, and stops hearing once it unsubscribes', async () => {
  const layer = content()
  const merge = createFileMerge()
  let heard = 0
  const stop = merge.subscribe(() => { heard += 1 })
  const first = row(layer, 'app.js', [hunk('app.js', 1, 0)])
  const drop = merge.put(first)
  expect(heard).toBe(1)
  drop()
  await flushed()
  expect(heard).toBe(2)
  stop()
  merge.put(first)
  expect(heard).toBe(2)
})

test('one row element the host moves on to the file\'s next call keeps the calls it carried', () => {
  const layer = content()
  const carrier = hostElement(CHAT_CALL_SELECTOR, 'direct')
  const element = document.createElement('div')
  carrier.append(element)
  layer.append(carrier)
  const merge = createFileMerge()
  merge.put(call(element, 'c1', 'read', [], readCard('app.js')))
  merge.put(call(element, 'c2', 'edit', [hunk('app.js', 1, 1)]))
  expect(merge.viewFor(element)?.count).toBe(2)
  // The read that lands after the edit must keep the edit's figures: the host
  // hands this element to the file's next call rather than drawing a new row.
  merge.put(call(element, 'c3', 'read', [], readCard('app.js')))
  const view = merge.viewFor(element)
  expect(view?.operation).toBe('read')
  expect(view?.count).toBe(3)
  expect(view?.head).toBe(true)
  expect(view?.hunks).toEqual([hunk('app.js', 1, 1)])
})

test('a row put twice leaves the registry once, on the latest registration', () => {
  const layer = content()
  const merge = createFileMerge()
  const first = row(layer, 'app.js', [hunk('app.js', 1, 0)])
  const drop = merge.put(first)
  merge.put({ ...first, hunks: [hunk('app.js', 4, 0)] })
  drop()
  expect(merge.viewFor(first.element)?.hunks).toEqual([hunk('app.js', 4, 0)])
})

test('a file row inside a collapsed program call\'s inert sub-call preview stays out of file merging', () => {
  const layer = content()
  const outer = row(layer, 'app.js', [hunk('app.js', 2, 0)])
  const program = hostElement(CHAT_CALL_SELECTOR, 'program-1')
  const preview = hostElement(CURRENT_SUBCALL_SELECTOR, 'sub-1')
  const previewRow = document.createElement('div')
  preview.append(previewRow)
  program.append(preview)
  layer.append(program)
  const views = mergeViews([
    outer,
    { element: previewRow, callId: 'sub-1', path: 'app.js', operation: 'edit', hunks: [hunk('app.js', 5, 0)], state: 'running', read: null },
  ])
  expect(views.has(previewRow)).toBe(false)
  expect(views.get(outer.element)).toEqual({ head: true, count: 1, hunks: outer.hunks, running: false, operation: 'edit', read: null })
})
