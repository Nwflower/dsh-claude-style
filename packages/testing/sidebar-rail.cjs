#!/usr/bin/env node
/**
 * sidebar-rail.cjs — the collapsed sidebar rail as one icon column (D45).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.cjs).
 *
 * Collapsing re-seats the host's New session control as a 36px icon button and
 * leaves the chip the skin draws as the icon inside it. The host's own icon seat
 * stays in that button, holding nothing there (the skin hides its svg and the
 * host's label is 0 wide) but still taking a share of the flex row — which put
 * the chip that share left of the column the collapse toggle and the panel rows'
 * glyphs stand on (packages/client/src/theme/sidebar.css).
 *
 * The scenario collapses the rail on the real host and reads two things: where
 * the chip's own box stands, laid out from the button's own box, the chip's
 * computed width and whatever else that button holds in its row, and what the
 * seat takes back when it is put into the row once more. The second reading is
 * what makes the first mean something — a host that stops giving the seat room
 * leaves nothing to guard.
 */
'use strict'

/** The host's own classes this scenario reads, and the seat the skin keeps out of the row. */
const RAIL = {
  frame: '[class*="_frame"]',
  column: '[class*="_sidebarCol"]',
  toggle: 'button[class*="_toggle"]',
  panelRow: '[class*="panelRow"]',
  glyph: '[class*="panelGlyph"]',
  newSession: 'button[class*="newSession"]',
  seat: '[class*="newSessionLabelMask"]',
}

/** How far a control's centre may stand from the column's own line and still read as on it. */
const LINE_TOLERANCE_PX = 1

/**
 * Collapse the rail, once: the host's own toggle is pressed unless the frame
 * already carries the collapsed marker, and the wait is for the host's settle
 * (its wide content unmounts 150ms in) plus that control's own 36px box.
 */
async function collapseRail(page) {
  const collapsed = await page.evaluate((rail) => {
    const frame = document.querySelector(rail.frame)
    return frame !== null && frame.hasAttribute('data-sidebar-collapsed')
  }, RAIL)
  if (!collapsed) await page.locator(RAIL.column).locator(RAIL.toggle).first().click()
  await page.waitForFunction((rail) => {
    const frame = document.querySelector(rail.frame)
    const button = document.querySelector(rail.newSession)
    return frame !== null && frame.hasAttribute('data-sidebar-collapsed') &&
      button !== null && Math.round(button.getBoundingClientRect().width) === 36
  }, RAIL, { timeout: 15000 })
  // The rail's own entrance fade (rail-in, 150ms) ends before the reading.
  await page.waitForTimeout(500)
}

/** The collapsed rail: every control's box, and where the chip's own box stands. */
const readRail = (page) => page.evaluate((rail) => {
  const box = (element) => {
    if (element === null || element === undefined) return null
    const rect = element.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return null
    return { left: rect.left, right: rect.right, width: rect.width, height: rect.height, centre: rect.left + rect.width / 2 }
  }
  const button = document.querySelector(rail.newSession)
  if (button === null) return null
  const frame = document.querySelector(rail.frame)
  const column = button.closest(rail.column)
  const seat = button.querySelector(rail.seat)
  const style = getComputedStyle(button)
  const chip = getComputedStyle(button, '::before')
  const chipWidth = Number.parseFloat(chip.width)
  const chipGrow = chip.flexGrow
  const paddingLeft = Number.parseFloat(style.paddingLeft)
  const contentWidth = button.clientWidth - paddingLeft - Number.parseFloat(style.paddingRight)
  const buttonBox = box(button)
  // The chip's own box, laid out the way the button lays it out: the chip is its
  // first item, a sibling that grows takes the free space and packs the row at
  // its start, and otherwise the button's own alignment splits what is left.
  // Reading the siblings here is what keeps this number honest when the host
  // gives its icon seat room again.
  const siblings = [...button.children].filter((child) => getComputedStyle(child).display !== 'none')
  const siblingWidth = siblings.reduce((sum, child) => sum + child.getBoundingClientRect().width, 0)
  const grows = siblings.some((child) => Number.parseFloat(getComputedStyle(child).flexGrow) > 0)
  const free = contentWidth - chipWidth - siblingWidth
  const within = grows ? 0 : (style.justifyContent === 'center' ? free / 2 : 0)
  const chipLeft = buttonBox === null ? null
    : buttonBox.left + Number.parseFloat(style.borderLeftWidth) + paddingLeft + within
  // What the seat takes back when it stands in the row again: half of it is how
  // far the chip's centre would move off the column.
  let seatInRow = null
  if (seat !== null) {
    const was = seat.style.display
    seat.style.display = 'block'
    seatInRow = seat.getBoundingClientRect().width
    seat.style.display = was
  }
  return {
    collapsed: frame !== null && frame.hasAttribute('data-sidebar-collapsed'),
    justify: style.justifyContent,
    chipWidth,
    chipGrow,
    chipCentre: chipLeft === null ? null : chipLeft + chipWidth / 2,
    button: buttonBox,
    seat: box(seat),
    seatInRow,
    toggle: box(column === null ? null : column.querySelector(rail.toggle)),
    glyphs: [...document.querySelectorAll(`${rail.panelRow} ${rail.glyph}`)].map(box).filter((entry) => entry !== null),
    column: box(column),
  }
}, RAIL)

/** Whether every reading stands on the line the collapse toggle gives the column. */
function onTheLine(rail) {
  if (rail.toggle === null || rail.chipCentre === null) return null
  const line = rail.toggle.centre
  const off = [rail.chipCentre, ...rail.glyphs.map((glyph) => glyph.centre)]
    .map((centre) => Math.abs(centre - line))
  return { line, worst: Math.max(...off), glyphs: rail.glyphs.length }
}

function sidebarRailScenario({ check }) {
  return {
    script: 'greeting',
    prompt: 'hello there',
    async beforeSend({ page }) {
      await collapseRail(page)
    },
    async assert({ page, session }) {
      const rail = await readRail(page)
      const line = rail === null ? null : onTheLine(rail)
      const centred = rail !== null && rail.justify === 'center' && rail.chipGrow === '0'
      return [
        check('侧栏已收起，新会话那一格是宿主自己的 36 像素图标按钮',
          rail !== null && rail.collapsed &&
            rail.button !== null && rail.button.width === 36 && Math.round(rail.button.height) === 36,
          JSON.stringify(rail === null ? null : { collapsed: rail.collapsed, button: rail.button })),
        check('宿主那个空的图标座位不再占这一行的宽度，圆片由按钮自己居中',
          rail !== null && rail.seat === null && centred,
          JSON.stringify(rail === null ? null : { seat: rail.seat, justify: rail.justify, chipGrow: rail.chipGrow })),
        check('圆片落在收起按钮与各面板图标同一条中线上',
          line !== null && line.glyphs > 0 && line.worst <= LINE_TOLERANCE_PX,
          JSON.stringify(line)),
        check('座位若放回这一行仍会占住宽度，这条中线因此不是巧合',
          rail !== null && rail.seatInRow !== null && rail.seatInRow >= 8,
          JSON.stringify(rail === null ? null : { seatInRow: rail.seatInRow })),
        check('圆片与中线都在收起的栏内',
          rail !== null && rail.column !== null && rail.chipCentre !== null &&
            rail.chipCentre - rail.chipWidth / 2 >= rail.column.left &&
            rail.chipCentre + rail.chipWidth / 2 <= rail.column.right,
          JSON.stringify(rail === null ? null : { column: rail.column, chipCentre: rail.chipCentre, chipWidth: rail.chipWidth })),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { sidebarRailScenario }
