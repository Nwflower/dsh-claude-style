#!/usr/bin/env node
/**
 * stream-jitter.mjs — whether the message column a reader looks at moves down
 * between two frames while an answer arrives faster than one slide runs
 * (D85, D92).
 *
 * The slide's own `translateY` saws by design: it puts the column back down by
 * each piece's growth and glides it up, and a piece that lands before that glide
 * ends restarts it from the distance still carried. Reading the transform alone
 * therefore measures the compensation, not what the reader sees. This scenario
 * reads the column's screen top, which already holds the scroller's offset and
 * the transform together: a slide that keeps up with the arrival holds that
 * number still or moves it up, and a slide that carries more than arrived moves
 * it down.
 *
 * The service hands the answer over a line at a time (`paced`, 160 pieces four
 * short lines each), which is the pace that made the slide restart before it
 * could finish. The scripts the lane had before this one sent a piece every
 * 300ms — after any slide had landed — so the restart never happened there.
 */
import { bound } from '../bounds.mjs'

/** How far the column's screen top may move down between two frames, in pixels. */
const JITTER_PX = bound('streamJitterMovePx')
/** The growth the sampled answer has to show, in pixels: a viewport's worth and then some. */
const GROWTH_PX = bound('streamJitterGrowthPx')
/** The composer and its bottom lines may move only by the scrollbar's own rounding. */
const COMPOSER_DRIFT_PX = bound('streamComposerDriftPx')

/**
 * The frames the transcript is scrolled and the host still follows it: the ones
 * where the column's top moves through the reader's screen.
 */
function followed(trace) {
  return trace.filter((frame) => typeof frame.flowTop === 'number' && typeof frame.top === 'number' && frame.top > 0 && frame.following === true)
}

/** Every move of the column's screen top between two adjacent followed frames. */
function moves(frames) {
  const out = []
  for (let at = 1; at < frames.length; at += 1) {
    out.push({ at: frames[at].t, by: Math.round((frames[at].flowTop - frames[at - 1].flowTop) * 10) / 10 })
  }
  return out
}

function boxDrift(frames, key) {
  const boxes = frames.map((frame) => frame[key]).filter((value) => typeof value === 'number' || Array.isArray(value))
  if (boxes.length === 0) return null
  const edges = typeof boxes[0] === 'number' ? [boxes] : [boxes.map((box) => box[0]), boxes.map((box) => box[1])]
  return Math.max(...edges.map((values) => Math.max(...values) - Math.min(...values)))
}

function streamJitterScenario({ check }, statsPosition = 'context') {
  return {
    script: 'paced',
    ...(statsPosition === 'context' ? {} : { patch: [
      '- id: ui-skin-claude-style',
      '  config:',
      `    statsPosition: ${statsPosition}`,
    ] }),
    prompt: 'write a long answer, a line at a time',
    // A provider's own pace, well under the 240ms a slide runs.
    delayMs: 30,
    // A short viewport, so the streamed answer outgrows it and the tail has to follow.
    viewport: { width: 1280, height: 600 },
    async assert({ trace, session }) {
      const frames = followed(trace)
      const walked = moves(frames)
      // A frame that moves the column down means the slide carried more than
      // arrived: the reader sees the column pushed back down under text that
      // had already gone up.
      const bounces = walked.filter((move) => move.by > JITTER_PX)
      const worst = walked.reduce((high, move) => Math.max(high, move.by), -Infinity)
      const grew = frames.length < 2 ? 0 : frames[frames.length - 1].height - frames[0].height
      const rising = walked.filter((move) => move.by < 0)
      const cardDrift = boxDrift(frames, 'card')
      const seatDrift = boxDrift(frames, 'seat')
      const statsDrift = boxDrift(frames, 'stats')
      return [
        check('逐帧采样真的在跑', trace.length > 60 && frames.length > 40, `${trace.length} frames, ${frames.length} scrolled while following`),
        check('回答在采样期间长出来', grew > GROWTH_PX, `grew ${grew}px`),
        check('消息列在相邻两帧之间没有往下走', bounces.length === 0, `downward frames=${bounces.length} of ${walked.length}, worst ${worst === -Infinity ? 'n/a' : `${worst}px`}${bounces.length === 0 ? '' : ` at ${bounces.slice(0, 4).map((move) => `${move.by}px/${move.at}ms`).join(' ')}`}`),
        // The other half of the reading: a column that never moved would pass the
        // check above without the slide doing anything at all. Pieces arrive
        // faster than frames, so many frames stand still; a third is the floor
        // under a stream that is visibly walking upward on this recording.
        check('跟随期间消息列在向上走', rising.length > walked.length / 3, `${rising.length} of ${walked.length} moves are upward`),
        check('连续输出期间输入卡片不上下移动', cardDrift !== null && cardDrift <= COMPOSER_DRIFT_PX, `${statsPosition}: card drift ${cardDrift}px`),
        check('连续输出期间输入区与底栏不上下移动', seatDrift !== null && seatDrift <= COMPOSER_DRIFT_PX &&
          (statsPosition === 'context' || (statsDrift !== null && statsDrift <= COMPOSER_DRIFT_PX)),
        `${statsPosition}: seat drift ${seatDrift}px, stats drift ${statsDrift}px`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { streamJitterScenario }
