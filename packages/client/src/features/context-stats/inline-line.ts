import { FOOTER_TOKEN_UNITS, QUIET_ATTR } from '../../constants'
import { readPrefs } from '../../core/prefs'
import { buildElement, setAttributeIfChanged, writeTextInPlace } from '@dsh-claude-style/engine/dom'
import { formatCompactTokens, formatUnitTokens } from '../../shared/format'
import { CACHE_HIT_STOPS, rampPosition, writeRamp } from './stats-ramp'
import { sessionStatsCacheHit, sessionStatsDuration, sessionStatsGrouped, sessionStatsSpeed, sessionStatsTokenCount } from '../../shared/stats-format'
import { formatMoneyMicro, CURRENCY_CNY, CURRENCY_SYMBOL } from '@dsh-claude-style/contracts/prices'
import type { Currency } from '@dsh-claude-style/contracts/prices'
import type { HostSessionStatsProjection, HostTokenUsageProjection } from '@dsh-claude-style/contracts/services'
import type { HostText } from '@dsh-claude-style/engine/host'

/** The mark on the public statistics line. */
export const INLINE_STATS_ATTR = 'data-dsh-claude-inline-stats'
/** On the line's out-of-flow measuring twin. */
export const INLINE_PROBE_ATTR = 'data-dsh-claude-inline-probe'
/** Which detail step the statistics line is showing: `compact`, `exact`, `directions` or `full`. */
const FOOTER_DETAIL_ATTR = 'data-dsh-claude-footer-detail'
/** Stands in for one number while a host locale template is split into its words. */
const MARK = '\u0001'

/** Detail rungs from tightest (`0`) to roomiest (`3`). */
export type DetailStep = 0 | 1 | 2 | 3

const DETAIL_NAMES: Record<DetailStep, string> = {
  0: 'compact',
  1: 'exact',
  2: 'directions',
  3: 'full',
}

interface Segment {
  wrap: HTMLElement
}

/** Every element of the statistics line, in DOM order. */
export interface Line {
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
    ttft: HTMLElement
    input: HTMLElement
    inputTail: Text
    output: HTMLElement
    outputTail: Text
    cost: HTMLElement
    total: HTMLElement
    totalTail: Text
    cacheHead: HTMLElement
    cache: HTMLElement
    cacheTail: HTMLElement
  }
}

function quietFigure(element: HTMLElement) {
  element.setAttribute(QUIET_ATTR, '')
  return element
}

function buildFigure() {
  return quietFigure(buildElement('span', 'dsh-claude-digit-group'))
}

function figure(className: string) {
  const group = buildFigure()
  const tail = document.createTextNode('')
  const wrap = buildElement('span', `dsh-claude-inline-figure ${className}`)
  wrap.append(group, tail)
  return { wrap, group, tail }
}

function arrowSpan(glyph: string) {
  const span = buildElement('span', 'dsh-claude-inline-arrow', glyph)
  span.setAttribute('aria-hidden', 'true')
  return span
}

function writeText(node: Text, text: string) {
  if (node.data !== text) node.data = text
}

function writeLabel(element: HTMLElement, text: string) {
  if (element.textContent !== text) element.textContent = text
}

function hide(element: HTMLElement, hidden: boolean) {
  if (element.hidden !== hidden) element.hidden = hidden
}

function show(segment: Segment, on: boolean) {
  hide(segment.wrap, !on)
}

function templateParts(chat: HostText, key: string, names: string[]) {
  const params: Record<string, string> = {}
  for (let i = 0; i < names.length; i++) params[names[i]] = MARK
  return chat(key, params).split(MARK)
}

function totalTokensValue(total: number, detail: DetailStep, units: boolean, chat: HostText) {
  const rounded = Math.round(total)
  if (!units) {
    return detail === 0
      ? formatCompactTokens(rounded)
      : sessionStatsGrouped(rounded, chat)
  }
  return formatUnitTokens(rounded)
}

