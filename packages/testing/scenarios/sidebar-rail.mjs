#!/usr/bin/env node
/**
 * sidebar-rail.mjs — the sidebar's rows as one column: the wide column before the
 * collapse, and the collapsed rail as one icon column (D92).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.mjs).
 *
 * The wide reading comes first: the panel rows stand one step apart, the first
 * of them the same distance under the New session plate, and every row's glyph
 * on the column the plate's own chip opens. Both readings are the page's own
 * boxes and compare them against each other, so a host that changes the air it
 * keeps around the list moves no number here.
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
import { bound } from '../bounds.mjs'
import surfaceTable from '../data/surface.json' with { type: 'json' }

/** The skin's part mark, read off the surface table rather than spelled here (D92). */
const PART = surfaceTable.surface.find((entry) => entry.id === 'skin.part').attribute
const part = (name) => `[${PART}~="${name}"]`

/** The host's own classes this scenario reads, the seat the skin keeps out of the row, and the skin's own control, which the rail has no heading to lay over. */
const RAIL = {
  layoutAttribute: surfaceTable.surface.find((entry) => entry.id === 'skin.sidebar-layout').attribute,
  frame: '[data-dsh-claude-part~="layout-frame"]',
  column: '[data-dsh-claude-part~="sidebar-column"]',
  toggle: 'button[data-dsh-claude-part~="sidebar-toggle"]',
  panelList: `nav${part('panel-list')}`,
  panelRow: '[data-dsh-claude-part~="panel-row"]',
  panelEntry: part('panel-entry'),
  glyph: '[data-dsh-claude-part~="panel-glyph"]',
  newSession: 'button[data-dsh-claude-part~="new-session"]',
  seat: '[data-dsh-claude-part~="new-session-mask"]',
  segments: '.dsh-claude-ws-segments',
}

/** How far a control's centre may stand from the column's own line and still read as on it. */
const LINE_TOLERANCE_PX = bound('sidebarRailLineTolerancePx')

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
    // The panel rows as the collapsed host lays them out: its 36px plate, its
    // 12px radius, the 18px glyph it asks for (an svg, or the skin's three-dot
    // box on the more row), and the step between rows.
    panelRows: [...document.querySelectorAll(rail.panelRow)].map((row) => {
      const rect = row.getBoundingClientRect()
      if (!(rect.width > 0 && rect.height > 0)) return null
      const rowStyle = getComputedStyle(row)
      const svg = row.querySelector('svg')
      const svgRect = svg === null ? null : svg.getBoundingClientRect()
      // The more row hides the host's tiles-and-plus glyph and draws the skin's
      // three dots in its place, inside the glyph seat: that box is its glyph.
      const seat = row.querySelector(rail.glyph)
      const dots = seat === null ? null : getComputedStyle(seat, '::before').width
      const glyph = svgRect !== null && svgRect.width > 0 ? Math.round(svgRect.width) : Math.round(Number.parseFloat(dots))
      return {
        top: rect.top,
        bottom: rect.bottom,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        radius: Number.parseFloat(rowStyle.borderTopLeftRadius),
        glyph,
      }
    }).filter((row) => row !== null),
    panelGap: (() => {
      const list = document.querySelector(rail.panelList)
      return list === null ? null : Number.parseFloat(getComputedStyle(list).rowGap)
    })(),
    column: box(column),
    segments: box(document.querySelector(rail.segments)),
  }
}, RAIL)

/**
 * The wide column before the collapse: the New session plate, the chip its row
 * opens with, and every panel row's own box with its glyph seat.
 */
const readWide = (page) => page.evaluate((rail) => {
  const plate = document.querySelector(rail.newSession)
  if (plate === null) return null
  const plateRect = plate.getBoundingClientRect()
  const style = getComputedStyle(plate)
  // The chip is the plate's first item and its row packs at that item's start
  // (theme/sidebar.css), so the chip opens on the plate's own content edge.
  const chipLeft = plateRect.left + Number.parseFloat(style.borderLeftWidth) + Number.parseFloat(style.paddingLeft)
  const rows = []
  for (const row of document.querySelectorAll(rail.panelRow)) {
    const rect = row.getBoundingClientRect()
    const glyph = row.querySelector(rail.glyph)
    if (rect.width === 0 || rect.height === 0 || glyph === null) continue
    const entry = row.closest(rail.panelEntry)
    rows.push({ top: rect.top, height: rect.height, glyphLeft: glyph.getBoundingClientRect().left,
      entryHeight: entry === null ? null : entry.getBoundingClientRect().height })
  }
  return { plateBottom: plateRect.bottom, chipLeft, rows }
}, RAIL)

/**
 * How the wide column reads as one run of rows: the step between two rows, the
 * gap the plate leaves before the first of them, and how far the worst glyph
 * stands from the column the chip opens.
 */
function rowRhythm(wide) {
  if (wide === null || wide.rows.length < 2) return null
  const tops = wide.rows.map((row) => row.top)
  const steps = tops.slice(1).map((top, index) => top - tops[index])
  const step = steps[0]
  const gap = tops[0] - wide.plateBottom
  const rowHeight = wide.rows[0].height
  return {
    rows: wide.rows.length,
    step,
    rowHeight,
    evenSteps: steps.every((value) => Math.abs(value - step) <= LINE_TOLERANCE_PX),
    gap,
    gapUnderPlate: step - rowHeight,
    worstOffColumn: Math.max(...wide.rows.map((row) => Math.abs(row.glyphLeft - wide.chipLeft))),
  }
}

