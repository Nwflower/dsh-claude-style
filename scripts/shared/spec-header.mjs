/**
 * spec-header.mjs — read specs and their @capability, @features and @risk
 * headers (D87). Test ids use layer/capability/name to survive source moves.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const SPECS = path.join(ROOT, 'packages', 'testing', 'specs')
const LAYERS = ['logic', 'mechanism', 'behaviour']
/** The areas a spec may name beside the feature directories. */
const AREAS = ['engine', 'shared', 'core', 'contracts']

/** Walk every depth so misplaced specs still reach lint's path and header checks. */
function specFiles() {
  const found = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.spec\.(ts|mjs)$/.test(entry.name)) found.push(path.relative(ROOT, full).replace(/\\/g, '/'))
    }
  }
  if (fs.existsSync(SPECS)) walk(SPECS)
  return found.sort()
}

/** A header tag continues over following lines until the next tag or the comment ends. */
function readHeader(file) {
  const parts = file.split('/')
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8')
  const opening = /^(?:'use strict'\s*)?\/\*\*([\s\S]*?)\*\//.exec(text.trimStart())
  const tags = {}
  if (opening !== null) {
    let current = null
    for (const raw of opening[1].split('\n')) {
      const line = raw.replace(/^\s*\*\s?/, '').trimEnd()
      const tag = /^@(\w+)\s*(.*)$/.exec(line)
      if (tag !== null) {
        current = tag[1]
        tags[current] = tag[2]
      } else if (current !== null && line !== '') {
        tags[current] += ` ${line}`
      }
    }
  }
  return {
    file,
    layer: parts[3],
    directory: parts[4],
    capability: tags.capability,
    features: tags.features === undefined ? [] : tags.features.split(',').map((name) => name.trim()).filter(Boolean),
    risk: tags.risk,
    hasHeader: opening !== null,
  }
}

/** The stable id of one test of a spec. */
const testId = (header, name) => `${header.layer}/${header.capability ?? header.directory}/${name}`

export { ROOT, SPECS, LAYERS, AREAS, specFiles, readHeader, testId }
