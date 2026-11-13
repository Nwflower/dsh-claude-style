/**
 * Who may move the conversation (D40, D85): writes and eases are ranked by source,
 * and the reader's own wheel, key or scrollbar drag holds the conversation against
 * every following source until they come back to its end, marked on the container.
 *
 * @capability scroll-ownership
 * @features engine
 * @risk While the reader scrolls up to re-read something, a streaming answer drags them back to the bottom; or after they return to the end, the conversation stops following the stream.
 */
import { afterEach, expect, test } from 'vitest'
import { adoptSkin } from '@dsh-claude-style/engine/skin'
import { easeScrollFor, easeScrollToEndFor, holdReader, readerHolds, readerMovedSince, readerScrollPosition, readerScrollRevision, releaseReader, submissionHolds, writeScroll } from '@dsh-claude-style/engine/scroll-owner'
import { CONVERSATION_SCROLL_SELECTOR, CONVERSATION_SESSION_ATTRIBUTE, CONVERSATION_SESSION_SELECTOR, FLOW_KIND_ATTRIBUTE, PHASE_ATTRIBUTE, PROCESS_BODY_SELECTOR, USER_ROW_KIND } from '@dsh-claude-style/contracts/dom'
import { MOTION_FULL, MOTION_REDUCED, READER_HOLD_ATTR, TEST_SKIN } from '../../fixtures/vocabulary'
import { createScrollOwnerFixture } from '../../fixtures/scroll-owner'

adoptSkin(TEST_SKIN)

const nextFrame = () => new Promise<number>(resolve => requestAnimationFrame(resolve))
const wanted = () => true

const cleanups: (() => void)[] = []
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!()
})

/** Another scroller beside the conversation, which the owner does not govern. */
function besideBox() {
  const box = document.createElement('div')
  box.style.cssText = 'height:100px;overflow:auto'
  const content = document.createElement('div')
  content.style.height = '2000px'
  box.append(content)
  document.body.append(box)
  cleanups.push(() => box.remove())
  return box
}

const { scrollBox, join, setMotion } = createScrollOwnerFixture(cleanups)

/** The reader's own user row, as the host mounts it into the conversation. */
function userRow() {
  const row = document.createElement('div')
  row.setAttribute(FLOW_KIND_ATTRIBUTE, USER_ROW_KIND)
  return row
}

const settledScroll = (box: HTMLElement) => new Promise(resolve => box.addEventListener('scroll', resolve, { once: true }))

/**
 * The host writes the conversation to its end with no move of the reader's: the
 * hold stands. The reader's own wheel toward the end is what ends it.
 */
async function holdOutlastsHostWrite(scroller: HTMLElement) {
  scroller.scrollTop = scroller.scrollHeight
  await settledScroll(scroller)
  expect(readerHolds(scroller)).toBe(true)
  scroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 120 }))
  expect(readerHolds(scroller)).toBe(false)
}

test('a source ranked below the running ease is refused, an equal or higher one is carried out', () => {
  setMotion(MOTION_FULL)
  const scroller = scrollBox(CONVERSATION_SCROLL_SELECTOR)
  expect(easeScrollFor(scroller, 'jump', () => 600, wanted)).toBe(true)
  expect(writeScroll(scroller, 0, 'fold')).toBe(false)
  expect(easeScrollToEndFor(scroller, 'follow', wanted)).toBe(false)
  expect(writeScroll(scroller, 300, 'jump')).toBe(true)
  expect(scroller.scrollTop).toBe(300)
})

test('a write ends a running ease that ranks below it', () => {
  setMotion(MOTION_FULL)
  const scroller = scrollBox(CONVERSATION_SCROLL_SELECTOR)
  expect(easeScrollToEndFor(scroller, 'follow', wanted)).toBe(true)
  expect(writeScroll(scroller, 200, 'composer')).toBe(true)
  expect(scroller.scrollTop).toBe(200)
})

test('the reader holds the conversation until they come back to its end; only following sources are refused meanwhile', async () => {
  setMotion(MOTION_FULL)
  join()
  const scroller = scrollBox(CONVERSATION_SCROLL_SELECTOR)
  scroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -120 }))
  expect(readerHolds(scroller)).toBe(true)
  expect(scroller.hasAttribute(READER_HOLD_ATTR)).toBe(true)
  expect(easeScrollToEndFor(scroller, 'follow', wanted)).toBe(false)
  expect(writeScroll(scroller, scroller.scrollHeight, 'composer')).toBe(false)
  expect(scroller.scrollTop).toBe(0)
  expect(writeScroll(scroller, 50, 'reader')).toBe(true)
  // Content growing under the hold cannot drag them back to the end.
  ;(scroller.firstElementChild as HTMLElement).style.height = '3000px'
  await holdOutlastsHostWrite(scroller)
  expect(scroller.hasAttribute(READER_HOLD_ATTR)).toBe(false)
  expect(easeScrollToEndFor(scroller, 'follow', wanted)).toBe(true)
  expect(writeScroll(scroller, scroller.scrollHeight, 'composer')).toBe(true)
})

