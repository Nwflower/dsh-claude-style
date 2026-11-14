import type { Prefs } from '@dsh-claude-style/contracts/prefs'
import type { HostModelEntry } from '@dsh-claude-style/contracts/services'

/** Catalog order is whatever the provider happened to send; id order is scannable. */
export function byModelId(a: HostModelEntry, b: HostModelEntry) {
  const left = String(a.id)
  const right = String(b.id)
  return left < right ? -1 : left > right ? 1 : 0
}

/**
 * One provider's row order. Catalog order returns equality for every pair so
 * the stable array sort keeps the host's sequence. Brand order reads the same
 * rule table as the painted lockup; custom ranks name `provider/model` rows.
 */
export function modelComparator(
  order: Prefs['modelOrder'],
  provider: string,
  rows: readonly string[],
  readBrand: (modelId: unknown, modelName: unknown) => string | null,
) {
  if (order === 'id') return byModelId
  if (order === 'catalog') return () => 0
  const rank = new Map(rows.map((row, at) => [row, at]))
  const place = (model: HostModelEntry) => order === 'custom'
    ? rank.get(`${provider}/${model.id}`) ?? Number.MAX_SAFE_INTEGER
    : readBrand(model.id, model.name) === null ? 1 : 0
  return (a: HostModelEntry, b: HostModelEntry) => place(a) - place(b) || byModelId(a, b)
}
