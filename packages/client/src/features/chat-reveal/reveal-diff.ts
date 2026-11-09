import { STREAMING_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { appendRevealSnapshot, revealEntryAt, revealTextSlice } from './reveal-text'
import {
  CHAT_REVEAL_ACTIVE_LIMIT,
  CHAT_REVEAL_BURST_LIMIT,
  CHAT_REVEAL_FIRST_SIGHT_LIMIT,
  CHAT_REVEAL_LOCAL_REWRITE_LIMIT,
  CHAT_REVEAL_MAX_STAGGER_MS,
  CHAT_REVEAL_MIN_STAGGER_MS,
  CHAT_REVEAL_MS,
  CHAT_REVEAL_REWRITE_DIFF_BUDGET,
  CHAT_REVEAL_STAGGER_DIVISOR,
} from './reveal-params'
import type { RevealRun, RevealSnapshot, RevealState, RevealTextEntry } from './reveal-params'

/** What a scan needs from the rest of the engine: the colour it publishes and the repaint it forces. */
interface RevealScanHooks {
  publishRunColor: (element: HTMLElement | null) => void
  paint: (now: number, fromFrame: boolean) => void
}

/** The characters two strings share at their front; a streamed append is the native test. */
function commonHead(left: string, right: string) {
  if (left.length <= right.length && right.startsWith(left)) return left.length
  if (right.length <= left.length && left.startsWith(right)) return right.length
  const limit = Math.min(left.length, right.length)
  let shared = 0
  while (shared < limit && left.charCodeAt(shared) === right.charCodeAt(shared)) shared += 1
  return shared
}

/** The characters two strings share at their end, for a batch that closed a marker rather than appended. */
function commonTail(left: string, right: string) {
  if (left.length <= right.length && right.endsWith(left)) return left.length
  if (right.length <= left.length && left.endsWith(right)) return right.length
  const limit = Math.min(left.length, right.length)
  let shared = 0
  while (shared < limit && left.charCodeAt(left.length - 1 - shared) === right.charCodeAt(right.length - 1 - shared)) shared += 1
  return shared
}

/**
 * How many leading characters the batch left untouched, read off the nodes: a
 * node that kept its place and its text carries unchanged characters, and only
 * the node a batch really rewrote is compared by its own characters.
 */
function commonPrefix(previous: RevealSnapshot | undefined, entries: readonly RevealTextEntry[]) {
  if (previous === undefined) return 0
  const before = previous.entries
  const limit = Math.min(before.length, entries.length)
  let prefix = 0
  for (let index = 0; index < limit; index += 1) {
    const kept = before[index]
    const next = entries[index]
    if (kept === undefined || next === undefined) break
    if (kept.node !== next.node) break
    if (kept.data === next.data) {
      prefix = next.start + next.data.length
      continue
    }
    return next.start + commonHead(kept.data, next.data)
  }
  return prefix
}

/**
 * How many trailing characters the batch left untouched. The suffix never
 * reaches into the prefix, exactly as a character-by-character walk stops
 * short of it.
 */
function commonSuffix(previous: RevealSnapshot | undefined, entries: readonly RevealTextEntry[], prefix: number) {
  if (previous === undefined) return 0
  const before = previous.entries
  const overlap = Math.min(previous.length, entries.length === 0 ? 0 : entries[entries.length - 1]!.start + entries[entries.length - 1]!.data.length) - prefix
  let suffix = 0
  const limit = Math.min(before.length, entries.length)
  for (let back = 1; back <= limit; back += 1) {
    const kept = before[before.length - back]
    const next = entries[entries.length - back]
    if (kept === undefined || next === undefined) break
    if (kept.node !== next.node) break
    const room = overlap - suffix
    if (room <= 0) break
    if (kept.data === next.data) {
      suffix += Math.min(next.data.length, room)
      continue
    }
    suffix += Math.min(commonTail(kept.data, next.data), room)
    break
  }
  return suffix
}

/**
 * The scan's entry point, with the engine's segments and snapshots in `state`.
 *
 * @param state - the engine's state; this module writes its segments and snapshots.
 * @param hooks - the colour publisher and the paint a scan forces.
 * @returns scan.
 */
export function createRevealScanner(state: RevealState, hooks: RevealScanHooks) {
  const { paint, publishRunColor } = hooks

  /**
   * Compare the streaming containers against their last snapshots and queue
   * the characters that just appeared.
   * @param only - look at these containers alone (the ones this batch of
   *     mutations touched); null looks at every container on the page and
   *     drops the ones that are gone.
   */
  return (only: Set<Element> | null, changes?: ReadonlyMap<Element, readonly MutationRecord[]>) => {
    const now = performance.now()
    let containers: Element[]
    if (only === null) {
      containers = [...document.querySelectorAll(STREAMING_SELECTOR)]
      // Containers no longer streaming lose their snapshots and their
      // segments: a snapshot holds the message's text nodes (and the text they
      // carried when it was read), so a finished answer would otherwise stay
      // reachable through this engine for the rest of the session.
      const live = new Set(containers)
      const vanished = new Set<Element>()
      for (const gone of state.liveContainers) {
        if (live.has(gone)) continue
        state.textSnapshots.delete(gone)
        vanished.add(gone)
      }
      if (vanished.size > 0) {
        // Compacted in place, not spliced one removal at a time: a segment
        // count runs into the thousands, and a splice moves every later
        // element (reveal-paint.ts says the same of its own pass).
        let kept = 0
        for (let index = 0; index < state.liveRuns.length; index += 1) {
          const run = state.liveRuns[index]
          if (run === undefined || vanished.has(run.container)) continue
          state.liveRuns[kept] = run
          kept += 1
        }
        state.liveRuns.length = kept
      }
      state.liveContainers = containers
    } else {
      containers = [...only].filter(container => container.isConnected && container.matches(STREAMING_SELECTOR))
      for (const container of containers) if (!state.liveContainers.includes(container)) state.liveContainers.push(container)
    }
    if (containers.length === 0) return
    /** The main thread is busy and the engine has given way: snapshots are still updated, the batch just does not fade. */
    const yielding = now < state.yieldUntil
    /** The segments this scan created, grouped so the stagger can be handed out per batch. */
    const createdRuns: RevealRun[] = []
    for (const container of containers) {
      const batchStart = createdRuns.length
      const previous = state.textSnapshots.get(container)
      const beforeLength = previous?.length ?? 0
      const appended = appendRevealSnapshot(previous, changes?.get(container))
      const entries: RevealTextEntry[] = appended?.entries ?? []
      let length = appended?.length ?? 0
      if (appended === null) {
        // Structural changes rebuild the index; tail-only text mutations keep it.
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
        let node = walker.nextNode()
        while (node !== null) {
          const textNode = node as Text
          const data = textNode.data
          entries.push({ node: textNode, start: length, data })
          length += data.length
          node = walker.nextNode()
        }
      }
      state.textSnapshots.set(container, { length, entries })

      // The first sight of this container. One that was on the page when the
      // engine installed is history; one that appears already long (a session
      // switch, a page of history mounting) counts as history too. Only one
      // that appeared after install without much text — a new answer — has its
      // opening characters counted as new.
      if (previous === undefined && (state.historyContainers.has(container) || length > CHAT_REVEAL_FIRST_SIGHT_LIMIT)) continue

      // This batch's two stable stretches: segments inside the common prefix
      // keep their place, ones inside the common suffix move as a whole, and
      // only the middle was really rewritten. Expanding or folding a thinking
      // row is exactly that shape — text at the front swaps between summary and
      // content while the answer streaming at the back does not move a
      // character, and those characters must not freeze because the reader
      // touched a control. Killing every segment in the container on any
      // reflow would snap half-faded text to solid.
      //
      // The stretches are read off the nodes: a node that kept its place and
      // its text carries unchanged characters, and only the one or two nodes a
      // batch really touched are compared character by character. A streamed
      // append is the batch that matters most, and its check is the native
      // prefix test below rather than a loop over the whole answer.
      const prefix = appended === null ? commonPrefix(previous, entries) : beforeLength
      const suffix = appended === null ? commonSuffix(previous, entries, prefix) : 0
      const stableFrom = beforeLength - suffix
      const shift = length - beforeLength
      if (appended === null) {
        let kept = 0
        for (let index = 0; index < state.liveRuns.length; index += 1) {
          const run = state.liveRuns[index]
          if (run === undefined) continue
          if (run.container !== container || run.start + run.length <= prefix) {
            state.liveRuns[kept] = run
            kept += 1
            continue
          }
          if (run.start >= stableFrom) {
            // Stable suffix segments move together and retain their age.
            state.liveRuns[kept] = { ...run, start: run.start + shift }
            kept += 1
          }
        }
        state.liveRuns.length = kept
      }

      if (yielding) continue

      // The reader just folded or unfolded something: this change came from
      // that reflow, not from the model emitting characters.
      const quietUntil = state.foldQuietUntil.get(container)
      if (quietUntil !== undefined && now <= quietUntil) continue

      // The characters that just appeared. On a plain append they are the
      // trailing stretch; when markdown closes a marker (** or a backtick or a
      // link) they sit inside the old text, and those characters should fade
      // too.
      //
      // The middle is what the rewrite check looks at: strip the common prefix
      // and suffix from both sides, align what is left with one
      // character-level longest-common-subsequence pass, and the new
      // characters are the ones that do not match. A large middle is given up
      // on — a whole-block rewrite (the final re-layout at the end of a
      // stream, a switch of rendering branch) must not make the reader watch
      // the fade again, and only a small close is worth animating.
      const oldMiddleLength = beforeLength - prefix - suffix
      const newMiddleLength = length - prefix - suffix
      if (newMiddleLength === 0) continue
      const available = Math.max(0, CHAT_REVEAL_ACTIVE_LIMIT - state.liveRuns.length)
      if (oldMiddleLength === 0 && newMiddleLength > Math.min(CHAT_REVEAL_BURST_LIMIT, available)) continue
      if (oldMiddleLength > 0 && oldMiddleLength * newMiddleLength > CHAT_REVEAL_REWRITE_DIFF_BUDGET) continue
      // The middles are materialised only now, and only as far as the budget
      // above lets them be: the common batch (an append) leaves the old middle
      // empty and pays for nothing here.
      const oldMiddle = oldMiddleLength === 0 || previous === undefined ? '' : revealTextSlice(previous.entries, prefix, stableFrom)
      const newMiddle = revealTextSlice(entries, prefix, length - suffix)

      // Whether each new character matches one in the old text. With an empty
      // old middle every character is new and no alignment is needed.
      const matched = new Uint8Array(newMiddle.length)
      if (oldMiddle.length > 0) {
        // A bottom-up common-subsequence length table, walked back to decide
        // which new characters match the old text.
        const columns = newMiddle.length + 1
        const lengths = new Uint16Array((oldMiddle.length + 1) * columns)
        for (let row = oldMiddle.length - 1; row >= 0; row -= 1) {
          for (let column = newMiddle.length - 1; column >= 0; column -= 1) {
            const sameCharacter = oldMiddle.charCodeAt(row) === newMiddle.charCodeAt(column)
            lengths[row * columns + column] = sameCharacter
              ? (lengths[(row + 1) * columns + column + 1] ?? 0) + 1
              : Math.max(lengths[(row + 1) * columns + column] ?? 0, lengths[row * columns + column + 1] ?? 0)
          }
        }
        let matchedCount = 0
        let row = 0
        let column = 0
        while (row < oldMiddle.length && column < newMiddle.length) {
          if (oldMiddle.charCodeAt(row) === newMiddle.charCodeAt(column)) {
            matched[column] = 1
            matchedCount += 1
            row += 1
            column += 1
            continue
          }
          // Walk towards the larger table value.
          const skipOldRow = lengths[(row + 1) * columns + column] ?? 0
          const skipNewColumn = lengths[row * columns + column + 1] ?? 0
          const advanceOldRow = skipOldRow >= skipNewColumn
          if (advanceOldRow) row += 1
          if (!advanceOldRow) column += 1
        }
        if (matchedCount === 0 || newMiddle.length - matchedCount > CHAT_REVEAL_LOCAL_REWRITE_LIMIT) continue
      }

      // The unmatched new characters are the batch; consecutive ones merge
      // into one stretch.
      const addedRanges = []
      let rangeStart = -1
      for (let index = 0; index < newMiddle.length; index += 1) {
        if (matched[index] === 1) {
          if (rangeStart >= 0) addedRanges.push({ start: rangeStart + prefix, end: index + prefix })
          rangeStart = -1
          continue
        }
        if (rangeStart < 0) rangeStart = index
      }
      if (rangeStart >= 0) addedRanges.push({ start: rangeStart + prefix, end: newMiddle.length + prefix })
      if (addedRanges.length === 0) continue
      // Too many characters at once do not fade: thousands together read as a
      // blur, and the segment count is the character count multiplied into
      // every frame (one Range per segment).
      let addedLength = 0
      for (const range of addedRanges) addedLength += range.end - range.start
      if (addedLength > Math.min(CHAT_REVEAL_BURST_LIMIT, available)) continue

      // The walk goes node by node rather than over the joined string: every
      // segment has to carry the element it renders in (that is where the step
      // rules read the colour from), and a node's text always renders in one
      // element. Characters inside one node are born together, and the stagger
      // is handed out by position after the walk — the step-like "the whole
      // line lights up at once" is exactly what the stagger spreads out.
      // Iteration is by code point, so a surrogate pair is one segment;
      // whitespace takes no segment of its own but still advances the offset.
      const touchedElements = new Set<Element>()
      for (const range of addedRanges) {
        for (let index = revealEntryAt(entries, range.start); index < entries.length; index += 1) {
          const entry = entries[index]!
          if (entry.start >= range.end) break
          const begin = Math.max(range.start, entry.start)
          const end = Math.min(range.end, entry.start + entry.node.data.length)
          const element = entry.node.parentElement
          let offset = begin
          for (const character of entry.node.data.slice(begin - entry.start, end - entry.start)) {
            if (character.trim().length === 0) {
              offset += character.length
              continue
            }
            // One style read per element per scan: a batch of text usually
            // lands in one or two nodes, so even a whole paragraph arriving
            // at once costs a few reads.
            if (element !== null && !touchedElements.has(element)) {
              touchedElements.add(element)
              publishRunColor(element)
            }
            const run: RevealRun = {
              container,
              start: offset,
              length: character.length,
              bornAt: now,
              delay: 0,
              // The element it renders in is remembered as soon as it is
              // queued, so the synchronous paint right after does not read the
              // colour again. One colour read is one forced style resolution,
              // and this read would land exactly on the frame the new character
              // was inserted and the styles just went stale. If the element really
              // is replaced
              // (the markdown layer rebuilding nodes) the paint's comparison
              // still notices and the colour is written again.
              colorElement: element,
            }
            state.liveRuns.push(run)
            createdRuns.push(run)
            offset += character.length
          }
        }
      }
      // The batch is staggered by its characters' order in the stream: the
      // whole batch spreads over no more than one fade, so inserting several
      // hundred characters does not make the tail wait seconds. More
      // characters means a smaller step each, and the sweep stays continuous;
      // smaller shows no sweep, larger makes the last characters late.
      const batchCount = createdRuns.length - batchStart
      const staggerLimit = Math.min(CHAT_REVEAL_MAX_STAGGER_MS, Math.max(CHAT_REVEAL_MIN_STAGGER_MS, CHAT_REVEAL_MS / CHAT_REVEAL_STAGGER_DIVISOR))
      const step = batchCount <= 1 ? 0 : Math.min(staggerLimit, CHAT_REVEAL_MS / (batchCount - 1))
      for (let slot = batchStart; slot < createdRuns.length; slot += 1) {
        const run = createdRuns[slot]
        if (run === undefined || step === 0) continue
        run.delay = (slot - batchStart) * step
      }
    }
    if (createdRuns.length === 0) return
    // A new character has to carry the faintest step within the same frame.
    // Scheduling a paint waits for the next rendering step, and this scan can
    // run right after this step's rAF phase — the character would then be
    // painted at full strength for one frame and pressed back to faint on the
    // next, which the eye reads as a flash. So it is painted synchronously:
    // the segment exists and has its alpha immediately.
    if (state.cancelPaintFrame !== null) {
      state.cancelPaintFrame()
      state.cancelPaintFrame = null
    }
    paint(performance.now(), false)
  }
}
