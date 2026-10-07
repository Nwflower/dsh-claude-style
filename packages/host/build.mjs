/**
 * build.mjs — write the host half into the package's build output (D46).
 *
 * The half lives in `packages/host/src` in TypeScript and ships as JavaScript
 * build output, so the packaged layout holds one `lib/` and no source tree.
 * Each module is transpiled on its own: the half is ESM and the module loader
 * imports it by file, so nothing is bundled and the relative specifiers stay as
 * they are. The type check over these modules is its own pass (see the decision).
 *
 * Usage: node packages/host/build.mjs [--out <dir>]
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import esbuild from 'esbuild'

const PACKAGE = path.resolve(import.meta.dirname)
const ROOT = path.resolve(PACKAGE, '..', '..')
const SOURCE = path.join(PACKAGE, 'src')

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
 * Transpile every module of the host half into `lib/host/`.
 *
 * @param options.outDir - the build output directory (default `<root>/lib`).
 * @returns `{ files, bytes }` of what was written, for the build log.
 */
export function buildHostHalf({ outDir = path.join(ROOT, 'lib') } = {}) {
  checkTypes()
  const to = path.join(outDir, 'host')
  fs.rmSync(to, { recursive: true, force: true })
  fs.mkdirSync(to, { recursive: true })
  let files = 0
  let bytes = 0
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(SOURCE, dir), { withFileTypes: true })) {
      const rel = dir === '' ? entry.name : `${dir}/${entry.name}`
      if (entry.isDirectory()) {
        walk(rel)
        continue
      }
      if (!rel.endsWith('.ts')) throw new Error(`build: packages/host/src/${rel} is not TypeScript`)
      const source = fs.readFileSync(path.join(SOURCE, rel), 'utf8')
      const { code } = esbuild.transformSync(source, { loader: 'ts', format: 'esm', target: 'es2023' })
      // A module that carries types only (the context contract) has nothing to ship.
      if (code.trim() === '' || code.trim() === 'export {};') continue
      const target = path.join(to, rel.replace(/\.ts$/, '.js'))
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, code)
      files += 1
      bytes += Buffer.byteLength(code)
    }
  }
  walk('')
  if (files === 0) throw new Error('build: packages/host/src holds no modules')
  return { files, bytes }
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const at = process.argv.indexOf('--out')
  const outDir = at === -1 ? path.join(ROOT, 'lib') : path.resolve(process.argv[at + 1])
  const built = buildHostHalf({ outDir })
  console.log(`built ${path.join(outDir, 'host')} (${built.files} modules, ${built.bytes} bytes) from packages/host/src/`)
}
