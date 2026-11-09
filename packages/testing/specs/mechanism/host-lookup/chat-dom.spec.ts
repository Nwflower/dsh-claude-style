/**
 * The two chat seats read on every frame of a stream — the conversation scroller
 * and the message column — are kept while they stay in the document and read
 * again once they leave (D9); a press beside a scroller's client box reads as a
 * press on its scrollbar.
 *
 * @capability host-lookup
 * @features engine
 * @risk After a session switch the skin keeps scrolling a conversation that has left the page, or a drag on the scrollbar is taken for a click inside the conversation.
 */
import { afterEach, expect, test } from 'vitest'
import { conversationColumn, conversationScroller, isScrollbarStrip } from '@dsh-claude-style/engine/chat-dom'
import { CHAT_FLOW_SELECTOR, CONVERSATION_SCROLL_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { hostElement } from '../../fixtures/host-markup'

const cleanups: (() => void)[] = []
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!()
})

function attach(selector: string) {
  const element = hostElement(selector)
  document.body.append(element)
  cleanups.push(() => element.remove())
  return element
}

test('the conversation scroller is read once and reused while it is in the document', () => {
  const first = attach(CONVERSATION_SCROLL_SELECTOR)
  expect(conversationScroller()).toBe(first)
  // A second container mounting beside it does not take the reading over: the
  // held element is still in the document.
  const second = attach(CONVERSATION_SCROLL_SELECTOR)
  expect(conversationScroller()).toBe(first)
  first.remove()
  second.remove()
  const third = attach(CONVERSATION_SCROLL_SELECTOR)
  expect(conversationScroller()).toBe(third)
})

test('the message column is kept the same way', () => {
  const first = attach(CHAT_FLOW_SELECTOR)
  expect(conversationColumn()).toBe(first)
  first.remove()
  const second = attach(CHAT_FLOW_SELECTOR)
  expect(conversationColumn()).toBe(second)
})

test('a press is on the scrollbar strip by the room the browser leaves beside clientWidth', () => {
  const box = document.createElement('div')
  box.style.cssText = 'height:100px;overflow:auto;width:200px'
  const content = document.createElement('div')
  content.style.height = '400px'
  box.append(content)
  document.body.append(box)
  cleanups.push(() => box.remove())
  const rect = box.getBoundingClientRect()
  const at = (clientX: number) => new PointerEvent('pointerdown', { clientX })
  expect(isScrollbarStrip(box, at(rect.left + box.clientWidth + 2), box)).toBe(true)
  expect(isScrollbarStrip(box, at(rect.left + 2), box)).toBe(false)
  expect(isScrollbarStrip(content, at(rect.left + 2), box)).toBe(false)
})
