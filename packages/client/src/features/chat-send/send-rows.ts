import { SUBMISSION_ECHO_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { CHAT_ROW_SELECTOR, CHAT_USER_ROW_SELECTOR } from '@dsh-claude-style/engine/chat-dom'

/** Mark every fresh echo handled so only the newest is used and none repeats in a later frame. */
export function takeFreshEcho(handled: WeakSet<Element>) {
  const fresh: Element[] = []
  for (const echo of document.querySelectorAll(SUBMISSION_ECHO_SELECTOR)) {
    if (!handled.has(echo)) fresh.push(echo)
  }
  if (fresh.length === 0) return null
  for (const echo of fresh) handled.add(echo)
  const latest = fresh.at(-1)
  return latest instanceof HTMLElement ? latest : null
}

/** The row to take right now: the echo while it is there, and the real row once it has been swapped in. */
export function currentRow(previous: HTMLElement | null) {
  const echo = document.querySelector(SUBMISSION_ECHO_SELECTOR)
  if (echo instanceof HTMLElement && echo !== previous) return echo
  const row = lastUserRow()
  return row === previous ? null : row
}

export function lastUserRow() {
  const rows = document.querySelectorAll(CHAT_USER_ROW_SELECTOR)
  const last = rows.item(rows.length - 1)
  return last instanceof HTMLElement ? last : null
}

/** Check changed roots only; walking every subtree would be costly on long sessions. */
export function touchesUserRow(records: MutationRecord[]) {
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (isRowNode(node)) return true
    }
    for (const node of record.removedNodes) {
      if (isRowNode(node)) return true
    }
  }
  return false
}

export function isRowNode(node: Node) {
  return node instanceof HTMLElement
    && (node.matches(CHAT_ROW_SELECTOR) || node.querySelector(CHAT_ROW_SELECTOR) !== null)
}
