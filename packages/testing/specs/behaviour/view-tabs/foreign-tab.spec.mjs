/**
 * A tab another plugin mounts in the conversation's view strip is laid out as
 * one item in the header's tablist. The plugin keeps its own label style and
 * the reader sees their controls in one row (issue #275).
 *
 * @capability view-tabs
 * @features view-tabs
 * @risk A third-party plugin's tab sits above or below the host's tabs, or the
 *   skin overrides the plugin's own look by claiming the whole control. The
 *   native labels lose their hover feedback or the underline jumps between them.
 */
import { HEADER_PARTS } from '@dsh-claude-style/engine/parts-table'
import { spec, host, surface } from '../../fixtures/behaviour.mjs'
import { partClass } from '../../fixtures/parts.mjs'

const HEADER = host.attributes('shell.header-slot')
const TABS = host.attributes('header.conversation-tabs')
const PART = surface.attribute('skin.part')
const UNDERLINE = surface.attribute('view-tabs.underline')
/** The host's own class for a view tab, read from the table the walk reads. */
const TAB_CLASS = partClass(HEADER_PARTS, 'view-tab')
const TABLIST_CLASS = partClass(HEADER_PARTS, 'view-tabs-list')
/** The host's own mark on the tablist, as the selector it is. */
const TABLIST = host('header.conversation-tabs')

/** The host's strip with one of the host's own tabs and one a plugin mounts beside it. */
const mount = (t) => t.page.evaluate(([header, tabs, tabClass, tablistClass]) => {
  const slot = document.createElement('div')
  for (const [name, value] of header) slot.setAttribute(name, value)
  const row = document.createElement('div')
  const list = document.createElement('div')
  list.className = tablistClass
  for (const [name, value] of tabs) list.setAttribute(name, value)
  list.setAttribute('role', 'tablist')
  for (const [index, label] of ['Chat', 'Trajectory'].entries()) {
    const tab = document.createElement('button')
    tab.type = 'button'
    tab.setAttribute('role', 'tab')
    tab.setAttribute('aria-selected', String(index === 0))
    tab.className = tabClass
    tab.textContent = label
    tab.addEventListener('click', () => {
      for (const item of list.children) {
        if (item.hasAttribute('aria-selected')) item.setAttribute('aria-selected', String(item === tab))
      }
    })
    list.append(tab)
  }
  // dsh-purge's tab as issue #275 reports it: its own class, its own line box.
  const own = document.createElement('style')
  own.textContent = '.dshp-tab-btn{appearance:none;border:none;background:transparent;font-size:12px;cursor:pointer}' +
    '.dshp-tab-chip{line-height:16px;padding-bottom:9px}'
  document.head.append(own)
  const foreign = document.createElement('button')
  foreign.type = 'button'
  foreign.id = 'foreign-tab'
  foreign.className = 'dshp-tab-btn'
  foreign.innerHTML = '<span class="dshp-tab-chip">Purge</span>'
  list.append(foreign)
  row.append(list)
  slot.append(row)
  document.body.prepend(slot)
}, [HEADER, TABS, TAB_CLASS, TABLIST_CLASS])

const read = (t) => t.page.evaluate(([partAttr, tablist]) => {
  const list = document.querySelector(tablist)
  const hostTab = list.querySelector(`[${partAttr}~="view-tab"]`)
  const foreign = document.getElementById('foreign-tab')
  if (hostTab === null || foreign === null) return null
  const track = list.getBoundingClientRect()
  const placement = (element) => {
    const box = element.getBoundingClientRect()
    return { offset: box.top - track.top, height: box.height }
  }
  return {
    host: placement(hostTab),
    foreign: placement(foreign),
    foreignFont: getComputedStyle(foreign.querySelector('.dshp-tab-chip')).fontSize,
  }
}, [PART, TABLIST])

