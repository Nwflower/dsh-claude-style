import { afterEach, expect, test } from 'vitest'
import { MOTION_ATTR, MOTION_FULL, MOTION_REDUCED } from '../constants'
import { easeScrollFor, easeScrollToEndFor, holdReader, joinScrollOwner, readerHolds, readerMovedSince, stopScrollFor, submissionHolds, writeScroll } from './scroll-owner'

const nextFrame = () => new Promise<number>(resolve => requestAnimationFrame(resolve))
const wanted = () => true

const cleanups: (() => void)[] = []
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!()
})

/** A scroll container with a tall content block, attached to the page for the test. */
function scrollBox(attribute: string) {
  const box = document.createElement('div')
  box.setAttribute(attribute, '')
  box.style.cssText = 'height:100px;overflow:auto'
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

test('a source ranked below the running ease is refused, an equal or higher one is carried out', () => {
  setMotion(MOTION_FULL)
  const scroller = scrollBox('data-conversation-scroll')
  expect(easeScrollFor(scroller, 'jump', () => 600, wanted)).toBe(true)
  expect(writeScroll(scroller, 0, 'fold')).toBe(false)
  expect(easeScrollToEndFor(scroller, 'stream', wanted)).toBe(false)
  expect(writeScroll(scroller, 300, 'jump')).toBe(true)
  expect(scroller.scrollTop).toBe(300)
})

test('a write ends a running ease that ranks below it', () => {
  setMotion(MOTION_FULL)
  const scroller = scrollBox('data-conversation-scroll')
  expect(easeScrollToEndFor(scroller, 'stream', wanted)).toBe(true)
  expect(writeScroll(scroller, 200, 'composer')).toBe(true)
  expect(scroller.scrollTop).toBe(200)
})

test('the reader holds the conversation until he comes back to its end; only following sources are refused meanwhile', async () => {
  setMotion(MOTION_FULL)
  join()
  const scroller = scrollBox('data-conversation-scroll')
  scroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true }))
  expect(readerHolds(scroller)).toBe(true)
  expect(easeScrollToEndFor(scroller, 'follow', wanted)).toBe(false)
  expect(writeScroll(scroller, 50, 'composer')).toBe(true)
  // Back at the end: the scroll event releases the hold before content grows again.
  scroller.scrollTop = scroller.scrollHeight
  await new Promise(resolve => scroller.addEventListener('scroll', resolve, { once: true }))
  ;(scroller.firstElementChild as HTMLElement).style.height = '3000px'
  expect(readerHolds(scroller)).toBe(false)
  expect(easeScrollToEndFor(scroller, 'follow', wanted)).toBe(true)
})

test('a jump to a turn holds the follow and the stream off until the reader comes back to the end', async () => {
  setMotion(MOTION_FULL)
  join()
  const scroller = scrollBox('data-conversation-scroll')
  holdReader(scroller)
  expect(readerHolds(scroller)).toBe(true)
  expect(easeScrollToEndFor(scroller, 'stream', wanted)).toBe(false)
  expect(easeScrollToEndFor(scroller, 'follow', wanted)).toBe(false)
  // A jump that landed at the end leaves nothing held: the release is the holds' own.
  scroller.scrollTop = scroller.scrollHeight
  await new Promise(resolve => scroller.addEventListener('scroll', resolve, { once: true }))
  ;(scroller.firstElementChild as HTMLElement).style.height = '3000px'
  expect(readerHolds(scroller)).toBe(false)
})

test('a process body is held by an intent on the body itself, not by a press on its content', () => {  join()
  const body = scrollBox('data-step-process-body')
  body.firstElementChild!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
  expect(readerHolds(body)).toBe(false)
  body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
  expect(readerHolds(body)).toBe(true)
})

test('the reader\'s own message holds the stream back and leaves the follow alone', async () => {
  setMotion(MOTION_FULL)
  join()
  const scroller = scrollBox('data-conversation-scroll')
  const message = document.createElement('div')
  message.setAttribute('data-chat-flow-kind', 'user')
  scroller.append(message)
  await nextFrame()
  await nextFrame()
  expect(submissionHolds()).toBe(true)
  expect(easeScrollToEndFor(scroller, 'stream', wanted)).toBe(false)
  expect(easeScrollToEndFor(scroller, 'follow', wanted)).toBe(true)
})

test('under reduced motion an ease is its destination written at once', () => {
  setMotion(MOTION_REDUCED)
  const scroller = scrollBox('data-conversation-scroll')
  expect(easeScrollFor(scroller, 'jump', () => 400, wanted)).toBe(true)
  expect(scroller.scrollTop).toBe(400)
})

test('only intents that move a position count as the reader moving', () => {
  join()
  const since = performance.now()
  // The clock is coarse: an intent in the same tick would read as not after `since`.
  while (performance.now() === since) { /* wait for the next tick */ }
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
  expect(readerMovedSince(since)).toBe(false)
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }))
  expect(readerMovedSince(since)).toBe(true)
})

test('once the last member leaves, intents are no longer heard', () => {
  const leave = join()
  const scroller = scrollBox('data-conversation-scroll')
  leave()
  scroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true }))
  expect(readerHolds(scroller)).toBe(false)
})
