import { afterEach, expect, test } from 'vitest'
import { MOTION_ATTR, MOTION_FULL, MOTION_REDUCED, READER_HOLD_ATTR } from '../constants'
import { easeScrollFor, easeScrollToEndFor, holdReader, joinScrollOwner, readerHolds, readerMovedSince, releaseReader, stopScrollFor, submissionHolds, writeScroll } from './scroll-owner'

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
  // `scrollbar-gutter: stable` keeps the strip in the layout: the drag tests read
  // the container's own bar, and an overlay scrollbar leaves no geometry to read.
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
  scroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -120 }))
  expect(readerHolds(scroller)).toBe(true)
  expect(scroller.hasAttribute(READER_HOLD_ATTR)).toBe(true)
  expect(easeScrollToEndFor(scroller, 'follow', wanted)).toBe(false)
  expect(writeScroll(scroller, 50, 'composer')).toBe(true)
  // Away from the end, then written back by the host's own follow with no move
  // of his: the hold stands, so content growing under it cannot drag him back.
  ;(scroller.firstElementChild as HTMLElement).style.height = '3000px'
  scroller.scrollTop = scroller.scrollHeight
  await new Promise(resolve => scroller.addEventListener('scroll', resolve, { once: true }))
  expect(readerHolds(scroller)).toBe(true)
  // His own move back to the end ends it.
  scroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 120 }))
  expect(readerHolds(scroller)).toBe(false)
  expect(scroller.hasAttribute(READER_HOLD_ATTR)).toBe(false)
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
  // Written to the end with no move of his (the host's own follow): the hold stands.
  scroller.scrollTop = scroller.scrollHeight
  await new Promise(resolve => scroller.addEventListener('scroll', resolve, { once: true }))
  expect(readerHolds(scroller)).toBe(true)
  // His own move back to the end ends it.
  scroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 120 }))
  expect(readerHolds(scroller)).toBe(false)
})

test('a hold whose position lands at the end stands until he moves toward it', async () => {
  join()
  const scroller = scrollBox('data-conversation-scroll')
  holdReader(scroller)
  // The jump's landing is the end: a position written there is not his move back.
  scroller.scrollTop = scroller.scrollHeight
  await new Promise(resolve => scroller.addEventListener('scroll', resolve, { once: true }))
  expect(readerHolds(scroller)).toBe(true)
  scroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 120 }))
  expect(readerHolds(scroller)).toBe(false)
})

test('a process body is held by a drag of its scrollbar, not by a press on its content', () => {
  join()
  const body = scrollBox('data-step-process-body')
  const box = body.getBoundingClientRect()
  body.firstElementChild!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
  expect(readerHolds(body)).toBe(false)
  // The strip the browser leaves beside clientWidth: a press there is the reader scrolling.
  const strip = { clientX: box.left + body.clientWidth + 2, clientY: box.top + 10, bubbles: true }
  body.dispatchEvent(new PointerEvent('pointerdown', strip))
  expect(readerHolds(body)).toBe(true)
  releaseReader(body)
  expect(body.hasAttribute(READER_HOLD_ATTR)).toBe(false)
  // Inside the content at the same height: the reader is opening something.
  const inside = { clientX: box.left + 2, clientY: box.top + 10, bubbles: true }
  body.dispatchEvent(new PointerEvent('pointerdown', inside))
  expect(readerHolds(body)).toBe(false)
})

test('the reader\'s hold is marked on the container for the page, and taken off when he comes back', async () => {
  join()
  const scroller = scrollBox('data-conversation-scroll')
  expect(scroller.hasAttribute(READER_HOLD_ATTR)).toBe(false)
  scroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -120 }))
  expect(scroller.hasAttribute(READER_HOLD_ATTR)).toBe(true)
  // Away from the end: still his.
  expect(readerHolds(scroller)).toBe(true)
  // Written back to the end with no move of his: still his.
  scroller.scrollTop = scroller.scrollHeight
  await new Promise(resolve => scroller.addEventListener('scroll', resolve, { once: true }))
  expect(readerHolds(scroller)).toBe(true)
  expect(scroller.hasAttribute(READER_HOLD_ATTR)).toBe(true)
  // His own move back to the end is what ends it.
  scroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 120 }))
  expect(readerHolds(scroller)).toBe(false)
  expect(scroller.hasAttribute(READER_HOLD_ATTR)).toBe(false)
})

test('a jump to a turn marks the hold on the container it lands in', () => {
  join()
  const scroller = scrollBox('data-conversation-scroll')
  holdReader(scroller)
  expect(scroller.hasAttribute(READER_HOLD_ATTR)).toBe(true)
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

test('a hold armed by one conversation does not follow the reader into the next', async () => {
  setMotion(MOTION_FULL)
  join()
  // The conversation's own element, in the shape the host draws it: the phase
  // attribute is part of the contract's selector.
  const phase = document.createElement('div')
  phase.setAttribute('data-phase', 'active')
  const wrapper = document.createElement('div')
  wrapper.setAttribute('data-conversation-session', 'session-one')
  const scroller = scrollBox('data-conversation-scroll')
  wrapper.append(scroller)
  phase.append(wrapper)
  document.body.append(phase)
  cleanups.push(() => phase.remove())
  const message = document.createElement('div')
  message.setAttribute('data-chat-flow-kind', 'user')
  scroller.append(message)
  await nextFrame()
  await nextFrame()
  expect(submissionHolds()).toBe(true)
  // A session switch keeps the scroller (the reading view reuses it) and the new
  // conversation mounts its own user rows: the hold the last one armed must not
  // stand here, or the follow that brings the open session to its end is refused.
  wrapper.setAttribute('data-conversation-session', 'session-two')
  writeScroll(scroller, 100, 'composer')
  expect(submissionHolds()).toBe(false)
  expect(easeScrollToEndFor(scroller, 'stream', wanted)).toBe(true)
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
