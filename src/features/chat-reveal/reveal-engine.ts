import { subscribeMutations } from '../../core/bus'
import { requestFrame } from '../../core/frame'
import { isChatFoldToggle } from '../chat-fold/fold-toggle'
import { STREAMING_ATTRIBUTE, STREAMING_SELECTOR } from '../../contracts/dom'

/**
 * The token reveal's engine, ported from dsh-chat-ux: new characters arrive
 * faint and settle to their own colour.
 *
 * The reveal is a change of the text's own alpha, not a swap of colours:
 * characters arrive faint and come to rest, with nothing repainted in some
 * highlight colour. ::highlight() accepts no opacity — its property set is
 * small and does not include it — so alpha rides on `color`, one rule per
 * step (reveal-rules.css).
 *
 * The engine keeps its scope inside the streaming containers: the step rules
 * are scoped under [data-streaming], so elements outside one are filtered out
 * by their ancestor during style matching and pay nothing, and the observer
 * only looks at what changes inside a streaming container. The step count is
 * bounded by what those rules cost: 24 already reads as a continuous fade.
 *
 * A character is drawn the moment it arrives, at the faintest step, by a
 * synchronous paint right after the scan — a scheduled frame would leave one
 * frame of full-strength text, which the eye reads as a flash.
 *
 * @returns a disposer, or null when the browser has no Custom Highlight API.
 *     The reader's animation choice is the installer's business
 *     (chat-reveal.ts), which has to take a running engine down with it.
 */
export const CHAT_REVEAL_STEPS = 24
/** The faintest step: a fifth faint, which still reads as text arriving in both themes. */
export const CHAT_REVEAL_MIN_OPACITY = 0.2
/**
 * How long a character takes to become fully opaque. Not a preference: a longer
 * fade would spread the step rules into visible steps, a shorter one crosses
 * in a single frame. Moving it means moving the step count and its rules too.
 */
export const CHAT_REVEAL_MS = 120
/** The prefix of every highlight name this engine registers (reveal-rules.css carries the same names by hand). */
export const CHAT_REVEAL_HIGHLIGHT_PREFIX = 'dsh-claude-tok-'
/** The custom property an element publishes its own colour to; the step rules read it inside ::highlight(). */
export const CHAT_REVEAL_COLOR_VAR = '--dsh-claude-run-color'
/** The share of one fade a batch's stagger spreads over: proportional to the fade, so neither pace lets staggering take over. */
export const CHAT_REVEAL_STAGGER_DIVISOR = 50
/** The stagger step's bounds: smaller shows no sweep, larger makes the last characters late. */
export const CHAT_REVEAL_MIN_STAGGER_MS = 1
export const CHAT_REVEAL_MAX_STAGGER_MS = 8
/**
 * How long a container is left out of the reveal after a fold.
 *
 * A container carries data-streaming for the whole turn, including the answer
 * that arrives after the reasoning stops, so pressing a thinking or tool row
 * rewrites a container the scan is still reading. This is long enough to cover
 * React's re-render and the mutations it makes, and short enough that a stream
 * resuming right after the press still animates.
 */
export const CHAT_REVEAL_FOLD_QUIET_MS = 400
/**
 * The most characters one batch may hold.
 *
 * The segment count is the batch's character count and multiplies every frame
 * (one Range per segment): a measured fifteen thousand characters arriving at
 * once pushes a single frame to 700 ms, and the frame-gap compensation keeps
 * those segments alive so the page cannot catch up. Real streaming batches run
 * a median of a dozen characters, so this gate is never touched.
 */
