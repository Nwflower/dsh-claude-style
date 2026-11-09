/**
 * A streaming answer is indexed once and updated from the nodes a batch
 * touches: a tail append reuses the index the same answer already had, a
 * structural rewrite rebuilds it, and the characters fading at once stay
 * bounded however many batches overlap. The reader sees the appended
 * characters at their own offsets, and none at all once the bound is reached.
 *
 * @capability chat-reveal
 * @features chat-reveal
 * @risk A long answer re-reads every text node on every token, or a batch appends off the end of the index so new characters never fade or fade at the wrong offsets.
 */
import { afterEach, expect, test } from 'vitest'
import { STREAMING_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import {
  appendRevealSnapshot,
  CHAT_REVEAL_ACTIVE_LIMIT,
  createRevealScanner,
  createRevealState,
  revealEntryAt,
  revealTextSlice,
} from '@dsh-claude-style/client/pure'
import type { RevealRun, RevealSnapshot, RevealState } from '@dsh-claude-style/client/pure'

const cleanups: (() => void)[] = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  document.body.replaceChildren()
})

const freshState = () => createRevealState()

function streamingContainer(text: string) {
  const element = document.createElement('div')
  element.setAttribute(STREAMING_ATTRIBUTE, '')
  element.textContent = text
  document.body.append(element)
  return element
}

/** The records a change made, taken before the page can settle them. */
function recordsOf(change: () => void) {
  const observer = new MutationObserver(() => {})
  observer.observe(document.body, { childList: true, subtree: true, characterData: true })
  change()
  const records = observer.takeRecords()
  observer.disconnect()
  return records
}

/** The records of a change made inside one container, as the engine's route hands them over. */
function changesOf(container: Element, records: MutationRecord[]) {
  return new Map<Element, MutationRecord[]>([[container, records]])
}

function scannerFor(state: RevealState) {
  const paints: number[] = []
  const scan = createRevealScanner(state, {
    publishRunColor: () => {},
    paint: () => { paints.push(performance.now()) },
  })
  return { scan, paints }
}

test('a tail append keeps the index and fades only the characters it added', () => {
  const state = freshState()
  const { scan } = scannerFor(state)
  const container = streamingContainer('Hello')
  scan(null)
  const before = state.textSnapshots.get(container)!
  expect(before.length).toBe(5)
  const records = recordsOf(() => { container.firstChild!.textContent = 'Hello world' })
  scan(new Set([container]), changesOf(container, records))
  const after = state.textSnapshots.get(container)!
  // The same index object and the same entries array: nothing walked the answer again.
  expect(after.entries).toBe(before.entries)
  expect(after.length).toBe(11)
  const added = state.liveRuns
    .filter((run: RevealRun) => run.container === container && run.start >= 5)
    .map((run: RevealRun) => run.start)
  expect(added).toEqual([6, 7, 8, 9, 10])
})

test('a structural rewrite rebuilds the index and fades from the replaced node', () => {
  const state = freshState()
  const { scan } = scannerFor(state)
  const container = streamingContainer('Hello')
  scan(null)
  const before = state.textSnapshots.get(container)!
  const replacement = document.createTextNode('Hello there')
  const records = recordsOf(() => { container.replaceChildren(replacement) })
  scan(new Set([container]), changesOf(container, records))
  const after = state.textSnapshots.get(container)!
  expect(after).not.toBe(before)
  expect(after.entries[0]!.node).toBe(replacement)
  expect(after.length).toBe(11)
})

test('appendRevealSnapshot refuses anything but a prefix-preserving tail change', () => {
  const node = document.createTextNode('abc')
  const snapshot: RevealSnapshot = { length: 3, entries: [{ node, start: 0, data: 'abc' }] }
  const records = recordsOf(() => { node.data = 'abd' })
  expect(appendRevealSnapshot(snapshot, records)).toBeNull()
  expect(snapshot.entries[0]!.data).toBe('abc')
})

test('the characters fading at once stay bounded in total', () => {
  const state = freshState()
  const { scan } = scannerFor(state)
  const container = streamingContainer('Hello')
  scan(null)
  state.liveRuns.length = 0
  for (let index = 0; index < CHAT_REVEAL_ACTIVE_LIMIT; index += 1) {
    state.liveRuns.push({ container, start: 0, length: 1, bornAt: 0, delay: 0, colorElement: null })
  }
  const records = recordsOf(() => { container.firstChild!.textContent = 'Hello world' })
  scan(new Set([container]), changesOf(container, records))
  expect(state.liveRuns.length).toBe(CHAT_REVEAL_ACTIVE_LIMIT)
  // The text still reaches its snapshot: it is shown at full strength, not left out.
  expect(state.textSnapshots.get(container)!.length).toBe(11)
})

test('one index answers an offset and a slice by binary search', () => {
  const first = document.createTextNode('ab')
  const second = document.createTextNode('cd')
  const host = document.createElement('div')
  host.append(first, second)
  const entries = [
    { node: first, start: 0, data: 'ab' },
    { node: second, start: 2, data: 'cd' },
  ]
  expect(revealEntryAt(entries, 0)).toBe(0)
  expect(revealEntryAt(entries, 1)).toBe(0)
  expect(revealEntryAt(entries, 2)).toBe(1)
  expect(revealEntryAt(entries, 4)).toBe(2)
  expect(revealTextSlice(entries, 1, 3)).toBe('bc')
  expect(revealTextSlice(entries, 0, 4)).toBe('abcd')
})
