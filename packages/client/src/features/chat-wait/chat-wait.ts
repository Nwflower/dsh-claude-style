import { QUIET_ATTR } from '../../constants'
import { observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { closestConversationSession, conversationSessionId, findChatTarget, hostSnapshot } from '@dsh-claude-style/engine/host'
import { hostChatCopy, hostChatSeat } from '../../core/i18n'
import { motionReduced, readPrefs, subscribePrefs } from '../../core/prefs'
import { buildElement, writeTextInPlace } from '@dsh-claude-style/engine/dom'
import { formatHostDuration } from '../../shared/format'
import { motionMs } from '../../shared/motion'
import { releaseSwappingText, setSwappingText } from '../../shared/swapping-text'
import { activityWords, waitingWord, THINKING_KEY } from './turn-activity'
import { sessionProjectionFaces } from '../../shared/session-projections'
import { buildWaitLoader, startWaitLoader, releaseWaitLoader, resyncWaitLoader, setWaitLoaderOutputting } from './wait-loader'
import { CHAT_FLOW_SELECTOR, CHAT_RUNNING_SELECTOR, CHAT_RUNNING_HOLDING_ATTRIBUTE, CHAT_RUNNING_TEXT_SELECTOR, SHIMMER_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { openTurn, overtimeMargin, waitStart, wordForPass } from './wait-state'
import { foreignRunningLineOwns } from './running-owner'
import type { RowWords } from './wait-state'
import type { HostChatTarget, HostSessionStatsProjection } from '@dsh-claude-style/contracts/services'
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
 * the swap is transitions.dev's "Text states swap" (shared/swapping-text.ts).
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
   * The clock's step. The line shows whole seconds, and everything else that
   * moves it — a publish, or a mark the hand-over reads — reaches it through the
   * bus. One pass a second is therefore all the number itself needs.
   */
  const CLOCK_MS = 1000
  /**
   * The host's running rows, kept current by the bus: a pass reads this instead
   * of querying (D40). A row arriving or leaving is a line to draw or hand back,
   * so the registry's own record asks for the pass that does it.
   */
  const runningRows = observeMatches<HTMLElement>(CHAT_RUNNING_SELECTOR, () => scheduleSync())
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
  /** Each running row's watch for the marks the hand-over reads (watchOwnership). */
  const ownershipWatches = new Map<HTMLElement, () => void>()
  let timer: number | null = null
  let cancelTick: (() => void) | null = null
  let queued: Promise<void> | null = null
  let cancelTailPass: (() => void) | null = null
  /** A single frame's tail readings, consumed once by its first write. */
  let tailReadings: Map<HTMLElement, boolean> | null = null
  /**
   * What the last reading saw of one row's surroundings, and the structure it
   * saw it on.
   *
   * Both surroundings questions resolve styles: `followedByContent` asks each
   * sibling whether it is visible, and the foreign-line test lays the words'
   * subtree out through `innerText`. The clock asks once a second, and a row
   * whose chain to the column kept its child counts cannot have gained a line or
   * content below it, so a reading stands until that shape moves or a second
   * passes. A sibling that only flips its visibility is caught by that
   * second, and a row arriving or leaving moves the column's own count, which
   * is part of the shape.
   */
  // Per row: WeakMaps release automatically as soon as the host detaches a row.
  const tailVerdicts = new WeakMap<HTMLElement, { shape: number, tail: boolean, at: number }>()
  const foreignVerdicts = new WeakMap<HTMLElement, { shape: number, foreign: boolean, at: number }>()
  /** How long a reading stands when the structure around its row did not move. */
  const REREAD_MS = 1000
  let stopped = false
  /** The badge exits still playing; the teardown cancels every one of them. */
  const badgeTimers = new Set<number>()

  // The detail choice is read on every pass; a change of it rewrites the line
  // at once rather than waiting out the standing word's lock. The animation
  // answer moves the loaders standing on the page with it: a rotation armed under
  // the other answer would fold the next motion in place with nothing moving the
  // dots (wait-loader.ts).
  let detailChoice = readPrefs().statusDetail
  let motionChoice = motionReduced()
  const offPrefs = subscribePrefs(prefs => {
    const reducedNow = motionReduced()
    if (reducedNow !== motionChoice) {
      motionChoice = reducedNow
      for (const line of lines.values()) resyncWaitLoader(line.loader)
    }
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
   * a call starting and again finishing, and the clock's second would step over
   * a call that had already settled.
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
   * The row's own watch for the marks the hand-over reads (the subscription bus,
   * D40): the host's holding mark, the words' shimmer mark, and the marks a
   * sibling line's visibility turns on. The ownership verdict is held for a
   * second on a shape that has not moved, which is exactly what a mark or a
   * sibling line landing does not change — so the watch drops the verdict and
   * asks for the pass in the batch the change arrived in, instead of leaving the
   * words with the wrong owner until the clock next looks. Yielded rows stay
   * watched even though they hold no line: a style-only change is what gives
   * the line back.
   */
  function watchOwnership(row: HTMLElement) {
    if (ownershipWatches.has(row)) return
    ownershipWatches.set(row, subscribeMutations(row, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [CHAT_RUNNING_HOLDING_ATTRIBUTE, SHIMMER_ATTRIBUTE, 'aria-hidden', 'hidden', 'class', 'style'],
      // The line's own writes stand inside its quiet mark and are no page change.
      skipQuiet: true,
    }, records => {
      // Streaming rewrites the words' own text many times a second, and the
      // foreign-line reading flushes layout: only a mark, or a change beside the
      // words or of their place, can hand the line to another owner.
      const words = row.querySelector(CHAT_RUNNING_TEXT_SELECTOR)
      let handedOver = false
      for (const record of records) {
        if (record.type === 'attributes') {
          handedOver = true
          break
        }
        if (!(record.target instanceof Element) || words === null || !words.contains(record.target)) {
          handedOver = true
          break
        }
      }
      if (!handedOver) return
      foreignVerdicts.delete(row)
      scheduleSync()
    }))
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
      // A key that was the row itself goes with it: the map holds its keys
      // strongly, and the row would outlive the page it stood on.
      if (standing.key !== key && typeof standing.key !== 'string') wording.delete(standing.key)
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
    const loader = buildWaitLoader()
    line.append(loader, label, clock, badge)
    words.after(line)
    const parts = { line, loader, label, clock, badge, key }
    // The line is recorded before its loader starts: wait-loader.ts throws on a
    // lane, fade length or turn the stylesheet leaves out, and with the record
    // unwritten every pass would put up another line and another set of dots
    // beside the words.
    lines.set(row, parts)
    // The loader is set going here, with the line, and lets go when the row does.
    // Its motion holds while the model outputs and hands over at an output-end
    // past the minimum gap (setWaitLoaderOutputting, called each pass below).
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

  /**
   * The child counts from a row up to the transcript's column: rows added or
   * taken away, and parts added inside them, move it. Read off the DOM without
   * resolving styles, which is what makes it cheaper than the questions it
   * guards.
   */
  function shapeOf(row: HTMLElement) {
    const column = row.closest(CHAT_FLOW_SELECTOR)
    if (column === null) return 0
    let shape = column.childElementCount
    let ancestor: HTMLElement = row
    while (ancestor !== column) {
      shape = (shape * 31 + ancestor.childElementCount) | 0
      const parent = ancestor.parentElement
      if (parent === null) return 0
      ancestor = parent
    }
    return shape
  }

  /** Whether the row is the transcript's tail, read again only when its shape moved. */
  function tailOf(row: HTMLElement, shape: number, now: number) {
    const standing = tailVerdicts.get(row)
    if (standing !== undefined && standing.shape === shape && now - standing.at < REREAD_MS) return standing.tail
    const tail = !followedByContent(row)
    tailVerdicts.set(row, { shape, tail, at: now })
    return tail
  }

  /** Whether another line replaced the host's words, read again only when the shape moved. */
  function foreignLineOwns(row: HTMLElement, words: HTMLElement, shape: number, now: number) {
    const standing = foreignVerdicts.get(row)
    if (standing !== undefined && standing.shape === shape && now - standing.at < REREAD_MS) return standing.foreign
    const foreign = foreignRunningLineOwns(words, lines.get(row)?.line, WORDS_ATTR)
    foreignVerdicts.set(row, { shape, foreign, at: now })
    return foreign
  }

  /** Read the pin's classification before any frame task writes its words. */
  function readTails() {
    if (stopped || tailReadings !== null) return
    const readings = new Map<HTMLElement, boolean>()
    if (hostChatSeat(ctx) !== null) {
      const now = Date.now()
      for (const row of runningRows.all()) readings.set(row, tailOf(row, shapeOf(row), now))
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

  /**
   * The session's settled statistics, off the projection the host serves for it
   * (shared/session-projections.ts): the average time to first token in them is
   * what stretches the overtime margin (wait-state.ts). Null while the host
   * serves no projection seat for the session, which is how a host that names no
   * projections answers at all.
   */
  function sessionStatsOf(sessionId: string | null): HostSessionStatsProjection | null {
    if (sessionId === null) return null
    const face = sessionProjectionFaces(ctx, sessionId, ['sessionStats'])?.sessionStats
    return (hostSnapshot(face) ?? null) as HostSessionStatsProjection | null
  }

  /** Bring one row's line to what the host's snapshot says now. */
  function syncRow(row: HTMLElement, t: HostText, now: number, seen: Set<string>, live: Set<string>) {
    // Watched from the first pass that sees the row, drawn or yielded: the marks
    // the hand-over reads arrive without a publish, and this pass may have
    // released the line before the next clock tick.
    watchOwnership(row)
    // The host keeps the running row's slot after the turn stops, marked
    // `data-holding`, until the actions row replaces it (RunningStatus). It
    // still answers `[data-chat-running]` and holds its content span, so a pass
    // reading it would draw a second line: only the live row is ours.
    if (row.hasAttribute(CHAT_RUNNING_HOLDING_ATTRIBUTE)) {
      release(row)
      return
    }
    const words = row.querySelector<HTMLElement>(CHAT_RUNNING_TEXT_SELECTOR)
    const shape = words === null ? 0 : shapeOf(row)
    if (words === null || foreignLineOwns(row, words, shape, now)) {
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
    // The loader holds its motion while the model outputs and hands over when an
    // output ends past the minimum gap (wait-loader.ts): activity is non-null
    // exactly while the model thinks, calls a tool or writes its answer.
    setWaitLoaderOutputting(loader, activity !== null)
    const started = turn?.start?.time ?? null
    clock.hidden = started === null
    if (started !== null) writeTextInPlace(clock, formatHostDuration(Math.max(1000, now - started), t))
    let overtime = false
    if (snapshot !== null && turn !== undefined && activity === null && typeof key === 'string') {
      seen.add(key)
      let began = waits.get(key)
      if (began === undefined) {
        began = waitStart(turn, now)
        waits.set(key, began)
      }
      overtime = now - began >= overtimeMargin(sessionStatsOf(sessionId))
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
    tailVerdicts.delete(row)
    foreignVerdicts.delete(row)
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
    for (const [row, stop] of [...ownershipWatches]) {
      if (running.has(row)) continue
      stop()
      ownershipWatches.delete(row)
    }
    // A wait the model ended, or a turn that closed, starts over next time; a
    // turn no row speaks for any more forgets the wording it stood on.
    for (const key of [...waits.keys()]) {
      if (!seen.has(key)) waits.delete(key)
    }
    for (const key of [...wording.keys()]) {
      if (typeof key === 'string' && !live.has(key)) wording.delete(key)
    }
    // The seconds are the clock's own work: a publish, a row arriving or leaving,
    // and a mark the hand-over reads all ask for their pass through the bus.
    if (rows.length > 0 && timer === null) {
      timer = window.setInterval(() => {
        if (cancelTick !== null) return
        cancelTick = requestFrame({
          read: readTails,
          write() {
            cancelTick = null
            try { syncLines() } finally { writeTails() }
          },
        })
      }, CLOCK_MS)
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

  ui.chatWait = { measure: readTails, sync: syncInFrame, onCopyChange: sync, skipOnContentOnly: true }

  return () => {
    stopped = true
    if (cancelTailPass !== null) cancelTailPass()
    cancelTailPass = null
    tailReadings = null
    offPrefs()
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
    for (const stop of [...ownershipWatches.values()]) stop()
    ownershipWatches.clear()
    delete ui.chatWait
  }
}
