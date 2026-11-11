/**
 * scenarios.mjs — the end-to-end lane's scenario table (D92). The runner
 * (packages/testing/e2e.mjs) boots an instance per scenario, sends its prompt
 * and calls its hooks; a scenario carrying its own reader is a module beside
 * this one (a `*Scenario` export), registered in the table below.
 *
 * A scenario is `{ script, prompt, delayMs?, viewport?, patch?, hostArgs?,
 * browserArgs?, plugins?, initScript?, beforeSend?, duringTurn?, afterTurn?,
 * assert }`: `script` names the scripted model's answer
 * (packages/testing/mock-llm.mjs), `patch` adds loader patch entries,
 * `hostArgs` and `browserArgs` reach the host's command line and the
 * browser's, `plugins` installs other plugins from the registry into a home
 * the scenario boots alone, `initScript` runs in the page before its own
 * scripts, and `assert` returns the checks.
 */
import path from 'node:path'
import { HOST, SKIN, readFlow, check, observe } from './lane.mjs'
import { recordProbes } from './scenarios/contract-probe.mjs'
import { sendPrompt, waitForTurn } from './prompt.mjs'
import { importanceScenario } from './scenarios/importance.mjs'
import { readerScrollScenario } from './scenarios/reader-scroll.mjs'
import { doorPinScenario } from './scenarios/door-pin.mjs'
import { streamPaceScenario } from './scenarios/stream-pace.mjs'
import { streamJitterScenario } from './scenarios/stream-jitter.mjs'
import { motionScenario } from './scenarios/motion.mjs'
import { processSummaryScenario } from './scenarios/process-summary.mjs'
import { fileMergeScenario } from './scenarios/file-merge.mjs'
import { reasoningContinuousScenario, reasoningStreamScenario } from './scenarios/reasoning-stream.mjs'
import { messageAnswerActionsScenario } from './scenarios/message-answer-actions.mjs'
import { messageActionsScenario } from './scenarios/message-actions.mjs'
import { systemTypographyScenario } from './scenarios/system-typography.mjs'
import { mobileHomeScenario } from './scenarios/mobile-home.mjs'
import { composerViewportScenario } from './scenarios/composer-viewport.mjs'
import { waitLineScenario } from './scenarios/wait-line.mjs'
import { washLineScenario } from './scenarios/wash-line.mjs'
import { longSessionScenario } from './scenarios/long-session.mjs'
import { statsScenarios } from './scenarios/stats-position.mjs'
import { sidebarRailScenario } from './scenarios/sidebar-rail.mjs'
import { sidebarPeekScenario } from './scenarios/sidebar-peek.mjs'
import { remoteSettingsScenario } from './scenarios/remote-settings.mjs'
import { usernameCompositionScenario } from './scenarios/username-composition.mjs'
import { usernameImeScenario } from './scenarios/username-ime.mjs'
import { customBrandScenario } from './scenarios/custom-brand.mjs'
import { dsBotScenario } from './scenarios/ds-bot.mjs'
import { CANVAS } from './shoot.mjs'
import { sanitizePage } from '../../scripts/shared/privacy.mjs'
import { bound } from './bounds.mjs'

/**
 * How far behind the tail the scroller may lag while the reader follows it: the
 * value and the reason it holds it are in packages/testing/data/bounds.json.
 */
const MAX_FOLLOW_GAP_PX = bound('laneFollowMaxGapPx')

/**
 * Capture the page in both palettes and prove the capture is fit to keep: the
 * palette is the one the brand resolves to, and the visible text carries no
 * personal data (scripts/shared/privacy.mjs). The files land in the run's out
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

/**
 * The frames a flight's stand-in and the row it replaces are both readable in.
 * Every reading carries both boxes whole (packages/testing/e2e.mjs), because two
 * of the flight's own rules are about the pair: the row may only be shown once
 * the stand-in is on it, and the stand-in may never stand shorter than the row.
 */
function flightBoxes(flight) {
  return flight.filter((frame) => frame.shell !== null && frame.shell !== undefined && frame.bubble !== null && frame.bubble !== undefined)
}

