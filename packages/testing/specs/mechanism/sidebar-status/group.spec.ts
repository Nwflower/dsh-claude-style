/**
 * The mark a closed workspace row carries while a session under it runs: the
 * reader's own running look in a seat at the chosen end, the title handed to
 * the shimmer, and nothing left behind when the session stops.
 *
 * @capability sidebar-status
 * @features sidebar-status
 * @risk A collapsed workspace gains no visible running mark, the mark covers the group's own actions or title, or it survives the session stopping and a preference change.
 */
import { expect, test } from 'vitest'
import { SIDEBAR_STATUS_SHEET, WorkspaceRunningMark } from '@dsh-claude-style/client/pure'
import { surfaceAttribute, surfaceClass } from '../../fixtures/surface'
import { bodyAttribute, PART, removeAfterTest, sheetRules } from './fixture'

const RUNNING = surfaceAttribute('sidebar-status.workspace-running')
const SIDE = surfaceAttribute('sidebar-status.side')
const SEAT = surfaceClass('sidebar-status.group-seat')
const MARK = surfaceClass('settings.ongoing-mark')
const LOOK = surfaceAttribute('settings.ongoing-look')
const INDICATOR = surfaceAttribute('skin.ongoing-indicator')
const MOTION = surfaceAttribute('skin.motion')

function mountRow(expanded = 'false') {
  const row = document.createElement('div')
  row.setAttribute(PART, 'project-row')
  row.setAttribute('role', 'treeitem')
  row.setAttribute('aria-expanded', expanded)
  row.style.cssText = 'display:flex;align-items:center;gap:4px;box-sizing:border-box;width:320px;height:28px'
  const folder = document.createElement('span')
  folder.setAttribute(PART, 'row-folder')
  const chevron = document.createElement('span')
  chevron.setAttribute(PART, 'row-chevron')
  const text = document.createElement('span')
  text.setAttribute(PART, 'row-project-text')
  text.style.flex = '0 1 auto'
  const title = document.createElement('span')
  title.setAttribute(PART, 'row-title')
  title.textContent = 'Workspace title'
  text.append(title)
  const actions = document.createElement('span')
  actions.setAttribute(PART, 'row-actions')
  actions.style.marginLeft = 'auto'
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = '⋯'
  button.style.cssText = 'width:24px;height:24px;padding:0'
  actions.append(button)
  row.append(folder, chevron, text, actions)
  document.body.append(row)
  removeAfterTest(row)
  const mark = new WorkspaceRunningMark(row)
  return { row, title, actions, button, mark }
}

test('a running closed workspace takes the mark and gives it back when the session stops', () => {
  const view = mountRow()
  view.mark.update(false, 'breathe')
  expect(view.row.hasAttribute(RUNNING)).toBe(false)
  expect(view.row.querySelector(`.${SEAT}`)).toBeNull()
  view.mark.update(true, 'breathe')
  expect(view.row.getAttribute(RUNNING)).toBe('')
  const seat = view.row.querySelector(`.${SEAT}`) as HTMLElement
  expect(seat).not.toBeNull()
  expect(seat.getAttribute('aria-hidden')).toBe('true')
  const dot = seat.querySelector(`.${MARK}`) as HTMLElement
  expect(dot.getAttribute(LOOK)).toBe('breathe')
  expect(dot.getBoundingClientRect().width).toBe(6)
  // The same cadence and colour the session row's running dot breathes with.
  expect(getComputedStyle(dot).animationDuration).toBe('1.2s')
  expect(getComputedStyle(dot).backgroundColor).toBe('rgb(137, 135, 129)')
  view.mark.update(true, 'ring')
  expect(dot.getAttribute(LOOK)).toBe('ring')
  expect(dot.getBoundingClientRect().width).toBe(10)
  view.mark.update(false, 'ring')
  expect(view.row.hasAttribute(RUNNING)).toBe(false)
  expect(view.row.querySelector(`.${SEAT}`)).toBeNull()
})

test('the trailing seat stands in the reserved column and the left preference leads the row', () => {
  bodyAttribute(SIDE, 'right')
  const view = mountRow()
  view.mark.update(true, 'breathe')
  const seat = view.row.querySelector(`.${SEAT}`) as HTMLElement
  const trailing = getComputedStyle(seat)
  expect(trailing.position).toBe('absolute')
  expect(trailing.right).toBe('6px')
  expect(getComputedStyle(view.row).paddingRight).toBe('26px')
  const rowBox = view.row.getBoundingClientRect()
  const seatBox = seat.getBoundingClientRect()
  expect(rowBox.right - seatBox.right).toBeLessThanOrEqual(6)
  expect(seatBox.left).toBeGreaterThan(rowBox.left + rowBox.width / 2)
  bodyAttribute(SIDE, 'left')
  const leading = getComputedStyle(seat)
  expect(leading.position).toBe('static')
  expect(leading.order).toBe('0')
  expect(getComputedStyle(view.row).paddingRight).not.toBe('26px')
  // order 0 precedes the text (order 1), the chevron (2) and the actions (3),
  // so the appended seat still stands ahead of the title on the page.
  expect(seat.getBoundingClientRect().right).toBeLessThanOrEqual(view.title.getBoundingClientRect().left)
  view.mark.dispose()
})

