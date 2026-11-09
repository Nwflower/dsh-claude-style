/**
 * The binding between the skin's preferences and the host's settings form
 * (D75): a field this page is writing keeps the reader's value while the host
 * re-publishes the document mid-write, a refused write lands back on the stored
 * value, and a change made elsewhere is adopted once nothing of ours is in flight.
 * The host's form writes only when the spec settles it.
 *
 * @capability settings-sync
 * @features engine, settings
 * @risk A switch the reader flips in settings jumps back and forth while the host saves it, or a choice made on another device never arrives on this page.
 */
import { expect, test } from 'vitest'
import { createSettingsBinding } from '@dsh-claude-style/engine/settings-binding'
import type { HostContext } from '@dsh-claude-style/engine/host'

function hostForm(values: Record<string, unknown>) {
  let held = { ...values }
  let revision = 1
  const listeners = new Set<() => void>()
  const queued: { name: string, value: unknown, resolve(accepted: boolean): void }[] = []
  const refusedByConfig = new Set<string>()

  /** Publish the document the mirror holds: a fresh value object, as a re-read gives. */
  function publish() {
    held = { ...held }
    for (const listener of [...listeners]) listener()
  }

  const form = {
    getSnapshot: () => ({ status: 'ready', value: held, revision }),
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    set(name: string, value: unknown) {
      // set() throws for a field path this Config does not carry, before anything crosses the wire.
      if (refusedByConfig.has(name)) throw new Error(`Config field "${name}" is not volatile`)
      return new Promise<boolean>(resolve => { queued.push({ name, value, resolve }) })
    },
  }
  const forms = {
    describe: () => ({
      getSnapshot: () => ({ status: 'ready', view: { namespaces: [{ ns: 'ui-skin-test' }] } }),
      subscribe: () => () => {},
      ensure: () => {},
    }),
    get: () => form,
  }
  const ctx = {
    get: (name: string) => name === 'configForms' ? forms : undefined,
    fiber: { entry: { id: 'boot:ui-skin-test' } },
  } as unknown as HostContext

  return {
    ctx,
    publish,
    /** One field changing elsewhere, which the document then carries. */
    change(name: string, value: unknown) {
      held = { ...held, [name]: value }
      revision += 1
      publish()
    },
    /** The host answers the oldest queued write; an accepted one lands in the document first. */
    settle(accepted: boolean) {
      const write = queued.shift()
      if (write === undefined) throw new Error('no write is queued')
      if (accepted) {
        held = { ...held, [write.name]: write.value }
        revision += 1
      }
      publish()
      write.resolve(accepted)
    },
    refuseByConfig(name: string) {
      refusedByConfig.add(name)
    },
  }
}

/** A binding over that host, collecting every value it adopts. */
function boundHost(values: Record<string, unknown>) {
  const host = hostForm(values)
  const adopted: Record<string, unknown>[] = []
  const binding = createSettingsBinding({ namespaces: ['dsh-test-skin'], adoptForm(value) { adopted.push(value) } })
  expect(binding.adopt(host.ctx)).toBe(true)
  return { host, adopted, binding, seen: () => adopted.slice(-1)[0] }
}

/** Let a chained write reach the form: set() is called one microtask after save(). */
const sent = () => new Promise(resolve => setTimeout(resolve, 0))

test('the form answers with the document it holds', () => {
  const { seen } = boundHost({ turnNav: true, viewTabs: true })
  expect(seen()).toEqual({ turnNav: true, viewTabs: true })
})

test('a field this page is writing keeps its value while the document is re-read mid-write', async () => {
  const { host, adopted, binding, seen } = boundHost({ turnNav: true, viewTabs: true })
  const saving = binding.save({ turnNav: false })
  await sent()
  const from = adopted.length
  host.publish()
  host.publish()
  expect(adopted.slice(from).map(value => value.turnNav)).toEqual([false, false])
  host.settle(true)
  expect(await saving).toBe(true)
  expect(seen()).toEqual({ turnNav: false, viewTabs: true })
})

test('a refused write lands on the stored value once it settles', async () => {
  const { host, binding, seen } = boundHost({ turnNav: true })
  const saving = binding.save({ turnNav: false })
  await sent()
  host.publish()
  expect(seen()).toEqual({ turnNav: false })
  host.settle(false)
  expect(await saving).toBe(false)
  expect(seen()).toEqual({ turnNav: true })
})

test('a field the Config does not carry is released when set() refuses it', async () => {
  const { host, binding, seen } = boundHost({ turnNav: true })
  host.refuseByConfig('turnNav')
  expect(await binding.save({ turnNav: false })).toBe(false)
  host.publish()
  expect(seen()).toEqual({ turnNav: true })
})

test('an earlier write settling does not drop a later write to the same field', async () => {
  const { host, binding, seen } = boundHost({ turnNav: true })
  const first = binding.save({ turnNav: false })
  const second = binding.save({ turnNav: true })
  await sent()
  host.settle(true)
  await first
  // The document holds the first write's value while the second still crosses:
  // the reader's latest choice stands until that one answers.
  host.publish()
  expect(seen()).toEqual({ turnNav: true })
  host.settle(true)
  await second
  expect(seen()).toEqual({ turnNav: true })
})

test('a change from elsewhere is adopted once nothing of ours is in flight', async () => {
  const { host, binding, seen } = boundHost({ turnNav: true })
  const saving = binding.save({ turnNav: false })
  await sent()
  host.settle(true)
  await saving
  host.change('viewTabs', false)
  expect(seen()).toEqual({ turnNav: false, viewTabs: false })
})

test('a field the write did not carry is adopted while another one is held', async () => {
  const { host, binding, seen } = boundHost({ turnNav: true, viewTabs: true })
  const saving = binding.save({ turnNav: false })
  await sent()
  host.change('viewTabs', false)
  expect(seen()).toEqual({ turnNav: false, viewTabs: false })
  host.settle(true)
  await saving
})

test('a write with no form bound holds nothing', async () => {
  const host = hostForm({ turnNav: true })
  const adopted: Record<string, unknown>[] = []
  const binding = createSettingsBinding({ namespaces: ['dsh-test-skin'], adoptForm(value) { adopted.push(value) } })
  expect(await binding.save({ turnNav: false })).toBe(null)
  expect(binding.adopt(host.ctx)).toBe(true)
  host.change('viewTabs', false)
  expect(adopted.slice(-1)[0]).toEqual({ turnNav: true, viewTabs: false })
})
