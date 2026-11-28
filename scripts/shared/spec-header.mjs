/**
 * spec-header.mjs — read specs and their @capability, @features and @risk
 * headers (D92). Test ids use layer/capability/name to survive source moves.
 */
import fs from 'node:fs'
import path from 'node:path'
import { filesUnder } from './file-walk.mjs'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const SPECS = path.join(ROOT, 'packages', 'testing', 'specs')
const LAYERS = ['logic', 'mechanism', 'behaviour']
/** The areas a spec may name beside the feature directories. */
const AREAS = ['engine', 'shared', 'core', 'contracts']
const SKIPPED = new Set(['.git', 'node_modules'])

/** Walk every depth so misplaced specs still reach lint's path and header checks. */
function specFiles() {
  return filesUnder(SPECS, ['.spec.ts', '.spec.mjs'], SKIPPED)
    .map((full) => path.relative(ROOT, full).replace(/\\/g, '/'))
    .sort()
}

/** Whether a `<layer>/<capability>/<name>` spec id names a test in packages/testing/specs/. */
function specIdExists(id) {
  const [layer, capability, ...rest] = String(id).replace(/@[\w.]+$/g, '').split('/')
  const name = rest.join('/')
  const dir = path.join(SPECS, layer ?? '', capability ?? '')
  if (name === '' || !fs.existsSync(dir)) return false
  const quoted = [`'${name.replace(/'/g, "\\'")}'`, `"${name}"`]
  return fs.readdirSync(dir).filter((file) => /\.spec\.(ts|mjs)$/.test(file))
    .some((file) => quoted.some((literal) => fs.readFileSync(path.join(dir, file), 'utf8').includes(`test(${literal}`)))
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

export { ROOT, SPECS, LAYERS, AREAS, specFiles, specIdExists, readHeader, testId }
