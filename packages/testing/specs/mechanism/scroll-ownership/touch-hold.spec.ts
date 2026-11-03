/**
 * Touch intent holds a streaming conversation (D40, D71): touchstart carries no
 * direction, vertical travel aims the drag, and an upward aim releases at the end.
 *
 * @capability scroll-ownership
 * @features engine
 * @risk A phone reader cannot stop a streaming answer, or the follow never resumes after the reader returns to its end.
 */
import { afterEach, expect, test } from 'vitest'
import { adoptSkin } from '@dsh-claude-style/engine/skin'
import { easeScrollToEndFor, readerHolds } from '@dsh-claude-style/engine/scroll-owner'
import { MOTION_FULL, READER_HOLD_ATTR, TEST_SKIN } from '../../fixtures/vocabulary'
import { createScrollOwnerFixture } from '../../fixtures/scroll-owner'

adoptSkin(TEST_SKIN)
const wanted = () => true
const cleanups: (() => void)[] = []
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!()
})
const { scrollBox, join, setMotion } = createScrollOwnerFixture(cleanups)

function touch(target: Element, type: 'touchstart' | 'touchmove', clientY: number) {
  const contact = new Touch({ identifier: 7, target, clientX: 8, clientY })
  target.dispatchEvent(new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    touches: [contact],
    targetTouches: [contact],
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
