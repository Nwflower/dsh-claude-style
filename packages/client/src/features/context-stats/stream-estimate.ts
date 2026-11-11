import { CHAT_CALL_SELECTOR, CHAT_CALL_TOOL_ATTRIBUTE, CHAT_CALL_TOOL_SELECTOR, CONVERSATION_SCROLL_SELECTOR, STREAMING_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { batchAdditions, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { findConversationScroller } from '@dsh-claude-style/engine/host'
import { callTokens } from './call-tokens'
import { estimateScale, recordSettlement } from './estimate-scale'
import { textTokens } from './text-tokens'

/**
 * The tokens a streaming answer has added so far, as an estimate.
 *
 * The host settles its usage a step at a time (`tokenUsage` moves on
 * `assistant/message`), so the written-back figure would stand still through the
 * answer and jump once the step ends. Pricing the text the streaming containers
 * have grown by lets it move, and the settlement replaces the estimate with the
 * provider's own number.
 *
 * The page's text is thinner than what the provider bills: a tool call's
 * arguments are not on the page at all, and the renderer drops the markers it
 * parses. Each call row therefore counts its tool's own price beside the text
 * (text-tokens.ts, call-tokens.ts), read off the structure bus rather than per
 * frame. Both prices were fitted to one provider's tokenizer, so each model's
 * settlements carry a multiplier between 0.9 and 1.1 that the figure is written
 * at; the grown tokens stay unscaled, so a settlement compares the fitted
 * estimate with the host's number (estimate-scale.ts).
 */
/**
 * How old the last reading may be before the streamed text is read again: a full
 * reading walks every streaming container's text, and the figure is a meter, not
 * a ticker (#211). The first reading, a settlement and a session switch stay
 * immediate.
 */
const SCAN_MS = 800

/**
 * The estimate's reader. A batch is heard as the page's changes settle, so the
 * page it meets is not the page it leaves: every row's column is asked at the
 * reading, after the batch has been handed on.
 *
 * @returns { settle, tokens, watch, reset, stop }, where `watch` puts the
 *   structure bus behind the call rows, `reset` is a session switch and `stop`
 *   takes the bus away with the rest of the teardown.
 */
export function createStreamEstimate(onChange: () => void) {
  /** The settled output total the estimate rides on, or null before the first reading. */
  let settled: number | null = null
  /** The tokens the streamed text has grown by since that settlement. */
  let grown = 0
  /** When the page was last read; zero, so the first reading is always due. */
  let readAt = 0
  /** The frame clock the estimate's readings run on; zero before the first reading. */
  let clock = 0
  /** The streaming containers seen, with the tokens their text stood at. */
  const seen = new Map<Element, number>()
  /** The streaming container the page has held since the settlement, or null. */
  let streamingSeen: Element | null = null
  /** The call rows this session has accounted for, so none of them counts twice. */
  const holds = new Set<Element>()
  /** The rows this reading has to count, with the column each was met in. */
  let batchRows: (Element | null)[] = []
  /** The batch's nodes the page did not hold, asked for their column at the reading. */
  let batchNodes: Element[] = []
  /** How many structure batches have come, so a reading knows when to look again. */
  let batches = 0
  let readBatches = 0
  /** The structure bus, and the token that marks the batches gathered under it. */
  let watching: (() => void) | null = null
  let watchingToken = 0
  /**
   * The ratios each model's settlements have shown, and the multiplier they put
   * the estimate at. The learning outlives a session switch: it is a fact about
   * the route's tokenizer, not about the conversation on screen.
   */
  const ratios = new Map<string, readonly number[]>()
  const scales = new Map<string, number>()

  /** The multiplier this model's estimate is written at (estimate-scale.ts). */
  function scaleOf(model: string | null) {
    return scales.get(model ?? '') ?? 1
  }

  /** Learn from one settlement: the model's ratio list, and the multiplier it writes. */
  function learn(model: string | null, estimated: number, settled: number) {
    const key = model ?? ''
    const previous = ratios.get(key) ?? []
    const samples = recordSettlement(previous, estimated, settled)
    if (samples === previous) return
    ratios.set(key, samples)
    scales.set(key, estimateScale(samples))
  }

  /** The conversation column a node stands in, or null when it stands in none. */
  function conversationOf(node: Element | null): Element | null {
    if (node === null || node.parentElement === null) return null
    return node.parentElement.closest(CONVERSATION_SCROLL_SELECTOR)
  }

  /** Note the streaming container the batch's nodes brought, if the settlement has met none yet. */
  function markStreaming(nodes: Iterable<Node>) {
    if (streamingSeen !== null) return
    for (const node of nodes) {
      if (!(node instanceof Element) || node.matches(CONVERSATION_SCROLL_SELECTOR)) continue
      streamingSeen = node.matches(STREAMING_SELECTOR) ? node : node.querySelector(STREAMING_SELECTOR)
      if (streamingSeen !== null) return
    }
  }

  /** Note the rows `node` carries as belonging to `column`. */
  function noteRows(column: Element | null, node: Element) {
    if (node.matches(CHAT_CALL_SELECTOR)) batchRows.push(node, column)
    for (const row of node.querySelectorAll(CHAT_CALL_SELECTOR)) batchRows.push(row, column)
  }

  /**
   * Take the nodes one structure batch brought in, without reading the
   * conversation: a node put into a column holds that column's rows, one inside a
   * column holds the record target's rows, and one the page does not hold yet is
   * asked for its column at the reading. An addition carrying no call row —
   * streamed text, the composer — is left after one scoped query.
   *
   * @param records - this batch's records.
   */
  function noteStructure(records: MutationRecord[]) {
    for (const node of batchAdditions(records).added) {
      const carries = node.matches(CHAT_CALL_SELECTOR) || node.querySelector(CHAT_CALL_SELECTOR) !== null
      if (!carries) continue
      if (node.matches(CONVERSATION_SCROLL_SELECTOR)) noteRows(node, node)
      else {
        const column = conversationOf(node)
        if (column !== null) noteRows(column, node)
        else batchNodes.push(node)
      }
    }
  }

  /** The tokens one container's text is worth, its runs read across the nodes. */
  function countText(container: Element) {
    const texts: string[] = []
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) texts.push((node as Text).data)
    return textTokens(texts)
  }

  /**
   * The estimate right now, reading the page again when the last reading is old
   * enough. Between the due ones it answers the structure batches alone: asking
   * costs the streaming mark and the nodes a batch brought, while a full reading
   * walks every container's text. The figure is written at the multiplier the
   * model's settlements have earned; the grown tokens stay unscaled.
   *
   * @param model - the model answering, or null while the page names none.
   * @param now - the frame's time, so the interval rides the pipeline's clock.
   */
  function tokens(model: string | null, now = performance.now()) {
    const scale = scaleOf(model)
    if (clock === 0) clock = now
    // A reading between the due ones answers the structure batches alone, and
    // only when one brought a call row; a batch of streamed text leaves nothing.
    if (now - readAt < SCAN_MS) {
      if (readBatches === batches) return grown * scale
      if (batchRows.length === 0 && batchNodes.length === 0) {
        readBatches = batches
        return grown * scale
      }
      return readCalls(findConversationScroller()) * scale
    }
    readAt = now
    const scroller = findConversationScroller()
    const containers = [...(scroller ?? document.body).querySelectorAll(STREAMING_SELECTOR)]
    markStreaming(containers)
    const live = new Set<Element>()
    for (const container of containers) {
      // A reasoning body inside the answer's own streaming markdown is counted
      // with the outer container alone.
      const parent = container.parentElement
      if (parent !== null && parent.closest(STREAMING_SELECTOR) !== null) continue
      live.add(container)
      const counts = countText(container)
      // A container seen for the first time is a baseline: text already on the
      // page belongs to a settlement, and counting it again would double the figure.
      const before = seen.get(container)
      if (before !== undefined) grown += Math.max(0, counts - before)
      seen.set(container, counts)
    }
    for (const container of seen.keys()) if (!live.has(container)) seen.delete(container)
    return readCalls(scroller) * scale
  }

  /**
   * The tool a call row runs, or null while the page has not named it: a row met
   * before the host's tool view is mounted is priced as an unknown call.
   */
  function toolOf(row: Element) {
    const view = row.querySelector(CHAT_CALL_TOOL_SELECTOR)
    return view === null ? null : view.getAttribute(CHAT_CALL_TOOL_ATTRIBUTE)
  }

  /**
   * Count the call rows the structure batches brought since the last reading.
   *
   * A step that streams no text (a call inside a call) has no streaming
   * container, so its rows count as they arrive; a step that streams text owns
   * everything the batch brings in that step. A row already accounted for stays
   * so, a row the host re-renders in place being the same row. Each row counts
   * its tool's own price (call-tokens.ts): a step that only calls a tool has no
   * text to price, and a mean over every tool would price a `read` like a
   * `write`. Before this session's first settlement the page's rows are history:
   * they are held without counting.
   *
   * @param scroller - the conversation column, or null outside one.
   */
  function readCalls(scroller: Element | null) {
    if (readBatches === batches) return grown
    readBatches = batches
    const streaming = streamingSeen !== null
    const nodes = batchNodes
    batchNodes = []
    for (const node of nodes) if (node.isConnected) noteRows(conversationOf(node), node)
    const rows = batchRows.splice(0)
    for (let index = 0; index < rows.length; index += 2) {
      const row = rows[index] as Element
      if (!row.isConnected || holds.has(row)) continue
      const price = callTokens(toolOf(row))
      if (streaming) {
        // The step that streams owns the rows its column has just taken in.
        if (conversationOf(row) !== scroller) continue
        grown += price
        holds.add(row)
      } else {
        holds.add(row)
        if (settled !== null) grown += price
      }
    }
    return grown
  }

  /** Forget the estimate, every container and every row. */
  function forget() {
    settled = null
    grown = 0
    clock = 0
    readAt = 0
    seen.clear()
    streamingSeen = null
    holds.clear()
    batchRows = []
    batchNodes = []
    readBatches = batches
  }

  return {
    /**
     * Take the settled output total. A new one is a step's settlement: the
     * estimate starts over, and the next reading re-baselines the containers still
     * streaming, so text the settled number already covers is not counted again.
     * A settlement also makes the next reading due, and its difference from `grown`
     * is one ratio for the model's multiplier (estimate-scale.ts). A total that
     * fell, and the first after the page opened, are no reading.
     *
     * @param outputTokens - the session's settled output total.
     * @param model - the model that answered the step, or null while the page
     *   names none.
     */
    settle(outputTokens: number, model: string | null) {
      if (settled === outputTokens) return
      if (settled !== null && outputTokens > settled) learn(model, grown, outputTokens - settled)
      settled = outputTokens
      readAt = clock
      grown = 0
      seen.clear()
      streamingSeen = null
      // What arrived before this settlement is the settled step's: the batch
      // still waiting for a reading is dropped with it.
      batchRows = []
      batchNodes = []
      for (const row of holds) if (!row.isConnected) holds.delete(row)
    },
    /** The estimate, reading the page again if the last reading is old enough. */
    tokens,
    /**
     * Watch the structure: the call rows, and the streaming container that marks
     * the step now running. It subscribes before any other subscriber, so a record
     * reaching here first finds the page as the change left it.
     */
    watch() {
      watching?.()
      watchingToken += 1
      const token = watchingToken
      watching = subscribeMutations(document.body, { childList: true, characterData: true, subtree: true }, (records) => {
        if (token !== watchingToken) return
        const scroller = findConversationScroller()
        const inside = (node: Node) => scroller !== null && (node === scroller || scroller.contains(node))
        const relevant = records.some((record) => inside(record.target) || [...record.addedNodes].some(inside))
        // A caret, mascot or settings edit outside this conversation has no
        // reading to wake. Streaming work coalesces into one numbers frame.
        if (!relevant) return
        onChange()
        batches += 1
        markStreaming(batchAdditions(records).added)
        noteStructure(records)
      })
    },
    /** Forget the estimate, every container and every row (a session switch). */
    reset() {
      forget()
    },
    /** Forget the estimate and let the bus go (the teardown). */
    stop() {
      watching?.()
      watching = null
      watchingToken += 1
      forget()
    },
  }
}