test('a press or a wheel outside the conversation is no hold on it: the follow keeps going', () => {
  setMotion(MOTION_FULL)
  join()
  const scroller = scrollBox(CONVERSATION_SCROLL_SELECTOR)
  // A child transcript open beside the conversation scrolls on its own.
  const beside = besideBox()
  beside.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -120 }))
  beside.firstElementChild!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
  expect(readerHolds(scroller)).toBe(false)
  expect(easeScrollToEndFor(scroller, 'follow', wanted)).toBe(true)
  // A scroll key with nothing focused moves the conversation, and is theirs.
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true }))
  expect(readerHolds(scroller)).toBe(true)
})

test('a jump to a turn holds the follow off until the reader comes back to the end, and marks the container', async () => {
  setMotion(MOTION_FULL)
  join()
  const scroller = scrollBox(CONVERSATION_SCROLL_SELECTOR)
  holdReader(scroller)
  expect(readerHolds(scroller)).toBe(true)
  expect(scroller.hasAttribute(READER_HOLD_ATTR)).toBe(true)
  expect(easeScrollToEndFor(scroller, 'follow', wanted)).toBe(false)
  await holdOutlastsHostWrite(scroller)
})

test('a hold whose position lands at the end stands until the reader moves toward it', async () => {
  join()
  const scroller = scrollBox(CONVERSATION_SCROLL_SELECTOR)
  holdReader(scroller)
  // The jump's landing is the end: a position written there is not their move back.
  await holdOutlastsHostWrite(scroller)
})

test('the reader position survives the host pinning a growing stream to its end', async () => {
  join()
  const scroller = scrollBox(CONVERSATION_SCROLL_SELECTOR)
  scroller.scrollTop = scroller.scrollHeight
  await settledScroll(scroller)
  scroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -120 }))
  scroller.scrollTop = 400
  await settledScroll(scroller)
  expect(readerScrollPosition(scroller)).toBe(400)
  ;(scroller.firstElementChild as HTMLElement).style.height = '3000px'
  scroller.scrollTop = scroller.scrollHeight
  await settledScroll(scroller)
  expect(readerHolds(scroller)).toBe(true)
  expect(readerScrollPosition(scroller)).toBe(400)
  expect(writeScroll(scroller, readerScrollPosition(scroller)!, 'reader')).toBe(true)
  await settledScroll(scroller)
  expect(scroller.scrollTop).toBe(400)
})

test('a host growth pin keeps the held revision; only new travel away from the tail advances it', async () => {
  join()
  const scroller = scrollBox(CONVERSATION_SCROLL_SELECTOR)
  scroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -120 }))
  scroller.scrollTop = 400
  await settledScroll(scroller)
  const chosen = readerScrollRevision(scroller)
  ;(scroller.firstElementChild as HTMLElement).style.height = '3000px'
  scroller.scrollTop = scroller.scrollHeight
  await settledScroll(scroller)
  expect(readerScrollRevision(scroller)).toBe(chosen)
  scroller.scrollTop = 450
  await settledScroll(scroller)
  expect(readerScrollRevision(scroller)).toBeGreaterThan(chosen)
})

test('a process body is held by a drag of its scrollbar, not by a press on its content', () => {
  join()
  const body = scrollBox(PROCESS_BODY_SELECTOR)
  const box = body.getBoundingClientRect()
  body.firstElementChild!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
  expect(readerHolds(body)).toBe(false)
  // The strip the browser leaves beside clientWidth: a press there is the reader scrolling.
  body.dispatchEvent(new PointerEvent('pointerdown', { clientX: box.left + body.clientWidth + 2, clientY: box.top + 10, bubbles: true }))
  expect(readerHolds(body)).toBe(true)
  releaseReader(body)
  expect(body.hasAttribute(READER_HOLD_ATTR)).toBe(false)
  // Inside the content at the same height: the reader is opening something.
  body.dispatchEvent(new PointerEvent('pointerdown', { clientX: box.left + 2, clientY: box.top + 10, bubbles: true }))
  expect(readerHolds(body)).toBe(false)
})

