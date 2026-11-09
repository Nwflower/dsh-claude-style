import * as React from 'react'
import { HOME_MODEL_ROWS, formatHomeCount, homeShortDate, homeShortDateFormat } from './data'
import type { HomeModel, HomePanel } from './data'
import { formatCompactTokens } from '../../shared/format'
import { inPagePixels, pageZoomFactor } from '../../shared/page-zoom'
import { homeChartTicks } from './chart-axis'
import { copy } from './copy'

/**
 * Widths a date label has been measured at, by the face they were measured in.
 *
 * A month's axis asks for thirty dates, and a reader who leaves the tab and
 * comes back asks for the same thirty: a width is measured once per face and
 * read from here afterwards. The face carries the font the stylesheet set, the
 * page's own scale and whether the web fonts have landed, because any of the
 * three moves a label's width.
 */
const measuredLabels = new Map<string, number>()

/** How many widths the cache keeps before it starts over. */
const MEASURED_LABEL_LIMIT = 4096

/** The face a label is drawn in, as the key its width is filed under. */
function labelFace(sample: HTMLElement) {
  const style = getComputedStyle(sample)
  return [
    style.fontFamily,
    style.fontSize,
    style.fontWeight,
    style.fontStyle,
    style.letterSpacing,
    pageZoomFactor(),
    document.fonts.status,
  ].join('\u0000')
}

/**
 * Every label's width, in the axis's own pixels.
 *
 * A width is measured by laying the word out and reading its box, so the words a
 * face has not seen yet go into one hidden holder together: the first read lays
 * the holder out once and the rest measure it. Writing the sample and reading it
 * once per word instead forced one layout per label, and with the skin's
 * stylesheet a layout is the expensive half of the tab switch.
 */
function measureLabels(axis: HTMLElement, face: string, labels: string[]) {
  const widths: (number | undefined)[] = labels.map(text => measuredLabels.get(`${face}\u0000${text}`))
  if (widths.every(width => width !== undefined)) return widths as number[]
  const holder = document.createElement('span')
  holder.setAttribute('aria-hidden', 'true')
  holder.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;white-space:pre'
  const nodes = labels.map((text, at) => {
    if (widths[at] !== undefined) return null
    const node = document.createElement('span')
    node.className = 'dsh-claude-home-chart-label'
    // The label's own place in the axis is absolute; the holder lays its copy
    // out in one line so the words measure side by side.
    node.style.position = 'static'
    node.style.display = 'inline-block'
    node.textContent = text
    holder.appendChild(node)
    return node
  })
  axis.appendChild(holder)
  const boxed = nodes.map(node => node === null ? null : inPagePixels(node.getBoundingClientRect().width))
  holder.remove()
  for (let at = 0; at < boxed.length; at += 1) {
    const measured = boxed[at]
    if (measured === null || measured === undefined) continue
    if (measuredLabels.size >= MEASURED_LABEL_LIMIT) measuredLabels.clear()
    measuredLabels.set(`${face}\u0000${labels[at]}`, measured)
    widths[at] = measured
  }
  return widths as number[]
}

/**
 * The Models tab's chart: a per-day stacked chart over a ranked list of the
 * models that spent those tokens.
 *
 * The chart stacks each day's per-model totals (the ledger's per-provider
 * split, or the fold's route attribution when the event names one), so a model's
 * colour is its rank in the list below: the biggest spender is the darkest
 * blue, the ramp walks down to grey, and the list's swatches repeat it. A day
 * whose samples are all unattributed draws no stack.
 *
 * The list is a rank, a name, the input and output sides of its tokens, and
 * its share of the models shown; past HOME_MODEL_ROWS rows it folds behind
 * one "show more" row, the way Claude Code's does, and the open list ends in
 * a "show less" row that folds it back. The chart keeps its own
 * HOME_CHART_DAYS window while the list follows the range pills, which is the
 * same split the Overview tab's heat grid already uses.
 *
 * The date axis is thinned to the panel's own width (chart-axis.ts): the
 * newest day keeps its date, labels step back from it by whole days, and a
 * label that would collide is left out. Each column grows from the axis when
 * its window arrives, and a refresh of the same window leaves the bars still.
 *
 * @returns `{ component }`, a React component taking `{ data }`.
 */
