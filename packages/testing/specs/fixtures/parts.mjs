/** The class the part walk reads for one part name, with the fixture's own hash. */
export function partClass(table, part) {
  const stem = Object.keys(table).find((candidate) => table[candidate] === part)
  if (stem === undefined) throw new Error(`no class stem marks the part "${part}"`)
  return `_${stem}_x_1`
}

/**
 * The class one of the host's local names needs, for an element a table reads by
 * that name alone: the shell frame is the root slot's own child, named by the
 * local name its class carries (parts-table.ts, rootParts).
 */
export function localClass(local) {
  return `_${local}_x_1`
}
