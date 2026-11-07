/**
 * A reader holding the conversation keeps the line he was reading while the
 * answer streams: the growth the host's own follow pins away from him is given
 * back in the frame it was laid out in, whether that pin lands on the end or
 * anywhere inside the band the host still counts as the end.
 *
 * @capability chat-follow
 * @features chat-follow
 * @risk A reader who scrolled a few pixels up from a streaming answer has the line he just read pinned away under him on every burst, and nothing he does stops it.
 */
import { host, spec } from '../../fixtures/behaviour.mjs'

/** The band the host counts as the end of the conversation (packages/contracts/src/dom.ts). */
const BAND_PX = 25
/** How far above the end the reader holds, inside that band. */
const HELD_OFFSET_PX = 10
/** The height one streamed piece adds to the column. */
const GROWTH_PX = 40
/**
 * Where the host's follow leaves the position after that growth: on the end,
 * and inside its own band. The second is the shape the band exists for — the
 * host counts any position within it as the end and keeps pinning there.
 */
const LANDED_INSIDE_BAND_PX = 20

/**
 * Drive the page the way the reader and the host's follow do it. The reader
 * takes the scroll with a finger and sits `heldOffset` above the end (null for
 * the finger pressed on the end, and for a conversation nobody holds); the
 * column then grows and the host's pin writes where its follow lands, in the
 * same task as the growth and before the frame's resize callbacks.
 *
 * @param scenario - the selectors, whether a finger holds the conversation and
 *     how far above the end it sits, and where the pin lands.
 * @returns the position before the growth, after it, the first frame after it,
 *     and the gap the pin left behind.
 */
function runGrowth(scenario) {
  return (async () => {
    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()))
    const frames = async (count) => {
      for (let at = 0; at < count; at += 1) await nextFrame()
    }
    const scroller = document.querySelector(scenario.scroller)
    const column = document.querySelector(scenario.column)
    const following = column.parentElement
    const floor = () => scroller.scrollHeight - scroller.clientHeight
    const top = () => Math.round(scroller.scrollTop * 100) / 100
    const wheel = (deltaY) => column.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }))
    following.setAttribute(scenario.followingTail, '')
    scroller.scrollTop = floor()
    await frames(4)
    if (scenario.hold) {
      // A finger pressed on the conversation holds it with no direction of its own.
      const contact = new Touch({ identifier: 5, target: column, clientX: 5, clientY: 300 })
      column.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, composed: true, touches: [contact], targetTouches: [contact], changedTouches: [contact] }))
      if (scenario.heldOffset !== null) {
        scroller.scrollTop = floor() - scenario.heldOffset
        await frames(3)
      }
    }
    const before = top()
    const block = document.createElement('div')
    block.style.height = scenario.growth + 'px'
    column.appendChild(block)
    scroller.scrollTop = floor() - scenario.landedAt
    const landedGap = Math.round((floor() - scroller.scrollTop) * 100) / 100
    const firstFrame = await new Promise((resolve) => requestAnimationFrame(() => resolve(top())))
    await frames(3)
    const after = top()
    const end = Math.round(floor() * 100) / 100
    // The drag back to the end hands the follow over, for the next scenario.
    block.remove()
    wheel(120)
    scroller.scrollTop = floor()
    await frames(3)
    following.removeAttribute(scenario.followingTail)
    return { before, after, firstFrame, landedGap, end }
  })()
}

/** The page, the reader and the pin, for one scenario of runGrowth. */
const scenario = (overrides) => ({
  scroller: host('chat.scroller'),
  column: host('chat.flow'),
  followingTail: host('chat.following-tail-attribute'),
  growth: GROWTH_PX,
  ...overrides,
})

export default spec({ page: 'chat-follow' }, ({ test }) => {
  test('a reader holding inside the band keeps his line when the follow pins the growth away from him', async (t) => {
    const insideBand = await t.page.evaluate(runGrowth, scenario({ hold: true, heldOffset: HELD_OFFSET_PX, landedAt: LANDED_INSIDE_BAND_PX }))
    t.expectThat.equal(insideBand.landedGap <= BAND_PX && insideBand.landedGap > 0.5, true, 'the follow landed inside its own band, which is the growth this reader lost')
    t.expectThat.equal(insideBand.after, insideBand.before, 'the position the reader held, after the growth')
    t.expectThat.equal(insideBand.firstFrame, insideBand.before, 'the first frame after the growth')

    const onTheEnd = await t.page.evaluate(runGrowth, scenario({ hold: true, heldOffset: HELD_OFFSET_PX, landedAt: 0 }))
    t.expectThat.equal(onTheEnd.landedGap, 0, 'the follow landed on the end this time')
    t.expectThat.equal(onTheEnd.after, onTheEnd.before, 'the position the reader held, after the growth')
  })

  test('a finger pressed on the end keeps the old end, and a conversation nobody holds follows the growth', async (t) => {
    const atTheEnd = await t.page.evaluate(runGrowth, scenario({ hold: true, heldOffset: null, landedAt: 0 }))
    t.expectThat.equal(atTheEnd.after, atTheEnd.before, 'the end the finger was pressed on, after the growth')

    const unheld = await t.page.evaluate(runGrowth, scenario({ hold: false, heldOffset: null, landedAt: 0 }))
    t.expectThat.equal(unheld.after, unheld.end, 'the position after a growth nobody held')
  })
})
