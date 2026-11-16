import { afterEach } from 'vitest'
import { joinScrollOwner, stopScrollFor } from '@dsh-claude-style/engine/scroll-owner'
import { CHAT_FLOW_SELECTOR, CONVERSATION_SCROLL_SELECTOR } from '@dsh-claude-style/contracts/dom'
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

/**
 * The fixture as the scroll-owner specs use it: a fresh page shape per test,
 * torn down after each one. Every spec that builds a conversation takes its
 * boxes, its installation and its motion from here; `cleanups` is there for the
 * teardown a spec adds itself.
 */
export function scrollOwnerSuite() {
  const cleanups: (() => void)[] = []
  afterEach(() => {
    while (cleanups.length > 0) cleanups.pop()!()
  })
  return { ...createScrollOwnerFixture(cleanups), cleanups }
}

/**
 * The host's own shape around the conversation's column, as
 * packages/engine/src/chat-dom.ts reads it for its back-to-end button: the
 * column inside its holder, the holder inside the frame, and the button in a
 * seat beside that frame. Returns the button.
 */
export function followTailButton(scroller: HTMLElement) {
  const frame = document.createElement('div')
  const holder = document.createElement('div')
  holder.append(hostElement(CHAT_FLOW_SELECTOR))
  const seat = document.createElement('div')
  const button = document.createElement('button')
  button.type = 'button'
  seat.append(button)
  frame.append(holder)
  scroller.append(frame, seat)
  return button
}

/** The next settled scroll write on a box: the host's own position write landing. */
export function settledScroll(box: HTMLElement) {
  return new Promise<void>((resolve) => {
    box.addEventListener('scroll', () => resolve(), { once: true })
  })
}
