/**
 * @capability manual-unread
 * @features manual-unread
 * @risk The session menu claims a mark was saved after refusal, allows overlapping writes, alters native completion state, or leaves actions active after teardown.
 */
import { spec, surface } from '../../fixtures/behaviour.mjs'
import { setup, menu, respond, marked, writes } from './host.mjs'

export default spec({ page: 'late-forms' }, ({ test }) => {
  test('the session menu marks and clears an opaque conversation through the official form', async (t) => {
    const id = 'opaque:tail/path with space'
    await setup(t)
    const action = await menu(t, id)
    t.expectThat.equal(await action.innerText(), 'Mark as unread', 'the unmarked conversation offers a mark')
    await action.click()
    await t.settle()
    t.expectThat.equal(await t.page.getByRole('menuitem').count(), 0, 'selection closes the host menu')
    t.expectThat.equal(await writes(t), [{ name: 'manualUnreadIds', value: [id] }], 'the full opaque id reaches the official preference field')
    await respond(t)
    t.expectThat.equal(await marked(t, id), true, 'the saved mark draws on that conversation')
    const clear = await menu(t, id)
    t.expectThat.equal(await clear.innerText(), 'Clear unread mark', 'the saved mark offers its clear action')
    await clear.click()
    await t.settle()
    await respond(t)
    t.expectThat.equal(await marked(t, id), false, 'clearing removes the saved mark')
    t.expectThat.equal(await t.page.evaluate(() => window.__unreadHost.value.manualUnreadIds), [], 'the official stored field is empty')
    t.expectThat.equal(await t.page.evaluate(() => window.__unreadHost.menuCloses), [false, false], 'each selection closes exactly once')
  })

  test('a pending write disables other menu actions and settlement enables them', async (t) => {
    await setup(t, { marked: ['a'] })
    await (await menu(t, 'b')).click()
    await t.settle()
    const blocked = await menu(t, 'a')
    t.expectThat.equal(await blocked.isDisabled(), true, 'another action waits for the official reply')
    await blocked.evaluate((button) => button.click())
    t.expectThat.equal((await writes(t)).length, 1, 'the disabled native button dispatches no second selection')
    await respond(t)
    t.expectThat.equal(await (await menu(t, 'a')).isEnabled(), true, 'settlement releases the menu')
    t.expectThat.equal(await t.page.evaluate(() => window.__unreadHost.value.manualUnreadIds), ['a', 'b'], 'the accepted action retains existing marks')
  })

  for (const outcome of ['reject', 'refuse']) {
    test(`a host ${outcome} preserves an existing mark and leaves the action available for retry`, async (t) => {
      await setup(t, { marked: ['b'] })
      await (await menu(t, 'b')).click()
      await t.settle()
      await respond(t, outcome)
      t.expectThat.equal(await marked(t, 'b'), true, 'the refused clear keeps the stored mark visible')
      t.expectThat.equal(await t.page.evaluate(() => window.__unreadHost.value.manualUnreadIds), ['b'], 'the host still owns the saved value')
      const retry = await menu(t, 'b')
      t.expectThat.equal(await retry.innerText(), 'Clear unread mark', 'the action still describes the stored mark')
      t.expectThat.equal(await retry.isEnabled(), true, 'failure releases the pending state')
      await retry.click()
      await t.settle()
      await respond(t)
      t.expectThat.equal(await marked(t, 'b'), false, 'a later accepted clear works')
    })
  }

  test('missing host menu-open state disables selection without writing preferences', async (t) => {
    await setup(t)
    const action = await menu(t, 'b', false)
    t.expectThat.equal(await action.isDisabled(), true, 'the menu waits for its host-owned closing channel')
    await action.evaluate((button) => button.click())
    t.expectThat.equal(await writes(t), [], 'no write starts without the menu contract')
  })

  test('cold preferences disable selection until the official form carries the stored value', async (t) => {
    await setup(t, { marked: ['b'], ready: false })
    const cold = await menu(t, 'b')
    t.expectThat.equal(await cold.isDisabled(), true, 'defaults cannot authorize a mark change')
    await cold.evaluate((button) => button.click())
    t.expectThat.equal(await writes(t), [], 'cold preferences produce no write')
    await t.page.evaluate(() => window.__unreadHost.ready())
    await t.settle()
    const ready = await menu(t, 'b')
    t.expectThat.equal(await ready.isEnabled(), true, 'the official value enables the action')
    t.expectThat.equal(await ready.innerText(), 'Clear unread mark', 'the label follows the stored value')
  })

  test('manual marking preserves native running, waiting and automatic completion unread state', async (t) => {
    await setup(t)
    const native = () => t.page.evaluate(() => [...window.__unreadHost.native].map(([id, nodes]) => ({
      id, connected: nodes.status.isConnected, label: nodes.status.getAttribute('aria-label'),
      parent: nodes.title.closest('[role="treeitem"]') === window.__unreadHost.rows.get(id),
      trigger: nodes.trigger.isConnected,
    })))
    const before = await native()
    for (const id of ['a', 'b']) {
      await (await menu(t, id)).click()
      await t.settle()
      await respond(t)
      t.expectThat.equal(await marked(t, id), true, 'manual unread coexists with the native state')
    }
    t.expectThat.equal(await native(), before, 'the native status, title and trigger retain identity and meaning')
    t.expectThat.equal(await t.page.evaluate(() => [...window.__unreadHost.completionUnread]), ['b'], 'the host automatic unread set is untouched')
    t.expectThat.equal(await t.page.evaluate(() => [...window.__ctx.get('uiSession').sessionStatus.getSnapshot()]), [['a', { running: true }], ['b', { pendingInteraction: { kind: 'permission' }, completionUnread: true }]], 'the host running and waiting snapshots stay intact')
  })

  test('a remount reads the saved reminders and never duplicates their decoration', async (t) => {
    await setup(t, { marked: ['a', 'b'] })
    t.expectThat.equal(await marked(t, 'b'), true, 'both stored reminders stand before the remount')
    await t.page.evaluate(() => { window.__dispose(); window.__skin.apply(window.__ctx) })
    await t.settle()
    t.expectThat.equal(await marked(t, 'b'), true, 'remounting reads the saved reminder without consuming it')
    t.expectThat.equal(await t.read.count(surface('manual-unread.marker')), 2, 'remounting creates one marker per row rather than duplicating them')
    t.expectThat.equal(await t.read.count(surface('manual-unread.description')), 1, 'remounting owns one description')
    t.expectThat.equal(await t.page.evaluate(() => window.__unreadHost.entries.length), 1, 'remounting registers exactly one menu action')
    t.expectThat.equal(await writes(t), [], 'a remount writes nothing')
  })

  test('teardown releases menu registrations, descriptions, marks and host subscriptions', async (t) => {
    await setup(t, { marked: ['a', 'b'] })
    t.expectThat.equal(await t.read.count(surface('manual-unread.marker')), 2, 'both stored reminders stand before teardown')
    t.expectThat.equal(await t.read.count(surface('manual-unread.description')), 1, 'one accessible description serves the reminders')
    await t.page.evaluate(() => window.__dispose())
    t.expectThat.equal(await t.read.count(surface('manual-unread.marker')), 0, 'owned markers leave with the feature')
    t.expectThat.equal(await t.read.count(surface('manual-unread.description')), 0, 'the owned description leaves')
    const released = await t.page.evaluate(() => ({
      entries: window.__unreadHost.entries.length,
      subscriptions: Object.values(window.__unreadHost.channels).map((listeners) => listeners.size),
      descriptions: [...window.__unreadHost.rows.values()].map((row) => row.getAttribute('aria-describedby')),
      titles: [...window.__unreadHost.native.values()].map((nodes) => nodes.title.isConnected && nodes.trigger.isConnected),
    }))
    t.expectThat.equal(released.entries, 0, 'the host menu no longer advertises the action')
    t.expectThat.equal(released.subscriptions, [0, 0, 0, 0], 'all supplied host stores release their listeners')
    t.expectThat.equal(released.descriptions, ['native-description', 'native-description', 'native-description'], 'native descriptions survive')
    t.expectThat.equal(released.titles, [true, true, true], 'native title and menu controls survive')
    await t.page.evaluate(() => { window.__unreadHost.push(['opaque:tail/path with space']); window.__unreadHost.navigate('b') })
    await t.settle()
    t.expectThat.equal(await t.read.count(surface('manual-unread.marker')), 0, 'later host changes cannot restore disposed marks')
    t.expectThat.equal(await writes(t), [], 'disposed navigation starts no preference write')
  })

  test('host native mark yields the menu item and row marks without dropping teardown safety', async (t) => {
    await setup(t, { marked: ['b'], nativeMark: true })
    const item = await menu(t, 'b')
    t.expectThat.equal(await item.count(), 0, 'the plugin menu item stands down when the host exposes uiSession.sessionStatus.mark')
    t.expectThat.equal(await marked(t, 'b'), false, 'no duplicate plugin row mark renders under native unread support')
    t.expectThat.equal(await writes(t), [], 'standing down issues no preference writes')
  })
})
