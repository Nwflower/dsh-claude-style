/**
 * The host frame's three columns in a page drawn at a scale (D43, D81): the host
 * measures the frame in the window's pixels and writes the columns in the page's,
 * so the grid is drawn at the scale again, the columns add up to a factor past the
 * window, and a sidebar dragged to a width is drawn that factor wider. A column
 * narrowed to nothing stands at zero in both spaces.
 *
 * @capability page-scale
 * @features shared
 * @risk At a page scale other than 100% the frame's three columns add up to a factor more than the window, the sidebar is drawn a factor wider and shows cut off, its content stands wider than its column and is clipped at the column's edge, its drag handle leaves that edge, and a second copy of the rule on the page divides the first one's numbers again.
 */
import { afterEach, expect, test } from 'vitest'
import { SIDEBAR_HANDLE_SELECTOR, SIDEBAR_SLOT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { inPageColumns, inPageLength, installFrameColumns } from '@dsh-claude-style/client/pure'
import { attach } from '../../fixtures/host-markup'
import { surfaceAttribute } from '../../fixtures/surface'
import { after, drawnAt, drawnScale, resetPage, settle } from './drawn-page'

/** The frame's part mark: the attribute a skin writes its parts under, and the name the frame answers to. */
const PART_ATTRIBUTE = surfaceAttribute('skin.part')
const FRAME_PART = 'layout-frame'
const SIDEBAR_ROOT_PART = 'sidebar-root'
/** The record this rule keeps on a frame it carried, read from the surface table. */
const CARRY_ATTRIBUTE = surfaceAttribute('skin.frame-columns')

afterEach(resetPage)

/** The host's frame: the one element the part marks, with its columns written inline. */
function hostFrame(columns: string) {
  const frame = document.createElement('div')
  frame.setAttribute(PART_ATTRIBUTE, FRAME_PART)
  frame.style.cssText = `display:grid;grid-template-columns:${columns}`
  document.body.append(frame)
  return frame
}

/** The sidebar's own box inside its slot, at the width the host wrote. */
function hostSidebar(width: string) {
  const sidebar = document.createElement('div')
  sidebar.setAttribute(PART_ATTRIBUTE, SIDEBAR_ROOT_PART)
  sidebar.style.width = width
  attach(document.body, SIDEBAR_SLOT_SELECTOR).append(sidebar)
  return sidebar
}

/** The sidebar's drag handle, at the place the host wrote. */
function hostHandle(left: string) {
  const handle = attach(document.body, SIDEBAR_HANDLE_SELECTOR)
  handle.style.left = left
  return handle
}

/** Install the rule and register its teardown. */
function installed() {
  const rule = installFrameColumns({ scale: drawnScale })
  after(rule.stop)
  return rule
}

const columnsOf = (frame: HTMLElement) => frame.style.getPropertyValue('grid-template-columns')

test('every column the host wrote is divided by the page\'s scale', () => {
  expect(inPageColumns('280px minmax(200px, 1fr) minmax(300px, 400px)', 1.25)).toBe('224px minmax(160px, 1fr) minmax(240px, 320px)')
  expect(inPageColumns('280px 500px 400px', 1.25)).toBe('224px 400px 320px')
  expect(inPageColumns('280px 500px 400px', 0.8)).toBe('350px 625px 500px')
})

test('a page at its own scale and a keyword track keep the host\'s own write', () => {
  expect(inPageColumns('280px 900.8px 0px', 1)).toBe(null)
  expect(inPageColumns('280px 500px 400px', 0)).toBe(null)
  expect(inPageColumns('', 1.25)).toBe(null)
  expect(inPageColumns('fit-content(200px) 1fr min-content', 1.25)).toBe(null)
})

test('a column narrowed to nothing is carried like any other', () => {
  // The host writes this list whenever the right column is closed, and its first
  // column is still a length the page draws a factor wide.
  expect(inPageColumns('280px minmax(0px, 1fr) minmax(0px, 0px)', 1.25)).toBe('224px minmax(0px, 1fr) minmax(0px, 0px)')
  expect(inPageColumns('0px minmax(0px, 1fr) minmax(0px, 0px)', 1.25)).toBe('0px minmax(0px, 1fr) minmax(0px, 0px)')
})

test('the frame\'s columns are laid out in the page\'s own pixels', async () => {
  drawnAt(1.25)
  const frame = hostFrame('280px 500px 400px')
  installed()
  await settle()
  expect(columnsOf(frame)).toBe('224px 400px 320px')
})

test('a frame whose right column is closed carries its sidebar the same way', async () => {
  drawnAt(1.25)
  const frame = hostFrame('280px minmax(0px, 1fr) minmax(0px, 0px)')
  installed()
  await settle()
  expect(columnsOf(frame)).toBe('224px minmax(0px, 1fr) minmax(0px, 0px)')
})

test('the record stands on the frame, so a second copy of the rule reads it too', async () => {
  drawnAt(1.25)
  const frame = hostFrame('280px 500px 400px')
  installed()
  await settle()
  expect(columnsOf(frame)).toBe('224px 400px 320px')
  // A hot reload mounts the new module before the old one is torn down: the
  // second copy reads the same frame, and must not divide what the first wrote.
  const second = installFrameColumns({ scale: drawnScale })
  after(second.stop)
  second.settle()
  await settle()
  expect(columnsOf(frame)).toBe('224px 400px 320px')
  expect(frame.hasAttribute(CARRY_ATTRIBUTE)).toBe(true)
})

test('the scale changing under a carried frame reads the host\'s own numbers again', async () => {
  drawnAt(1.25)
  const frame = hostFrame('280px minmax(0px, 1fr) minmax(0px, 0px)')
  const rule = installed()
  await settle()
  expect(columnsOf(frame)).toBe('224px minmax(0px, 1fr) minmax(0px, 0px)')
  drawnAt(0.8)
  rule.settle()
  await settle()
  expect(columnsOf(frame)).toBe('350px minmax(0px, 1fr) minmax(0px, 0px)')
  drawnAt(1)
  rule.settle()
  await settle()
  expect(columnsOf(frame)).toBe('280px minmax(0px, 1fr) minmax(0px, 0px)')
  expect(frame.hasAttribute(CARRY_ATTRIBUTE)).toBe(false)
})

test('the host writing its columns again is followed, without compounding', async () => {
  drawnAt(1.25)
  const frame = hostFrame('280px 500px 400px')
  installed()
  await settle()
  frame.style.setProperty('grid-template-columns', '320px 500px 400px')
  await settle()
  expect(columnsOf(frame)).toBe('256px 400px 320px')
  await settle()
  expect(columnsOf(frame)).toBe('256px 400px 320px')
})

test('a frame mounted after the rule runs is found and converted', async () => {
  drawnAt(1.25)
  installed()
  await settle()
  const frame = hostFrame('280px 500px 400px')
  await settle()
  expect(columnsOf(frame)).toBe('224px 400px 320px')
})

test('the teardown hands the host its own numbers back', async () => {
  drawnAt(1.25)
  const frame = hostFrame('280px 500px 400px')
  const rule = installFrameColumns({ scale: drawnScale })
  await settle()
  expect(columnsOf(frame)).toBe('224px 400px 320px')
  rule.stop()
  await settle()
  expect(columnsOf(frame)).toBe('280px 500px 400px')
  expect(frame.hasAttribute(CARRY_ATTRIBUTE)).toBe(false)
})

test('one pixel length is divided by the page\'s scale, and anything else is left to the host', () => {
  expect(inPageLength('280px', 1.25)).toBe('224px')
  expect(inPageLength('280px', 0.8)).toBe('350px')
  expect(inPageLength('280px', 1)).toBe(null)
  expect(inPageLength('100%', 1.25)).toBe(null)
  expect(inPageLength('', 1.25)).toBe(null)
})

test('the sidebar\'s own box and its handle stand at the width of the column they belong to', async () => {
  drawnAt(1.25)
  const frame = hostFrame('280px minmax(0px, 1fr) minmax(0px, 0px)')
  const sidebar = hostSidebar('280px')
  const handle = hostHandle('280px')
  installed()
  await settle()
  expect(columnsOf(frame)).toBe('224px minmax(0px, 1fr) minmax(0px, 0px)')
  expect(sidebar.style.width).toBe('224px')
  expect(handle.style.left).toBe('224px')
})

test('the host dragging the sidebar moves its box and its handle with the column', async () => {
  drawnAt(1.25)
  const sidebar = hostSidebar('280px')
  const handle = hostHandle('280px')
  installed()
  await settle()
  sidebar.style.width = '320px'
  handle.style.left = '320px'
  await settle()
  expect(sidebar.style.width).toBe('256px')
  expect(handle.style.left).toBe('256px')
  await settle()
  expect(sidebar.style.width).toBe('256px')
  expect(handle.style.left).toBe('256px')
})

test('a sidebar collapsed and opened again at the same width is carried again', async () => {
  drawnAt(1.25)
  const sidebar = hostSidebar('280px')
  installed()
  await settle()
  expect(sidebar.style.width).toBe('224px')
  // The collapsed rail drops the width; reopening writes the host's own number
  // again, which is the one the record held before the collapse.
  sidebar.style.removeProperty('width')
  await settle()
  sidebar.style.width = '280px'
  await settle()
  expect(sidebar.style.width).toBe('224px')
})

test('the teardown hands the sidebar and its handle their own numbers back', async () => {
  drawnAt(1.25)
  const sidebar = hostSidebar('280px')
  const handle = hostHandle('280px')
  const rule = installFrameColumns({ scale: drawnScale })
  await settle()
  expect(sidebar.style.width).toBe('224px')
  rule.stop()
  await settle()
  expect(sidebar.style.width).toBe('280px')
  expect(handle.style.left).toBe('280px')
  expect(sidebar.hasAttribute(CARRY_ATTRIBUTE)).toBe(false)
  expect(handle.hasAttribute(CARRY_ATTRIBUTE)).toBe(false)
})
