/**
 * A prompt already waiting when the page opens, a subagent's finish and a muted
 * switch each change what the reader hears; the cues follow the host's own
 * status and nothing else.
 *
 * @capability sound-cues
 * @features sound-cues
 * @risk A pending prompt cues at load, a subagent's finish reads as the task's finish, two events in one window play twice, or a muted switch still starts the player.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { sessionList, setup } from './host.mjs'

export default spec({ page: 'late-forms' }, ({ test }) => {
  test('a prompt and a finished top-level session each cue once', async (t) => {
    const initial = { a: { running: true } }
    const host = await setup(t, { status: initial, list: sessionList(initial) })
    t.expectThat.equal(host.posts, [], 'a run already going at load is the baseline')

    await host.status({ a: { running: true, pendingInteraction: { kind: 'permission' } } })
    t.expectThat.equal(host.posts, [{ name: 'pop', volume: 0.35 }], 'the prompt plays Pop at the default volume')

    await host.status({ a: { running: true, pendingInteraction: { kind: 'permission' } } })
    t.expectThat.equal(host.posts.length, 1, 'the same pending prompt does not play again')

    await host.status({ a: { running: true } })
    await host.status({ a: { running: false } })
    t.expectThat.equal(host.posts, [{ name: 'pop', volume: 0.35 }, { name: 'tink', volume: 0.35 }], 'the finished run plays Tink')
  })

  test('a subagent waiting cues, and its finish stays quiet', async (t) => {
    const initial = { s: { running: true } }
    const host = await setup(t, { status: initial, list: sessionList(initial, { subagents: ['s'] }) })
    await host.status({ s: { running: false } })
    t.expectThat.equal(host.posts, [], 'a subagent stopping is not the task finishing')

    await host.status({ s: { running: false, pendingInteraction: { kind: 'permission' } } })
    t.expectThat.equal(host.posts, [{ name: 'pop', volume: 0.35 }], 'a subagent waiting for the reader still plays Pop')
  })

  test('two events in one reading collapse into the permission cue', async (t) => {
    const initial = { a: { running: true } }
    const host = await setup(t, { status: initial, list: sessionList(initial) })
    await host.status({ a: { running: false, pendingInteraction: { kind: 'permission' } } }, 0)
    await host.wait(500)
    t.expectThat.equal(host.posts, [{ name: 'pop', volume: 0.35 }], 'one window, and the prompt outranks the stop')
  })

  test('the switches and the volume are read at the moment of the cue', async (t) => {
    const initial = { a: { running: true } }
    const host = await setup(t, { status: initial, list: sessionList(initial) })

    await t.prefs({ soundPermission: false })
    await host.status({ a: { running: true, pendingInteraction: { kind: 'permission' } } })
    t.expectThat.equal(host.posts, [], 'a muted prompt starts nothing')
    await host.status({ a: { running: true } })

    await t.prefs({ soundPermission: true, soundCompletion: false })
    await host.status({ a: { running: false } })
    t.expectThat.equal(host.posts, [], 'a muted finish starts nothing')

    await t.prefs({ soundCompletion: true, soundVolume: 'clear' })
    await host.status({ a: { running: true } })
    await host.status({ a: { running: false } })
    t.expectThat.equal(host.posts, [{ name: 'tink', volume: 0.55 }], 'the volume switch reaches the route')

    await t.prefs({ soundCues: false })
    await host.status({ a: { running: true, pendingInteraction: { kind: 'permission' } } })
    t.expectThat.equal(host.posts.length, 1, 'the master switch stops the feature')
  })

  test('a prompt already pending at load is the baseline', async (t) => {
    const initial = { a: { running: true, pendingInteraction: { kind: 'permission' } } }
    const host = await setup(t, { status: initial, list: sessionList(initial) })
    t.expectThat.equal(host.posts, [], 'the prompt was there before the page')

    await host.status({ a: { running: true } })
    await host.status({ a: { running: true, pendingInteraction: { kind: 'permission' } } })
    t.expectThat.equal(host.posts, [{ name: 'pop', volume: 0.35 }], 'the next prompt is a change')
  })
})
