import { afterEach } from 'vitest'

/** Register cleanup during collection; run disposals before emptying the body between tests. */
export function pageCleanups() {
  const cleanups: (() => void)[] = []
  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) cleanup()
    document.body.replaceChildren()
  })
  return cleanups
}