export const CHAT_REVEAL_BURST_LIMIT = 10000
/** How many characters a container that just appeared may hold and still count as "the start of an answer". */
export const CHAT_REVEAL_FIRST_SIGHT_LIMIT = 200
/** A gap between frames longer than this means no frame was drawn in between (a hidden page, or a held-up main thread). */
export const CHAT_REVEAL_FRAME_GAP_MS = 40
/** A normal frame at 60 Hz; the compensation subtracts it from the blank so segments continue where they were. */
export const CHAT_REVEAL_NOMINAL_FRAME_MS = 16.7
/** A frame gap longer than this counts as slow: under 20 fps the fade's steps sit for tens of milliseconds each. */
export const CHAT_REVEAL_SLOW_FRAME_MS = 50
/** This many slow frames in a row before the engine gives way; one long task must not switch the fade off. */
export const CHAT_REVEAL_SLOW_FRAME_RUN = 4
/** A gap this long is a hidden page (rAF stopped), not a busy main thread. */
export const CHAT_REVEAL_HIDDEN_GAP_MS = 1000
/** How long after giving way new characters are let through at full strength. */
export const CHAT_REVEAL_YIELD_MS = 3000
/** The most characters the rewritten middle may hold and still be diffed; beyond it the whole block was rewritten. */
export const CHAT_REVEAL_REWRITE_DIFF_BUDGET = 4096
/** The most characters a diffed rewrite may add and still animate. */
export const CHAT_REVEAL_LOCAL_REWRITE_LIMIT = 64

/** One fading stretch of characters. */
interface RevealRun {
  /** The streaming container the characters arrived in. */
  container: Element
  /** Offset into the container's joined text, and how many UTF-16 units. */
  start: number
  length: number
  bornAt: number
  delay: number
  /** The element whose colour was last published for this segment. */
  colorElement: HTMLElement | null
}

/**
 * Install the reveal engine: the step rules' mark, the scan observer, the
 * paint frames and the reader-fold guard.
 *
 * @returns the disposer, or null when this browser cannot draw the fade at all.
 */
