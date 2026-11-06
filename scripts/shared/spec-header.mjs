/**
 * The specs as data (D86): where they live, the header every one opens with,
 * and the stable id each test answers under. Lint, the behaviour runner and the
 * fault runner read the specs through this module alone, so the three agree on
 * what a spec is.
 *
 * A spec file lives at packages/testing/specs/<layer>/<capability>/<name>.spec.(ts|mjs)
 * and opens with a comment holding three tags:
 *
 *   @capability  the user ability it guards; the directory it sits in
 *   @features    the feature directories it covers, or engine / shared / core / contracts
 *   @risk        one sentence, in the reader's terms, of what goes wrong when it fails
 *
 * A test's id is `<layer>/<capability>/<test name>`: moving or renaming a source
 * file never moves it.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const SPECS = path.join(ROOT, 'packages', 'testing', 'specs')
const LAYERS = ['logic', 'mechanism', 'behaviour']
/** The areas a spec may name beside the feature directories. */
const AREAS = ['engine', 'shared', 'core', 'contracts']

/**
 * Every spec file, relative to the repository root with forward slashes. The
 * walk takes any depth under packages/testing/specs/, so a spec that sits
 * somewhere other than `<layer>/<capability>/` is found by lint and refused
 * rather than run by Vitest alone, out of sight of the header rules.
 */
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

/**
 * The header of one spec file: its layer and capability by place, and the tags
 * its opening comment carries. A tag's value runs on over the comment's
 * following lines until the next tag or the comment's end.
 */
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
