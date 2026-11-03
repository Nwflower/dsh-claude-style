import { joinScrollOwner, stopScrollFor } from '@dsh-claude-style/engine/scroll-owner'
import { CONVERSATION_SCROLL_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { hostElement } from './host-markup'
import { MOTION_ATTR } from './vocabulary'

/** Shared DOM, installation and motion fixtures for the scroll-owner mechanism specs. */
export function createScrollOwnerFixture(cleanups: (() => void)[]) {
  function scrollBox(selector = CONVERSATION_SCROLL_SELECTOR) {
    const box = hostElement(selector)
    box.style.cssText = 'height:100px;overflow:auto;scrollbar-gutter:stable'
    const content = document.createElement('div')
    content.style.height = '2000px'
    box.append(content)
    document.body.append(box)
    cleanups.push(() => {
      stopScrollFor(box)
      box.remove()
    })
    return box
  }

  function join() {
    const leave = joinScrollOwner()
    cleanups.push(leave)
    return leave
  }

  function setMotion(mode: string) {
    document.body.setAttribute(MOTION_ATTR, mode)
    cleanups.push(() => document.body.removeAttribute(MOTION_ATTR))
  }

  return { scrollBox, join, setMotion }
}
