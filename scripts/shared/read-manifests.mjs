/** read-manifests.mjs — load and validate feature manifests for build ordering and smoke coverage (D72). */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import esbuild from 'esbuild'
import { loadModule } from './ts-module.mjs'

/** The repository root: this module sits one level below `scripts/`. */
const ROOT = path.resolve(import.meta.dirname, '..', '..')
// The browser half lives in its own package (D73).
const SRC = path.join(ROOT, 'packages', 'client', 'src')
const FEATURES = path.join(SRC, 'features')
const SUFFIX = '.manifest.ts'
/** The preference table both halves share: a settings row names one of its keys (D73). */
const { PREFS } = loadModule('packages/contracts/src/prefs.ts')
/** Where a settings row can stand (core/feature.ts SettingsRowSlot): the strip's tabs and the main window's groups. */
const SETTINGS_SLOTS = new Set(['general', 'appearance', 'main-window', 'sidebar', 'motion', 'conversation', 'composer', 'statistics'])
/** The settings page's own copy: the lines two features' rows share live there (D72). */
const SETTINGS_COPY = (() => {
  const file = path.join(FEATURES, 'settings', 'settings.copy.json')
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
})()

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
      fail(manifest, 'needs "contracts": the host contract ids its own modules name (D3)')
    }
    if (manifest.scenarios !== undefined && (!Array.isArray(manifest.scenarios) || manifest.scenarios.some((name) => typeof name !== 'string' || name === ''))) {
      fail(manifest, 'needs "scenarios": the end-to-end scenario names that guard this feature')
    }
    for (const sheet of manifest.stylesheets) {
      // A generated sheet is checked where it is written (scripts/build/feature-sheets.mjs).
      if (sheet.generated !== undefined) continue
      if (!fs.existsSync(path.join(FEATURES, manifest.dir, sheet.file))) fail(manifest, `names the stylesheet ${sheet.file}, which packages/client/src/features/${manifest.dir}/ does not hold`)
      if (sheet.scope !== undefined && sheet.scope !== 'surface') fail(manifest, `gives ${sheet.file} the scope "${sheet.scope}"; the one scope a sheet can name is "surface"`)
    }
    if (manifest.pref !== undefined) {
      if (typeof manifest.pref !== 'string' || !(manifest.pref in PREFS)) fail(manifest, `names "pref" "${manifest.pref}", which packages/contracts/src/prefs.ts PREFS does not carry`)
      const spec = PREFS[manifest.pref]
      if (manifest.prefValues !== undefined) {
        if (!Array.isArray(manifest.prefValues) || manifest.prefValues.length === 0 || manifest.prefValues.some((value) => typeof value !== 'string' || value === '')) {
          fail(manifest, 'needs "prefValues": a non-empty list of the preference values the feature runs under')
        }
        if (spec.type === 'boolean') fail(manifest, `gives the boolean preference "${manifest.pref}" "prefValues"; a boolean switch is on unless stored as false`)
        if (spec.type !== 'choice') fail(manifest, `gives "${manifest.pref}" "prefValues", and only a choice preference carries values to name`)
        for (const value of manifest.prefValues) {
          if (!spec.values.includes(value)) fail(manifest, `runs under "${value}", which the choice preference "${manifest.pref}" does not carry`)
        }
      } else if (spec.type === 'choice') {
        fail(manifest, `names the choice preference "${manifest.pref}" without "prefValues": a choice switch names the values it runs under`)
      }
    } else if (manifest.prefValues !== undefined) {
      fail(manifest, 'names "prefValues" without a "pref"')
    }
    if (manifest.settingsRows !== undefined) {
      if (!Array.isArray(manifest.settingsRows) || manifest.settingsRows.length === 0) fail(manifest, 'needs "settingsRows": a non-empty list of the rows this feature owns')
      const copyFile = path.join(FEATURES, manifest.dir, `${manifest.dir}.copy.json`)
      const copy = fs.existsSync(copyFile) ? JSON.parse(fs.readFileSync(copyFile, 'utf8')) : {}
      /** A row's line: the feature's own copy, or the settings page's for a line two features share (D72). */
      const carries = (key) => copy[key] !== undefined || SETTINGS_COPY[key] !== undefined
      const ranks = new Map()
      for (const row of manifest.settingsRows) {
        if (!SETTINGS_SLOTS.has(row?.tab)) fail(manifest, `has a settings row on the slot "${row?.tab}", which the settings page does not carry`)
        if (!Number.isInteger(row.rank) || row.rank < 0) fail(manifest, 'has a settings row without a whole "rank"')
        if (ranks.has(`${row.tab}:${row.rank}`)) fail(manifest, `repeats the rank ${row.rank} on the "${row.tab}" slot`)
        ranks.set(`${row.tab}:${row.rank}`, true)
        if (manifest.pref === undefined && manifest.ungated === undefined) fail(manifest, 'has a settings row and names neither "pref" nor "ungated"')
        if (typeof row.pref !== 'string' || !(row.pref in PREFS)) fail(manifest, `has a settings row for "${row.pref}", which packages/contracts/src/prefs.ts PREFS does not carry`)
        if (owners.has(row.pref)) fail(manifest, `owns the settings row of "${row.pref}", which packages/client/src/${owners.get(row.pref)} owns already`)
        owners.set(row.pref, manifest.file)
        for (const [field, name] of [['control', row.control], ['status', row.status]]) {
          if (name === undefined) continue
          if (typeof name !== 'string' || name === '') fail(manifest, `has a settings row with an empty "${field}" name`)
          const module = path.join(FEATURES, manifest.dir, `${manifest.dir}.settings.ts`)
          if (!fs.existsSync(module)) fail(manifest, `has a settings row naming the ${field} "${name}", but packages/client/src/features/${manifest.dir}/${manifest.dir}.settings.ts is not there`)
        }
        if (row.switch !== undefined) {
          const spec = PREFS[row.pref]
          const sides = [row.switch?.on, row.switch?.off]
          if (spec.type !== 'choice' || sides.some((value) => !spec.values.includes(value)) || sides[0] === sides[1]) {
            fail(manifest, `draws "${row.pref}" as a switch, which needs two different values of that choice as "on" and "off"`)
          }
        }
        if (row.experimental !== undefined && typeof row.experimental !== 'boolean') fail(manifest, 'has a settings row whose "experimental" is not true or false')
        for (const key of [row.title, row.desc, row.requires?.note]) {
          if (key === undefined) continue
          if (typeof key !== 'string' || !carries(key)) fail(manifest, `names the copy key "${key}", which neither packages/client/src/features/${manifest.dir}/${manifest.dir}.copy.json nor the settings page's own copy carries`)
        }
        for (const [value, key] of Object.entries(row.choiceLabels ?? {})) {
          const spec = PREFS[row.pref]
          if (spec.type !== 'choice' || !spec.values.includes(value)) fail(manifest, `labels "${value}" for "${row.pref}", which does not carry that value`)
          if (!carries(key)) fail(manifest, `names the copy key "${key}" for the value "${value}", which neither packages/client/src/features/${manifest.dir}/${manifest.dir}.copy.json nor the settings page's own copy carries`)
        }
        const requires = row.requires
        if (row.parent !== undefined) {
          if (typeof row.parent !== 'string' || !(row.parent in PREFS)) fail(manifest, `has a settings row standing under "${row.parent}", which PREFS does not carry`)
          if (row.parent === row.pref) fail(manifest, 'has a settings row that stands under its own preference')
        }
        if (requires !== undefined) {
          if (typeof requires.pref !== 'string' || !(requires.pref in PREFS)) fail(manifest, `has a settings row requiring "${requires.pref}", which PREFS does not carry`)
          if (requires.pref === row.pref) fail(manifest, 'has a settings row that requires its own preference')
          if (!Array.isArray(requires.values) || requires.values.length === 0 || requires.values.some((value) => typeof value !== 'string' || value === '')) {
            fail(manifest, 'has a settings row requirement without "values": the other preference\'s values the feature works under')
          }
        }
      }
    }
  }
}

export { readManifests, manifestFiles }
