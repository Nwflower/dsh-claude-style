#!/usr/bin/env node
/**
 * return-tail.mjs — the host's back-to-end button during a live turn, end to end
 * (D40, D92).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.mjs). It
 * reads the lane's own frame trace (packages/testing/e2e.mjs) for the position,
 * the gap and the host's follow.
 *
 * The reader wheels back to read, and the growth that follows leaves him where he
 * put himself: the scroll owner holds the conversation for him. Then he presses
 * the button the host renders while its follow is off. That press is his own
 * move toward the end, so the hold ends at it and the host's jump is the write
 * that takes the position there. A hold still standing at that moment is written
 * back on the next growth: the follow feature restores the held position
 * whenever growth lands at the tail under a held scroller (chat-follow.ts,
 * holdGrowth), which is the failure this scenario catches — the page lands at
 * the end and springs back to where the reader left it, with the follow off and
 * the button on screen again. The tap path is held in return-tail.spec.ts.
 */
import { bound } from '../bounds.mjs'
import { HOST } from '../lane.mjs'

/**
 * How far behind the tail the scroller may lag while the reader follows it: the
 * value and the reason it holds it are in packages/testing/data/bounds.json.
 */
const MAX_FOLLOW_GAP_PX = bound('laneFollowMaxGapPx')

/** How far the reader wheels back: more than the follow's own threshold, so the host reads him away from the end. */
const WHEEL_BACK_PX = 520

/** What the reader sees of the conversation's own position this moment. */
const readPlace = (page) => page.evaluate((marks) => {
  const scroller = document.querySelector(marks.scroller)
  return scroller === null
    ? null
    : {
      top: Math.round(scroller.scrollTop),
      gap: Math.round(scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop),
      height: Math.round(scroller.scrollHeight),
      following: document.querySelector(marks.followingTail) !== null,
    }
}, HOST)

function returnTailScenario({ check }) {
  return {
    script: 'long',
    prompt: 'write a long answer',
    delayMs: 250,
    viewport: { width: 1280, height: 600 },
    async duringTurn({ page }) {
      // Wait for the shape this asks about: a running turn whose answer fills
      // more than the viewport, with the host following its end. The lane's own
      // sampler has to be running before the wheel, so the frames it records
      // are there to compare against.
      await page.waitForFunction((marks) => {
        const scroller = document.querySelector(marks.scroller)
        if (scroller === null || document.querySelector(marks.running) === null) return false
        if ((window.__e2eTrace ?? []).length < 30) return false
        if (scroller.scrollHeight <= scroller.clientHeight * 1.5) return false
        if (document.querySelector(marks.followingTail) === null) return false
        return scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop === 0
      }, HOST, { timeout: 30000 })
      const box = await page.locator(HOST.scroller).boundingBox()
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.4)
      const before = await readPlace(page)
      await page.mouse.wheel(0, -WHEEL_BACK_PX)
      // The wheel's own scroll lands a frame later: the position it leaves is
      // the one the growth after it must not move.
      await page.waitForFunction((input) => {
        const scroller = document.querySelector(input.scroller)
        if (scroller === null || input.top === null) return false
        return Math.round(scroller.scrollTop) < input.top
      }, { ...HOST, ...before }, { timeout: 10000 })
      const parked = await readPlace(page)
      // The hold shows as what it does: content keeps arriving and the position
      // the reader chose does not move under him.
      await page.waitForFunction((input) => {
        const scroller = document.querySelector(input.scroller)
        if (scroller === null || input.top === null) return false
        return Math.round(scroller.scrollTop) === input.top && Math.round(scroller.scrollHeight) > input.height
      }, { ...HOST, ...parked }, { timeout: 15000 })
      // The button stands while the host's own follow is off, which its sampling
      // decides a beat after the wheel.
      await page.waitForFunction((marks) => {
        const column = document.querySelector(marks.flow)
        const frame = column === null || column.parentElement === null ? null : column.parentElement.parentElement
        const button = frame === null || frame.nextElementSibling === null ? null : frame.nextElementSibling.querySelector('button')
        return button !== null && document.querySelector(marks.followingTail) === null
      }, HOST, { timeout: 15000 })
      const left = await page.evaluate((marks) => {
        const scroller = document.querySelector(marks.scroller)
        const column = document.querySelector(marks.flow)
        const frame = column === null || column.parentElement === null ? null : column.parentElement.parentElement
        const button = frame === null || frame.nextElementSibling === null ? null : frame.nextElementSibling.querySelector('button')
        const place = button === null ? null : button.getBoundingClientRect()
        return {
          trace: (window.__e2eTrace ?? []).length,
          top: scroller === null ? null : Math.round(scroller.scrollTop),
          gap: scroller === null ? null : Math.round(scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop),
          height: scroller === null ? null : Math.round(scroller.scrollHeight),
          following: document.querySelector(marks.followingTail) !== null,
          place: place === null ? null : [place.left + place.width / 2, place.top + place.height / 2],
        }
      }, HOST)
      await page.evaluate((data) => {
        window.__returnTailLeft = data.left
        window.__returnTailParked = data.parked
      }, { left, parked })
      if (left.place !== null) await page.mouse.click(left.place[0], left.place[1])
      // The host's jump lands before this returns; what the growth after it does
      // with the position is the frames the assertion reads.
      await page.waitForFunction((marks) => {
        const scroller = document.querySelector(marks.scroller)
        return scroller !== null && scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop === 0
      }, HOST, { timeout: 10000 })
    },
    async assert({ trace, page, session }) {
      const left = await page.evaluate(() => window.__returnTailLeft ?? null)
      const parked = await page.evaluate(() => window.__returnTailParked ?? null)
      const after = left === null ? [] : trace.slice(left.trace)
      const last = trace[trace.length - 1] ?? null
      const tailAt = after.findIndex((frame) => frame.gap === 0)
      const fromTail = tailAt === -1 ? [] : after.slice(tailAt)
      return [
        check('按下按钮之前读者停在原处、内容继续增长', parked !== null && left !== null && left.top === parked.top && left.height !== null && left.height > parked.height, left === null || parked === null ? 'no reader phase in the trace' : `parked at ${parked.top}px, ${parked.height}px to ${left.height}px of content`),
        check('按下按钮时跟随已经关闭，按钮在页面上', left !== null && left.following === false && left.place !== null, left === null ? 'no reader phase in the trace' : `following ${left.following}, button ${left.place === null ? 'absent' : 'there'}`),
        check('点击之后对话回到末尾', tailAt !== -1, `${after.length} frames after the press, ${tailAt === -1 ? 'never at the tail' : `at the tail from frame ${tailAt}`}`),
        check('回到末尾之后一直留在末尾', fromTail.length > 0 && fromTail.every((frame) => frame.gap <= MAX_FOLLOW_GAP_PX && frame.following), fromTail.length === 0 ? 'never at the tail' : `${fromTail.filter((frame) => frame.gap > MAX_FOLLOW_GAP_PX).length} frames left the tail of ${fromTail.length}, gaps ${[...new Set(fromTail.map((frame) => frame.gap))].join('/')}px`),
        // Growth after the press is what the write-back needs to show itself; the
        // turn's own fold may leave the page shorter than it stood at the press.
        check('点击之后内容还在增长', left !== null && after.some((frame) => frame.height !== null && frame.height > left.height), left === null ? 'no reading' : `${left.height}px to ${Math.max(...after.map((frame) => frame.height ?? 0))}px`),
        check('点击之后对话一直在末尾跟随', last !== null && last.following && last.gap === 0, last === null ? 'no reading' : `following ${last.following}, gap ${last.gap}px`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { returnTailScenario }
