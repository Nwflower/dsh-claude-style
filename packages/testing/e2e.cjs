#!/usr/bin/env node
/**
 * e2e.cjs — the end-to-end lane: a real `dsh web` with this checkout's plugin,
 * a scripted model service, and a browser on the page (D45).
 *
 * The smoke's stand-in page reproduces the structure its author knows; this lane
 * runs the assembled client and asserts what only it shows — that a scripted
 * answer renders as the reader sees it, that a scripted tool call becomes a row
 * with its result, that the conversation never jumps or slides backward while
 * the answer streams in, that the send flight hands the reader's words over
 * without a blank frame, and that both palettes capture the README frame's own
 * picture with nothing personal in it. The `contract` scenario walks packages/contracts/src/table.ts against the same page, so
 * each host literal the skin depends on is checked where it lives (D44), and the
 * `importance` scenario holds every `!important` the skin writes to one the page
 * needs (packages/testing/importance.cjs, D51).
 * Every scenario runs against its own scratch instance, so nothing a scenario
 * writes can reach another.
 *
 * Usage: node packages/testing/e2e.cjs [--scenario <name>[,<name>…]] [--headed] [--out <dir>] [--delay <ms>]
 *        scenarios: conversation, narrow, tool, scroll, send, contract, reader, stepDisplay, importance, shots
 *        (default: every scenario)
 */
'use strict'
const fs = require('node:fs')
const path = require('node:path')
const { start, openPage, waitForSkin, dismissOverlays, firstRunOverlayText } = require('./dsh-web.cjs')
const { importanceScenario } = require('./importance.cjs')
const { readerScenario } = require('./reader-view.cjs')
const { stepDisplayScenario } = require('./step-display.cjs')
const { sendPrompt, waitForTurn } = require('./prompt.cjs')
const { startMockLlm } = require('./mock-llm.cjs')
const { CANVAS } = require('../../scripts/shoot.cjs')
const { sanitizePage } = require('../../scripts/shared/privacy.cjs')
const { loadModule } = require('../../scripts/shared/ts-module.cjs')

const ROOT = path.resolve(__dirname, '..', '..')
const DEFAULT_OUT = path.join(ROOT, '.debug', 'e2e', 'out')
/**
 * How long one scenario may take. A wait that never settles would otherwise hold
 * the run until the runner's own limit: this deadline writes the failure evidence
 * and stops the run instead. `DSH_E2E_DEADLINE_MS` shortens it, for trying the
 * watchdog itself.
 */
const SCENARIO_DEADLINE_MS = Number(process.env.DSH_E2E_DEADLINE_MS ?? '') || 3 * 60 * 1000

/**
 * The host's page markers this lane reads. Each one is a D44 entry in
 * `packages/contracts/src/dom.ts`, which the skin reads for the same reason; a marker
 * that changes breaks both, and the contract test names it there.
 */
const HOST = {
  composer: '[data-composer-input]', // COMPOSER_INPUT_SELECTOR
  composerCard: '[data-composer-card]', // COMPOSER_CARD_SELECTOR
  userRow: '[data-chat-flow-kind="user"]', // FLOW_KIND_ATTRIBUTE with the host's user kind
  flow: '[data-chat-flow]', // CHAT_FLOW_SELECTOR
  streaming: '[data-streaming]', // STREAMING_SELECTOR
  turnProcess: 'button[data-turn-process]', // TURN_PROCESS_SELECTOR
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
  flyingMark: 'data-dsh-claude-send-flight', // CHAT_FLYING_ATTR
  echoAttribute: 'data-submission-echo', // SUBMISSION_ECHO_SELECTOR without its brackets
  // The other mark the pin reads while the glide holds a position (FOLLOW_HOLD_ATTR).
  hold: '[data-dsh-claude-follow-hold]', // FOLLOW_HOLD_ATTR
}

/** Both tables, for the sampler that runs inside the page. */
const MARKS = { ...HOST, ...SKIN }

/** A settled turn ends with the host's tail row, the one carrying usage. */
const TURN_TAIL = '[data-chat-flow-kind="turn-tail"]'

/**
 * How far behind the tail the scroller may lag while the reader follows it. The
 * gap opens only while content arrives faster than the glide closes it — the
 * lane's long script measures 151px at its fastest burst — so the bound is a
 * third of the scenario's 600px viewport: a follow that stopped working leaves
 * hundreds of pixels more, and a glide that stutters stays inside it.
 */
const MAX_FOLLOW_GAP_PX = 220

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

/** Type a prompt into the composer and send it, the way a reader does (packages/testing/prompt.cjs). */
/**
 * What the page looked like when a scenario failed: a picture, the console
 * problems, and the markers a timeout usually turns on — the composer's own
 * value, the host flow rows that did appear, any overlay still open. The lane
 * writes these into its output directory, which CI keeps as an artifact.
 */
