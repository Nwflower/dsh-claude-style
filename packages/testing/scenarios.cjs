/**
 * scenarios.cjs — the end-to-end lane's scenario table (D45). The runner
 * (packages/testing/e2e.cjs) boots an instance per scenario, sends its prompt
 * and calls its hooks; a scenario carrying its own reader is a module beside
 * this one (a `*Scenario` export), registered in the table below.
 *
 * A scenario is `{ script, prompt, delayMs?, viewport?, patch?, hostArgs?,
 * browserArgs?, beforeSend?, duringTurn?, afterTurn?, assert }`: `script` names
 * the scripted model's answer (packages/testing/mock-llm.cjs), `patch` adds
 * loader patch entries, `hostArgs` and `browserArgs` reach the host's command
 * line and the browser's, and `assert` returns the checks.
 */
'use strict'
const path = require('node:path')
const { HOST, SKIN, readFlow, check } = require('./lane.cjs')
const { recordProbes } = require('./contract-probe.cjs')
const { sendPrompt, waitForTurn } = require('./prompt.cjs')
const { importanceScenario } = require('./importance.cjs')
const { readerScrollScenario } = require('./reader-scroll.cjs')
const { processSummaryScenario } = require('./process-summary.cjs')
const { reasoningStreamScenario } = require('./reasoning-stream.cjs')
const { statsScenarios } = require('./stats-position.cjs')
const { sidebarRailScenario } = require('./sidebar-rail.cjs')
const { remoteSettingsScenario } = require('./remote-settings.cjs')
const { CANVAS } = require('../../scripts/shoot.cjs')
const { sanitizePage } = require('../../scripts/shared/privacy.cjs')

/**
 * How far behind the tail the scroller may lag while the reader follows it. The
 * gap opens only while content arrives faster than the glide closes it — the
 * lane's long script measures 151px at its fastest burst — so the bound is a
 * third of the scenario's 600px viewport: a follow that stopped working leaves
 * hundreds of pixels more, and a glide that stutters stays inside it.
 */
const MAX_FOLLOW_GAP_PX = 220

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
  /**
   * The reader's own scrolling during a live turn: the status line's pin stands
   * only while the skin's follow moves the position (D41, D32).
   */
  readerScroll: readerScrollScenario({ check }),
  /** The send flight: the stand-in takes off, the row lands, the words stay put. */
  send: {
    script: 'greeting',
    prompt: 'hello there',
    async assert({ page, session, trace }) {
      // The trace stops when the turn settles, and the stand-in leaves a moment
      // after the handover: on a slow runner the last frame still carried it,
      // which read as a stand-in that never left. Wait for the page to show it
      // gone, and read that as the verdict.
      await page.waitForSelector(SKIN.sendGhost, { state: 'detached', timeout: 15000 }).catch(() => {})
      await page.waitForTimeout(300)
      const firstGhost = trace.findIndex((frame) => frame.ghost)
      const takeOffFrame = trace.find((frame) => frame.takeOff !== undefined)
      const flight = firstGhost === -1 ? [] : trace.slice(firstGhost)
      const hidden = flight.filter((frame) => frame.rowFlying)
      const exposedWhileFlying = hidden.filter((frame) => frame.rowVisible)
      const last = trace[trace.length - 1]
      const goneByNow = await page.evaluate((selector) => document.querySelector(selector) === null, SKIN.sendGhost)
      const words = flight.filter((frame) => (frame.ghostWords ?? []).includes('hello there') || (frame.rowWords ?? []).includes('hello there'))
      const takeOff = takeOffFrame?.takeOff
      const sameType = takeOff !== undefined && takeOff.clone !== null && takeOff.composer !== null
        && takeOff.clone.family === takeOff.composer.family && takeOff.clone.size === takeOff.composer.size
        && takeOff.clone.weight === takeOff.composer.weight && takeOff.clone.color === takeOff.composer.color
      return [
        check('替身起飞后离开页面', firstGhost !== -1 && goneByNow, `firstGhost at ${firstGhost === -1 ? 'n/a' : `${trace[firstGhost].t}ms`}, ghost at the end=${last.ghost}, left by now=${goneByNow}`),
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
  ...statsScenarios({ check }),
  /** The collapsed rail as one icon column, its chip centred on it (sidebar-rail.cjs). */
  sidebarRail: sidebarRailScenario({ check }),
  /** The waiting line and the counted process headers (process-summary.cjs, D32). */
  processSummary: processSummaryScenario({ check }),
  /** The reasoning's streamed window while the model thinks (reasoning-stream.cjs, D32). */
  reasoningStream: reasoningStreamScenario({ check }),
  /** Every `!important` the skin writes is needed on the real page (packages/testing/importance.cjs, D51). */
  importance: importanceScenario({ check, sendPrompt, waitForTurn, host: HOST }),
  /** A page under a non-loopback name reads the host's settings and takes no input (packages/testing/remote-settings.cjs, D60). */
  remoteSettings: remoteSettingsScenario({ check }),
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

module.exports = { SCENARIOS }
