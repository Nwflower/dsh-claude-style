/**
 * The hand-back stands the host's follow up from the end the reader is at; it
 * does not walk a position above the end down to it. The host restores a
 * conversation's saved position whenever the reader comes back to it, and the
 * gate the follow feature passes through cannot tell that place from a follow
 * that fell one step behind: the hand-back is what holds the difference, and
 * the place the reader left stays where he left it (D40, D95).
 *
 * @capability scroll-ownership
 * @features engine
 * @risk Coming back to a conversation whose saved position sits inside the last screen springs the page to the end and turns the host's follow back on, losing the place the reader left.
 */
import { expect, test } from 'vitest'
import { adoptSkin } from '@dsh-claude-style/engine/skin'
import { handBackFollow } from '@dsh-claude-style/engine/scroll-owner'
import { MOTION_FULL, TEST_SKIN } from '../../fixtures/vocabulary'
import { followTailButton, scrollOwnerSuite, settledScroll } from '../../fixtures/scroll-owner'

adoptSkin(TEST_SKIN)

const { scrollBox, join, setMotion } = scrollOwnerSuite()

/** How far above the end a saved position may sit: inside the last screen the host restores. */
const SAVED_GAP_PX = 250

/** The button the host renders while its follow is off, and how often it was pressed. */
function followButton(scroller: HTMLElement) {
  const button = followTailButton(scroller)
  const presses = { count: 0 }
  button.addEventListener('click', () => {
    presses.count += 1
  })
  return presses
}

/** Run one hand-back to its settlement. */
function handBack() {
  return new Promise<void>((resolve) => {
    handBackFollow({ onSettled: resolve })
  })
}

test('a hand-back leaves a saved position above the end where the reader left it', async () => {
  setMotion(MOTION_FULL)
  join()
  const scroller = scrollBox()
  const presses = followButton(scroller)
  scroller.scrollTop = scroller.scrollHeight - scroller.clientHeight - SAVED_GAP_PX
  await settledScroll(scroller)
  const saved = scroller.scrollTop
  // The follow is off at this position — the host turned it off over the write
  // that restored it — and its button stands on the page for the reader.
  await handBack()
  expect(scroller.scrollTop).toBe(saved)
  expect(presses.count).toBe(0)
})

test('a hand-back at the end still presses the host\'s button', async () => {
  setMotion(MOTION_FULL)
  join()
  const scroller = scrollBox()
  const presses = followButton(scroller)
  scroller.scrollTop = scroller.scrollHeight
  await settledScroll(scroller)
  await handBack()
  expect(presses.count).toBe(1)
})
