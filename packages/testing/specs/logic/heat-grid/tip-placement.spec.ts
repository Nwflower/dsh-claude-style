/**
 * A day's tip on the usage panel's heat grid: one pill the grid carries, which
 * names the day the pointer is on, lines up with the grid's edge where the
 * centred pill would hang past it, and hangs under cells in the grid's upper
 * rows. Measured against the stylesheet the panel ships, with the pointer on the
 * cell as the reader puts it there.
 *
 * @capability heat-grid
 * @features home
 * @risk Hovering a day near the panel's edge grows a horizontal scrollbar under the grid, a tip in the top rows covers the stat cells above it, or the panel's own height moves as the pointer crosses the grid.
 */
import { afterEach, expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import {
  HEAT_CELL_SELECTOR, HEAT_HINT_CLASS, HEAT_HINT_SHOWN_ATTR, HEAT_HINT_SIDE_ATTR, HEAT_HINT_TEXT_CLASS, HEAT_TIP_ATTR, HEAT_TIP_GAP,
  HOME_OVERVIEW_SHEET, hideHeatTip, placeHeatTip, showHeatTip,
} from '@dsh-claude-style/client/pure'
import { surfaceAttribute, surfaceClass } from '../../fixtures/surface'

const ROOT = surfaceAttribute('skin.root')
const TIP = surfaceAttribute('home.heat-tip')
const ZOOM = surfaceAttribute('skin.page-zoom')
const COLUMNS = 26
const ROWS = 7
const cleanups: (() => void)[] = []
afterEach(async () => {
  await userEvent.unhover(document.body)
  while (cleanups.length > 0) cleanups.pop()!()
})

/** The usage panel's box holding one 26-week grid whose cells all carry the same tip, under the shipped sheet. */
function mount(options: { short?: boolean } = {}) {
  const sheet = document.createElement('style')
  sheet.textContent = HOME_OVERVIEW_SHEET
  const panel = document.createElement('div')
  panel.style.cssText = 'width:480px;padding:12px;overflow:auto;box-sizing:border-box;margin:120px 40px'
  const grid = document.createElement('div')
  grid.className = surfaceClass('home.heat-grid')
  if (options.short === true) grid.style.height = '24px'
  for (let i = 0; i < COLUMNS * ROWS; i += 1) {
    const cell = document.createElement('span')
    cell.className = surfaceClass('home.heat-cell')
    cell.setAttribute(TIP, '9月29日 — 4.1B Token')
    grid.append(cell)
  }
  const pill = document.createElement('span')
  pill.className = HEAT_HINT_CLASS
  const words = document.createElement('span')
  words.className = HEAT_HINT_TEXT_CLASS
  pill.append(words)
  grid.append(pill)
  panel.append(grid)
  document.head.append(sheet)
  document.body.setAttribute(ROOT, '')
  document.body.append(panel)
  cleanups.push(() => { panel.remove(); sheet.remove(); document.body.removeAttribute(ROOT) })
  return { panel, grid, pill, cells: [...grid.children].filter((child) => child.matches(HEAT_CELL_SELECTOR)) as HTMLElement[] }
}

/** The cell in one row of a column, rows counted from the grid's top. */
const cellAt = (cells: HTMLElement[], column: number, row: number) => cells[column * ROWS + row]!
const overflows = (panel: HTMLElement) => panel.scrollWidth > panel.clientWidth
/** The pill's box in the grid's own coordinates. */
function pillBox(grid: HTMLElement, pill: HTMLElement) {
  const gridBox = grid.getBoundingClientRect()
  const box = pill.getBoundingClientRect()
  return { left: box.left - gridBox.left, right: box.right - gridBox.left, top: box.top - gridBox.top, bottom: box.bottom - gridBox.top }
}

test('the pill names the day under the pointer, in the one element the grid carries', () => {
  const { grid, pill, cells } = mount()
  showHeatTip(cellAt(cells, 12, 3), grid)
  expect(pill.textContent).toBe('9月29日 — 4.1B Token')
  expect(pill.hasAttribute(HEAT_HINT_SHOWN_ATTR)).toBe(true)
  hideHeatTip(grid)
  expect(pill.hasAttribute(HEAT_HINT_SHOWN_ATTR)).toBe(false)
  // The same element answered both gestures: no box was built for the day.
  expect(grid.querySelector(`.${HEAT_HINT_CLASS}`)).toBe(pill)
  expect(grid.querySelectorAll(`.${HEAT_HINT_CLASS}`).length).toBe(1)
})

test('the pointer crossing the gutter between two days moves the one pill on', async () => {
  const { grid, pill, cells } = mount()
  // The grid's middle columns: an outer one has its pill held at the grid's edge,
  // where two neighbouring days name the same place.
  const first = cellAt(cells, 12, 3)
  const second = cellAt(cells, 13, 3)
  await userEvent.hover(first)
  showHeatTip(first, grid)
  const gutter = { x: first.getBoundingClientRect().right + 1.5, y: first.getBoundingClientRect().top + 4 }
  await userEvent.hover(grid, { target: gutter })
  // The pointer stands on the grid's own gutter now, where no cell answers: what
  // stood over the day it left still stands, naming that day.
  expect(pill.hasAttribute(HEAT_HINT_SHOWN_ATTR)).toBe(true)
  expect(pill.textContent).toBe('9月29日 — 4.1B Token')
  showHeatTip(second, grid)
  // One pill, moved on: what stands over the second day is the box that stood over
  // the first, centred on the new cell.
  const box = pill.getBoundingClientRect()
  const cellBox = second.getBoundingClientRect()
  expect(Math.abs(box.left + box.width / 2 - (cellBox.left + cellBox.width / 2))).toBeLessThan(1)
})

test('a cell the centred pill already fits in is named by a centred pill', () => {
  const { grid, pill, cells } = mount()
  const cell = cellAt(cells, 12, 3)
  showHeatTip(cell, grid)
  const box = pill.getBoundingClientRect()
  const placement = placeHeatTip(cell, grid, box.width, box.height)
  const cellBox = cell.getBoundingClientRect()
  expect(placement.left).toBeCloseTo(cellBox.left + cellBox.width / 2 - box.width / 2 - grid.getBoundingClientRect().left, 1)
})

test('the pill keeps its words on its day when the page is drawn at a zoom', () => {
  const { grid, pill, cells } = mount()
  // The inline factor stands in for the rule theme/chrome.css writes from this
  // attribute, which this spec does not load.
  document.body.setAttribute(ZOOM, '1.5')
  document.body.style.zoom = '1.5'
  cleanups.push(() => { document.body.style.zoom = ''; document.body.removeAttribute(ZOOM) })
  const cell = cellAt(cells, 12, 3)
  showHeatTip(cell, grid)
  // The words, not the box around them: a width taken in the viewport's pixels
  // and written back as the page's own leaves the words off their day inside a
  // pill that is still centred (heat-tip.ts).
  const words = pill.firstElementChild!.getBoundingClientRect()
  const cellBox = cell.getBoundingClientRect()
  expect(Math.abs(words.left + words.width / 2 - (cellBox.left + cellBox.width / 2))).toBeLessThan(1.5)
})

test('hovering any day leaves the panel without a horizontal scrollbar', async () => {
  const { panel, grid, pill, cells } = mount()
  let centred = 0
  const gridWidth = grid.getBoundingClientRect().width
  for (let column = 0; column < COLUMNS; column += 1) {
    const cell = cellAt(cells, column, 3)
    await userEvent.hover(cell)
    showHeatTip(cell, grid)
    const box = pill.getBoundingClientRect()
    const placement = placeHeatTip(cell, grid, box.width, box.height)
    if (placement.left > 0 && placement.left + box.width < gridWidth) centred += 1
    // The pill stays inside the grid at both ends of the row.
    const bounds = pillBox(grid, pill)
    expect(bounds.left).toBeGreaterThanOrEqual(-1)
    expect(bounds.right).toBeLessThanOrEqual(gridWidth + 1)
    expect(overflows(panel)).toBe(false)
  }
  // A row whose middle columns are named by the centred pill alone.
  expect(centred).toBeGreaterThan(0)
})

test('hovering every day leaves the panel\'s own height where it was', async () => {
  const { panel, grid, cells } = mount()
  const height = panel.clientHeight
  const scroll = panel.scrollHeight
  for (let column = 0; column < COLUMNS; column += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      const cell = cellAt(cells, column, row)
      await userEvent.hover(cell)
      showHeatTip(cell, grid)
      // The tip travels over the grid; the panel keeps its own box, so nothing
      // under the pointer moves the edge of the card the reader looks at.
      expect(panel.clientHeight).toBe(height)
      expect(panel.scrollHeight).toBe(scroll)
    }
  }
})

