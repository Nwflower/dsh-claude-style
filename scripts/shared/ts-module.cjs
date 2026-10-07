/**
 * ts-module.cjs — load one TypeScript module of this repository into a Node process.
 *
 * The build reads the host contract (D44) and the token data as data, and the
 * end-to-end lane runs the same table against a live page (D45); both need the
 * module's exports without a second compiler setup. esbuild is already the
 * bundler, so it does the transform and the relative imports are resolved here.
 *
 * Paths are given from the repository root, so a module that has moved into a
 * package (D46) is loaded by its own path.
 */
'use strict'
const path = require('node:path')
const vm = require('node:vm')
const esbuild = require('esbuild')

/** The repository root: this module sits one level below `scripts/`. */
const ROOT = path.resolve(__dirname, '..', '..')

/**
 * Evaluate one module of this repository and return its exports.
 *
 * @param file - repository-relative module path, extension included.
 * @returns the module's exports object.
 */
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

/**
 * Evaluate one module that uses top-level await, which the CJS path above
 * cannot carry: the bundle is handed to the ESM loader as a data URL.
 *
 * @param file - repository-relative module path, extension included.
 * @returns the module's exports object.
 */
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

module.exports = { loadModule, loadModuleEsm, ROOT }
