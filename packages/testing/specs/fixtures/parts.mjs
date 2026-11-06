/** The class the part walk reads for one part name, with the fixture's own hash. */
export function partClass(table, part) {
  const stem = Object.keys(table).find((candidate) => table[candidate] === part)
  if (stem === undefined) throw new Error(`no class stem marks the part "${part}"`)
  return `_${stem}_x_1`
}
