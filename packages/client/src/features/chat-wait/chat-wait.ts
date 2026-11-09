import { QUIET_ATTR } from '../../constants'
import { observeMatches } from '@dsh-claude-style/engine/bus'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { closestConversationSession, conversationSessionId, findChatTarget } from '@dsh-claude-style/engine/host'
import { hostChatCopy, hostChatSeat } from '../../core/i18n'
import { readPrefs, subscribePrefs } from '../../core/prefs'
import { buildElement, writeTextInPlace } from '@dsh-claude-style/engine/dom'
import { formatHostDuration } from '../../shared/format'
import { motionMs } from '../../shared/motion'
import { releaseSwappingText, setSwappingText } from '../../shared/swapping-text'
import { activityWords, waitingWord, THINKING_KEY } from '../../shared/turn-activity'
import { startWaitLoader, releaseWaitLoader } from './wait-loader'
import { CHAT_FLOW_SELECTOR, CHAT_RUNNING_SELECTOR, CHAT_RUNNING_HOLDING_ATTRIBUTE, CHAT_RUNNING_TEXT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { WAIT_OVERTIME_MS, openTurn, waitStart, wordForPass } from './wait-state'
import { foreignRunningLineOwns } from './running-owner'
import type { RowWords } from './wait-state'
import type { HostChatTarget } from '@dsh-claude-style/contracts/services'
import type { HostContext, HostText } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './chat-wait.manifest'
import { copy, copyState } from './copy'

/** One row's line: its box, the parts every pass writes into it, and the turn it speaks for. */
interface WaitLine {
  line: HTMLElement
  loader: HTMLElement
  label: HTMLElement
  clock: HTMLElement
  badge: HTMLElement
  /** What the row's wording is held under (syncRow): `session:turn` where the snapshot says it, the row itself before that. */
  key: string | HTMLElement
}

/**
 * The live turn's running row: the turn's activity in the line's own words
 * (shared/turn-activity.ts), the brand's wait word where no state can be read
 * (「正在思考」 under Claude, the host's 「深度求索中」 under DeepSeek), the
 * elapsed clock, and 「暂未响应」 past the overtime margin (wait-state.ts).
 * Precise adds a call's file or description and reasoning's clause. A wording
 * stands a whole second (wordForPass), so fast state changes read as one line;
 * the swap is transitions.dev's "Thinking states" (MIT).
 *
 * The host keeps its row and live region: the line is a quiet span beside the
 * host's icon, and the stylesheet hides the host's words while it stands
 * (chat-wait.css). Under the Claude brand the whale tail gives way to the
 * skin's loading dots.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  /** On the host's running row while the line stands in for its words. */
  const WAIT_ATTR = 'data-dsh-claude-wait'
  /** On a running row with no visible flow content after it (chat-wait.css). */
  const TAIL_ATTR = 'data-dsh-claude-wait-tail'
  /** On the host's words alone, leaving sibling plugin lines visible. */
  const WORDS_ATTR = 'data-dsh-claude-wait-words'
  /** On the overtime badge while it plays its way out (syncBadge). */
  const BADGE_LEAVING_ATTR = 'data-dsh-claude-wait-badge-leaving'
  /**
   * The clock's step: fast enough that a replacement which stops owning the
   * words hands the line back without a visible pause, and that the seconds
   * shown never lag the turn by more than a quarter.
   */
  const TICK_MS = 250
  /** The host's running rows, kept current by the bus: a pass reads this instead of querying (D40). */
  const runningRows = observeMatches<HTMLElement>(CHAT_RUNNING_SELECTOR)
  /** Each running row with the line drawn into it and the parts a pass writes. */
  const lines = new Map<HTMLElement, WaitLine>()
  const hostWords = new Map<HTMLElement, Element>()
  /** When each turn's current wait began, by `session:turn`; absent while the model is at work. */
  const waits = new Map<string, number>()
  /**
   * The wording standing on each row, its lock, the call words waiting for it
   * and the model's own words to fall back on (wordForPass). Held under the turn
   * the row speaks for where the snapshot names one: the host builds a fresh row
   * at a step boundary, and a rebuilt row picks up the clause and lock it had.
   */
  const wording = new Map<string | HTMLElement, RowWords>()
  /** Each row's follow of its own session's snapshot, and the session it follows. */
  const follows = new Map<HTMLElement, { sessionId: string, stop: () => void }>()
  let timer: number | null = null
  let cancelTick: (() => void) | null = null
  let queued: Promise<void> | null = null
  let cancelTailPass: (() => void) | null = null
  /** A single frame's tail readings, consumed once by its first write. */
  let tailReadings: Map<HTMLElement, boolean> | null = null
  let stopped = false
  /** The badge exits still playing; the teardown cancels every one of them. */
  const badgeTimers = new Set<number>()

  // The detail choice is read on every pass; a change of it rewrites the line
  // at once rather than waiting out the standing word's lock.
  let detailChoice = readPrefs().statusDetail
  const offDetailChoice = subscribePrefs(prefs => {
    if (prefs.statusDetail === detailChoice) return
    detailChoice = prefs.statusDetail
    wording.clear()
    sync()
  })

  /**
   * One pass per task, for the publishes the host makes: a step that streams
   * publishes several times inside one task, while a tool call is its own task,
   * so the file it names is on the line only if that call is read between its
   * start and its settle. A frame's own pass is the clock's below.
   */
  function scheduleSync() {
    if (queued !== null) return
    queued = Promise.resolve().then(() => {
      queued = null
      sync()
    })
  }

  /**
   * Follow the session's own snapshot while its row stands: the host publishes
   * a call starting and again finishing, and a quarter-second tick would step
   * over a call that had already settled.
   */
  function followRow(row: HTMLElement, sessionId: string | null, target: HostChatTarget | null) {
    const followed = follows.get(row)
    if (sessionId === null || target === null || typeof target.subscribe !== 'function') {
      if (followed !== undefined) {
        followed.stop()
        follows.delete(row)
      }
      return
    }
    if (followed !== undefined && followed.sessionId === sessionId) return
    followed?.stop()
    follows.set(row, { sessionId, stop: target.subscribe(scheduleSync) })
  }

  /**
   * The loader the Claude brand leads the row with, where the host draws its
   * whale tail: one lane of accent dots for each of the loader's three motions
   * (chat-wait.css). Every motion is built up front, so swapping lanes is a
   * hand-over rather than a redraw. The dots are decorative — the host's live
   * region is what a reader hears — and the rotation is wait-loader.ts's.
   */
  function buildLoader() {
    const loader = buildElement('span', 'dsh-claude-chat-wait-loader')
    loader.setAttribute('aria-hidden', 'true')
    const laneDots: [string, number][] = [['is-bounce', 3], ['is-line', 3], ['is-orbit', 4]]
    for (const [lane, count] of laneDots) {
      const dots = buildElement('span', `dsh-claude-chat-wait-lane ${lane}`)
      for (let dot = 0; dot < count; dot += 1) dots.append(buildElement('span', 'dsh-claude-chat-wait-dot'))
      loader.append(dots)
    }
    return loader
  }

  /** The line inside one row, built the first time beside the host's words. */
  function lineOf(row: HTMLElement, words: Element, key: string | HTMLElement): WaitLine {
    const previous = hostWords.get(row)
    if (previous !== words) {
      previous?.removeAttribute(WORDS_ATTR)
      words.setAttribute(WORDS_ATTR, '')
      hostWords.set(row, words)
    }
    const standing = lines.get(row)
    if (standing !== undefined && standing.line.isConnected) {
      // The same row can stand for another turn (the host reuses the running
      // row): the wording is looked up under the turn in hand from here on.
      standing.key = key
      return standing
    }
    const line = buildElement('span', 'dsh-claude-chat-wait')
    line.setAttribute(QUIET_ATTR, '')
    // The host's own words are hidden while this line stands in for them
    // (chat-wait.css); the line's wording, clock and badge are ordinary text,
    // and the host's live region still announces the row. The loader leads
    // them, where the host's own icon stands and stays under the other brands.
    // The badge starts hidden: it comes out only once a wait runs over (syncBadge).
    const label = buildElement('span', 'dsh-claude-chat-wait-label')
    const clock = buildElement('span', 'dsh-claude-chat-wait-clock')
    const badge = buildElement('span', 'dsh-claude-chat-wait-badge')
    badge.hidden = true
    const loader = buildLoader()
    line.append(loader, label, clock, badge)
    words.after(line)
    const parts = { line, loader, label, clock, badge, key }
    // The line is recorded before its loader starts: wait-loader.ts throws on a
    // lane, fade length or turn the stylesheet leaves out, and with the record
    // unwritten every pass would put up another line and another set of dots
    // beside the words.
    lines.set(row, parts)
    // The loader's motions rotate on their own clock, not on what the turn is
    // doing: it is set going here, with the line, and lets go when the row does.
    startWaitLoader(loader)
    return parts
  }

  /** Whether any visible flow content follows the row, including outside a display-contents slot. */
  function followedByContent(row: HTMLElement) {
    const column = row.closest(CHAT_FLOW_SELECTOR)
    if (column === null) return false
    let ancestor: HTMLElement = row
    while (ancestor !== column) {
      for (let sibling = ancestor.nextElementSibling; sibling !== null; sibling = sibling.nextElementSibling) {
        // The host's trailing interaction surface uses visibility:hidden.
        // checkVisibility can flush pending styles, so this classification
        // belongs in the shared read phase, away from publish-time writes.
        if (sibling instanceof HTMLElement && sibling.checkVisibility({ checkVisibilityCSS: true })) return true
      }
      const parent = ancestor.parentElement
      if (parent === null) return false
      ancestor = parent
    }
    return false
  }

  /** Read the pin's classification before any frame task writes its words. */
  function readTails() {
    if (stopped || tailReadings !== null) return
    const readings = new Map<HTMLElement, boolean>()
    if (hostChatSeat(ctx) !== null) {
      for (const row of runningRows.all()) readings.set(row, !followedByContent(row))
    }
    tailReadings = readings
  }

  /** The first writer consumes the readings; later writers have none to reuse. */
  function writeTails() {
    const readings = tailReadings
    tailReadings = null
    if (stopped || readings === null) return
    for (const [row, tail] of readings) {
      if (row.isConnected && row.matches(CHAT_RUNNING_SELECTOR)) row.toggleAttribute(TAIL_ATTR, tail)
    }
  }

  /** Publishes keep their business pass; only the pin waits for the shared frame. */
  function requestTailPass() {
    if (stopped || cancelTailPass !== null) return
    cancelTailPass = requestFrame({
      read: readTails,
      write() {
        cancelTailPass = null
        writeTails()
      },
    })
  }

  /** Bring one row's line to what the host's snapshot says now. */
  function syncRow(row: HTMLElement, t: HostText, now: number, seen: Set<string>, live: Set<string>) {
    // The host keeps the running row's slot after the turn stops, marked
    // `data-holding`, until the actions row replaces it (RunningStatus). It
    // still answers `[data-chat-running]` and holds its content span, so a pass
    // reading it would draw a second line: only the live row is ours.
    if (row.hasAttribute(CHAT_RUNNING_HOLDING_ATTRIBUTE)) {
      release(row)
      return
    }
    const words = row.querySelector<HTMLElement>(CHAT_RUNNING_TEXT_SELECTOR)
    if (words === null || foreignRunningLineOwns(words, lines.get(row)?.line, WORDS_ATTR)) {
      release(row)
      return
    }
    const sessionId = conversationSessionId(closestConversationSession(row))
    const target = sessionId === null ? null : findChatTarget(ctx, sessionId)
    followRow(row, sessionId, target)
    const snapshot = target === null ? null : target.getSnapshot() ?? null
    const turn = snapshot === null ? undefined : openTurn(snapshot)
    const key: string | HTMLElement = sessionId !== null && turn !== undefined ? `${sessionId}:${turn.turn}` : row
    if (typeof key === 'string') live.add(key)
    const line = lineOf(row, words, key)
    const { loader, label, clock, badge } = line
    // What the turn is doing, and the one word its brand waits on for a turn
    // whose state cannot be read (D74). Under the Precise choice three states
    // carry words of their own — a call's file, a command's description, the
    // model's clause — and those are written as they are; Simple reads the bare
    // states. A wording written is locked for a second (wordForPass); a call's
    // words are the one thing that waits for the lock, and the model's own
    // words the one thing that stands between two of them.
    const prefs = readPrefs()
    const precise = prefs.statusDetail === true
    const activity = activityWords(snapshot, turn, precise)
    // One word stands for the model thinking and for a wait nothing can be read
    // from (shared/turn-activity): the skin's under Claude, the host's under
    // DeepSeek. The thinking state answers no word of its own, so the clause
    // standing from before holds the line instead of falling back and returning.
    const waiting = waitingWord(prefs.brand, hostChatCopy('chat.deepDiving', 'Deep diving', ctx), copy(THINKING_KEY))
    const own = activity !== null && activity.key === null && activity.aboutCall === undefined
    const said = activity === null || activity.key === THINKING_KEY
      ? null
      : activity.key === null ? (activity.text ?? '') : copyState(activity.key, activity.params)
    const pass = wordForPass({
      word: said,
      own,
      detail: activity !== null && activity.aboutCall === 'detail' ? said : null,
      onCall: activity !== null && activity.aboutCall === 'generic',
      host: waiting,
    }, wording.get(key), now)
    wording.set(key, pass.row)
    setSwappingText(label, pass.word, true)
    // The loader does not follow that wording: its three motions rotate on its
    // own clock (wait-loader.ts), set going once with the line itself.
    clock.hidden = turn === undefined || turn.start === undefined
    if (turn !== undefined && turn.start !== undefined) writeTextInPlace(clock, formatHostDuration(Math.max(1000, now - turn.start.time), t))
    let overtime = false
    if (snapshot !== null && turn !== undefined && activity === null) {
      const key = `${sessionId}:${turn.turn}`
      seen.add(key)
      let began = waits.get(key)
      if (began === undefined) {
        began = waitStart(turn, now)
        waits.set(key, began)
      }
      overtime = now - began >= WAIT_OVERTIME_MS
    }
    syncBadge(badge, overtime)
    if (!row.hasAttribute(WAIT_ATTR)) row.setAttribute(WAIT_ATTR, '')
  }

  /**
   * The overtime badge comes and goes with motion of its own (chat-wait.css):
   * it shows the moment the wait runs over, and stays laid out on its way out
   * until the exit has played. A wait that runs over again takes it back where
   * it stands.
   */
  function syncBadge(badge: HTMLElement, overtime: boolean) {
    if (overtime) {
      badge.removeAttribute(BADGE_LEAVING_ATTR)
      badge.hidden = false
      writeTextInPlace(badge, copy('chatWaitOvertime'))
      return
    }
    if (badge.hidden || badge.hasAttribute(BADGE_LEAVING_ATTR)) return
    badge.setAttribute(BADGE_LEAVING_ATTR, '')
    const exit = window.setTimeout(() => {
      badgeTimers.delete(exit)
      if (!badge.hasAttribute(BADGE_LEAVING_ATTR)) return
      badge.removeAttribute(BADGE_LEAVING_ATTR)
      badge.hidden = true
    }, motionMs('--dsh-claude-duration-exit'))
    badgeTimers.add(exit)
  }

  /** Take one row's line down and give the host's words back. */
  function release(row: HTMLElement) {
    const parts = lines.get(row)
    if (parts !== undefined) {
      releaseSwappingText(parts.label)
      releaseWaitLoader(parts.loader)
      parts.line.remove()
      // A row standing for no turn holds its own wording; one standing for a
      // turn leaves it to the turn, which its next row picks up again (syncRow).
      if (typeof parts.key !== 'string') wording.delete(parts.key)
    }
    lines.delete(row)
    hostWords.get(row)?.removeAttribute(WORDS_ATTR)
    hostWords.delete(row)
    follows.get(row)?.stop()
    follows.delete(row)
    row.removeAttribute(WAIT_ATTR)
  }

  function syncLines() {
    const t = hostChatSeat(ctx)
    const rows = t === null ? [] : runningRows.all()
    const now = Date.now()
    const seen = new Set<string>()
    const live = new Set<string>()
    for (const row of rows) syncRow(row, t!, now, seen, live)
    // The pass releases the lines of every row the host took away, and a long
    // conversation leaves many behind at once: a membership test per standing
    // line against the running list is the square of the two.
    const running = new Set(rows)
    for (const row of [...lines.keys()]) {
      if (!running.has(row)) release(row)
    }
    // A wait the model ended, or a turn that closed, starts over next time; a
    // turn no row speaks for any more forgets the wording it stood on.
    for (const key of [...waits.keys()]) {
      if (!seen.has(key)) waits.delete(key)
    }
    for (const key of [...wording.keys()]) {
      if (typeof key === 'string' && !live.has(key)) wording.delete(key)
    }
    // Yielded rows stay watched: style-only ownership changes must restore the line.
    if (rows.length > 0 && timer === null) {
      timer = window.setInterval(() => {
        if (cancelTick !== null) return
        cancelTick = requestFrame({
          read: readTails,
          write() {
            cancelTick = null
            syncInFrame()
          },
        })
      }, TICK_MS)
    } else if (rows.length === 0 && timer !== null) {
      window.clearInterval(timer)
      timer = null
    }
  }

  function sync() {
    if (stopped) return
    syncLines()
    requestTailPass()
  }

  function syncInFrame() {
    if (stopped) return
    try {
      syncLines()
    } finally {
      writeTails()
    }
  }

  ui.chatWait = { measure: readTails, sync: syncInFrame, onCopyChange: sync }

  return () => {
    stopped = true
    if (cancelTailPass !== null) cancelTailPass()
    cancelTailPass = null
    tailReadings = null
    offDetailChoice()
    runningRows.release()
    for (const exit of badgeTimers) window.clearTimeout(exit)
    badgeTimers.clear()
    if (timer !== null) window.clearInterval(timer)
    timer = null
    if (cancelTick !== null) cancelTick()
    cancelTick = null
    for (const row of [...lines.keys()]) release(row)
    for (const row of document.querySelectorAll(`[${WAIT_ATTR}], [${TAIL_ATTR}]`)) {
      row.removeAttribute(WAIT_ATTR)
      row.removeAttribute(TAIL_ATTR)
    }
    waits.clear()
    wording.clear()
    // A follow whose row left the page without a pass: release() stops the ones
    // still standing.
    for (const followed of [...follows.values()]) followed.stop()
    follows.clear()
    delete ui.chatWait
  }
}
