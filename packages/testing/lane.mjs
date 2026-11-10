/**
 * lane.mjs — what the end-to-end lane's runner and its scenarios read off the
 * page alike: the host's markers, the skin's own marks, the settled flow, and
 * the shape of one assertion (D92).
 */

import surfaceTable from './data/surface.json' with { type: 'json' }

const STATS_LINE = surfaceTable.surface.find((entry) => entry.id === 'stats.inline-line')
const STATS_FOOTER_LINE = surfaceTable.surface.find((entry) => entry.id === 'stats.footer-line')
if (STATS_LINE?.selector === undefined || STATS_FOOTER_LINE?.attribute === undefined) throw new Error('lane: the statistics surfaces are incomplete')

/**
 * The host's page markers this lane reads. Each one is a D3 entry in
 * `packages/contracts/src/dom.ts`, which the skin reads for the same reason; a marker
 * that changes breaks both, and the contract test names it there.
 */
const HOST = {
  composer: '[data-composer-input]', // COMPOSER_INPUT_SELECTOR
  composerCard: '[data-composer-card]', // COMPOSER_CARD_SELECTOR
  composerSeat: '[data-composer-seat]', // COMPOSER_SELECTOR
  userRow: '[data-chat-flow-kind="user"]', // FLOW_KIND_ATTRIBUTE with the host's user kind
  answerRow: '[data-chat-flow-kind="assistant-step"]:not([data-turn-process-member])', // TURN_PROCESS_ANSWER_SELECTOR
  flow: '[data-chat-flow]', // CHAT_FLOW_SELECTOR
  streaming: '[data-streaming]', // STREAMING_SELECTOR
  turnProcess: 'button[data-turn-process]', // the host's own process control, which the skin leaves alone
  scroller: '[data-conversation-scroll]', // CONVERSATION_SCROLL_SELECTOR
  followingTail: '[data-chat-following-tail]', // FOLLOWING_TAIL_SELECTOR
  echo: '[data-submission-echo]', // SUBMISSION_ECHO_SELECTOR
  running: '[data-chat-running]', // CHAT_RUNNING_SELECTOR
  accountTrigger: '[aria-haspopup="menu"][data-signed-out]', // ACCOUNT_TRIGGER_SELECTOR
}

/**
 * The skin's own marks (packages/client/src/constants.ts): the stand-in the composer leaves
 * behind for the send flight, and the attribute it puts on the real row while
 * that stand-in flies, which the flight stylesheet hides.
 */
const SKIN = {
  sendGhost: '[data-dsh-claude-send-ghost]', // CHAT_SEND_GHOST_ATTR
  sendLink: '[data-dsh-claude-send-link]', // CHAT_SEND_LINK_ATTR
  flyingMark: 'data-dsh-claude-send-flight', // CHAT_FLYING_ATTR
  echoAttribute: 'data-submission-echo', // SUBMISSION_ECHO_SELECTOR without its brackets
  // The other mark the pin reads while a door rolls (FOLLOW_HOLD_ATTR).
  hold: '[data-dsh-claude-follow-hold]', // FOLLOW_HOLD_ATTR
  statsLine: STATS_LINE.selector,
  statsFooterLine: STATS_FOOTER_LINE.attribute,
}

/** Both tables, for the sampler that runs inside the page. */
const MARKS = { ...HOST, ...SKIN }