test('the pill\'s box is its own, whatever scale it is drawn at', () => {
  const plain = mount()
  showHeatTip(cellAt(plain.cells, 12, 3), plain.grid)
  const scaled = mount()
  // The scale stands in for the rule home-overview.css gives the pill, whose
  // token this spec's sheet cannot resolve.
  scaled.pill.style.scale = '0.5'
  showHeatTip(cellAt(scaled.cells, 12, 3), scaled.grid)
  // The pill shows at its own size, so a box measured inside it while it is
  // drawn smaller is brought back to that size before it is written.
  expect(scaled.pill.style.width).toBe(plain.pill.style.width)
  // Its own height too: the pill hangs from the same edge of the grid in both.
  const lowerEdge = (box: { grid: HTMLElement; pill: HTMLElement }) => box.pill.getBoundingClientRect().bottom - box.grid.getBoundingClientRect().top
  expect(Math.abs(lowerEdge(scaled) - lowerEdge(plain))).toBeLessThan(0.5)
})

test('the pill of a cell in the grid\'s upper rows hangs under it, inside the grid', () => {
  const { grid, pill, cells } = mount()
  const top = cellAt(cells, 5, 0)
  showHeatTip(top, grid)
  expect(pill.getAttribute(HEAT_HINT_SIDE_ATTR)).toBe('below')
  const bounds = pillBox(grid, pill)
  expect(bounds.top).toBeGreaterThanOrEqual(top.getBoundingClientRect().bottom - grid.getBoundingClientRect().top)
  expect(bounds.bottom).toBeLessThanOrEqual(grid.getBoundingClientRect().height + 1)
})

test('a cell low enough in the grid keeps its pill above', () => {
  const { grid, pill, cells } = mount()
  for (const row of [3, 6]) {
    const cell = cellAt(cells, 5, row)
    showHeatTip(cell, grid)
    expect(pill.getAttribute(HEAT_HINT_SIDE_ATTR)).toBe('above')
    const bounds = pillBox(grid, pill)
    expect(bounds.bottom).toBeLessThanOrEqual(cell.getBoundingClientRect().top - grid.getBoundingClientRect().top - HEAT_TIP_GAP + 1)
  }
})

test('a grid too short for the pill on either side keeps it above', () => {
  const { grid, pill, cells } = mount({ short: true })
  showHeatTip(cellAt(cells, 5, 0), grid)
  expect(pill.getAttribute(HEAT_HINT_SIDE_ATTR)).toBe('above')
})
