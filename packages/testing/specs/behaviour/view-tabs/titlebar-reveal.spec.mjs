/**
 * Under the Windows caption row the strip and the plate inside it rise together:
 * with the pointer on neither the strip nor the conversation pane the row and
 * its tablist both rest at nothing, and the strip's own hover and the pane's
 * hover each bring the two to full with the three views laid out.
 *
 * @capability view-tabs
 * @features view-tabs
 * @risk In the caption row the strip's own reveal raises the row while the plate inside it stays at nothing, so the three views a reader switches between are drawn invisible, and the pane's hover no longer raises them either.
 */
import { FRAME_PARTS } from '@dsh-claude-style/engine/parts-table'
import { spec, host, surface } from '../../fixtures/behaviour.mjs'
import { partClass } from '../../fixtures/parts.mjs'

/** The conversation header's slot, the element view-tabs.ts mirrors the caption row onto. */
const HEADER = host.attributes('shell.header-slot')
/** The host's own mark on the view tablist, the plate the skin draws its shell around. */
const TABS = host.attributes('header.conversation-tabs')
/** The region the shell's columns are read inside. */
const ROOT = host('shell.root-slot')
/** The Windows caption row, which only the desktop shell writes. */
const WINDOWS = host('shell.windows-titlebar')
const TITLEBAR = surface.attribute('view-tabs.titlebar')
const PART = surface.attribute('skin.part')
/** The conversation pane whose hover raises the strip, and the class the walk reads it by. */
const PANE = 'center-column'
const PANE_CLASS = partClass(FRAME_PARTS, PANE)
/** The three views the host's own strip draws. */
const PILLS = ['对话', '轨迹', '上下文']

/**
 * The page's two forms the reveal needs: the Windows caption row, as the desktop
 * shell writes it around a visible overlay, and the conversation pane holding the
 * header. The strip is the row the host mounts above its tablist — the seat
 * view-tabs.ts reads the plate from — and it leaves the pane's own box, since the
 * caption row places it fixed across the window.
 */
function mount(t) {
  return t.page.evaluate(([header, tabs, windows, rootSlot, paneClass, labels]) => {
    const overlay = new EventTarget()
    overlay.visible = true
    overlay.getTitlebarAreaRect = () => new DOMRect(0, 0, window.innerWidth, 40)
    Object.defineProperty(navigator, 'windowControlsOverlay', { configurable: true, value: overlay })
    document.documentElement.setAttribute(windows, '')

    const plate = document.createElement('div')
    plate.id = 'probe-plate'
    for (const [name, value] of tabs) plate.setAttribute(name, value)
    plate.setAttribute('role', 'tablist')
    for (const [at, label] of labels.entries()) {
      const pill = document.createElement('button')
      pill.type = 'button'
      pill.setAttribute('role', 'tab')
      pill.setAttribute('aria-selected', at === 0 ? 'true' : 'false')
      pill.textContent = label
      plate.append(pill)
    }
    const strip = document.createElement('div')
    strip.id = 'probe-strip'
    strip.append(plate)
    const slot = document.createElement('div')
    slot.id = 'probe-header'
    for (const [name, value] of header) slot.setAttribute(name, value)
    slot.append(strip)

    const pane = document.createElement('div')
    pane.id = 'probe-pane'
    pane.className = paneClass
    // A fixed box of its own: the pane keeps a region the pointer can rest in
    // clear of the caption row the fixed strip stands in.
    pane.style.cssText = 'position:fixed;left:0;top:120px;width:640px;height:320px;z-index:1'
    pane.append(slot)

    const root = document.querySelector(rootSlot)
    if (root === null) throw new Error('the page has no root slot to stand the conversation pane in')
    root.append(pane)
  }, [HEADER, TABS, WINDOWS, ROOT, PANE_CLASS, PILLS])
}

/**
 * Wait for the two marks the reveal is decided from: the header wearing the
 * caption row's mark, and the pane carrying the part the walk reads it by.
 */
function ready(t) {
  return t.page.waitForFunction(([titlebar, part, name]) => {
    const header = document.getElementById('probe-header')
    const pane = document.getElementById('probe-pane')
    const parts = (pane?.getAttribute(part) ?? '').split(/\s+/)
    return header !== null && header.hasAttribute(titlebar) && parts.includes(name)
  }, [TITLEBAR, PART, PANE], { timeout: 10000 })
}

