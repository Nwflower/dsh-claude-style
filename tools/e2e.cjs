#!/usr/bin/env node
/**
 * e2e.cjs — the end-to-end lane: a real `dsh web` with this checkout's plugin,
 * a scripted model service, and a browser on the page (D45).
 *
 * The smoke's stand-in page reproduces the structure its author knows; this lane
 * runs the assembled client and asserts what only it shows — that a scripted
 * answer renders as the reader sees it, that a scripted tool call becomes a row
 * with its result, and that the conversation never jumps or slides backward
 * while the answer streams in. Every scenario runs against its own scratch
 * instance, so nothing a scenario writes can reach another.
 *
 * Usage: node tools/e2e.cjs [--scenario <name>[,<name>…]] [--headed] [--out <dir>] [--delay <ms>]
 *        scenarios: conversation (default), tool, scroll
 */
'use strict'
const fs = require('node:fs')
const path = require('node:path')
const { start, openPage, waitForSkin, dismissOverlays } = require('./dsh-web.cjs')
const { startMockLlm } = require('./mock-llm.cjs')

const ROOT = path.resolve(__dirname, '..')
const DEFAULT_OUT = path.join(ROOT, '.debug', 'e2e', 'out')

/**
 * The host's page markers this lane reads. Each one is a D44 entry in
 * `src/contracts/dom.ts`, which the skin reads for the same reason; a marker
 * that changes breaks both, and the contract test names it there.
 */
const HOST = {
  composer: '[data-composer-input]', // COMPOSER_INPUT_SELECTOR
  flow: '[data-chat-flow]', // CHAT_FLOW_SELECTOR
  streaming: '[data-streaming]', // STREAMING_SELECTOR
  turnProcess: 'button[data-turn-process]', // TURN_PROCESS_SELECTOR
  scroller: '[data-conversation-scroll]', // CONVERSATION_SCROLL_SELECTOR
  followingTail: '[data-chat-following-tail]', // FOLLOWING_TAIL_SELECTOR
}

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
 * Sample the conversation's position once per frame until the turn settles.
 *
 * The trace holds what each frame painted: the scroll offset a frame later reads
 * is the one the previous frame left, so a decrease between two samples is a
 * frame the reader saw slide backward, and the gap is what sat below the fold.
 */
async function startTrace(page) {
  await page.evaluate((host) => {
    const trace = []
    window.__e2eTrace = trace
    const sample = () => {
      const scroller = document.querySelector(host.scroller)
      if (scroller !== null) {
        trace.push({
          t: Math.round(performance.now()),
          top: Math.round(scroller.scrollTop),
          height: Math.round(scroller.scrollHeight),
          gap: Math.round(scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop),
          following: document.querySelector(host.followingTail) !== null,
        })
      }
      if (trace.length < 6000) requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  }, HOST)
}

/** One assertion with the evidence behind it. */
function check(name, ok, detail) {
  return { name, ok: ok === true, detail: detail === undefined ? '' : String(detail) }
}

/** The scenarios: each boots its own instance, sends its prompt, and asserts. */
const SCENARIOS = {
  /** A scripted answer: the reader's message, the thought, the markdown. */
  conversation: {
    script: 'greeting',
    prompt: 'hello there',
    async assert(page, session) {
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
    async assert(page, session) {
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
    async assert(page, session, trace) {
      const following = trace.filter((frame) => frame.following)
      const gaps = following.map((frame) => frame.gap)
      const worst = gaps.length === 0 ? 0 : Math.max(...gaps)
      const first = trace[0]
      const last = trace[trace.length - 1]
      const grown = first === undefined || last === undefined ? 0 : last.height - first.height
      const moved = trace.filter((frame, i) => i > 0 && frame.top !== trace[i - 1].top).length
      // What the reader sees: a frame that slides back has the position moving up
      // while the content it shows stays or grows; one that runs away has the gap
      // to the tail opening while nothing arrived.
      const backward = trace.filter((frame, i) => i > 0 && frame.top < trace[i - 1].top && frame.height >= trace[i - 1].height)
      const escaped = trace.filter((frame, i) => i > 0 && frame.gap > trace[i - 1].gap + 1 && frame.height <= trace[i - 1].height)
      return [
        check('逐帧采样真的在跑', trace.length > 30, `frames=${trace.length}`),
        check('回答在采样期间长出来', grown > 100, `grew ${grown}px during the trace`),
        check('位置跟着内容走', moved > 5, `moved in ${moved} of ${trace.length} frames`),
        check('没有倒退的一帧', backward.length === 0, `backward=${backward.length}${backward.length === 0 ? '' : ` at ${backward.slice(0, 3).map((f) => f.t).join(',')}ms`}`),
        check('尾部没有自己跑远', escaped.length === 0, `escaped=${escaped.length}${escaped.length === 0 ? '' : ` at ${escaped.slice(0, 3).map((f) => f.t).join(',')}ms`}`),
        check('跟随期间尾部留在视野里', worst <= MAX_FOLLOW_GAP_PX, `maxGap=${worst}px of ${following.length} following frames`),
        check('落定后回到末尾', last !== undefined && last.gap <= 4, `lastGap=${last === undefined ? 'n/a' : last.gap}`),
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
  const host = await start({ patch, env: { DSH_E2E_MOCK_KEY: 'mock' }, home: options.home })
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
    const checks = await scenario.assert(page, session, trace)
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
  const names = (argOf('scenario') ?? 'conversation').split(',').map((name) => name.trim()).filter(Boolean)
  const out = path.resolve(argOf('out') ?? DEFAULT_OUT)
  const options = {
    headed: args.includes('--headed'),
    delayMs: argOf('delay') === undefined ? undefined : Number(argOf('delay')),
    home: argOf('home'),
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
