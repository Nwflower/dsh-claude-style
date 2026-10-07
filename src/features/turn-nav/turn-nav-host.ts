import { closestConversationSession, conversationSessionId, findChatTarget, findConversationSession } from '../../core/host'
import { CONVERSATION_SCROLL_SELECTOR, TURN_RAIL_CURRENT_SELECTOR, TURN_RAIL_INSET, TURN_RAIL_MARK_SELECTOR, TURN_RAIL_PITCH, TURN_RAIL_SCROLLER_SELECTOR, TURN_RAIL_SELECTOR } from '../../shared/chat-dom'
import { closestFrom } from '../../shared/dom'
import type { HostContext, HostValue } from '../../core/host'

/** One turn the rail shows: its number, the prompt that opened it, and whether the chat snapshot holds it. */
export interface TurnItem {
  turn: number
  prompt: string
  loaded: boolean
}

/**
 * The host side of the conversation navigator (docs/decisions D34):
 * ui-chat's turn rail, the turns it lists, and the jump that presses its
 * marks.
 *
 * The host's rail (TurnNavigator) stays mounted under the skin's own: its
 * mark's click is the host's whole jump — paging history in first when the
 * turn is outside the loaded window, landing it, and moving the reading
 * position — and its current mark is the host's reading position. Two
 * things follow from the rail's shape. It renders only the marks near its
 * own scroll position, so a jump to a far turn first scrolls the rail until
 * that mark exists. And its marks carry their position in the list, not
 * their turn number, so the turns are read from the same two sources the
 * host merges — the chat snapshot's loaded turns and the whole-log outline
 * — and a mark is trusted only while the rail holds as many marks as that
 * list has turns.
 *
 * @param ctx - client context: the session binding, the chat target and the locale.
 * @returns { findRail, railShown, turnItems, currentIndex, jumpToTurn, chatText, stop }.
 */
