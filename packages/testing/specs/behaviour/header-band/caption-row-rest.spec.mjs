/**
 * The conversation header's title row in the Windows caption row, on a header the
 * shell's own marks put there. A pass reads the layout the pass before it wrote,
 * so the numbers it decides on move by the few pixels of its own placement: this
 * reads whether the caption row comes to rest, and whether the row it raised is
 * handed back whole when the title no longer fits there.
 *
 * @capability header-band
 * @features header-band
 * @risk The caption row answers its own threshold both ways as passes run, so the header and its title flicker between two layouts while the window stands still; or a rise left on the row outlives the title, and the next lift stands the row a lift too high.
 */
import { HEADER_PARTS } from '@dsh-claude-style/engine/parts-table'
import { host, spec, surface } from '../../fixtures/behaviour.mjs'
import { partClass } from '../../fixtures/parts.mjs'

const PART = surface.attribute('skin.part')
const TOKENS = surface.attribute('header-band.tokens')
const ROW_STAMP = surface.attribute('header-band.row')
const ROW_LIFT = surface.property('header-band.row-lift')
const HEADER_TOP = surface.property('header-band.top')
const WINDOWS = host('shell.windows-titlebar')
/** The slot the host mounts the conversation header in. */
const SLOT = host.attributes('shell.header-slot')
/** The host's own marks on the view tablist. */
const TABLIST = host.attributes('header.conversation-tabs')
/** The host's classes for the header and every part of its row, as the parts walk reads them. */
const CLASSES = {
  header: partClass(HEADER_PARTS, 'conversation-header'),
  row: partClass(HEADER_PARTS, 'title-row'),
  cluster: partClass(HEADER_PARTS, 'title-cluster'),
  title: partClass(HEADER_PARTS, 'header-title'),
  trail: partClass(HEADER_PARTS, 'header-actions'),
  utilities: partClass(HEADER_PARTS, 'header-utilities'),
  corner: partClass(HEADER_PARTS, 'header-corner'),
  tabs: partClass(HEADER_PARTS, 'view-tabs'),
  tablist: partClass(HEADER_PARTS, 'view-tabs-list'),
}
/** The row's own parts, by the marks the walk writes on them. */
const TITLE_ROW = '[' + PART + '~="title-row"]'
const TITLE = '[' + PART + '~="header-title"]'
const TRAIL = '[' + PART + '~="header-actions"]'
/** The Windows caption row the stand-in shell reports: three buttons and a 40px strip. */
const BAND = 40
const CONTROLS = 140
/** Where the host's conversation column starts: under the caption row, as the desktop shell draws it. */
const COLUMN_TOP = 40
/** The host's own top inset for the row, which the pass stands over once it closes the header. */
const INSET = 10
const TITLE_HEIGHT = 28
/** The row's own top once it stands on the caption row's line: the title box's lower edge. */
const ROW_LINE = BAND / 2 + TITLE_HEIGHT / 2
const HEADER = 'specHeader'

/** Mount the desktop shell's two answers and a header shaped the way the host draws it. */
async function mount(t) {
  await t.page.evaluate(([windows, band, controls, columnTop, inset, titleHeight, id, slot, tablist, classes]) => {
    document.documentElement.setAttribute(windows, '')
    document.documentElement.style.setProperty('--dsh-windows-titlebar-height', band + 'px')
    Object.defineProperty(navigator, 'windowControlsOverlay', {
      configurable: true,
      value: Object.assign(new EventTarget(), {
        visible: true,
        getTitlebarAreaRect: () => ({
          x: 0, y: 0, width: window.innerWidth - controls, height: band,
          top: 0, left: 0, right: window.innerWidth - controls, bottom: band,
        }),
      }),
    })
    const element = (tag, name, style) => {
      const node = document.createElement(tag)
      node.className = name
      node.style.cssText = style
      return node
    }
    const header = element('header', classes.header, 'position:fixed;left:0;top:' + columnTop + 'px;width:100%;display:block;padding-top:' + inset + 'px')
    header.id = id
    for (const [name, value] of slot) header.setAttribute(name, value)
    // The host's own row: the title and the cluster beside it take the room, the
    // two control clusters stand at its end, and the tab strip has a row below.
    const row = element('div', classes.row, 'display:flex;align-items:center;width:100%;height:30px')
    const cluster = element('div', classes.cluster, 'display:flex;align-items:center;flex:1 1 0%;gap:10px;min-width:0')
    const title = element('nav', classes.title, 'display:flex;height:' + titleHeight + 'px;overflow:hidden')
    title.textContent = 'Session title'
    const trail = element('div', classes.trail, 'width:60px;height:' + titleHeight + 'px')
    trail.textContent = 'Preset'
    cluster.append(title, trail)
    const utilities = element('div', classes.utilities, 'display:flex;width:114px;height:28px')
    const corner = element('div', classes.corner, 'width:28px;height:28px')
    row.append(cluster, utilities, corner)
    const tabs = element('div', classes.tabs, '')
    const list = element('div', classes.tablist, 'width:152px;height:26px')
    list.setAttribute('role', 'tablist')
    for (const [name, value] of tablist) list.setAttribute(name, value)
    tabs.append(list)
    header.append(row, tabs)
    document.body.insertBefore(header, document.body.firstChild)
  }, [WINDOWS, BAND, CONTROLS, COLUMN_TOP, INSET, TITLE_HEIGHT, HEADER, SLOT, TABLIST, CLASSES])
  await t.settle()
}

