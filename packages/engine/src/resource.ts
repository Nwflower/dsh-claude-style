import { notifyAll } from './notify'

/** A JSON answer from one of the host half's routes: an object whose fields the adopter checks one by one. */
export type HostAnswer = Record<string, unknown> | null

/** Same-origin JSON transport; HTTP and decoding failures belong to the request boundary (D12). */
export async function readHostJson(route: string, init: RequestInit = {}): Promise<HostAnswer> {
  const headers = new Headers(init.headers)
  if (!headers.has('accept')) headers.set('accept', 'application/json')
  const response = await fetch(route, {
    ...init,
    credentials: 'same-origin',
    headers,
  })
  const body = await response.json()
  if (!response.ok) throw new Error(typeof body?.error === 'string' ? body.error : `HTTP ${response.status}`)
  return body
}

/**
 * One request per owner; reset aborts the transport and invalidates asynchronous adoption.
 * Each caller owns a generation, view or session lifetime (D12, D73). Adopters prepare
 * values; only publish mutates held state, after the asynchronous value is still current.
 */
export function createHostRequest<T>(
  adopt: (data: HostAnswer) => T | undefined | Promise<T | undefined>,
  publish: (value: T) => void,
) {
  let epoch = 0
  let pending: Promise<T | undefined> | null = null
  let controller: AbortController | null = null

  function load(route: string, init: RequestInit = {}, onError?: (error: unknown) => void): Promise<T | undefined> {
    if (pending !== null) return pending
    const started = ++epoch
    controller = new AbortController()
    const current = () => started === epoch
    pending = readHostJson(route, { ...init, signal: controller.signal }).then(async data => {
      if (!current()) return undefined
      const value = await adopt(data)
      if (!current()) return undefined
      pending = null
      controller = null
      if (value !== undefined) publish(value)
      return current() ? value : undefined
    }, error => {
      if (!current()) return undefined
      pending = null
      controller = null
      // Only transport failures reach the caller's visible-error policy (D12).
      // Adoption and publication failures remain rejected programmer errors.
      if (onError === undefined) throw error
      onError(error)
      return undefined
    }).finally(() => {
      if (!current()) return
      pending = null
      controller = null
    })
    return pending
  }

  return {
    load,
    busy: () => pending !== null,
    reset() {
      epoch += 1
      controller?.abort()
      controller = null
      pending = null
    },
  }
}

/**
 * One GET per arming; failed fetches keep defaults and re-arm for retry (D12).
 * `adopt` returning undefined ignores the answer; its exceptions must surface as caller bugs.
 */
export function createHostResource<T>(route: string, adopt: (data: HostAnswer) => T | undefined) {
  let requested = false
  const listeners: ((value: T) => void)[] = []
  const request = createHostRequest(adopt, value => notifyAll(listeners, value))

  function load() {
    if (requested) return
    requested = true
    void request.load(route, {}, () => { requested = false })
  }

  /** Register a listener for the adoption; the returned call removes it. */
  function onLoaded(listener: (value: T) => void) {
    listeners.push(listener)
    return () => {
      const index = listeners.indexOf(listener)
      if (index !== -1) listeners.splice(index, 1)
    }
  }

  /** Re-arm: the next load() fetches again (a new host context). */
  function reset() {
    request.reset()
    requested = false
  }

  return { load, onLoaded, reset }
}
