/**
 * The reading the two document validators share: the peak rate catalog and the
 * price snapshot are different documents with the same job, a third party's
 * JSON held to a shape before anything judges by it.
 */

/** One object's members, or null when the value is not one. */
export function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}