async function captureFailure(session, out, name) {
  const { page } = session
  const file = path.join(out, `${name}-failure.png`)
  await page.screenshot({ path: file }).catch(() => {})
  const state = await page.evaluate(() => {
    const input = document.querySelector('[data-composer-input]')
    return {
      url: location.href,
      composerValue: input === null ? null : (input.value ?? input.textContent ?? ''),
      rows: [...document.querySelectorAll('[data-chat-flow-kind]')].map((row) => row.getAttribute('data-chat-flow-kind')),
      dialogs: [...document.querySelectorAll('[role="dialog"]')]
        .filter((node) => node.offsetParent !== null)
        .map((node) => (node.innerText || '').replace(/\s+/g, ' ').slice(0, 160)),
      skin: document.body.getAttribute('data-dsh-claude-style'),
    }
  }).catch((error) => ({ error: String(error) }))
  const report = [
    `scenario: ${name}`,
    `problems (${session.problems.length}):`,
    ...session.problems.slice(0, 20).map((line) => `  ${line}`),
    `state: ${JSON.stringify(state, null, 2)}`,
  ].join('\n')
  fs.writeFileSync(path.join(out, `${name}-failure.txt`), `${report}\n`)
  process.stdout.write(`  failure evidence: ${file}\n`)
}

/**
 * Sample the page once per frame, until the turn settles.
 *
 * The trace holds what each frame painted. The scroll offset a frame later reads
 * is the one the previous frame left, so a decrease between two samples is a
 * frame the reader saw slide backward, and the gap is what sat below the fold.
 * The same samples carry the send flight: the stand-in the composer leaves behind
 * (`send-snapshot.ts`), the mark on the real row while it flies, and — taken once,
 * on the stand-in's first frame — the type and card colors it copied, so a
 * take-off that changes the reader's own look is visible in the trace.
 */
