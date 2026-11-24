import { BAND_ANIMATION, basicChecks, check } from './_shared.mjs'
import { bound } from '../../bounds.mjs'
import { handoverCounts, handoverJumps } from './chat-handover.mjs'
import surfaceTable from '../../data/surface.json' with { type: 'json' }

const CROSS_LANE = surfaceTable.surface.find((entry) => entry.id === 'chat-wait.lane-cross')
if (CROSS_LANE?.selector === undefined) throw new Error('chat-wait: the cross lane surface is incomplete')
const CROSS_NAME = CROSS_LANE.selector.split('.').pop()


/**
 * The waiting line (packages/client/src/features/chat-wait/): the running row's
 * line beside the host's words, the loader's four motions and their rotation,
 * the wording states and swaps, the overtime badge and the margin it waits out,
 * the row's pin and its ownership hand-overs.
 */
export default {
  'chat-wait'(r) {
    basicChecks(r)
    const wait = r.wait || {}
    const working = wait.working || {}
    check('the running row takes the skin\'s line beside the host\'s words, which step aside',
      working.marked === true && working.besideWords === true && working.wordsShown === false, JSON.stringify(working))
    const loader = working.loader || {}
    const laneOf = (reading, name) => (reading.lanes || []).find((lane) => String(lane.name).includes(name)) || {}
    const numbers = (text) => (String(text).match(/-?[\d.]+/g) || []).map(Number)
    const LANE_DOTS = [['is-bounce', 3], ['is-line', 3], ['is-orbit', 4], [CROSS_NAME, 3]]
    const OPENINGS = ['dsh-claude-wait-dot', 'dsh-claude-wait-dot-line', 'dsh-claude-wait-dot-orbit-1']
    // The cross keyframes are the wave's own name with the lane's suffix (chat-wait.css).
    const CROSS_ANIMATION = `${OPENINGS[0]}-${CROSS_NAME.replace('is-', '')}`
    OPENINGS.push(CROSS_ANIMATION)
    // 四条轨道都在页面上、各带自己的球数（3 / 3 / 4 / 3），其中一条在用；开哪一条是随机的，
    // 所以这里只认「用的是四条之一」。
    check('加载点把四条轨道都建好了——三颗波浪、三颗走路、四颗交换四角、三颗三轴穿越——其中一条在用，主机的鲸鱼尾让位',
      loader.shown === true && (loader.lanes || []).length === 4 &&
        LANE_DOTS.every(([name, count]) => (laneOf(loader, name).opacity || []).length === count) &&
        LANE_DOTS.some(([name]) => String(loader.motion).includes(name)) &&
        OPENINGS.includes(String(loader.animation)) && loader.background === 'rgb(217, 119, 87)' &&
        loader.shadow === 'none' && working.whaleShown === false,
      JSON.stringify({ loader, whaleShown: working.whaleShown }))
    // 每条轨道自己的动作：探针把它临时放到「在用」的位置、用它自己的时钟走完一圈，
    // 所以读的是样式表写下的曲线，与此刻轮到谁无关。
    const bounceFrames = (wait.bounceLane || { frames: [] }).frames || []
    const bounceY = bounceFrames.map((frame) => numbers(frame.translate[0])[1]).filter((one) => Number.isFinite(one))
    const bounceScales = bounceFrames.flatMap((frame) => frame.scale || []).map((one) => String(one))
    const bounceRound = bounceScales.every((one) => one === 'none' || one === '1' || one === '1 1')
    check('波浪那条：纯圆三点无压扁，一颗从顶端基线下落 8px 再回到顶端，1200ms 一周、三颗各错开 200ms',
      bounceFrames.length >= 40 && bounceFrames[0].animation === 'dsh-claude-wait-dot' &&
        bounceFrames[0].duration === '1.2s' && (bounceFrames[0].delays || []).join(',') === '-1.2s,-1s,-0.8s' &&
        Math.min(...bounceY) <= -7.5 && Math.max(...bounceY) >= -0.5 && bounceRound,
      JSON.stringify({ readings: bounceFrames.length, low: Math.min(...bounceY), high: Math.max(...bounceY), head: bounceFrames[0] }))
    // 走路那条：一端走到另一端各占半个周期，所以过半个周期球落在中点另一侧、离中点的距离与
    // 大小都一样；三颗各错开三分之一个周期（相差半个周期就是把同一个动作镜像过去），
    // 而且两端最多就是球本来的大小。简谐运动在两端慢、中间快：离中点超过四分之三幅度的
    // 时间约占一周的 46%，匀速往返只占 25%，读的就是这一项。
    const lineFrames = (wait.lineLane || { frames: [] }).frames || []
    const lineY = lineFrames.map((frame) => numbers(frame.translate[0])[1])
    const lineScale = lineFrames.map((frame) => Number(String(frame.scale[0]).split(' ')[0]))
    const trace = lineY.filter((one) => Number.isFinite(one))
    const sizes = lineScale.filter((one) => Number.isFinite(one))
    const lowest = trace.length === 0 ? 0 : Math.min(...trace)
    const highest = trace.length === 0 ? 0 : Math.max(...trace)
    const middle = (lowest + highest) / 2
    const half = Math.floor(trace.length / 2)
    const place = trace.slice(0, half).map((one, at) => Math.abs(one + trace[at + half] - 2 * middle))
    const size = sizes.slice(0, half).map((one, at) => Math.abs(one - sizes[at + half]))
    const drift = place.length === 0 ? Infinity : Math.max(...place)
    const sizeDrift = size.length === 0 ? Infinity : Math.max(...size)
    const reach = (highest - lowest) / 2
    const dwell = trace.length === 0 ? 0 : trace.filter((one) => Math.abs(one - middle) > reach * 0.75).length / trace.length
    const phaseOf = (delay) => {
      const seconds = Number(String(delay).replace('s', ''))
      return ((-seconds % 1.25) + 1.25) % 1.25 / 1.25
    }
    const phases = (lineFrames[0] === undefined ? [] : lineFrames[0].delays || []).map(phaseOf)
    const clash = phases.some((one, at) => phases.some((two, other) => other > at &&
      (Math.abs(one - two) < 0.02 || Math.abs(Math.abs(one - two) - 0.5) < 0.02)))
    check('走路那条：三颗各沿自己的线走简谐、两端停得比中间久、相位各错三分之一，去程与回程是同一条曲线，最长的一帧也不比跳球大',
      lineFrames.length >= 45 && lineFrames[0].animation === 'dsh-claude-wait-dot-line' &&
        lineFrames[0].duration === '1.25s' && phases.length === 3 && !clash &&
        highest - lowest >= 7 && Math.max(...sizes) <= 1.001 && drift <= 0.5 && sizeDrift <= 0.05 && dwell >= 0.38,
      JSON.stringify({
        readings: lineFrames.length,
        phases,
        travel: Number((highest - lowest).toFixed(2)),
        drift: Number(drift.toFixed(2)),
        sizeDrift: Number(sizeDrift.toFixed(3)),
        dwell: Number(dwell.toFixed(2)),
      }))
    // 交换四角那条：四颗球站成 45 : 55 的矩形；一圈四个四分之一圈——A 段一对对角换位、
    // B 段另一对，再各换回来，所以整圈走完每颗球回到原处。每颗球走的是一段椭圆弧：
    // 弧的中点离「起点到终点那条直线」有明显距离，不是被直线搬过去。
    const orbitFrames = (wait.orbitLane || { frames: [] }).frames || []
    const spot = (frame, dot) => ({ x: numbers(frame.translate[dot])[0], y: numbers(frame.translate[dot])[1] })
    const near = (one, two, allowance) => one !== undefined && two !== undefined &&
      Math.abs(one.x - two.x) <= allowance && Math.abs(one.y - two.y) <= allowance
    const shape = orbitFrames.length === 0 ? { width: 0, height: 0 } : (() => {
      const xs = [0, 1, 2, 3].map((dot) => spot(orbitFrames[0], dot).x)
      const ys = [0, 1, 2, 3].map((dot) => spot(orbitFrames[0], dot).y)
      return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
    })()
    const bow = orbitFrames.length < 11 ? 0 : (() => {
      const from = spot(orbitFrames[0], 0)
      const to = spot(orbitFrames[10], 0)
      const mid = spot(orbitFrames[5], 0)
      const length = Math.hypot(to.x - from.x, to.y - from.y)
      return length === 0 ? 0 : Math.abs((to.x - from.x) * (from.y - mid.y) - (from.x - mid.x) * (to.y - from.y)) / length
    })()
    const closes = orbitFrames.length > 60 &&
      [0, 1, 2, 3].every((dot) => near(spot(orbitFrames[60], dot), spot(orbitFrames[0], dot), 0.05))
    // 每段 400ms 走弧、随后 200ms 停住（= 0.5 倍那段用时），所以「刚走完」与「停顿结束」
    // 读出来是同一个位置。
    const dwells = [[10, 15], [25, 30], [40, 45], [55, 60]].every(([just, later]) =>
      [0, 1, 2, 3].every((dot) => near(spot(orbitFrames[just], dot), spot(orbitFrames[later], dot), 0.05)))
    check('交换四角那条：四颗球站成 45 : 55 的矩形，一圈里 A 段换一对对角、B 段换另一对、再各换回来，每颗走的是弧、走完停半段',
      orbitFrames.length > 60 && shape.height > 0 && Math.abs(shape.width / shape.height - 45 / 55) <= 0.06 &&
        near(spot(orbitFrames[10], 0), spot(orbitFrames[0], 2), 0.6) && near(spot(orbitFrames[10], 2), spot(orbitFrames[0], 0), 0.6) &&
        near(spot(orbitFrames[10], 1), spot(orbitFrames[0], 1), 0.05) && near(spot(orbitFrames[10], 3), spot(orbitFrames[0], 3), 0.05) &&
        near(spot(orbitFrames[25], 1), spot(orbitFrames[10], 3), 0.6) && near(spot(orbitFrames[25], 3), spot(orbitFrames[10], 1), 0.6) &&
        near(spot(orbitFrames[25], 0), spot(orbitFrames[10], 0), 0.05) && dwells && closes && bow >= 1,
      JSON.stringify({ readings: orbitFrames.length, shape, bow: Number(bow.toFixed(2)), closes, dwells }))
    // 三轴穿越那条：三颗同相沿互成 120° 的直线往返，每条线相对中心切向偏置 1.6px；
    // 中点三颗组成边长约 2.77px 的紧贴正三角形擦肩而过（不缩点、不重叠），两端是镜像三角形。
    const crossFrames = (wait.crossLane || { frames: [] }).frames || []
    const crossSpot = (frame, dot) => ({ x: numbers(frame.translate[dot])[0], y: numbers(frame.translate[dot])[1] })
    const crossDist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y)
    const crossMid = crossFrames.length > 24 ? [0, 1, 2].map((dot) => crossSpot(crossFrames[24], dot)) : []
    const crossSides = crossMid.length === 3 ? [crossDist(crossMid[0], crossMid[1]), crossDist(crossMid[1], crossMid[2]), crossDist(crossMid[2], crossMid[0])] : []
    const crossStart = crossFrames.length > 0 ? [0, 1, 2].map((dot) => crossSpot(crossFrames[0], dot)) : []
    const crossEnd = crossFrames.length > 24 ? [0, 1, 2].map((dot) => crossSpot(crossFrames[24], dot)) : []
    // Each walk is one straight line: its midpoint sits 1.6px from the centre (the offset),
    // and the two ends are equidistant from that foot on opposite sides.
    const mirrored = crossStart.length === 3 && crossEnd.length === 3 &&
      [0, 1, 2].every((dot) => {
        const p = crossStart[dot], q = crossEnd[dot]
        const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2
        const foot = Math.hypot(mx, my)
        const dStart = Math.hypot(p.x - mx, p.y - my), dEnd = Math.hypot(q.x - mx, q.y - my)
        return Math.abs(foot - 1.6) <= 0.1 && Math.abs(dStart - dEnd) <= 0.1 && Math.abs(dStart - 5.8) <= 0.15
      })
    const crossScales = crossFrames.flatMap((frame) => frame.scale || []).map((one) => String(one))
    const crossRound = crossScales.every((one) => one === 'none' || one === '1' || one === '1 1')
    check('三轴穿越那条：三颗同相往返、中点擦肩成 2.77px 正三角、两端镜像、全程纯圆',
      crossFrames.length >= 48 && crossFrames[0].animation === CROSS_ANIMATION &&
        crossFrames[0].duration === '1.2s' && (crossFrames[0].delays || []).every((one) => one === '0s') &&
        crossSides.length === 3 && crossSides.every((one) => Math.abs(one - 2.77) <= 0.1) && mirrored && crossRound,
      JSON.stringify({ readings: crossFrames.length, sides: crossSides.map((one) => Number(one.toFixed(2))), mirrored }))
    // 轮换：一个动作站满 10 秒才换，换的是另一条轨道（不会换到自己）；交接一开始新的那条
    // 就在场，所以从那一帧算换。
    const rotation = (wait.rotation || []).filter((frame) => frame !== null && frame.loader !== null && frame.loader.motion !== null)
    const seen = rotation.map((frame) => ({ at: frame.at, motion: String(frame.loader.motion), loader: frame.loader }))
    const starts = seen.length === 0 ? [] : [0]
    for (let at = 1; at < seen.length; at += 1) if (seen[at].motion !== seen[at - 1].motion) starts.push(at)
    const motionOf = (at) => (String(seen[at].motion).match(/is-(bounce|line|orbit|cross)/) || [])[1]
    const changes = starts.slice(1)
    // 换与换之间隔多久：只看相邻两次换之间的那一段，采样起点不算一次变化。
    const gaps = changes.slice(1).map((at, index) => seen[at].at - seen[changes[index]].at)
    const rotated = changes.map((at, index) => motionOf(at) !== motionOf(starts[index]))
    check('加载点每 10 秒换一条轨道，换的不会是正站着的那一条',
      changes.length >= 2 &&
        gaps.every((one) => one >= bound('loaderRotateGapMinMs') && one <= bound('loaderRotateGapMaxMs')) &&
        rotated.every((one) => one === true),
      JSON.stringify({ changes: changes.length, gaps: gaps.map((one) => Math.round(one)), motions: starts.map((at) => motionOf(at)) }))
    // 交接读第一次换到第二次换之间的那些帧，从换之前的最后一帧起：旧轨道的每颗球在自己
    // 静止的那一刻把位置交给新轨道里配对的那颗，新的那颗从原地出发走进自己的轨迹。所以框里
    // 每一帧都有三到四颗球，每颗刚露面的球都站在上一帧某颗球的位置上，交接完只剩新的那条。
    const laneShows = (frame, name, test) => {
      const opacity = laneOf(frame.loader, name).opacity || []
      return opacity.length > 0 && opacity.every(test)
    }
    const shown = (lane, dot) => (lane.opacity || [])[dot] > 0.5
    const inView = (frame) => (frame.loader.lanes || []).flatMap((lane) => (lane.spots || []).filter((_, dot) => shown(lane, dot)))
    const before = changes.length === 0 ? null : seen[changes[0] - 1]
    const comeLane = changes.length === 0 ? null : ['is-bounce', 'is-line', 'is-orbit', CROSS_NAME].find((name) => name === `is-${motionOf(changes[0])}`) ?? null
    const goneLane = before === null ? null : ['is-bounce', 'is-line', 'is-orbit', CROSS_NAME].find((name) => laneShows(before, name, (one) => one > 0.9)) ?? null
    const handing = changes.length < 2 ? [] : seen.slice(changes[0] - 1, changes[1])
    const settled = goneLane === null || comeLane === null ? null
      : handing.find((frame) => laneShows(frame, goneLane, (one) => one < 0.1) && laneShows(frame, comeLane, (one) => one > 0.9)) ?? null
    const counts = handoverCounts(handing, shown)
    const jumps = handoverJumps(handing, { shown, bound })
    check('换轨道是一次形变：每颗新出现的球都从旧轨道某颗球所在的位置出发，框里每一帧都有三到四颗球，交接完只剩新的那条',
      goneLane !== null && comeLane !== null && goneLane !== comeLane && settled !== null && String(settled.motion).includes(comeLane) &&
        counts.length > 0 && counts.every((one) => one >= 3 && one <= 4) && jumps.length === 0,
      JSON.stringify({ gone: goneLane, come: comeLane, settled: settled === null ? null : settled.motion, fewest: Math.min(...counts), most: Math.max(...counts), jumps }))
    check('the DeepSeek brand keeps the host\'s whale tail, stands the skin\'s dots down and waits on the host\'s own word',
      wait.deepseek?.loader?.shown === false && wait.deepseek?.whaleShown === true && wait.deepseek?.word === 'Deep diving',
      JSON.stringify(wait.deepseek))
    check('the Claude brand takes the dots back and waits on the skin\'s own word',
      wait.claudeAgain?.loader?.shown === true && wait.claudeAgain?.whaleShown === false && wait.claudeAgain?.word === 'Thinking…',
      JSON.stringify(wait.claudeAgain))
    check('only the host words are marked and a third-party line stays visible before or after the waiting line mounts',
      working.wordsMarked === true && working.foreignShown === true && wait.foreignAfter?.foreignShown === true,
      JSON.stringify({ working, after: wait.foreignAfter }))
    check('the line says what the turn is doing, sweeping, with the turn\'s clock in the host\'s units',
      working.word === 'Thinking…' && working.sweep === BAND_ANIMATION && working.statusMotion === 'sweep' && /^1m [5-9]s$/.test(working.clock || ''),
      JSON.stringify(working))
    check('the band rides the copy holding the words, never the label (a first write and a reduced-motion one alike)',
      working.sweepOnLabel === false && wait.reduced?.sweepOnLabel === false,
      JSON.stringify({ working: working.sweepOnLabel, reduced: wait.reduced?.sweepOnLabel }))
    check('the Motion tab\'s other paint takes the line\'s words over: the copy runs the wash and its two loops, and the band returns when it is picked again',
      wait.wash?.statusMotion === 'wash' && wait.wash?.sweep === 'dsh-claude-wash-hue, dsh-claude-wash-drift' &&
        wait.sweepAgain?.statusMotion === 'sweep' && wait.sweepAgain?.sweep === BAND_ANIMATION,
      JSON.stringify({ wash: wait.wash, sweepAgain: wait.sweepAgain }))
    check('a model at work shows no overtime badge', working.badge === null, JSON.stringify(working))
    const silent = wait.silent || []
    const blurOf = (frame) => Number((/blur\(([\d.]+)px\)/.exec(frame.filter || '') || [])[1] || 0)
    const leaving = silent.filter((frame) => frame.phase === 'exit')
    const last = silent[silent.length - 1] || {}
    check('the old wording leaves upward with a blur: the leave pose is set, its opacity falls and its glyphs blur',
      leaving.length > 2 && leaving.every((frame) => frame.displayed === 'Running tools…') &&
        Number(leaving[0].opacity) > 0.5 && Number(leaving[leaving.length - 1].opacity) < 0.1 &&
        leaving.some((frame) => blurOf(frame) > 0.5),
      JSON.stringify({ frames: silent.length, leaving: leaving.map((frame) => [frame.opacity, frame.filter]) }))
    // Every frame holding both copies is a frame the leaving one is still in the
    // box for: while it fades it is the copy the reading is taken off, so a swap
    // that only starts the arriving copy once the leaving one has gone shows the
    // leave's own frames alone and never both at a readable opacity.
    const overlap = silent.filter((frame) => frame.copies > 1)
    check('the two halves overlap: both copies stand in the box across the leaving one\'s whole fade, and the band keeps sweeping throughout',
      overlap.length > 2 && overlap.some((frame) => Number(frame.opacity) > 0.3) && overlap.some((frame) => Number(frame.opacity) < 0.3) &&
        silent.every((frame) => frame.sweep === BAND_ANIMATION),
      JSON.stringify({ overlapping: overlap.length, opacities: overlap.map((frame) => frame.opacity), sweepOff: silent.filter((frame) => frame.sweep !== BAND_ANIMATION).length }))
    const enter = wait.enterFrames || []
    check('the wording arriving rises from below through a blur, its opacity climbing to rest',
      enter.some((frame) => frame.opacity > 0.05 && frame.opacity < 0.95) && enter[0].opacity < 0.5 && blurOf(enter[0]) > 0.5 &&
        Number(enter[enter.length - 1].opacity) > 0.9 && blurOf(enter[enter.length - 1]) < 0.5 &&
        enter.every((frame, at) => at === 0 || frame.opacity >= enter[at - 1].opacity - 0.01),
      JSON.stringify(enter))
    const boxes = silent.map((frame) => frame.box)
    // The wording this swap reaches is the shorter of the two, so the box comes
    // down where the other swap of this case went up: what is asserted is the
    // one move and the direction it holds, not the sign of it.
    const travelled = boxes[boxes.length - 1].width - boxes[0].width
    const toward = travelled < 0 ? -1 : 1
    // A sizer's subpixel measurement can move the box by a fraction of a pixel
    // before the real travel; a loaded machine leaves up to a fifth of one. That
    // is not a direction change, and it is below what a reader can see; the
    // total displacement and every visible step still go the wording's way.
    const MEASURE_EPSILON_PX = 0.25
    check('the box the swap runs in never reads as empty, holds its height, and moves the clock only where the words themselves changed',
      boxes.length > 4 &&
        boxes.every((box) => box.width > 0 && box.height === boxes[0].height) &&
        boxes.every((box, at) => at === 0 || (toward * (box.width - boxes[at - 1].width) >= -MEASURE_EPSILON_PX && toward * (box.clockLeft - boxes[at - 1].clockLeft) >= -MEASURE_EPSILON_PX)) &&
        boxes[boxes.length - 1].clockLeft - boxes[0].clockLeft === travelled,
      JSON.stringify({ first: boxes[0], last: boxes[boxes.length - 1], widths: boxes.map((box) => box.width), heights: boxes.map((box) => box.height), clockLefts: boxes.map((box) => box.clockLeft) }))
    // The width is travelled rather than written (shared/swapping-text.ts pins
    // the box and writes the width it heads for): on this 25 ms grid the clock's
    // displacement comes in many small steps, where a width written in one task
    // moves it the whole way inside one frame.
    const steps = boxes.map((box, at) => at === 0 ? 0 : toward * (box.width - boxes[at - 1].width)).filter((step) => step > 0)
    // A width written in one task moves the clock the whole way inside one
    // frame; a travelled one never covers the whole travel in one frame. A
    // stalled display can hand two samples a whole stretch of the travel at
    // once, so the ceiling is the travel itself rather than a share of it.
    check('the box travels to its new width over several frames, so the clock slides with it instead of jumping',
      Math.abs(travelled) > 4 && steps.length >= 3 && Math.max(...steps) < Math.abs(travelled),
      JSON.stringify({ steps: steps.length, largest: steps.length === 0 ? 0 : Math.max(...steps), travelled }))
    check('the new wording is the one left standing once the copy that left is taken down',
      silent[0].displayed === 'Running tools…' && silent[0].copies === 1 && silent[0].phase === null &&
        Number(last.opacity) === 1 && last.copies === 1 && last.word === 'Thinking…',
      JSON.stringify({ first: [silent[0].displayed, silent[0].copies, silent[0].phase], rest: [last.opacity, last.filter, last.copies, last.word] }))
    check('a wait nothing can be read from stands on the word the brand says while the model thinks, not a second word of its own',
      last.word === working.word, JSON.stringify({ silent: last.word, working: working.word }))
    check('a model silent past ten seconds shows the overtime badge', last.badge === 'No response yet', JSON.stringify(last))
    // The margin the badge waits out is the session's own: twice its average
    // time to first token, never under ten seconds (wait-state.ts). The probe
    // places each wait's start and lands whole statistics values on the session.
    const marginNoStats = wait.marginNoStats || {}
    const marginSlow = wait.marginSlowSession || {}
    const marginCleared = wait.marginStatsCleared || {}
    check('a session whose first token is slow keeps the badge down past ten seconds, and the floor returns when its statistics go',
      marginNoStats.badge === 'No response yet' && marginSlow.badge === null && marginCleared.badge === 'No response yet',
      JSON.stringify({ noStats: marginNoStats.badge, slow: marginSlow.badge, cleared: marginCleared.badge }))
    const marginUnder = wait.marginFastUnderFloor || {}
    const marginOver = wait.marginFastPastFloor || {}
    check('the floor holds under a fast session: six seconds of silence carries no badge, twelve does',
      marginUnder.badge === null && marginOver.badge === 'No response yet',
      JSON.stringify({ under: marginUnder.badge, over: marginOver.badge }))
    const marginHolds = wait.marginAverageHolds || {}
    const marginPassed = wait.marginTwiceAveragePassed || {}
    check('the margin is twice the average first-token time: an eight-second average holds at twelve seconds of silence and lets out at twenty',
      marginHolds.badge === null && marginPassed.badge === 'No response yet',
      JSON.stringify({ holds: marginHolds.badge, passed: marginPassed.badge }))
    const tools = wait.tools || {}
    check('a tool call in flight is named as such',
      tools.word === 'Running tools…' && tools.badge === null, JSON.stringify(tools))
    const fileCall = wait.fileCall || {}
    check('a call that has its arguments names the file it works on',
      fileCall.word === 'Reading app.js', JSON.stringify(fileCall))
    const arriving = wait.arriving || {}
    check('a call whose arguments are still arriving keeps the plain tool state',
      arriving.word === 'Running tools…', JSON.stringify(arriving))
    const phrase = wait.phrase || {}
    check('reasoning the line can take words from says the model\'s own clause',
      phrase.word === 'Checking the file is true' && phrase.copies === 1, JSON.stringify(phrase))
    const clauseHeld = wait.clauseHeld || {}
    check('从句在下一次意图到达之前一直站着，中间不退回等待词',
      clauseHeld.word === 'Checking the file is true', JSON.stringify(clauseHeld))
    const narrow = wait.narrow || {}
    check('a wording with no room is carried whole and clipped where the row ends, and the clock stays on the row',
      narrow.box?.clipped === true && narrow.box.labelRight <= narrow.box.lineRight + 1 &&
        narrow.box.clockLeft < narrow.box.rowRight && narrow.box.clockRight <= narrow.box.rowRight + 1 &&
        narrow.word === 'Checking whether the whole row model still reads the same arguments',
      JSON.stringify({ word: narrow.word, box: narrow.box }))
    const dotName = wait.dotName || {}
    check('the dot inside a file name does not end the sentence: the clause carries the whole name',
      dotName.word === 'Reading app.js now', JSON.stringify(dotName))
    const reduced = wait.reduced || {}
    check('with the animation choice set to Reduced the new wording is written at once, with no swap',
      reduced.word === 'Checking the row now' && reduced.phase === null && reduced.copies === 1 && reduced.displayed === 'Checking the row now',
      JSON.stringify(reduced))
    const reducedHeld = wait.reducedHeld || {}
    check('句子不带自己的从句时，站着的那句在该选择下也留在原处',
      reducedHeld.word === 'Checking the row now' && reducedHeld.copies === 1, JSON.stringify(reducedHeld))
    // Reduced presses every skin animation to a hundredth of a millisecond but
    // leaves its iteration count alone, so an animation left running strobes
    // instead of settling: the loader's dots have to be held, and the words'
    // own paint is already either left out under the choice or held by
    // shared/motion.css. Two readings a tenth of a second apart say so.
    const still = wait.reducedStill || {}
    const held = (reading) => reading !== null && reading !== undefined && reading.loader !== undefined &&
      (reading.sweep === 'none' || reading.sweepState === 'paused')
    const stillSame = (one, two) => one !== undefined && one !== null && two !== undefined && two !== null &&
      one.loader !== undefined && two.loader !== undefined &&
      one.loader.translate === two.loader.translate && one.loader.scale === two.loader.scale &&
      held(one) && held(two)
    check('「减弱」时加载点的球停在一个帧上、字上的画法也停住：相隔十分之一秒的两次读数一致',
      stillSame(still.first, still.second),
      JSON.stringify({ first: { loader: still.first?.loader, sweep: still.first?.sweep, sweepState: still.first?.sweepState }, second: { loader: still.second?.loader, sweep: still.second?.sweep, sweepState: still.second?.sweepState } }))
    check('words that settle shorter take the box down with them, so the clock sits right after them',
      reduced.box?.sizer?.text === reduced.word && reduced.box.width === reduced.box.sizer.width &&
        reduced.box.clockLeft - reduced.box.labelLeft - reduced.box.width <= 10,
      JSON.stringify({ word: reduced.word, box: reduced.box }))
    const off = wait.off || {}
    check('a holding row — the slot the host keeps after the turn stops — takes the line back, and a live row gets it again',
      wait.holding.line === false && wait.holding.marked === false &&
        wait.holdingReleased.line === true && wait.holdingReleased.marked === true,
      JSON.stringify({ holding: wait.holding, released: wait.holdingReleased }))
    check('switching the chat-area animations off takes the line down and gives the host\'s words back',
      off.line === false && off.marked === false && off.wordsShown === true && off.wordsMarked === false && off.foreignShown === true,
      JSON.stringify(off))
    // 钉住状态行的是聊天区跟随自己的规则：跟随关掉后宿主自己管位置，这一行留在
    // 文档里随内容走，再打开又钉回输入框上方。
    const pin = wait.pin || {}
    check('状态行的钉住随聊天区跟随的开关：跟随关掉后行留在文档里，再打开又钉回去',
      pin.on?.follow === true && pin.on?.pinned === true &&
        pin.off?.follow === false && pin.off?.pinned === false &&
        pin.back?.follow === true && pin.back?.pinned === true,
      JSON.stringify(pin))
    check('后排入的用户消息或提问卡让状态行回到文档流，行下遮罩同时退场',
      pin.afterMessage?.pinned === false && pin.afterMessage?.mask === null &&
        pin.afterQuestion?.pinned === false && pin.afterQuestion?.mask === null,
      JSON.stringify(pin))
    // 钉住的行把脚下的画布一直铺到输入框顶，宿主在行下沿留出的那条缝里
    // 就不会露出滑动中的正文（chat-wait.css）。
    check('状态行钉住时行下的画布铺到输入框顶，跟随关掉后这块画布随之退场',
      pin.on?.mask?.position === 'absolute' && pin.on.mask.background === pin.on.mask.ink &&
        Number.parseFloat(pin.on.mask.height) >= 17 &&
        pin.off?.mask === null &&
        pin.back?.mask?.position === 'absolute' && pin.back.mask.background === pin.back.mask.ink,
      JSON.stringify(pin))
    const replaced = wait.replaced || {}
    check('replacing the host words transfers their hiding marker without hiding the third-party line',
      replaced.previousMarked === false && replaced.current?.wordsMarked === true && replaced.current?.wordsShown === false &&
        replaced.current?.foreignShown === true, JSON.stringify(replaced))
    check('a running row leaving removes its host words marker', wait.removed?.wordsMarked === false, JSON.stringify(wait.removed))
    for (const name of ['takeover', 'visibleReplacement', 'existingOwner']) {
      const owner = wait[name] || {}
      check(`a visible replacement owns the waiting words (${name}) without disabling the other chat animations`,
        owner.line === false && owner.marked === false && owner.wordsMarked === false &&
          owner.externalHiding === 'none' && owner.foreignShown === true && owner.follow === true,
        JSON.stringify(owner))
    }
    for (const name of ['hiddenReplacement', 'hostRestored', 'ownerRemoved']) {
      const owner = wait[name] || {}
      check(`the waiting line returns when the replacement stops owning the words (${name})`,
        owner.line === true && owner.marked === true && owner.wordsMarked === true, JSON.stringify(owner))
    }
  },
}
