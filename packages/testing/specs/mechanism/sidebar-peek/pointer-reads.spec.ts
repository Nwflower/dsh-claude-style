/**
 * The sidebar peek asks on every pointer move whether the pointer rests on a
 * trigger. An open sidebar has nothing to peek, and its frame's collapsed mark
 * answers that without a box: a pointer crossing the session list reads no
 * layout. A collapsed sidebar reads the trigger's boxes, since the pointer's
 * place is the question there.
 *
 * @capability sidebar-peek
 * @features sidebar-peek
 * @risk Every pointer move over an open sidebar forces a layout, so moving across session rows costs main-thread time on every row.
 */
import { afterEach, expect, test, vi } from 'vitest'
import { installSidebarPeek } from '@dsh-claude-style/client/mechanisms'
import { SIDEBAR_COLLAPSED_ATTRIBUTE, SIDEBAR_DRAWER_ATTRIBUTE, SIDEBAR_SLOT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { hostElement } from '../../fixtures/host-markup'
import { surfaceAttribute } from '../../fixtures/surface'

const PART = surfaceAttribute('skin.part')
let stopPeek: (() => void) | null = null

afterEach(() => {
  stopPeek?.()
  stopPeek = null
  vi.restoreAllMocks()
  document.body.replaceChildren()
})

/** The peek over the frame, once the bus has delivered the frame's arrival. */
async function installed() {
  stopPeek = installSidebarPeek(undefined as never)
  await new Promise(requestAnimationFrame)
}

/** The layout frame with the sidebar's toggle in its logo row, as the host lays them out. */
function frame() {
  const box = document.createElement('div')
  box.setAttribute(PART, 'layout-frame')
  box.style.cssText = 'position:relative;width:800px;height:400px'
  const slot = hostElement(SIDEBAR_SLOT_SELECTOR)
  const logo = document.createElement('div')
  logo.setAttribute(PART, 'logo-row')
  const toggle = document.createElement('button')
  toggle.setAttribute(PART, 'sidebar-toggle')
  toggle.style.cssText = 'width:24px;height:24px'
  logo.append(toggle)
  slot.append(logo)
  box.append(slot)
  document.body.append(box)
  return { box, toggle }
}

/** A pointer move over the page at one point, the event the peek listens to. */
function move(x: number, y: number) {
  document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x, clientY: y, pointerType: 'mouse' }))
}

test('pointer moves over an open sidebar read no box', async () => {
  const { box, toggle } = frame()
  await installed()
  // cost: D40 — a box read on every pointer move forces the layout the open sidebar never needs.
  const frameReads = vi.spyOn(box, 'getBoundingClientRect')
  // cost: D40 — the toggle's box is the other read a pointer move could force.
  const toggleReads = vi.spyOn(toggle, 'getBoundingClientRect')
  const toggleBox = toggle.getBoundingClientRect()
  toggleReads.mockClear()

  for (let y = 10; y < 400; y += 20) move(200, y)
  move(toggleBox.left + 4, toggleBox.top + 4)
  move(4, 200)

  expect(frameReads).not.toHaveBeenCalled()
  expect(toggleReads).not.toHaveBeenCalled()
})

test('pointer moves over a collapsed sidebar read the trigger it may rest on', async () => {
  const { box, toggle } = frame()
  box.setAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE, '')
  // A drawer layout keeps the peek from opening, so only the trigger reads are counted.
  box.setAttribute(SIDEBAR_DRAWER_ATTRIBUTE, '')
  await installed()
  // cost: D40 — the collapsed sidebar's trigger is the one place a pointer move reads a box.
  const toggleReads = vi.spyOn(toggle, 'getBoundingClientRect')

  move(400, 200)

  expect(toggleReads).toHaveBeenCalled()
})
