/** Shared readers accept the host's streamed JSON text and settled argument objects (D73). */

/** A call's parsed arguments. */
export type CallArgs = Record<string, unknown>

/** Parse the raw argument JSON; null when it is cut off mid-stream or is not an object. */
export function callArgsOf(argsRaw: string): CallArgs | null {
  let value: unknown
  try {
    value = JSON.parse(argsRaw)
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return value as CallArgs
}

/** The first non-empty string field, in the order given. */
export function callString(args: CallArgs, keys: string[]) {
  for (const key of keys) {
    const value = args[key]
    if (typeof value === 'string' && value !== '') return value
  }
  return undefined
}
