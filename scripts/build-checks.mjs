/**
 * build-checks.mjs — the build's refusals that are not about the stylesheets (those are in
 * scripts/css.mjs): types, the import graph, the scroll owner, listed sources, manifests,
 * and the host contract and timing tables (D36, D40, D72, D3).
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { loadModule } from './shared/ts-module.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC = path.join(ROOT, 'packages', 'client', 'src')

/** The page states and check kinds packages/contracts/src/table.ts records (D3, D87). */
const PROBE_STATES = new Set(['any', 'hero', 'sending', 'streaming', 'conversation', 'menu', 'dark'])
const PROBE_KINDS = new Set(['selector', 'attribute', 'property', 'computed', 'global', 'value', 'rail-geometry', 'none'])

/** Refuse unreachable source files; manifests, contracts and pure.ts are intentional exceptions (D3, D87). */
export function checkListed(bundled, sheets) {
  const listed = new Set(sheets.map((sheet) => sheet.file))
  const walk = (dir) => fs.readdirSync(path.join(SRC, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = dir === '' ? entry.name : `${dir}/${entry.name}`
    if (entry.isDirectory()) return rel === 'assets' ? [] : walk(rel)
    return [rel]
  })
  for (const file of walk('')) {
    if (file.endsWith('.css') && !listed.has(file)) throw new Error(`build: packages/client/src/${file} is in no list; add it to its feature's manifest or to THEME_SHEETS`)
    if (file.endsWith('.manifest.ts') || file === 'pure.ts' || file.endsWith('.d.ts')) continue
    if (file.endsWith('.ts') && !bundled.has(file)) throw new Error(`build: packages/client/src/${file} is imported by no module the bundle reaches`)
  }
}

/** Host packages must be peers: a second installed copy disagrees with the running host (D36). */
export function checkDependencies() {
  const { dependencies } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  const host = Object.keys(dependencies ?? {}).filter((name) => name.startsWith('@deepseek-ai/'))
  if (host.length > 0) {
    throw new Error(`build: package.json declares ${host.join(', ')} in "dependencies"; the host's packages come from the host at runtime (D36) — declare them in peerDependencies and devDependencies instead`)
  }
}

/** Every feature directory needs a manifest; the shared reader validates preference keys. */
export function checkManifests(manifests) {
  const covered = new Set(manifests.map((manifest) => manifest.dir))
  for (const dir of fs.readdirSync(path.join(SRC, 'features'), { withFileTypes: true })) {
    if (dir.isDirectory() && !covered.has(dir.name)) throw new Error(`build: packages/client/src/features/${dir.name}/ has no manifest`)
  }
}

/** esbuild only strips types; tsc makes unresolved names and invalid arguments fail. */
export function checkTypes() {
  const tsc = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc')
  try {
    execFileSync(process.execPath, [tsc, '-p', ROOT, '--pretty'], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' })
  } catch (error) {
    process.stderr.write(error.stdout + error.stderr)
    throw new Error('build: tsc reports type errors (listed above)')
  }
}

/** Import cycles can expose constants before initialization. */
export function checkCycles(metafile) {
  const graph = new Map(Object.entries(metafile.inputs).map(([file, input]) => [file, input.imports.filter((item) => !item.external).map((item) => item.path)]))
  const state = new Map()
  const stack = []
  const visit = (file) => {
    state.set(file, 'open')
    stack.push(file)
    for (const next of graph.get(file) ?? []) {
      if (state.get(next) === 'open') {
        const cycle = [...stack.slice(stack.indexOf(next)), next].join(' → ')
        throw new Error(`build: import cycle ${cycle}`)
      }
      if (!state.has(next)) visit(next)
    }
    stack.pop()
    state.set(file, 'done')
  }
  for (const file of graph.keys()) if (!state.has(file)) visit(file)
}

/** Keep host literals, probe metadata and manifest owners synchronized (D3, D72). */
export function checkContracts(manifests) {
  const literals = loadModule('packages/contracts/src/dom.ts')
  const { HOST_DOM: table } = loadModule('packages/contracts/src/table.ts')
  if (!Array.isArray(table) || table.length === 0) throw new Error('build: packages/contracts/src/table.ts exports no HOST_DOM')
  const listed = new Set()
  for (const entry of table) {
    if (typeof entry.id !== 'string' || entry.id === '' || typeof entry.use !== 'string' || entry.use === '') {
      throw new Error(`build: packages/contracts/src/table.ts has an entry without an id and a use: ${JSON.stringify(entry)}`)
    }
    if (listed.has(entry.id)) throw new Error(`build: packages/contracts/src/table.ts lists "${entry.id}" twice`)
    listed.add(entry.id)
  }
  // Every entry says how the contract test checks it (D3), so a host upgrade walks one list.
  for (const entry of table) {
    const probe = entry.probe
    if (probe === null || typeof probe !== 'object') throw new Error(`build: packages/contracts/src/table.ts entry "${entry.id}" has no probe`)
    if (!PROBE_STATES.has(probe.state)) throw new Error(`build: packages/contracts/src/table.ts entry "${entry.id}" has probe state "${probe.state}"`)
    if (!PROBE_KINDS.has(probe.kind)) throw new Error(`build: packages/contracts/src/table.ts entry "${entry.id}" has probe kind "${probe.kind}"`)
    if (probe.within !== undefined && !listed.has(probe.within)) throw new Error(`build: packages/contracts/src/table.ts entry "${entry.id}" is checked within "${probe.within}", which the table does not list`)
    // A computed reading names the property it reads and the snapshot key it compares.
    if (probe.kind === 'computed' && (typeof probe.property !== 'string' || probe.property === '')) {
      throw new Error(`build: packages/contracts/src/table.ts entry "${entry.id}" is a computed probe with no property`)
    }
    if (probe.kind === 'computed' && probe.within === undefined) {
      throw new Error(`build: packages/contracts/src/table.ts entry "${entry.id}" is a computed probe naming no entry to read`)
    }
    if (probe.kind === 'computed' && (typeof probe.record !== 'string' || probe.record === '')) {
      throw new Error(`build: packages/contracts/src/table.ts entry "${entry.id}" is a computed probe with no snapshot record`)
    }
    if (probe.parent === true && probe.within === undefined) {
      throw new Error(`build: packages/contracts/src/table.ts entry "${entry.id}" reads its parent and names no entry to read it from`)
    }
  }
  const values = new Set(table.map((entry) => entry.value))
  // A bare attribute name is what the table lists for a value-less mark.
  const named = new Set(table.map((entry) => entry.name).filter((name) => typeof name === 'string'))
  for (const [name, value] of Object.entries(literals)) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(name) || (typeof value !== 'string' && typeof value !== 'number')) continue
    if (!values.has(String(value)) && !named.has(String(value))) {
      throw new Error(`build: packages/contracts/src/dom.ts exports ${name} (${JSON.stringify(value)}) with no entry in packages/contracts/src/table.ts`)
    }
  }
  const claimed = new Set()
  for (const manifest of manifests) {
    for (const id of manifest.contracts) {
      if (!listed.has(id)) throw new Error(`build: packages/client/src/${manifest.file} names host contract "${id}", which packages/contracts/src/table.ts does not list`)
      claimed.add(id)
    }
  }
  const unclaimed = table.filter((entry) => entry.owner !== 'core' && !claimed.has(entry.id)).map((entry) => entry.id)
  if (unclaimed.length > 0) throw new Error(`build: packages/contracts/src/table.ts entries no feature manifest claims: ${unclaimed.join(', ')}`)
  checkTiming()
  return table
}


