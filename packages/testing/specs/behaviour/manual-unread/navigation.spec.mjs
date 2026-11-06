/**
 * @capability manual-unread
 * @features manual-unread
 * @risk Reload, temporary selection/binding disagreement or unfinished opening consumes a reminder before a later settled visit, while recycled rows keep another conversation's mark.
 */
import { spec, surface } from '../../fixtures/behaviour.mjs'
import { setup, menu, navigate, respond, marked, writes } from './host.mjs'

export default spec({ page: 'late-forms' }, ({ test }) => {
  test('restored selection and incidental activity do not consume saved marks', async (t) => {
    await setup(t, { marked: ['a', 'b'], current: 'a' })
    t.expectThat.equal(await marked(t, 'a'), true, 'the restored current conversation keeps its reminder')
    t.expectThat.equal(await writes(t), [], 'startup starts no clear')
    await t.page.keyboard.press('Escape')
    await t.settle()
    t.expectThat.equal(await writes(t), [], 'activity without leaving is not a visit')
    t.expectThat.equal(await marked(t, 'a'), true, 'the reminder remains on the current row')
  })

  for (const input of ['unrelated key', 'unrelated button']) {
    test(`cold restoration after an ${input} still preserves the first conversation's mark`, async (t) => {
      await setup(t, { marked: ['a'], current: null })
      if (input === 'unrelated key') await t.page.keyboard.press('Escape')
      else {
        await t.page.evaluate(() => {
          const button = document.createElement('button')
          button.textContent = 'Unrelated control'
          document.body.appendChild(button)
        })
        await t.page.getByRole('button', { name: 'Unrelated control' }).click()
      }
      await navigate(t, 'a')
      t.expectThat.equal(await writes(t), [], 'an unrelated input cannot turn automatic restoration into a user visit')
      t.expectThat.equal(await marked(t, 'a'), true, 'the first restored conversation retains its stored reminder')
    })
  }

  test('an explicit native session row click from cold home is a visit', async (t) => {
    await setup(t, { marked: ['a'], current: null })
    await t.page.getByText('Conversation a', { exact: true }).click()
    await t.settle()
    t.expectThat.equal(await writes(t), [{ name: 'manualUnreadIds', value: [] }], 'an explicit first navigation authorizes consuming its destination')
    await respond(t)
    t.expectThat.equal(await marked(t, 'a'), false, 'the first deliberate visit clears its reminder')
  })

  test('marking the current conversation survives until a user leaves and returns', async (t) => {
    await setup(t)
    await (await menu(t, 'a')).click()
    await t.settle()
    await respond(t)
    t.expectThat.equal(await marked(t, 'a'), true, 'marking the current row does not immediately clear it')
    await t.page.evaluate(() => window.__unreadHost.rows.get('b').click())
    await t.settle()
    t.expectThat.equal((await writes(t)).length, 1, 'leaving keeps the first reminder')
    await t.page.evaluate(() => window.__unreadHost.rows.get('a').click())
    await t.settle()
    t.expectThat.equal(await writes(t), [{ name: 'manualUnreadIds', value: ['a'] }, { name: 'manualUnreadIds', value: [] }], 'the later visit clears just the saved reminder')
    await respond(t)
    t.expectThat.equal(await marked(t, 'a'), false, 'confirmed clearing removes the reminder')
    await navigate(t, 'a')
    t.expectThat.equal((await writes(t)).length, 2, 'the same settled visit is consumed once')
  })

  test('a known departure to home allows the same conversation to be visited again', async (t) => {
    await setup(t, { marked: ['a', 'b'] })
    await t.page.keyboard.press('Escape')
    await navigate(t, null)
    t.expectThat.equal(await writes(t), [], 'home is a departure, not an unread conversation')
    await navigate(t, 'a')
    t.expectThat.equal(await writes(t), [{ name: 'manualUnreadIds', value: ['b'] }], 'returning from home clears a but retains b')
    await respond(t)
    t.expectThat.equal(await marked(t, 'a'), false, 'the returned conversation is read')
    t.expectThat.equal(await marked(t, 'b'), true, 'an unvisited reminder is untouched')
  })

  test('selected row and bound conversation disagreement is not a visit', async (t) => {
    await setup(t, { marked: ['a', 'b'] })
    await t.page.keyboard.press('Escape')
    await navigate(t, 'b', { binding: false })
    t.expectThat.equal(await writes(t), [], 'a selected destination cannot clear while another conversation is bound')
    t.expectThat.equal(await marked(t, 'b'), true, 'the destination reminder survives the transition')
    await navigate(t, 'b', { row: false })
    t.expectThat.equal(await writes(t), [{ name: 'manualUnreadIds', value: ['a'] }], 'matching navigation clears the actual destination')
    await respond(t)
  })

  test('a selected destination with no bound conversation waits even if its old binding was open', async (t) => {
    await setup(t, { marked: ['b'] })
    await t.page.keyboard.press('Escape')
    await navigate(t, null, { row: false, notify: false })
    await navigate(t, 'b', { binding: false })
    t.expectThat.equal(await writes(t), [], 'the empty binding window is not proof that the destination has opened')
    t.expectThat.equal(await marked(t, 'b'), true, 'a stale open snapshot cannot consume the reminder')
    await navigate(t, 'b', { row: false })
    t.expectThat.equal(await writes(t), [{ name: 'manualUnreadIds', value: [] }], 'the matching binding finally confirms the visit')
    await respond(t)
  })

  test('a visited destination waits for its session opening to complete', async (t) => {
    await setup(t, { marked: ['b'], openState: 'opening' })
    await t.page.keyboard.press('Escape')
    await navigate(t, 'b')
    t.expectThat.equal(await writes(t), [], 'a matching but opening destination remains unread')
    await t.page.evaluate(() => window.__unreadHost.open('b', 'open'))
    await t.settle()
    t.expectThat.equal(await writes(t), [{ name: 'manualUnreadIds', value: [] }], 'the open snapshot completes the pending visit')
    await respond(t)
    t.expectThat.equal(await marked(t, 'b'), false, 'only the confirmed visit removes the marker')
  })

  test('a visit before preference binding waits for the stored marks instead of defaulting them away', async (t) => {
    await setup(t, { marked: ['a', 'b'], ready: false })
    await t.page.keyboard.press('Escape')
    await navigate(t, 'b')
    t.expectThat.equal(await writes(t), [], 'the cold form cannot be overwritten')
    await t.page.evaluate(() => window.__unreadHost.ready())
    await t.settle()
    t.expectThat.equal(await writes(t), [{ name: 'manualUnreadIds', value: ['a'] }], 'the pending visit merges the loaded marks')
    await respond(t)
  })

  test('a refused visit clear keeps its reminder and a later visit can clear it', async (t) => {
    await setup(t, { marked: ['a', 'b'] })
    await t.page.keyboard.press('Escape')
    await navigate(t, 'b')
    await respond(t, 'reject')
    t.expectThat.equal(await marked(t, 'b'), true, 'a failed automatic clear preserves the stored reminder')
    t.expectThat.equal(await t.page.evaluate(() => window.__unreadHost.value.manualUnreadIds), ['a', 'b'], 'a refusal cannot replace the host value')
    await navigate(t, null)
    await navigate(t, 'b')
    t.expectThat.equal(await writes(t), [{ name: 'manualUnreadIds', value: ['a'] }, { name: 'manualUnreadIds', value: ['a'] }], 'a later real visit can retry the same logical clear')
    await respond(t)
    t.expectThat.equal(await marked(t, 'b'), false, 'the accepted retry removes b')
    t.expectThat.equal(await marked(t, 'a'), true, 'the unvisited conversation stays unread')
  })

  test('external stored changes and recycled native rows reconcile without writing preferences', async (t) => {
    await setup(t, { marked: ['b'] })
    t.expectThat.equal(await marked(t, 'b'), true, 'the original row carries b')
    await t.page.evaluate(() => window.__unreadHost.recycle('b', 'replacement'))
    await t.settle()
    t.expectThat.equal(await marked(t, 'replacement'), false, 'reusing a row cannot carry b to another id')
    t.expectThat.equal(await t.read.count(surface('manual-unread.marker')), 0, 'the stale owned marker is removed')
    await t.page.evaluate(() => window.__unreadHost.push(['a', 'replacement']))
    await t.settle()
    t.expectThat.equal(await marked(t, 'a'), true, 'external prefs mark another visible conversation')
    t.expectThat.equal(await marked(t, 'replacement'), true, 'the recycled row follows its current id')
    await t.page.evaluate(() => window.__unreadHost.push([]))
    await t.settle()
    t.expectThat.equal(await t.read.count(surface('manual-unread.marker')), 0, 'external clears remove every owned marker')
    t.expectThat.equal(await writes(t), [], 'render reconciliation does not save preferences')
  })
})
