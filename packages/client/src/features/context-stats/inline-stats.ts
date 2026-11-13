import { QUIET_ATTR, STATS_POSITION_FOOTER } from '../../constants'
import { readPrefs } from '../../core/prefs'
import { buildElement, setAttributeIfChanged, writeTextInPlace } from '@dsh-claude-style/engine/dom'
import { findComposerCard, findComposerStats } from '@dsh-claude-style/engine/host'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { formatCompactTokens } from '../../shared/format'
import { inPageBox, inPagePixels } from '../../shared/page-zoom'
import { createStatsCount } from './stats-count'
import { createFooterLayout, findStatsDock } from './footer-layout'
import { CACHE_HIT_STOPS, rampPosition, writeRamp } from './stats-ramp'
import { sessionStatsCacheHit, sessionStatsDuration, sessionStatsGrouped, sessionStatsSpeed } from '../../shared/stats-format'
import { formatMoneyMicro, CURRENCY_CNY, CURRENCY_SYMBOL } from '@dsh-claude-style/contracts/prices'
import type { Currency } from '@dsh-claude-style/contracts/prices'
import type { HostSessionStatsProjection, HostTokenUsageProjection } from '@dsh-claude-style/contracts/services'
import type { HostText } from '@dsh-claude-style/engine/host'
import type { StatsReading } from './stats-count'

/**
 * The session's numbers on a line of their own under the composer, for the
 * `inline` position of the `statsPosition` setting: the host's own words around
 * the host's own figures, none of the host's row's glyphs, and the context meter
 * the host draws at that line's end. The figures are plain text, and a reading
 * that moves counts to its new value (stats-count.ts): while an answer streams
 * the readings arrive back to back, and an entrance on every one would churn
 * the line for numbers that barely moved. The cache share's figure and the
 * percent sign after it take the colour band the ramp names while the label
 * before them keeps the line's own tone.
 *
 * The host's statistics row stays in the document, hidden, because the panel
 * reads the 「性能与用量」 level off its structure. The words come from the
 * host's own `chat` templates with each number swapped for a marker, so every
 * number stays its own figure. A line too wide for its card drops figures one
 * step at a time and never changes height, or the conversation above it would
 * jump with every step.
 *
 * The contract is the host's projection keys, `chat` keys and the statistics
 * row's structure: a host that reshapes the row leaves the figures absent
 * without an error. A host panel or slot for these figures retires this line.
 */

/** The mark on the line itself. */
export const INLINE_STATS_ATTR = 'data-dsh-claude-inline-stats'
/** On the line's measuring twin, which a fit lays out of flow for one reading. */
export const INLINE_PROBE_ATTR = 'data-dsh-claude-inline-probe'
/** On the compact footer's line: which detail step it is showing. */
const FOOTER_DETAIL_ATTR = 'data-dsh-claude-footer-detail'
/**
 * On the meter while the line has given up its own reading: the ring stands,
 * the number beside it goes (the ladder's third step).
 */
export const METER_TIGHT_ATTR = 'data-dsh-claude-meter-tight'
/** Stands in for one number while a template is split into its words. */
const MARK = '\u0001'
/** The last step of the ladder. */
const FIT_MAX = 5
/** Room a step must free up before the line takes the roomier step back. */
const FIT_SLACK_PX = 24

/** One segment of the line: the group of figures the ladder shows or gives up whole. */
interface Segment {
  wrap: HTMLElement
}

/** Every element of the line, in the order it appears. */
interface Line {
  root: HTMLElement
  counts: Segment
  speed: Segment
  ttft: Segment
  input: Segment
  output: Segment
  cost: Segment
  total: Segment
  cache: Segment
  cell: {
    turns: HTMLElement
    between: Text
    steps: HTMLElement
    countsTail: Text
    speed: HTMLElement
    speedTail: Text
    ttftHead: HTMLElement
    ttft: HTMLElement
    input: HTMLElement
    inputTail: Text
    output: HTMLElement
    outputTail: Text
    cost: HTMLElement
    total: HTMLElement
    cacheHead: HTMLElement
    cache: HTMLElement
    cacheTail: HTMLElement
  }
}

