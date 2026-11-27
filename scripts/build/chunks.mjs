/**
 * chunks.mjs — split deferred features without duplicating stateful modules
 * (D76); shared imports resolve against the main bundle's own instances.
 *
 * Each chunk is a package-local chunk of the host's client module system: the
 * file `client.<feature>.js` beside `client.js`, registered with the owner's id
 * and its own file name, and fetched by the bundle's `require.async`, which the
 * host answers at the owner's current revision.
 */
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

/** The file a deferred feature's chunk is served as, beside `client.js`; the host accepts `client.<name>.js`. */
export const chunkFileName = (id) => `client.${id}.js`

/**
 * Register the chunk with the host's module system. The host materializes it
 * with its own module-table `require`, which knows only the host's packages; the
 * chunk's exports are therefore its body, which the bundle runs against the
 * modules it shares (packages/engine/src/chunks.ts).
 */
const chunkOpen = (packageId, id) => `/* dsh-claude-style feature chunk "${id}". GENERATED FILE — do not edit; \`npm run build\` writes it from packages/client/src/. */
window.__ModuleLoader__.load({
  id: ${JSON.stringify(packageId)},
  chunk: ${JSON.stringify(chunkFileName(id))},
  factory: () => (require) => {
    var module = { exports: {} }
    var exports = module.exports`
const CHUNK_CLOSE = `    return module.exports
  },
})`


function bundleChunk(packageId, manifest, shared, { external, plugins }) {
  return esbuild.build({
    stdin: { contents: `export { install } from ${JSON.stringify(`./${manifest.main}`)}`, resolveDir: SRC, loader: 'ts', sourcefile: `chunk-${manifest.id}.ts` },
    bundle: true,
    format: 'cjs',
    platform: 'browser',
    target: 'esnext',
    charset: 'utf8',
    minify: true,
    sourcemap: 'external',
    // Never written here: the build writes the text once every gate has passed.
    // The source map's paths are relative to where the chunk is stored.
    outfile: path.join(ROOT, 'lib', chunkFileName(manifest.id)),
    write: false,
    metafile: true,
    logLevel: 'silent',
    external,
    banner: { js: chunkOpen(packageId, manifest.id) },
    footer: { js: CHUNK_CLOSE },
    // The sharing resolution runs before the generated-module plugin: that one
    // answers for its own paths, and an answer that wins would put a second copy
    // of a module the bundle already carries into the chunk (D76).
    plugins: [sharedModules(shared), ...plugins],
  })
}

/** Promote multiply shared modules and repeat until bundle and chunk membership stabilizes. */
export async function splitChunks({ packageId, deferred, mainModules, options, slot }) {
  const promoted = new Set()
  for (;;) {
    const shared = await mainModules([...promoted])
    for (const manifest of deferred) {
      if (shared.has(`packages/client/src/${manifest.main}`)) throw new Error(`build: packages/client/src/${manifest.main} is deferred (D76), but a module the bundle carries imports it`)
    }
    const chunks = new Map()
    for (const manifest of deferred) chunks.set(manifest.id, { manifest, result: await bundleChunk(packageId, manifest, shared, options) })
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
      if (text.includes(slot)) throw new Error(`build: a deferred feature reads BUILD_ID; a chunk is built before the bundle's id is known and cannot carry it (D76)`)
    }
    return { chunks, shared: [...imports].sort(), bundled: shared }
  }
}

/**
 * One chunk as the two files written beside `client.js`: the script and its
 * source map. The names stay the same from build to build; the host addresses
 * them at the owner's revision, which moves whenever `client.js` is rewritten.
 * The host strips the script's map reference and stamps its own, so the one
 * written here is for a reader of the file.
 *
 * @param id - the deferred feature's id.
 * @param result - bundleChunk's result.
 * @returns `{ name, code, map, mapName }`.
 */
export function chunkFiles(id, result) {
  const code = result.outputFiles.find((file) => file.path.endsWith('.js')).text
  const map = result.outputFiles.find((file) => file.path.endsWith('.js.map')).text
  const name = chunkFileName(id)
  const mapName = `${name}.map`
  const named = `${code.endsWith('\n') ? code : `${code}\n`}//# sourceMappingURL=${mapName}\n`
  // Syntax gate, as for the bundle: the chunk must parse before it is written.
  new vm.Script(named, { filename: `lib/${name}` })
  return { name, code: named, map, mapName }
}

/** The repository's own modules a chunk carries, for the check that every source reaches the page. */
export function chunkModules(result) {
  return ownModuleIds(result.metafile)
}
