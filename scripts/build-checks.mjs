/**
 * build-checks.mjs — the build's refusals that are not about the stylesheets
 * (those are in scripts/css.mjs): the type check, the import graph, the
 * scroll owner's monopoly, every source reaching the bundle, every feature
 * directory against its manifest, and the host contract and timing tables
 * (D36, D40, D72, D3).
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { loadModule } from './shared/ts-module.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC = path.join(ROOT, 'packages', 'client', 'src')

/** The page states and check kinds packages/contracts/src/table.ts records (D3, D86). */
const PROBE_STATES = new Set(['any', 'hero', 'sending', 'streaming', 'conversation', 'menu', 'dark'])
const PROBE_KINDS = new Set(['selector', 'attribute', 'property', 'computed', 'global', 'value', 'rail-geometry', 'none'])

/**
 * Refuse a source file that does not ship: a stylesheet no manifest and no
 * theme entry names, or a module nothing imports, would otherwise sit in packages/client/src/
 * with no way to reach the page. Manifests are data the build reads, the
 * contract table is read by the build and the tests (D3), and pure.ts is the
 * logic surface the specs call (D86); none of them is a module the bundle carries.
 *
 * @param bundled - the modules in the bundle (esbuild's metafile), relative to packages/client/src.
 * @param sheets - every stylesheet the bundle carries (styleFiles).
 */
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

/**
 * Refuse a host package in `dependencies` (D36): both halves reach the host at
 * runtime — the client half through the loader's own `require`, the host half
 * through the harness beside its bin — so nothing here is imported from the
 * package's own tree. An entry on `@deepseek-ai/*` makes an installer pull that
 * package's whole closure into the profile, where it stands beside the copy
 * every other plugin resolves its host imports from; the two copies disagree and
 * the app stops starting (issue #39). A package that has to share the host's
 * instance is declared in `peerDependencies` (and in `devDependencies`, for the
 * type check and the tests), which installs nothing.
 */
export function checkDependencies() {
  const { dependencies } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  const host = Object.keys(dependencies ?? {}).filter((name) => name.startsWith('@deepseek-ai/'))
  if (host.length > 0) {
    throw new Error(`build: package.json declares ${host.join(', ')} in "dependencies"; the host's packages come from the host at runtime (D36) — declare them in peerDependencies and devDependencies instead`)
  }
}

/**
 * Hold the manifests to the rest of the repository: every feature directory
 * carries at least one manifest. A `pref` names a key of the shared preference
 * table, which the reader of the manifests itself refuses
 * (scripts/shared/read-manifests.mjs).
 *
 * @param manifests - the feature manifests (scripts/shared/read-manifests.mjs).
 */
export function checkManifests(manifests) {
  const covered = new Set(manifests.map((manifest) => manifest.dir))
  for (const dir of fs.readdirSync(path.join(SRC, 'features'), { withFileTypes: true })) {
    if (dir.isDirectory() && !covered.has(dir.name)) throw new Error(`build: packages/client/src/features/${dir.name}/ has no manifest`)
  }
}

/**
 * Type-check the browser half, the contract and engine packages and the specs
 * (tsconfig.json, strict). esbuild only strips types, so this is what turns a
 * missing import, a misspelt name or a wrong argument into a build failure.
 */
export function checkTypes() {
  const tsc = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc')
  try {
    execFileSync(process.execPath, [tsc, '-p', ROOT, '--pretty'], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' })
  } catch (error) {
    process.stderr.write(error.stdout + error.stderr)
    throw new Error('build: tsc reports type errors (listed above)')
  }
}

/**
 * Refuse an import cycle. Modules in a cycle evaluate one before the other has
 * finished, so a constant read across it can be read before it is initialized.
 *
 * @param metafile - esbuild's metafile for the bundle.
 */
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

/**
 * Hold the host contract together (D3).
 *
 * The literals the skin keys on live in packages/contracts/src/dom.ts and the table of
 * what they mean in packages/contracts/src/table.ts; neither may drift from the other,
 * and every entry has to be claimed by a feature manifest (D72), so a selector
 * cannot enter the skin without a note and an owner, and a host upgrade can be
 * audited by walking one list.
 *
 * @param manifests - the feature manifests (scripts/shared/read-manifests.mjs).
 * @returns the table, for the build log.
 */
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
  // Every entry says how the contract test checks it (D3), so a host upgrade
  // walks one list with no entry quietly unchecked.
  for (const entry of table) {
    const probe = entry.probe
    if (probe === null || typeof probe !== 'object') throw new Error(`build: packages/contracts/src/table.ts entry "${entry.id}" has no probe`)
    if (!PROBE_STATES.has(probe.state)) throw new Error(`build: packages/contracts/src/table.ts entry "${entry.id}" has probe state "${probe.state}"`)
    if (!PROBE_KINDS.has(probe.kind)) throw new Error(`build: packages/contracts/src/table.ts entry "${entry.id}" has probe kind "${probe.kind}"`)
    if (probe.within !== undefined && !listed.has(probe.within)) throw new Error(`build: packages/contracts/src/table.ts entry "${entry.id}" is checked within "${probe.within}", which the table does not list`)
    // A computed reading names the property it reads and the snapshot key it
    // compares, so a host value cannot enter the table with nothing to read it
    // against or a probe with no property at all.
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

/**
 * Whether a spec answers to a stable id `<layer>/<capability>/<test name>`: a
 * spec file of that capability declares a test of that name (D86).
 */
function specIdExists(id) {
  const [layer, capability, ...rest] = id.split('/')
  const name = rest.join('/')
  const dir = path.join(ROOT, 'packages', 'testing', 'specs', layer ?? '', capability ?? '')
  if (name === '' || !fs.existsSync(dir)) return false
  const quoted = [`'${name.replace(/'/g, "\\'")}'`, `"${name}"`]
  return fs.readdirSync(dir).filter((file) => /\.spec\.(ts|mjs)$/.test(file))
    .some((file) => quoted.some((literal) => fs.readFileSync(path.join(dir, file), 'utf8').includes(`test(${literal}`)))
}

/**
 * Hold the timing table to its checks (D3).
 *
 * The timing assumptions live in packages/contracts/src/timing.ts, each naming what holds
 * it: a scenario of the end-to-end lane or a spec by its stable id (D86). Both
 * names have to exist, so an assumption cannot enter the table with nothing that
 * would notice it changing.
 */
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

/**
 * Refuse a module other than the scroll owner importing the spring: the chat
 * area's positions have one writer (D40), and a direct ease would bypass its
 * arbitration.
 *
 * @param metafile - esbuild's metafile for the bundle.
 */
export function checkScrollOwner(metafile) {
  for (const [file, input] of Object.entries(metafile.inputs)) {
    if (file === 'packages/engine/src/scroll-owner.ts') continue
    if (input.imports.some((item) => item.path === 'packages/engine/src/scroll-ease.ts')) {
      throw new Error(`build: ${file} imports packages/engine/src/scroll-ease.ts; positions go through packages/engine/src/scroll-owner.ts (D40)`)
    }
  }
}

/**
 * Refuse an easing curve written as a literal in the browser half (D9): a curve
 * is a token, so a Web Animations call names one through
 * packages/client/src/shared/motion.ts and a curve changed in the token table reaches
 * every animation. `linear` and the step functions are mechanical timing and
 * stay; the check reads the `easing` option of a keyframe or of an animation.
 * A stacking level above the local orders is refused the same way (D9): the
 * browser half marks the element, and a sheet places it on a layer.
 *
 * @param sources - the browser half on its syntax tree (scripts/source-tree.mjs).
 */
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
