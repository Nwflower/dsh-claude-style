import { requestFrame } from '@dsh-claude-style/engine/frame'
import { closestConversationSession, conversationSessionId, findChatTarget, findConversationSession, sessionOutline } from '@dsh-claude-style/engine/host'
import { hostChatSeat } from '../../core/i18n'
import { CONVERSATION_SCROLL_SELECTOR, TURN_RAIL_CURRENT_SELECTOR, TURN_RAIL_INSET, TURN_RAIL_MARK_SELECTOR, TURN_RAIL_PITCH, TURN_RAIL_SCROLLER_SELECTOR, TURN_RAIL_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { closestFrom } from '@dsh-claude-style/engine/dom'
import type { HostContext, HostText } from '@dsh-claude-style/engine/host'
import type { HostLoadedTurn, HostOutlineTurn } from '@dsh-claude-style/contracts/services'

/** One turn the rail shows: its number, the prompt that opened it, and whether the chat snapshot holds it. */
export interface TurnItem {
  turn: number
  prompt: string
  loaded: boolean
}

/** A native reading position, tied to the rail, turn source and current-mark identities. */
export interface TurnCurrentReading {
  found: Element
  items: TurnItem[]
  mark: HTMLElement | null
  stated: string | null
  marks: number
  index: number
}

/**
 * The host side of the conversation navigator:
 * ui-chat's turn rail, the turns it lists, and the jump that presses its
 * marks.
 *
 * The host's rail (TurnNavigator) stays mounted under the skin's own: its
 * mark's click is the host's whole jump — paging history in first when the
 * turn is outside the loaded window, landing it, and moving the reading
 * position — and its current mark is the host's reading position. Two
 * things follow from the rail's shape. It may render only the marks near its
 * own scroll position, so a jump to a far turn first scrolls the rail until
 * that mark exists. And its marks are addressed by their place in the rail's
 * list, not by turn: a host that virtualises the rail writes that place as
 * `data-index`, one that draws every mark writes nothing, and its order in
 * the rail is then the place — read only while the rail holds as many marks
 * as the skin's list has turns. The turns themselves are read from the same
 * two sources the host merges — the chat snapshot's loaded turns and the
 * whole-log outline.
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
  let sources: { sessionId: string, outline: HostOutlineTurn[] | undefined, loaded: HostLoadedTurn[] } | null = null
  let items: TurnItem[] = []
  /** The jump in flight: its generation and what cancels the frame it waits on. */
  let jumpGeneration = 0
  let cancelJumpFrame: (() => void) | null = null
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

  /** The marks the rail has rendered, in the rail's own order. */
  function railMarks(found: Element) {
    return Array.from(found.querySelectorAll<HTMLElement>(TURN_RAIL_MARK_SELECTOR))
  }

  /** Whether the marks state their place: the rail then renders only the ones near its scroll position. */
  function statesPlaces(found: Element) {
    return found.querySelector(`${TURN_RAIL_MARK_SELECTOR}[data-index]`) !== null
  }

  /**
   * The mark standing at one place in the rail's list: the one that states that
   * place — read only while the rail's content height agrees with the list,
   * since the place is the rail's own numbering — else, where the rail renders
   * every mark, the mark that stands there, again only while the rail and the
   * list hold the same number of turns.
   */
  function markAt(found: Element, index: number, listLength: number) {
    if (statesPlaces(found)) {
      if (railMarkCount(found) !== listLength) return null
      return found.querySelector<HTMLElement>(`${TURN_RAIL_MARK_SELECTOR}[data-index="${index}"]`)
    }
    const marks = railMarks(found)
    return marks.length === listLength ? marks[index] ?? null : null
  }

  /**
   * The reading position's place in `list`, or -1: its mark is absent, the
   * rail's list no longer lines up with the skin's, or the rail renders every
   * mark and holds a different number of them than the list has turns.
   */
  function currentIndex(found: Element, list: TurnItem[]) {
    return indexOfCurrent(found, list, readCurrentMark(found))
  }

  function readCurrentMark(found: Element) {
    const mark = found.querySelector<HTMLElement>(TURN_RAIL_CURRENT_SELECTOR)
    const stated = mark === null ? null : mark.dataset.index ?? null
    const marks = stated === null ? railMarks(found) : null
    return { mark, stated, marks }
  }

  function indexOfCurrent(found: Element, list: TurnItem[], state: ReturnType<typeof readCurrentMark>) {
    if (state.mark === null) return -1
    if (state.stated !== null && /^\d+$/.test(state.stated)) {
      return railMarkCount(found) === list.length ? Number(state.stated) : -1
    }
    const marks = state.marks ?? railMarks(found)
    if (marks.length !== list.length) return -1
    return marks.indexOf(state.mark)
  }

  function sameCurrent(reading: TurnCurrentReading, state: ReturnType<typeof readCurrentMark>) {
    return reading.mark === state.mark && reading.stated === state.stated && reading.marks === (state.marks?.length ?? -1)
  }

  /** Stable mark and item identities keep their logical index; geometry is read only when they change. */
  function readCurrent(found: Element, list: TurnItem[], previous: TurnCurrentReading | null) {
    const state = readCurrentMark(found)
    const stable = previous !== null && previous.found === found && previous.items === list && sameCurrent(previous, state)
    return {
      found, items: list, mark: state.mark, stated: state.stated, marks: state.marks?.length ?? -1,
      index: stable ? previous.index : indexOfCurrent(found, list, state),
    }
  }

  /** The writer validates identities without repeating the native scroll-height measurement. */
  function matchesCurrent(reading: TurnCurrentReading) {
    return sameCurrent(reading, readCurrentMark(reading.found))
  }

  /** The whole-log outline's current value (the `turnOutline` projection), or undefined. */
  function outlineValue(sessionId: string) {
    return sessionOutline(ctx, sessionId)
  }

  /** The loaded window's turns, as the chat snapshot's turn navigation lists them. */
  function loadedTurns(sessionId: string): HostLoadedTurn[] {
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

  /** The host's `chat` namespace translate seat, or null when it is absent (core/i18n). */
  function chatText(): HostText | null {
    return hostChatSeat(ctx)
  }

  /**
   * Jump to one turn by pressing its mark. A rail that renders only some marks
   * is scrolled until the wanted one appears. Where the rail renders every
   * mark, its count against the list is the host's own lag (a new turn lands a
   * frame after the snapshot carries it), so the press waits for the two to
   * agree. A mark that never appears is a host the rail contract no longer
   * describes, and is said loudly.
   *
   * @param turn - the turn to jump to.
   * @param onPressed - called right after the mark is pressed, with the
   *     conversation's scroller and its position just before the press.
   */
  function jumpToTurn(turn: number, onPressed: (scroller: HTMLElement | null, before: number | null) => void) {
    const generation = ++jumpGeneration
    if (cancelJumpFrame !== null) cancelJumpFrame()
    cancelJumpFrame = null
    let frames = 0
    let scrolled = false
    const step = () => {
      cancelJumpFrame = null
      if (stopped || generation !== jumpGeneration) return
      const found = findRail()
      const sessionId = conversationSessionId(findConversationSession())
      if (found === null || sessionId === null) return
      const list = turnItems(sessionId)
      const index = list.findIndex(item => item.turn === turn)
      if (index < 0) return
      const mark = markAt(found, index, list.length)
      if (mark !== null) {
        const scroller = closestFrom(found, CONVERSATION_SCROLL_SELECTOR)
        const before = scroller === null ? null : scroller.scrollTop
        mark.click()
        onPressed(scroller, before)
        return
      }
      if (!scrolled) {
        const scroller = found.querySelector<HTMLElement>(TURN_RAIL_SCROLLER_SELECTOR)
        if (scroller !== null && scroller.scrollHeight > scroller.clientHeight) {
          scroller.scrollTop = index * TURN_RAIL_PITCH + TURN_RAIL_INSET - scroller.clientHeight / 2
          scrolled = true
        }
      }
      if (++frames > MARK_WAIT_FRAMES) {
        throw new Error(`dsh-claude-style: the turn rail never offered a mark for turn ${turn} of ${list.length} (it holds ${railMarkCount(found)})`)
      }
      cancelJumpFrame = requestFrame({ write: step })
    }
    step()
  }

  return {
    findRail,
    railShown,
    turnItems,
    currentIndex,
    readCurrent,
    matchesCurrent,
    jumpToTurn,
    chatText,
    /** Drop the jump in flight. */
    stop() {
      stopped = true
      if (cancelJumpFrame !== null) cancelJumpFrame()
      cancelJumpFrame = null
      rail = null
    },
  }
}
