#!/usr/bin/env node
/**
 * sidebar-track.mjs — the first track a collapsed sidebar closes to, told apart
 * by the shell the page runs in (D92).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.mjs).
 *
 * packages/client/src/shared/page-scale.css restates the frame's tracks under
 * 1000px, and the collapsed track depends on what the shell draws there: an
 * application window folds the sidebar away and leaves no rail behind, while a
 * browser page keeps the host's 56px icon rail in the same column. The two rules
 * are one pair under `html:is([data-windows-titlebar], [data-platform="darwin"])`
 * and its negation, so a page whose `html` carries neither mark must keep the
 * rail, and a page carrying the Windows caption row's mark must lose it. The
 * marks come from the desktop shell alone (packages/contracts/src/table.ts:
 * `shell.windows-titlebar`, `shell.platform`).
 *
 * The window is 800px wide: under the host's 1000px track restating and above its
 * 768px auto-collapse, so this scenario collapses the sidebar with the host's own
 * toggle and the pair of rules above is the one that decides the track.
 */
import { surfaceAttribute } from '../surface.mjs'

/** The skin's part mark, read off the surface table rather than spelled here (D92). */
const PART = surfaceAttribute('skin.part')
const part = (name) => `[${PART}~="${name}"]`

/** The window these three readings are taken in: under 1000px, above 768px. */
const WINDOW = { width: 800, height: 900 }

/** The host's own icon rail in a browser page, and the widest track that still reads as folded away. */
const RAIL_TRACK_PX = 56
const FOLDED_MAX_PX = 2
/** The narrowest column that reads as the open sidebar. */
const OPEN_MIN_PX = 200

const TRACK = {
  frame: part('layout-frame'),
  column: `${part('layout-frame')} > ${part('sidebar-column')}`,
  sidebar: `[data-slot="sidebar"] > ${part('sidebar-root')}`,
  toggle: `button${part('sidebar-toggle')}`,
  row: part('panel-row'),
  entry: part('panel-entry'),
  glyph: part('panel-glyph'),
}

/** The shell marks the two rules stand on, and the height token the Windows one is read with. */
const SHELL = {
  windows: 'data-windows-titlebar',
  platform: 'data-platform',
  stripHeight: 40,
  captionButtons: 140,
}

/** The first track of a column list, in pixels; null while the frame declares none. */
function firstTrack(list) {
  const head = typeof list === 'string' ? list.trim().split(/\s+/)[0] : ''
  const value = Number.parseFloat(head)
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null
}

/**
 * One reading of the frame's first track and of what the sidebar column holds:
 * both track lists, the two boxes, every icon box the rail draws, and the band
 * the column keeps empty past its content (the column's width less the right
 * edge of the furthest box inside it).
 */
const readTrack = (page) => page.evaluate((track) => {
  const frame = document.querySelector(track.frame)
  const column = document.querySelector(track.column)
  const sidebar = document.querySelector(track.sidebar)
  const round = (value) => Math.round(value * 100) / 100
  const box = (element) => {
    if (element === null) return null
    const rect = element.getBoundingClientRect()
    return { left: round(rect.left), right: round(rect.right), width: round(rect.width), height: round(rect.height) }
  }
  const columnBox = box(column)
  const iconBoxes = [...document.querySelectorAll(`${track.row}, ${track.entry}, ${track.glyph}`)]
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 0)
  const inner = column === null ? [] : [...column.querySelectorAll('*')]
    .map((element) => ({ node: element.tagName.toLowerCase(), rect: element.getBoundingClientRect() }))
    .filter(({ rect }) => rect.width > 1 && rect.height > 1)
  // What the column keeps uncovered: every box inside it counts only up to the
  // column's own edge, since a folded column clips the rail content it no longer
  // shows, and a box reaching past the edge cannot widen the band.
  const contentRight = inner.length === 0 || columnBox === null ? null
    : round(Math.max(...inner.map(({ rect }) => Math.min(rect.right, columnBox.right))) - columnBox.left)
  return {
    computed: frame === null ? null : getComputedStyle(frame).gridTemplateColumns,
    clipping: {
      column: column === null ? null : `${getComputedStyle(column).overflowX}/${getComputedStyle(column).overflowY}`,
      sidebar: sidebar === null ? null : `${getComputedStyle(sidebar).overflowX}/${getComputedStyle(sidebar).overflowY}`,
    },
    inline: frame === null ? null : frame.style.gridTemplateColumns,
    collapsed: frame !== null && frame.hasAttribute('data-sidebar-collapsed'),
    drawer: frame !== null && frame.hasAttribute('data-sidebar-drawer'),
    width: window.innerWidth,
    windows: document.documentElement.hasAttribute(track.windows),
    platform: document.documentElement.getAttribute(track.platform),
    column: columnBox,
    sidebar: box(sidebar),
    icons: iconBoxes.length,
    iconWidths: iconBoxes.slice(0, 4).map((rect) => round(rect.width)),
    content: inner.length,
    // Boxes the folded column cuts off: the rail content the host still builds.
    protruding: columnBox === null ? [] : inner
      .filter(({ rect }) => rect.right > columnBox.right + 1)
      .slice(0, 4)
      .map(({ node, rect }) => `${node} ${round(rect.width)}@${round(rect.left)}`),
    // The band no visible box inside the column covers: the column's own width
    // when it holds nothing, so a folded column reads as no band at all.
    emptyBand: columnBox === null ? null : round(columnBox.width - (contentRight ?? 0)),
  }
}, { ...TRACK, windows: SHELL.windows, platform: SHELL.platform })

