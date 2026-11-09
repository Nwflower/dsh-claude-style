import { ASLEEP_ATTR } from '../constants'
import { notifyAll } from '@dsh-claude-style/engine/notify'

/** One visibility owner drives script clocks and ASLEEP_ATTR; losing focus alone does not pause them (D40). */
const listeners: ((hidden: boolean) => void)[] = []

/** Whether the page is off screen right now. */
export function pageHidden() {
  return document.visibilityState === 'hidden'
}

/** Observe the page leaving the screen and coming back; returns the unsubscriber. */
export function subscribePageHidden(listener: (hidden: boolean) => void) {
  listeners.push(listener)
  return () => {
    const index = listeners.indexOf(listener)
    if (index !== -1) listeners.splice(index, 1)
  }
}

/** The stop removes both listener and mark so they belong to one page generation (D74). */
export function installPageVisibility() {
  let hidden = pageHidden()
  writeMark(hidden)
  const onVisibilityChange = () => {
    const next = pageHidden()
    if (next === hidden) return
    hidden = next
    writeMark(hidden)
    notifyAll(listeners, hidden)
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    document.body.removeAttribute(ASLEEP_ATTR)
  }
}

function writeMark(hidden: boolean) {
  if (hidden) document.body.setAttribute(ASLEEP_ATTR, '')
  else document.body.removeAttribute(ASLEEP_ATTR)
}
