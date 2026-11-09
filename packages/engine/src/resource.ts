import { notifyAll } from './notify'

/** A JSON answer from one of the host half's routes: an object whose fields the adopter checks one by one. */
export type HostAnswer = Record<string, unknown> | null

/**
 * One GET per arming; failed fetches keep defaults and re-arm for retry (D12).
 * `adopt` returning undefined ignores the answer; its exceptions must surface as caller bugs.
 */
export function createHostResource<T>(route: string, adopt: (data: HostAnswer) => T | undefined) {
  let requested = false
  const listeners: ((value: T) => void)[] = []

  function load() {
    if (requested) return
    requested = true
    fetch(route, { credentials: 'same-origin' })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      // Handle fetch rejection beside the fulfilment branch so adopt() errors still surface.
      .then(data => {
        const value = adopt(data)
        if (value !== undefined) notifyAll(listeners, value)
      }, () => {
        requested = false
      })
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
    requested = false
  }

  return { load, onLoaded, reset }
}