export default spec({ page: 'view-tabs', bands: ['wide'] }, ({ test }) => {
  test('a plugin\'s tab takes the same place on the row as a host tab', async (t) => {
    await mount(t)
    await t.settle()
    const strip = await read(t)
    t.expectThat.equal(strip !== null, true, 'the strip holds the host tabs and the plugin\'s tab')
    t.expectThat.equal(strip.foreign, strip.host, 'the plugin and host tab boxes share their height and alignment')
    // The skin states the box only: the plugin's own sheet still paints its label.
    t.expectThat.equal(strip.foreignFont, '12px', 'the plugin\'s own label keeps the type it states')
  })

  test('hover stretches the underline and selecting the preview keeps its animation', async (t) => {
    await t.prefs({ motion: 'full' })
    await mount(t)
    const list = t.page.locator(TABLIST)
    await list.and(t.page.locator(`[${UNDERLINE}]`)).waitFor()
    const trajectory = list.getByRole('tab', { name: 'Trajectory' })
    const colors = () => trajectory.evaluate(tab => {
      const style = getComputedStyle(tab)
      return { text: style.color, background: style.backgroundColor }
    })
    const resting = await colors()
    await trajectory.hover()
    await t.page.waitForFunction(({ selector, text }) => {
      const hovered = document.querySelector(selector)?.querySelector('[role="tab"]:hover')
      return hovered != null && getComputedStyle(hovered).color !== text
    }, { selector: TABLIST, text: resting.text })
    t.expectThat.equal((await colors()).background, resting.background, 'hover highlights the text without painting a background')
    await t.page.mouse.move(0, 0)
    const { crossings, reversal, selection } = await list.evaluate(async element => {
      const tabs = [...element.querySelectorAll('[role="tab"]')]
      const readLine = () => {
        const line = getComputedStyle(element, '::after')
        const matrix = new DOMMatrixReadOnly(line.transform)
        const left = matrix.e
        const width = matrix.a * parseFloat(line.width)
        return { left, right: left + width, center: left + width / 2, width }
      }
      const flight = () => element.getAnimations({ subtree: true }).find(animation =>
        animation.effect?.pseudoElement === '::after' && animation.effect.target === element)
      const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve))
      const settle = () => window.__dshSmokeProbe.settle()
      const move = (tab, type, relatedTarget = null) => {
        tab.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: 'mouse', relatedTarget }))
      }
      const hover = async (tab, type = 'pointerover') => {
        const before = flight()
        move(tab, type)
        for (;;) {
          await nextFrame()
          const animation = flight()
          if (animation !== undefined && animation !== before) {
            animation.pause()
            animation.currentTime = 0
            return animation
          }
        }
      }
      // Read the browser's timeline independently of runner frame time (D92).
      const sampleAt = (animation, progress) => {
        animation.currentTime = Number(animation.effect.getTiming().duration) * progress
        return readLine()
      }
      const finish = (animation) => {
        animation.finish()
        return readLine()
      }
      const matchesTab = (line, tab) => {
        const box = tab.getBoundingClientRect()
        const listBox = element.getBoundingClientRect()
        const style = getComputedStyle(tab)
        const labelWidth = box.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
        const labelCenter = box.left - listBox.left + parseFloat(style.paddingLeft) + labelWidth / 2
        return Math.round(line.center) === Math.round(labelCenter) && Math.round(line.width) === Math.round(labelWidth)
      }
      await settle()
      flight()?.finish()
      const crossings = []
      for (const [tab, type, destination] of [[tabs[1], 'pointerover', tabs[1]], [tabs[1], 'pointerout', tabs[0]]]) {
        const start = readLine()
        const animation = await hover(tab, type)
        const middle = sampleAt(animation, 0.5)
        const late = sampleAt(animation, 0.8)
        const end = finish(animation)
        crossings.push({
          transformOnly: animation.effect.getKeyframes().every(frame => frame.transform && !('left' in frame) && !('right' in frame)),
          stretched: middle.width > Math.max(start.width, end.width),
          travelled: middle.center > Math.min(start.center, end.center) && middle.center < Math.max(start.center, end.center),
          overshot: end.center > start.center ? late.right > end.right : late.left < end.left,
          landed: matchesTab(end, destination),
          activeUnchanged: tabs[0].getAttribute('aria-selected') === 'true',
        })
      }
      const before = sampleAt(await hover(tabs[1]), 0.5)
      const reversing = await hover(tabs[0])
      const after = readLine()
      const reversal = {
        continuous: Math.round(before.center) === Math.round(after.center) && Math.round(before.width) === Math.round(after.width),
        landed: matchesTab(finish(reversing), tabs[0]),
      }
      const preview = await hover(tabs[1])
      const halfway = sampleAt(preview, 0.5)
      tabs[1].click()
      await settle()
      const keptFlight = flight() === preview && readLine().center === halfway.center
      const settled = matchesTab(finish(preview), tabs[1])
      move(tabs[1], 'pointerout')
      await settle()
      const stayedSelected = flight() === undefined && matchesTab(readLine(), tabs[1])
      tabs[0].click()
      await settle()
      return {
        crossings,
        reversal,
        selection: {
          keptFlight, settled, stayedSelected,
          withoutHover: flight() === undefined && matchesTab(readLine(), tabs[0]),
        },
      }
    })
    for (const crossing of crossings) {
      t.expectThat.equal(crossing, { transformOnly: true, stretched: true, travelled: true, overshot: true, landed: true, activeUnchanged: true }, 'hover moves the line without changing selection')
    }
    t.expectThat.equal(reversal, { continuous: true, landed: true }, 'a reversal starts from the visible line and returns to the selected label')
    t.expectThat.equal(selection, { keptFlight: true, settled: true, stayedSelected: true, withoutHover: true }, 'selection keeps the preview or takes its place immediately')
    await t.prefs({ motion: 'reduced' })
    await trajectory.hover()
    await t.settle()
    const reduced = await list.evaluate(element => {
      const line = getComputedStyle(element, '::after')
      const tab = element.querySelector('[role="tab"]:hover')
      const expected = tab.getBoundingClientRect().left - element.getBoundingClientRect().left + parseFloat(getComputedStyle(tab).paddingLeft)
      return {
        animated: element.getAnimations({ subtree: true }).some(animation => animation.effect?.pseudoElement === '::after'),
        underPointer: Math.round(new DOMMatrixReadOnly(line.transform).e) === Math.round(expected),
      }
    })
    t.expectThat.equal(reduced, { animated: false, underPointer: true }, 'reduced motion moves the underline to the pointer immediately')
    await t.prefs({ viewTabs: false })
    await list.and(t.page.locator(`[${UNDERLINE}]`)).waitFor({ state: 'detached' })
    t.expectThat.equal(await list.evaluate(element => getComputedStyle(element, '::after').content), 'none', 'the disabled setting removes the shared line')
  })
})