/**
 * Wait for the host's own settle on that column: the collapse mark, the first
 * track and the column's width unchanged over three consecutive frames.
 */
const settleTrack = (page) => page.evaluate((track) => new Promise((resolve) => {
  const startedAt = performance.now()
  let held = null
  let heldFrames = 0
  const tick = () => {
    const frame = document.querySelector(track.frame)
    const column = document.querySelector(track.column)
    const marked = frame !== null && frame.hasAttribute('data-sidebar-collapsed')
    const list = frame === null ? '' : getComputedStyle(frame).gridTemplateColumns
    const width = column === null ? 0 : Math.round(column.getBoundingClientRect().width)
    const now = `${marked}/${list}/${width}`
    heldFrames = now === held ? heldFrames + 1 : 0
    held = now
    if (heldFrames >= 3 || performance.now() - startedAt > 8000) {
      resolve({ settled: heldFrames >= 3, marked, list, width })
      return
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}), TRACK)

/** Somewhere in the conversation, clear of the rail's toggle. */
const leaveRail = (page) => page.mouse.move(Math.round(WINDOW.width * 0.6), Math.round(WINDOW.height / 2))

/** Press the host's own toggle and wait for the sidebar to stand folded or open; the pointer leaves the rail first. */
async function pressToggle(page, folded) {
  const marked = await page.evaluate((track) => {
    const frame = document.querySelector(track.frame)
    return frame !== null && frame.hasAttribute('data-sidebar-collapsed')
  }, TRACK)
  if (marked !== folded) await page.locator(TRACK.toggle).first().click()
  await leaveRail(page)
  const state = await settleTrack(page)
  await page.waitForTimeout(400)
  return state
}

/**
 * Mark the page the way the desktop shell marks it: the Windows caption row on
 * `html` and the strip's box as the overlay publishes it, which is the pair the
 * page-scale rule and packages/engine/src/desktop-band.ts read.
 */
const markDesktop = (page) => page.evaluate((shell) => {
  const root = document.documentElement
  root.setAttribute(shell.windows, '')
  root.style.setProperty('--dsh-windows-titlebar-height', `${shell.stripHeight}px`)
  root.style.setProperty('--dsh-frame-top-clearance', `${shell.stripHeight}px`)
  const overlay = new EventTarget()
  overlay.visible = true
  overlay.getTitlebarAreaRect = () => new DOMRect(0, 0, window.innerWidth - shell.captionButtons, shell.stripHeight)
  Object.defineProperty(navigator, 'windowControlsOverlay', { configurable: true, value: overlay })
}, SHELL)

function sidebarTrackScenario({ check }) {
  return {
    script: 'greeting',
    prompt: 'hello there',
    viewport: { ...WINDOW },
    async assert({ page, session, notes }) {
      // 1. A browser page: `html` carries neither shell mark, and the host's rail stays.
      const browserFold = await pressToggle(page, true)
      const browser = await readTrack(page)
      notes.browser = { fold: browserFold, ...browser }
      // 2. The same window as an application window: the Windows caption row's mark.
      await markDesktop(page)
      const appFold = await settleTrack(page)
      await page.waitForTimeout(400)
      const app = await readTrack(page)
      notes.app = { fold: appFold, ...app }
      // 3. And the column opens again at the host's own width.
      const open = await pressToggle(page, false)
      const expanded = await readTrack(page)
      notes.expanded = { open, ...expanded }
      const browserTrack = firstTrack(browser.computed)
      const appTrack = firstTrack(app.computed)
      const hostTrack = firstTrack(expanded.inline)
      return [
        check('浏览器页面里收起后仍是 56 像素的图标栏，栏里有内容',
          browser.windows === false && browser.platform === null && browser.collapsed === true &&
            browserTrack === RAIL_TRACK_PX && browser.column !== null &&
            Math.abs(browser.column.width - RAIL_TRACK_PX) <= 1 && browser.icons > 0,
          JSON.stringify({ computed: browser.computed, inline: browser.inline, column: browser.column,
            icons: browser.icons, iconWidths: browser.iconWidths, content: browser.content, drawer: browser.drawer })),
        check('应用窗口里收起的侧栏不占宽度，也没有那条空带',
          app.windows === true && app.collapsed === true && appTrack === 0 &&
            app.column !== null && app.column.width <= FOLDED_MAX_PX && app.icons === 0 &&
            app.emptyBand !== null && app.emptyBand <= FOLDED_MAX_PX,
          JSON.stringify({ computed: app.computed, inline: app.inline, column: app.column, sidebar: app.sidebar,
            icons: app.icons, content: app.content, protruding: app.protruding, clipping: app.clipping,
            emptyBand: app.emptyBand, drawer: app.drawer })),
        check('应用窗口里展开后侧栏仍占满自己的宽度',
          expanded.collapsed === false && expanded.column !== null && expanded.column.width >= OPEN_MIN_PX &&
            (hostTrack === null || Math.abs(expanded.column.width - hostTrack) <= 1),
          JSON.stringify({ open, computed: expanded.computed, inline: expanded.inline, hostTrack,
            column: expanded.column, sidebar: expanded.sidebar })),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { sidebarTrackScenario }
