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

/** Wait for the browser to run `count` frames. */
export async function frames(count: number) {
  for (let at = 0; at < count; at += 1) await new Promise(resolve => requestAnimationFrame(resolve))
}
