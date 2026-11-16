/**
 * Pressing the host's back-to-end button — with the pointer, the first touch of a
 * tap, or the key that presses it — is the reader's own move toward the end
 * (D40, D95): the hold ends at that contact, so the growth that lands after it
 * cannot write the position he left back onto the conversation.
 *
 * @capability scroll-ownership
 * @features engine
 * @risk A press on the button lands the page at the end and springs it back to the position the reader left, with the follow off and the button on screen again.
 */
import { expect, test } from 'vitest'
import { adoptSkin } from '@dsh-claude-style/engine/skin'
import { holdReader, readerHolds } from '@dsh-claude-style/engine/scroll-owner'
import { MOTION_FULL, TEST_SKIN } from '../../fixtures/vocabulary'
import { followTailButton, scrollOwnerSuite, settledScroll } from '../../fixtures/scroll-owner'

adoptSkin(TEST_SKIN)

const { scrollBox, join, setMotion } = scrollOwnerSuite()

/** The reader takes the conversation and the content under him grows: his position must not move. */
async function holdAndGrow(scroller: HTMLElement) {
  setMotion(MOTION_FULL)
  join()
  scroller.scrollTop = scroller.scrollHeight
  await settledScroll(scroller)
  scroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -120 }))
  scroller.scrollTop = 400
  await settledScroll(scroller)
  ;(scroller.firstElementChild as HTMLElement).style.height = '3000px'
  // The host pins the grown end under him, which a growth pin keeps the hold through.
  scroller.scrollTop = scroller.scrollHeight
  await settledScroll(scroller)
  expect(readerHolds(scroller)).toBe(true)
}

test('a press on the host\'s back-to-end button ends the reader\'s hold at the press', async () => {
  const scroller = scrollBox()
  const button = followTailButton(scroller)
  await holdAndGrow(scroller)
  button.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }))
  expect(readerHolds(scroller)).toBe(false)
})

test('a touch tap on the button ends the hold at its touchstart', async () => {
  const scroller = scrollBox()
  const button = followTailButton(scroller)
  await holdAndGrow(scroller)
  // The browser's own order for a tap: the pointer press, then the touch contact.
  button.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }))
  const contact = new Touch({ identifier: 3, target: button, clientX: 8, clientY: 8 })
  button.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, composed: true, touches: [contact], targetTouches: [contact], changedTouches: [contact] }))
  expect(readerHolds(scroller)).toBe(false)
})

test('a press on another button in the conversation leaves the hold standing', async () => {
  const scroller = scrollBox()
  followTailButton(scroller)
  await holdAndGrow(scroller)
  const other = document.createElement('button')
  scroller.firstElementChild!.append(other)
  other.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }))
  expect(readerHolds(scroller)).toBe(true)
})

test('the key that activates the button ends the hold, and no other key does', async () => {
  const scroller = scrollBox()
  const button = followTailButton(scroller)
  await holdAndGrow(scroller)
  button.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
  expect(readerHolds(scroller)).toBe(true)
  button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  expect(readerHolds(scroller)).toBe(false)
  holdReader(scroller)
  button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
  expect(readerHolds(scroller)).toBe(false)
})