/** One figure of the line: its element, and the words its template puts after it. */
function figure(className: string) {
  const group = buildFigure()
  const tail = document.createTextNode('')
  const wrap = buildElement('span', `dsh-claude-inline-figure ${className}`)
  wrap.append(group, tail)
  return { wrap, group, tail }
}

/** One figure's element: plain text a count rewrites in place. */
function buildFigure() {
  return buildElement('span', 'dsh-claude-digit-group')
}

/**
 * One direction arrow: which way the tokens went is said by the figure it
 * stands beside, so the glyph is decorative for a reader.
 */
function arrowSpan(glyph: string) {
  const span = buildElement('span', 'dsh-claude-inline-arrow', glyph)
  span.setAttribute('aria-hidden', 'true')
  return span
}

/** Write a text node only when its words changed. */
function writeText(node: Text, text: string) {
  if (node.data !== text) node.data = text
}

/** The same for the one label that has to be an element, so the ladder can hide it. */
function writeLabel(element: HTMLElement, text: string) {
  if (element.textContent !== text) element.textContent = text
}

/** One template's words, its numbers replaced by MARK and split on them. */
function templateParts(chat: HostText, key: string, names: string[]) {
  const params: Record<string, string> = {}
  for (let i = 0; i < names.length; i++) params[names[i]] = MARK
  return chat(key, params).split(MARK)
}

/**
 * The line's writer.
 *
 * @param read - the whole reading the line writes.
 * @param chatText - the host's `chat` translate seat, or null when it is absent.
 * @param meter - the host's context meter, stamped by the composer pass.
 * @param currency - which price table the cost figure follows.
 * @returns { render, refit, clear, root }.
 */
