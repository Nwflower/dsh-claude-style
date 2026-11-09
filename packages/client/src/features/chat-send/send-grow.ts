import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { CHAT_FLYING_ATTR, MESSAGE_ENTER_ATTR, MESSAGE_ENTER_GROW } from '../../constants'
import { motionReduced, readPrefs } from '../../core/prefs'
import { motionMs } from '../../shared/motion'
import { currentRow, lastUserRow, takeFreshEcho, touchesUserRow } from './send-rows'
import { SUBMISSION_ECHO_SELECTOR } from '@dsh-claude-style/contracts/dom'

/* Mark only the row replacing a freshly observed echo; restored-session rows never animate.
   entering lets follow treat this entrance and send-flight consistently. */
export function watchGrowEnter() {
  /** The echoes already dealt with; the ones lying on the page at install time are included (a restored session has them). */
  const handled = new WeakSet<Element>()
  for (const echo of document.querySelectorAll(SUBMISSION_ECHO_SELECTOR)) handled.add(echo)
  /** The row hidden while its message waits to grow. */
  let hidden: HTMLElement | null = null
  /** The row growing into its place right now, or null. */
  let marked: HTMLElement | null = null
  /** The last row standing when the submission was recognised: what makes the row that follows the new one. */
  let previous: HTMLElement | null = null
  /** The backstop timer: the mark is a decoration, and it may not outlive the message it is on. */
  let rescue = 0
  /** The same backstop for the row's own growth: the mark comes off on animationend, and a row that never animates must not hold it (see entering). */
  let growRescue = 0

  let stopRowWatch: (() => void) | null = null
  /** Take the growth's own mark off, whichever way it ends. */
  const unmark = () => {
    window.clearTimeout(growRescue)
    growRescue = 0
    marked?.removeAttribute(MESSAGE_ENTER_ATTR)
    marked = null
  }
  const unwind = () => {
    if (stopRowWatch !== null) stopRowWatch()
    stopRowWatch = null
    window.clearTimeout(rescue)
    rescue = 0
    unmark()
    hidden?.removeAttribute(CHAT_FLYING_ATTR)
    hidden = null
    previous = null
  }

  /** The timer removes the mark when no animationend arrives, including a reduced-motion change. */
  const growRow = (records: MutationRecord[]) => {
    if (!touchesUserRow(records)) return
    const row = currentRow(previous)
    if (row === null) return
    unwind()
    marked = row
    row.setAttribute(MESSAGE_ENTER_ATTR, '')
    row.addEventListener('animationend', (event) => {
      if (event.target === row) unmark()
    }, { once: true })
    growRescue = window.setTimeout(unmark, motionMs('--dsh-claude-duration-enter') * 4)
  }

  const onEchoRecords = () => {
    if (hidden !== null) return
    if (readPrefs().messageEnter !== MESSAGE_ENTER_GROW) return
    // The reader's animation choice is read here rather than once at install
    // (D40): a still page writes the message without the growth.
    if (motionReduced()) return
    const echo = takeFreshEcho(handled)
    if (echo === null) return
    previous = lastUserRow()
    hidden = echo
    echo.setAttribute(CHAT_FLYING_ATTR, '')
    if (stopRowWatch === null) stopRowWatch = subscribeMutations(document.body, { childList: true, subtree: true }, growRow)
    rescue = window.setTimeout(unwind, motionMs('--dsh-claude-duration-enter') * 4)
  }

  const stopEchoWatch = subscribeMutations(document.body, { childList: true, subtree: true }, onEchoRecords)
  const stop = () => {
    stopEchoWatch()
    unwind()
  }
  /** Whether the reader's message is taking its place: the echo waiting, or the row growing where it landed. */
  const entering = () => hidden !== null || marked !== null
  return { stop, entering }
}
