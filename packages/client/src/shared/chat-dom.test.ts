import { afterEach, expect, test } from 'vitest'
import { conversationColumn, conversationScroller } from './chat-dom'

/**
 * The two readings the chat area asks for on every frame of a stream are kept
 * (D9): what a test can hold is that the held element is reused while it is in
 * the document, and that the reading is taken again once it is not.
 */
const cleanups: (() => void)[] = []
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!()
})

function attach(attribute: string) {
  const element = document.createElement('div')
  element.setAttribute(attribute, '')
  document.body.append(element)
  cleanups.push(() => element.remove())
  return element
}

test('the conversation scroller is read once and reused while it is in the document', () => {
  const first = attach('data-conversation-scroll')
  expect(conversationScroller()).toBe(first)
  // A second container mounting beside it does not take the reading over: the
  // held element is still in the document, which is the whole test.
  const second = attach('data-conversation-scroll')
  expect(conversationScroller()).toBe(first)
  first.remove()
  second.remove()
  const third = attach('data-conversation-scroll')
  expect(conversationScroller()).toBe(third)
})

test('the message column is kept the same way', () => {
  const first = attach('data-chat-flow')
  expect(conversationColumn()).toBe(first)
  first.remove()
  const second = attach('data-chat-flow')
  expect(conversationColumn()).toBe(second)
})
