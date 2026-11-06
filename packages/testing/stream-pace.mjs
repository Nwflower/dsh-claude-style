#!/usr/bin/env node
/**
 * stream-pace.mjs — where the composer stands, and how far behind the pin the
 * answer runs, while an answer arrives faster than a slide carries it, end to
 * end (D85, D77).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.mjs). It
 * reads the lane's own frame trace (packages/testing/e2e.mjs), which carries
 * the composer card's box, the scroller's position and the message column's
 * last row against the scroller's own bottom.
 *
 * The service hands a reply of this shape over in one flush, wider than any
 * slide carries (script `burst`): the host's follow pins the end in the frame
 * it lands in, and the skin's slide puts the column back down by as much of it
 * as a slide carries and glides to rest (chat-follow.ts). The composer is the
 * scroller's sibling, so none of that may move it. Two defects showed up there
 * once the answer arrived this fast: the slide restarted from the linear share
 * of an animation that paints on an eased curve, so its offset piled up, and a
 * single growth wider than a slide carries was taken for a replaced column and
 * never slid at all. The scenario holds both ends: the composer's box stays
 * where it stood, and no frame leaves the column off the pin by more than one
 * slide covers.
 */
import { bound } from './bounds.mjs'

/** The host's page markers this scenario reads, as packages/testing/lane.mjs names them. */
const HOST = {
  composerCard: '[data-composer-card]', // COMPOSER_CARD_SELECTOR
}

/** How far the composer card may stand from the place it held, in pixels: the scrollbar appearing moves it half of one. */
const COMPOSER_DRIFT_PX = bound('streamComposerDriftPx')
/** The most a frame may leave the column off the pin, as a share of the column's one frame of growth. */
const PIN_SLIP_RATIO = bound('streamPinSlipRatio')
/** The floor under that share: the longest stretch one slide carries. */
const PIN_SLIP_FLOOR_PX = bound('streamPinSlipPx')
/** The foot the host's column keeps under its last row, which the trace's lag does not measure. */
const COLUMN_FOOT_PX = bound('streamColumnFootPx')

/**
 * Where the conversation's own layout puts the composer's card, and every frame
 * from the first one it held that place. The home page's card stands lower,
 * over the greeting; the frames in between are the host taking that page away
 * and laying the message out, and none of them is a reading of where the card
 * lives.
 *
 * @returns `{ home, carried }`: the place, and the frames the card holds it in.
 */
function composerHome(trace) {
  const conversation = trace.filter((frame) => frame.card !== null && frame.card !== undefined && frame.height !== undefined && frame.height - frame.gap - frame.top >= 400)
  const openedAt = conversation.findIndex((frame) => Math.abs(frame.card - conversation[0].card) > COMPOSER_DRIFT_PX)
  const counts = new Map()
  for (const frame of conversation.slice(openedAt === -1 ? 1 : openedAt)) {
    counts.set(frame.card, (counts.get(frame.card) ?? 0) + 1)
  }
  let home = null
  let most = 0
  for (const [place, count] of counts) {
    if (count > most) {
      most = count
      home = place
    }
  }
  const from = trace.findIndex((frame) => frame.card === home)
  const carried = trace.slice(from === -1 ? trace.length : from)
  return { home, from, carried }
}

function streamPaceScenario({ check }) {
  return {
    script: 'burst',
    prompt: 'answer all at once',
    viewport: { width: 1280, height: 700 },
    async afterTurn(context) {
      // The turn can settle inside a short frame burst. Keep two settled frames
      // in the trace so the slide and the composer's resting place are covered.
      await context.page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      context.trace = await context.page.evaluate(() => window.__e2eTrace ?? [])
    },
    async assert({ trace, page, session }) {
      // The frames from the answer's first growth: before it the column stands
      // shorter than the scroller and nothing has been pinned.
      const grewAt = trace.findIndex((frame, at) => at > 0 && frame.height !== undefined && trace[at - 1].height !== undefined && frame.height !== trace[at - 1].height)
      const live = grewAt === -1 ? [] : trace.slice(grewAt)
      // The composer's card from the frame the conversation's layout puts it in
      // its place: judged from there, the frames the host takes the home page
      // away in are no reading.
      const { home, carried } = composerHome(trace)
      const moved = carried.filter((frame) => frame.card !== null && frame.card !== undefined && Math.abs(frame.card - home) > COMPOSER_DRIFT_PX)
      const growth = []
      for (let at = 1; at < live.length; at += 1) {
        const delta = live[at].height - live[at - 1].height
        if (delta > 0) growth.push(delta)
      }
      growth.sort((left, right) => left - right)
      const median = growth.length === 0 ? 0 : growth[Math.floor(growth.length / 2)]
      // The answer arrives as one flush: one frame carries all of it, and any
      // other growing frame carries the tail of a render the host had already
      // begun. A host that renders the flush inside one frame grows only once.
      const burst = growth.length === 0 ? null : growth[growth.length - 1]
      // Only frames the transcript overflowed in: a column shorter than the
      // scroller rides its own end even untorn.
      const overflowing = (frame) => frame.height - frame.gap - frame.top < frame.height
      const pinning = live.filter((frame) => typeof frame.lag === 'number' && overflowing(frame))
      // A frame that leaves the column's foot above the scroller's end by more
      // than one frame's growth let the slide's offset stand where the content
      // had not gone. The floor is the longest stretch a slide carries, which a
      // burst wider than a slide is put back down by — less the column's own
      // foot under its last row, which the host leaves for the composer and a
      // scroller overflows into.
      const allowed = Math.max(median * PIN_SLIP_RATIO, PIN_SLIP_FLOOR_PX + COLUMN_FOOT_PX)
      const slip = pinning.filter((frame) => frame.lag < -(allowed + 1))
      const worst = pinning.reduce((low, frame) => Math.min(low, frame.lag), 0)
      // Whether the answer landed at all: the transcript reaches the place the
      // page puts its composer.
      const end = await page.evaluate((selector) => {
        const card = document.querySelector(selector)
        return card === null ? null : Math.round(card.getBoundingClientRect().top * 10) / 10
      }, HOST.composerCard)
      return [
        check('逐帧采样真的在跑', trace.length > 30 && grewAt !== -1, `${trace.length} frames, the first growth at ${grewAt}`),
        check('回答以整段一起到达', burst !== null, `${growth.length} growing frames, one frame grew ${burst}px, the rest ${growth.slice(0, -1).join('/')}px`),
        check('输入卡片的盒子在整个回合里不动', home !== null && moved.length === 0, `home ${home}px, frames away from it ${moved.length}${moved.length === 0 ? '' : `：${moved.slice(0, 3).map((frame) => `${frame.card} at ${frame.t}ms`).join(' | ')}`}`),
        check('消息列没有一帧被留在输入区上方超过滑动能带走的一段', pinning.length > 0 && slip.length === 0, `frames off the pin=${pinning.length}, worst ${worst}px, allowed -${Math.round(allowed)}px`),
        check('落定后回答落在末尾', end !== null && home !== null && end <= home + COMPOSER_DRIFT_PX, `the composer at ${end}px, the transcript's end at ${home}px`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { streamPaceScenario }
