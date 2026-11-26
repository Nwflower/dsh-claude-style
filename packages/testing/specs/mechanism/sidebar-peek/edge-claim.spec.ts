/**
 * The window's left-edge strip opens the collapsed sidebar over the page, and
 * on the desktop the collapsed column takes no room: the conversation starts at
 * the frame's left edge and its turn rail, 12px in, stands inside that strip. A
 * skin control there claims the pointer, so resting on the rail opens nothing
 * over it; the same strip beside the rail still opens the peek.
 *
 * @capability sidebar-peek
 * @features sidebar-peek, turn-nav
 * @risk With hover-to-peek on, reaching for the message navigator at the conversation's top left opens the sidebar over it, and no turn can be picked.
 */
import { afterEach, expect, test, vi } from 'vitest'
import { installSidebarPeek } from '@dsh-claude-style/client/mechanisms'
import { POINTER_CLAIM_ATTR } from '@dsh-claude-style/client/pure'
import { SIDEBAR_COLLAPSED_ATTRIBUTE, SIDEBAR_SLOT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { hostElement } from '../../fixtures/host-markup'
import { surfaceAttribute } from '../../fixtures/surface'

const PART = surfaceAttribute('skin.part')
/** Longer than the peek's open delay. */
const PAST_OPEN_DELAY_MS = 200
let stopPeek: (() => void) | null = null

afterEach(() => {
  stopPeek?.()
  stopPeek = null
  vi.restoreAllMocks()
  document.body.replaceChildren()
})

/** The desktop's collapsed frame: a hidden column, the centre from the left edge, and a claimed rail 12px in. */
function desktopFrame() {
  const box = document.createElement('div')
  box.setAttribute(PART, 'layout-frame')
  box.setAttribute(SIDEBAR_COLLAPSED_ATTRIBUTE, '')
  box.style.cssText = 'position:relative;display:flex;width:1200px;height:600px'
  const column = document.createElement('div')
  column.setAttribute(PART, 'sidebar-column')
  column.style.cssText = 'width:0;overflow:hidden'
  const slot = hostElement(SIDEBAR_SLOT_SELECTOR)
  const logo = document.createElement('div')
  logo.setAttribute(PART, 'logo-row')
  const toggle = document.createElement('button')
  toggle.setAttribute(PART, 'sidebar-toggle')
  toggle.style.cssText = 'position:fixed;left:900px;top:0;width:24px;height:24px'
  logo.append(toggle)
  slot.append(logo)
  column.append(slot)
  const center = document.createElement('div')
  center.setAttribute(PART, 'center-column')
  center.style.cssText = 'position:relative;flex:1;height:600px'
  const rail = document.createElement('div')
  rail.setAttribute(POINTER_CLAIM_ATTR, '')
  rail.style.cssText = 'position:absolute;left:12px;top:80px;width:20px;height:48px'
  center.append(rail)
  box.append(column, center)
  document.body.style.margin = '0'
  document.body.append(box)
  return { box, center, rail }
}

/** The peek with a host layout whose sidebar toggle is counted. */
async function installed() {
  const toggleSidebar = vi.fn()
  const ctx = { get: (name: string) => name === 'layout' ? { toggleSidebar } : undefined }
  stopPeek = installSidebarPeek(ctx as never)
  await new Promise(requestAnimationFrame)
  return toggleSidebar
}

/** A pointer resting on an element at one point: the event carries the element it lands on. */
async function rest(target: Element, x: number, y: number) {
  target.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x, clientY: y, pointerType: 'mouse' }))
  await new Promise(resolve => setTimeout(resolve, PAST_OPEN_DELAY_MS))
}

test('resting on the turn rail inside the edge strip leaves the sidebar collapsed', async () => {
  const { rail } = desktopFrame()
  const toggleSidebar = await installed()
  const box = rail.getBoundingClientRect()
  // The rail reaches into the strip: the point is inside both.
  expect(box.left).toBeLessThan(32)

  await rest(rail, box.left + 4, box.top + box.height / 2)

  expect(toggleSidebar).not.toHaveBeenCalled()
})

test('the edge strip beside the rail still opens the peek', async () => {
  const { center, rail } = desktopFrame()
  const toggleSidebar = await installed()
  const box = rail.getBoundingClientRect()

  await rest(center, 4, box.bottom + 100)

  expect(toggleSidebar).toHaveBeenCalledTimes(1)
})
