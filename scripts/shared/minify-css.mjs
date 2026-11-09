/** minify-css.mjs — minify stylesheets with the bundle's CSS tool for page-equivalent audits (D9). */
import esbuild from 'esbuild'

/** Warnings fail the build: the shipped stylesheet must minify cleanly. */
function minifyCss(text) {
  const result = esbuild.transformSync(text, { loader: 'css', minify: true, logLevel: 'silent' })
  if (result.warnings.length > 0) {
    throw new Error(`build: the stylesheet does not minify cleanly: ${result.warnings.map((warning) => warning.text).join('; ')}`)
  }
  return result.code
}

export { minifyCss }
