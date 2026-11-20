/**
 * A tab another plugin mounts in the conversation's view strip is laid out as
 * one item in the header's tablist. The plugin keeps its own label style and
 * the reader sees their controls in one row (issue #275).
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
})
