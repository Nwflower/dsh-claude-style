/**
 * virtual-modules.mjs — the modules the build generates while bundling, as
 * esbuild plugins: the feature registry from the manifests (D42), the table
 * the feature chunks share the bundle's modules through (D39) and the build's
 * own output for the browser half (D36).
 */
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC = path.join(ROOT, 'packages', 'client', 'src')

/** The manifest fields the browser half reads (FeatureRuntime in packages/client/src/core/feature.ts). */
const RUNTIME_FIELDS = ['id', 'handle', 'order', 'pref', 'prefValues', 'ungated', 'yieldsTo', 'switchRow']

/**
 * The feature registry, `virtual:dsh-claude-style/features`: each manifest's
 * runtime fields beside its main module's `install`, or beside its chunk's
 * address for a deferred feature (D39), in install order. The manifests
 * themselves stay out of the bundle — their descriptions and test coverage are
 * of no use to the page.
 *
 * @param manifests - the feature manifests in install order.
 * @param chunks - each deferred feature's chunk address, by feature id.
 */
export function featuresModule(manifests, chunks) {
  const imports = manifests.flatMap((manifest, index) => manifest.load === 'deferred' ? [] : [`import { install as install${index} } from ${JSON.stringify(`./${manifest.main}`)}`])
  const entries = manifests.map((manifest, index) => {
    const runtime = Object.fromEntries(RUNTIME_FIELDS.filter((field) => manifest[field] !== undefined).map((field) => [field, manifest[field]]))
    if (manifest.load !== 'deferred') return `  { ...${JSON.stringify(runtime)}, install: install${index} },`
    if (chunks[manifest.id] === undefined) throw new Error(`build: the deferred feature "${manifest.id}" has no chunk`)
    return `  { ...${JSON.stringify({ ...runtime, chunk: chunks[manifest.id] })} },`
  })
  const contents = `${imports.join('\n')}\nexport const FEATURES = [\n${entries.join('\n')}\n]\n`
  return {
    name: 'features',
    setup(build) {
      build.onResolve({ filter: /^virtual:dsh-claude-style\/features$/ }, (args) => ({ path: args.path, namespace: 'features' }))
      build.onLoad({ filter: /.*/, namespace: 'features' }, () => ({ contents, loader: 'js', resolveDir: SRC }))
    },
  }
}

/**
 * The table the feature chunks resolve their shared modules from,
 * `virtual:dsh-claude-style/chunk-modules` (D39): each id a chunk imports, as
 * this bundle's own instance — a source module's namespace, or the host
 * package exactly as the loader's `require` hands it over, so the chunk's own
 * import helpers treat it as the bundle's do.
 *
 * @param ids - module ids (paths from the repository root) and host package names.
 */
export function chunkModulesModule(ids) {
  const own = ids.filter((id) => id.startsWith('packages/'))
  const imports = own.map((id, index) => `import * as shared${index} from ${JSON.stringify(path.join(ROOT, id))}`)
  const entries = ids.map((id) => {
    const index = own.indexOf(id)
    return `  ${JSON.stringify(id)}: ${index === -1 ? `require(${JSON.stringify(id)})` : `shared${index}`},`
  })
  const contents = `${imports.join('\n')}\nexport const CHUNK_MODULES = {\n${entries.join('\n')}\n}\n`
  return {
    name: 'chunk-modules',
    setup(build) {
      build.onResolve({ filter: /^virtual:dsh-claude-style\/chunk-modules$/ }, (args) => ({ path: args.path, namespace: 'chunk-modules' }))
      build.onLoad({ filter: /.*/, namespace: 'chunk-modules' }, () => ({ contents, loader: 'js', resolveDir: SRC }))
    },
  }
}

/**
 * The generated module (packages/client/src/generated.d.ts) as an esbuild plugin: everything the
 * build produces for the browser half, as named exports.
 */
export function generatedModule(values) {
  const contents = Object.entries(values).map(([name, value]) => `export const ${name} = ${JSON.stringify(value)}`).join('\n')
  return {
    name: 'generated',
    setup(build) {
      build.onResolve({ filter: /^virtual:dsh-claude-style\/generated$/ }, (args) => ({ path: args.path, namespace: 'generated' }))
      build.onLoad({ filter: /.*/, namespace: 'generated' }, () => ({ contents, loader: 'js' }))
    },
  }
}