/** What the page shows once a turn has settled. */
async function readFlow(page) {
  return page.evaluate((host) => {
    const flow = document.querySelector(host.flow)
    const kinds = [...document.querySelectorAll('[data-chat-flow-kind]')].map((el) => el.getAttribute('data-chat-flow-kind'))
    return {
      kinds,
      text: (flow?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      userRows: kinds.filter((kind) => kind === 'user').length,
      toolRows: kinds.filter((kind) => kind === 'tool-call').length,
      processGroups: document.querySelectorAll(host.turnProcess).length,
      streaming: document.querySelectorAll(host.streaming).length,
      callIds: [...document.querySelectorAll('[data-chat-call-id]')].map((el) => el.getAttribute('data-chat-call-id')),
    }
  }, HOST)
}

/** One assertion with the evidence behind it; a failing one fails the run. */
function check(name, ok, detail) {
  return { name, ok: ok === true, detail: detail === undefined ? '' : String(detail) }
}

/**
 * One reading of what the host draws, compared with the record the repository
 * keeps of it (D92). The host is not this repository's to change, so a
 * difference is reported with its evidence and fails nothing: the run prints it,
 * files it in the traces, and the record is written again when someone reads it.
 */
function observe(name, same, detail) {
  return { ...check(name, same, detail), observation: true }
}

/**
 * The page's own frame interval in milliseconds: the median over a short run of
 * animation frames. Readings that count frames are held to the span they cover
 * instead, so a display that draws fewer frames a second is judged on the same
 * stretch of wall clock.
 */
function measureFrameMs(page) {
  return page.evaluate(() => new Promise((resolve) => {
    const stamps = []
    const tick = (now) => {
      stamps.push(now)
      if (stamps.length < 24) { requestAnimationFrame(tick); return }
      const gaps = stamps.slice(1).map((stamp, at) => stamp - stamps[at]).sort((left, right) => left - right)
      resolve(Math.round(gaps[Math.floor(gaps.length / 2)] * 10) / 10)
    }
    requestAnimationFrame(tick)
  }))
}

/**
 * Record `read(arg)` inside the page on every frame from now until the page has
 * settled, and answer the readings (D92: the settle rule). The page has settled
 * when its finite animations have landed and the document has not changed for
 * eight frames' worth of a 60 Hz display (134 ms, over at least two frames, so a
 * slower display waits the same wall clock); an endless animation (a sweep, a
 * pulse) is the page's own life and is not waited for. `read` runs in the page,
 * so it carries no closure; without it this only waits. A page that never
 * settles fails by name.
 */
function watchPage(page, read, arg) {
  return page.evaluate(({ source, arg: input }) => new Promise((resolve, reject) => {
    // The reader crosses into the page as its source text.
    const reader = source === null ? null : new Function('arg', `return (${source})(arg)`)
    const frames = []
    let quiet = 0
    let changed = false
    const observer = new MutationObserver(() => { changed = true })
    observer.observe(document, { subtree: true, childList: true, attributes: true, characterData: true })
    const started = performance.now()
    let lastChange = started
    const landed = () => document.getAnimations().every((animation) => (animation.playState !== 'running' && animation.playState !== 'pending') ||
      animation.effect?.getComputedTiming().iterations === Infinity)
    const look = () => {
      if (reader !== null) frames.push(reader(input))
      quiet = changed ? 0 : quiet + 1
      if (changed) lastChange = performance.now()
      changed = false
      if (quiet >= 2 && performance.now() - lastChange >= 134 && landed()) {
        observer.disconnect()
        resolve(frames)
        return
      }
      if (performance.now() - started > 8000) {
        observer.disconnect()
        reject(new Error('the page did not settle within eight seconds'))
        return
      }
      requestAnimationFrame(look)
    }
    look()
  }), { source: read === undefined ? null : read.toString(), arg })
}

/** Wait for the page to settle (see watchPage). */
const settlePage = (page) => watchPage(page)

/**
 * Record `read(arg)` inside the page on every frame until `reached(frames)`
 * holds, for a page that keeps moving on a clock of its own (a streaming turn)
 * and so never settles; the readings end with the one that reached. Both
 * functions run in the page and carry no closure. A state that never comes
 * fails by name once `limitMs` has passed.
 */
function recordUntil(page, read, reached, arg, limitMs, what) {
  return page.evaluate(({ readSource, reachedSource, arg: input, limit, label }) => new Promise((resolve, reject) => {
    // Both functions cross into the page as their source text.
    const reader = new Function('arg', `return (${readSource})(arg)`)
    const done = new Function('frames', `return (${reachedSource})(frames)`)
    const frames = []
    const started = performance.now()
    const look = () => {
      frames.push(reader(input))
      if (done(frames)) {
        resolve(frames)
        return
      }
      if (performance.now() - started > limit) {
        reject(new Error(`${label} did not happen within ${limit} ms; the last reading was ${JSON.stringify(frames[frames.length - 1])}`))
        return
      }
      requestAnimationFrame(look)
    }
    look()
  }), { readSource: read.toString(), reachedSource: reached.toString(), arg, limit: limitMs, label: what })
}

export { HOST, SKIN, MARKS, readFlow, check, observe, measureFrameMs, watchPage, settlePage, recordUntil }