export function createChatRevealEngine() {
  const registry = globalThis.CSS?.highlights
  const HighlightConstructor = globalThis.Highlight
  if (registry === undefined || registry === null || typeof HighlightConstructor !== 'function') return null

  /** The segments still fading. */
  const liveRuns: RevealRun[] = []
  /** Streaming containers already on the page when the engine installed: they are history and do not replay. */
  const historyContainers = new WeakSet<Element>()
  for (const container of document.querySelectorAll(STREAMING_SELECTOR)) historyContainers.add(container)
  /** The last paint frame's timestamp; 0 before the first. */
  let lastFrameAt = 0
  /** Each streaming container's text snapshot, written by the scan and reused by the paint. */
  const textSnapshots = new WeakMap<Element, { text: string, entries: { node: Text, start: number }[] }>()
  /** Containers the reader just folded, quiet until this moment. */
  const foldQuietUntil = new WeakMap<Element, number>()
  /** The streaming containers on the page at the last full scan; segments and snapshots of the ones gone are dropped. */
  let liveContainers: Element[] = []
  /** Colours already written onto elements, so an unchanged one skips the style read. */
  const writtenColors = new WeakMap<Element, string>()
  /** Cancels the queued paint frame; null when none. */
  let cancelPaintFrame: (() => void) | null = null
  /** One highlight per step: registered once, its segments swapped every frame. */
  const highlights: (Highlight | null)[] = new Array(CHAT_REVEAL_STEPS).fill(null)
  /** Slow frames in a row; at CHAT_REVEAL_SLOW_FRAME_RUN the engine gives way. */
  let slowFrames = 0
  /** New characters are not queued before this moment: the main thread is busy (see revealYield). */
  let yieldUntil = 0

  /** Unregister every step's highlight. */
  const clearHighlights = () => {
    for (let step = 0; step < CHAT_REVEAL_STEPS; step += 1) {
      if (highlights[step] === null) continue
      registry.delete(CHAT_REVEAL_HIGHLIGHT_PREFIX + step)
      highlights[step] = null
    }
  }

  /**
   * Swap this step's segments for this batch.
   *
   * The registry is written once per step, the first time it is used; after
   * that only the highlight's own segments change. Unregistering and
   * registering all twenty-four names every frame would make the browser
   * rebuild its highlight markers each time. A step that is empty this frame
   * is cleared rather than unregistered — the next frame very likely needs it.
   */
  const showStep = (step: number, ranges: StaticRange[]) => {
    let highlight = highlights[step] ?? null
    if (ranges.length === 0) {
      if (highlight !== null && highlight.size > 0) highlight.clear()
      return
    }
    if (highlight === null) {
      highlight = new HighlightConstructor()
      highlights[step] = highlight
      registry.set(CHAT_REVEAL_HIGHLIGHT_PREFIX + step, highlight)
    } else {
      highlight.clear()
    }
    for (const range of ranges) highlight.add(range)
  }

  /**
   * Publish an element's own colour to CHAT_REVEAL_COLOR_VAR.
   *
   * What matters is the colour the markdown layer actually paints — a link's
   * token, a syntax token, a list marker — not what this module last wrote.
   * The computed colour is read, and skipped entirely when the element still
   * carries the colour recorded for it, which is every frame after the first.
   *
   * A value inherited from an ancestor already is its colour (bold inside a
   * paragraph, body text inside a list item), so nothing is written then: an
   * inline style is a style invalidation, and it would wake anything else on
   * the page watching style attributes.
   */
  const publishRunColor = (element: HTMLElement | null) => {
    if (element === null) return
    const style = window.getComputedStyle(element)
    const color = style.color
    if (writtenColors.get(element) === color) return
    writtenColors.set(element, color)
    if (style.getPropertyValue(CHAT_REVEAL_COLOR_VAR).trim() === color) return
    element.style.setProperty(CHAT_REVEAL_COLOR_VAR, color)
  }

  /**
   * Note the containers a fold is about to reflow.
   *
   * Pressing a thinking row is not the model emitting characters, but the row
   * it toggles lives inside a container that still carries data-streaming, and
   * when the folded summary happens to be a prefix of the expanded content the
   * mutation looks exactly like an append. The click is the only signal that
   * tells them apart, so it is caught before React's handler runs and the
   * containers it can reach are taken out of the reveal.
   */
  const rememberReaderFold = (event: Event) => {
    // This feature's own automatic folding is not the reader's intent: it
    // lands exactly where the reasoning stops and the answer begins.
    if (isChatFoldToggle()) return
    const target = event.target
    if (!(target instanceof Element)) return
    const until = performance.now() + CHAT_REVEAL_FOLD_QUIET_MS
    const ownContainer = target.closest(STREAMING_SELECTOR)
    if (ownContainer !== null) foldQuietUntil.set(ownContainer, until)
    // The control that triggers a fold can live outside the container it
    // reflows, so the subtree is swept too — on clicks only: a key event's
    // target is often the whole body, and sweeping its subtree would quiet
    // every streaming container on the page for one PageUp.
    if (event.type !== 'click') return
    for (const container of target.querySelectorAll(STREAMING_SELECTOR)) foldQuietUntil.set(container, until)
  }

  /**
   * The main thread is full: the segments in hand are settled, and new
   * characters arrive at full strength for a while.
   *
   * The fade would not paint smoothly anyway — every step would sit for tens
   * of milliseconds — and its per-frame work is stacked on top of whatever is
   * already slow. Giving way is better: the text still arrives, it just skips
   * the fade.
   */
  const revealYield = () => {
    yieldUntil = performance.now() + CHAT_REVEAL_YIELD_MS
    slowFrames = 0
    lastFrameAt = 0
    liveRuns.length = 0
    clearHighlights()
  }

  /** Queue the next paint frame. */
  const scheduleFrame = () => {
    cancelPaintFrame = requestFrame({
      write(now) {
        paint(now, true)
      },
    })
  }

  /**
   * Repaint every live segment at its age's step, then queue the next frame.
   * @param now - this frame's timestamp.
   * @param fromFrame - called by a paint frame rather than by the synchronous
   *     repaint a scan does: only these gaps say whether the main thread is busy.
   */
  const paint = (now: number, fromFrame: boolean) => {
    cancelPaintFrame = null
    if (liveRuns.length === 0) {
      clearHighlights()
      return
    }
    // No frame was drawn in a long gap — a hidden page stops rAF, and a busy
    // main thread skips frames while performance.now() keeps running. The
    // undrawn stretch is subtracted from every segment's age so they continue
    // their own fade after the page comes back, rather than all expiring in
    // one frame.
    const previousFrameAt = lastFrameAt
    lastFrameAt = now
    const gap = previousFrameAt === 0 ? 0 : now - previousFrameAt
    // Several slow frames in a row are a full main thread, not one long task:
    // give way. A multi-second blank is a hidden page — nobody is watching,
    // which is not being busy.
    if (fromFrame && gap > CHAT_REVEAL_SLOW_FRAME_MS && gap < CHAT_REVEAL_HIDDEN_GAP_MS) slowFrames += 1
    else if (fromFrame && gap > 0) slowFrames = 0
    if (slowFrames >= CHAT_REVEAL_SLOW_FRAME_RUN) {
      revealYield()
      return
    }
    if (gap > CHAT_REVEAL_FRAME_GAP_MS) {
      const unspent = gap - CHAT_REVEAL_NOMINAL_FRAME_MS
      for (const run of liveRuns) {
        // Segments born in the blank count as born now, or they would wait
        // that same blank out before starting to fade.
        run.bornAt = run.bornAt <= previousFrameAt ? run.bornAt + unspent : now
      }
    }
    /** The segment each step has already drawn this frame; a following segment that touches it is merged in. */
    const drawn: ({ node: Text, start: number, end: number } | null)[] = new Array(CHAT_REVEAL_STEPS).fill(null)
    const buckets: { node: Text, start: number, end: number }[][] = []
    for (let step = 0; step < CHAT_REVEAL_STEPS; step += 1) buckets.push([])
    /** Live segments are compacted in place: splice would move every later element, and a batch of thousands is quadratic. */
    let kept = 0
    for (let index = 0; index < liveRuns.length; index += 1) {
      const run = liveRuns[index]
      if (run === undefined) continue
      const age = now - run.bornAt - run.delay
      // Done: it is as solid as the text around it and needs no highlight.
      if (age >= CHAT_REVEAL_MS) continue
      liveRuns[kept] = run
      kept += 1
      // The scans that queued these segments built the snapshots on their
      // way, and every mutation after that goes through a fresh scan before
      // this frame, so the cache holds what is on screen. Walking the
      // container again here would put an O(whole message) TreeWalker into
      // every frame.
      const snapshot = textSnapshots.get(run.container)
      if (snapshot === undefined) continue

      // The first text node that can hold this segment, found by binary
      // search over the snapshot: character-by-character segments mean many
      // lookups a frame, and scanning from the message's start is too slow.
      const end = run.start + run.length
      let low = 0
      let high = snapshot.entries.length - 1
      let firstIndex = -1
      while (low <= high) {
        const middle = (low + high) >> 1
        const entry = snapshot.entries[middle]
        if (entry === undefined) break
        if (entry.start + entry.node.data.length <= run.start) {
          low = middle + 1
          continue
        }
        firstIndex = middle
        high = middle - 1
      }
      // The segment is no longer in the DOM.
      const firstEntry = snapshot.entries[firstIndex]
      if (firstEntry === undefined) continue
      if (firstEntry.start >= end) continue
      const start = Math.max(0, run.start - firstEntry.start)
      let lastNode = firstEntry.node
      let lastEnd = Math.min(firstEntry.node.data.length, end - firstEntry.start)
      for (let next = firstIndex + 1; next < snapshot.entries.length; next += 1) {
        const entry = snapshot.entries[next]
        if (entry === undefined) break
        if (entry.start >= end) break
        lastNode = entry.node
        lastEnd = Math.min(entry.node.data.length, end - entry.start)
      }
      // The element comes from the text node the segment is in, not from the
      // one the scan saw. The markdown layer rebuilds nodes while a message
      // streams (re-parsing **bold, folding a row); once the element a segment
      // lived in is replaced, the colour written on the old one paints nothing
      // and the new one falls back to the page's default — a flash of body
      // colour instead of a fade.
      //
      // But the colour is read only when the element really changed:
      // publishRunColor's first step is getComputedStyle, a forced style
      // resolution, and a few hundred segments a frame each reading it would
      // drag the page's whole style recalc into rAF. The frames where nothing
      // changed (nearly all of them) need one comparison.
      const element = firstEntry.node.parentElement
      if (element !== run.colorElement) {
        publishRunColor(element)
        run.colorElement = element
      }

      // The step: 0 is faintest, the last is the element's own colour; the
      // mapping is linear in time, so the colour settles at a constant rate.
      const step = age <= 0 ? 0 : Math.floor((age / CHAT_REVEAL_MS) * CHAT_REVEAL_STEPS)
      const bucket = buckets[step]
      if (bucket === undefined) continue
      // Adjacent characters in one text node at one step are the same stretch
      // of text this frame, so one segment holds them: the segment count drops
      // from characters to stretches.
      const previous = drawn[step] ?? null
      if (previous !== null && lastNode === firstEntry.node && previous.node === firstEntry.node && previous.end === start) {
        previous.end = lastEnd
        continue
      }
      const segment = { node: firstEntry.node, start, end: lastEnd }
      drawn[step] = segment
      bucket.push(segment)
    }
    liveRuns.length = kept
    for (let step = 0; step < CHAT_REVEAL_STEPS; step += 1) {
      const list = buckets[step] ?? []
      // A StaticRange does not track DOM changes, and every frame builds them
      // from the fresh snapshot, so tracking is not needed; a live Range would
      // have the page fix its boundaries on every DOM change until collected.
      const ranges = list.map(segment => new StaticRange({
        startContainer: segment.node,
        startOffset: segment.start,
        endContainer: segment.node,
        endOffset: segment.end,
      }))
      showStep(step, ranges)
    }
    if (liveRuns.length > 0) scheduleFrame()
    else clearHighlights()
  }

  /**
   * Compare the streaming containers against their last snapshots and queue
   * the characters that just appeared.
   * @param only - look at these containers alone (the ones this batch of
   *     mutations touched); null looks at every container on the page and
   *     drops the ones that are gone.
   */
  const scan = (only: Set<Element> | null) => {
    const now = performance.now()
    let containers: Element[]
    if (only === null) {
      containers = [...document.querySelectorAll(STREAMING_SELECTOR)]
      // Containers no longer streaming lose their segments with their
      // snapshots: a snapshot is a copy of a whole message, kept alive by its
      // element, and over a long session that is memory growing with the
      // session.
      for (const gone of liveContainers) {
        if (containers.includes(gone)) continue
        textSnapshots.delete(gone)
        for (let index = liveRuns.length - 1; index >= 0; index -= 1) {
          if (liveRuns[index]?.container === gone) liveRuns.splice(index, 1)
        }
      }
      liveContainers = containers
    } else {
      containers = [...only].filter(container => container.isConnected && container.matches(STREAMING_SELECTOR))
      for (const container of containers) if (!liveContainers.includes(container)) liveContainers.push(container)
    }
    if (containers.length === 0) return
    /** The main thread is busy and the engine has given way: snapshots are still updated, the batch just does not fade. */
    const yielding = now < yieldUntil
    /** The segments this scan created, grouped so the stagger can be handed out per batch. */
    const createdRuns: RevealRun[] = []
    for (const container of containers) {
      const batchStart = createdRuns.length
      // First join every text node under the container, remembering each
      // node's offset in the joined string.
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
      const entries: { node: Text, start: number }[] = []
      let text = ''
      let node = walker.nextNode()
      while (node !== null) {
        // SHOW_TEXT: every node the walker yields is a text node.
        const textNode = node as Text
        entries.push({ node: textNode, start: text.length })
        text += textNode.data
        node = walker.nextNode()
      }

      const previous = textSnapshots.get(container)?.text
      textSnapshots.set(container, { text, entries })

      // The first sight of this container. One that was on the page when the
      // engine installed is history; one that appears already long (a session
      // switch, a page of history mounting) counts as history too. Only one
      // that appeared after install without much text — a new answer — has its
      // opening characters counted as new.
      if (previous === undefined && (historyContainers.has(container) || text.length > CHAT_REVEAL_FIRST_SIGHT_LIMIT)) continue
      const before = previous ?? ''

      // This batch's two stable stretches: segments inside the common prefix
      // keep their place, ones inside the common suffix move as a whole, and
      // only the middle was really rewritten. Expanding or folding a thinking
      // row is exactly that shape — text at the front swaps between summary and
      // content while the answer streaming at the back does not move a
      // character, and those characters must not freeze because the reader
      // touched a control. Killing every segment in the container on any
      // reflow would snap half-faded text to solid.
      const overlapLimit = Math.min(before.length, text.length)
      let prefix = 0
      while (prefix < overlapLimit && before.charCodeAt(prefix) === text.charCodeAt(prefix)) prefix += 1
      // The suffix does not overlap the prefix, so the rewritten middle is not
      // claimed by both.
      let suffix = 0
      while (
        suffix < overlapLimit - prefix
        && before.charCodeAt(before.length - 1 - suffix) === text.charCodeAt(text.length - 1 - suffix)
      ) suffix += 1
      const stableFrom = before.length - suffix
      const shift = text.length - before.length
      for (let index = liveRuns.length - 1; index >= 0; index -= 1) {
        const run = liveRuns[index]
        if (run === undefined) continue
        if (run.container !== container) continue
        if (run.start + run.length <= prefix) continue
        if (run.start >= stableFrom) {
          // The same characters, moved as a whole: they follow, keeping their
          // age and their stagger.
          liveRuns[index] = { ...run, start: run.start + shift }
          continue
        }
        liveRuns.splice(index, 1)
      }

      if (yielding) continue

      // The reader just folded or unfolded something: this change came from
      // that reflow, not from the model emitting characters.
      const quietUntil = foldQuietUntil.get(container)
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
      const oldMiddle = before.slice(prefix, before.length - suffix)
      const newMiddle = text.slice(prefix, text.length - suffix)
      if (newMiddle.length === 0) continue
      if (oldMiddle.length > 0 && oldMiddle.length * newMiddle.length > CHAT_REVEAL_REWRITE_DIFF_BUDGET) continue

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
      if (addedLength > CHAT_REVEAL_BURST_LIMIT) continue

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
        for (const entry of entries) {
          if (entry.start + entry.node.data.length <= range.start) continue
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
              // and this read lands exactly on the frame the new character was
              // inserted and the styles just went stale — measured, 190 ms of a
              // 190 ms frame was that read. If the element really is replaced
              // (the markdown layer rebuilding nodes) the paint's comparison
              // still notices and the colour is written again.
              colorElement: element,
            }
            liveRuns.push(run)
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
    if (cancelPaintFrame !== null) {
      cancelPaintFrame()
      cancelPaintFrame = null
    }
    paint(performance.now(), false)
  }

  // Only changes inside a streaming container are looked at: a DOM change
  // anywhere else on the page (another plugin, the sidebar, a timer, the
  // composer) triggers no scan, and a change inside a container rescans only
  // that one. A full look is left to a container appearing, disappearing, or
  // gaining or losing data-streaming.
  const onRecords = (records: MutationRecord[]) => {
    let everything = false
    const touched = new Set<Element>()
    for (const record of records) {
      // data-streaming is watched too: a streaming container is not always "a
      // newly inserted node" — when React adds the attribute to a div already
      // on the page it is one attribute change, and missing it would miss the
      // whole start of that answer.
      if (record.type === 'attributes') {
        everything = true
        continue
      }
      const target = record.target
      const element = target instanceof Element ? target : target.parentElement
      const container = element?.closest(STREAMING_SELECTOR) ?? null
      if (container !== null) touched.add(container)
      if (record.type !== 'childList' || everything) continue
      for (const added of record.addedNodes) {
        if (!(added instanceof Element)) continue
        if (added.matches(STREAMING_SELECTOR) || added.querySelector(STREAMING_SELECTOR) !== null) everything = true
      }
      for (const removed of record.removedNodes) {
        if (liveContainers.some(live => live === removed || removed.contains(live))) everything = true
      }
    }
    if (everything) scan(null)
    else if (touched.size > 0) scan(touched)
  }
  const stopMutations = subscribeMutations(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributeFilter: [STREAMING_ATTRIBUTE],
  }, onRecords)
  document.addEventListener('click', rememberReaderFold, true)
  document.addEventListener('keydown', rememberReaderFold, true)
  scan(null)

  return () => {
    stopMutations()
    document.removeEventListener('click', rememberReaderFold, true)
    document.removeEventListener('keydown', rememberReaderFold, true)
    if (cancelPaintFrame !== null) cancelPaintFrame()
    cancelPaintFrame = null
    liveRuns.length = 0
    clearHighlights()
  }
}
