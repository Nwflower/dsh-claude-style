/**
 * Host JSON request ownership across reset, asynchronous adoption and failures.
 * @capability host-resource
 * @features brand, home, peakrate, context-stats
 * @risk An old answer replaces current images or costs, releases a newer pending request, or hides a programming error as unavailable data.
 */
import { expect, test } from 'vitest'
import { createHostRequest, createHostResource } from '@dsh-claude-style/engine/resource'

// Served by the spec server: the browser performs the real JSON fetch.
const route = '/packages/host/data/prices.json'
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(settle => { resolve = settle })
  return { promise, resolve }
}

test('one owner shares its in-flight transport and releases it after publication', async () => {
  const published: string[] = []
  const request = createHostRequest(() => 'ready', value => published.push(value))
  const first = request.load(route)
  expect(request.load(route)).toBe(first)
  expect(request.busy()).toBe(true)
  await first
  expect(published).toEqual(['ready'])
  expect(request.busy()).toBe(false)
})

test('reset isolates a late asynchronous answer and cannot release a newer request', async () => {
  const firstStarted = deferred<void>()
  const nextStarted = deferred<void>()
  const firstValue = deferred<string>()
  const nextValue = deferred<string>()
  const published: string[] = []
  let calls = 0
  const request = createHostRequest(() => {
    calls += 1
    if (calls === 1) {
      firstStarted.resolve()
      return firstValue.promise
    }
    nextStarted.resolve()
    return nextValue.promise
  }, value => published.push(value))
  const first = request.load(route)
  await firstStarted.promise
  request.reset()
  const next = request.load(route)
  await nextStarted.promise
  firstValue.resolve('old')
  expect(await first).toBeUndefined()
  expect(published).toEqual([])
  expect(request.busy()).toBe(true)
  expect(request.load(route)).toBe(next)
  nextValue.resolve('new')
  await next
  expect(published).toEqual(['new'])
  expect(request.busy()).toBe(false)
})

test('reset before the transport answers prevents adoption and permits a new request', async () => {
  let adopted = 0
  const request = createHostRequest(() => ++adopted, () => {})
  const first = request.load(route)
  request.reset()
  await first
  expect(adopted).toBe(0)
  await request.load(route)
  expect(adopted).toBe(1)
})

test('transport errors reach their policy; adoption and publication errors reject', async () => {
  const errors: unknown[] = []
  const request = createHostRequest(() => 'ready', () => {})
  await request.load('/missing-host-resource.json', {}, error => errors.push(error))
  expect(errors).toHaveLength(1)
  const adopter = createHostRequest(() => { throw new Error('adopt') }, () => {})
  await expect(adopter.load(route, {}, error => errors.push(error))).rejects.toThrow('adopt')
  const publisher = createHostRequest(() => 'ready', () => { throw new Error('publish') })
  await expect(publisher.load(route, {}, error => errors.push(error))).rejects.toThrow('publish')
  expect(errors).toHaveLength(1)
  expect(publisher.busy()).toBe(false)
})

test('the armed resource ignores a reset generation and keeps its listener contract', async () => {
  const values: number[] = []
  let adopted = 0
  const resource = createHostResource(route, () => ++adopted)
  const loaded = deferred<void>()
  const off = resource.onLoaded(value => { values.push(value); loaded.resolve() })
  resource.load()
  resource.reset()
  resource.load()
  await loaded.promise
  expect(values).toEqual([1])
  off()
  resource.reset()
})

test('a subscriber can start a new request without the old completion releasing it', async () => {
  const nextValue = deferred<string>()
  const nextStarted = deferred<void>()
  let calls = 0
  let next: Promise<string | undefined> | null = null
  const request = createHostRequest(() => {
    if (++calls === 1) return 'first'
    nextStarted.resolve()
    return nextValue.promise
  }, value => {
    if (value === 'first') next = request.load(route)
  })
  await request.load(route)
  await nextStarted.promise
  expect(request.busy()).toBe(true)
  nextValue.resolve('second')
  expect(await next).toBe('second')
  expect(request.busy()).toBe(false)
})