test('shimmer hands the title to the gradient and parks the dot while motion is allowed', () => {
  bodyAttribute(INDICATOR, 'shimmer')
  bodyAttribute(MOTION, 'full')
  const view = mountRow()
  view.mark.update(true, 'shimmer')
  const seat = view.row.querySelector(`.${SEAT}`) as HTMLElement
  expect(view.title.getAnimations().length).toBeGreaterThan(0)
  expect(getComputedStyle(view.title).backgroundImage).not.toBe('none')
  // Out of the flow, not merely invisible: a visibility-only hide would leave
  // the leading column the seat reserves blank on the workspace row.
  expect(getComputedStyle(seat).display).toBe('none')
  expect(seat.getBoundingClientRect().width).toBe(0)
  const titleBox = view.title.getBoundingClientRect()
  const rowBox = view.row.getBoundingClientRect()
  expect(titleBox.left - rowBox.left).toBeLessThanOrEqual(10)
  bodyAttribute(MOTION, 'reduced')
  expect(getComputedStyle(view.title).animationName).toBe('none')
  expect(getComputedStyle(seat).display).not.toBe('none')
  expect(seat.getBoundingClientRect().width).toBeGreaterThan(0)
  const dot = seat.querySelector(`.${MARK}`) as HTMLElement
  expect(getComputedStyle(dot).animationName).toBe('none')
  view.mark.dispose()
})

test('shimmer at the trailing end frees the reserved column too', () => {
  bodyAttribute(SIDE, 'right')
  bodyAttribute(INDICATOR, 'shimmer')
  bodyAttribute(MOTION, 'full')
  const view = mountRow()
  view.mark.update(true, 'shimmer')
  const seat = view.row.querySelector(`.${SEAT}`) as HTMLElement
  expect(getComputedStyle(seat).display).toBe('none')
  expect(getComputedStyle(view.row).paddingRight).toBe('6px')
  view.mark.dispose()
})

test('the group mark shares the reduced-motion and forced-colors fallbacks of the session dot', () => {
  const view = mountRow()
  view.mark.update(true, 'breathe')
  const dot = view.row.querySelector(`.${SEAT} .${MARK}`) as HTMLElement
  const rules = sheetRules(SIDEBAR_STATUS_SHEET)
  const contrast = rules.filter(({ rule, media }) => dot.matches(rule.selectorText) && media.some(condition => condition.includes('(forced-colors: active)')))
  expect(contrast.some(({ rule }) => rule.style.animationName === 'none')).toBe(true)
  expect(contrast.some(({ rule }) => rule.style.backgroundColor.toLowerCase() === 'canvastext')).toBe(true)
  const reduced = rules.filter(({ rule }) => dot.matches(rule.selectorText) && rule.style.animationName === 'none')
  expect(reduced.length).toBeGreaterThan(0)
  view.mark.dispose()
})

test('the seat is decoration: the row keeps its title, actions and listener surface', () => {
  const view = mountRow()
  let clicks = 0
  view.button.addEventListener('click', () => { clicks += 1 })
  const nodes = [...view.row.childNodes]
  const titleText = view.title.textContent
  view.mark.update(true, 'breathe')
  view.mark.update(true, 'breathe')
  expect(view.row.querySelectorAll(`.${SEAT}`).length).toBe(1)
  expect([...view.row.childNodes].slice(0, nodes.length)).toEqual(nodes)
  expect(view.title.textContent).toBe(titleText)
  view.button.click()
  expect(clicks).toBe(1)
  view.mark.dispose()
  expect([...view.row.childNodes]).toEqual(nodes)
  expect(view.row.hasAttribute(RUNNING)).toBe(false)
})

test('the look follows the reader setting without rebuilding the seat', () => {
  const view = mountRow()
  view.mark.update(true, 'breathe')
  const seat = view.row.querySelector(`.${SEAT}`) as HTMLElement
  const dot = seat.querySelector(`.${MARK}`) as HTMLElement
  const watch = new MutationObserver(() => {})
  watch.observe(view.row, { attributes: true, childList: true, subtree: true })
  view.mark.update(true, 'breathe')
  expect(watch.takeRecords()).toEqual([])
  view.mark.update(true, 'ring')
  const records = watch.takeRecords()
  watch.disconnect()
  expect(records.length).toBeGreaterThan(0)
  expect(view.row.querySelector(`.${SEAT}`)).toBe(seat)
  expect(seat.querySelector(`.${MARK}`)).toBe(dot)
  expect(dot.getAttribute(LOOK)).toBe('ring')
  view.mark.dispose()
})
