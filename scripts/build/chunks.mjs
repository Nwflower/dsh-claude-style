/**
 * chunks.mjs — split deferred features without duplicating stateful modules
 * (D72); shared imports resolve against the main bundle's own instances.
 */
import { createHash } from 'node:crypto'
import path from 'node:path'
import vm from 'node:vm'
import esbuild from 'esbuild'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const SRC = path.join(ROOT, 'packages', 'client', 'src')
/** The path every module a build plugin generates is resolved under (D36). */
const VIRTUAL_PREFIX = 'virtual:dsh-claude-style/'

/** A module's id in the shared table: its path from the repository root, as esbuild's metafile keys it. */
const moduleId = (file) => path.relative(ROOT, file).split(path.sep).join('/')

/** Use repository-relative and virtual ids; loader-owned modules stay outside the shared table (D36). */
export function ownModuleIds(metafile) {
  const ids = new Set()
  for (const file of Object.keys(metafile.inputs)) {
    const at = file.indexOf(':')
    const rest = at === -1 ? '' : file.slice(at + 1)
    const id = rest.startsWith('virtual:') ? rest : moduleId(file)
    if (id.startsWith('packages/') || id.startsWith(VIRTUAL_PREFIX)) ids.add(id)
  }
  return [...ids]
}

/** Keep main-bundle imports external under stable module ids. */
function sharedModules(shared) {
  return {
    name: 'shared-modules',
    setup(build) {
      build.onResolve({ filter: /.*/ }, async (args) => {
        // The nested resolve below comes back through here; it takes the default.
        if (args.kind === 'entry-point' || args.pluginData?.nested === true) return undefined
        const result = await build.resolve(args.path, { kind: args.kind, importer: args.importer, resolveDir: args.resolveDir, pluginData: { nested: true } })
        if (result.errors.length > 0) return { errors: result.errors }
        if (result.external) return { path: result.path, external: true }
        // A generated module keeps the path its plugin resolved it under; the
        // table and the chunk's own import are keyed by that same id.
        const id = result.namespace === 'file' ? moduleId(result.path) : result.path
        if (shared.has(id)) return { path: id, external: true }
        // A generated module the bundle does not carry is this chunk's own: it
        // is loaded in the namespace its plugin resolved it under.
        return result.namespace === 'file' ? { path: result.path } : { path: result.path, namespace: result.namespace }
      })
    },
  }
}

/** Expose the chunk factory through its own script element. */
const chunkOpen = (id) => `/* dsh-claude-style feature chunk "${id}". GENERATED FILE — do not edit; \`npm run build\` writes it from packages/client/src/. */
document.currentScript.__dshChunk = (require) => {
  var module = { exports: {} }
  var exports = module.exports`
const CHUNK_CLOSE = `  return module.exports
}`


function bundleChunk(manifest, shared, { external, plugins }) {
  return esbuild.build({
    stdin: { contents: `export { install } from ${JSON.stringify(`./${manifest.main}`)}`, resolveDir: SRC, loader: 'ts', sourcefile: `chunk-${manifest.id}.ts` },
    bundle: true,
    format: 'cjs',
    platform: 'browser',
    target: 'esnext',
    charset: 'utf8',
    minify: true,
    sourcemap: 'external',
    // Never written: the build routes the text through the asset manifest. The
    // source map's paths are relative to where the chunk is stored.
    outfile: path.join(ROOT, 'lib', 'assets', `${manifest.id}.js`),
    write: false,
    metafile: true,
    logLevel: 'silent',
    external,
    banner: { js: chunkOpen(manifest.id) },
    footer: { js: CHUNK_CLOSE },
    // The sharing resolution runs before the generated-module plugin: that one
    // answers for its own paths, and an answer that wins would put a second copy
    // of a module the bundle already carries into the chunk (D72).
    plugins: [sharedModules(shared), ...plugins],
  })
}

/** Promote multiply shared modules and repeat until bundle and chunk membership stabilizes. */
export async function splitChunks({ deferred, mainModules, options, slot }) {
  const promoted = new Set()
  for (;;) {
    const shared = await mainModules([...promoted])
    for (const manifest of deferred) {
      if (shared.has(`packages/client/src/${manifest.main}`)) throw new Error(`build: packages/client/src/${manifest.main} is deferred (D72), but a module the bundle carries imports it`)
    }
    const chunks = new Map()
    for (const manifest of deferred) chunks.set(manifest.id, { manifest, result: await bundleChunk(manifest, shared, options) })
    const owner = new Map()
    const twice = new Set()
    for (const [id, chunk] of chunks) {
      for (const file of ownModuleIds(chunk.result.metafile)) {
        if (owner.has(file)) twice.add(file)
        else owner.set(file, id)
      }
    }
    if (twice.size > 0) {
      for (const file of twice) promoted.add(file)
      continue
    }
    const imports = new Set()
    for (const { result } of chunks.values()) {
      for (const input of Object.values(result.metafile.inputs)) {
        for (const item of input.imports) if (item.external) imports.add(item.path)
      }
      const text = result.outputFiles.find((file) => file.path.endsWith('.js')).text
      if (text.includes(slot)) throw new Error(`build: a deferred feature reads BUILD_ID; a chunk is hashed before the bundle and cannot carry it (D72)`)
    }
    return { chunks, shared: [...imports].sort(), bundled: shared }
  }
}

/**
 * One chunk as the files the asset route serves: the script and its source map,
 * each named by its own content hash, so a change to either moves only the name
 * it belongs to (the route serves these names as immutable).
 *
 * @param result - bundleChunk's result.
 * @returns `{ name, code, map, mapName }`.
 */
export function chunkFiles(result) {
  const code = result.outputFiles.find((file) => file.path.endsWith('.js')).text
  const map = result.outputFiles.find((file) => file.path.endsWith('.js.map')).text
  const mapName = `${createHash('sha256').update(map).digest('hex').slice(0, 12)}.js.map`
  const named = `${code.endsWith('\n') ? code : `${code}\n`}//# sourceMappingURL=${mapName}\n`
  const name = `${createHash('sha256').update(named).digest('hex').slice(0, 12)}.js`
  // Syntax gate, as for the bundle: the chunk must parse before it is written.
  new vm.Script(named, { filename: `lib/assets/${name}` })
  return { name, code: named, map, mapName }
}

/** The repository's own modules a chunk carries, for the check that every source reaches the page. */
export function chunkModules(result) {
  return ownModuleIds(result.metafile)
}