test('the reader\'s own message arms the submission hold and leaves the follow alone', async () => {
  setMotion(MOTION_FULL)
  join()
  const scroller = scrollBox(CONVERSATION_SCROLL_SELECTOR)
  scroller.append(userRow())
  await nextFrame()
  await nextFrame()
  expect(submissionHolds()).toBe(true)
  expect(easeScrollToEndFor(scroller, 'follow', wanted)).toBe(true)
})

test('a hold armed by one conversation does not follow the reader into the next', async () => {
  setMotion(MOTION_FULL)
  join()
  // The conversation's own element, in the shape the host draws it: the active
  // phase holding the session's column.
  const phase = document.createElement('div')
  phase.setAttribute(PHASE_ATTRIBUTE, 'active')
  const session = document.createElement('div')
  session.setAttribute(CONVERSATION_SESSION_ATTRIBUTE, 'session-one')
  const scroller = scrollBox(CONVERSATION_SCROLL_SELECTOR)
  session.append(scroller)
  phase.append(session)
  document.body.append(phase)
  cleanups.push(() => phase.remove())
  scroller.append(userRow())
  await nextFrame()
  await nextFrame()
  expect(submissionHolds()).toBe(true)
  // A session switch keeps the scroller (the reading view reuses it): the hold
  // the last conversation armed must not stand over the session just opened.
  // The fixture is the shape the contract names.
  expect(session.matches(CONVERSATION_SESSION_SELECTOR)).toBe(true)
  session.setAttribute(CONVERSATION_SESSION_ATTRIBUTE, 'session-two')
  writeScroll(scroller, 100, 'composer')
  expect(submissionHolds()).toBe(false)
})

test('under reduced motion an ease is its destination written at once', () => {
  setMotion(MOTION_REDUCED)
  const scroller = scrollBox(CONVERSATION_SCROLL_SELECTOR)
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

test('scrollbar drag upward, upward keys, and content clicks keep the hold across growth pins', async () => {
  setMotion(MOTION_FULL)
  join()
  const scroller = scrollBox(CONVERSATION_SCROLL_SELECTOR)
  scroller.scrollTop = scroller.scrollHeight
  await settledScroll(scroller)

  // Dragging the conversation scrollbar upward from the very bottom keeps the hold even inside the 25px band.
  const box = scroller.getBoundingClientRect()
  scroller.dispatchEvent(new PointerEvent('pointerdown', { clientX: box.left + scroller.clientWidth + 2, clientY: box.bottom - 12, bubbles: true }))
  scroller.scrollTop = scroller.scrollHeight - scroller.clientHeight - 10
  await settledScroll(scroller)
  expect(readerHolds(scroller)).toBe(true)
  scroller.scrollTop = 420
  await settledScroll(scroller)
  document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
  expect(readerHolds(scroller)).toBe(true)

  // Clicking content or scrolling slightly down then up in history never lets a host growth pin drop the hold.
  scroller.firstElementChild!.dispatchEvent(new PointerEvent('pointerdown', { clientX: box.left + 10, clientY: box.top + 10, bubbles: true }))
  scroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 40 }))
  scroller.scrollTop = 460
  await settledScroll(scroller)
  ;(scroller.firstElementChild as HTMLElement).style.height = '3200px'
  scroller.scrollTop = scroller.scrollHeight
  await settledScroll(scroller)
  expect(readerHolds(scroller)).toBe(true)
  expect(readerScrollPosition(scroller)).toBe(460)
  expect(writeScroll(scroller, readerScrollPosition(scroller)!, 'reader')).toBe(true)
  await settledScroll(scroller)

  // Dragging the scrollbar all the way back to the bottom releases the hold.
  scroller.dispatchEvent(new PointerEvent('pointerdown', { clientX: box.left + scroller.clientWidth + 2, clientY: box.top + 40, bubbles: true }))
  scroller.scrollTop = scroller.scrollHeight
  await settledScroll(scroller)
  document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
  expect(readerHolds(scroller)).toBe(false)

  // Upward scroll keys at the tail do not release on the first smooth-scroll step.
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
  scroller.scrollTop = scroller.scrollHeight - scroller.clientHeight - 8
  await settledScroll(scroller)
  expect(readerHolds(scroller)).toBe(true)
})

test('once the last member leaves, intents are no longer heard', () => {
  const leave = join()
  const scroller = scrollBox(CONVERSATION_SCROLL_SELECTOR)
  leave()
  scroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true }))
  expect(readerHolds(scroller)).toBe(false)
})