async function startTrace(page) {
  await page.evaluate((host) => {
    const trace = []
    window.__e2eTrace = trace
    const visible = (element) => element !== null && getComputedStyle(element).visibility !== 'hidden' && Number(getComputedStyle(element).opacity) > 0
    const words = (element) => element === null ? null : [...element.querySelectorAll('*')]
      .filter((node) => node.children.length === 0 && (node.textContent ?? '').trim() !== '' && visible(node))
      .map((node) => (node.textContent ?? '').trim().slice(0, 24))
    const type = (element) => {
      if (element === null) return null
      const style = getComputedStyle(element)
      return { family: style.fontFamily, size: style.fontSize, weight: style.fontWeight, color: style.color }
    }
    const cardOf = (element) => element === null ? null : element.querySelector(host.composerCard)
    let takeOff = null
    const sample = () => {
      const frame = { t: Math.round(performance.now()) }
      const scroller = document.querySelector(host.scroller)
      if (scroller !== null) {
        frame.top = Math.round(scroller.scrollTop)
        frame.height = Math.round(scroller.scrollHeight)
        frame.gap = Math.round(scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop)
        frame.following = document.querySelector(host.followingTail) !== null
        frame.hold = document.querySelector(host.hold) !== null
      }
      const ghost = document.querySelector(host.sendGhost)
      const rows = [...document.querySelectorAll(host.userRow)]
      const last = rows.length === 0 ? null : rows[rows.length - 1]
      frame.ghost = ghost !== null
      frame.echo = document.querySelector(host.echo) !== null || (last !== null && last.hasAttribute(host.echoAttribute))
      frame.ghostWords = words(ghost)
      frame.rows = rows.length
      frame.rowFlying = last !== null && last.hasAttribute(host.flyingMark)
      frame.rowVisible = visible(last)
      frame.rowWords = words(last)
      // The live turn's own status line at the end of the flow: the skin pins it
      // while the reader is at the tail, so its screen position is the check.
      const running = document.querySelector(host.running)
      frame.running = running === null ? null : Math.round(running.getBoundingClientRect().top)
      if (ghost !== null && takeOff === null) {
        // The stand-in is a clone of the composer card appended to the page, so
        // the real card is the first one the stand-in does not contain.
        const real = (selector) => [...document.querySelectorAll(selector)].find((element) => !ghost.contains(element)) ?? null
        const cloneCard = ghost.querySelector(host.composerCard)
        const card = real(host.composerCard)
        takeOff = {
          clone: type(ghost.querySelector(host.composer)),
          composer: type(real(host.composer)),
          cloneCard: cloneCard === null ? null : getComputedStyle(cloneCard).backgroundColor,
          composerCard: card === null ? null : getComputedStyle(card).backgroundColor,
        }
        frame.takeOff = takeOff
      }
      trace.push(frame)
      if (trace.length < 6000) requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  }, MARKS)
}

/**
 * Run the probes of the given states and keep the results under
 * `context.notes.contract`, where the report and the scenario's checks read them.
 */
async function recordProbes(context, states, windowMs = 0) {
  const list = Array.isArray(states) ? states : [states]
  const results = await probeContract(context.page, list, windowMs)
  for (const result of results) context.notes.contract.push(result)
}

/** One assertion with the evidence behind it. */
function check(name, ok, detail) {
  return { name, ok: ok === true, detail: detail === undefined ? '' : String(detail) }
}

/**
 * Check the entries of the host contract table that belong to the given page
 * states (D44) — the same lists the build holds the skin to, read through the
 * same loader, so a selector cannot pass the build and go unchecked here.
 *
 * The momentary states (`sending`, `streaming`) are read in one window: the
 * checks repeat until every entry has passed once or the window closes, and a
 * pass from an earlier tick is kept, because those states come and go.
 *
 * @returns one result per entry: `{ id, state, ok, observed }`.
 */
async function probeContract(page, states, windowMs = 0) {
  const { HOST_DOM } = loadModule('packages/contracts/src/table.ts')
  const entries = HOST_DOM.filter((entry) => states.includes(entry.probe.state))
  const frames = windowMs === 0 ? 0 : Math.round(windowMs / 16)
  const deadline = Date.now() + windowMs
  let results = await page.evaluate(runProbes, { table: HOST_DOM, entries, frames })
  while (frames > 0 && results.some((result) => !result.ok) && Date.now() < deadline) {
    await page.waitForTimeout(200)
    const watch = await page.evaluate(() => ({ results: window.__contractWatch.results, done: window.__contractWatch.done }))
    results = watch.results
    if (watch.done) break
  }
  return results
}

/**
 * The probe checks, in the page. `kind` is the table's own vocabulary; an
 * unknown kind throws so a new one cannot pass unnoticed.
 *
 * `frames` arms a per-frame watcher instead of checking once: a state that
 * lasts a moment (the submission echo is on the page for about three frames)
 * is only visible to a `requestAnimationFrame` loop. The watcher keeps the first
 * passing observation of each entry and stops when every entry has one or the
 * frames run out; `probeContract` reads it back.
 */
function runProbes({ table, entries, frames = 0 }) {
  // Attribute values are read once per tick rather than once per entry: the
  // momentary states arrive while the watcher runs, so the set has to be fresh.
  let values = new Set()
  const collectValues = () => {
    const found = new Set()
    for (const element of document.querySelectorAll('*')) {
      for (const attribute of element.attributes) found.add(attribute.value)
    }
    return found
  }
  values = collectValues()
  const byId = new Map(table.map((entry) => [entry.id, entry]))
  const path_ = (expression) => expression.split('.').reduce((value, key) => value === undefined || value === null ? undefined : value[key], window)
  const railGeometry = () => {
    const within = byId.get(entries.find((entry) => entry.probe.kind === 'rail-geometry').probe.within ?? 'turn.rail').value
    const rail = document.querySelector(within)
    const scroller = rail === null ? null : rail.querySelector(byId.get('turn.rail-scroller').value)
    if (scroller === null) return 'no rail scroller'
    const marks = rail.querySelectorAll(byId.get('turn.rail-mark').value).length
    const pitch = Number(byId.get('turn.rail-pitch').value)
    const inset = Number(byId.get('turn.rail-inset').value)
    const expected = marks * pitch + 2 * (inset - pitch / 2)
    return Math.abs(scroller.scrollHeight - expected) <= 1 ? null : `${marks} marks, scroller ${scroller.scrollHeight}px, expected ${expected}px`
  }
  const checkEntry = (entry) => {
    const probe = entry.probe
    const root = probe.within === undefined ? document : document.querySelector(byId.get(probe.within).value)
    if (probe.kind === 'selector') {
      const matches = root === null ? 0 : root.querySelectorAll(entry.value).length
      return { ok: matches >= (probe.min ?? 1), observed: `${matches} match${matches === 1 ? '' : 'es'}` }
    }
    if (probe.kind === 'attribute') {
      const matches = document.querySelectorAll(`[${entry.value}]`).length
      return { ok: matches > 0, observed: `${matches} element${matches === 1 ? '' : 's'}` }
    }
    if (probe.kind === 'property') {
      const resolved = getComputedStyle(document.documentElement).getPropertyValue(entry.value).trim()
      return { ok: resolved !== '', observed: resolved === '' ? 'not resolved' : `"${resolved}"` }
    }
    if (probe.kind === 'global') {
      const resolved = path_(entry.value)
      return { ok: resolved !== undefined, observed: typeof resolved }
    }
    if (probe.kind === 'value') {
      const present = values.has(entry.value)
      return { ok: present, observed: present ? 'present as an attribute value' : 'nowhere in the attributes' }
    }
    if (probe.kind === 'rail-geometry') {
      const failure = railGeometry()
      return { ok: failure === null, observed: failure ?? 'marks and scroller agree' }
    }
    if (probe.kind === 'none') {
      // No page form: the behaviour scenarios and the unit tests hold it.
      return { ok: true, observed: 'reported, not checked here' }
    }
    throw new Error(`contract: unknown probe kind "${probe.kind}" on "${entry.id}" (state ${probe.state})`)
  }
  const results = () => entries.map((entry) => ({ id: entry.id, state: entry.probe.state, ...checkEntry(entry) }))
  if (frames === 0) return results()
  const watch = { results: results(), done: false }
  window.__contractWatch = watch
  let at = 0
  const tick = () => {
    at += 1
    values = collectValues()
    watch.results = watch.results.map((result, index) => (result.ok ? result : { ...result, ...checkEntry(entries[index]) }))
    watch.done = watch.results.every((result) => result.ok) || at >= frames
    if (!watch.done) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  return watch.results
}

/**
 * Capture the page in both palettes and prove the capture is fit to keep: the
 * palette is the one the brand resolves to, and the visible text carries no
 * personal data (scripts/shared/privacy.cjs). The files land in the run's out
 * directory for a reviewer; nothing is compared against a stored picture.
 */
async function captureBothSchemes(context) {
  const { page, out } = context
  const brand = await page.evaluate(() => document.body.getAttribute('data-dsh-claude-brand'))
  const canvas = CANVAS[brand]
  if (canvas === undefined) throw new Error(`the page carries brand "${brand}", which has no recorded palette`)
  const files = []
  const checks = []
  for (const scheme of ['light', 'dark']) {
    if (scheme === 'dark') {
      // The same DOM flip the theme service's presenter produces for the dark
      // snapshot; no durable preference is read or written.
      await page.evaluate(() => document.body.setAttribute('data-ds-dark-theme', ''))
    }
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    const wanted = canvas[scheme]
    if (background !== wanted) throw new Error(`${scheme} palette did not take effect (body bg ${background}, expected ${wanted})`)
    const { caught, visibleText } = await sanitizePage((expression) => page.evaluate(expression))
    const file = path.join(out, `shots-${scheme}.png`)
    await page.screenshot({ path: file })
    files.push(file)
    checks.push(check(`${scheme} 截图的可见文本没有个人数据`, true, `sweep caught ${caught.length}; ${visibleText.replace(/\s+/g, ' ').length} chars; ${file}`))
  }
  return { checks, files }
}

/** The scenarios: each boots its own instance, sends its prompt, and asserts. */
const SCENARIOS = {
  /** A scripted answer: the reader's message, the thought, the markdown. */
  conversation: {
    script: 'greeting',
    prompt: 'hello there',
    async assert({ page, session }) {
      const flow = await readFlow(page)
      return [
        check('读者的消息成为一行', flow.userRows === 1 && flow.text.includes('hello there'), `userRows=${flow.userRows}`),
        check('脚本回答的标题与列表都在页面里', flow.text.includes('Hello') && flow.text.includes('first point'), flow.text.slice(0, 120)),
        check('思考过程归入一个过程组', flow.processGroups === 1 && flow.kinds.includes('turn-process'), `processGroups=${flow.processGroups} kinds=${flow.kinds.join(',')}`),
        check('流式标记已经收起', flow.streaming === 0, `streaming=${flow.streaming}`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  },
  /**
   * The composer at a phone's width: the bottom line carries the tier, the
   * model, the effort level and the context ring on one row, and at 390px the
   * row keeps them by dropping what it cannot show — the tier's arrow, the
   * labels' tails and the ring's number — rather than running past the card.
   */
  narrow: {
    script: 'greeting',
    prompt: 'hello there',
    viewport: { width: 390, height: 844 },
    async assert({ page, session }) {
      const narrow = await page.evaluate(() => {
        const read = (selector) => document.querySelector(selector)
        const box = (el) => {
          if (el === null) return null
          const rect = el.getBoundingClientRect()
          return { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) }
        }
        const shown = (el) => el !== null && getComputedStyle(el).display !== 'none'
        const cap = (el) => (el === null ? null : getComputedStyle(el).maxWidth)
        const perm = read('.dsh-claude-perm-btn')
        const permLabel = read('.dsh-claude-perm-label')
        const model = read('.dsh-claude-model-btn')
        const modelLabel = read('.dsh-claude-model-btn-label')
        const meter = read('[data-dsh-claude-context-meter]')
        return {
          width: window.innerWidth,
          card: box(read('[data-composer-card]')),
          perm: box(perm),
          permMax: cap(perm),
          permEllipsis: permLabel === null ? null : getComputedStyle(permLabel).textOverflow,
          chevron: shown(read('.dsh-claude-perm-chevron')),
          model: box(model),
          modelMax: cap(model),
          modelEllipsis: modelLabel === null ? null : getComputedStyle(modelLabel).textOverflow,
          effort: box(read('.dsh-claude-effort-btn')),
          meter: box(meter),
          ring: shown(meter === null ? null : meter.querySelector('svg')),
          number: shown(meter === null ? null : meter.querySelector('button > span')),
        }
      })
      const inside = (inner, outer) => inner === null || outer === null || (inner.left >= outer.left && inner.right <= outer.right)
      const fits = inside(narrow.perm, narrow.card) && inside(narrow.model, narrow.card) && inside(narrow.meter, narrow.card) &&
        (narrow.effort === null || narrow.meter.left >= narrow.effort.right)
      return [
        check('页面是手机的宽度', narrow.width === 390, `innerWidth=${narrow.width}`),
        check('权限选择器收起了下三角', narrow.chevron === false, `chevron=${narrow.chevron}`),
        check('权限与模型选择器按窄屏上限截断', narrow.permMax === '132px' && narrow.modelMax === '112px' &&
          narrow.permEllipsis === 'ellipsis' && narrow.modelEllipsis === 'ellipsis',
          JSON.stringify({ permMax: narrow.permMax, modelMax: narrow.modelMax, perm: narrow.permEllipsis, model: narrow.modelEllipsis })),
        check('上下文只留圆环，数字不再显示', narrow.ring === true && narrow.number === false,
          JSON.stringify({ ring: narrow.ring, number: narrow.number })),
        check('控件都留在输入卡片里，圆环也不与旁边的控件重叠', fits,
          JSON.stringify({ card: narrow.card, perm: narrow.perm, model: narrow.model, effort: narrow.effort, meter: narrow.meter })),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  },
  /** A scripted tool call: its row, its call id, and the answer that follows. */
  tool: {
    script: 'inspect',
    prompt: 'look at the workspace',
    async assert({ page, session }) {
      const flow = await readFlow(page)
      return [
        check('工具调用单独成行', flow.toolRows === 1, `toolRows=${flow.toolRows}`),
        check('调用行带着调用编号', flow.callIds.length > 0 && flow.callIds.every((id) => id !== null && id !== ''), `callIds=${JSON.stringify(flow.callIds)}`),
        check('工具结果之后的回答已渲染', flow.text.includes('workspace holds these files'), flow.text.slice(-160)),
        check('过程组收住了整轮', flow.processGroups === 1 && flow.kinds.includes('turn-tail'), `processGroups=${flow.processGroups} kinds=${flow.kinds.join(',')}`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  },
  /** The frame trace: the tail stays pinned and the position never slides back. */
  scroll: {    script: 'long',
    prompt: 'write a long answer',
    delayMs: 300,
    // A short viewport, so the streamed answer outgrows it and the tail has to follow.
    viewport: { width: 1280, height: 600 },
    async assert({ session, trace }) {
      // Only the frames from when the conversation's scroller exists carry a position.
      const sampled = trace.filter((frame) => frame.height !== undefined)
      const following = sampled.filter((frame) => frame.following)
      const gaps = following.map((frame) => frame.gap)
      const worst = gaps.length === 0 ? 0 : Math.max(...gaps)
      const first = sampled[0]
      const last = sampled[sampled.length - 1]
      const grown = first === undefined || last === undefined ? 0 : last.height - first.height
      const moved = sampled.filter((frame, i) => i > 0 && frame.top !== sampled[i - 1].top).length
      // What the reader sees: a frame that slides back has the position moving up
      // while the content it shows stays or grows; one that runs away has the gap
      // to the tail opening while nothing arrived.
      const backward = sampled.filter((frame, i) => i > 0 && frame.top < sampled[i - 1].top && frame.height >= sampled[i - 1].height)
      const escaped = sampled.filter((frame, i) => i > 0 && frame.gap > sampled[i - 1].gap + 1 && frame.height <= sampled[i - 1].height)
      // The live turn's own status line, pinned by the skin while the reader is
      // at the tail. Measured once the transcript is taller than the viewport
      // (`clientHeight = height - gap - top`): with less than a screenful the row
      // legitimately rides the content's end, and with the follow off the pin is
      // not on the page.
      const overflowing = (frame) => frame.height - frame.gap - frame.top < frame.height
      const live = sampled.filter((frame) => frame.running !== null && frame.running !== undefined && frame.following && overflowing(frame))
      const tops = live.map((frame) => frame.running)
      const spread = tops.length === 0 ? 0 : Math.max(...tops) - Math.min(...tops)
      // The host's own mark is off in these frames: its attribution read the glide's writes as a
      // reader leaving the tail, so the pin comes from the hold mark alone.
      const held = sampled.filter((frame) => frame.running !== null && frame.running !== undefined && frame.hold === true && frame.following === false && overflowing(frame))
      const heldTops = held.map((frame) => frame.running)
      const heldSpread = heldTops.length === 0 ? 0 : Math.max(...heldTops) - Math.min(...heldTops)
      return [
        check('逐帧采样真的在跑', sampled.length > 30, `frames=${sampled.length}`),
        check('回答在采样期间长出来', grown > 100, `grew ${grown}px during the trace`),
        check('位置跟着内容走', moved > 5, `moved in ${moved} of ${sampled.length} frames`),
        check('没有倒退的一帧', backward.length === 0, `backward=${backward.length}${backward.length === 0 ? '' : ` at ${backward.slice(0, 3).map((f) => f.t).join(',')}ms`}`),
        check('尾部没有自己跑远', escaped.length === 0, `escaped=${escaped.length}${escaped.length === 0 ? '' : ` at ${escaped.slice(0, 3).map((f) => f.t).join(',')}ms`}`),
        check('跟随期间尾部留在视野里', worst <= MAX_FOLLOW_GAP_PX, `maxGap=${worst}px of ${following.length} following frames`),
        check('落定后回到末尾', last !== undefined && last.gap <= 4, `lastGap=${last === undefined ? 'n/a' : last.gap}`),
        check('宿主关掉跟随时状态行仍停在同一处', held.length > 3 && heldSpread <= 2, `frames the host mark was off in=${held.length}, top ${heldTops.length === 0 ? 'n/a' : `${Math.min(...heldTops)}..${Math.max(...heldTops)}`}`),
        check('满屏之后宿主的状态行不再随内容移动', live.length > 10 && spread <= 2, `overflowing frames with the row=${live.length}, top ${tops.length === 0 ? 'n/a' : `${Math.min(...tops)}..${Math.max(...tops)}`}`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  },
  /** The send flight: the stand-in takes off, the row lands, the words stay put. */
  send: {
    script: 'greeting',
    prompt: 'hello there',
    async assert({ session, trace }) {
      const firstGhost = trace.findIndex((frame) => frame.ghost)
      const takeOffFrame = trace.find((frame) => frame.takeOff !== undefined)
      const flight = firstGhost === -1 ? [] : trace.slice(firstGhost)
      const hidden = flight.filter((frame) => frame.rowFlying)
      const exposedWhileFlying = hidden.filter((frame) => frame.rowVisible)
      const last = trace[trace.length - 1]
      const words = flight.filter((frame) => (frame.ghostWords ?? []).includes('hello there') || (frame.rowWords ?? []).includes('hello there'))
      const takeOff = takeOffFrame?.takeOff
      const sameType = takeOff !== undefined && takeOff.clone !== null && takeOff.composer !== null
        && takeOff.clone.family === takeOff.composer.family && takeOff.clone.size === takeOff.composer.size
        && takeOff.clone.weight === takeOff.composer.weight && takeOff.clone.color === takeOff.composer.color
      return [
        check('替身起飞后离开页面', firstGhost !== -1 && last.ghost === false, `firstGhost at ${firstGhost === -1 ? 'n/a' : `${trace[firstGhost].t}ms`}, ghost at the end=${last.ghost}`),
        check('真行在飞行期间不可见', hidden.length > 0 && exposedWhileFlying.length === 0, `flying frames=${hidden.length}, of them visible=${exposedWhileFlying.length}`),
        check('读者的字每一帧都看得见', words.length === flight.length, `words on ${words.length} of ${flight.length} frames after take-off`),
        check('真行落定后可见并带着字', last.rows > 0 && last.rowVisible === true && (last.rowWords ?? []).includes('hello there'), `rows=${last.rows} visible=${last.rowVisible} words=${JSON.stringify(last.rowWords)}`),
        check('替身带走了输入卡片的样子', sameType === true, takeOff === undefined ? 'no take-off frame in the trace' : `clone ${takeOff.clone.size}/${takeOff.clone.color} vs composer ${takeOff.composer.size}/${takeOff.composer.color}, card ${takeOff.cloneCard} vs ${takeOff.composerCard}`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  },
  /** The host contract table, entry by entry, in the page state each one lives in (D44). */
  contract: {
    script: 'inspect',
    prompt: 'look at the workspace',
    // A slow stream, so the states that last a moment are wide enough to read.
    delayMs: 400,
    /** The empty page: the hero composer, the shell, the boot graph, the document. */
    async beforeSend(context) {
      context.notes.contract = []
      // A short window: the shell finishes mounting its slots just after the skin
      // is up, so a single read would race the composer's own render.
      await recordProbes(context, ['hero', 'any'], 4000)
    },
    /**
     * A second turn brings the states the first one has already left: the
     * submission echo while the flight is up, the streaming marks, and a second
     * mark in the turn rail. The probes for those states have to be read inside
     * this send, so they run before the turn is waited for.
     */
    async afterTurn(context) {
      const second = sendPrompt(context.page, 'look again')
      // One window over both momentary states: the submission goes through while
      // the echo is expected, and the answer streams right after it.
      await recordProbes(context, ['sending', 'streaming'], 9000)
      await second
      await waitForTurn(context.page)
      await recordProbes(context, 'conversation')
      // Any host menu does: the account menu the skin keys on is not mounted by
      // this build, and every menu shares the role, the list and the foreground.
      const trigger = context.page.locator('[aria-haspopup="menu"]:not([class*="dsh-claude"]):visible').first()
      if (await trigger.count() > 0) {
        await trigger.click()
        await recordProbes(context, 'menu', 3000)
        await context.page.keyboard.press('Escape')
      }
      await context.page.evaluate(() => document.body.setAttribute('data-ds-dark-theme', ''))
      await recordProbes(context, 'dark')
    },
    async assert({ session, notes }) {
      const results = notes.contract
      const byState = (state) => results.filter((result) => result.state === state)
      const failed = results.filter((result) => !result.ok)
      const unchecked = results.filter((result) => result.observed === 'reported, not checked here')
      const line = (state) => {
        const state_ = byState(state)
        const broken = state_.filter((result) => !result.ok).map((result) => `${result.id} (${result.observed})`)
        return check(`${state} 状态的条目都在`, broken.length === 0, `${state_.length} 条${broken.length === 0 ? '' : `，失效：${broken.join('、')}`}`)
      }
      return [
        ...[...new Set(results.map((result) => result.state))].map((state) => line(state)),
        check('没有页面形态的条目已逐条列出', unchecked.length > 0, `${unchecked.length} 条由行为场景与单元测试持有：${unchecked.map((result) => result.id).join('、')}`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
        ...failed.slice(0, 8).map((result) => check(`契约条目 ${result.id} 仍然成立`, false, `${result.observed}（${result.state}）`)),
      ]
    },
  },
  /** The redraw tier's reading view: the live fold, the word fade, the completed turn (packages/testing/reader-view.cjs, D57). */
  reader: readerScenario({ check }),
  /** The reading view under the host's work-details modes (packages/testing/step-display.cjs, D57). */
  stepDisplay: stepDisplayScenario({ check }),
  /** Every `!important` the skin writes is needed on the real page (packages/testing/importance.cjs, D51). */
  importance: importanceScenario({ check, sendPrompt, waitForTurn, host: HOST }),
  /** Both palettes captured to the run's out directory and swept for personal data. */
  shots: {
    script: 'greeting',
    prompt: 'hello there',
    // The README frame's own size, so the capture is the picture the docs carry.
    viewport: { width: 1440, height: 900 },
    async assert(context) {
      const { session } = context
      const flow = await readFlow(context.page)
      const capture = await captureBothSchemes(context)
      return [
        check('脚本回答已渲染', flow.text.includes('Hello') && flow.streaming === 0, `streaming=${flow.streaming}`),
        ...capture.checks,
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  },
}

/** Run one scenario on its own instance, and return its checks and trace. */
async function runScenario(name, options) {
  const scenario = SCENARIOS[name]
  if (scenario === undefined) throw new Error(`no scenario named "${name}" (${Object.keys(SCENARIOS).join(', ')})`)
  const mock = await startMockLlm({ script: scenario.script, delayMs: scenario.delayMs ?? options.delayMs })
  const patch = ['- id: llm-deepseek', '  config:', `    baseURL: ${mock.url}`, '    apiKeyEnv: DSH_E2E_MOCK_KEY', ...scenario.patch ?? []].join('\n')
  const host = await start({ patch, env: { DSH_E2E_MOCK_KEY: 'mock' }, home: options.home, resetState: true })
  process.stdout.write(`\n== ${name} ==  mock ${mock.url}  host ${host.url}\n`)
  /** Where the scenario is, so a hang in the log says which step it never left. */
  const step = (label) => process.stdout.write(`  · ${label}\n`)
  let session
  let expired = false
  const timer = setTimeout(() => { expired = true }, SCENARIO_DEADLINE_MS)
  try {
    session = await openPage(host.url, { headless: options.headed !== true, ...scenario.viewport })
    const { page } = session
    const body = (async () => {
      step('waiting for the skin')
      await waitForSkin(page)
      step('answering the first-run overlays')
      if (!(await dismissOverlays(page))) {
        const left = await firstRunOverlayText(page)
        throw new Error(`the shell left a first-run overlay open${left === '' ? '' : `: ${left}`}`)
      }
      const context = { page, session, trace: [], notes: {}, out: options.out }
      if (scenario.beforeSend !== undefined) await scenario.beforeSend(context)
      step('sending the prompt')
      await startTrace(page)
      await sendPrompt(page, scenario.prompt)
      step('waiting for the turn to settle')
      await waitForTurn(page)
      context.trace = await page.evaluate(() => window.__e2eTrace ?? [])
      if (scenario.afterTurn !== undefined) {
        step('after the turn')
        await scenario.afterTurn(context)
      }
      step('asserting')
      const checks = await scenario.assert(context)
      for (const item of checks) process.stdout.write(`  ${item.ok ? '✓' : '✗'} ${item.name}${item.detail === '' ? '' : `  — ${item.detail}`}\n`)
      const failed = checks.filter((item) => !item.ok).length
      if (expired) throw new Error(`scenario "${name}" overran its ${SCENARIO_DEADLINE_MS / 1000} s deadline`)
      return { scenario: name, checks, failed, requested: mock.requests.length, trace: context.trace, notes: context.notes }
    })()
    return await body
  } catch (error) {
    if (session !== undefined) await captureFailure(session, options.out, name).catch(() => {})
    if (expired) {
      // The hung step is still holding the page; the run stops here with the
      // evidence written above instead of waiting on the runner's own limit.
      process.stdout.write(`  scenario "${name}" passed its ${SCENARIO_DEADLINE_MS / 1000} s deadline; stopping the run\n`)
      host.stop()
      await mock.stop().catch(() => {})
      process.exit(1)
    }
    throw error
  } finally {
    clearTimeout(timer)
    if (session !== undefined) await session.close()
    host.stop()
    await mock.stop()
  }
}

async function main() {
  const args = process.argv.slice(2)
  const argOf = (flag) => {
    const at = args.indexOf(`--${flag}`)
    return at === -1 ? undefined : args[at + 1]
  }
  // The timing table names the scenarios that hold it (D44), so the two lists are
  // checked against each other rather than kept in step by hand.
  const { E2E_SCENARIOS } = loadModule('packages/contracts/src/timing.ts')
  const known = Object.keys(SCENARIOS)
  const unknown = E2E_SCENARIOS.filter((name) => !known.includes(name))
  const unnamed = known.filter((name) => !E2E_SCENARIOS.includes(name))
  if (unknown.length > 0 || unnamed.length > 0) {
    throw new Error(`the lane runs ${known.join(', ')} while packages/contracts/src/timing.ts names ${E2E_SCENARIOS.join(', ')}`
      + `${unknown.length > 0 ? `; named there but missing here: ${unknown.join(', ')}` : ''}`
      + `${unnamed.length > 0 ? `; run here but unnamed there: ${unnamed.join(', ')}` : ''}`)
  }
  const names = (argOf('scenario') ?? 'conversation,narrow,tool,send,scroll,contract,reader,stepDisplay,importance,shots').split(',').map((name) => name.trim()).filter(Boolean)
  const out = path.resolve(argOf('out') ?? DEFAULT_OUT)
  const options = {
    headed: args.includes('--headed'),
    delayMs: argOf('delay') === undefined ? undefined : Number(argOf('delay')),
    home: argOf('home'),
    out,
  }
  fs.mkdirSync(out, { recursive: true })
  // The first boot of the scratch host installs this checkout into the scratch
  // profile, which on a cold machine outlasts the waits a scenario makes on the
  // page. Booting once up front keeps that cost out of the first scenario.
  if (names.length > 1) {
    const warm = await start({ home: options.home, env: {}, resetState: false })
    warm.stop()
  }
  const results = []
  for (const name of names) {
    const result = await runScenario(name, options)
    fs.writeFileSync(path.join(out, `${name}.json`), `${JSON.stringify(result, null, 2)}\n`)
    results.push(result)
  }
  const failed = results.reduce((sum, result) => sum + result.failed, 0)
  process.stdout.write(`\n${failed === 0 ? 'E2E PASS' : 'E2E FAIL'} — ${results.length} scenarios, ${failed} failed checks; traces in ${out}\n`)
  // A scenario leaves a handle behind on a slow runner — the CI job walked every
  // scenario in minutes and then sat until its own cap, because the process had
  // finished and its event loop had not. The exit code is the result.
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
