#!/usr/bin/env node
/** Read test limits from data/bounds.json so each adjustment stays beside its recorded reason (D87). */
import fs from 'node:fs'
import path from 'node:path'

const FILE = path.join(import.meta.dirname, 'data', 'bounds.json')
const TABLE = JSON.parse(fs.readFileSync(FILE, 'utf8'))

/** One bound's value by name; a name the table does not hold fails where it is read. */
function bound(name) {
  const entry = TABLE.bounds.find((item) => item.name === name)
  if (entry === undefined) throw new Error(`bounds: ${name} is not in packages/testing/data/bounds.json`)
  return entry.value
}

export { bound }