/** The three points the pointer takes: the plate, the pane, and a corner on neither. */
function points(t) {
  return t.page.evaluate(() => {
    const at = (id) => document.getElementById(id)
    const box = (id) => at(id).getBoundingClientRect()
    const holds = (rect, point) => point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom
    const strip = box('probe-strip')
    const plate = box('probe-plate')
    const pane = box('probe-pane')
    const onPlate = { x: plate.left + plate.width / 2, y: plate.top + plate.height / 2 }
    const onPane = { x: pane.left + 40, y: pane.bottom - 40 }
    const away = { x: innerWidth - 6, y: innerHeight - 6 }
    const hits = (element, point) => element.contains(document.elementFromPoint(point.x, point.y))
    return {
      onPlate,
      onPane,
      away,
      plateUnderPointer: hits(at('probe-plate'), onPlate),
      paneUnderPointer: hits(at('probe-pane'), onPane),
      cornerClearOfBoth: !holds(strip, away) && !holds(pane, away),
    }
  })
}

/** The strip's opacity, the plate's, and the box each view is laid out in. */
function read(t) {
  return t.page.evaluate(() => {
    const opacity = (id) => Number.parseFloat(getComputedStyle(document.getElementById(id)).opacity)
    const pills = [...document.getElementById('probe-plate').children].map((pill) => {
      const box = pill.getBoundingClientRect()
      return { label: pill.textContent, width: Math.round(box.width), height: Math.round(box.height) }
    })
    return { strip: opacity('probe-strip'), plate: opacity('probe-plate'), pills }
  })
}

/** Wait until both the strip and the plate have settled on one opacity: the transition ends on the value the rule states. */
function settledAt(t, target) {
  return t.page.waitForFunction((value) => {
    const opacity = (id) => Number.parseFloat(getComputedStyle(document.getElementById(id)).opacity)
    // The assertion asks for the resting value itself, so the wait asks for the
    // same: a tolerance here hands the read the last tenth of a percent of the
    // transition on whichever machine finishes its round trip first.
    return opacity('probe-strip') === value && opacity('probe-plate') === value
  }, target, { timeout: 10000 })
}

/** Put the pointer on a point, wait for both opacities to reach the target, and answer what the page reads there. */
async function resting(t, point, target, where) {
  await t.page.mouse.move(point.x, point.y)
  await settledAt(t, target)
  const page = await read(t)
  t.expectThat.equal(page.strip, target, `the strip rests at ${target} ${where}`)
  t.expectThat.equal(page.plate, target, `the plate rests at ${target} ${where}`)
  return page
}

/** The three views are the host's, each carrying the box a reader presses. */
function expectPills(t, page, where) {
  t.expectThat.equal(page.pills.map((pill) => pill.label), PILLS, `the plate holds the three views ${where}`)
  t.expectThat.equal(page.pills.every((pill) => pill.width > 0 && pill.height > 0), true, `each view carries a box ${where}: ${JSON.stringify(page.pills)}`)
}

export default spec({ page: 'view-tabs-row', bands: ['wide'] }, ({ test }) => {
  test('in the caption row the strip and its plate rise together, on the strip\'s hover and on the pane\'s', async (t) => {
    await mount(t)
    await ready(t)
    await t.settle()
    const spot = await points(t)
    t.expectThat.equal(spot.cornerClearOfBoth, true, `the corner stands outside the strip and the pane: ${JSON.stringify(spot.away)}`)
    t.expectThat.equal(spot.plateUnderPointer, true, 'the plate is what the pointer meets on the strip')
    t.expectThat.equal(spot.paneUnderPointer, true, 'the pane is what the pointer meets in the conversation')

    await resting(t, spot.away, 0, 'with the pointer on neither')
    expectPills(t, await read(t), 'while they rest at nothing')

    const onStrip = await resting(t, spot.onPlate, 1, 'with the pointer on the strip')
    expectPills(t, onStrip, 'with the pointer on the strip')

    const onPane = await resting(t, spot.onPane, 1, 'with the pointer on the pane')
    expectPills(t, onPane, 'with the pointer on the pane')
  })
})
