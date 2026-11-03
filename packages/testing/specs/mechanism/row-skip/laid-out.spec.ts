/**
 * A conversation row may be skipped off screen only once it has been laid out
 * at its real size: it is marked the frame after the one that laid it out, so
 * the height it keeps while skipped is its own. A change of the column's width
 * takes every mark off, so every row is laid out again at the new width before
 * it may be skipped again.
 *
 * @capability row-skip
 * @features row-skip
 * @risk A row the reader scrolls toward stands at an estimated height and takes its real one under him, and the conversation jumps by the difference while he scrolls.
 */
import { expect, test } from 'vitest'
import { CONVERSATION_SCROLL_SELECTOR, FLOW_KIND_ATTRIBUTE, ASSISTANT_STEP_KIND } from '@dsh-claude-style/contracts/dom'
import { installRowSkip } from '@dsh-claude-style/client/pure'
import { cleanupWith, frames } from '../../fixtures/teardown'
import { attach } from '../../fixtures/host-markup'
import { surfaceAttribute } from '../../fixtures/surface'

const LAID_OUT = surfaceAttribute('row-skip.laid-out')


/** The host's conversation scroller, at a width, holding `count` rows. */
function conversation(count: number, width = 600) {
  const scroller = attach(document.body, CONVERSATION_SCROLL_SELECTOR)
  scroller.style.cssText = `width:${width}px;height:300px;overflow-y:auto`
  const rows = Array.from({ length: count }, () => {
    const row = document.createElement('div')
    row.setAttribute(FLOW_KIND_ATTRIBUTE, ASSISTANT_STEP_KIND)
    row.style.height = '120px'
    scroller.append(row)
    return row
  })
  return { scroller, rows }
}

function installed() {
  const stop = installRowSkip()
  cleanupWith(stop)
  return stop
}

const marked = (rows: HTMLElement[]) => rows.filter(row => row.hasAttribute(LAID_OUT)).length

test('a row is marked only after a frame has laid it out', async () => {
  const { rows } = conversation(3)
  installed()
  expect(marked(rows)).toBe(0)
  await frames(1)
  expect(marked(rows)).toBe(0)
  await frames(2)
  expect(marked(rows)).toBe(3)
})

test('a row arriving later waits for a layout of its own', async () => {
  const { scroller, rows } = conversation(2)
  installed()
  await frames(3)
  expect(marked(rows)).toBe(2)
  const late = document.createElement('div')
  late.setAttribute(FLOW_KIND_ATTRIBUTE, ASSISTANT_STEP_KIND)
  scroller.append(late)
  await Promise.resolve()
  expect(late.hasAttribute(LAID_OUT)).toBe(false)
  await frames(3)
  expect(late.hasAttribute(LAID_OUT)).toBe(true)
})

test('a change of the column\'s width lays every row out again before it is marked', async () => {
  const { scroller, rows } = conversation(3)
  installed()
  await frames(3)
  expect(marked(rows)).toBe(3)
  scroller.style.width = '480px'
  // The resize report lands with the next frame's layout; the marks come off with it.
  await frames(2)
  expect(marked(rows)).toBe(0)
  await frames(3)
  expect(marked(rows)).toBe(3)
})

test('the teardown takes every mark off', async () => {
  const { rows } = conversation(3)
  const stop = installRowSkip()
  await frames(3)
  expect(marked(rows)).toBe(3)
  stop()
  expect(marked(rows)).toBe(0)
})