/**
 * How far the stand-in is off the row in a frame, in pixels: the largest of the
 * two edges' differences. A few pixels is the landing's own give.
 */
function flightGap(frame) {
  return Math.max(
    Math.abs(frame.shell[0] - frame.bubble[0]),
    Math.abs(frame.shell[1] - frame.bubble[1]),
    Math.abs(frame.shell[3] - frame.bubble[3]),
  )
}

/** The row's own foot, left uncovered by the few pixels a moving transcript costs. */
const LANDING_GIVE = 4

/**
 * One check on every frame the row is shown in: the stand-in is on it.
 *
 * Two copies of the same message, one above the other, is what a reader sees
 * when the row is released before the stand-in has arrived (send-flight.ts's
 * arrived()), and a stand-in left short by a row that moved under it uncovers
 * the row's own foot, which reads as a line under the message. The host can move
 * the row between two samples (the transcript gliding to its tail) and the
 * flight re-pins the stand-in in its own frame, so a gap the next sample no
 * longer shows was never painted: only a gap that holds is judged. A row that
 * moved between the two samples explains the gap by itself — the trace carries
 * the frame the row moved in with the stand-in's position from before it — so
 * the gap that holds over a row standing still is the one a reader saw.
 */
function onRowCheck(shown) {
  const gaps = shown.map((frame) => flightGap(frame))
  const rowBox = (frame) => `${frame.bubble[1]}/${frame.bubble[3]}`
  const apart = shown.filter((frame, at) => {
    if (gaps[at] <= LANDING_GIVE) return false
    const next = shown[at + 1]
    if (next === undefined || gaps[at + 1] <= LANDING_GIVE) return false
    return rowBox(next) === rowBox(frame)
  })
  return check('真行显形期间替身一直落在它身上', shown.length > 0 && apart.length === 0,
    `frames with the row shown=${shown.length}, of them apart=${apart.length}${apart.length === 0 ? '' : `：${apart.slice(0, 3).map((frame) => `${flightGap(frame).toFixed(2)}px`).join(' | ')}`}`)
}

/**
 * The frames and the row once the handover has finished.
 *
 * The runner reads the trace the moment the turn settles (e2e.mjs's
 * startTrace), and the stand-in leaves a beat after the handover: on a slow
 * runner that read ends before the real row is shown, so a check reading its
 * last frame called a row that had not appeared yet invisible, and found no
 * frame to say the stand-in had landed on it. The page keeps sampling after
 * that read, so the frames past it are read here, together with the last frame
 * carrying a row, which is the row the reader is left with. What is read here
 * is written back into the run's context: the exported trace has to carry the
 * frames the checks judged, or a failure cannot be read from the artifact.
 */
