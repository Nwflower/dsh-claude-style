/**
 * The colour a fading character takes is its element's own, read once per
 * element and read again only when the element's class or the page's theme
 * changes; an element whose colour equals what it inherits gets no inline
 * style of its own.
 *
 * @capability chat-reveal
 * @features chat-reveal
 * @risk Every streamed batch forces a style resolution for elements whose colour has not moved, or a recoloured token fades in its old colour.
 */
import { afterEach, expect, test } from 'vitest'
import { createRunColorPublisher } from '@dsh-claude-style/client/mechanisms'
import { CHAT_REVEAL_COLOR_VAR } from '@dsh-claude-style/client/pure'
import { DARK_THEME_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'

const cleanups: (() => void)[] = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  document.body.replaceChildren()
  document.body.removeAttribute(DARK_THEME_ATTRIBUTE)
})

function sheet(text: string) {
  const style = document.createElement('style')
  style.textContent = text
  document.head.append(style)
  cleanups.push(() => style.remove())
  return style
}

function token(className: string) {
  const paragraph = document.createElement('p')
  paragraph.style.color = 'rgb(0, 0, 0)'
  const span = document.createElement('span')
  span.className = className
  span.textContent = 'text'
  paragraph.append(span)
  document.body.append(paragraph)
  return span
}

const published = (element: HTMLElement) => element.style.getPropertyValue(CHAT_REVEAL_COLOR_VAR)

test('an element keeps the colour it was published with until its class changes', () => {
  const rules = sheet('.first { color: rgb(1, 2, 3) } .second { color: rgb(7, 8, 9) }')
  const publish = createRunColorPublisher()
  const span = token('first')
  publish(span)
  expect(published(span)).toBe('rgb(1, 2, 3)')
  // Neither the class nor the theme moved, so the style is not read again.
  rules.textContent = '.first { color: rgb(4, 5, 6) } .second { color: rgb(7, 8, 9) }'
  publish(span)
  expect(published(span)).toBe('rgb(1, 2, 3)')
  span.className = 'second'
  publish(span)
  expect(published(span)).toBe('rgb(7, 8, 9)')
})

test('a theme flip has every element read its colour again', () => {
  sheet(`.token { color: rgb(1, 2, 3) } body[${DARK_THEME_ATTRIBUTE}] .token { color: rgb(200, 201, 202) }`)
  const publish = createRunColorPublisher()
  const span = token('token')
  publish(span)
  expect(published(span)).toBe('rgb(1, 2, 3)')
  document.body.setAttribute(DARK_THEME_ATTRIBUTE, '')
  publish(span)
  expect(published(span)).toBe('rgb(200, 201, 202)')
})

test('an element painting the colour it inherits gets no inline colour of its own', () => {
  const publish = createRunColorPublisher()
  const paragraph = document.createElement('p')
  paragraph.style.color = 'rgb(10, 20, 30)'
  const outer = document.createElement('span')
  const inner = document.createElement('strong')
  inner.textContent = 'bold'
  outer.append(inner)
  paragraph.append(outer)
  document.body.append(paragraph)
  publish(outer)
  publish(inner)
  expect(published(outer)).toBe('rgb(10, 20, 30)')
  expect(published(inner)).toBe('')
})

test('a detached element is left for the publish that follows its attachment', () => {
  const publish = createRunColorPublisher()
  const paragraph = document.createElement('p')
  paragraph.style.color = 'rgb(10, 20, 30)'
  const span = document.createElement('span')
  paragraph.append(span)
  publish(span)
  expect(published(span)).toBe('')
  document.body.append(paragraph)
  publish(span)
  expect(published(span)).toBe('rgb(10, 20, 30)')
})
