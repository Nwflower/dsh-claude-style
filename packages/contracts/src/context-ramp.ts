/**
 * Context-occupancy colour ramp contract (D73): stop parsing, normalization and
 * built-in presets shared by the settings clamp and the browser evaluator.
 */

/** One stop along the 0–100 % context-occupancy axis. */
export interface ContextRampStop {
  /** Whole percentage in `0..100`, ascending across a ramp. */
  readonly at: number
  /** Lowercase `#rrggbb` colour at this stop. */
  readonly color: string
}

export const CONTEXT_RAMP_MIN_STOPS = 2
export const CONTEXT_RAMP_MAX_STOPS = 5
export const CONTEXT_RAMP_ENTRY_MAX = 120

export const CONTEXT_RAMP_MODE_DEFAULT = 'default'
export const CONTEXT_RAMP_MODE_CLASSIC = 'classic'
export const CONTEXT_RAMP_MODE_CUSTOM = 'custom'
export const CONTEXT_RAMP_MODES = [
  CONTEXT_RAMP_MODE_DEFAULT,
  CONTEXT_RAMP_MODE_CLASSIC,
  CONTEXT_RAMP_MODE_CUSTOM,
] as const
export type ContextRampMode = (typeof CONTEXT_RAMP_MODES)[number]

/** Shipped dark-theme ramp stops for the default mode. */
export const CONTEXT_RAMP_DEFAULT_DARK: readonly ContextRampStop[] = [
  { at: 40, color: '#6faf73' },
  { at: 62, color: '#cb936c' },
  { at: 80, color: '#d5746a' },
]

/** Shipped light-theme ramp stops for the default mode. */
export const CONTEXT_RAMP_DEFAULT_LIGHT: readonly ContextRampStop[] = [
  { at: 40, color: '#46784e' },
  { at: 62, color: '#af784e' },
  { at: 80, color: '#af514d' },
]

/** Classic blue-yellow-red ramp stops carried over from the retired `ring-band` face. */
export const CONTEXT_RAMP_CLASSIC_STOPS: readonly ContextRampStop[] = [
  { at: 55, color: '#257de0' },
  { at: 78, color: '#fbb315' },
  { at: 90, color: '#dc3c3d' },
]

export const CONTEXT_RAMP_CLASSIC = '55:#257de0,78:#fbb315,90:#dc3c3d'

const STOP_RE = /^(\d{1,3}):(#[0-9a-f]{6})$/i

/** Clamp a stop percentage to a whole number in `0..100`. */
export function clampRampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

/** Order stops by ascending percentage while preserving relative order at equal thresholds. */
export function sortContextRampStops(stops: readonly ContextRampStop[]): ContextRampStop[] {
  return stops
    .slice(0, CONTEXT_RAMP_MAX_STOPS)
    .map((stop, index) => ({
      at: clampRampPercent(stop.at),
      color: stop.color.toLowerCase(),
      index,
    }))
    .sort((left, right) => left.at - right.at || left.index - right.index)
    .map(({ at, color }) => ({ at, color }))
}

/** Serialize a list of stops into canonical `at:#rrggbb` comma-separated form. */
export function serializeContextRamp(stops: readonly ContextRampStop[]): string {
  const ordered = sortContextRampStops(stops)
  if (ordered.length < CONTEXT_RAMP_MIN_STOPS) return ''
  return ordered.map(stop => `${stop.at}:${stop.color}`).join(',')
}

/** Parse a stored ramp string, or return null when empty or malformed. */
export function parseContextRamp(raw: string): ContextRampStop[] | null {
  const trimmed = raw.trim()
  if (trimmed === '' || trimmed.length > CONTEXT_RAMP_ENTRY_MAX) return null
  const tokens = trimmed.split(',')
  if (tokens.length < CONTEXT_RAMP_MIN_STOPS || tokens.length > CONTEXT_RAMP_MAX_STOPS) return null
  const parsed: ContextRampStop[] = []
  for (let i = 0; i < tokens.length; i++) {
    const match = STOP_RE.exec(tokens[i].trim())
    if (match === null) return null
    const rawPercent = Number.parseInt(match[1], 10)
    if (!Number.isFinite(rawPercent) || rawPercent < 0 || rawPercent > 100) return null
    parsed.push({ at: rawPercent, color: match[2].toLowerCase() })
  }
  return sortContextRampStops(parsed)
}

/** Normalize an arbitrary stored value into `''` or canonical `at:#rrggbb,...`. */
export function normalizeContextRamp(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const parsed = parseContextRamp(raw)
  return parsed === null ? '' : serializeContextRamp(parsed)
}

/** Resolve the active ramp stops for the selected mode and appearance. */
export function resolveContextRampStops(mode: ContextRampMode, customRamp: string, dark: boolean): readonly ContextRampStop[] {
  if (mode === CONTEXT_RAMP_MODE_CLASSIC) return CONTEXT_RAMP_CLASSIC_STOPS
  if (mode === CONTEXT_RAMP_MODE_CUSTOM) {
    const parsed = parseContextRamp(customRamp)
    if (parsed !== null) return parsed
  }
  return dark ? CONTEXT_RAMP_DEFAULT_DARK : CONTEXT_RAMP_DEFAULT_LIGHT
}
