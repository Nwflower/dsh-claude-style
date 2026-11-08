/**
 * A tab another plugin mounts in the conversation's view strip is laid out as
 * one segment of the plate: the skin states the segment box on whatever stands
 * in the tablist, so the plugin needs to know nothing of the skin's classes and
 * the reader sees one row of labels on one centre line (issue #275).
 *
 * @capability view-tabs
 * @features view-tabs
 * @risk A third-party plugin's tab sits above or below the host's tabs, or the
 *   skin overrides the plugin's own look by claiming the whole control.
 */
import { HEADER_PARTS } from '@dsh-claude-style/engine/parts-table'
import { spec, host, surface } from '../../fixtures/behaviour.mjs'
import { partClass } from '../../fixtures/parts.mjs'

const HEADER = host.attributes('shell.header-slot')
const TABS = host.attributes('header.conversation-tabs')
const PART = surface.attribute('skin.part')
/** The host's own class for a view tab, read from the table the walk reads. */
const TAB_CLASS = partClass(HEADER_PARTS, 'view-tab')
/** The host's own mark on the tablist, as the selector it is. */
const TABLIST = host('header.conversation-tabs')

/** The host's strip with one of the host's own tabs and one a plugin mounts beside it. */
const mount = (t) => t.page.evaluate(([header, tabs, tabClass]) => {
  const slot = document.createElement('div')
  for (const [name, value] of header) slot.setAttribute(name, value)
  const row = document.createElement('div')
  const list = document.createElement('div')
  for (const [name, value] of tabs) list.setAttribute(name, value)
  list.setAttribute('role', 'tablist')
  for (const label of ['Chat', 'Trajectory']) {
    const tab = document.createElement('button')
    tab.type = 'button'
    tab.setAttribute('role', 'tab')
    tab.setAttribute('aria-selected', 'false')
    tab.className = tabClass
    tab.textContent = label
    list.append(tab)
  }
  // dsh-purge's tab as issue #275 reports it: its own class, its own line box.
  const own = document.createElement('style')
  own.textContent = '.dshp-tab-btn{appearance:none;border:none;background:transparent;font:inherit;cursor:pointer}' +
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
  document.body.append(slot)
}, [HEADER, TABS, TAB_CLASS])

const read = (t) => t.page.evaluate(([partAttr, tablist]) => {
  const list = document.querySelector(tablist)
  const hostTab = list.querySelector(`[${partAttr}~="view-tab"]`)
  const foreign = document.getElementById('foreign-tab')
  if (hostTab === null || foreign === null) return null
  const plate = list.getBoundingClientRect()
  const inkCentre = (element) => {
    const range = document.createRange()
    range.selectNodeContents(element)
    const box = range.getBoundingClientRect()
    return (box.top + box.bottom) / 2 - (plate.top + plate.bottom) / 2
  }
  return {
    hostInk: inkCentre(hostTab),
    foreignInk: inkCentre(foreign),
    hostHeight: Math.round(hostTab.getBoundingClientRect().height),
    foreignHeight: Math.round(foreign.getBoundingClientRect().height),
    foreignFont: getComputedStyle(foreign.querySelector('.dshp-tab-chip')).fontSize,
  }
}, [PART, TABLIST])

export default spec({ page: 'view-tabs-row', bands: ['wide'] }, ({ test }) => {
  test('a plugin\'s tab in the strip sits on the host tabs\' centre line', async (t) => {
    await mount(t)
    await t.settle()
    const strip = await read(t)
    t.expectThat.equal(strip !== null, true, 'the strip holds the host tabs and the plugin\'s tab')
    t.expectThat.equal(Math.abs(strip.foreignInk - strip.hostInk) <= 1, true, `the two ink centres agree: ${JSON.stringify(strip)}`)
    t.expectThat.equal(strip.foreignHeight, strip.hostHeight, 'the plugin\'s tab stands in the same segment box as the host\'s')
    // The skin states the box only: the plugin's own sheet still paints its label.
    t.expectThat.equal(strip.foreignFont, '12px', 'the plugin\'s own label keeps the type it states')
  })
})
