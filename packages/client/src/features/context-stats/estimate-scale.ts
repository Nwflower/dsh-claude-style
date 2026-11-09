/* Recent settled-token ratios calibrate estimates across tokenizers. The median rejects outlier
   steps; settlements below RATIO_FLOOR are too small to provide a useful sample. */

export const SCALE_MIN = 0.9
export const SCALE_MAX = 1.1

const SAMPLE_COUNT = 20
const RATIO_FLOOR = 40

function median(samples: readonly number[]) {
  const ordered = [...samples].sort((left, right) => left - right)
  const middle = ordered.length >> 1
  return ordered.length % 2 === 0 ? (ordered[middle - 1] + ordered[middle]) / 2 : ordered[middle]
}

export function estimateScale(samples: readonly number[]) {
  if (samples.length === 0) return 1
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, 1 / median(samples)))
}

export function recordSettlement(samples: readonly number[], estimated: number, settled: number) {
  if (estimated <= 0 || settled < RATIO_FLOOR) return samples
  const next = [...samples, estimated / settled]
  return next.length <= SAMPLE_COUNT ? next : next.slice(next.length - SAMPLE_COUNT)
}
