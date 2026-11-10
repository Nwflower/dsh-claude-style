/**
 * build-host.mjs — build host modules separately into lib/host (D73): inline the unpublished
 * shared packages, keep relative and host-package imports as they are.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import esbuild from 'esbuild'

const PACKAGE = path.resolve(import.meta.dirname, '..', 'packages', 'host')
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
  let files = 0
  let bytes = 0
  for (const rel of modules) {
    const { outputFiles } = await esbuild.build({
      entryPoints: [path.join(SOURCE, rel)],
      bundle: true,
      write: false,
      format: 'esm',
      target: 'es2023',
      logLevel: 'silent',
      plugins: [externalButShared],
    })
    const code = outputFiles[0]?.text ?? ''
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
