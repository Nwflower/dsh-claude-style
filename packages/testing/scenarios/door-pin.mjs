#!/usr/bin/env node
/**
 * door-pin.mjs — the status line's pin while a door rolls at the tail, end to
 * end (D74, D40, D92).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.mjs). It
 * samples the page itself, as reader-scroll.mjs does.
 *
 * A door is the fold's height animation
 * (packages/client/src/features/chat-fold/fold-glide.ts). One that rolls at the
 * tail while the turn streams stands the stream slide down, and its height
 * change takes the host's follow away until the fold hands it back; the tail is
 * still followed all the while, so the status line has to stay pinned where it
 * stood. The scenario runs the standard tier, where a running turn's steps
 * stand in a process group with a header to press, waits for that group to
 * reason at the tail of a full screen, and presses its header twice the way the
 * skin's own folding does — a click with no pointer behind it, which the
 * reader-intent guard does not hear — so one door rolls shut and one rolls open
 * while the reasoning streams.
 */

/** The host's page markers this scenario reads, as packages/testing/lane.mjs names them. */
const HOST = {
  scroller: '[data-conversation-scroll]', // CONVERSATION_SCROLL_SELECTOR
  running: '[data-chat-running]', // CHAT_RUNNING_SELECTOR
  group: '[data-step-process]', // PROCESS_GROUP_SELECTOR
  body: '[data-step-process-body]', // PROCESS_BODY_SELECTOR
  reasoning: '[data-variant="think"][data-state="running"]', // THINK_ROW_SELECTOR in its running phase
}

/** The skin's own marks (packages/client/src/constants.ts). */
const SKIN = {
  rolling: '[data-dsh-claude-rolling]', // CHAT_ROLLING_ATTR
  readerHold: '[data-dsh-claude-reader-hold]', // READER_HOLD_ATTR
}

/**
 * Sample the page once per frame until the turn settles: the row's place on
 * screen, whether the pin is on it, and whether a door is rolling.
 *
 * @param page - the lane's page.
 * @returns once the sampler is running; the frames land in the page's own global.
 */
function watch(page) {
  return page.evaluate((marks) => {
    const trace = []
    window.__doorPinTrace = trace
    const sample = () => {
      const scroller = document.querySelector(marks.scroller)
      const row = document.querySelector(marks.running)
      trace.push({
        row: row === null ? null : Math.round(row.getBoundingClientRect().top * 100) / 100,
        pinned: row !== null && getComputedStyle(row).position === 'sticky',
        overflowing: scroller !== null && scroller.scrollHeight > scroller.clientHeight,
        rolling: document.querySelector(marks.rolling) !== null,
        reader: scroller !== null && scroller.matches(marks.readerHold),
      })
      if (trace.length < 6000) requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  }, { ...HOST, ...SKIN })
}

/**
 * Press the newest process group's header with no pointer behind the click,
 * then wait until the door it rolls has landed: the sampler's frames since the
 * press carry a rolling one and the page carries none any more.
 * @returns what the header said before the press, and the sampler's frames from
 *     the press to the landing as `[from, to)`; null when there was no header.
 */
async function pressGroup(page) {
  const pressed = await page.evaluate((marks) => {
    const groups = [...document.querySelectorAll(marks.group)]
    const group = groups[groups.length - 1]
    const header = group === undefined ? null : group.querySelector('[aria-controls]')
    if (!(header instanceof HTMLElement)) return null
    const expanded = header.getAttribute('aria-expanded')
    const from = window.__doorPinTrace.length
    header.click()
    return { expanded, from }
  }, HOST)
  if (pressed === null) return null
  await page.waitForFunction(({ from, rolling }) => window.__doorPinTrace.slice(from).some((frame) => frame.rolling) &&
    document.querySelector(rolling) === null, { from: pressed.from, rolling: SKIN.rolling }, { timeout: 10000 })
  return { ...pressed, to: await page.evaluate(() => window.__doorPinTrace.length) }
}

function doorPinScenario({ check }) {
  return {
    script: 'tailReasoning',
    prompt: 'list the files and think it over',
    delayMs: 300,
    viewport: { width: 1280, height: 600 },
    patch: [
      '- id: ui-chat',
      '  config:',
      '    transcriptView: standard',
    ],
    /**
     * Wait for the running group to reason, open, under a transcript taller than
     * the viewport, then roll its door shut and open again.
     */
    async duringTurn(context) {
      const { page } = context
      await watch(page)
      await page.waitForFunction((marks) => {
        const scroller = document.querySelector(marks.scroller)
        const groups = [...document.querySelectorAll(marks.group)]
        const group = groups[groups.length - 1]
        if (scroller === null || group === undefined) return false
        const body = group.querySelector(marks.body)
        if (body === null || body.hasAttribute('hidden')) return false
        if (group.querySelector(marks.reasoning) === null) return false
        return scroller.scrollHeight - scroller.clientHeight > scroller.clientHeight / 2
      }, HOST, { timeout: 30000 })
      context.notes.shut = await pressGroup(page)
      context.notes.open = await pressGroup(page)
      context.notes.streaming = await page.evaluate((marks) => document.querySelector(marks) !== null, HOST.reasoning)
    },
    async afterTurn(context) {
      context.notes.trace = await context.page.evaluate(() => window.__doorPinTrace ?? [])
    },
    async assert({ session, notes }) {
      // Each door is read on its own frames, from its press to its landing.
      const trace = notes.trace ?? []
      const doorFrames = (door) => door === null || door === undefined ? []
        : trace.slice(door.from, door.to).filter((frame) => frame.row !== null && frame.overflowing && !frame.reader)
      const doors = [doorFrames(notes.shut), doorFrames(notes.open)]
      const rolling = doors.flatMap((frames) => frames.filter((frame) => frame.rolling))
      const slipped = rolling.filter((frame) => !frame.pinned)
      const spreads = doors.map((frames) => frames.length === 0 ? null : Math.max(...frames.map((frame) => frame.row)) - Math.min(...frames.map((frame) => frame.row)))
      return [
        check('两扇门都在推理流式输出时滚过',
          notes.shut?.expanded === 'true' && notes.open?.expanded === 'false' && notes.streaming === true &&
            doors.every((frames) => frames.some((frame) => frame.rolling)),
          JSON.stringify({ shut: notes.shut, open: notes.open, streamingAfter: notes.streaming, doorFrames: doors.map((frames) => frames.filter((frame) => frame.rolling).length) })),
        check('门滚动的每一帧状态行都钉着', rolling.length > 0 && slipped.length === 0,
          `${slipped.length} of ${rolling.length} door frames unpinned${slipped.length === 0 ? '' : `, row ${Math.min(...slipped.map((f) => f.row))}..${Math.max(...slipped.map((f) => f.row))}`}`),
        check('从按下到门落定，状态行停在同一处，连半个像素也不动', spreads.every((spread) => spread === 0),
          `spread per door ${JSON.stringify(spreads)} over ${doors.map((frames) => frames.length).join(' and ')} frames`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { doorPinScenario }
