#!/usr/bin/env node
/**
 * e2e.cjs — the end-to-end lane: a real `dsh web` with this checkout's plugin,
 * a scripted model service, and a browser on the page (D45).
 *
 * The smoke's stand-in page reproduces the structure its author knows; this lane
 * runs the assembled client and asserts what only it shows — that a scripted
 * answer renders as the reader sees it, that a scripted tool call becomes a row
 * with its result, that the conversation never jumps or slides backward while
 * the answer streams in, and that both palettes still capture the same picture.
 * Every scenario runs against its own scratch instance, so nothing a scenario
 * writes can reach another.
 *
 * Usage: node tools/e2e.cjs [--scenario <name>[,<name>…]] [--headed] [--out <dir>] [--delay <ms>]
 *                            [--baseline <dir>] [--accept]
 *        scenarios: conversation, tool, send, scroll, shots (default: all but shots)
 *        --accept writes the captured screenshots as the comparison baseline.
 */
'use strict'
const fs = require('node:fs')
const path = require('node:path')
const { start, openPage, waitForSkin, dismissOverlays } = require('./dsh-web.cjs')
const { startMockLlm } = require('./mock-llm.cjs')
const { CANVAS } = require('../scripts/shoot.cjs')
const { sanitizePage } = require('../scripts/privacy.cjs')

const ROOT = path.resolve(__dirname, '..')
const DEFAULT_OUT = path.join(ROOT, '.debug', 'e2e', 'out')
/** Screenshot baselines: the reviewed picture each run has to reproduce. */
const DEFAULT_BASELINE = path.join(ROOT, 'tests', 'screenshots')
/**
 * The share of differing pixels a capture may have and still count as the same
 * picture. Two runs of the same scenario differ in the live numbers the page
 * carries — the clock, the throughput meter, the mascot's frame — which measures
 * 0.08% of the frame; the bound is twice that, while a moved panel or a changed
 * palette moves an order of magnitude more.
 */
const MAX_DIFFERENT_PIXELS = 0.002

/**
 * The host's page markers this lane reads. Each one is a D44 entry in
 * `src/contracts/dom.ts`, which the skin reads for the same reason; a marker
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
}

/**
 * The skin's own marks (src/constants.ts): the stand-in the composer leaves
 * behind for the send flight, and the attribute it puts on the real row while
 * that stand-in flies, which the flight stylesheet hides.
 */
const SKIN = {
  sendGhost: '[data-dsh-claude-send-ghost]', // CHAT_SEND_GHOST_ATTR
  flyingMark: 'data-dsh-claude-send-flight', // CHAT_FLYING_ATTR
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

/** Type a prompt into the composer and send it, the way a reader does. */
async function sendPrompt(page, text) {
  await page.waitForSelector(HOST.composer, { timeout: 60000 })
  await page.click(HOST.composer)
  await page.keyboard.type(text)
  await page.waitForTimeout(200)
  await page.keyboard.press('Enter')
}

/** Wait until the turn has settled: its tail row is there and nothing streams. */
async function waitForTurn(page, timeoutMs = 90000) {
  await page.waitForSelector(TURN_TAIL, { timeout: timeoutMs })
  await page.waitForFunction((selector) => document.querySelectorAll(selector).length === 0, HOST.streaming, { timeout: timeoutMs })
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
      }
      const ghost = document.querySelector(host.sendGhost)
      const rows = [...document.querySelectorAll(host.userRow)]
      const last = rows.length === 0 ? null : rows[rows.length - 1]
      frame.ghost = ghost !== null
      frame.ghostWords = words(ghost)
      frame.rows = rows.length
      frame.rowFlying = last !== null && last.hasAttribute(host.flyingMark)
      frame.rowVisible = visible(last)
      frame.rowWords = words(last)
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

/** One assertion with the evidence behind it. */
function check(name, ok, detail) {
  return { name, ok: ok === true, detail: detail === undefined ? '' : String(detail) }
}

/**
 * Capture the page in both palettes and prove the picture is fit to keep: the
 * palette is the one the brand resolves to, the visible text carries no personal
 * data (scripts/privacy.cjs), and — when a baseline exists or `--accept` was
 * asked for — the capture matches the reviewed picture.
 */
async function captureBothSchemes(context) {
  const { page, browser, out, baseline, accept } = context
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
    checks.push(check(`${scheme} 截图的可见文本没有个人数据`, true, `sweep caught ${caught.length}; ${visibleText.replace(/\s+/g, ' ').length} chars`))
    const baselineFile = path.join(baseline, `shots-${scheme}.png`)
    if (accept) {
      fs.mkdirSync(baseline, { recursive: true })
      fs.copyFileSync(file, baselineFile)
      checks.push(check(`${scheme} 截图写成了基线`, true, baselineFile))
      continue
    }
    if (!fs.existsSync(baselineFile)) {
      checks.push(check(`${scheme} 截图与基线一致`, false, `no baseline at ${baselineFile} — review the capture in ${file}, then run with --accept`))
      continue
    }
    const { ratio, sizeChanged } = await compareImages(browser, baselineFile, file)
    checks.push(check(`${scheme} 截图与基线一致`, ratio <= MAX_DIFFERENT_PIXELS, `${(ratio * 100).toFixed(3)}% of pixels differ${sizeChanged ? ' (size changed)' : ''}, allowed ${(MAX_DIFFERENT_PIXELS * 100).toFixed(1)}%`))
  }
  return { checks, files }
}

