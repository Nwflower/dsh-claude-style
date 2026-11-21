#!/usr/bin/env node
/**
 * narrow-window.mjs — the sidebar and the caption row in a window narrower than
 * 768px (D92).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.mjs).
 *
 * The host keeps the layout frame's three tracks inline. shared/page-scale.css
 * carries a rule that stands over them in a narrow page while the sidebar is a
 * rail or a drawer, and that rule's qualifier decides whether the host's own
 * column stands once the reader expands the rail: the reading here is the
 * frame's computed track list, the list the host wrote inline, the frame's own
 * collapse and drawer marks, and the boxes of the sidebar column and of the
 * sidebar itself.
 *
 * The second reading is the caption row. features/header-band places the title
 * and the header's controls in the window's caption strip, and it answers only
 * where the desktop shell marks the page — the titlebar attribute, the strip's
 * box as `navigator.windowControlsOverlay` publishes it, and the clearance
 * token (packages/engine/src/desktop-band.ts). A browser page carries none of
 * those, so the scenario marks the page the way the shell does and stores the
 * preference through the host, and the pass then runs on the real page.
 *
 * The row is sampled twice at that width, because the pieces the pass places
 * depend on the sidebar's own track: with the rail folded the title's room
 * starts at the window's left end, and with the column open it starts at the
 * column's right edge. Each sample reads, frame by frame, every number the pass
 * writes and the boxes those numbers are painted through, and judges whether
 * they settle: a placement that keeps deciding against its own last answer
 * shows up as a value that never stops moving, which is the flicker the issue
 * reported.
 */
import surfaceTable from '../data/surface.json' with { type: 'json' }

/** The skin's part mark, read off the surface table rather than spelled here (D92). */
const PART = surfaceTable.surface.find((entry) => entry.id === 'skin.part').attribute
const part = (name) => `[${PART}~="${name}"]`

/** The window both readings are taken in: under the 768px the host lays its own tracks into. */
const WINDOW = { width: 752, height: 900 }

/** The narrowest column that reads as the open sidebar rather than its rail (sidebar-peek.mjs's threshold). */
const OPEN_MIN_PX = 200
/** A column this narrow is the rail's own track. */
const RAIL_MAX_PX = 2

/** How many frames the caption row is sampled in, and how many of them stand before the settle window. */
const SAMPLES = 60
const SETTLE_FRAMES = 8

/**
 * Sample the first width where the title fits in the caption row while the
 * sidebar is open. The space begins at the sidebar's right edge and ends at
 * the lifted controls, so the host's measured boxes decide which width fits.
 */
const RAISED_WIDTHS = [800, 900, 1000, 1040, 1080, 1100]

/**
 * The widths the title's lift is swept at, ascending, and the 2px fill between
 * the two steps the header's own token flips between.
 *
 * The header's height changes when the title leaves its row. Walking adjacent
 * widths exposes a placement that repeatedly crosses its own threshold.
 */
const SWEEP_WIDTHS = [800, 810, 820, 830, 840, 850, 860, 870, 880, 890, 900]
const SWEEP_FRAMES = 30
const REFILL_STEP_PX = 2
const REFILL_MAX = 4
/** How long one step may wait for its token and its column to hold still: a step that never settles says so. */
const SWEEP_SETTLE_MS = 2000

/** Sample header heights around the title's lift edge, 2px apart. */
const STEP_WIDTHS = Array.from({ length: 21 }, (_, at) => 850 + at * 2)
/** The declarations a box can hold a height by, read on the header and on every box under it. */
const BOX_STYLES = ['display', 'height', 'min-height', 'padding-top', 'padding-bottom', 'margin-top', 'margin-bottom', 'grid-template-rows']

const NARROW = {
  frame: part('layout-frame'),
  column: `${part('layout-frame')} > ${part('sidebar-column')}`,
  sidebar: `[data-slot="sidebar"] > ${part('sidebar-root')}`,
  toggle: `button${part('sidebar-toggle')}`,
}

/**
 * The caption row's pieces. The header is read by the token the pass writes on
 * it, whichever pieces that token names: at a narrow width the pass can place
 * the control clusters and leave the title in its row, and a reader that only
 * looked for the title's token would report a placed row as untouched.
 */