/**
 * A style a pass cannot hear: the skin's observer reads the page's tree and its
 * two `aria-` marks, so a box that moves needs a pass asked for.
 */
async function place(t, patch) {
  await t.page.evaluate(([id, trail, patch]) => {
    const header = document.getElementById(id)
    if (patch.left !== undefined) header.style.left = patch.left
    if (patch.top !== undefined) header.style.top = patch.top
    if (patch.trail !== undefined) header.querySelector(trail).style.width = patch.trail + 'px'
  }, [HEADER, TRAIL, patch])
  await t.page.evaluate(() => window.__dshClaudePass())
  await t.settle()
}

/** What the reader sees: where the title stands, and the row the pass raised under it. */
const read = (t) => t.page.evaluate(([id, rowSelector, titleSelector, trailSelector, tokens, stamp, lift, top]) => {
  const header = document.getElementById(id)
  const row = header.querySelector(rowSelector)
  const title = header.querySelector(titleSelector)
  const trail = header.querySelector(trailSelector)
  const box = (element) => element.getBoundingClientRect()
  const line = (element) => Math.round(box(element).top + box(element).height / 2)
  return {
    tokens: header.getAttribute(tokens),
    stamped: row.hasAttribute(stamp),
    lift: row.style.getPropertyValue(lift),
    inset: header.style.getPropertyValue(top),
    titleLine: line(title),
    titleMax: parseFloat(getComputedStyle(title).maxWidth) || null,
    trailInRow: Math.round(box(trail).top) >= Math.round(box(row).top) - 1,
    rowTop: Math.round(box(row).top),
  }
}, [HEADER, TITLE_ROW, TITLE, TRAIL, TOKENS, ROW_STAMP, ROW_LIFT, HEADER_TOP])

/** Whether the placement a pass writes is the one the page already draws. */
const same = (before, after) => JSON.stringify(before) === JSON.stringify(after)

export default spec({ page: 'desktop', bands: ['wide', 'compact'] }, ({ test }) => {
  test('the caption row comes to rest, and hands the row back when the title no longer fits', async (t) => {
    await mount(t)
    const lifted = await read(t)
    t.expectThat.equal((lifted.tokens ?? '').includes('title'), true, 'the caption row holds the title')
    t.expectThat.equal(lifted.stamped, true, 'the row stands raised for it')
    t.expectThat.equal(lifted.titleLine, BAND / 2, 'the title stands on the caption line')
    t.expectThat.equal(lifted.rowTop, ROW_LINE, 'the row stands on the line the title left')

    // Passes run on a still window answer the same placement: the numbers a pass
    // reads are the ones it wrote, and a threshold they sit on must not answer
    // both ways a pass apart.
    for (let pass = 0; pass < 3; pass++) {
      await t.page.evaluate(() => window.__dshClaudePass())
      await t.settle()
      t.expectThat.equal(same(await read(t), lifted), true, 'pass ' + (pass + 1) + ' leaves the caption row where it stood')
    }

    // The cluster beside the title grows past what its own place can hold: it
    // returns to the row, and the title keeps the caption row.
    await place(t, { trail: lifted.titleMax })
    const crowded = await read(t)
    t.expectThat.equal((crowded.tokens ?? '').includes('title'), true, 'the title keeps the caption row')
    t.expectThat.equal(crowded.trailInRow, true, 'the cluster that no longer fits stands in the row')
    await t.page.evaluate(() => window.__dshClaudePass())
    await t.settle()
    t.expectThat.equal(same(await read(t), crowded), true, 'the crowded caption row stands still as passes run')
    await place(t, { trail: 60 })

    // The row moves out past the room the title needs: the title returns to it,
    // and the rise the row carried goes with the title.
    await place(t, { left: 'calc(100% - 130px)' })
    const handed = await read(t)
    t.expectThat.equal((handed.tokens ?? '').includes('title'), false, 'the caption row gives the title back')
    t.expectThat.equal(handed.stamped, false, 'the row is not raised')
    t.expectThat.equal(handed.lift, '', 'the rise is taken off the row with the title')
    t.expectThat.equal(handed.rowTop, COLUMN_TOP + INSET, 'the row stands where the host puts it, under the column top')
    await place(t, { left: '0px' })

    // Lifted again: the row reaches the caption row's line, with no rise of an
    // earlier placement standing in the arithmetic.
    const again = await read(t)
    t.expectThat.equal((again.tokens ?? '').includes('title'), true, 'the caption row holds the title again')
    t.expectThat.equal(again.rowTop, ROW_LINE, 'the row reaches the line it left, not a rise above it')
    t.expectThat.equal(again.inset, '0px', 'a header standing below the line takes no inset')
    t.expectThat.equal(again.lift, '-' + (COLUMN_TOP - ROW_LINE) + 'px', 'the row rises the walk the inset cannot take')

    // A header whose own edge stands above the line takes the walk into its
    // inset, and the row keeps its own place under it.
    await place(t, { top: '0px' })
    const closed = await read(t)
    t.expectThat.equal(closed.rowTop, ROW_LINE, 'the row stands on the line from the inset alone')
    t.expectThat.equal(closed.inset, ROW_LINE + 'px', 'the inset walks the header down to the line')
    t.expectThat.equal(closed.lift, '0px', 'the row needs no rise of its own')
  })
})
