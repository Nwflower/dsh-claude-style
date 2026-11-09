/**
 * The reasoning ladder's strength order, and the ordering of a model's own
 * levels into it.
 *
 * The host documents `reasoning.efforts` as "from least to greatest", and the
 * adapters in the wild break that (Qoder sends `xhigh, high, low, max,
 * medium`; Raccoon and MiniMax `high, none`). The slider reads its steps as a
 * strength scale — `Faster` and `Smarter` name the ends (model-labels.ts) — so
 * an inverted ladder puts the axis the wrong way round. This module restores
 * the documented order: a level the table can rank takes its place on the
 * scale, an unknown name keeps the position the adapter gave it.
 */

/**
 * Effort id to strength, larger being stronger; `none` and `off` rank lowest.
 *
 * The ids are the host's adapters' and the OpenAI protocol's, plus the
 * provider-private `light` (TRAE's weakest) and `on` (Raccoon's thinking-on,
 * which carries no strength of its own and ranks with `high`).
 */
const EFFORT_STRENGTH: Readonly<Record<string, number>> = Object.freeze({
  none: 0,
  off: 0,
  minimal: 1,
  light: 2,
  low: 3,
  medium: 4,
  high: 5,
  on: 5,
  xhigh: 6,
  max: 7,
  ultra: 8,
})

/** Whether the level's strength is known. */
export function isRankedEffort(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(EFFORT_STRENGTH, id)
}

/** One rung of a model's ladder: the level's id (undefined for the model's own default) and the name the control shows. */
export interface EffortStep {
  id: string | undefined
  name: string
}

/** The reasoning metadata a ladder is read from: the levels the model offers, and the level in force. */
export interface EffortLadder {
  reasoning: { defaultEffort?: string, efforts: { id: string, name: string }[] }
  effective: string | undefined
}

/**
 * Order one model's levels by strength.
 *
 * The levels the table can rank fill the slots the adapter gave them, sorted by
 * strength; a level it cannot rank stays in its own slot, where the documented
 * adapter order stands. `undefined` is the model's own default level, which
 * carries no strength and leads the ladder.
 *
 * @param ids - the adapter's level ids, in adapter order; `undefined` marks the
 *   model's own default level.
 * @returns the same ids in strength order.
 */
export function orderEffortIds(ids: readonly (string | undefined)[]): (string | undefined)[] {
  const ranked = ids.filter((id): id is string => id !== undefined && isRankedEffort(id))
  ranked.sort((left, right) => EFFORT_STRENGTH[left] - EFFORT_STRENGTH[right])
  const levels: (string | undefined)[] = []
  let next = 0
  for (const id of ids) {
    if (id === undefined) continue
    levels.push(isRankedEffort(id) ? ranked[next++] : id)
  }
  return [...ids.filter(id => id === undefined), ...levels]
}

/**
 * One model's ladder as the controls draw it: the model's own default level
 * leads when the adapter names no default of its own, then every declared level
 * in strength order. The index is the rung in force, or 0 while the catalog
 * names a level the ladder does not hold.
 *
 * @param effort - the catalog's reasoning descriptor.
 * @param defaultName - the word the model's own default level is shown by.
 */
export function effortSteps(effort: EffortLadder, defaultName: string): { steps: EffortStep[], index: number } {
  const declared = effort.reasoning.efforts
  const order = orderEffortIds([
    ...effort.reasoning.defaultEffort === undefined ? [undefined] : [],
    ...declared.map(level => level.id),
  ])
  const byId = new Map(declared.map(level => [level.id, level.name]))
  const steps = order.map((id): EffortStep => id === undefined
    ? { id, name: defaultName }
    : { id, name: byId.get(id) ?? id })
  let index = 0
  for (let at = 0; at < steps.length; at++) {
    if (steps[at].id === effort.effective) {
      index = at
      break
    }
  }
  return { steps, index }
}

/**
 * Where the rung in force stands on the trigger's colour ramp, or null for the
 * ink the trigger rests in.
 *
 * The ramp runs from the theme accent mixed toward the raised surface to the
 * same accent mixed toward the label ink, so every thinking level takes a
 * colour and the top rung wears the card's own accent. The switch-off level and
 * the model's own default have no strength the catalog names, so both rest.
 */
export function effortTint(steps: readonly EffortStep[], index: number): number | null {
  if (index < 0 || steps.length === 0) return null
  const id = steps[index].id
  if (id === undefined || EFFORT_STRENGTH[id] === 0) return null
  return steps.length < 2 ? 1 : index / (steps.length - 1)
}