const BAND = {
  header: '[data-dsh-header-band]',
  row: '[data-dsh-header-row]',
  title: '[data-dsh-header-title]',
  utilities: part('header-utilities'),
  corner: part('header-corner'),
  trail: '[data-dsh-header-trail]',
}

/** The numbers the pass writes on those pieces (packages/client/src/features/header-band/header-band.ts). */
const VARS = {
  top: '--dsh-header-band-top',
  height: '--dsh-header-band-height',
  lift: '--dsh-header-band-row-lift',
  left: '--dsh-header-band-left',
  max: '--dsh-header-band-max',
  titleTop: '--dsh-header-band-title-top',
  right: '--dsh-header-band-right',
}

/**
 * Every quantity one sampled frame carries, under the words a failing check
 * prints: the pieces' boxes, the numbers the pass wrote on them, and the insets
 * and transforms those numbers are painted through.
 */
const SAMPLED = [
  ['头部 --dsh-header-band-top', 'varTop'],
  ['头部 --dsh-header-band-height', 'varHeight'],
  ['头部 padding-top', 'paddingTop'],
  ['头部矩形的 top', 'headerTop'],
  ['头部矩形的 height', 'headerHeight'],
  ['标题行的 --dsh-header-band-row-lift', 'varLift'],
  ['标题行矩形的 left', 'rowLeft'],
  ['标题行矩形的 top', 'rowTop'],
  ['标题行矩形的 height', 'rowHeight'],
  ['标题行的 transform', 'rowTransform'],
  ['标题的 --dsh-header-band-left', 'varLeft'],
  ['标题的 --dsh-header-band-max', 'varMax'],
  ['标题的 --dsh-header-band-title-top', 'varTitleTop'],
  ['标题矩形的 left', 'titleLeft'],
  ['标题矩形的 top', 'titleTop'],
  ['标题矩形的 width', 'titleWidth'],
  ['标题矩形的 height', 'titleHeight'],
  ['控件簇的 --dsh-header-band-right', 'varUtilitiesRight'],
  ['角座控件的 --dsh-header-band-right', 'varCornerRight'],
]

/**
 * The frame as the host drew it: its track list both ways, its own marks, and
 * the boxes of the sidebar column and of the sidebar itself.
 */
const readFrame = (page) => page.evaluate((narrow) => {
  const frame = document.querySelector(narrow.frame)
  const column = document.querySelector(narrow.column)
  const sidebar = document.querySelector(narrow.sidebar)
  const width = (element) => {
    if (element === null) return null
    return Math.round(element.getBoundingClientRect().width * 100) / 100
  }
  return {
    width: window.innerWidth,
    computed: frame === null ? null : getComputedStyle(frame).gridTemplateColumns,
    inline: frame === null ? null : frame.style.gridTemplateColumns,
    collapsed: frame !== null && frame.hasAttribute('data-sidebar-collapsed'),
    drawer: frame !== null && frame.hasAttribute('data-sidebar-drawer'),
    column: width(column),
    sidebar: width(sidebar),
  }
}, NARROW)

/** The first track of a column list, in pixels. */
function firstTrack(list) {
  if (typeof list !== 'string' || list.trim() === '') return null
  const value = Number.parseFloat(list.trim().split(/\s+/)[0])
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null
}

/** Somewhere in the middle of the conversation, clear of the rail's toggle and of its column. */
async function leaveRail(page) {
  await page.mouse.move(Math.round(WINDOW.width * 0.6), Math.round(WINDOW.height / 2))
}

/**
 * Wait for the host's own settle on the sidebar's track: the collapse mark in
 * the state asked for and the column's width unchanged over three consecutive
 * frames. The host eases that width, so a reading taken with the first frame of
 * the move reads a column still on its way. A probe of a width that never
 * settles says so with its own bound rather than holding the walk.
 */
