/**
 * The reveal runs on one arrival clock: a character that arrived later never
 * starts fading before one that arrived earlier, whichever batch or container
 * it came in, and none of them waits longer than one fade for its turn.
 *
 * @capability chat-reveal
 * @features chat-reveal
 * @risk Two answers streaming at once, or a second append landing inside the first one's fade, leave a later stretch brighter or fainter than the text before it, so the answer reads as a patchwork of alphas instead of one wave.
 */
import { expect, test } from 'vitest'
import { CHAT_REVEAL_MS, createRevealState } from '@dsh-claude-style/client/pure'
import type { RevealRun } from '@dsh-claude-style/client/pure'
import { pageCleanups } from '../../fixtures/page'
import { changesOf, recordsOf, scannerFor, streamingContainer } from '../../fixtures/reveal'

pageCleanups()

/** Append `text` to one container and scan that container alone. */
function append(scan: ReturnType<typeof scannerFor>['scan'], container: Element, text: string) {
  const records = recordsOf(() => { container.firstChild!.textContent = text })
  scan(new Set([container]), changesOf(container, records))
}

const grows = (born: readonly number[]) => born.every((at, index) => index === 0 || at >= born[index - 1]!)

/**
 * A batch wide enough that its stagger outlasts the work between two scans, so
 * a batch that took its own start lands measurably ahead of this one's tail.
 */
const WIDE = `x${'y'.repeat(199)}`

test('a second append starts no earlier than the one before it', () => {
  const state = createRevealState()
  const { scan } = scannerFor(state)
  const container = streamingContainer('Hello')
  scan(null)
  state.liveRuns.length = 0
  append(scan, container, `Hello ${WIDE}`)
  const first = [...state.liveRuns]
  append(scan, container, `Hello ${WIDE}z`)
  const second = state.liveRuns.filter((run: RevealRun) => !first.includes(run))
  expect(first.length).toBe(200)
  expect(second.length).toBe(1)
  expect(second[0]!.bornAt).toBeGreaterThanOrEqual(first[first.length - 1]!.bornAt)
})

test('two containers streaming at once queue behind each other', () => {
  const state = createRevealState()
  const { scan } = scannerFor(state)
  const reasoning = streamingContainer('Thinking')
  const answer = streamingContainer('Answer')
  scan(null)
  state.liveRuns.length = 0
  const reasoningRecords = recordsOf(() => { reasoning.firstChild!.textContent = `Thinking ${WIDE}` })
  const answerRecords = recordsOf(() => { answer.firstChild!.textContent = 'Answer here' })
  scan(new Set([reasoning, answer]), new Map<Element, MutationRecord[]>([
    [reasoning, reasoningRecords],
    [answer, answerRecords],
  ]))
  const runs = [...state.liveRuns]
  expect(grows(runs.map((run: RevealRun) => run.bornAt))).toBe(true)
  const reasoningBorn = runs.filter((run: RevealRun) => run.container === reasoning)
  const answerBorn = runs.filter((run: RevealRun) => run.container === answer)
  expect(reasoningBorn.length).toBe(200)
  expect(answerBorn.length).toBeGreaterThan(0)
  // The container that wrote second is the one still faint.
  expect(answerBorn[0]!.bornAt).toBeGreaterThanOrEqual(reasoningBorn[reasoningBorn.length - 1]!.bornAt)
})

test('the backlog never stacks up past one fade', () => {
  const state = createRevealState()
  const { scan } = scannerFor(state)
  const container = streamingContainer('Hello')
  scan(null)
  state.liveRuns.length = 0
  for (let round = 1; round <= 3; round += 1) append(scan, container, `Hello ${'x'.repeat(300 * round)}`)
  const now = performance.now()
  const born = state.liveRuns.map((run: RevealRun) => run.bornAt)
  expect(born.length).toBeGreaterThan(300)
  expect(grows(born)).toBe(true)
  // Each round would have pushed its batch a further fade back; the cap closes
  // the queue instead, so no character sits faint for longer than that.
  for (const at of born) expect(at - now).toBeLessThanOrEqual(CHAT_REVEAL_MS)
  expect(Math.max(...born) - Math.min(...born)).toBeLessThanOrEqual(CHAT_REVEAL_MS + 1)
})