function specIdExists(id) {
  const [layer, capability, ...rest] = id.split('/')
  const name = rest.join('/')
  const dir = path.join(ROOT, 'packages', 'testing', 'specs', layer ?? '', capability ?? '')
  if (name === '' || !fs.existsSync(dir)) return false
  const quoted = [`'${name.replace(/'/g, "\\'")}'`, `"${name}"`]
  return fs.readdirSync(dir).filter((file) => /\.spec\.(ts|mjs)$/.test(file))
    .some((file) => quoted.some((literal) => fs.readFileSync(path.join(dir, file), 'utf8').includes(`test(${literal}`)))
}

/** Every timing assumption needs an existing scenario or stable spec id (D3, D87). */
function checkTiming() {
  const { E2E_SCENARIOS, HOST_TIMING } = loadModule('packages/contracts/src/timing.ts')
  if (!Array.isArray(HOST_TIMING) || HOST_TIMING.length === 0) throw new Error('build: packages/contracts/src/timing.ts exports no HOST_TIMING')
  const scenarios = new Set(E2E_SCENARIOS)
  const seen = new Set()
  for (const entry of HOST_TIMING) {
    for (const field of ['id', 'assumption', 'use']) {
      if (typeof entry[field] !== 'string' || entry[field] === '') throw new Error(`build: packages/contracts/src/timing.ts has an entry without ${field}: ${JSON.stringify(entry)}`)
    }
    if (seen.has(entry.id)) throw new Error(`build: packages/contracts/src/timing.ts lists "${entry.id}" twice`)
    seen.add(entry.id)
    if (!Array.isArray(entry.checks) || entry.checks.length === 0) throw new Error(`build: packages/contracts/src/timing.ts entry "${entry.id}" names no check`)
    for (const check of entry.checks) {
      const [kind, name] = String(check).split(':')
      if (kind === 'scenario') {
        if (!scenarios.has(name)) throw new Error(`build: packages/contracts/src/timing.ts entry "${entry.id}" names the lane scenario "${name}", which packages/testing/e2e.mjs does not run`)
        continue
      }
      if (kind === 'spec') {
        if (!specIdExists(check.slice('spec:'.length))) throw new Error(`build: packages/contracts/src/timing.ts entry "${entry.id}" names the spec "${check.slice('spec:'.length)}", which no spec holds`)
        continue
      }
      throw new Error(`build: packages/contracts/src/timing.ts entry "${entry.id}" has the check "${check}", which is neither scenario:<name> nor spec:<id>`)
    }
  }
}

/** Only the scroll owner may import the spring so position writes stay arbitrated (D40). */
export function checkScrollOwner(metafile) {
  for (const [file, input] of Object.entries(metafile.inputs)) {
    if (file === 'packages/engine/src/scroll-owner.ts') continue
    if (input.imports.some((item) => item.path === 'packages/engine/src/scroll-ease.ts')) {
      throw new Error(`build: ${file} imports packages/engine/src/scroll-ease.ts; positions go through packages/engine/src/scroll-owner.ts (D40)`)
    }
  }
}

/** Read easing and nonlocal stacking from tokens so one table controls every animation and layer (D9). */
export function checkMotionSources(sources) {
  for (const [value, where] of sources.easings) {
    if (value === 'linear' || /^steps\(/.test(value)) continue
    throw new Error(`build: ${where} writes the easing curve "${value}"; read it from the token table through shared/motion.ts (D9)`)
  }
  for (const [value, where] of sources.stacking) {
    if (Number(value) <= 9) continue
    throw new Error(`build: ${where} writes the stacking level ${value}; mark the element and place it on a layer in its stylesheet (D9)`)
  }
}
