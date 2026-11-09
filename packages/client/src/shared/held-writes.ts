/** Track raw host declarations so our rewrites are never mistaken for new host values and teardown can restore them. */

interface Held {
  raw: string
  written: string
}

export interface HeldWrites {
  /** The host's own value, unwrapping this feature's write while it still stands. */
  hostValue(element: HTMLElement, property: string, current: string): string
  /** Write `next` beside the host's `raw`; equal values leave no record behind. */
  write(element: HTMLElement, property: string, raw: string, next: string): void
  /** Put every host value back, for the declarations this feature still holds. */
  restore(): void
}

export function heldWrites(): HeldWrites {
  const held = new Map<HTMLElement, Map<string, Held>>()

  function hostValue(element: HTMLElement, property: string, current: string) {
    const record = held.get(element)?.get(property)
    return record !== undefined && record.written === current ? record.raw : current
  }

  function write(element: HTMLElement, property: string, raw: string, next: string) {
    const own = held.get(element)
    if (next === raw) {
      if (own !== undefined) {
        own.delete(property)
        if (own.size === 0) held.delete(element)
      }
      return
    }
    element.style.setProperty(property, next)
    const map = own ?? new Map<string, Held>()
    map.set(property, { raw, written: next })
    held.set(element, map)
  }

  function restore() {
    for (const [element, declarations] of held) {
      for (const [property, record] of declarations) {
        if (element.style.getPropertyValue(property) === record.written) element.style.setProperty(property, record.raw)
      }
    }
    held.clear()
  }

  return { hostValue, write, restore }
}
