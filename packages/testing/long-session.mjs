#!/usr/bin/env node
/**
 * long-session.mjs — what a frame costs once the conversation is long (D86).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.mjs).
 *
 * The scenario grows a transcript first, then streams one more answer while an
 * in-page probe times the frames, so what a frame costs once the conversation is
 * long is judged on the numbers a long session really pays — a pass that grew
 * with the page, or with its square, trips the bounds below. The bounds are loose on
 * purpose — a lane runner is a shared machine — and the readings are printed
 * with every check so a regression is visible before it trips one.
 *
 * The frame timer is a `requestAnimationFrame` interval, so its readings are
 * the wall clock between frames: on a headless runner without a GPU the p50
 * sits above one 60 Hz frame for reasons that have nothing to do with the
 * skin, and the comparison that matters is the same runner before and after a
 * change to the pass (a `git worktree` of the previous revision runs the same
 * scenario).
 */
import { sendPrompt, waitForTurn } from './prompt.mjs'
import { bound } from './bounds.mjs'

/**
 * How many turns the transcript is grown by before the measured one. The
 * default keeps the scenario's own runtime near a minute; a run judging a
 * change to what a long transcript costs raises it (`DSH_LONG_SESSION_TURNS`)
 * to put hundreds of rows on the page.
 */
const FILL_TURNS = Number(process.env.DSH_LONG_SESSION_TURNS ?? 8)
/** The transcript the first measured round streams into: two turns, so the second round compares against a page several times longer. */
const SHORT_TURNS = 2
/** The pause between the scripted answer's pieces: fast enough for eight fill turns, slow enough to stream. */
const STREAM_DELAY_MS = 60
/** A frame in a long session stays under this; the value and its reason are in packages/testing/data/bounds.json. */
const WORST_FRAME_MS = bound('longSessionWorstFrameMs')
const MIN_SPAN_MS = bound('longSessionMinSpanMs')
/** Long tasks together stay under this over the measured turn; the value and its reason are in packages/testing/data/bounds.json. */
const LONG_TASK_BUDGET_MS = bound('longSessionLongTaskBudgetMs')
/**
 * The two lengths of the same turn as one ratio, and the growth the longer one
 * may cost: its own page is about four times the shorter one's, so a cost that
 * follows the page's size travels with that factor, and one that follows its
 * square (a scan per row, a document query per element) lands near sixteen and
 * trips. The slack covers what a shared runner adds between two rounds. Every
 * value and its reason are in packages/testing/data/bounds.json.
 */
const GROWTH_RATIO = bound('longSessionGrowthRatio')
const GROWTH_SLACK = bound('longSessionGrowthSlack')
const QUERY_SLACK = bound('longSessionQuerySlack')
const GROWTH_FLOOR_MS = bound('longSessionGrowthFloorMs')

/** The in-page readings of one measured round, counters reset first. */
async function measureTurn(page, prompt) {
  await page.evaluate(() => {
    window.__longSession.frames.length = 0
    window.__longSession.longtasks.length = 0
    window.__longSession.queries = 0
  })
  await sendPrompt(page, prompt)
  await waitForTurn(page)
  return read(page)
}

/** What the page counted: the frames, the long tasks and every whole-document lookup. */
async function read(page) {
  return page.evaluate(() => ({
    frames: window.__longSession.frames.slice(),
    longtasks: window.__longSession.longtasks.slice(),
    queries: window.__longSession.queries,
    nodes: document.querySelectorAll('body *').length,
    rows: document.querySelectorAll('[data-chat-flow-kind]').length,
  }))
}

/** The p95 frame of a round, and its long tasks' total, as the two cost readings. */
function cost(round) {
  const sorted = round.frames.slice().sort((left, right) => left - right)
  return {
    p95: sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))],
    longTotal: round.longtasks.reduce((sum, duration) => sum + duration, 0),
  }
}

