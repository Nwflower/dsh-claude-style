/** ts-module.mjs — load repository TypeScript modules through the existing esbuild setup (D73, D92). */
import path from 'node:path'
import vm from 'node:vm'
import esbuild from 'esbuild'

const ROOT = path.resolve(import.meta.dirname, '..', '..')

function loadModule(file) {
  const { outputFiles } = esbuild.buildSync({
    entryPoints: [path.join(ROOT, file)],
    bundle: true,
    format: 'cjs',
    platform: 'neutral',
    write: false,
    logLevel: 'silent',
  })
  const module = { exports: {} }
  vm.runInNewContext(outputFiles[0].text, { module, exports: module.exports }, { filename: file })
  return module.exports
}

/** Use an ESM data URL because the CommonJS loader cannot evaluate top-level await. */
async function loadModuleEsm(file) {
  const { outputFiles } = esbuild.buildSync({
    entryPoints: [path.join(ROOT, file)],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    write: false,
    logLevel: 'silent',
  })
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`)
}

export { loadModule, loadModuleEsm, ROOT }
