/**
 * build-host.mjs — build host modules separately into lib/host (D73): inline the unpublished
 * shared packages, keep relative and host-package imports as they are.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import esbuild from 'esbuild'

const PACKAGE = path.resolve(import.meta.dirname, '..', '..', 'packages', 'host')
const ROOT = path.resolve(PACKAGE, '..', '..')
const SOURCE = path.join(PACKAGE, 'src')
/** The package names a module's build resolves and inlines, each with the directory whose relative imports are inlined with it. */
const INLINED = [
  { prefix: '@dsh-claude-style/contracts/', dir: path.join(ROOT, 'packages', 'contracts', 'src') },
  { prefix: '@dsh-claude-style/engine/node/', dir: path.join(ROOT, 'packages', 'engine', 'node') },
]

/** Resolve shared modules and their relative imports; leave publishable imports external. */
const externalButShared = {
  name: 'external-but-shared',
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      const shared = INLINED.find(({ prefix }) => args.path.startsWith(prefix))
      // A linked worktree borrows node_modules; shared source belongs to this checkout.
      if (shared !== undefined) return { path: path.join(shared.dir, `${args.path.slice(shared.prefix.length)}.ts`) }
      if (args.kind === 'entry-point'
        || (args.path.startsWith('.') && INLINED.some(({ dir }) => args.importer.startsWith(`${dir}${path.sep}`)))) return undefined
      return { path: args.path, external: true }
    })
  },
}


function checkTypes() {
  const tsc = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc')
  try {
    execFileSync(process.execPath, [tsc, '-p', PACKAGE, '--pretty'], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' })
  } catch (error) {
    throw new Error(`build: tsc reports type errors in the host half:\n${error.stdout ?? ''}${error.stderr ?? ''}`)
  }
  return fs.readdirSync(SOURCE).filter((name) => name.endsWith('.ts')).length
}

/** Enforce zero runtime dependencies, zero cycles, and full reachability from index.ts (D36, D73). */
function checkHostGraph(modules, valueEdges, allEdges) {
  const state = new Map()
  const stack = []
  const walkCycles = (file) => {
    state.set(file, 'open')
    stack.push(file)
    for (const next of valueEdges.get(file) ?? []) {
      if (state.get(next) === 'open') {
        const cycle = [...stack.slice(stack.indexOf(next)), next].map((item) => `packages/host/src/${item}`).join(' → ')
        throw new Error(`build: host import cycle ${cycle}`)
      }
      if (!state.has(next)) walkCycles(next)
    }
    stack.pop()
    state.set(file, 'done')
  }
  for (const rel of modules) if (!state.has(rel)) walkCycles(rel)

  const reached = new Set()
  const queue = ['index.ts']
  while (queue.length > 0) {
    const next = queue.pop()
    if (reached.has(next)) continue
    reached.add(next)
    for (const dep of allEdges.get(next) ?? []) queue.push(dep)
  }
  for (const rel of modules) {
    if (!reached.has(rel)) throw new Error(`build: packages/host/src/${rel} is imported by no module reachable from index.ts`)
  }
}

/** Await esbuild's plugin-capable API; enumerate modules before writing so invalid files fail early. */
export async function buildHostHalf({ outDir = path.join(ROOT, 'lib') } = {}) {
  checkTypes()
  const to = path.join(outDir, 'host')
  fs.rmSync(to, { recursive: true, force: true })
  fs.mkdirSync(to, { recursive: true })
  const modules = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(SOURCE, dir), { withFileTypes: true })) {
      const rel = dir === '' ? entry.name : `${dir}/${entry.name}`
      if (entry.isDirectory()) walk(rel)
      else if (rel.endsWith('.ts')) modules.push(rel)
      else throw new Error(`build: packages/host/src/${rel} is not TypeScript`)
    }
  }
  walk('')
  const known = new Set(modules)
  const allowedBare = (specifier) => specifier.startsWith('node:')
    || specifier.startsWith('@deepseek-ai/')
    || INLINED.some(({ prefix }) => specifier.startsWith(prefix))
  const valueEdges = new Map()
  const allEdges = new Map()
  const outputs = []
  for (const rel of modules) {
    const full = path.join(SOURCE, rel)
    const text = fs.readFileSync(full, 'utf8')
    const all = []
    for (const match of text.matchAll(/\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]|\bimport\s+['"]([^'"]+)['"]/g)) {
      const specifier = match[1] ?? match[2] ?? match[3]
      if (specifier.startsWith('.')) {
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(rel), specifier)).replace(/\.js$/, '.ts')
        if (!known.has(target)) throw new Error(`build: packages/host/src/${rel} imports ${specifier}, which is outside packages/host/src/`)
        all.push(target)
      } else if (!allowedBare(specifier)) {
        throw new Error(`build: packages/host/src/${rel} imports ${specifier}; host modules have zero runtime dependencies outside node: and host peer packages (D36)`)
      }
    }
    allEdges.set(rel, all)
    const { outputFiles, metafile } = await esbuild.build({
      entryPoints: [full],
      bundle: true,
      write: false,
      metafile: true,
      format: 'esm',
      target: 'es2023',
      logLevel: 'silent',
      plugins: [externalButShared],
    })
    const entryMeta = Object.values(metafile.inputs).find((input) => input.imports !== undefined)
    const values = []
    for (const item of entryMeta?.imports ?? []) {
      if (!item.external) continue
      if (item.path.startsWith('.')) {
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(rel), item.path)).replace(/\.js$/, '.ts')
        if (known.has(target)) values.push(target)
      } else if (!allowedBare(item.path)) {
        throw new Error(`build: packages/host/src/${rel} imports ${item.path}; host modules have zero runtime dependencies outside node: and host peer packages (D36)`)
      }
    }
    valueEdges.set(rel, values)
    outputs.push({ rel, code: outputFiles[0]?.text ?? '' })
  }
  checkHostGraph(modules, valueEdges, allEdges)
  let files = 0
  let bytes = 0
  for (const { rel, code } of outputs) {
    // A module that carries types only (the context contract) has nothing to ship.
    if (code.trim() === '' || code.trim() === 'export {};') continue
    const target = path.join(to, rel.replace(/\.ts$/, '.js'))
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, code)
    files += 1
    bytes += Buffer.byteLength(code)
  }
  if (files === 0) throw new Error('build: packages/host/src holds no modules')
  return { files, bytes }
}
