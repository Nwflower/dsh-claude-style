/** Number of categorical colours the Models chart and its legend share. */
export const HOME_MODEL_COLOUR_COUNT = 10

/** FNV-1a gives one model id a stable first choice without reading its usage rank. */
function preferredColour(id: string) {
  let hash = 2166136261
  for (let index = 0; index < id.length; index += 1) hash = Math.imul(hash ^ id.charCodeAt(index), 16777619)
  return (hash >>> 0) % HOME_MODEL_COLOUR_COUNT
}

/**
 * Assign distinct colours to the models on show. Ids are sorted so a rerender or
 * a change in token rank cannot reshuffle them; a hash collision walks to the
 * next unused colour. More than ten models reuse the wheel.
 */
export function createHomeModelColours() {
  /** Assignments live for this installed home feature, across ranks and range windows. */
  const assigned = new Map<string, number>()
  return function assign(ids: readonly string[]): Record<string, number> {
    const unique = [...new Set(ids)].sort()
    const out: Record<string, number> = {}
    for (const id of unique) {
      const held = assigned.get(id)
      if (held !== undefined) {
        out[id] = held
        continue
      }
      const used = new Set(assigned.values())
      let colour = preferredColour(id)
      while (used.size < HOME_MODEL_COLOUR_COUNT && used.has(colour)) colour = (colour + 1) % HOME_MODEL_COLOUR_COUNT
      assigned.set(id, colour)
      out[id] = colour
    }
    return out
  }
}
