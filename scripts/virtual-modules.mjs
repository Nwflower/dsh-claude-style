/**
 * virtual-modules.mjs — the two modules the build generates while bundling,
 * as esbuild plugins: the feature registry from the manifests (D42) and the
 * build's own output for the browser half (D36).
 */
import path from 'node:path'

const SRC = path.join(path.resolve(import.meta.dirname, '..'), 'packages', 'client', 'src')

/** The manifest fields the browser half reads (FeatureRuntime in packages/client/src/core/feature.ts). */
const RUNTIME_FIELDS = ['id', 'handle', 'order', 'pref', 'prefValues', 'ungated', 'yieldsTo', 'switchRow']

/**
 * The feature registry, `virtual:dsh-claude-style/features`: each manifest's
 * runtime fields beside its main module's `install`, in install order. The
 * manifests themselves stay out of the bundle — their descriptions and test
 * coverage are of no use to the page.
 *
 * @param manifests - the feature manifests in install order.
 */
export function featuresModule(manifests) {
  const imports = manifests.map((manifest, index) => `import { install as install${index} } from ${JSON.stringify(`./${manifest.main}`)}`)
  const entries = manifests.map((manifest, index) => {
    const runtime = Object.fromEntries(RUNTIME_FIELDS.filter((field) => manifest[field] !== undefined).map((field) => [field, manifest[field]]))
    return `  { ...${JSON.stringify(runtime)}, install: install${index} },`
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
