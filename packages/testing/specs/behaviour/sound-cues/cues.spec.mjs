/**
 * A prompt already waiting when the page opens, a subagent's finish and the
 * setting's three levels each change what the reader hears; the cues follow the
 * host's own status and nothing else.
 *
 * @capability sound-cues
 * @features sound-cues
 * @risk A page that asked for no cue still starts the player, a pending prompt cues at load, a subagent's finish reads as the task's finish, or two events in one window play twice.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { sessionList, setup } from './host.mjs'

export default spec({ page: 'late-forms' }, ({ test }) => {
  test('a prompt and a finished top-level session each cue once', async (t) => {
    await t.prefs({ soundCues: 'soft' })
    const initial = { a: { running: true } }
    const host = await setup(t, { status: initial, list: sessionList(initial) })
    t.expectThat.equal(host.posts, [], 'a run already going at load is the baseline')

    await host.status({ a: { running: true, pendingInteraction: { kind: 'permission' } } })
    t.expectThat.equal(host.posts, [{ name: 'pop', volume: 0.2 }], 'the prompt plays Pop at the soft level')

    await host.status({ a: { running: true, pendingInteraction: { kind: 'permission' } } })
    t.expectThat.equal(host.posts.length, 1, 'the same pending prompt does not play again')

    await host.status({ a: { running: true } })
    await host.status({ a: { running: false } })
    t.expectThat.equal(host.posts, [{ name: 'pop', volume: 0.2 }, { name: 'tink', volume: 0.2 }], 'the finished run plays Tink')
  })

  test('a subagent waiting cues, and its finish stays quiet', async (t) => {
    await t.prefs({ soundCues: 'soft' })
    const initial = { s: { running: true } }
    const host = await setup(t, { status: initial, list: sessionList(initial, { subagents: ['s'] }) })
    await host.status({ s: { running: false } })
    t.expectThat.equal(host.posts, [], 'a subagent stopping is not the task finishing')

    await host.status({ s: { running: false, pendingInteraction: { kind: 'permission' } } })
    t.expectThat.equal(host.posts, [{ name: 'pop', volume: 0.2 }], 'a subagent waiting for the reader still plays Pop')
  })

  test('two events in one reading collapse into the permission cue', async (t) => {
    await t.prefs({ soundCues: 'soft' })
    const initial = { a: { running: true } }
    const host = await setup(t, { status: initial, list: sessionList(initial) })
    await host.status({ a: { running: false, pendingInteraction: { kind: 'permission' } } }, 0)
    await host.wait(500)
    t.expectThat.equal(host.posts, [{ name: 'pop', volume: 0.2 }], 'one window, and the prompt outranks the stop')
  })

  test('the level is read at the moment of the cue', async (t) => {
    const initial = { a: { running: true } }
    const host = await setup(t, { status: initial, list: sessionList(initial) })
    await host.status({ a: { running: true, pendingInteraction: { kind: 'permission' } } })
    t.expectThat.equal(host.posts, [], 'the default level is off, so nothing plays')

    await t.prefs({ soundCues: 'clear' })
    await host.status({ a: { running: true } })
    await host.status({ a: { running: true, pendingInteraction: { kind: 'permission' } } })
    t.expectThat.equal(host.posts, [{ name: 'pop', volume: 0.55 }], 'the clear level reaches the route')

    await t.prefs({ soundCues: 'soft' })
    await host.status({ a: { running: true } })
    await host.status({ a: { running: false } })
    t.expectThat.equal(host.posts.at(-1), { name: 'tink', volume: 0.2 }, 'the soft level reaches the route')

    await t.prefs({ soundCues: 'off' })
    await host.status({ a: { running: true } })
    await host.status({ a: { running: true, pendingInteraction: { kind: 'permission' } } })
    t.expectThat.equal(host.posts.length, 2, 'off stands the feature down')
  })

  test('a prompt already pending at load is the baseline', async (t) => {
    await t.prefs({ soundCues: 'soft' })
    const initial = { a: { running: true, pendingInteraction: { kind: 'permission' } } }
    const host = await setup(t, { status: initial, list: sessionList(initial) })
    t.expectThat.equal(host.posts, [], 'the prompt was there before the page')

    await host.status({ a: { running: true } })
    await host.status({ a: { running: true, pendingInteraction: { kind: 'permission' } } })
    t.expectThat.equal(host.posts, [{ name: 'pop', volume: 0.2 }], 'the next prompt is a change')
  })
})