async function handoverFrames(context) {
  const { page, trace } = context
  await page.waitForSelector(SKIN.sendGhost, { state: 'detached', timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(300)
  const later = await page.evaluate(() => window.__e2eTrace ?? [])
  const frames = later.length >= trace.length ? later : trace
  let settled = frames[frames.length - 1]
  for (let at = frames.length - 1; at >= 0; at -= 1) {
    if (frames[at].rows > 0) { settled = frames[at]; break }
  }
  context.trace = frames
  return { frames, settled }
}

/** The scenarios: each boots its own instance, sends its prompt, and asserts. */
const SCENARIOS = {
  /**
   * 读者消息下面那行控件（features/message-actions）：撤回与编辑插在宿主自己的
   * 控件行里，整行只在悬停时显现；撤回从消息前一个事件分岔并把原文放回新会话的
   * 输入框，编辑把改过的文字在新会话里直接发出，原会话原样留着。
   *
   * 这一场按读者看见的样子选：控件行是宿主的 `[data-clock]`，皮肤的两个按钮就
   * 是它末尾的两个按钮（宿主先画时间与复制），编辑框是那一行里唯一的文本域。
   * 首屏那一步顺带核对首页统计数值的提示：那也是宿主自己的 Tooltip，没有浏览器
   * 原生的 `title`。
   */
  messageAnswerActions: messageAnswerActionsScenario({ check }),
  messageActions: messageActionsScenario({ check }),
  systemTypography: systemTypographyScenario(),
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
   * ring's number and a model name longer than the room left over — rather than
   * running past the card. At 330px there is less room than the controls need,
   * which is where the room the effort trigger reserves must come out of the
   * model name instead of out of the card: nothing leaves the card and the row
   * does not scroll sideways.
   */
  mobileHome: mobileHomeScenario(),
  composerViewport: composerViewportScenario(),
  narrow: {
    script: 'greeting',
    prompt: 'hello there',
    viewport: { width: 390, height: 844 },
    async assert({ page, session }) {
      const read = () => page.evaluate(() => {
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
        // The skin's own ring in the row; the host's meter stays in its dock unpainted.
        const meter = read('[data-dsh-claude-meter-ring]')
        const card = read('[data-composer-card]')
        const row = read('[data-dsh-claude-part~="row"]')
        // What stands past the row's own right edge: the row's scrollWidth is
        // the largest such overflow, and the name says which part carries it.
        const overflowing = (() => {
          if (row === null) return []
          const bound = row.getBoundingClientRect().right
          return [...row.querySelectorAll('*')]
            .map((el) => ({ el, rect: el.getBoundingClientRect() }))
            .filter(({ el, rect }) => rect.width > 0 && rect.right > bound + 1 && getComputedStyle(el).display !== 'none')
            .map(({ el, rect }) => `${el.tagName.toLowerCase()}.${(typeof el.className === 'string' ? el.className : '').split(' ')[0]}+${Math.round(rect.right - bound)}`)
            .slice(-6)
        })()
        return {
          width: window.innerWidth,
          card: box(card),
          cardOver: card === null ? 0 : card.scrollWidth - card.clientWidth,
          rowOver: row === null ? 0 : row.scrollWidth - row.clientWidth,
          overflowing,
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
      const apart = (one, other) => one === null || other === null || one.right <= other.left || other.right <= one.left
      const fits = (state) => state.meter !== null && inside(state.perm, state.card) && inside(state.model, state.card) && inside(state.meter, state.card) &&
        inside(state.effort, state.card) && apart(state.meter, state.model) && apart(state.meter, state.effort)
      const narrow = await read()
      await page.setViewportSize({ width: 330, height: 844 })
      // The statistics fold onto a line of their own in a measure pass, and a
      // fixed pause reads the row mid-move on a loaded machine. Read until the
      // card and the row stop overflowing for three passes, then judge that.
      let tight = await read()
      for (let held = 0, tries = 0; held < 3 && tries < 40; tries += 1) {
        await page.waitForTimeout(100)
        tight = await read()
        held = tight.cardOver <= 0 && tight.rowOver <= 0 ? held + 1 : 0
      }
      await page.setViewportSize({ width: 390, height: 844 })
      return [
        check('页面是手机的宽度', narrow.width === 390, `innerWidth=${narrow.width}`),
        check('权限选择器收起了下三角', narrow.chevron === false, `chevron=${narrow.chevron}`),
        check('窄屏下两个选择器的名称超出时以省略号收尾', narrow.permMax === '132px' &&
          (narrow.modelMax === '280px' || narrow.modelMax === 'none') &&
          narrow.permEllipsis === 'ellipsis' && narrow.modelEllipsis === 'ellipsis',
          JSON.stringify({ permMax: narrow.permMax, modelMax: narrow.modelMax, perm: narrow.permEllipsis, model: narrow.modelEllipsis })),
        check('上下文只留圆环，数字不再显示', narrow.ring === true && narrow.number === false,
          JSON.stringify({ ring: narrow.ring, number: narrow.number })),
        check('控件都留在输入卡片里，圆环也不与旁边的控件重叠', fits(narrow),
          JSON.stringify({ card: narrow.card, perm: narrow.perm, model: narrow.model, effort: narrow.effort, meter: narrow.meter })),
        check('再窄一些时控件仍留在卡片里，输入区也不再横向滚动',
          fits(tight) && tight.cardOver <= 0 && tight.rowOver <= 0,
          JSON.stringify({ width: tight.width, card: tight.card, cardOver: tight.cardOver, rowOver: tight.rowOver, overflowing: tight.overflowing, perm: tight.perm, model: tight.model, effort: tight.effort, meter: tight.meter })),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  },
  /**
   * The right panel's own collapse control: the skin's button stands in the
   * header's row while that panel is open — its own copy hangs from a
   * transformed, clipped subtree and cannot be placed there, so it stays in the
   * panel — and pressing the skin's button closes the panel, the host's own open
   * button taking its place again.
   */
  rightbar: {
    script: 'greeting',
    prompt: 'hello there',
    async assert({ page, session }) {
      const read = () => page.evaluate(() => {
        const mine = [...document.querySelectorAll('.dsh-claude-rightbar-close')]
        const shown = mine.filter((el) => getComputedStyle(el).display !== 'none')
        const host = document.querySelector('[data-sidebar-right-open] [data-sidebar-right-toggle]')
        const expand = document.querySelector('[data-sidebar-right-expand]')
        const box = shown.length === 0 ? null : (() => {
          const rect = shown[0].getBoundingClientRect()
          return { left: Math.round(rect.left), right: Math.round(rect.right), top: Math.round(rect.top) }
        })()
        return {
          buttons: mine.length,
          shown: shown.length,
          box,
          host: host !== null,
          hostShown: host !== null && getComputedStyle(host).display !== 'none',
          expand: expand !== null,
          panel: document.querySelector('[data-sidebar-right-open]') !== null,
        }
      })
      const before = await read()
      await page.locator('[data-sidebar-right-expand]').first().click()
      await page.waitForFunction(() => document.querySelector('[data-sidebar-right-open]') !== null, undefined, { timeout: 15000 })
      await page.waitForTimeout(500)
      const open = await read()
      await page.locator('.dsh-claude-rightbar-close').first().click()
      await page.waitForFunction(() => document.querySelector('[data-sidebar-right-open]') === null, undefined, { timeout: 15000 })
      await page.waitForTimeout(500)
      const closed = await read()
      return [
        check('收起时那枚按钮不占位置，宿主自己的打开按钮在',
          before.buttons === 1 && before.shown === 0 && before.expand === true && before.panel === false,
          JSON.stringify(before)),
        check('面板打开后它出现在头部那一行，面板里宿主自己那枚留在原处',
          open.shown === 1 && open.box !== null && open.host === true && open.hostShown === true,
          JSON.stringify(open)),
        check('按下它面板收起，宿主的打开按钮回到原处',
          closed.panel === false && closed.expand === true && closed.shown === 0 && closed.host === false,
          JSON.stringify(closed)),
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
      // The skin writes no position while the answer streams (D85), so nothing reads to the host as a
      // reader leaving the tail: its own mark stays on in every frame the live turn's row is pinned in.
      const dropped = sampled.filter((frame) => frame.running !== null && frame.running !== undefined && frame.following === false && overflowing(frame))
      return [
        check('逐帧采样真的在跑', sampled.length > 30, `frames=${sampled.length}`),
        check('回答在采样期间长出来', grown > 100, `grew ${grown}px during the trace`),
        check('位置跟着内容走', moved > 5, `moved in ${moved} of ${sampled.length} frames`),
        check('没有倒退的一帧', backward.length === 0, `backward=${backward.length}${backward.length === 0 ? '' : ` at ${backward.slice(0, 3).map((f) => f.t).join(',')}ms`}`),
        check('尾部没有自己跑远', escaped.length === 0, `escaped=${escaped.length}${escaped.length === 0 ? '' : ` at ${escaped.slice(0, 3).map((f) => f.t).join(',')}ms`}`),
        check('跟随期间尾部留在视野里', worst <= MAX_FOLLOW_GAP_PX, `maxGap=${worst}px of ${following.length} following frames`),
        check('落定后回到末尾', last !== undefined && last.gap <= 4, `lastGap=${last === undefined ? 'n/a' : last.gap}`),
        check('输出期间宿主自己的跟随一直开着', dropped.length === 0, `frames the host mark was off in=${dropped.length}${dropped.length === 0 ? '' : ` at ${dropped.slice(0, 3).map((f) => f.t).join(',')}ms`}`),
        check('满屏之后宿主的状态行不再随内容移动，连半个像素也不动', live.length > 10 && spread === 0, `overflowing frames with the row=${live.length}, top ${tops.length === 0 ? 'n/a' : `${Math.min(...tops)}..${Math.max(...tops)}`}`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  },
  /**
   * The reader's own scrolling during a live turn: the status line's pin stands
   * only while the skin's follow moves the position (D40, D74).
   */
  readerScroll: readerScrollScenario({ check }),
  /** A door rolling at the tail mid-stream leaves the status line pinned where it stood (door-pin.mjs, D40). */
  doorPin: doorPinScenario({ check }),
  /** An answer arriving faster than a slide carries it: the composer stands still and the column stays on the pin (stream-pace.mjs, D85). */
  streamPace: streamPaceScenario({ check }),
  /** A provider's own pace: the column the reader watches never moves down between two frames (stream-jitter.mjs, D85). */
  streamJitter: streamJitterScenario({ check }),
  streamJitterFooter: streamJitterScenario({ check }, 'footer'),
  streamJitterInline: streamJitterScenario({ check }, 'inline'),
  /** The transitions.dev surfaces where they move: greeting, panel, switch, tab, badge, menu (motion.mjs, D9). */
  motion: motionScenario({ check }),
  /** The send flight: the stand-in takes off, the row lands, the words stay put. */
  send: {
    script: 'greeting',
    prompt: 'hello there',
    /**
     * The page as the Windows desktop shell marks it: the host's layout frame
     * then draws its title bar strip as a `::before`, which the stand-in's
     * imitation chain carries a copy of (send-flight.css).
     */
    async beforeSend({ page }) {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-windows-titlebar', '')
        document.documentElement.style.setProperty('--dsh-windows-titlebar-height', '40px')
      })
    },
    async assert(context) {
      const { page, session } = context
      const { frames, settled } = await handoverFrames(context)
      const firstGhost = frames.findIndex((frame) => frame.ghost)
      const takeOffFrame = frames.find((frame) => frame.takeOff !== undefined)
      const flight = firstGhost === -1 ? [] : frames.slice(firstGhost)
      const hidden = flight.filter((frame) => frame.rowFlying)
      const exposedWhileFlying = hidden.filter((frame) => frame.rowVisible)
      const last = frames[frames.length - 1]
      const goneByNow = await page.evaluate((selector) => document.querySelector(selector) === null, SKIN.sendGhost)
      const words = flight.filter((frame) => (frame.ghostWords ?? []).includes('hello there') || (frame.rowWords ?? []).includes('hello there'))
      const takeOff = takeOffFrame?.takeOff
      const sameType = takeOff !== undefined && takeOff.clone !== null && takeOff.composer !== null
        && takeOff.clone.family === takeOff.composer.family && takeOff.clone.size === takeOff.composer.size
        && takeOff.clone.weight === takeOff.composer.weight && takeOff.clone.color === takeOff.composer.color
      // The stand-in lands on the row it replaces, and it has to be at least as
      // tall as that row: a row taller than the stand-in keeps the page's paint
      // below it while the covered part carries the stand-in's faded paint, and
      // the seam reads as a stripe across the bubble. Height only: the stand-in
      // is above the row while it travels, and its own landing give is a
      // fraction of a pixel.
      const covered = flightBoxes(flight)
      const short = covered.filter((frame) => frame.shell[3] - frame.shell[1] < frame.bubble[3] - frame.bubble[1] - 1)
      // The stand-in's plate is the row's colour as the screen paints it: a
      // translucent token left translucent composites again over the row.
      const translucent = covered.filter((frame) => /rgba\([^)]*,\s*0?\.\d+\)/.test(frame.shellFill ?? ''))
      // While the row is shown, the stand-in has to be on it (onRowCheck).
      const shown = covered.filter((frame) => frame.rowVisible === true)
      // The chain's links paint nothing: an ancestor's pseudo-element copied onto
      // one is a band across the stand-in in the ancestor's colour.
      const linkPaints = [...new Set(flight.flatMap((frame) => frame.linkPaints ?? []))]
      const withLinks = flight.filter((frame) => (frame.links ?? 0) > 0).length
      return [
        check('替身起飞后离开页面', firstGhost !== -1 && goneByNow, `firstGhost at ${firstGhost === -1 ? 'n/a' : `${frames[firstGhost].t}ms`}, ghost at the end=${last.ghost}, left by now=${goneByNow}`),
        check('真行在飞行期间不可见', hidden.length > 0 && exposedWhileFlying.length === 0, `flying frames=${hidden.length}, of them visible=${exposedWhileFlying.length}`),
        check('读者的字每一帧都看得见', words.length === flight.length, `words on ${words.length} of ${flight.length} frames after take-off`),
        check('真行落定后可见并带着字', settled.rows > 0 && settled.rowVisible === true && (settled.rowWords ?? []).includes('hello there'), `rows=${settled.rows} visible=${settled.rowVisible} words=${JSON.stringify(settled.rowWords)}`),
        check('替身带走了输入卡片的样子', sameType === true, takeOff === undefined ? 'no take-off frame in the trace' : `clone ${takeOff.clone.size}/${takeOff.clone.color} vs composer ${takeOff.composer.size}/${takeOff.composer.color}, card ${takeOff.cloneCard} vs ${takeOff.composerCard}`),
        check('替身落地时不低于它替换的那一行', covered.length > 0 && short.length === 0, `readable frames=${covered.length}, standing above the row's own foot=${covered.length - short.length}${short.length === 0 ? '' : `：${short.slice(0, 3).map((frame) => `shell ${(frame.shell[3] - frame.shell[1]).toFixed(1)} vs row ${frame.bubble[3] - frame.bubble[1]}`).join(' | ')}`}`),
        onRowCheck(shown),
        check('替身的底色是画面上的颜色，不是半透明的令牌', covered.length > 0 && translucent.length === 0, `translucent fills=${translucent.length}${translucent.length === 0 ? '' : `（${[...new Set(translucent.map((frame) => frame.shellFill))].join('、')}）`}`),
        check('Windows 标题栏标记下，替身里的祖先链不画伪元素', withLinks > 0 && linkPaints.length === 0, `frames carrying the chain=${withLinks}${linkPaints.length === 0 ? '' : `，painting: ${linkPaints.join('、')}`}`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  },
  /**
   * The hand-over in a transcript that is already full: the host glides to the
   * tail after a submission, which moves the row the flight is landing on. The
   * row must not be shown while the stand-in is still travelling (send-flight.ts's
   * arrived()), and this is the state that says so — an empty transcript never
   * moves, and the flight's own check passes there without proving anything.
   */
  sendFull: {
    script: 'greeting',
    prompt: 'hello there',
    async afterTurn(context) {
      // Six turns first, so the transcript is taller than the viewport and the
      // next submission has somewhere to glide from.
      for (let index = 0; index < 6; index += 1) {
        await sendPrompt(context.page, 'fill the transcript')
        await waitForTurn(context.page)
      }
      await context.page.waitForTimeout(600)
    },
    async assert(context) {
      const { page, session } = context
      const { frames, settled } = await handoverFrames(context)
      const firstGhost = frames.findIndex((frame) => frame.ghost)
      const flight = firstGhost === -1 ? [] : frames.slice(firstGhost)
      const covered = flightBoxes(flight)
      const short = covered.filter((frame) => frame.shell[3] - frame.shell[1] < frame.bubble[3] - frame.bubble[1] - 1)
      const shown = covered.filter((frame) => frame.rowVisible === true)
      return [
        check('满屏的对话里也读到了飞行', firstGhost !== -1 && covered.length > 5, `firstGhost at ${firstGhost === -1 ? 'n/a' : `${frames[firstGhost].t}ms`}, readable frames=${covered.length}`),
        onRowCheck(shown),
        check('替身落地时不低于它替换的那一行', covered.length > 0 && short.length === 0, `readable frames=${covered.length}, standing above the row's own foot=${covered.length - short.length}`),
        check('落定后那一行带着字', settled.rows > 0 && settled.rowVisible === true, `rows=${settled.rows} visible=${settled.rowVisible}`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  },
  /** The host contract table, entry by entry, in the page state each one lives in (D3). */
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
      const trigger = context.page.locator('[aria-haspopup="menu"]:not(:is([class^="dsh-claude"], [class*=" dsh-claude"])):visible').first()
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
      // A computed reading is the host's own exact output; a difference from the
      // snapshot is printed as an observation and blocks nothing (D92).
      const failed = results.filter((result) => !result.ok && result.observation !== true)
      const differing = results.filter((result) => !result.ok && result.observation === true)
      const unchecked = results.filter((result) => result.observed === 'reported, not checked here')
      const line = (state) => {
        const state_ = byState(state)
        const broken = state_.filter((result) => !result.ok && result.observation !== true).map((result) => `${result.id} (${result.observed})`)
        return check(`${state} 状态的条目都在`, broken.length === 0, `${state_.length} 条${broken.length === 0 ? '' : `，失效：${broken.join('、')}`}`)
      }
      return [
        ...[...new Set(results.map((result) => result.state))].map((state) => line(state)),
        check('没有页面形态的条目已逐条列出', unchecked.length > 0, `${unchecked.length} 条由行为场景与单元测试持有：${unchecked.map((result) => result.id).join('、')}`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
        ...failed.slice(0, 8).map((result) => check(`契约条目 ${result.id} 仍然成立`, false, `${result.observed}（${result.state}）`)),
        ...differing.map((result) => observe(`契约条目 ${result.id} 的宿主输出仍与快照记录相同`, false, `${result.observed}（${result.state}）`)),
      ]
    },
  },
  ...statsScenarios({ check }),
  /** The collapsed rail as one icon column, its chip centred on it (sidebar-rail.mjs). */
  sidebarRail: sidebarRailScenario({ check }),
  /** The collapsed sidebar opened over the page from a hover, the centre kept as it was (sidebar-peek.mjs). */
  sidebarPeek: sidebarPeekScenario({ check }),
  /** The waiting line and the counted process headers (process-summary.mjs, D74). */
  processSummary: processSummaryScenario({ check }),
  /** The file-change rows of one file read as one row (file-merge.mjs). */
  fileMerge: fileMergeScenario({ check }),
  /** The reasoning's streamed window while the model thinks (reasoning-stream.mjs, D74). */
  reasoningStream: reasoningStreamScenario({ check }),
  reasoningContinuous: reasoningContinuousScenario({ check }),
  /** The waiting line's own words: the model's clause and the file a call works on (wait-line.mjs, D74). */
  waitLine: waitLineScenario({ check }),
  /** The waiting line's second paint, chosen in the settings (wash-line.mjs, D40). */
  washLine: washLineScenario({ check }),
  /** What a frame costs in a transcript that is already long (long-session.mjs, D40). */
  longSession: longSessionScenario({ check }),
  /** Every `!important` the skin writes is needed on the real page (packages/testing/scenarios/importance.mjs, D9). */
  importance: importanceScenario({ check, observe, sendPrompt, waitForTurn, host: HOST }),
  /** A page under a non-loopback name reads and writes the host's settings beside the loopback one (packages/testing/scenarios/remote-settings.mjs, D75). */
  remoteSettings: remoteSettingsScenario({ check }),
  /** Slow IME composition and cancellation in the real host's username field. */
  usernameComposition: usernameCompositionScenario({ check }),
  /** The username keeps the reader's text while an input method composes it across a save (packages/testing/scenarios/username-ime.mjs, D92). */
  usernameIme: usernameImeScenario({ check }),
  /** The reader's own brand images through the host half's routes and on the real shell (packages/testing/scenarios/custom-brand.mjs, D30). */
  customBrand: customBrandScenario({ check }),
  /** The Chat / Code switch beside ds-bot's published browser half (packages/testing/scenarios/ds-bot.mjs, D74). */
  dsBot: dsBotScenario({ check }),
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

export { SCENARIOS }
