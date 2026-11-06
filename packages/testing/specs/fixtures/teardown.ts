/**
 * What every mechanism spec does around its cases: register the stops it
 * installs, run them after the case, empty the document, and wait a few frames
 * for the browser to catch up. This lived copy-pasted in each spec file —
 * jscpd counts those copies as duplicated code — so it lives here once and the
 * specs import it.
 */
import { afterEach } from 'vitest'

/** Every teardown a case registered. */
const cleanups: (() => void)[] = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  document.body.replaceChildren()
})

/** Register a teardown; the file's afterEach runs it when the case ends. */
export function cleanupWith(stop: () => void) {
  cleanups.push(stop)
}

export { frames } from './frames'
