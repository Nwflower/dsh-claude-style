/** What every mechanism spec does around its cases: run the stops it registered after the case, then empty the document. */
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
