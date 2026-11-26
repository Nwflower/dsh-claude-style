/**
 * The last value one build produced, handed back while every input it was built
 * from is still the same object.
 *
 * The host replaces a snapshot, a list or a service when it changes and never
 * mutates one in place, so an identity comparison is the whole test of whether
 * a value derived from them still stands. A memo holds one value: a reader that
 * derives several values keeps one memo for each.
 */
export interface IdentityMemo<Value> {
  /** The held value when `inputs` match the last build's one for one; otherwise build, hold and answer the new value. */
  get(inputs: readonly unknown[], build: () => Value): Value
  /** Forget the held value, so the next `get` builds. */
  clear(): void
}

export function createIdentityMemo<Value>(): IdentityMemo<Value> {
  let held: { inputs: readonly unknown[], value: Value } | null = null
  return {
    get(inputs, build) {
      if (held !== null && held.inputs.length === inputs.length && held.inputs.every((input, index) => input === inputs[index])) return held.value
      const value = build()
      held = { inputs, value }
      return value
    },
    clear() {
      held = null
    },
  }
}
