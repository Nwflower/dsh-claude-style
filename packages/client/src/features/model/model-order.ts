import type { HostModelEntry } from '@dsh-claude-style/contracts/services'

/** Ascending code-unit order on `model.id`, used for the unbranded second tier. */
export function byModelId(a: HostModelEntry, b: HostModelEntry) {
  const left = String(a.id)
  const right = String(b.id)
  return left < right ? -1 : left > right ? 1 : 0
}

/**
 * One provider's row order: recognised vendor lockups lead the unbranded second
 * tier, vendors sort by brand id, models within one vendor keep the catalog
 * sequence via stable `Array.prototype.sort`, and unbranded models sort by
 * `model.id`.
 */
export function modelComparator(
  readBrand: (modelId: unknown, modelName: unknown) => string | null,
) {
  return (a: HostModelEntry, b: HostModelEntry): number => {
    const left = readBrand(a.id, a.name)
    const right = readBrand(b.id, b.name)
    if (left !== null && right !== null) return left < right ? -1 : left > right ? 1 : 0
    if (left !== null) return -1
    if (right !== null) return 1
    return byModelId(a, b)
  }
}
