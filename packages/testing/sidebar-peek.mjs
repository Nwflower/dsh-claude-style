#!/usr/bin/env node
/**
 * sidebar-peek.mjs — the collapsed sidebar opened over the page from a hover (D87).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.mjs).
 *
 * The skin opens the host's own sidebar while the pointer rests on the rail's
 * toggle, and keeps the page from making room for it
 * (packages/client/src/features/sidebar-peek/). The scenario collapses the
 * rail on the real host, then reads what a reader sees, judged on the host's
 * own collapse marker and the boxes of the first two columns: the centre keeps
 * its box while the sidebar stands over it at its open width; leaving closes
 * it; a click on the toggle keeps it open and the centre then makes room;
 * picking a session in it closes it behind the switch.
 */
import surfaceTable from './data/surface.json' with { type: 'json' }
import { collapseRail } from './sidebar-rail.mjs'

/** The skin's part mark, read off the surface table rather than spelled here (D87). */
const PART = surfaceTable.surface.find((entry) => entry.id === 'skin.part').attribute
const part = (name) => `[${PART}~="${name}"]`

const PEEK = {
  frame: part('layout-frame'),
  column: `${part('layout-frame')} > ${part('sidebar-column')}`,
  center: `${part('layout-frame')} > ${part('center-column')}`,
  toggle: `${part('logo-row')} > ${part('sidebar-toggle')}`,
  sessionRow: part('session-row'),
}

/** The narrowest column that reads as the open sidebar rather than the rail. */
const OPEN_WIDTH_PX = 200

/** The host's collapse marker and the boxes of the first two columns. */
const readFrame = (page) => page.evaluate((peek) => {
  const frame = document.querySelector(peek.frame)
  const box = (selector) => {
    const element = document.querySelector(selector)
    if (element === null) return null
    const rect = element.getBoundingClientRect()
    return { left: Math.round(rect.left), width: Math.round(rect.width) }
  }
  return {
    collapsed: frame !== null && frame.hasAttribute('data-sidebar-collapsed'),
    column: box(peek.column),
    center: box(peek.center),
  }
}, PEEK)

/**
 * Read the frame once its boxes have stopped moving.
 *
 * The host eases the column's width and the frame's track back to the
 * collapsed width, and the collapse marker arrives with the first frame of
 * that move: a read taken then reads the column at its open width and the
 * centre pushed aside, which is the move and not the state. So the frame is
 * read again until two readings agree.
 */
async function settledFrame(page) {
  let previous = await readFrame(page)
  for (let tries = 0; tries < 40; tries += 1) {
    await page.waitForTimeout(100)
    const now = await readFrame(page)
    if (JSON.stringify(now) === JSON.stringify(previous)) return now
    previous = now
  }
  return previous
}

/** Wait until the host has the sidebar collapsed, or open with the column at its open width. */
const waitForSidebar = (page, collapsed) => page.waitForFunction(([peek, folded, wide]) => {
  const frame = document.querySelector(peek.frame)
  const column = document.querySelector(peek.column)
  if (frame === null || column === null) return false
  if (folded) return frame.hasAttribute('data-sidebar-collapsed')
  return !frame.hasAttribute('data-sidebar-collapsed') && column.getBoundingClientRect().width >= wide
}, [PEEK, collapsed, OPEN_WIDTH_PX], { timeout: 5000 }).then(() => true, () => false)

/** Rest the pointer on the rail's toggle until the sidebar stands open, its entrance played out. */
async function openPeek(page) {
  await page.locator(PEEK.toggle).first().hover()
  const opened = await waitForSidebar(page, false)
  await page.waitForTimeout(400)
  return opened
}

/** Somewhere in the centre, well clear of the sidebar's open width. */
async function leave(page) {
  const viewport = page.viewportSize()
  await page.mouse.move(Math.round(viewport.width * 0.75), Math.round(viewport.height / 2))
}

function sidebarPeekScenario({ check }) {
  return {
    script: 'greeting',
    prompt: 'hello there',
    async beforeSend({ page }) {
      await collapseRail(page)
    },
    async assert({ page, session }) {
      await leave(page)
      await waitForSidebar(page, true)
      const before = await settledFrame(page)

      const opened = await openPeek(page)
      const open = await settledFrame(page)

      await leave(page)
      const closed = await waitForSidebar(page, true)
      const after = await settledFrame(page)

      await openPeek(page)
      await page.locator(PEEK.toggle).first().click()
      await leave(page)
      await page.waitForTimeout(800)
      const pinned = await settledFrame(page)
      await collapseRail(page)

      await openPeek(page)
      await page.locator(`${PEEK.column} ${PEEK.sessionRow}`).first().click()
      const picked = await waitForSidebar(page, true)

      const same = (a, b) => a !== null && b !== null && a.left === b.left && a.width === b.width
      return [
        check('侧栏已收起',
          before.collapsed && before.center !== null,
          JSON.stringify(before)),
        check('鼠标停在收起按钮上，宿主打开侧栏，侧栏以展开宽度浮在页面上方',
          opened && !open.collapsed && open.column !== null && open.column.left === 0 && open.column.width >= OPEN_WIDTH_PX,
          JSON.stringify(open)),
        check('侧栏浮在上方时主区的位置与宽度和收起时一样',
          same(before.center, open.center),
          JSON.stringify({ before: before.center, open: open.center })),
        check('鼠标移开后侧栏收起，主区回到原来的盒子',
          closed && same(before.center, after.center),
          JSON.stringify(after)),
        check('展开时点击按钮让侧栏固定展开，鼠标移开也不收起，主区让出侧栏的宽度',
          !pinned.collapsed && pinned.column !== null && pinned.center !== null &&
            pinned.center.left >= pinned.column.width - 1,
          JSON.stringify(pinned)),
        check('在浮起的侧栏里选中会话后侧栏自动收起', picked, ''),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { sidebarPeekScenario }
