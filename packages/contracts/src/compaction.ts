/**
 * Where automatic compaction fires, and what a manual request answers (D100).
 *
 * The compaction seam's `/compact` command and its step-boundary listener share one
 * policy: the backend fires at a fraction of the model's window, and never past the
 * room left after the request's own output reservation and the policy's headroom.
 * The rail states the same figure so a reader sees the distance the host works to,
 * and it is computed here rather than inside either half so a spec can pin it.
 */

/** The policy members the pressure threshold is made of. */
export interface CompactionPolicy {
  /** Fraction of the window pressure is measured against; the backend defaults to 0.8. */
  thresholdRatio?: unknown
  /** Room kept beyond the output reservation; the backend defaults to 65536 tokens. */
  headroomTokens?: unknown
  /** Output tokens one request reserves, used when the request states none. */
  maxTokens?: unknown
}

/** Everything the arithmetic needs from one session. */
export interface CompactionInputs {
  /** The route's context window in tokens. */
  contextWindow?: unknown
  /** Output tokens the latest request reserved for itself. */
  reservedOutput?: unknown
  /** The backend's policy for the routed model, or null when it states none. */
  policy?: CompactionPolicy | null
}

const positive = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null

const nonNegative = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null

/**
 * The tokens a session may hold before automatic compaction runs.
 *
 * @param inputs - the window, the request's own output reservation, and the policy.
 * @returns the threshold in tokens, or null when the host states no usable policy
 *   (no ratio, no window, or a reservation that leaves no pressure budget).
 */
export function compactionThreshold(inputs: CompactionInputs): number | null {
  const window = positive(inputs.contextWindow)
  const ratio = positive(inputs.policy?.thresholdRatio)
  if (window === null || ratio === null || ratio > 1) return null
  const headroom = nonNegative(inputs.policy?.headroomTokens) ?? 0
  const reserved = nonNegative(inputs.reservedOutput) ?? nonNegative(inputs.policy?.maxTokens) ?? 0
  const pressureBudget = window - reserved - headroom
  if (pressureBudget <= 0) return null
  return Math.floor(Math.min(window * ratio, pressureBudget))
}

/** What stopped a manual compaction, in the terms the rail can name itself. */
export type CompactionFailure =
  /** The session has no live agent to compact. */
  | 'no-agent'
  /** The host offers no compaction command and no readable backend. */
  | 'unavailable'

/** The compact route's answer. */
export interface PanelCompactAnswer {
  ok?: boolean
  /** What stopped the request, when the rail can name it without the host's words. */
  code?: CompactionFailure
  /** The host's own sentence about the attempt, when it answered with one. */
  text?: string
  error?: string
}

/**
 * The policy the host's compaction backend states when it states none: 80% of the
 * window, with 64 Ki tokens kept free beyond the request's own output reservation.
 *
 * These are the backend's documented defaults. A host that loads the backend inside
 * an isolated scope publishes no policy to a plugin, so the rail reads the defaults
 * the backend itself would apply (D100).
 */
export const DEFAULT_COMPACTION_POLICY: CompactionPolicy = { thresholdRatio: 0.8, headroomTokens: 65_536 }