/**
 * Compare two PNGs inside the browser, so no image decoder lives in this tool:
 * the page draws both onto a canvas and counts the pixels that differ by more
 * than the channel tolerance antialiasing moves.
 */
async function compareImages(browser, before, after) {
  const page = await browser.newPage()
  try {
    return await page.evaluate(async ([first, second]) => {
      const load = (dataUrl) => new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error('a screenshot did not decode'))
        image.src = dataUrl
      })
      const [a, b] = await Promise.all([load(first), load(second)])
      if (a.width !== b.width || a.height !== b.height) return { ratio: 1, sizeChanged: true }
      const canvas = new OffscreenCanvas(a.width, a.height)
      const context = canvas.getContext('2d')
      const pixels = (image) => {
        context.clearRect(0, 0, a.width, a.height)
        context.drawImage(image, 0, 0)
        return context.getImageData(0, 0, a.width, a.height).data
      }
      const one = pixels(a)
      const two = pixels(b)
      let differing = 0
      for (let at = 0; at < one.length; at += 4) {
        if (Math.abs(one[at] - two[at]) > 8 || Math.abs(one[at + 1] - two[at + 1]) > 8 || Math.abs(one[at + 2] - two[at + 2]) > 8) differing += 1
      }
      return { ratio: differing / (a.width * a.height), sizeChanged: false }
    }, [`data:image/png;base64,${fs.readFileSync(before).toString('base64')}`, `data:image/png;base64,${fs.readFileSync(after).toString('base64')}`])
  } finally {
    await page.close()
  }
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
  scroll: {
    script: 'long',
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
      return [
        check('逐帧采样真的在跑', sampled.length > 30, `frames=${sampled.length}`),
        check('回答在采样期间长出来', grown > 100, `grew ${grown}px during the trace`),
        check('位置跟着内容走', moved > 5, `moved in ${moved} of ${sampled.length} frames`),
        check('没有倒退的一帧', backward.length === 0, `backward=${backward.length}${backward.length === 0 ? '' : ` at ${backward.slice(0, 3).map((f) => f.t).join(',')}ms`}`),
        check('尾部没有自己跑远', escaped.length === 0, `escaped=${escaped.length}${escaped.length === 0 ? '' : ` at ${escaped.slice(0, 3).map((f) => f.t).join(',')}ms`}`),
        check('跟随期间尾部留在视野里', worst <= MAX_FOLLOW_GAP_PX, `maxGap=${worst}px of ${following.length} following frames`),
        check('落定后回到末尾', last !== undefined && last.gap <= 4, `lastGap=${last === undefined ? 'n/a' : last.gap}`),
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
  /** Both palettes captured, swept for personal data, and compared with the baseline. */
  shots: {
    script: 'greeting',
    prompt: 'hello there',
    // The README frame's own size, so a baseline is the picture shipped in the docs.
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
  const patch = [
    '- id: llm-deepseek',
    '  config:',
    `    baseURL: ${mock.url}`,
    '    apiKeyEnv: DSH_E2E_MOCK_KEY',
  ].join('\n')
  const host = await start({ patch, env: { DSH_E2E_MOCK_KEY: 'mock' }, home: options.home, resetState: true })
  process.stdout.write(`\n== ${name} ==  mock ${mock.url}  host ${host.url}\n`)
  let session
  try {
    session = await openPage(host.url, { headless: options.headed !== true, ...scenario.viewport })
    const { page } = session
    await waitForSkin(page)
    if (!(await dismissOverlays(page))) throw new Error('the shell left a first-run overlay open')
    await startTrace(page)
    await sendPrompt(page, scenario.prompt)
    await waitForTurn(page)
    const trace = await page.evaluate(() => window.__e2eTrace ?? [])
    const checks = await scenario.assert({ page, browser: session.browser, session, trace, out: options.out, baseline: options.baseline, accept: options.accept })
    for (const item of checks) process.stdout.write(`  ${item.ok ? '✓' : '✗'} ${item.name}${item.detail === '' ? '' : `  — ${item.detail}`}\n`)
    const failed = checks.filter((item) => !item.ok).length
    return { scenario: name, checks, failed, requested: mock.requests.length, trace }
  } finally {
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
  const names = (argOf('scenario') ?? 'conversation,tool,send,scroll').split(',').map((name) => name.trim()).filter(Boolean)
  const out = path.resolve(argOf('out') ?? DEFAULT_OUT)
  const options = {
    headed: args.includes('--headed'),
    accept: args.includes('--accept'),
    delayMs: argOf('delay') === undefined ? undefined : Number(argOf('delay')),
    home: argOf('home'),
    out,
    baseline: path.resolve(argOf('baseline') ?? DEFAULT_BASELINE),
  }
  fs.mkdirSync(out, { recursive: true })
  const results = []
  for (const name of names) {
    const result = await runScenario(name, options)
    fs.writeFileSync(path.join(out, `${name}.json`), `${JSON.stringify(result, null, 2)}\n`)
    results.push(result)
  }
  const failed = results.reduce((sum, result) => sum + result.failed, 0)
  process.stdout.write(`\n${failed === 0 ? 'E2E PASS' : 'E2E FAIL'} — ${results.length} scenarios, ${failed} failed checks; traces in ${out}\n`)
  if (failed > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
