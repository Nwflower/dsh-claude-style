import { observeMatches, subscribeMutations } from './bus'

interface LayoutElements {
  selectors: readonly string[]
  bodyAttributes: readonly string[]
  sync(elements: readonly (HTMLElement | null)[]): void
  release(element: HTMLElement): void
}

/**
 * Watch replaceable layout seats and coalesce host writes before paint (D12, D40).
 * Per view: subscriptions and current elements are released on replacement or stop.
 * A queued microtask belongs to this installation and cannot write after stop.
 */
export function observeLayoutElements(options: LayoutElements) {
  let current: (HTMLElement | null)[] = []
  const heard: (() => void)[] = []
  let queued = false
  let stopped = false

  function schedule() {
    if (stopped || queued) return
    queued = true
    queueMicrotask(() => {
      queued = false
      if (stopped) return
      const next = matches.map(list => list.all()[0] ?? null)
      if (next.some((element, index) => element !== current[index])) {
        for (const stop of heard.splice(0)) stop()
        for (const element of current) {
          if (element !== null && !next.includes(element)) options.release(element)
        }
        current = next
        for (const element of current) {
          if (element !== null) heard.push(subscribeMutations(element, {
            attributes: true, attributeFilter: ['style'],
          }, schedule))
        }
      }
      options.sync(current)
    })
  }

  const matches = options.selectors.map(selector => observeMatches<HTMLElement>(selector, schedule))
  const stopBody = subscribeMutations(document.body, {
    attributes: true,
    attributeFilter: [...options.bodyAttributes],
  }, schedule)
  schedule()
  return () => {
    if (stopped) return
    stopped = true
    stopBody()
    for (const list of matches) list.release()
    for (const stop of heard.splice(0)) stop()
    for (const element of current) if (element !== null) options.release(element)
    current = []
  }
}