export function createTurnNavHost(ctx: HostContext) {
  /** Frames a jump waits for the rail to agree with the list and render the mark. */
  const MARK_WAIT_FRAMES = 30

  /** The rail last found, kept while it stays the shown conversation's. */
  let rail: HTMLElement | null = null
  /** What the turns were built from: the two sources' identities, and the result. */
  let sources: { sessionId: string, outline: HostValue, loaded: HostValue[] } | null = null
  let items: TurnItem[] = []
  /** The jump in flight: its generation and the frame it waits on. */
  let jumpGeneration = 0
  let jumpFrame = 0
  let stopped = false

  /** The shown conversation's rail, or null below two turns or away from the chat view. */
  function findRail() {
    const session = findConversationSession()
    if (rail !== null && rail.isConnected && closestConversationSession(rail) === session) return rail
    rail = session === null ? null : session.querySelector<HTMLElement>(TURN_RAIL_SELECTOR)
    return rail
  }

  /** Whether the rail is laid out: the host hides it when the conversation is narrow. */
  function railShown(found: Element) {
    return found.getClientRects().length > 0
  }

  /** How many marks the rail holds, read off its scroller's content height. */
  function railMarkCount(found: Element) {
    const scroller = found.querySelector(TURN_RAIL_SCROLLER_SELECTOR)
    if (scroller === null) return -1
    return Math.round((scroller.scrollHeight - 2 * (TURN_RAIL_INSET - TURN_RAIL_PITCH / 2)) / TURN_RAIL_PITCH)
  }

  /**
   * The reading position's place in `list`, or -1: its mark is not
   * rendered, or the rail does not hold the list's turns yet.
   */
  function currentIndex(found: Element, list: TurnItem[]) {
    const mark = found.querySelector<HTMLElement>(TURN_RAIL_CURRENT_SELECTOR)
    if (mark === null || railMarkCount(found) !== list.length) return -1
    return Number(mark.dataset.index)
  }

  /** The whole-log outline's current value (the `turnOutline` projection), or undefined. */
  function outlineValue(sessionId: string): HostValue {
    const face = ctx.get('sessions')?.binding(sessionId)?.session?.projections?.faceOf('turnOutline')
    return typeof face?.getSnapshot === 'function' ? face.getSnapshot() : undefined
  }

  /** The loaded window's turns, as the chat snapshot's turn navigation lists them. */
  function loadedTurns(sessionId: string): HostValue[] {
    const target = findChatTarget(ctx, sessionId)
    const navigation = target === null ? undefined : target.getSnapshot()?.navigation
    return typeof navigation?.items === 'function' ? navigation.items() : []
  }

  /**
   * Every turn the rail shows, ascending, as `{ turn, prompt, loaded }` —
   * ui-chat's `mergeTurnRailItems` with its own entry rules: an outline
   * entry whose turn or seq is damaged is dropped, and a turn on both sides
   * keeps the loaded prompt unless that one is empty. The same array comes
   * back until either source's identity moves (the host keeps both arrays'
   * identity until an item changes), so a reader can compare by identity.
   */
  function turnItems(sessionId: string) {
    const outline = outlineValue(sessionId)
    const loaded = loadedTurns(sessionId)
    if (sources !== null && sources.sessionId === sessionId && sources.outline === outline && sources.loaded === loaded) return items
    const byTurn = new Map<number, TurnItem>()
    if (Array.isArray(outline)) {
      for (const entry of outline) {
        if (typeof entry !== 'object' || entry === null) continue
        if (!Number.isSafeInteger(entry.turn) || entry.turn < 0) continue
        if (!Number.isSafeInteger(entry.seq) || entry.seq < 0 || Object.is(entry.seq, -0)) continue
        byTurn.set(entry.turn, { turn: entry.turn, prompt: typeof entry.prompt === 'string' ? entry.prompt : '', loaded: false })
      }
    }
    for (const item of loaded) {
      const outlined = byTurn.get(item.turn)
      byTurn.set(item.turn, { turn: item.turn, prompt: item.prompt !== '' ? item.prompt : outlined?.prompt ?? '', loaded: true })
    }
    sources = { sessionId, outline, loaded }
    items = [...byTurn.values()].sort((left, right) => left.turn - right.turn)
    return items
  }

  /** The host's `chat` namespace translate seat, or null when it is absent. */
  function chatText(): HostValue {
    const locale = ctx.get('locale')
    return typeof locale?.bind === 'function' ? locale.bind('chat') : null
  }

  /**
   * Jump to one turn by pressing its mark. The rail is first scrolled so the
   * mark renders, and nothing is pressed while the rail's mark count and the
   * list disagree (the host commits a new turn a frame after the snapshot
   * carries it). A mark that never renders is a host the rail contract no
   * longer describes, and is said loudly.
   *
   * @param turn - the turn to jump to.
   * @param onPressed - called right after the mark is pressed, with the
   *     conversation's scroller and its position just before the press.
   */
  function jumpToTurn(turn: number, onPressed: (scroller: HTMLElement | null, before: number | null) => void) {
    const generation = ++jumpGeneration
    if (jumpFrame !== 0) cancelAnimationFrame(jumpFrame)
    jumpFrame = 0
    let frames = 0
    let scrolled = false
    const step = () => {
      jumpFrame = 0
      if (stopped || generation !== jumpGeneration) return
      const found = findRail()
      const sessionId = conversationSessionId(findConversationSession())
      if (found === null || sessionId === null) return
      const list = turnItems(sessionId)
      const index = list.findIndex(item => item.turn === turn)
      if (index < 0) return
      if (railMarkCount(found) === list.length) {
        const mark = found.querySelector<HTMLElement>(`${TURN_RAIL_MARK_SELECTOR}[data-index="${index}"]`)
        if (mark !== null) {
          const scroller = closestFrom(found, CONVERSATION_SCROLL_SELECTOR)
          const before = scroller === null ? null : scroller.scrollTop
          mark.click()
          onPressed(scroller, before)
          return
        }
        if (!scrolled) {
          // railMarkCount matched the list, so the scroller it read is there.
          const scroller = found.querySelector(TURN_RAIL_SCROLLER_SELECTOR)!
          scroller.scrollTop = index * TURN_RAIL_PITCH + TURN_RAIL_INSET - scroller.clientHeight / 2
          scrolled = true
        }
      }
      if (++frames > MARK_WAIT_FRAMES) {
        throw new Error(`dsh-claude-style: the turn rail never rendered mark ${index} of ${list.length} (it holds ${railMarkCount(found)})`)
      }
      jumpFrame = requestAnimationFrame(step)
    }
    step()
  }

  return {
    findRail,
    railShown,
    turnItems,
    currentIndex,
    jumpToTurn,
    chatText,
    /** Drop the jump in flight. */
    stop() {
      stopped = true
      if (jumpFrame !== 0) cancelAnimationFrame(jumpFrame)
      jumpFrame = 0
      rail = null
    },
  }
}
