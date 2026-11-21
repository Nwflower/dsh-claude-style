/**
 * The cleanup a mechanism spec's module stops share: every stop the spec
 * registered runs after each test, and the page's body is emptied, so one
 * test's mounts never answer another's reads.
 */
import { afterEach } from 'vitest'

export function moduleStops() {
  const stops: (() => void)[] = []
  afterEach(() => {
    for (const stop of stops.splice(0)) stop()
    document.body.replaceChildren()
  })
  return stops
}
