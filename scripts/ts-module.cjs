/**
 * ts-module.cjs — load one of src/'s TypeScript modules into a Node process.
 *
 * The build reads the host contract (D44) and the token data as data, and the
 * end-to-end lane runs the same table against a live page (D45); both need the
 * module's exports without a second compiler setup. esbuild is already the
 * bundler, so it does the transform and the relative imports are resolved here.
 */
'use strict'
const path = require('node:path')
const vm = require('node:vm')
const esbuild = require('esbuild')

const SRC = path.resolve(__dirname, '..', 'src')

/**
 * Evaluate one module under src/ and return its exports.
 *
 * @param file - src/-relative module path, extension included.
 * @returns the module's exports object.
 */
function loadModule(file) {
  const { outputFiles } = esbuild.buildSync({
    entryPoints: [path.join(SRC, file)],
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

module.exports = { loadModule, SRC }
