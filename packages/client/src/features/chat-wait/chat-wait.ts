import { QUIET_ATTR } from '../../constants'
import { requestFrame } from '../../core/frame'
import { closestConversationSession, conversationSessionId, findChatTarget } from '../../core/host'
import { copyLabel } from '../../core/i18n'
import { motionReduced } from '../../core/prefs'
import { buildElement } from '../../shared/dom'
import { formatHostDuration } from '../../shared/format'
import { activityWords } from '../../shared/turn-activity'
import { CHAT_RUNNING_SELECTOR, CHAT_RUNNING_TEXT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { WAIT_OVERTIME_MS, openTurn, waitStart } from './wait-state'
import type { HostContext, HostText } from '../../core/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './chat-wait.manifest'

/**
 * The live turn's running row, after dsh-better-display's status line (MIT):
 * what the turn is doing now in the words of the status line
 * (shared/turn-activity.ts), the host's own 「深度求索中」 where no state can be
 * read, the turn's elapsed time as a quiet clock beside it, and 「暂未响应」
 * once the model has been silent for ten seconds (wait-state.ts). The wording
 * swaps in place with transitions.dev's "Text states swap" (MIT).
 *
 * The host keeps its row, its whale and its live region: the line is a span of
 * the skin's own beside the whale, marked quiet so its ticking wakes no pass,
 * and the stylesheet hides the host's words while it stands (chat-wait.css).
 * The words, the clock's units and the session's turns are the host's.
 *
 * @param ctx - client context.
 * @param ui - shared handle table.
 * @returns teardown.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  /** On the host's running row while the line stands in for its words. */
  const WAIT_ATTR = 'data-dsh-claude-wait'
  /** On the wording while it swaps: `exit` for the wording leaving, `enter` for the one taking its place. */
  const SWAP_ATTR = 'data-dsh-claude-wait-swap'
  /** The clock's step: the host's own row ticks once a second, and a quarter keeps the two in step. */
  const TICK_MS = 250
  /** How long the wording takes to leave when the stylesheet's own token cannot be read. */
  const SWAP_FALLBACK_MS = 150
  /** Each running row with the line drawn into it. */
  const lines = new Map<HTMLElement, HTMLElement>()
  /** The wording a leaving one hands over to, by label. */
  const swapping = new Map<HTMLElement, string>()
  /** The exit a label is in the middle of, by label. */
  const exits = new Map<HTMLElement, number>()
  /** When each turn's current wait began, by `session:turn`; absent while the model is at work. */
  const waits = new Map<string, number>()
  let timer: number | null = null
  let cancelTick: (() => void) | null = null

  /** The line inside one row, built the first time beside the host's words. */
  function lineOf(row: HTMLElement, words: Element) {
    let line = lines.get(row)
    if (line !== undefined && line.isConnected) return line
    line = buildElement('span', 'dsh-claude-chat-wait')
    line.setAttribute(QUIET_ATTR, '')
    // The host's own live region announces the row; this is its picture.
    line.setAttribute('aria-hidden', 'true')
    line.append(
      buildElement('span', 'dsh-claude-chat-wait-label'),
      buildElement('span', 'dsh-claude-chat-wait-clock'),
      buildElement('span', 'dsh-claude-chat-wait-badge'),
    )
    words.after(line)
    lines.set(row, line)
    return line
  }

  function writeText(element: Element, text: string) {
    if (element.textContent !== text) element.textContent = text
  }

  /** A duration written in a CSS token, in milliseconds. */
  function milliseconds(value: string) {
    const parsed = /^\s*([\d.]+)\s*(ms|s)?\s*$/.exec(value)
    if (parsed === null) return SWAP_FALLBACK_MS
    const amount = Number(parsed[1])
    return Number.isFinite(amount) ? (parsed[2] === 's' ? amount * 1000 : amount) : SWAP_FALLBACK_MS
  }

  /** Write one wording into the label, the swap's second half: it enters from below at its rest pose. */
  function enter(label: HTMLElement, word: string) {
    label.textContent = word
    label.dataset.text = word
    label.setAttribute(SWAP_ATTR, 'enter')
    // The entry pose has to be committed before the transition is released: the
    // snippet's own reflow, and what keeps the new wording from starting at rest.
    void label.offsetHeight
    label.removeAttribute(SWAP_ATTR)
  }

  /**
   * Put one wording into the label, running transitions.dev's three-phase swap
   * when it differs from the one standing: the old wording leaves upward with a
   * blur, the text is written once it has gone, and the new one enters from
   * below. A wording arriving during an exit is the one that exit hands over to.
   */
  function setLabel(label: HTMLElement, word: string) {
    if (label.dataset.text === word) return
    if (label.dataset.text === undefined || motionReduced()) {
      label.textContent = word
      label.dataset.text = word
      return
    }
    swapping.set(label, word)
    if (exits.has(label)) return
    label.setAttribute(SWAP_ATTR, 'exit')
    const duration = milliseconds(getComputedStyle(label).getPropertyValue('--dsh-claude-wait-swap-duration'))
    exits.set(label, window.setTimeout(() => {
      exits.delete(label)
      const next = swapping.get(label)
      swapping.delete(label)
      if (label.isConnected && next !== undefined) enter(label, next)
    }, duration))
  }

  /** Drop a label's swap: a row leaving the page takes no timer with it. */
  function settleSwap(label: HTMLElement) {
    const exit = exits.get(label)
    if (exit !== undefined) window.clearTimeout(exit)
    exits.delete(label)
    swapping.delete(label)
  }

  /** Bring one row's line to what the host's snapshot says now. */
  function syncRow(row: HTMLElement, t: HostText, now: number, seen: Set<string>) {
    const words = row.querySelector(CHAT_RUNNING_TEXT_SELECTOR)
    if (words === null) return
    const sessionId = conversationSessionId(closestConversationSession(row))
    const target = sessionId === null ? null : findChatTarget(ctx, sessionId)
    const snapshot = target === null ? null : target.getSnapshot() ?? null
    const turn = snapshot === null ? undefined : openTurn(snapshot)
    const line = lineOf(row, words)
    const [label, clock, badge] = line.children as HTMLCollectionOf<HTMLElement>
    // What the turn is doing, and the host's own word for a turn whose state
    // cannot be read (D23): the line says the model's work, never a guess.
    const activity = activityWords(snapshot, turn)
    const word = activity === null ? t('chat.deepDiving') : copyLabel(activity.key, activity.fallback)
    setLabel(label, word)
    clock.hidden = turn === undefined || turn.start === undefined
    if (turn !== undefined && turn.start !== undefined) writeText(clock, formatHostDuration(Math.max(1000, now - turn.start.time), t))
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
    badge.hidden = !overtime
    if (overtime) writeText(badge, copyLabel('chatWaitOvertime', 'No response yet'))
    if (!row.hasAttribute(WAIT_ATTR)) row.setAttribute(WAIT_ATTR, '')
  }

  /** Take one row's line down and give the host's words back. */
  function release(row: HTMLElement) {
    const line = lines.get(row)
    if (line !== null && line !== undefined) {
      const label = line.firstElementChild
      if (label instanceof HTMLElement) settleSwap(label)
      line.remove()
    }
    lines.delete(row)
    row.removeAttribute(WAIT_ATTR)
  }

  function sync() {
    const t = ctx.get('locale')?.bind('chat')
    const rows = t === undefined ? [] : [...document.querySelectorAll<HTMLElement>(CHAT_RUNNING_SELECTOR)]
    const now = Date.now()
    const seen = new Set<string>()
    for (const row of rows) syncRow(row, t!, now, seen)
    for (const row of [...lines.keys()]) {
      if (!rows.includes(row)) release(row)
    }
    // A wait the model ended, or a turn that closed, starts over next time.
    for (const key of [...waits.keys()]) {
      if (!seen.has(key)) waits.delete(key)
    }
    // The clock ticks only while a row is on the page.
    if (lines.size > 0 && timer === null) {
      timer = window.setInterval(() => {
        if (cancelTick !== null) return
        cancelTick = requestFrame({ write() { cancelTick = null; sync() } })
      }, TICK_MS)
    } else if (lines.size === 0 && timer !== null) {
      window.clearInterval(timer)
      timer = null
    }
  }

  ui.chatWait = { sync, onCopyChange: sync }

  return () => {
    if (timer !== null) window.clearInterval(timer)
    timer = null
    if (cancelTick !== null) cancelTick()
    cancelTick = null
    for (const row of [...lines.keys()]) release(row)
    for (const row of document.querySelectorAll(`[${WAIT_ATTR}]`)) row.removeAttribute(WAIT_ATTR)
    for (const exit of exits.values()) window.clearTimeout(exit)
    exits.clear()
    swapping.clear()
    waits.clear()
    delete ui.chatWait
  }
}
