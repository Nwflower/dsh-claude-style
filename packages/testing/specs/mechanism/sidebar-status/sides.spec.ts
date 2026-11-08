/**
 * @capability sidebar-status
 * @features sidebar-status
 * @risk A chosen side moves the title, or leaves the host's leading band unpainted so a third-party mark covers the title's first glyph.
 */
import { expect, test } from 'vitest'
import { bodyAttribute, mount } from './fixture'
import { surfaceAttribute } from '../../fixtures/surface'

const SIDE = surfaceAttribute('sidebar-status.side')
const STATUS = surfaceAttribute('sidebar-status.row')

/** Where the title starts, measured from the row's own leading edge. */
function titleOffset(row: Element, title: Element): number {
  return Math.round(title.getBoundingClientRect().left - row.getBoundingClientRect().left)
}

test('the trailing side keeps the host leading band reserved', () => {
  bodyAttribute(SIDE, 'right')
  const view = mount('ongoing')
  view.sync()
  expect(getComputedStyle(view.seat).position).toBe('absolute')
  expect(Number.parseFloat(getComputedStyle(view.row).paddingInlineStart)).toBe(20)
  expect(titleOffset(view.row, view.title)).toBe(24)
})

test('the leading side, the default, keeps the host slot in the row flow, drops the trailing column, and leaves the title where it was', () => {
  bodyAttribute(SIDE, 'left')
  const view = mount('ongoing')
  view.sync()
  expect(getComputedStyle(view.seat).position).toBe('static')
  expect(Math.round(view.seat.getBoundingClientRect().left - view.row.getBoundingClientRect().left)).toBe(6)
  expect(Number.parseFloat(getComputedStyle(view.row).paddingInlineEnd)).toBe(6)
  expect(titleOffset(view.row, view.title)).toBe(24)
})

test('a row whose leading seat carries another plugin\'s own content keeps the padding it had on either side', () => {
  for (const side of ['left', 'right']) {
    bodyAttribute(SIDE, side)
    const view = mount('warning')
    view.outlet.append(document.createElement('button'))
    view.sync()
    expect(view.row.getAttribute(STATUS)).toBe('foreign')
    expect(Number.parseFloat(getComputedStyle(view.row).paddingInlineStart)).toBe(6)
  }
})