export function createInlineStats(read: () => StatsReading, chatText: () => HostText | null, meter: () => HTMLElement | null, currency: () => Currency | null) {
  const footer = createFooterLayout(() => fit(true))
  let footerPosition = false
  let line: Line | null = null
  /** The twin a fit measures on, built on the first fit that asks. */
  let probe: Line | null = null
  /** The ladder step in force, and what the last fit measured. */
  let level = 0
  /**
   * The compact footer's detail: a folded total (0), the exact total (1), or
   * the two directions in its place (2). The widest step that fits the toolbar
   * stands.
   */
  let detail = 0
  let fitted = false
  /** The card width the last fit answered for; -1 asks for one. */
  let fittedWidth = -1
  /** The words the fitted step would show, as their character count; -1 asks for a fit. */
  let fittedShape = -1
  /**
   * Until when the line stands as it is though it has no reading.
   *
   * A session switch releases the old projections before the new ones answer,
   * and the host re-renders the row the line stands beside; without this the
   * line is taken off the page for that gap and put back, and everything above
   * it moves twice. The hold keeps the element (and its height) where it is
   * until the new reading arrives or the deadline passes.
   */
  let holdUntil = 0

  /** The figures counting from what the reader sees to the newest reading. */
  const count = createStatsCount((reading: StatsReading) => {
    const chat = chatText()
    if (line !== null && chat !== null) writeLine(line, level, chat, reading.stats, reading.usage, reading.cost, reading.billing, reading.costPending, currency())
  })

  /** Build the line once, in the order its segments appear. */
  function buildLine(): Line {
    const root = buildElement('span', 'dsh-claude-inline-stats')
    root.setAttribute(INLINE_STATS_ATTR, '')
    /** One segment: the group of figures the ladder shows or gives up whole. */
    const segment = (): Segment => {
      const wrap = buildElement('span', 'dsh-claude-inline-seg')
      root.appendChild(wrap)
      return { wrap }
    }

    // The counts, from the one template that carries two numbers.
    const counts = segment()
    const turns = buildFigure()
    const between = document.createTextNode('')
    const steps = buildFigure()
    const countsTail = document.createTextNode('')
    counts.wrap.append(turns, between, steps, countsTail)

    // The output speed, then the tokens read into the prompt beside it.
    const speed = segment()
    const speedFigure = figure('dsh-claude-inline-speed')
    speed.wrap.appendChild(speedFigure.wrap)
    const ttft = segment()
    const ttftHead = buildElement('span', 'dsh-claude-inline-ttft-label')
    const ttftFigure = buildFigure()
    ttft.wrap.append(ttftHead, ttftFigure)
    const input = segment()
    input.wrap.classList.add('dsh-claude-inline-input-segment')
    input.wrap.append(arrowSpan('↑'))
    const inputFigure = figure('dsh-claude-inline-input')
    input.wrap.appendChild(inputFigure.wrap)

    // The tokens written back, then what they have cost so far, then — for the
    // tightest step that still shows figures — one total in their place, and
    // the cache share.
    const output = segment()
    output.wrap.classList.add('dsh-claude-inline-output-segment')
    output.wrap.append(arrowSpan('↓'))
    const outputFigure = figure('dsh-claude-inline-output')
    output.wrap.appendChild(outputFigure.wrap)
    const cost = segment()
    const costFigure = buildElement('span', 'dsh-claude-inline-cost')
    cost.wrap.appendChild(costFigure)
    const total = segment()
    const totalFigure = figure('dsh-claude-inline-total')
    total.wrap.appendChild(totalFigure.wrap)
    const cache = segment()
    cache.wrap.classList.add('dsh-claude-inline-cache-segment')
    const cacheHead = buildElement('span', 'dsh-claude-inline-label')
    const cacheFigure = buildFigure()
    // The words the template puts after the number (a percent sign) are an
    // element so the figure's own band can reach them; the label before the
    // number stays on the line's tone.
    const cacheTail = buildElement('span', 'dsh-claude-inline-tail')
    cache.wrap.append(cacheHead, cacheFigure, cacheTail)

    return {
      root,
      counts,
      speed,
      ttft,
      input,
      output,
      cost,
      total,
      cache,
      cell: {
        turns,
        between,
        steps,
        countsTail,
        speed: speedFigure.group,
        speedTail: speedFigure.tail,
        ttftHead,
        ttft: ttftFigure,
        input: inputFigure.group,
        inputTail: inputFigure.tail,
        output: outputFigure.group,
        outputTail: outputFigure.tail,
        cost: costFigure,
        total: totalFigure.group,
        cacheHead,
        cache: cacheFigure,
        cacheTail,
      },
    }
  }

  /** Put the line back where it belongs when the host re-rendered that area. */
  function place(root: HTMLElement) {
    const row = findComposerStats()
    if (row === null || row.parentElement === null) return false
    const dock = readPrefs().statsPosition === STATS_POSITION_FOOTER ? findStatsDock() : null
    if (dock !== null) {
      if (root.parentElement !== dock) dock.insertBefore(root, dock.firstChild)
    } else if (root.parentElement !== row.parentElement) row.parentElement.insertBefore(root, row)
    footer.sync(root)
    return true
  }

  /** Take the line off the page, and the meter's step with it. */
  /**
   * Fit again after a viewport or composer change. The change arrives in a
   * write phase, where reading the card's width forces the page's layout under
   * every write before it, so the width is read in the next frame's read phase
   * and only a new width measures the line again (D40).
   */
  let cancelRefit: (() => void) | null = null
  function refit() {
    if (cancelRefit !== null) return
    let width = -1
    cancelRefit = requestFrame({
      read() {
        const card = findComposerCard()
        width = card === null ? -1 : card.clientWidth
      },
      write() {
        cancelRefit = null
        if (width >= 0) fit(false, width)
      },
    })
  }

  function clear() {
    footer.clear()
    cancelRefit?.()
    cancelRefit = null
    count.reset()
    // The measuring twin survives every fit, but follows no removed line.
    if (probe !== null && probe.root.parentElement !== null) probe.root.remove()
    if (line !== null && line.root.parentElement !== null) line.root.parentElement.removeChild(line.root)
    const hostMeter = meter()
    if (hostMeter !== null) hostMeter.removeAttribute(METER_TIGHT_ATTR)
    level = 0
    detail = 0
    fitted = false
    fittedWidth = -1
    fittedShape = -1
  }

  function show(segment: Segment, on: boolean) {
    segment.wrap.hidden = !on
  }

  /** Every figure that has data, in the words the host's templates give it, on ladder step `at`. */
  function writeLine(shown: Line, at: number, chat: HostText, stats: HostSessionStatsProjection | null, usage: HostTokenUsageProjection | null, cost: number | null, billing: boolean, costPending: boolean, currency: Currency | null, footerAt = detail) {
    const counts = stats === null ? null : templateParts(chat, 'stats.counts', ['turns', 'steps'])
    const speedParts = templateParts(chat, 'message.tokensPerSecond', ['tps'])
    const tokenParts = templateParts(chat, 'message.turnUsage.count', ['count'])
    const cacheParts = templateParts(chat, 'stats.cacheHit', ['percent'])
    const billed = usage === null ? 0 : usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
    // A count in flight feeds this writer fractions of a reading; the reader
    // sees the whole numbers the host's own formatters produce.
    const hit = usage === null ? null : sessionStatsCacheHit(Math.round(usage.cacheReadTokens), Math.round(billed))
    const hasCounts = stats !== null && (stats.turns > 0 || stats.steps > 0)
    const hasSpeed = stats !== null && stats.decodeMs > 0
    // The prompt's tokens are known only once a request has settled; the
    // written-back side can stand alone while the first answer streams, on the
    // estimate the stream carries (stream-estimate.ts).
    const hasInput = usage !== null && billed > 0
    const hasOutput = usage !== null && usage.outputTokens > 0
    const hasTokens = hasInput || hasOutput
    const hasCache = hasInput && hit !== null
    const hasTtft = stats !== null && stats.ttftSteps > 0
    const merged = at >= 4
    const prefs = readPrefs()
    const footerMode = prefs.statsPosition === STATS_POSITION_FOOTER
    if (!hasCounts && !hasSpeed && !hasTokens && !(footerMode && hasTtft)) return
    if (footerMode) {
      setAttributeIfChanged(shown.root, FOOTER_DETAIL_ATTR, footerAt === 0 ? 'compact' : footerAt === 1 ? 'exact' : 'directions')
    } else if (shown.root.hasAttribute(FOOTER_DETAIL_ATTR)) {
      shown.root.removeAttribute(FOOTER_DETAIL_ATTR)
    }
    const directions = footerMode && footerAt >= 2
    show(shown.counts, !footerMode && hasCounts && at < 2)
    show(shown.speed, footerMode ? prefs.statsFooterSpeed && hasSpeed : hasSpeed)
    show(shown.ttft, footerMode && prefs.statsFooterTtft && hasTtft)
    // The prompt tokens ride where the speed is; without a speed the room the
    // speed would have taken is theirs.
    show(shown.input, footerMode ? prefs.statsFooterTotal && directions && hasInput : hasInput && !merged)
    show(shown.output, footerMode ? prefs.statsFooterTotal && directions && hasOutput : hasOutput && !merged)
    // The cost stands beside the written-back figure until the ladder needs
    // its room for the total. It stands whenever the line has tokens and the
    // reader keeps billing on, with the currency's dash while the figure is
    // still coming (a switch): the toolbar's placement keeps the segment's
    // measure, so the figures after it hold their places. A route the price
    // table cannot price has nothing to wait for, and the segment goes.
    show(shown.cost, (!footerMode || prefs.statsFooterCost) && billing && hasTokens && (cost !== null || costPending) && at < 3)
    // The compact footer carries one token total while its room is narrow, and
    // gives that segment up for the two directions on the widest footer step.
    show(shown.total, footerMode ? prefs.statsFooterTotal && footerAt < 2 && hasTokens : hasTokens && merged)
    show(shown.cache, (!footerMode || prefs.statsFooterCache) && hasCache)
    // The compact footer's cache figure carries its own percent sign alone: the
    // words before it would outweigh the figures beside them.
    shown.cell.cacheHead.hidden = footerMode || at >= 1

    if (hasCounts && counts !== null && stats !== null) {
      writeTextInPlace(shown.cell.turns, String(Math.round(stats.turns)))
      writeText(shown.cell.between, counts[1] ?? '')
      writeTextInPlace(shown.cell.steps, String(Math.round(stats.steps)))
      writeText(shown.cell.countsTail, counts[2] ?? '')
    }
    if (hasSpeed && stats !== null) {
      writeTextInPlace(shown.cell.speed, sessionStatsSpeed(stats.decodeTokens / (stats.decodeMs / 1_000)))
      writeText(shown.cell.speedTail, speedParts[1] ?? '')
    }
    if (hasTtft && stats !== null) {
      writeLabel(shown.cell.ttftHead, chat('stats.dialog.ttft'))
      writeTextInPlace(shown.cell.ttft, sessionStatsDuration(stats.ttftMs / stats.ttftSteps, chat))
    }
    if (hasTokens && usage !== null) {
      // Every token figure folds into k / M / B at the ladder's last step. The
      // compact footer's one total wears that folded shape and its unit from the
      // first character.
      const readTokens = (value: number) => at >= FIT_MAX ? formatCompactTokens(Math.round(value)) : sessionStatsGrouped(Math.round(value), chat)
      const total = billed + usage.outputTokens
      writeTextInPlace(shown.cell.input, readTokens(billed))
      writeText(shown.cell.inputTail, tokenParts[1] ?? '')
      writeTextInPlace(shown.cell.output, readTokens(usage.outputTokens))
      writeText(shown.cell.outputTail, tokenParts[1] ?? '')
      writeTextInPlace(shown.cell.total, footerMode
        ? footerAt === 0
          ? `${formatCompactTokens(Math.round(total))}tok`
          : `${sessionStatsGrouped(Math.round(total), chat)}${tokenParts[1] ?? ' tok'}`
        : readTokens(total))
      // A figure that is still coming keeps the segment's place with the
      // currency's own dash; the amount replaces it in the width it needs, and
      // the line fits its figures again for that width. A route the table
      // cannot price has nothing to wait for, so the segment is hidden and no
      // dash is written. With billing off neither is written.
      if (billing && (cost !== null || costPending)) {
        const cur = currency ?? CURRENCY_CNY
        const known = cost !== null && cost > 0
        writeTextInPlace(shown.cell.cost, known ? formatMoneyMicro(cost, cur) : `${CURRENCY_SYMBOL[cur]}\u2014`)
        shown.cell.cost.toggleAttribute('data-pending', !known)
      }
      writeLabel(shown.cell.cacheHead, cacheParts[0] ?? '')
      if (hit !== null) writeTextInPlace(shown.cell.cache, hit)
      writeLabel(shown.cell.cacheTail, cacheParts[1] ?? '')
      writeRamp(shown.cache.wrap, 'cache', hit === null ? null : rampPosition(Number(hit), CACHE_HIT_STOPS))
    }
  }

  /**
   * How much room a line `width` px wide takes together with the meter. The
   * meter sits beside the shown line while there is room and drops below it
   * when there is not, so the shape is read off the shown line: side by side
   * the line and everything up to the meter's right edge have to fit, one above
   * the other the wider of the two does.
   */
  function neededWidth(shown: Line, width: number) {
    // Both boxes and the width against them in the pixels the card's own width
    // is given in (shared/page-zoom.ts).
    const lineBox = inPageBox(shown.root.getBoundingClientRect())
    const hostMeter = meter()
    if (hostMeter === null) return width
    const meterBox = inPageBox(hostMeter.getBoundingClientRect())
    const beside = Math.abs(meterBox.top - lineBox.top) < lineBox.height
    return beside ? width + meterBox.right - lineBox.right : Math.max(width, meterBox.width)
  }

  /** The meter's shape on ladder step `at`: it gives up its reading at the third. */
  function tightenMeter(at: number) {
    const hostMeter = meter()
    if (hostMeter !== null) hostMeter.toggleAttribute(METER_TIGHT_ATTR, at >= 3)
  }

  /** Put the line on one rung of the ladder. */
  function setLevel(next: number) {
    level = next
    tightenMeter(next)
  }

  /** The twin a fit measures on, built and marked on first use. */
  function ensureProbe() {
    if (probe === null) {
      probe = buildLine()
      // The probe shares the line's class and styles, but is not a second public line.
      probe.root.removeAttribute(INLINE_STATS_ATTR)
      probe.root.setAttribute(INLINE_PROBE_ATTR, '')
      // Its coming and going is no page change for the scheduler (D40).
      probe.root.setAttribute(QUIET_ATTR, '')
      probe.root.setAttribute('aria-hidden', 'true')
    }
    return probe
  }

  /** Keep the out-of-flow twin beside the shown line, moving it only when that line moves. */
  function mountProbe(shown: Line) {
    const twin = ensureProbe()
    if (twin.root.parentElement !== shown.root.parentElement) shown.root.before(twin.root)
    return twin
  }

  /**
   * The words the line would show for one reading on the step in force, as
   * their character count. The figures use tabular numerals, so the width
   * follows the number of characters: a reading whose words have not grown
   * needs no new measurement. The estimate behind the written-back figure moves
   * every frame while an answer streams, and a fit per frame would keep forcing
   * layout under the composer.
   */
  function lineShape(reading: StatsReading, chat: HostText) {
    const twin = ensureProbe()
    writeLine(twin, level, chat, reading.stats, reading.usage, reading.cost, reading.billing, reading.costPending, currency())
    let length = 0
    for (let i = 0; i < twin.root.children.length; i++) {
      const segment = twin.root.children[i] as HTMLElement
      if (!segment.hidden) length += (segment.textContent ?? '').length
    }
    return length
  }

  /**
   * How much room ladder step `at` would take, written with the reading the
   * count is moving to and read off the twin. The twin stands out of flow beside
   * the shown line and stays out of flow between readings: the shown line keeps
   * the numbers it is showing, and the room is measured for
   * the ones the count is heading for, so the step the line stops on fits before
   * the figures get there. The meter takes the step's shape for the reading and
   * gets the line's back after it.
   */
  function probeWidth(shown: Line, at: number, chat: HostText, reading: StatsReading) {
    const twin = mountProbe(shown)
    writeLine(twin, at, chat, reading.stats, reading.usage, reading.cost, reading.billing, reading.costPending, currency())
    tightenMeter(at)
    const needed = neededWidth(shown, inPagePixels(twin.root.getBoundingClientRect().width))
    tightenMeter(level)
    return needed
  }

  /** The width a compact footer detail step takes, read off the same twin. */
  function probeFooterWidth(shown: Line, footerAt: number, chat: HostText, reading: StatsReading) {
    const twin = mountProbe(shown)
    writeLine(twin, 0, chat, reading.stats, reading.usage, reading.cost, reading.billing, reading.costPending, currency(), footerAt)
    return inPagePixels(twin.root.getBoundingClientRect().width)
  }

  /**
   * Shorten the line until it fits the card it stands under, or, when it
   * already fits, give back every step whose roomier shape fits with
   * FIT_SLACK_PX to spare. Both walks measure the twin, which carries the
   * reading the count is moving to: the figures on show may still be counting
   * up to it. Both walks end at a ladder end, so a card too narrow for the last
   * step leaves the line on it.
   *
   * @param force - measure again even when the card has not changed width:
   *     the render path passes it, a scroll does not, so scrolling a card of
   *     one width stops paying for the twin probes.
   * @param width - the card's width, when a read phase already took it.
   */
  function fit(force = false, width?: number) {
    const shown = line
    if (shown === null || shown.root.parentElement === null) return level
    const card = findComposerCard()
    const chat = chatText()
    const goal = count.goal()
    if (card === null || chat === null || goal === null) return level
    if (footerPosition) {
      setLevel(0)
      const room = footer.room()
      detail = 0
      if (room !== null) {
        for (const candidate of [2, 1]) {
          if (probeFooterWidth(shown, candidate, chat, goal) <= room) {
            detail = candidate
            break
          }
        }
      }
      const displayed = count.current()
      writeLine(shown, 0, chat, displayed.stats, displayed.usage, displayed.cost, displayed.billing, displayed.costPending, currency(), detail)
      fitted = true
      fittedShape = lineShape(goal, chat)
      footer.sync(shown.root)
      return level
    }
    const available = width ?? card.clientWidth
    if (available <= 0) return level
    if (!force && fitted && available === fittedWidth) return level
    fittedWidth = available
    const measure = (at: number) => probeWidth(shown, at, chat, goal)
    if (measure(level) > available) {
      while (level < FIT_MAX && measure(level) > available) setLevel(level + 1)
    } else {
      let roomier = level
      while (roomier > 0 && measure(roomier - 1) + FIT_SLACK_PX <= available) roomier -= 1
      if (roomier !== level) setLevel(roomier)
    }
    // The step that stands is written onto the shown line with the numbers it
    // shows, so the figures that remain are the ones the reader is watching.
    const displayed = count.current()
    writeLine(shown, level, chat, displayed.stats, displayed.usage, displayed.cost, displayed.billing, displayed.costPending, currency())
    fitted = true
    fittedShape = lineShape(goal, chat)
    return level
  }

  /**
   * Write the line from the current projections, then fit it to the card. A
   * render that found the same reading keeps the count it is on and measures
   * nothing: this runs on every projection frame while an answer streams.
   *
   * A reading that moved only within the words the fitted step already shows
   * keeps that step: the estimate behind the written-back figure ticks the
   * number up every frame, and only the change from one character's worth of
   * words to another can change the room the line needs.
   */
  function render() {
    const nextFooter = readPrefs().statsPosition === STATS_POSITION_FOOTER
    if (footerPosition !== nextFooter) {
      footerPosition = nextFooter
      fitted = false
      level = 0
      detail = 0
    }
    const chat = chatText()
    if (chat === null) {
      clear()
      return
    }
    const held = Date.now() < holdUntil && line !== null && line.root.parentElement !== null
    const reading = read()
    if (reading.stats === null && reading.usage === null) {
      // A session switch leaves the reading empty for a moment; the line stands
      // with the figures it had rather than folding the composer's bottom line
      // and unfolding it again.
      if (held) return
      clear()
      return
    }
    if (line === null) line = buildLine()
    if (!place(line.root)) {
      // The host took the row the line stands beside away for its own render.
      // The line is kept until the deadline, then it goes with the row.
      if (held) return
      clear()
      return
    }
    const changed = count.to(reading)
    if (!changed && fitted) return
    const goal = count.goal()
    const shape = goal === null ? -1 : lineShape(goal, chat)
    if (!fitted || shape !== fittedShape) fit(true)
  }

  return {
    render,
    /** Measure again after a viewport or composer change, without rewriting the figures. */
    refit,
    /**
     * Keep the line where it is for a moment though it has no reading.
     *
     * A session switch rebinds the projections and the host re-renders the row
     * beside the line; the count is reset so the new session's figures are
     * written as they are instead of rolling over from the old ones.
     *
     * @param ms - how long the line may stand without a reading.
     */
    hold(ms: number) {
      holdUntil = Date.now() + ms
      count.reset()
    },
    clear,
    /**
     * The line's own element while it stands on the page: the panel's second
     * trigger, which the feature binds to the host's meter (session-stats.ts).
     */
    root() {
      return line === null || line.root.parentElement === null ? null : line.root
    },
  }
}
