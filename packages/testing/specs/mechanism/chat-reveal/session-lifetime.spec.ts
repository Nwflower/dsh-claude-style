/**
 * Reveal highlights and reader holds belong to the selected session (D91).
 * @capability chat-reveal
 * @features chat-reveal, engine
 * @risk Retained inactive DOM keeps fading, carries a reader hold into another session, or resumes old animation frames after teardown.
 */
import { afterEach, expect, test } from 'vitest'
import { createChatRevealEngine } from '@dsh-claude-style/client/pure'
import { adoptSkin } from '@dsh-claude-style/engine/skin'
import { joinScrollOwner, holdReader, readerHolds, readerScrollPosition, submissionHolds } from '@dsh-claude-style/engine/scroll-owner'
import { isScrollEasing } from '@dsh-claude-style/engine/scroll-ease'
import { easeScrollFor } from '@dsh-claude-style/engine/scroll-owner'
import { CONVERSATION_SCROLL_SELECTOR, CONVERSATION_SESSION_ATTRIBUTE, PHASE_ATTRIBUTE, STREAMING_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { hostElement } from '../../fixtures/host-markup'
import { frames } from '../../fixtures/frames'
import { TEST_SKIN } from '../../fixtures/vocabulary'

adoptSkin(TEST_SKIN)
const cleanups: (() => void)[] = []
afterEach(() => {
  for (const stop of cleanups.splice(0).reverse()) stop()
  document.body.replaceChildren()
})
function session(id: string) {
  const root = document.createElement('div')
  root.setAttribute(PHASE_ATTRIBUTE, 'active')
  const column = document.createElement('div')
  column.setAttribute(CONVERSATION_SESSION_ATTRIBUTE, id)
  const scroller = hostElement(CONVERSATION_SCROLL_SELECTOR)
  scroller.style.cssText = 'height:100px;overflow:auto'
  const content = document.createElement('div')
  content.style.height = '2000px'
  scroller.append(content)
  column.append(scroller)
  root.append(column)
  document.body.append(root)
  return { root, column, scroller }
}
const highlighted = (container: Element) => [...CSS.highlights.values()]
  .some(highlight => [...highlight].some(range => container.contains(range.startContainer)))

test('a broadcast releases old connected scroll containers and running springs without another scroll request', async () => {
  const old = session('a')
  cleanups.push(joinScrollOwner())
  holdReader(old.scroller)
  easeScrollFor(old.scroller, 'jump', () => 500, () => true)
  expect(readerHolds(old.scroller)).toBe(true)
  old.root.setAttribute(PHASE_ATTRIBUTE, 'hero')
  session('b')
  await frames(2)
  expect(old.scroller.isConnected).toBe(true)
  expect(readerHolds(old.scroller)).toBe(false)
  expect(readerScrollPosition(old.scroller)).toBeNull()
  expect(isScrollEasing(old.scroller)).toBe(false)
  expect(submissionHolds()).toBe(false)
})

test('a session switch clears old highlights and inactive streaming mutations cannot rearm them', async () => {
  const old = session('a')
  const stop = createChatRevealEngine()
  expect(stop).not.toBeNull()
  cleanups.push(stop!)
  const stream = document.createElement('div')
  stream.setAttribute(STREAMING_ATTRIBUTE, '')
  stream.textContent = 'a short streamed answer'
  old.scroller.append(stream)
  await Promise.resolve()
  await Promise.resolve()
  expect(highlighted(stream)).toBe(true)
  old.root.setAttribute(PHASE_ATTRIBUTE, 'hero')
  const next = session('b')
  await frames(2)
  expect(highlighted(stream)).toBe(false)
  stream.firstChild!.textContent += ' old session keeps running'
  await frames(2)
  expect(highlighted(stream)).toBe(false)
  next.root.setAttribute(PHASE_ATTRIBUTE, 'hero')
  await frames(2)
  expect([...CSS.highlights.values()].every(highlight => highlight.size === 0)).toBe(true)
})
