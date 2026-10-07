'use strict'
/**
 * Read the feature manifests (packages/client/src/features/**\/<main>.manifest.ts, D42).
 *
 * A manifest is data only, so it is evaluated here in Node: esbuild bundles
 * every manifest into one CommonJS body and the body runs in a fresh vm
 * context. The build reads the result to order the features and their
 * stylesheets and to generate the browser half's registry; the smoke run
 * reads it for its coverage table. Every structural rule a manifest must
 * keep is checked here, so both readers see the same refusal.
 */
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const esbuild = require('esbuild')

/** The repository root: this module sits one level below `scripts/`. */
const ROOT = path.resolve(__dirname, '..', '..')
// The browser half lives in its own package (D46).
const SRC = path.join(ROOT, 'packages', 'client', 'src')
const FEATURES = path.join(SRC, 'features')
const SUFFIX = '.manifest.ts'

/** Every manifest file, relative to packages/client/src with forward slashes. */
function manifestFiles() {
  const found = []
  for (const dir of fs.readdirSync(FEATURES, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue
    for (const file of fs.readdirSync(path.join(FEATURES, dir.name))) {
      if (file.endsWith(SUFFIX)) found.push(`features/${dir.name}/${file}`)
    }
  }
  return found.sort()
}

/**
 * @returns the manifests in install order, each with `file` (the manifest),
 *     `main` (its main module) and `dir` (the feature directory's name), all
 *     relative to packages/client/src.
 */
function readManifests() {
  const files = manifestFiles()
  const contents = files.map((file, index) => `export { default as m${index} } from ${JSON.stringify(`./${file}`)}`).join('\n')
  const result = esbuild.buildSync({
    stdin: { contents, resolveDir: SRC, loader: 'ts', sourcefile: 'manifests.ts' },
    bundle: true,
    format: 'cjs',
    platform: 'neutral',
    write: false,
    logLevel: 'silent',
  })
  const module = { exports: {} }
  vm.runInNewContext(result.outputFiles[0].text, { module, exports: module.exports })
  const manifests = files.map((file, index) => {
    const main = file.slice(0, -SUFFIX.length) + '.ts'
    return { ...module.exports[`m${index}`], file, main, dir: file.split('/')[1] }
  })
  checkManifests(manifests)
  return manifests.sort((a, b) => a.order - b.order)
}

/** Refuse a manifest that breaks a rule the type cannot express or a fact on disk. */
function checkManifests(manifests) {
  const fail = (manifest, message) => {
    throw new Error(`manifest packages/client/src/${manifest.file}: ${message}`)
  }
  const ids = new Map()
  const orders = new Map()
  const owners = new Map()
  for (const manifest of manifests) {
    if (typeof manifest.id !== 'string' || !/^[a-z][A-Za-z0-9]*$/.test(manifest.id)) fail(manifest, 'needs a camelCase "id"')
    if (ids.has(manifest.id)) fail(manifest, `repeats the id "${manifest.id}" of packages/client/src/${ids.get(manifest.id)}`)
    ids.set(manifest.id, manifest.file)
    if (!Number.isInteger(manifest.order)) fail(manifest, 'needs an integer "order"')
    if (orders.has(manifest.order)) fail(manifest, `repeats the order ${manifest.order} of packages/client/src/${orders.get(manifest.order)}`)
    orders.set(manifest.order, manifest.file)
    if ((manifest.pref === undefined) === (manifest.ungated === undefined)) fail(manifest, 'must declare exactly one of "pref" and "ungated"')
    if (!fs.existsSync(path.join(SRC, manifest.main))) fail(manifest, `has no main module packages/client/src/${manifest.main}`)
    if (!Array.isArray(manifest.contracts) || manifest.contracts.some((id) => typeof id !== 'string' || id === '')) {
      fail(manifest, 'needs "contracts": the host contract ids its own modules name (D44)')
    }
    for (const sheet of manifest.stylesheets) {
      if (!fs.existsSync(path.join(FEATURES, manifest.dir, sheet.file))) fail(manifest, `names the stylesheet ${sheet.file}, which packages/client/src/features/${manifest.dir}/ does not hold`)
    }
    if (manifest.switchRow !== undefined) {
      if (manifest.pref === undefined) fail(manifest, 'has a switch row but no "pref"')
      if (owners.has(manifest.pref)) fail(manifest, `owns the switch row of "${manifest.pref}", which packages/client/src/${owners.get(manifest.pref)} owns already`)
      owners.set(manifest.pref, manifest.file)
    }
    for (const lang of ['zh', 'en']) {
      const copy = manifest.description?.[lang]
      if (typeof copy?.title !== 'string' || copy.title === '' || typeof copy.text !== 'string' || copy.text === '') {
        fail(manifest, `needs a non-empty description.${lang}.title and .text`)
      }
    }
  }
}

/**
 * The smoke run's coverage table: each feature directory and the cases its
 * manifests name, in manifest order without repeats.
 */
function featureCases(manifests) {
  const table = {}
  for (const manifest of manifests) {
    const cases = table[manifest.dir] ?? (table[manifest.dir] = [])
    for (const name of manifest.cases) if (!cases.includes(name)) cases.push(name)
  }
  return table
}

module.exports = { readManifests, featureCases, manifestFiles }
