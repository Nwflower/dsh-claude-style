'use strict'
/**
 * The skin's stylesheet as the page receives it (D51): comments and formatting
 * dropped by esbuild's CSS minifier, the same tool that minifies the bundle.
 * The build's checks read the sheets before this step; the importance audit
 * reads a source sheet through it, so its rules spell the way the page's do.
 */
const esbuild = require('esbuild')

/**
 * @param text - CSS text.
 * @returns the minified text; a sheet esbuild warns about fails the build.
 */
function minifyCss(text) {
  const result = esbuild.transformSync(text, { loader: 'css', minify: true, logLevel: 'silent' })
  if (result.warnings.length > 0) {
    throw new Error(`build: the stylesheet does not minify cleanly: ${result.warnings.map((warning) => warning.text).join('; ')}`)
  }
  return result.code
}

module.exports = { minifyCss }
