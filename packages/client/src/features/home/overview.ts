import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { formatHomeCount, homeShortDate, homeShortDateFormat } from './data'
import type { HeatCell, HomePanel } from './data'
import { formatCompactTokens } from '../../shared/format'
import { tooltipAnchor } from '../../shared/host-tooltip'
import { HEAT_CELL_SELECTOR, HEAT_HINT_CLASS, HEAT_HINT_TEXT_CLASS, hideHeatTip, showHeatTip } from './heat-tip'
import { POINTER_HINT_CLASS } from '../../shared/pointer-hint'
import { copy } from './copy'

/**
 * The panel's Overview tab: the six stat cells, the heat grid, and Claude
 * Code's yardstick line.
 *
 * The frame is drawn before any number arrives — the cells keep their
 * geometry and show a skeleton — so the page never shifts under the pointer
 * when the roll-up lands. A figure the source cannot answer is a dash, not a
 * zero and not a skeleton: the skeleton means "still loading", which a
 * missing figure is not.
 *
 * The day tip is one element the grid carries (heat-tip.ts): the pointer names a
 * day and the same pill moves to it, so a crossing swaps one word rather than
 * one box.
 *
 * @returns `{ view(data) }`, where `data` is `homePanelData`'s answer.
 */
export function createHomeOverview() {
  function statCell(key: string, label: string, text: string, skeleton: boolean) {
    const value = React.createElement('span', { className: 'dsh-claude-home-stat-value' }, skeleton ? '' : text)
    return React.createElement(
      'div',
      { key, className: 'dsh-claude-home-stat', 'data-stat': key, 'data-skeleton': skeleton ? '' : undefined },
      React.createElement('span', { className: 'dsh-claude-home-stat-label' }, label),
      // 缩短过的数字（12.3k）在悬停时给出原值：提示是宿主自己的那一份，
      // 与页面上其他控件同一个样式。
      skeleton ? value : React.createElement(primitives.Tooltip, { label: text, side: 'bottom', portal: true, children: tooltipAnchor(value) }),
    )
  }

  /**
   * A heat cell's tip: the day and the tokens that day spent, "Sep 9 —
   * 15.9k tokens". Both sources behind the grid carry a per-day token total,
   * so every cell reads the same figure the cell's own heat is bucketed from.
   */
  function heatTip(format: Intl.DateTimeFormat, cell: HeatCell) {
    return copy('homeHeatTipTokens', {
      date: homeShortDate(format, cell.date),
      tokens: formatCompactTokens(cell.tokens),
    })
  }

  function view(data: HomePanel) {
    const skeleton = !data.known
    const format = homeShortDateFormat()
    const sessions = data.sessions === null ? '—' : formatHomeCount(data.sessions)
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(
        'div',
        { className: 'dsh-claude-home-stats' },
        statCell('sessions', copy('homeSessions'), sessions, skeleton),
        statCell('calls', copy('homeCalls'), data.calls === null ? '—' : formatHomeCount(data.calls), skeleton),
        statCell('tokens', copy('homeTokens'), formatCompactTokens(data.tokens), skeleton),
        statCell('days', copy('homeActiveDays'), data.activeDays === null ? '—' : formatHomeCount(data.activeDays), skeleton),
        statCell('peak', copy('homePeakHour'), data.peakHour === null ? '—' : data.peakHour, skeleton),
        statCell('model', copy('homeTopModel'), data.model === null ? '—' : data.model, skeleton),
      ),
      React.createElement(
        'div',
        {
          className: 'dsh-claude-home-heat',
          'data-skeleton': data.known ? undefined : '',
          // The pill is wider than a cell and the gutters between cells are the
          // grid's own, so the pointer is followed on the grid: a crossing names
          // the next day in the pill already standing, and leaving takes it away.
          // Neither gesture builds or drops an element (heat-tip.ts).
          onMouseOver(event: React.MouseEvent<HTMLDivElement>) {
            const cell = (event.target as HTMLElement).closest?.(HEAT_CELL_SELECTOR)
            if (cell instanceof HTMLElement) showHeatTip(cell, event.currentTarget)
          },
          onMouseLeave(event: React.MouseEvent<HTMLDivElement>) {
            hideHeatTip(event.currentTarget)
          },
        },
        data.grid.cells.map(cell => {
          const tip = skeleton ? undefined : heatTip(format, cell)
          return React.createElement('span', {
            key: cell.date,
            className: 'dsh-claude-home-heat-cell',
            'data-level': cell.level,
            'data-tip': tip,
            'aria-label': tip,
          })
        }),
        // The panel's one day tip: its words are rewritten in place (heat-tip.ts).
        React.createElement(
          'span',
          { className: `${HEAT_HINT_CLASS} ${POINTER_HINT_CLASS}`, 'aria-hidden': 'true' },
          React.createElement('span', { className: HEAT_HINT_TEXT_CLASS }),
        ),
      ),
      data.fun === null ? null : React.createElement('span', { className: 'dsh-claude-home-fun' }, data.fun),
    )
  }

  return { view }
}