function longSessionScenario({ check }) {
  return {
    script: 'long',
    prompt: 'write a long answer',
    delayMs: STREAM_DELAY_MS,
    // A tall window, so the measured turn streams into a transcript that is
    // already several screens long rather than into an empty page.
    viewport: { width: 1280, height: 900 },
    /**
     * The frame timer, the long-task observer and the lookup counter, running
     * from the page's first script. Every whole-document lookup the page makes
     * is counted: the skin's own share is what a long transcript multiplies,
     * and a lookup per element is what the two rounds below tell apart.
     */
    initScript: () => {
      window.__longSession = { frames: [], longtasks: [], queries: 0 }
      const counted = (original) => function (...args) {
        window.__longSession.queries += 1
        return original.apply(this, args)
      }
      Document.prototype.querySelector = counted(Document.prototype.querySelector)
      Document.prototype.querySelectorAll = counted(Document.prototype.querySelectorAll)
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__longSession.longtasks.push(Math.round(entry.duration))
      }).observe({ entryTypes: ['longtask'] })
      let last = performance.now()
      const tick = (now) => {
        window.__longSession.frames.push(Math.round((now - last) * 100) / 100)
        last = now
        // The lane's own scenarios run for minutes; a cap keeps a forgotten page from filling memory.
        if (window.__longSession.frames.length < 60000) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    },
    /**
     * Measure the same scripted turn twice — once into a short transcript, once
     * into one grown by the fill turns — and hand the lane the second round to
     * read, so the two lengths are compared with the same script, the same
     * pause and the same machine.
     */
    async beforeSend(context) {
      const { page } = context
      for (let index = 0; index < SHORT_TURNS; index += 1) {
        await sendPrompt(page, `fill the transcript ${index + 1}`)
        await waitForTurn(page)
      }
      context.notes.short = await measureTurn(page, 'write a long answer')
      for (let index = SHORT_TURNS; index < FILL_TURNS - 1; index += 1) {
        await sendPrompt(page, `fill the transcript ${index + 1}`)
        await waitForTurn(page)
      }
      await page.evaluate(() => {
        window.__longSession.frames.length = 0
        window.__longSession.longtasks.length = 0
        window.__longSession.queries = 0
      })
      const filled = await page.evaluate(() => ({
        nodes: document.querySelectorAll('body *').length,
        rows: document.querySelectorAll('[data-chat-flow-kind]').length,
      }))
      context.notes.filled = filled
    },
    async assert({ page, session, notes }) {
      const measured = await read(page)
      const frames = measured.frames.slice().sort((left, right) => left - right)
      const at = (share) => (frames.length === 0 ? 0 : frames[Math.min(frames.length - 1, Math.floor(frames.length * share))])
      const worst = frames.length === 0 ? 0 : frames[frames.length - 1]
      const over = measured.frames.filter((duration) => duration > 40).length
      // The stretch of wall clock the sampled frames cover: a display that draws fewer frames a second is judged on the same span.
      const span = measured.frames.reduce((sum, duration) => sum + duration, 0)
      const longTotal = measured.longtasks.reduce((sum, duration) => sum + duration, 0)
      const filled = notes.filled ?? { nodes: 0, rows: 0 }
      const rounds = [
        check('测量前已经积累了多轮对话，测量那一轮又长了',
          filled.rows >= FILL_TURNS * 2 && measured.rows > filled.rows,
          `rows ${filled.rows} → ${measured.rows}, nodes ${filled.nodes} → ${measured.nodes}`),
        check('采样覆盖了整条流式回答', span >= MIN_SPAN_MS, `${Math.round(span)}ms over ${measured.frames.length} frames`),
        check(`长会话里没有一帧超过 ${WORST_FRAME_MS} 毫秒`, worst < WORST_FRAME_MS,
          `p50=${at(0.5)}ms p95=${at(0.95)}ms max=${worst}ms, frames over 40ms=${over} of ${measured.frames.length}`),
        check('长时间任务没有占满这一轮', longTotal < LONG_TASK_BUDGET_MS,
          `${measured.longtasks.length} long tasks totalling ${longTotal}ms`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
      const short = notes.short
      if (short === undefined) return [...rounds, check('同一轮在两个长度的会话上都量过', false, 'the short round recorded nothing')]
      const shortCost = cost(short)
      const longCost = cost(measured)
      const ratio = short.rows === 0 ? 0 : measured.rows / short.rows
      const allowed = ratio * GROWTH_SLACK
      const readings = `rows ${short.rows} → ${measured.rows} (×${ratio.toFixed(2)}), queries ${short.queries} → ${measured.queries}, ` +
        `long tasks ${shortCost.longTotal}ms → ${longCost.longTotal}ms, p95 ${shortCost.p95}ms → ${longCost.p95}ms`
      rounds.push(
        check('两轮量的是同一个长度比：会话长了几倍，这一轮的量也长了几倍',
          ratio >= GROWTH_RATIO && measured.rows > short.rows,
          readings),
        check('整份文档的查找次数不随会话长度放大', measured.queries <= short.queries * ratio * QUERY_SLACK + 1, readings),
        // The long tasks are printed with the two checks below and bounded by
        // the budget above, not compared between the rounds: the host commits
        // every streamed batch in a frame task of its own, and on a long
        // transcript that task alone is over the long-task mark, so the sum
        // measures the host's frame size as much as the skin's pass. A cost
        // that follows the rows or their square shows in the two checks that
        // do compare — the whole-document lookups and the p95 frame.
        check('这一轮的 p95 帧时不随会话长度放大',
          longCost.p95 <= shortCost.p95 * allowed + GROWTH_FLOOR_MS, readings),
      )
      return rounds
    },
  }
}

export { longSessionScenario }
