/**
 * Touch intent holds a streaming conversation (D40, D85): touchstart carries no
 * direction, vertical travel aims the drag, and an upward aim releases at the end.
 *
 * @capability scroll-ownership
 * @features engine
 * @risk A phone reader cannot stop a streaming answer, or the follow never resumes after the reader returns to its end.
 */
import { afterEach, expect, test } from 'vitest'
import { adoptSkin } from '@dsh-claude-style/engine/skin'
import { easeScrollToEndFor, readerHolds, writeScroll } from '@dsh-claude-style/engine/scroll-owner'
import { CHAT_FLOW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { MOTION_FULL, MOTION_REDUCED, READER_HOLD_ATTR, TEST_SKIN } from '../../fixtures/vocabulary'
import { attach } from '../../fixtures/host-markup'
import { createScrollOwnerFixture } from '../../fixtures/scroll-owner'

adoptSkin(TEST_SKIN)
const wanted = () => true
const cleanups: (() => void)[] = []
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!()
})
const { scrollBox, join, setMotion } = createScrollOwnerFixture(cleanups)

function touch(target: Element, type: 'touchstart' | 'touchmove' | 'touchend', clientY: number) {
  const contact = new Touch({ identifier: 7, target, clientX: 8, clientY })
  target.dispatchEvent(new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    touches: type === 'touchend' ? [] : [contact],
    targetTouches: type === 'touchend' ? [] : [contact],
    changedTouches: [contact],
  }))
}

function atEnd() {
  setMotion(MOTION_FULL)
  join()
  const scroller = scrollBox()
  scroller.scrollTop = scroller.scrollHeight
  return { scroller, content: scroller.firstElementChild! }
}

function dragAtEnd() {
  const fixture = atEnd()
  touch(fixture.content, 'touchstart', 400)
  return fixture
}

function expectHold(scroller: HTMLElement, held: boolean) {
  expect(readerHolds(scroller)).toBe(held)
  expect(scroller.hasAttribute(READER_HOLD_ATTR)).toBe(held)
  expect(easeScrollToEndFor(scroller, 'follow', wanted)).toBe(!held)
}

async function moveTo(box: HTMLElement, top: number) {
  const before = box.scrollTop
  box.scrollTop = top
  if (box.scrollTop === before) return
  await new Promise(resolve => box.addEventListener('scroll', resolve, { once: true }))
}

/**
 * A drag that reached the end of the host's own frame: the column the follow's
 * button is found from, and the button itself, which is the only way the host
 * lights its follow back up once its sampling window has settled.
 */
function followFrame(cleanups: (() => void)[]) {
  const box = scrollBox()
  const column = attach(box, CHAT_FLOW_SELECTOR)
  const frame = document.createElement('div')
  frame.append(box)
  const tail = document.createElement('div')
  const button = document.createElement('button')
  button.type = 'button'
  tail.append(button)
  document.body.append(frame, tail)
  let pressed = 0
  button.addEventListener('click', () => { pressed += 1 })
  cleanups.push(() => {
    frame.remove()
    tail.remove()
  })
  return { scroller: box, content: box.firstElementChild!, pressed: () => pressed }
}

test('a touch at the end holds against the stream because touchstart aims nothing', () => {
  const { scroller } = dragAtEnd()
  expectHold(scroller, true)
})

test('a downward drag holds away from the end; turning up and reaching it resumes', async () => {
  const { scroller, content } = dragAtEnd()
  touch(content, 'touchmove', 460)
  await moveTo(scroller, scroller.scrollHeight - 300)
  expectHold(scroller, true)
  touch(content, 'touchmove', 380)
  await moveTo(scroller, scroller.scrollHeight)
  expectHold(scroller, false)
})

test.each([MOTION_FULL, MOTION_REDUCED])('composer growth respects a touch-held position and resumes at the tail with %s motion', async mode => {
  const { scroller, content } = dragAtEnd()
  setMotion(mode)
  touch(content, 'touchmove', 460)
  await moveTo(scroller, scroller.scrollHeight - scroller.clientHeight - 100)
  const top = scroller.scrollTop
  expect(writeScroll(scroller, scroller.scrollHeight, 'composer')).toBe(false)
  expect(easeScrollToEndFor(scroller, 'composer', wanted)).toBe(false)
  expect(scroller.scrollTop).toBe(top)
  expectHold(scroller, true)
  touch(content, 'touchmove', 380)
  await moveTo(scroller, scroller.scrollHeight)
  expectHold(scroller, false)
  expect(writeScroll(scroller, scroller.scrollHeight, 'composer')).toBe(true)
})

test('a hold aimed away stands under the pin and an upward aim releases at the end', async () => {
  const { scroller, content } = dragAtEnd()
  touch(content, 'touchmove', 460)
  await moveTo(scroller, scroller.scrollHeight)
  expectHold(scroller, true)
  touch(content, 'touchmove', 440)
  await moveTo(scroller, scroller.scrollHeight)
  expectHold(scroller, false)
})

test('a horizontal flick keeps the existing direction', async () => {
  const { scroller, content } = dragAtEnd()
  touch(content, 'touchmove', 460)
  touch(content, 'touchmove', 460)
  await moveTo(scroller, scroller.scrollHeight)
  expectHold(scroller, true)
  touch(content, 'touchstart', 300)
  touch(content, 'touchmove', 300)
  await moveTo(scroller, scroller.scrollHeight)
  expectHold(scroller, true)
})

test('the wheel keeps its own direction and release', () => {
  const { scroller } = atEnd()
  scroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -120 }))
  expectHold(scroller, true)
  scroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 120 }))
  expectHold(scroller, false)
})

test('a finger lifted at the end ends the hold and hands the follow back', async () => {
  setMotion(MOTION_FULL)
  join()
  const { scroller, content, pressed } = followFrame(cleanups)
  scroller.scrollTop = scroller.scrollHeight
  touch(content, 'touchstart', 400)
  touch(content, 'touchmove', 460)
  await moveTo(scroller, scroller.scrollHeight - 400)
  expectHold(scroller, true)
  touch(content, 'touchmove', 380)
  // The drag's last travel, before the scroll it causes is delivered: the lift
  // is what settles the hold, as a finger that stops at the bottom sends no
  // further scroll for the page to read.
  scroller.scrollTop = scroller.scrollHeight
  touch(content, 'touchend', 380)
  expect(readerHolds(scroller)).toBe(false)
  expect(scroller.hasAttribute(READER_HOLD_ATTR)).toBe(false)
  await new Promise(resolve => setTimeout(resolve, 350))
  expect(pressed()).toBe(1)
})

test('a finger lifted away from the end keeps the hold', async () => {
  const { scroller, content } = dragAtEnd()
  touch(content, 'touchmove', 460)
  await moveTo(scroller, scroller.scrollHeight - 400)
  touch(content, 'touchend', 460)
  expectHold(scroller, true)
})