/** Whether every reading stands on the line the collapse toggle gives the column. */
function onTheLine(rail) {
  if (rail.toggle === null || rail.chipCentre === null) return null
  const line = rail.toggle.centre
  const off = [rail.chipCentre, ...rail.glyphs.map((glyph) => glyph.centre)]
    .map((centre) => Math.abs(centre - line))
  return { line, worst: Math.max(...off), glyphs: rail.glyphs.length }
}

function sidebarRailScenario({ check }) {
  /**
   * How many of the skin's workspace controls stand in the sidebar while it is
   * still wide. The rail's reading means something only beside it: a check that
   * finds no control passes on a page where none was ever built.
   */
  let wideSegments = 0
  let wide = null
  const hoveredPlates = []
  return {
    script: 'greeting',
    prompt: 'hello there',
    async beforeSend({ page }) {
      wideSegments = await page.evaluate((rail) => document.querySelectorAll(rail.segments).length, RAIL)
      const original = await page.evaluate((rail) => ({
        dark: document.body.hasAttribute('data-ds-dark-theme'),
        layout: document.body.getAttribute(rail.layoutAttribute),
      }), RAIL)
      for (const dark of [false, true]) {
        for (const layout of ['relaxed', 'compact']) {
          await page.evaluate(([dark, layout, attribute]) => {
            document.body.toggleAttribute('data-ds-dark-theme', dark)
            document.body.setAttribute(attribute, layout)
          }, [dark, layout, RAIL.layoutAttribute])
          await page.locator(`${RAIL.panelEntry} ${RAIL.panelRow}`).first().hover()
          await page.waitForTimeout(400)
          const plate = await page.evaluate((rail) => {
            const entry = document.querySelector(rail.panelEntry)
            const row = entry.querySelector(rail.panelRow)
            return { entryHeight: entry.getBoundingClientRect().height, rowHeight: row.getBoundingClientRect().height,
              entryFill: getComputedStyle(entry).backgroundColor, rowFill: getComputedStyle(row).backgroundColor }
          }, RAIL)
          hoveredPlates.push({ dark, layout, ...plate })
        }
      }
      await page.evaluate(({ dark, layout, attribute }) => {
        document.body.toggleAttribute('data-ds-dark-theme', dark)
        if (layout === null) document.body.removeAttribute(attribute)
        else document.body.setAttribute(attribute, layout)
      }, { ...original, attribute: RAIL.layoutAttribute })
      await page.mouse.move(1, 1)
      await page.waitForTimeout(400)
      // Read while the column is still wide; the collapse follows.
      wide = await readWide(page)
      await collapseRail(page)
    },
    async assert({ page, session }) {
      const rail = await readRail(page)
      const line = rail === null ? null : onTheLine(rail)
      const centred = rail !== null && rail.justify === 'center' && rail.chipGrow === '0'
      const rows = rail === null ? [] : rail.panelRows
      const rhythm = rowRhythm(wide)
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
        check('展开时侧栏里有一件皮肤自己的两档控件',
          wideSegments > 0, JSON.stringify({ wide: wideSegments })),
        check('展开时面板行之间等距，首行与新建会话之间的间隔就是这个行距',
          rhythm !== null && rhythm.evenSteps &&
            Math.abs(rhythm.gap - rhythm.gapUnderPlate) <= LINE_TOLERANCE_PX,
          JSON.stringify(rhythm)),
        check('浅色和深色的两种密度布局悬停时只有容器绘制底板',
          hoveredPlates.length === 4 && hoveredPlates.every((plate) => plate.entryHeight === plate.rowHeight &&
            plate.rowFill === 'rgba(0, 0, 0, 0)' && plate.entryFill !== 'rgba(0, 0, 0, 0)'),
          JSON.stringify(hoveredPlates)),
        check('展开时固定入口的底板与按钮等高，行间距不在底板里面',
          wide !== null && wide.rows.some((row) => row.entryHeight !== null) &&
            wide.rows.every((row) => row.entryHeight === null || row.entryHeight === row.height),
          JSON.stringify(wide?.rows)),
        check('展开时每一行的图标盒都落在新建会话圆片那一列',
          rhythm !== null && rhythm.worstOffColumn <= LINE_TOLERANCE_PX,
          JSON.stringify(rhythm === null ? null : { worstOffColumn: rhythm.worstOffColumn, chip: wide === null ? null : wide.chipLeft })),
        check('面板行随宿主收成 36 像素的图标按钮，圆角是 12 像素',
          rows.length > 0 && rows.every((row) => row.width === 36 && row.height === 36 && row.radius === 12),
          JSON.stringify({ rows })),
        check('面板行里的图标是 18 像素，与下方的添加文件夹和搜索图标同大',
          rows.length > 0 && rows.every((row) => row.glyph === 18),
          JSON.stringify({ glyphs: rows.map((row) => row.glyph) })),
        check('面板行之间隔开 12 像素，宿主自己的步长没有被皮肤的零间距盖住',
          rail !== null && rail.panelGap === 12 && rows.length > 1 &&
            rows.slice(1).every((row, index) => Math.abs(row.top - rows[index].bottom - rail.panelGap) <= LINE_TOLERANCE_PX),
          JSON.stringify(rail === null ? null : { panelGap: rail.panelGap, rows })),
        check('收起成图标栏后这件控件整件离开页面，宿主自己的分区按钮不再被它压住',
          rail !== null && rail.segments === null,
          JSON.stringify(rail === null ? null : { segments: rail.segments })),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { sidebarRailScenario, collapseRail }