/** Build the statistics line once, in the order its segments stand in the DOM. */
export function buildLine(): Line {
  const root = buildElement('span', 'dsh-claude-inline-stats')
  root.setAttribute(INLINE_STATS_ATTR, '')
  const segment = (): Segment => {
    const wrap = buildElement('span', 'dsh-claude-inline-seg')
    root.appendChild(wrap)
    return { wrap }
  }

  const counts = segment()
  const turns = buildFigure()
  const between = document.createTextNode('')
  const steps = buildFigure()
  const countsTail = document.createTextNode('')
  counts.wrap.append(turns, between, steps, countsTail)

  const speed = segment()
  const speedFigure = figure('dsh-claude-inline-speed')
  speed.wrap.appendChild(speedFigure.wrap)

  const ttft = segment()
  const ttftFigure = buildFigure()
  ttft.wrap.append(document.createTextNode('TTFT '), ttftFigure)

  const input = segment()
  input.wrap.classList.add('dsh-claude-inline-input-segment')
  input.wrap.append(arrowSpan('↑'))
  const inputFigure = figure('dsh-claude-inline-input')
  input.wrap.appendChild(inputFigure.wrap)

  const output = segment()
  output.wrap.classList.add('dsh-claude-inline-output-segment')
  output.wrap.append(arrowSpan('↓'))
  const outputFigure = figure('dsh-claude-inline-output')
  output.wrap.appendChild(outputFigure.wrap)

  const cost = segment()
  const costFigure = quietFigure(buildElement('span', 'dsh-claude-inline-cost'))
  cost.wrap.appendChild(costFigure)

  const total = segment()
  const totalFigure = figure('dsh-claude-inline-total')
  total.wrap.appendChild(totalFigure.wrap)

  const cache = segment()
  cache.wrap.classList.add('dsh-claude-inline-cache-segment')
  const cacheHead = buildElement('span', 'dsh-claude-inline-label')
  const cacheFigure = buildFigure()
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
      ttft: ttftFigure,
      input: inputFigure.group,
      inputTail: inputFigure.tail,
      output: outputFigure.group,
      outputTail: outputFigure.tail,
      cost: costFigure,
      total: totalFigure.group,
      totalTail: totalFigure.tail,
      cacheHead,
      cache: cacheFigure,
      cacheTail,
    },
  }
}

/**
 * Write the enabled session figures onto `shown` at detail rung `detail` (D113):
 * both placements (`footer` and `inline`) share the six figure switches and
 * the token unit choice.
 */
export function writeLine(
  shown: Line,
  detail: DetailStep,
  chat: HostText,
  stats: HostSessionStatsProjection | null,
  usage: HostTokenUsageProjection | null,
  cost: number | null,
  billing: boolean,
  costPending: boolean,
  currency: Currency | null,
) {
  const counts = stats === null ? null : templateParts(chat, 'stats.counts', ['turns', 'steps'])
  const speedParts = templateParts(chat, 'message.tokensPerSecond', ['tps'])
  const tokenParts = templateParts(chat, 'message.turnUsage.count', ['count'])
  const cacheParts = templateParts(chat, 'stats.cacheHit', ['percent'])
  const billed = usage === null ? 0 : usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
  const hit = usage === null ? null : sessionStatsCacheHit(Math.round(usage.cacheReadTokens), Math.round(billed))
  const hasCounts = stats !== null && (stats.turns > 0 || stats.steps > 0)
  const hasSpeed = stats !== null && stats.decodeMs > 0
  const hasTtft = stats !== null && stats.ttftSteps > 0
  const hasInput = usage !== null && billed > 0
  const hasOutput = usage !== null && usage.outputTokens > 0
  const hasTokens = hasInput || hasOutput
  const hasCache = hasInput && hit !== null
  const prefs = readPrefs()

  setAttributeIfChanged(shown.root, FOOTER_DETAIL_ATTR, DETAIL_NAMES[detail])
  const directions = detail >= 2

  show(shown.counts, prefs.statsFooterCounts && hasCounts)
  show(shown.speed, prefs.statsFooterSpeed && hasSpeed)
  show(shown.ttft, prefs.statsFooterTtft && hasTtft)
  show(shown.input, prefs.statsFooterTotal && directions && hasInput)
  show(shown.output, prefs.statsFooterTotal && directions && hasOutput)
  show(shown.cost, prefs.statsFooterCost && billing && hasTokens && (cost !== null || costPending))
  show(shown.total, prefs.statsFooterTotal && !directions && hasTokens)
  show(shown.cache, prefs.statsFooterCache && hasCache)
  // Only the roomiest own-line rung carries the leading label before the cache percentage.
  hide(shown.cell.cacheHead, detail < 3)

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
    writeTextInPlace(shown.cell.ttft, sessionStatsDuration(stats.ttftMs / stats.ttftSteps, chat))
  }
  if (hasTokens && usage !== null) {
    const units = prefs.statsFooterTokenFormat === FOOTER_TOKEN_UNITS
    const readTokens = (value: number) => sessionStatsTokenCount(Math.round(value), chat, units)
    const total = billed + usage.outputTokens
    writeTextInPlace(shown.cell.input, readTokens(billed))
    writeText(shown.cell.inputTail, tokenParts[1] ?? '')
    writeTextInPlace(shown.cell.output, readTokens(usage.outputTokens))
    writeText(shown.cell.outputTail, tokenParts[1] ?? '')
    writeTextInPlace(shown.cell.total, totalTokensValue(total, detail, units, chat))
    writeText(shown.cell.totalTail, tokenParts[1] ?? '')
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
