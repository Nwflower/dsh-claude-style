/**
 * The sidebar's pin list is the host's own, held in the sidebar plugin's memory
 * and empty on every load. The skin stores it: the entries the reader took off
 * are replayed into the host's list once the panels stand, every later change of
 * the host list (its unpin button, its More menu, the dialog) is written back,
 * and a reload of the sidebar plugin replays the stored ids instead of storing
 * the empty list over them.
 *
 * @capability sidebar-entries
 * @features sidebar-entries
 * @risk An entry the reader took off the sidebar comes back after the host reloads, an unpin made with the host's own button is forgotten at the next start, or the host's reset list overwrites the stored choice.
 */
import { spec } from '../../fixtures/behaviour.mjs'

/** The stored list, as the settings form holds it. */
const stored = (page) => page.evaluate(() => window.__dshSmokeHost.formValue.sidebarHidden)
const calls = (page) => page.evaluate(() => window.__sidebarPins.calls)
const hostList = (page) => page.evaluate(() => window.__sidebarPins.unpinned())
/** The search entry's panel id, which the stand-in's sidebar keeps. */
const searchId = (page) => page.evaluate(() => window.__sidebarPins.searchId)

export default spec({ page: 'search' }, ({ test }) => {
  test('the stored entries are replayed into the host list once their panels are registered', async (t) => {
    await t.page.waitForFunction(() => window.__sidebarPins.unpinned().length > 0, undefined, { timeout: 5000 })
    const search = await searchId(t.page)
    t.expectThat.equal(await hostList(t.page), [search], 'the search entry the reader took off is unpinned in the host')
    t.expectThat.equal(await calls(t.page), [[search, false]], 'the host was told once')
    t.expectThat.equal(await stored(t.page), [search], 'the stored list stands as it was')
  })

  test('a change the host list makes is written back to the stored list', async (t) => {
    await t.page.waitForFunction(() => window.__sidebarPins.unpinned().length > 0, undefined, { timeout: 5000 })
    const search = await searchId(t.page)
    await t.page.evaluate(() => window.__sidebarPins.setPinned('another-panel', false))
    await t.page.waitForFunction(() => window.__dshSmokeHost.formValue.sidebarHidden.length === 2, undefined, { timeout: 5000 })
    t.expectThat.equal(await stored(t.page), [search, 'another-panel'], 'the unpin made with the host button is stored after the one already there')
    await t.page.evaluate((id) => window.__sidebarPins.setPinned(id, true), search)
    await t.page.waitForFunction(() => window.__dshSmokeHost.formValue.sidebarHidden.length === 1, undefined, { timeout: 5000 })
    t.expectThat.equal(await stored(t.page), ['another-panel'], 'pinning an entry back takes it out of the stored list')
  })

  test('a reload of the sidebar plugin replays the stored list instead of storing its empty one', async (t) => {
    await t.page.waitForFunction(() => window.__sidebarPins.unpinned().length > 0, undefined, { timeout: 5000 })
    const search = await searchId(t.page)
    await t.page.evaluate(() => window.__sidebarPins.reload())
    await t.page.waitForFunction(() => window.__sidebarPins.unpinned().length > 0, undefined, { timeout: 5000 })
    t.expectThat.equal(await hostList(t.page), [search], 'the reloaded host list holds the stored entry again')
    t.expectThat.equal(await stored(t.page), [search], 'the stored list was not replaced by the empty one')
  })
})