const waitForRail = (page, folded, ms = 8000) => page.evaluate(({ narrow, folded, min, max, ms }) => new Promise((resolve) => {
  const startedAt = performance.now()
  let heldWidth = null
  let heldFrames = 0
  const tick = () => {
    const frame = document.querySelector(narrow.frame)
    const column = document.querySelector(narrow.column)
    const marked = frame !== null && frame.hasAttribute('data-sidebar-collapsed')
    const width = column === null ? 0 : Math.round(column.getBoundingClientRect().width)
    const wanted = folded ? width <= max : width >= min
    heldFrames = marked === folded && wanted && width === heldWidth ? heldFrames + 1 : 0
    heldWidth = width
    if (heldFrames >= 3 || performance.now() - startedAt > ms) {
      resolve({ settled: heldFrames >= 3, folded: marked, width })
      return
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}), { narrow: NARROW, folded, min: OPEN_MIN_PX, max: RAIL_MAX_PX, ms })

/**
 * Press the host's own toggle once and wait for the state it asks for. The
 * pointer leaves the rail straight after the press: a pointer resting on that
 * toggle opens the host's peek, which is a second way into the same column and
 * would hold it open against the press.
 */
async function pressToggle(page, folded) {
  await page.locator(NARROW.toggle).first().click()
  await leaveRail(page)
  const state = await waitForRail(page, folded)
  await page.waitForTimeout(400)
  return state
}

/** The three numbers that say the title left its row, plus the column and the band's own token. */
const readRaised = (page) => page.evaluate(({ narrow, band, vars }) => {
  const frame = document.querySelector(narrow.frame)
  const column = document.querySelector(narrow.column)
  const header = document.querySelector(band.header)
  const title = header === null ? null : header.querySelector(band.title)
  const row = header === null ? null : header.querySelector(band.row)
  const value = (element, name) => {
    if (element === null) return null
    return getComputedStyle(element).getPropertyValue(name).trim() || null
  }
  return {
    width: window.innerWidth,
    column: column === null ? null : Math.round(column.getBoundingClientRect().width),
    collapsed: frame !== null && frame.hasAttribute('data-sidebar-collapsed'),
    band: header === null ? null : header.getAttribute('data-dsh-header-band'),
    varLeft: value(title, vars.left),
    varLift: value(row, vars.lift),
    varTop: value(header, vars.top),
  }
}, { narrow: NARROW, band: BAND, vars: VARS })

/** Whether one probe read the title lifted: the three numbers the pass writes on it are all on the page. */
const isRaised = (read) => read.varLeft !== null && read.varLift !== null && read.varTop !== null

/**
 * Put the window at one width with the sidebar standing open: the host folds its
 * own column in a narrow page, and every reading here stands beside it.
 */
async function openAt(page, width) {
  await page.setViewportSize({ width, height: WINDOW.height })
  const folded = await page.evaluate((narrow) => {
    const frame = document.querySelector(narrow.frame)
    return frame !== null && frame.hasAttribute('data-sidebar-collapsed')
  }, NARROW)
  if (folded) await pressToggle(page, false)
}

/**
 * The first width at which the pass lifts the title while the sidebar's column
 * stands at its open width. The column is opened at each candidate first: the
 * state the issue reports is the two together, and the title's room depends on
 * which column the row starts after.
 */
async function findRaisedWidth(page) {
  const probe = []
  for (const width of RAISED_WIDTHS) {
    await openAt(page, width)
    await waitForRail(page, false, 3000)
    let read = await readRaised(page)
    for (let tries = 0; tries < 12 && !isRaised(read); tries += 1) {
      await page.waitForTimeout(150)
      read = await readRaised(page)
    }
    probe.push({ width, ...read })
    if (isRaised(read) && read.column !== null && read.column >= OPEN_MIN_PX) return { width, probe }
  }
  return { width: null, probe }
}

/** Every candidate width with what the pass wrote there, for one check line. */
const probeLine = (probe) => probe
  .map((entry) => `${entry.width}px[列 ${entry.column}, band ${entry.band}, left ${entry.varLeft}, lift ${entry.varLift}, top ${entry.varTop}]`)
  .join('；')

/**
 * Put the window at one width and wait for that width's own answer: the header's
 * token and the sidebar column's width unchanged over three consecutive frames,
 * or the step's bound.
 */
async function settleWidth(page, width) {
  await openAt(page, width)
  return page.evaluate(({ narrow, band, ms }) => new Promise((resolve) => {
    const startedAt = performance.now()
    let held = null
    let heldFrames = 0
    const tick = () => {
      const frame = document.querySelector(narrow.frame)
      const column = document.querySelector(narrow.column)
      const header = document.querySelector(band.header)
      const marked = frame !== null && frame.hasAttribute('data-sidebar-collapsed')
      const token = header === null ? null : header.getAttribute('data-dsh-header-band')
      const width = column === null ? 0 : Math.round(column.getBoundingClientRect().width)
      const now = `${token}/${width}/${marked}`
      heldFrames = now === held ? heldFrames + 1 : 0
      held = now
      if (heldFrames >= 3 || performance.now() - startedAt > ms) {
        resolve({ settled: heldFrames >= 3, token, width, folded: marked })
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }), { narrow: NARROW, band: BAND, ms: SWEEP_SETTLE_MS })
}

/**
 * Walk the title's lift edge: one sample per width, the 2px fill between the two
 * steps whose token differs, then one more reading at the width the walk started
 * at. A step whose quantities keep changing carries that step's sequences, and
 * the token's own flips count as a change of the same step.
 */
async function sweepEdge(page) {
  const steps = []
  const read = async (width) => {
    const state = await settleWidth(page, width)
    const frames = await sampleBand(page, SWEEP_FRAMES)
    const moving = driftOf(frames)
    const tokens = [...new Set(frames.map((frame) => frame.band))]
    if (tokens.length > 1) {
      moving.push({ label: '头部 data-dsh-header-band', values: frames.map((frame) => frame.band), distinct: tokens,
        period: periodOf(frames.map((frame) => frame.band)) })
    }
    const last = frames[frames.length - 1]
    const step = {
      width,
      token: state.token,
      column: state.width,
      folded: state.folded,
      settled: state.settled,
      max: last.varMax,
      moving,
      last,
      frames,
    }
    steps.push(step)
    return step
  }
  for (const width of SWEEP_WIDTHS) await read(width)
  const flipAt = steps.findIndex((step, at) => at > 0 && step.token !== steps[at - 1].token)
  const filled = []
  if (flipAt > 0) {
    const low = steps[flipAt - 1].width
    const high = steps[flipAt].width
    for (let width = low + REFILL_STEP_PX; width < high && filled.length < REFILL_MAX; width += REFILL_STEP_PX) {
      filled.push((await read(width)).width)
    }
  }
  const start = steps[0]
  const again = await read(start.width)
  const stable = SAMPLED.map(([, key]) => key).filter((key) => again.last[key] !== start.last[key])
  return { steps, flipAt: flipAt > 0 ? [steps[flipAt - 1].width, steps[flipAt].width] : null, filled, again, stable }
}

/** One swept width, for the check line: what the pass wrote there and what kept changing. */
const stepLine = (step) => `${step.width}px[band ${step.token}, 列 ${step.column}, max ${step.max}, ` +
  `变化 ${step.moving.length}${step.moving.length === 0 ? '' : `：${step.moving.map((entry) => `${entry.label} ${entry.distinct.join('↔')} 周期 ${entry.period === null ? '不定' : `${entry.period} 帧`}`).join('；')}`}]`

/** The header and every box that can hold its height, with the declarations that hold it. */
const readStep = (page) => page.evaluate(({ band, vars, properties }) => {
  const number = (element, name) => (element === null ? null : getComputedStyle(element).getPropertyValue(name).trim() || null)
  const describe = (element) => {
    if (element === null) return { absent: true }
    const rect = element.getBoundingClientRect()
    const computed = getComputedStyle(element)
    const styles = {}
    for (const property of properties) styles[property] = computed.getPropertyValue(property)
    const classes = typeof element.className === 'string' ? element.className.trim().split(/\s+/)[0] : ''
    return { node: `${element.tagName.toLowerCase()}.${classes}`, width: Math.round(rect.width * 100) / 100,
      height: Math.round(rect.height * 100) / 100, top: Math.round(rect.top * 100) / 100, styles }
  }
  const header = document.querySelector(band.header)
  const where = (selector) => (header === null ? null : header.querySelector(selector))
  return {
    width: window.innerWidth,
    token: header === null ? null : header.getAttribute('data-dsh-header-band'),
    max: number(where(band.title), vars.max),
    header: describe(header),
    children: [...(header === null ? [] : header.children)].map(describe),
    row: describe(where(band.row)),
    title: describe(where(band.title)),
    utilities: describe(where(band.utilities)),
    corner: describe(where(band.corner)),
    trail: describe(where(band.trail)),
    rowChildren: [...((where(band.row)?.children) ?? [])].map(describe),
  }
}, { band: BAND, vars: VARS, properties: BOX_STYLES })

/** The box dump at every 2px width of the step's neighbourhood, and where the header's own height moves. */
async function scanStep(page) {
  const steps = []
  for (const width of STEP_WIDTHS) {
    await settleWidth(page, width)
    steps.push(await readStep(page))
  }
  const at = steps.findIndex((step, index) => index > 0 && step.header.height !== steps[index - 1].header.height)
  return { steps, at }
}

/** Every field two dumps disagree on, named by its node and its property. */
function boxChanges(before, after) {
  const rows = []
  const compare = (name, one, other) => {
    if (one === undefined || other === undefined) return
    if (one.absent === true || other.absent === true) {
      if (one.absent !== other.absent) rows.push(`${name} 的标记：${before.width}px ${one.absent === true ? '无' : '有'} → ${after.width}px ${other.absent === true ? '无' : '有'}`)
      return
    }
    for (const field of ['node', 'width', 'height', 'top']) if (one[field] !== other[field]) rows.push(`${name} ${field}: ${JSON.stringify(one[field])} → ${JSON.stringify(other[field])}`)
    for (const property of Object.keys(one.styles)) if (one.styles[property] !== other.styles[property]) rows.push(`${name} ${property}: ${one.styles[property]} → ${other.styles[property]}`)
  }
  for (const name of ['header', 'row', 'title', 'utilities', 'corner', 'trail']) compare(name, before[name], after[name])
  before.rowChildren.forEach((child, at) => compare(`标题行子元素 ${at}`, before.rowChildren[at], after.rowChildren[at]))
  before.children.forEach((child, at) => compare(`头部子元素 ${at}`, before.children[at], after.children[at]))
  return rows
}

/** Wait until the pass has lifted the title: the header's title stamp and the row's lift are both on the page. */
const waitForTitleLift = (page) => page.waitForFunction(({ band, vars }) => {
  const header = document.querySelector(band.header)
  if (header === null) return false
  const row = header.querySelector(band.row)
  const title = header.querySelector(band.title)
  return row !== null && title !== null &&
    getComputedStyle(row).getPropertyValue(vars.lift).trim() !== '' &&
    getComputedStyle(title).getPropertyValue(vars.left).trim() !== ''
}, { band: BAND, vars: VARS }, { timeout: 8000 }).then(() => true, () => false)

/**
 * One reading per animation frame of everything the pass writes, with the boxes
 * the numbers are painted on: a value that repeats while its box moves, or a box
 * that moves while its value repeats, is one frame of a placement still deciding.
 */
const sampleBand = (page, count) => page.evaluate(({ band, vars, count }) => new Promise((resolve) => {
  const number = (element, name) => {
    if (element === null) return null
    const value = getComputedStyle(element).getPropertyValue(name).trim()
    return value === '' ? null : value
  }
  const round = (value) => Math.round(value * 100) / 100
  const rect = (element) => (element === null ? null : element.getBoundingClientRect())
  const read = (at) => {
    const header = document.querySelector(band.header)
    const where = (selector) => (header === null ? null : header.querySelector(selector))
    const row = where(band.row)
    const title = where(band.title)
    const utilities = where(band.utilities)
    const corner = where(band.corner)
    const headerBox = rect(header)
    const rowBox = rect(row)
    const titleBox = rect(title)
    return {
      t: Math.round(at),
      band: header === null ? null : header.getAttribute('data-dsh-header-band'),
      varTop: number(header, vars.top),
      varHeight: number(header, vars.height),
      paddingTop: header === null ? null : getComputedStyle(header).paddingTop,
      headerTop: headerBox === null ? null : round(headerBox.top),
      headerHeight: headerBox === null ? null : round(headerBox.height),
      varLift: number(row, vars.lift),
      rowLeft: rowBox === null ? null : round(rowBox.left),
      rowTop: rowBox === null ? null : round(rowBox.top),
      rowHeight: rowBox === null ? null : round(rowBox.height),
      rowTransform: row === null ? null : getComputedStyle(row).transform,
      varLeft: number(title, vars.left),
      varMax: number(title, vars.max),
      varTitleTop: number(title, vars.titleTop),
      titleLeft: titleBox === null ? null : round(titleBox.left),
      titleTop: titleBox === null ? null : round(titleBox.top),
      titleWidth: titleBox === null ? null : round(titleBox.width),
      titleHeight: titleBox === null ? null : round(titleBox.height),
      varUtilitiesRight: number(utilities, vars.right),
      varCornerRight: number(corner, vars.right),
    }
  }
  const frames = []
  const tick = (at) => {
    frames.push(read(at))
    if (frames.length < count) requestAnimationFrame(tick)
    else resolve(frames)
  }
  requestAnimationFrame(tick)
}), { band: BAND, vars: VARS, count })

/** The shortest run of frames after which a sequence repeats itself, or null while no run repeats it. */
function periodOf(values) {
  for (let span = 1; span <= Math.floor(values.length / 2); span += 1) {
    if (values.every((value, at) => at + span >= values.length || value === values[at + span])) return span
  }
  return null
}

/**
 * The quantities that keep changing after the settle window, each with the
 * values it takes and the run it repeats in. Order is the sample's own, so the
 * first entry is the value at the head of the caption row.
 */
function driftOf(frames) {
  const settled = frames.slice(SETTLE_FRAMES)
  const moving = []
  for (const [label, key] of SAMPLED) {
    const values = settled.map((frame) => frame[key])
    const last = values[values.length - 1]
    if (values.every((value) => value === last)) continue
    moving.push({ label, values, distinct: [...new Set(values)], period: periodOf(values) })
  }
  return moving
}

/** The values one quantity holds in the settled run, written short enough for one check line. */
function sequence(entry) {
  const head = entry.values.slice(0, 10).join(' → ')
  const tail = entry.values.slice(-3).join(' → ')
  return `${entry.label}：${head} … ${tail}（共 ${entry.distinct.length} 个值，周期 ${entry.period === null ? '不定' : `${entry.period} 帧`}）`
}

/** The pieces one reading of the row carries, short enough for one check line. */
function drawn(frame) {
  return ['varTop', 'varHeight', 'paddingTop', 'headerTop', 'headerHeight', 'varLift', 'rowLeft', 'rowTop', 'rowHeight',
    'varLeft', 'varMax', 'titleTop', 'titleWidth', 'varUtilitiesRight', 'varCornerRight']
    .map((key) => `${key}=${frame[key]}`).join(' ')
}

function narrowWindowScenario({ check, observe }) {
  return {
    script: 'greeting',
    prompt: 'hello there',
    viewport: { ...WINDOW },
    /** The preference travels the host's own path, as the statistics' line does (stats-position.mjs). */
    patch: [
      '- id: ui-skin-claude-style',
      '  config:',
      '    headerBand: true',
    ],
    /**
     * The desktop shell's marks, in place before the page's first script: a
     * browser page publishes no caption overlay, so without them the pass reads
     * the page as a web page and places nothing. The strip's box is 40px tall
     * and its three caption buttons take 140px at the right edge, which is the
     * fallback packages/engine/src/desktop-band.ts carries for a Windows window.
     */
    initScript: () => {
      // The overlay answers with the strip's box in the window's own pixels, so
      // the caption buttons' reserve follows the viewport as the reader resizes.
      // The two figures are what packages/engine/src/desktop-band.ts falls back
      // to on a Windows window: a 40px strip and three buttons taking 140px.
      const stripHeight = 40
      const captionButtons = 140
      const stripBox = () => new DOMRect(0, 0, window.innerWidth - captionButtons, stripHeight)
      const overlay = new EventTarget()
      overlay.visible = true
      overlay.getTitlebarAreaRect = stripBox
      Object.defineProperty(navigator, 'windowControlsOverlay', { configurable: true, value: overlay })
      const mark = () => {
        const root = document.documentElement
        if (root === null) {
          requestAnimationFrame(mark)
          return
        }
        root.setAttribute('data-windows-titlebar', '')
        root.style.setProperty('--dsh-windows-titlebar-height', `${stripHeight}px`)
        root.style.setProperty('--dsh-frame-top-clearance', `${stripHeight}px`)
      }
      requestAnimationFrame(mark)
    },
    async beforeSend({ page, notes }) {
      // The host folds the sidebar itself in a window this narrow, so the first
      // reading waits for that fold rather than reading a page still laying out.
      await waitForRail(page, true).catch(() => {})
      await page.waitForTimeout(600)
      notes.collapsed = await readFrame(page)
      notes.expand = await pressToggle(page, false)
      notes.expanded = await readFrame(page)
    },
    async assert({ page, session, notes }) {
      const collapsed = notes.collapsed
      const expanded = await readFrame(page)
      notes.settledFrame = expanded
      const open = await sampleBand(page, SAMPLES)
      notes.framesOpen = open
      // The same window with the rail folded: the row's own left edge is the
      // window's end of the grid, which is where the title's room starts.
      notes.fold = await pressToggle(page, true)
      const folded = await readFrame(page)
      notes.foldedFrame = folded
      notes.titleLifted = await waitForTitleLift(page)
      const shut = await sampleBand(page, SAMPLES)
      notes.framesFolded = shut
      // The third state: the title in the caption row and the sidebar's column
      // open at once, at the first width where the pass really lifts it (see
      // RAISED_WIDTHS). This is the state the issue's symptom lives in.
      const raised = await findRaisedWidth(page)
      notes.probe = raised.probe
      notes.raisedWidth = raised.width
      const above = raised.width === null ? [] : await sampleBand(page, SAMPLES)
      notes.framesRaised = above
      // Back to the window the reported state is measured in, so a reading taken
      // after this walk sees the size it was taken at.
      await page.setViewportSize({ ...WINDOW })
      await page.waitForTimeout(400)
      // Then the lift edge itself, step by step: the two inputs the pass could
      // decide by each other meet here, and only here.
      const edge = await sweepEdge(page)
      notes.edge = {
        flipAt: edge.flipAt,
        filled: edge.filled,
        reRead: { width: edge.again.width, stable: edge.stable, last: edge.again.last },
        steps: edge.steps.map((step) => ({
          width: step.width, token: step.token, column: step.column, folded: step.folded, settled: step.settled,
          max: step.max,
          utilitiesRight: step.last.varUtilitiesRight, cornerRight: step.last.varCornerRight,
          rowLeft: step.last.rowLeft, titleWidth: step.last.titleWidth, headerHeight: step.last.headerHeight,
          paddingTop: step.last.paddingTop,
          moving: step.moving.map((entry) => ({ label: entry.label, distinct: entry.distinct, period: entry.period,
            head: entry.values.slice(0, 8), tail: entry.values.slice(-3) })),
        })),
      }
      const swept = edge.steps.filter((step) => step.moving.length > 0)
      // The one step the sweep could not explain: which node and which declaration moved there.
      const step = await scanStep(page)
      const low = step.at > 0 ? step.steps[step.at - 1] : null
      const high = step.at > 0 ? step.steps[step.at] : null
      const changed = low === null ? [] : boxChanges(low, high)
      notes.step = {
        edge: low === null ? null : [low.width, high.width], changed,
        table: step.steps.map((entry) => ({ width: entry.width, token: entry.token, max: entry.max,
          headerHeight: entry.header.height, children: entry.children.map((child) => (child.absent === true ? null : `${child.node} ${child.width}×${child.height}`)) })),
        boxes: low === null ? null : { before: low, after: high },
      }
      await page.setViewportSize({ ...WINDOW })
      await page.waitForTimeout(300)
      const moving = [...driftOf(open), ...driftOf(shut)]
      const movingRaised = driftOf(above)
      const hostTrack = firstTrack(expanded.inline)
      const placed = open[0].band !== null && open[0].band !== '' &&
        open[0].varUtilitiesRight !== null && open[0].varCornerRight !== null
      const lifted = notes.titleLifted === true && shut[0].varLeft !== null && shut[0].varMax !== null &&
        shut[0].varLift !== null && shut[0].varTop !== null
      return [
        check('窗口是 752 像素宽，列的条数是宿主自己内联写的那一条',
          collapsed !== undefined && collapsed.width === WINDOW.width &&
            collapsed.inline !== null && collapsed.inline !== '' && collapsed.computed !== null,
          JSON.stringify({ width: collapsed?.width, inline: collapsed?.inline, computed: collapsed?.computed })),
        check('窄窗口下侧栏先由宿主收起，侧栏列就贴在 0 上',
          collapsed !== undefined && collapsed.collapsed === true && collapsed.column !== null && collapsed.column <= RAIL_MAX_PX,
          JSON.stringify(collapsed)),
        check('窄窗口里侧栏展开后仍占满自己的宽度',
          expanded.collapsed === false && expanded.column !== null && expanded.column >= OPEN_MIN_PX &&
            (hostTrack === null || Math.abs(expanded.column - hostTrack) <= 1) &&
            (expanded.sidebar === null || expanded.sidebar >= OPEN_MIN_PX),
          JSON.stringify({ collapsed: notes.expand, folded: notes.fold, frame: expanded, hostTrack })),
        check('窄窗口里侧栏展开时，顶栏放置仍然落在头部与两个控件簇上',
          placed,
          `band=${open[0].band} 头部 top=${open[0].headerTop} height=${open[0].headerHeight} ` +
            `控件簇 right=${open[0].varUtilitiesRight} 角座 right=${open[0].varCornerRight}`),
        check('顶栏放置在一段采样里落定后不再改变',
          open.length >= 40 && shut.length >= 40 && moving.length === 0,
          `侧栏展开 ${open.length} 帧、侧栏收起 ${shut.length} 帧，第 ${SETTLE_FRAMES} 帧之后判落定，仍在变化的量 ${moving.length} 个；` +
            `展开末帧 ${drawn(open[open.length - 1])}；收起末帧 ${drawn(shut[shut.length - 1])}` +
            (moving.length === 0 ? '' : `\n      ${moving.map(sequence).join('\n      ')}`)),
        check('侧栏展开且标题抬进顶栏的那一态，顶栏放置同样落定在一段采样里',
          raised.width !== null && above.length >= 40 && movingRaised.length === 0,
          raised.width === null
            ? `1100px 以内没有哪个宽度把标题抬进顶栏：${probeLine(raised.probe)}`
            : `宽度 ${raised.width}px 上侧栏列 ${raised.probe[raised.probe.length - 1].column}，采样 ${above.length} 帧，` +
              `第 ${SETTLE_FRAMES} 帧之后判落定，仍在变化的量 ${movingRaised.length} 个；末帧 ${drawn(above[above.length - 1])}` +
              (movingRaised.length === 0 ? '' : `\n      ${movingRaised.map(sequence).join('\n      ')}`)),
        check('标题抬升的边界上没有一档让顶栏放置持续改变',
          swept.length === 0,
          `扫了 ${edge.steps.length} 档（10px 档 ${SWEEP_WIDTHS.length} 个、2px 补扫 ${edge.filled.length} 个、回读 1 个），` +
            `token 翻转在 ${edge.flipAt === null ? '未出现' : `${edge.flipAt[0]}→${edge.flipAt[1]}px`}，` +
            `仍在变化的档 ${swept.length} 个；回读 ${edge.again.width}px 与首次${edge.stable.length === 0 ? '一致' : `不同：${edge.stable.join('、')}`}` +
            (swept.length === 0 ? '' : `\n      ${swept.map(stepLine).join('\n      ')}`)),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
        observe('标题抬升的边界每一档的读数',
          edge.stable.length === 0 && edge.steps.every((step) => step.settled && step.column >= OPEN_MIN_PX),
          `${edge.steps.map(stepLine).join('\n      ')}`),
        observe('侧栏展开时标题抬升附近的头部高度变化落到了具体节点与属性', low !== null && changed.length > 0,
          low === null ? '这 21 档里头部高度没有台阶' : `${low.width}px 头部 ${low.header.height}px、${high.width}px 头部 ${high.header.height}px；max ${low.max} → ${high.max}；变化的字段：${changed.join('；')}`),
        observe('侧栏收起后标题也抬进顶栏，头部按量到的内缩关闭、标题行按量到的抬升抬起',
          lifted,
          `band=${shut[0].band} left=${shut[0].varLeft} max=${shut[0].varMax} titleTop=${shut[0].varTitleTop} ` +
            `rowLift=${shut[0].varLift} headerTop=${shut[0].headerTop} paddingTop=${shut[0].paddingTop} ` +
            `rowLeft=${shut[0].rowLeft} rowTop=${shut[0].rowTop} rowHeight=${shut[0].rowHeight} ` +
            `titleBox=${shut[0].titleWidth}x${shut[0].titleHeight}`),
      ]
    },
  }
}

export { narrowWindowScenario }