export function createHomeModels() {
  /** One decimal of a percentage, as Claude Code writes it: "43.0%". */
  function share(part: number, whole: number) {
    return whole > 0 ? `${(Math.round(part / whole * 1000) / 10).toFixed(1)}%` : '—'
  }

  /** The axis top: the peak rounded up to one significant step. */
  function axisMax(peak: number) {
    if (!(peak > 0)) return 0
    const magnitude = Math.pow(10, Math.floor(Math.log(peak) / Math.LN10))
    const scaled = peak / magnitude
    const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10
    return step * magnitude
  }

  /** The four buckets' two sides, as the list writes them. */
  function sides(entry: HomeModel) {
    return {
      input: (entry.input || 0) + (entry.cacheRead || 0) + (entry.cacheWrite || 0),
      output: entry.output || 0,
    }
  }

  /** Whether the source carried the four buckets, or only one total. */
  function hasSplit(entry: HomeModel) {
    return entry.input !== undefined || entry.output !== undefined
      || entry.cacheRead !== undefined || entry.cacheWrite !== undefined
  }

  /** The palette's last step, for a model the ranked list does not carry. */
  const RANK_LAST = 7

  /**
   * The chart frame. The date axis cannot know which days keep a label until
   * it knows how much room a day has, so the plot is measured once and again
   * on every width change, and the label's face comes from a hidden sample,
   * so the measurement follows the stylesheet.
   */
  function Chart(props: { columns: HomePanel['modelDays'], rankOf: Record<string, number>, skeleton: boolean }) {
    const list = props.columns === null ? [] : props.columns
    const skeleton = props.skeleton
    const plotRef = React.useRef<HTMLDivElement>(null)
    const sampleRef = React.useRef<HTMLSpanElement>(null)
    const [box, setBox] = React.useState<{ key: string, width: number, widths: number[] } | null>(null)
    const format = homeShortDateFormat()
    const labels = list.map(column => homeShortDate(format, column.date))
    const labelsKey = labels.join('\u0000')
    React.useLayoutEffect(() => {
      const plot = plotRef.current
      const sample = sampleRef.current
      if (plot === null || sample === null) return undefined
      let stopped = false
      const sync = () => {
        if (stopped) return
        const width = plot.clientWidth
        const axis = sample.parentElement
        if (axis === null) return
        const widths = measureLabels(axis, labelFace(sample), labels)
        setBox(held => held !== null && held.key === labelsKey && held.width === width
          && held.widths.length === widths.length
          && held.widths.every((one, at) => one === widths[at]) ? held : { key: labelsKey, width, widths })
      }
      sync()
      const watcher = new ResizeObserver(sync)
      watcher.observe(plot)
      // A web font landing after the first paint changes every label's width.
      void document.fonts.ready.then(sync)
      return () => {
        stopped = true
        watcher.disconnect()
      }
    }, [labelsKey])
    let peak = 0
    for (let c = 0; c < list.length; c++) {
      let total = 0
      const models = list[c].models
      for (const id in models) total += models[id]
      if (total > peak) peak = total
    }
    const top = axisMax(peak)
    const ticks = box === null || box.key !== labelsKey || skeleton || top === 0 ? [] : homeChartTicks(box.widths, box.width)
    // Four gridlines plus the baseline, Claude Code's own ladder.
    const gridlines = [1, 0.75, 0.5, 0.25, 0]
    // A new window is a new column set, so the growth runs for it; the same
    // window refreshed in place keeps its bars still.
    const windowKey = `${list.length}:${list.length > 0 ? list[0].date : ''}`
    return React.createElement(
      'div',
      { className: 'dsh-claude-home-chart', 'data-skeleton': skeleton ? '' : undefined },
      React.createElement(
        'div',
        { className: 'dsh-claude-home-chart-plot', ref: plotRef },
        gridlines.map(at => React.createElement(
          'span',
          { key: at, className: 'dsh-claude-home-chart-tick', style: { bottom: `${at * 100}%` } },
          skeleton || top === 0 ? '' : formatCompactTokens(top * at),
        )),
        React.createElement(
          'div',
          { key: windowKey, className: 'dsh-claude-home-chart-bars' },
          list.map(column => {
            let dayTotal = 0
            const stack: { id: string, tokens: number, rank: number }[] = []
            const models = column.models
            for (const id in models) {
              dayTotal += models[id]
              const rank = props.rankOf[id]
              stack.push({ id, tokens: models[id], rank: rank === undefined ? Number.MAX_VALUE : rank })
            }
            // Biggest first, so the darkest slice sits on the axis.
            stack.sort((left, right) => left.rank - right.rank)
            // The column is the day's whole stack, sized against the axis top,
            // and each slice is its share of the day: both percentages then
            // resolve against a definite height, and the column's rounding
            // lands on the top of the stack.
            return React.createElement(
              'span',
              {
                key: column.date,
                className: 'dsh-claude-home-chart-col',
                title: `${homeShortDate(format, column.date)} · ${formatCompactTokens(dayTotal)}`,
                style: { height: `${top > 0 ? dayTotal / top * 100 : 0}%` },
              },
              stack.map(slice => React.createElement('span', {
                key: slice.id,
                className: 'dsh-claude-home-chart-seg',
                'data-rank': Math.min(slice.rank, RANK_LAST),
                style: { height: `${dayTotal > 0 ? slice.tokens / dayTotal * 100 : 0}%` },
              })),
            )
          }),
        ),
      ),
      React.createElement(
        'div',
        { className: 'dsh-claude-home-chart-axis' },
        // The face the dates are set in, measured but never drawn.
        React.createElement('span', {
          ref: sampleRef,
          className: 'dsh-claude-home-chart-label dsh-claude-home-chart-label-sample',
          'aria-hidden': 'true',
        }),
        ticks.map(tick => React.createElement(
          'span',
          {
            key: list[tick.index].date,
            className: 'dsh-claude-home-chart-label',
            style: { left: `${tick.left}px` },
          },
          labels[tick.index],
        )),
      ),
    )
  }

  function ModelsView(props: { data: HomePanel }) {
    const data = props.data
    const more = React.useState(false)
    const expanded = more[0]
    const setExpanded = more[1]
    const models = data.models
    const columns = data.modelDays
    const skeleton = !data.known
    if (models === null || models.length === 0) {
      if (data.listed !== null || !skeleton) {
        return React.createElement('div', { className: 'dsh-claude-home-models-empty' }, copy('homeModelsEmpty'))
      }
      return React.createElement(
        React.Fragment,
        null,
        // The frame comes first, so the chart's height is reserved from the
        // first paint and the list does not jump when the numbers land.
        React.createElement(Chart, { columns: null, rankOf: {}, skeleton: true }),
        React.createElement(
          'div',
          { className: 'dsh-claude-home-models', 'data-skeleton': '' },
          [0, 1, 2].map(index => React.createElement(
            'div',
            { key: index, className: 'dsh-claude-home-model' },
            React.createElement('span', { className: 'dsh-claude-home-model-swatch' }),
            React.createElement('span', { className: 'dsh-claude-home-model-name' }, ''),
            React.createElement('span', { className: 'dsh-claude-home-model-split' }, ''),
            React.createElement('span', { className: 'dsh-claude-home-model-share' }, ''),
          )),
        ),
      )
    }
    let total = 0
    const rankOf: Record<string, number> = {}
    for (let i = 0; i < models.length; i++) {
      total += models[i].tokens
      rankOf[models[i].id] = i
    }
    const shown = expanded ? models : models.slice(0, HOME_MODEL_ROWS)
    const hidden = models.length - shown.length
    return React.createElement(
      React.Fragment,
      null,
      columns === null && !skeleton ? null : React.createElement(Chart, { columns, rankOf, skeleton }),
      React.createElement(
        'div',
        { className: 'dsh-claude-home-models' },
        shown.map((entry, rank) => {
          const parts = sides(entry)
          return React.createElement(
            'div',
            {
              key: entry.id,
              className: 'dsh-claude-home-model',
              title: entry.sessions === undefined
                ? entry.id
                : `${entry.id} · ${copy('homeModelSessions', { count: formatHomeCount(entry.sessions) })}`,
            },
            React.createElement('span', { className: 'dsh-claude-home-model-swatch', 'data-rank': Math.min(rank, RANK_LAST) }),
            React.createElement('span', { className: 'dsh-claude-home-model-name' }, entry.id),
            React.createElement(
              'span',
              { className: 'dsh-claude-home-model-split' },
              hasSplit(entry)
                ? `${formatCompactTokens(parts.input)} in · ${formatCompactTokens(parts.output)} out`
                : formatCompactTokens(entry.tokens),
            ),
            React.createElement('span', { className: 'dsh-claude-home-model-share' }, share(entry.tokens, total)),
          )
        }),
        // The fold row turns into its own undo once the list is open.
        models.length <= HOME_MODEL_ROWS ? null : React.createElement(
          'button',
          {
            type: 'button',
            className: 'dsh-claude-home-models-more',
            'aria-expanded': expanded,
            onClick() { setExpanded(!expanded) },
          },
          expanded
            ? copy('homeModelsLess')
            : copy('homeModelsMore', { count: hidden }),
        ),
      ),
    )
  }

  return { component: ModelsView }
}
