/**
 * build.mjs — write the host half into the package's build output (D46).
 *
 * The half lives in `packages/host/src` in TypeScript and ships as JavaScript
 * build output, so the packaged layout holds one `lib/` and no source tree.
 * Each module is built on its own: the half is ESM and the module loader
 * imports it by file, so the relative specifiers stay as they are. The values
 * of `@dsh-claude-style/contracts` are inlined into each module that reads
 * them — the contracts package is not among the published files, so a bare
 * specifier left in the output would not resolve at runtime — and every other
 * import (relative paths, `cordis`, `schemastery`, `node:*`) stays external.
 * The type check over these modules is its own pass (see the decision).
 *
 * Imported by scripts/build.mjs.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import esbuild from 'esbuild'

const PACKAGE = path.resolve(import.meta.dirname)
const ROOT = path.resolve(PACKAGE, '..', '..')
const SOURCE = path.join(PACKAGE, 'src')
/** The shared contract's package name: the one specifier a module's build resolves and inlines. */
const CONTRACTS_PREFIX = '@dsh-claude-style/contracts/'

/**
 * Keep every import but the shared contract's external: marking a specifier
 * external leaves it in the output verbatim, so the published file imports the
 * same relative modules and host packages it did before.
 */
const externalButContracts = {
  name: 'external-but-contracts',
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => (args.kind === 'entry-point' || args.path.startsWith(CONTRACTS_PREFIX)
      ? undefined
      : { path: args.path, external: true }))
  },
}

/**
 * Type-check the host half (its own tsconfig, strict).
 *
 * @returns the number of modules checked, for the build log.
 */
function checkTypes() {
  const tsc = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc')
  try {
    execFileSync(process.execPath, [tsc, '-p', PACKAGE, '--pretty'], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' })
  } catch (error) {
    throw new Error(`build: tsc reports type errors in the host half:\n${error.stdout ?? ''}${error.stderr ?? ''}`)
  }
  return fs.readdirSync(SOURCE).filter((name) => name.endsWith('.ts')).length
}

/**
 * Build every module of the host half into `lib/host/`.
 *
 * The async esbuild API is the one that takes plugins (the sync call refuses
 * them), so this function is async and its caller awaits it; the module list is
 * walked first, so a non-TypeScript file fails before anything is written.
 *
 * @param options.outDir - the build output directory (default `<root>/lib`).
 * @returns `{ files, bytes }` of what was written, for the build log.
 */
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
      plugins: [externalButContracts],
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
