import { afterEach, expect, test } from 'vitest'
import { MOTION_ATTR, MOTION_FULL, MOTION_REDUCED } from '../constants'
import { easeScrollFor, easeScrollToEndFor, joinScrollOwner, readerHolds, readerMovedSince, stopScrollFor, submissionHolds, writeScroll } from './scroll-owner'

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

/** Wait until the container's position has stood still for a few frames, or the frame cap runs out. */
async function glideDone(box: HTMLElement, cap = 180) {
  await nextFrame()
  await nextFrame()
  let last = -1
  let still = 0
  for (let i = 0; i < cap; i += 1) {
    await nextFrame()
    still = box.scrollTop === last ? still + 1 : 0
    if (still >= 3) return
    last = box.scrollTop
  }
}

/** One wheel event over an element, as the browser would deliver it. */
function wheelOver(element: Element, deltaY: number) {
  const event = new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true })
  element.dispatchEvent(event)
  return event
}

/**
 * A scroll container for the wheel cases: the owner hangs its listener on the
 * scroller itself, and it finds a new one on the frame after it appears.
 */
async function wheelBox(attribute: string) {
  const box = scrollBox(attribute)
  await nextFrame()
  return box
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

test('a process body is held by an intent on the body itself, not by a press on its content', () => {
  join()
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

test('the reader\'s wheel is taken over and glided on the spring, not written in one step', async () => {
  setMotion(MOTION_FULL)
  join()
  const scroller = await wheelBox('data-conversation-scroll')
  const event = wheelOver(scroller, 300)
  expect(event.defaultPrevented).toBe(true)
  await nextFrame()
  // Eased in: the first frame carries a few pixels of the 300, not the whole notch.
  expect(scroller.scrollTop).toBeGreaterThan(0)
  expect(scroller.scrollTop).toBeLessThan(150)
  await glideDone(scroller)
  // A pixel of slack: the browser stores whole offsets, so the spring's exact
  // last write can read back one short.
  expect(Math.abs(scroller.scrollTop - 300)).toBeLessThanOrEqual(1)
})

test('a second notch extends the glide in flight instead of restarting it', async () => {
  setMotion(MOTION_FULL)
  join()
  const scroller = await wheelBox('data-conversation-scroll')
  wheelOver(scroller, 300)
  await nextFrame()
  await nextFrame()
  const midway = scroller.scrollTop
  wheelOver(scroller, 300)
  // The glide keeps its motion: the second notch adds to the target, and the
  // position is past the first notch's line rather than jumping to it.
  await glideDone(scroller)
  expect(midway).toBeGreaterThan(0)
  expect(midway).toBeLessThan(300)
  expect(Math.abs(scroller.scrollTop - 600)).toBeLessThanOrEqual(1)
})

test('a wheel over a nested scroller that can still move is left to the browser', async () => {
  setMotion(MOTION_FULL)
  join()
  const scroller = await wheelBox('data-conversation-scroll')
  const inner = document.createElement('div')
  inner.style.cssText = 'height:50px;overflow:auto'
  const innerContent = document.createElement('div')
  innerContent.style.height = '500px'
  inner.append(innerContent)
  scroller.append(inner)
  const event = wheelOver(inner, 100)
  expect(event.defaultPrevented).toBe(false)
  expect(scroller.scrollTop).toBe(0)
})

test('outside the conversation, and under reduced motion, the wheel is left to the browser', async () => {
  setMotion(MOTION_FULL)
  join()
  const other = await wheelBox('data-other')
  expect(wheelOver(other, 300).defaultPrevented).toBe(false)
  setMotion(MOTION_REDUCED)
  const scroller = await wheelBox('data-conversation-scroll')
  const event = wheelOver(scroller, 300)
  expect(event.defaultPrevented).toBe(false)
  expect(scroller.scrollTop).toBe(0)
})
