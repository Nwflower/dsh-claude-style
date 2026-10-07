#!/usr/bin/env node
/**
 * build.mjs — bundle `lib/client.js` from the TypeScript modules and stylesheets in `src/` (D36).
 *
 * The DSH module loader takes one file per plugin client, registered with
 * `__ModuleLoader__.load` and handed a `require` for the packages the host
 * provides; it has no relative requires and no asset URLs. So esbuild bundles
 * src/entry.ts into one minified CommonJS body with React and the host packages
 * external, and that body is wrapped in the loader's factory:
 *
 *   src/entry.ts                 apply(): the FEATURES table; imports everything else
 *   src/constants.ts             constants; also evaluated here for the stylesheet tokens
 *   src/core/ src/shared/ src/features/<name>/   the modules, TypeScript, strict
 *   src/features/<dir>/<main>.manifest.ts   each feature's manifest (D42), read by scripts/read-manifests.cjs
 *   src/theme/*.css and the feature stylesheets   concatenated by rank (THEME_SHEETS and the manifests),
 *                                checked and gated on the syntax tree (scripts/css.mjs)
 *   src/theme/tokens.json        the design tokens: the token stylesheet and docs/STYLE.md's table
 *   src/assets/                  every image (scripts/assets.mjs, D38): small ones inline, the rest
 *                                written to lib/assets/<hash>.<ext> and served by the host half
 *
 * What the build produces for the browser half reaches the source as one
 * generated module, `virtual:dsh-claude-style/generated` (typed in
 * src/generated.d.ts): the stylesheet, the asset addresses, the lockups, the
 * build id.
 *
 * Before anything is written, `tsc` type-checks src/ and the bundle's import
 * graph must hold no cycle: a missing import, a cycle or a constant read before
 * it is initialized fails the build.
 *
 * `src/model-descriptions.json` is not bundled: it is validated here and
 * copied to `lib/`, where the host half serves it to the browser half at
 * runtime. Model copy is data, so it must not enter the bundle (D5).
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import vm from 'node:vm'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import esbuild from 'esbuild'
import { PNG } from 'pngjs'
import { checkClaimed, checkSheetPixels, checkSheets, planAssets, vectorizeSheet, writeAssets } from './assets.mjs'
import { TOKEN_SHEET, buildStylesheet, loadTokens, writeTokenTable } from './css.mjs'
import manifestReader from './read-manifests.cjs'
import { loadModule } from './ts-module.cjs'

const ROOT = path.resolve(import.meta.dirname, '..')
/**
 * The host half's preference table (host/settings.js): the browser half's
 * PREF_DEFAULTS and src/entry.ts's feature switches are both held to it.
 */
const { PREFS_DEFAULT } = await import(pathToFileURL(path.join(ROOT, 'host', 'settings.js')).href)
const SRC = path.join(ROOT, 'src')
/** Brand marks, mascot sheets and vendor lockups; scripts/assets.mjs plans their delivery (D38). */
const ASSETS = path.join(SRC, 'assets')
/** The plugin icon the manifest names, copied into lib/ as it is. */
const BRAND_ASSETS = path.join(ASSETS, 'brand')
/** The style guide; its token table is generated from src/theme/tokens.json. */
const STYLE_GUIDE = path.join(ROOT, 'docs', 'STYLE.md')
const LIB = path.join(ROOT, 'lib')
const OUT = path.join(LIB, 'client.js')

/**
 * Model copy ships as DATA beside the bundle, not inside it: the browser half
 * fetches it at runtime (the host half serves it), so the table grows without
 * touching this build. It is validated here so a malformed table fails the
 * build instead of the picker.
 */
const MODEL_COPY = 'model-descriptions.json'
/** The model copy's declared shape; validateModelCopy adds the references a schema cannot see. */
const MODEL_COPY_SCHEMA = 'model-descriptions.schema.json'
const validateModelCopyShape = addFormats(new Ajv2020({ allErrors: true }), ['regex'])
  .compile(JSON.parse(fs.readFileSync(path.join(SRC, MODEL_COPY_SCHEMA), 'utf8')))

/**
 * The plugin icon the 0.1.7 plugin manifest reads.
 *
 * `package.json` declares it as `icon`, a path relative to the manifest
 * (SVG/PNG/JPEG/WebP, at most 256 KiB, inside the package directory); the host
 * reads the bytes and hands the client a base64 data URI for an `<img>`. It is
 * copied like the copy document so the source of truth stays in `src/` and
 * `lib/` remains generated output.
 *
 * The clay mark is the one that reads on both canvases: an `<img>` cannot
 * inherit `currentColor` the way the inlined brand art does, and the plain
 * mark is black — invisible on the warm-black canvas.
 */
const ICON_SOURCE = 'claude-mark-clay.svg'
const ICON_FILE = 'claude-mark.svg'

/**
 * The stylesheets that belong to no feature, with their place in the
 * concatenated sheet. A feature's own sheets come from its manifest (D42),
 * each with a rank on this same scale; the build sorts the two together.
 * The order is the cascade: where two rules meet at the same specificity,
 * the later one wins.
 */
const THEME_SHEETS = [
  // Generated from src/theme/tokens.json (scripts/css.mjs).
  { file: TOKEN_SHEET, rank: 5 },
  { file: 'theme/tokens.css', rank: 10 },
  { file: 'theme/typography.css', rank: 20 },
  // Shared parts before every feature: a feature's own rule comes later and
  // wins where the two meet at the same specificity.
  { file: 'shared/popover.css', rank: 30 },
  { file: 'shared/sliding-pill.css', rank: 40 },
  { file: 'theme/chrome.css', rank: 50 },
  { file: 'theme/hero.css', rank: 70 },
  { file: 'theme/sidebar.css', rank: 110 },
  { file: 'theme/third-party.css', rank: 300 },
]

/**
 * Every stylesheet in cascade order: the theme's and each manifest's, sorted
 * by rank. A rank two sheets share would leave their order to chance, so it
 * fails the build.
 *
 * @param manifests - the feature manifests (scripts/read-manifests.cjs).
 * @returns `{ file, rank, gate? }` with `file` src/-relative.
 */
function styleFiles(manifests) {
  const sheets = [
    ...THEME_SHEETS,
    ...manifests.flatMap((manifest) => manifest.stylesheets.map((sheet) => ({ ...sheet, file: `features/${manifest.dir}/${sheet.file}` }))),
  ].sort((a, b) => a.rank - b.rank)
  for (let i = 1; i < sheets.length; i++) {
    if (sheets[i].rank === sheets[i - 1].rank) throw new Error(`build: src/${sheets[i - 1].file} and src/${sheets[i].file} share the stylesheet rank ${sheets[i].rank}`)
  }
  return sheets
}

/** The package name: the loader id, the stylesheet's own tag and the profile entry all carry it (D33). */
const PACKAGE_ID = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).name

/** The packages the host's loader hands the factory's `require`; never bundled. */
const HOST_PACKAGES = ['react', 'react-dom/client', '@deepseek-ai/dsh-client-ui-primitives']

/** Stands where the build id goes until the bundle's own hash is known. */
const BUILD_ID_SLOT = '%%BUILD_ID%%'

/**
 * The loader's factory around esbuild's CommonJS body: `require` resolves the
 * external packages, and what the body puts on `module.exports` (`apply`) is
 * what the factory returns to the host.
 */
const FACTORY_OPEN = `/**
 * Claude Style — Claude Code Desktop theme for the DeepSeek Harness web GUI.
 * GENERATED FILE — do not edit. Source lives in src/; \`npm run build\` bundles it.
 */
window.__ModuleLoader__.load({
  id: ${JSON.stringify(PACKAGE_ID)},
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports`
const FACTORY_CLOSE = `    return module.exports
  },
})`

/**
 * Evaluate src/constants.ts once (pure, DOM-free): `tokens` are the values the
 * stylesheets' %%TOKEN%% placeholders take, beside them the two sheet tables
 * and the preference defaults the build checks.
 */
const CONSTANTS = (() => {
  const constants = loadModule('src/constants.ts')
  const pick = (names) => Object.fromEntries(names.map((name) => {
    if (constants[name] === undefined) throw new Error(`build: src/constants.ts exports no ${name}`)
    return [name, constants[name]]
  }))
  const { BRAND_ATTR, BRAND_CLAUDE, PALETTE_ATTR, PALETTE_CLAUDE, PALETTE_HOST, TYPEFACE_ATTR, TYPEFACE_CLAUDE, TYPEFACE_HOST } = constants
  return {
    tokens: {
      ...pick(['SANS', 'SERIF', 'PROSE', 'MONO', 'BRAND_ATTR', 'BRAND_CLAUDE', 'BRAND_DEEPSEEK', 'MOTION_ATTR', 'MOTION_REDUCED', 'FOOTER_ATTR', 'COMPOSER_ATTR', 'PERMISSIONS_ATTR', 'SESSION_STATS_ATTR', 'CHAT_FOLLOW_ATTR', 'STREAM_GLIDE_ATTR', 'CHAT_FOLD_ATTR', 'CHAT_ROLLING_ATTR', 'CHAT_REVEAL_ATTR', 'CHAT_FLYING_ATTR', 'CARET_ATTR', 'CARET_LAYER_ATTR', 'CARET_VISIBLE_ATTR', 'CARET_HOST_ATTR', 'ACCOUNT_MENU_ATTR', 'ACCOUNT_ARMED_ATTR', 'ACCOUNT_READY_ATTR', 'HERO_MENU_ATTR', 'SETTINGS_SCROLLER_ATTR']),
      // "this brand is drawn by the skin": of the two brands, DeepSeek keeps the
      // host's own brand area, so the shared rules that hide the host's mark and
      // paint the ::before are gated on the Claude brand rather than on
      // :not(deepseek), which would have them paint over the host's whale.
      BRAND_ACTIVE: '[' + BRAND_ATTR + '="' + BRAND_CLAUDE + '"]',
      // Who paints the colours and who sets the type: a rule that writes a
      // host token carries the Claude gate (scripts/css.mjs), and the host
      // blocks alias the skin's private tokens to the host's.
      PALETTE_CLAUDE: '[' + PALETTE_ATTR + '="' + PALETTE_CLAUDE + '"]',
      PALETTE_HOST: '[' + PALETTE_ATTR + '="' + PALETTE_HOST + '"]',
      TYPEFACE_CLAUDE: '[' + TYPEFACE_ATTR + '="' + TYPEFACE_CLAUDE + '"]',
      TYPEFACE_HOST: '[' + TYPEFACE_ATTR + '="' + TYPEFACE_HOST + '"]',
      CLAUDE_WORD_WIDTH: (18 * constants.CLAUDE_WORD_ASPECT).toFixed(1),
    },
    // The gate attributes scripts/css.mjs checks and stamps on the syntax tree.
    gates: {
      composer: constants.COMPOSER_ATTR,
      palette: { attribute: PALETTE_ATTR, claude: PALETTE_CLAUDE, host: PALETTE_HOST },
      typeface: { attribute: TYPEFACE_ATTR, claude: TYPEFACE_CLAUDE, host: TYPEFACE_HOST },
    },
    ...pick(['CRAB_SHEETS', 'DEEPY_SHEETS', 'DEEPY_SCALE', 'DEEPY_GUTTER', 'PREF_DEFAULTS']),
  }
})()

/** The page states and check kinds packages/contracts/src/table.ts records (D44, D45). */
const PROBE_STATES = new Set(['any', 'hero', 'sending', 'streaming', 'conversation', 'menu', 'dark'])
const PROBE_KINDS = new Set(['selector', 'attribute', 'property', 'global', 'value', 'rail-geometry', 'none'])

/**
 * The brand marks the stylesheets paint, as `%%TOKEN%%` placeholders (the skin
 * has no asset URLs: the DSH loader exposes none, so a mark is a data URI or a
 * route address, whichever the asset manifest decided).
 */
const BRAND_MARKS = {
  CLAUDE_MARK: 'claude-mark.svg',
  CLAUDE_WORD: 'claude-word.svg',
  CLAUDE_MARK_CLAY: 'claude-mark-clay.svg',
  // The account row's picture when no avatar is behind it, under the Claude
  // brand: Anthropic's own mark.
  ANTHROPIC_MARK: 'anthropic-mark.svg',
  // The host's own whale mark (ui-primitives FishLogo, FISH_LOGO_PATH), in
  // DeepSeek's brand blue: a picture where it is painted, a shape where it masks.
  DEEPSEEK_MARK: 'deepseek-mark.svg',
}

/**
 * The vendored vendor lockups, keyed by brand id.
 *
 * One file per vendor, already composed from Lobe's mark and wordmark by
 * scripts/fetch-lobe-combines.py, with the vendor's own word in a
 * `data-combine-word` attribute (the word is not derivable from the brand id:
 * `moonshot` draws "MoonshotAI", `zai` draws "zai"). Markup rather than a CSS
 * data URI, because the picker stamps it into the row with `innerHTML` so the
 * mono layer inherits the row's `color`.
 *
 * @param plan - the asset plan (planAssets); the lockups are its text entries.
 * @param claimed - the paths the build read (checkClaimed).
 * @returns brand id → { svg, word }.
 */
function loadCombines(plan, claimed) {
  const out = {}
  for (const [file, entry] of plan.entries) {
    if (!file.startsWith('icons/combine/') || !file.endsWith('.svg')) continue
    claimed.add(file)
    const id = path.basename(file, '.svg')
    const svg = entry.text.replace(/\r\n/g, '\n').trim()
    if (!svg.startsWith('<svg') || !svg.includes('viewBox=')) {
      throw new Error(`build: src/assets/${file} is not a scalable SVG (needs <svg viewBox=…>)`)
    }
    if (svg.includes('</') && /<\/script/i.test(svg)) throw new Error(`build: src/assets/${file} carries a script end tag`)
    if (svg.includes('\n')) throw new Error(`build: src/assets/${file} is multi-line; run scripts/fetch-lobe-combines.py`)
    const word = /data-combine-word="([^"]+)"/.exec(svg)
    if (word === null) throw new Error(`build: src/assets/${file} has no data-combine-word`)
    out[id] = { svg, word: word[1] }
  }
  if (Object.keys(out).length === 0) throw new Error('build: src/assets/icons/combine/ holds no lockups; run scripts/fetch-lobe-combines.py')
  return out
}

/**
 * Deepy's sheets as the vectors the browser plays (D38).
 *
 * Each PNG is decoded, held to its animation table's crop box and frame count,
 * and rebuilt as SVG over the sprite's own cell layout. The vector is what the
 * asset plan ships under the sheet's name; the PNG is an input of the build.
 *
 * @returns the vectors to ship, keyed by their path under src/assets/, and the
 *     PNGs they take the place of.
 */
function vectorizeDeepySheets() {
  const dir = path.join(SRC, 'assets', 'mascot', 'deepy')
  const sheets = CONSTANTS.DEEPY_SHEETS
  checkSheets('DEEPY_SHEETS', sheets, [52, 52], dir, (name) => [`${name}.png`])
  const generated = new Map()
  const replaced = new Set()
  for (const [name, sheet] of Object.entries(sheets)) {
    const image = PNG.sync.read(fs.readFileSync(path.join(dir, `${name}.png`)))
    checkSheetPixels('DEEPY_SHEETS', name, image, sheet, CONSTANTS.DEEPY_SCALE)
    const { svg } = vectorizeSheet(image, sheet.box, CONSTANTS.DEEPY_SCALE, CONSTANTS.DEEPY_GUTTER)
    generated.set(`mascot/deepy/${name}.svg`, svg)
    replaced.add(`mascot/deepy/${name}.png`)
  }
  return { generated, replaced }
}

/**
 * Check the model copy document before it ships. Every failure here is one the
 * picker could otherwise only express as a silently missing or wrong line, so
 * they all throw.
 *
 * The document's shape is declared in src/model-descriptions.schema.json: the
 * tables, the `{locale: text}` lines, a rule's compilable `match` and its `key`
 * or `text`. What a schema cannot see is checked after it: a `families[].key`,
 * `tiers[].key` or `aliases` target must name an `exact` entry, every brand id
 * must be a vendored lockup under src/assets/icons/combine/ (a typo would render
 * as a silently missing mark on one row), and the document must carry at least
 * two locales.
 *
 * @param doc - parsed `src/model-descriptions.json`.
 * @param lobeBrands - the vendored lockups keyed by brand id (loadCombines).
 * @returns the number of exact entries, for the build log.
 */
function validateModelCopy(doc, lobeBrands) {
  const fail = (message) => {
    throw new Error(`build: ${MODEL_COPY} ${message}`)
  }
  if (!validateModelCopyShape(doc)) {
    fail(validateModelCopyShape.errors.map((error) => `${error.instancePath || '/'} ${error.message}`).join('; '))
  }

  const requireEntry = (where, key) => {
    if (!(key in doc.exact)) fail(`${where} points at unknown entry "${key}"`)
  }
  for (const [from, to] of Object.entries(doc.aliases ?? {})) requireEntry(`alias "${from}"`, to)
  for (const list of ['families', 'tiers']) {
    for (const [index, rule] of (doc[list] ?? []).entries()) {
      if (rule.key !== undefined) requireEntry(`${list}[${index}]`, rule.key)
    }
  }

  const requireBrand = (where, brand) => {
    if (!(brand in lobeBrands)) fail(`${where} names brand "${brand}", which has no vendored lockup in src/assets/icons/combine/`)
  }
  for (const [provider, brand] of Object.entries(doc.brands.providers ?? {})) requireBrand(`brands.providers["${provider}"]`, brand)
  for (const [index, rule] of doc.brands.models.entries()) requireBrand(`brands.models[${index}].brand`, rule.brand)

  const locales = new Set([doc.fallback])
  const addLocales = (pair) => {
    for (const locale of Object.keys(pair)) locales.add(locale)
  }
  for (const pair of Object.values(doc.exact)) addLocales(pair)
  for (const group of ['ui', 'settings', 'ban']) {
    for (const pair of Object.values(doc[group] ?? {})) addLocales(pair)
  }
  for (const list of ['families', 'tiers']) {
    for (const rule of doc[list] ?? []) {
      if (rule.text !== undefined) addLocales(rule.text)
    }
  }
  if (locales.size < 2) fail('carries fewer than two locales; i18n needs at least the fallback and one translation')
  return Object.keys(doc.exact).length
}

/**
 * Refuse a source file that does not ship: a stylesheet no manifest and no
 * theme entry names, or a module nothing imports, would otherwise sit in src/
 * with no way to reach the page. Manifests are data the build reads, the
 * contract table is read by the build and the tests (D44), and unit tests run
 * under Vitest; none of them is a module the bundle carries.
 *
 * @param bundled - the src/-relative modules in the bundle (esbuild's metafile).
 * @param sheets - every stylesheet the bundle carries (styleFiles).
 */
function checkListed(bundled, sheets) {
  const listed = new Set(sheets.map((sheet) => sheet.file))
  const walk = (dir) => fs.readdirSync(path.join(SRC, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = dir === '' ? entry.name : `${dir}/${entry.name}`
    if (entry.isDirectory()) return rel === 'assets' ? [] : walk(rel)
    return [rel]
  })
  for (const file of walk('')) {
    if (file.endsWith('.css') && !listed.has(file)) throw new Error(`build: src/${file} is in no list; add it to its feature's manifest or to THEME_SHEETS`)
    if (file.endsWith('.manifest.ts') || file.endsWith('.test.ts') || file.endsWith('.d.ts')) continue
    if (file.endsWith('.ts') && !bundled.has(file)) throw new Error(`build: src/${file} is imported by no module the bundle reaches`)
  }
}

/**
 * Hold the manifests to the rest of the repository: every feature directory
 * carries at least one manifest, and a `pref` names a key of the host half's
 * PREFS_DEFAULT (host/settings.js), the table the settings form serves.
 *
 * @param manifests - the feature manifests (scripts/read-manifests.cjs).
 */
function checkManifests(manifests) {
  const covered = new Set(manifests.map((manifest) => manifest.dir))
  for (const dir of fs.readdirSync(path.join(SRC, 'features'), { withFileTypes: true })) {
    if (dir.isDirectory() && !covered.has(dir.name)) throw new Error(`build: src/features/${dir.name}/ has no manifest`)
  }
  for (const manifest of manifests) {
    if (manifest.pref !== undefined && !(manifest.pref in PREFS_DEFAULT)) {
      throw new Error(`build: src/${manifest.file} names pref "${manifest.pref}", which host/settings.js PREFS_DEFAULT does not carry`)
    }
  }
}

/** The manifest fields the browser half reads (FeatureRuntime in src/core/feature.ts). */
const RUNTIME_FIELDS = ['id', 'handle', 'order', 'pref', 'ungated', 'yieldsTo', 'switchRow']

/**
 * The feature registry, `virtual:dsh-claude-style/features`: each manifest's
 * runtime fields beside its main module's `install`, in install order. The
 * manifests themselves stay out of the bundle — their descriptions and test
 * coverage are of no use to the page.
 *
 * @param manifests - the feature manifests in install order.
 */
function featuresModule(manifests) {
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
 * Hold the browser half's preference defaults (src/constants.ts PREF_DEFAULTS)
 * to the host half's PREFS_DEFAULT: the same keys with the same values, so the
 * frames before the settings form answers show what the form will hold.
 */
function checkPrefDefaults() {
  const browser = CONSTANTS.PREF_DEFAULTS
  for (const key of new Set([...Object.keys(browser), ...Object.keys(PREFS_DEFAULT)])) {
    if (!(key in browser)) throw new Error(`build: src/constants.ts PREF_DEFAULTS lacks "${key}", which host/settings.js PREFS_DEFAULT carries`)
    if (!(key in PREFS_DEFAULT)) throw new Error(`build: host/settings.js PREFS_DEFAULT lacks "${key}", which src/constants.ts PREF_DEFAULTS carries`)
    if (JSON.stringify(browser[key]) !== JSON.stringify(PREFS_DEFAULT[key])) {
      throw new Error(`build: preference "${key}" defaults to ${JSON.stringify(browser[key])} in src/constants.ts but ${JSON.stringify(PREFS_DEFAULT[key])} in host/settings.js`)
    }
  }
}

/**
 * Type-check src/ (tsconfig.json, strict). esbuild only strips types, so this
 * is what turns a missing import, a misspelt name or a wrong argument into a
 * build failure.
 */
function checkTypes() {
  const tsc = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc')
  try {
    execFileSync(process.execPath, [tsc, '-p', ROOT, '--pretty'], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' })
  } catch (error) {
    process.stderr.write(error.stdout + error.stderr)
    throw new Error('build: tsc reports type errors in src/ (listed above)')
  }
}

/**
 * Refuse an import cycle. Modules in a cycle evaluate one before the other has
 * finished, so a constant read across it can be read before it is initialized.
 *
 * @param metafile - esbuild's metafile for the bundle.
 */
function checkCycles(metafile) {
  const graph = new Map(Object.entries(metafile.inputs).map(([file, input]) => [file, input.imports.filter((item) => !item.external).map((item) => item.path)]))
  const state = new Map()
  const stack = []
  const visit = (file) => {
    state.set(file, 'open')
    stack.push(file)
    for (const next of graph.get(file) ?? []) {
      if (state.get(next) === 'open') {
        const cycle = [...stack.slice(stack.indexOf(next)), next].join(' → ')
        throw new Error(`build: import cycle ${cycle}`)
      }
      if (!state.has(next)) visit(next)
    }
    stack.pop()
    state.set(file, 'done')
  }
  for (const file of graph.keys()) if (!state.has(file)) visit(file)
}

/**
 * Hold the host contract together (D44).
 *
 * The literals the skin keys on live in src/contracts/dom.ts and the table of
 * what they mean in src/contracts/table.ts; neither may drift from the other,
 * and every entry has to be claimed by a feature manifest (D42), so a selector
 * cannot enter the skin without a note and an owner, and a host upgrade can be
 * audited by walking one list.
 *
 * @param manifests - the feature manifests (scripts/read-manifests.cjs).
 * @returns the table, for the build log.
 */
function checkContracts(manifests) {
  const literals = loadModule('packages/contracts/src/dom.ts')
  const { HOST_DOM: table } = loadModule('packages/contracts/src/table.ts')
  if (!Array.isArray(table) || table.length === 0) throw new Error('build: src/contracts/table.ts exports no HOST_DOM')
  const listed = new Set()
  for (const entry of table) {
    if (typeof entry.id !== 'string' || entry.id === '' || typeof entry.use !== 'string' || entry.use === '') {
      throw new Error(`build: src/contracts/table.ts has an entry without an id and a use: ${JSON.stringify(entry)}`)
    }
    if (listed.has(entry.id)) throw new Error(`build: src/contracts/table.ts lists "${entry.id}" twice`)
    listed.add(entry.id)
  }
  // Every entry says how the contract test checks it (D44), so a host upgrade
  // walks one list with no entry quietly unchecked.
  for (const entry of table) {
    const probe = entry.probe
    if (probe === null || typeof probe !== 'object') throw new Error(`build: src/contracts/table.ts entry "${entry.id}" has no probe`)
    if (!PROBE_STATES.has(probe.state)) throw new Error(`build: src/contracts/table.ts entry "${entry.id}" has probe state "${probe.state}"`)
    if (!PROBE_KINDS.has(probe.kind)) throw new Error(`build: src/contracts/table.ts entry "${entry.id}" has probe kind "${probe.kind}"`)
    if (probe.within !== undefined && !listed.has(probe.within)) throw new Error(`build: src/contracts/table.ts entry "${entry.id}" is checked within "${probe.within}", which the table does not list`)
  }
  const values = new Set(table.map((entry) => entry.value))
  for (const [name, value] of Object.entries(literals)) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(name) || (typeof value !== 'string' && typeof value !== 'number')) continue
    if (!values.has(String(value))) {
      throw new Error(`build: src/contracts/dom.ts exports ${name} (${JSON.stringify(value)}) with no entry in src/contracts/table.ts`)
    }
  }
  const claimed = new Set()
  for (const manifest of manifests) {
    for (const id of manifest.contracts) {
      if (!listed.has(id)) throw new Error(`build: src/${manifest.file} names host contract "${id}", which src/contracts/table.ts does not list`)
      claimed.add(id)
    }
  }
  const unclaimed = table.filter((entry) => entry.owner !== 'core' && !claimed.has(entry.id)).map((entry) => entry.id)
  if (unclaimed.length > 0) throw new Error(`build: src/contracts/table.ts entries no feature manifest claims: ${unclaimed.join(', ')}`)
  checkTiming()
  return table
}

/**
 * Hold the timing table to its checks (D44).
 *
 * The timing assumptions live in src/contracts/timing.ts, each naming what holds
 * it: a scenario of the end-to-end lane or a unit test beside its module. Both
 * names have to exist, so an assumption cannot enter the table with nothing that
 * would notice it changing.
 */
function checkTiming() {
  const { E2E_SCENARIOS, HOST_TIMING } = loadModule('packages/contracts/src/timing.ts')
  if (!Array.isArray(HOST_TIMING) || HOST_TIMING.length === 0) throw new Error('build: src/contracts/timing.ts exports no HOST_TIMING')
  const scenarios = new Set(E2E_SCENARIOS)
  const seen = new Set()
  for (const entry of HOST_TIMING) {
    for (const field of ['id', 'assumption', 'use']) {
      if (typeof entry[field] !== 'string' || entry[field] === '') throw new Error(`build: src/contracts/timing.ts has an entry without ${field}: ${JSON.stringify(entry)}`)
    }
    if (seen.has(entry.id)) throw new Error(`build: src/contracts/timing.ts lists "${entry.id}" twice`)
    seen.add(entry.id)
    if (!Array.isArray(entry.checks) || entry.checks.length === 0) throw new Error(`build: src/contracts/timing.ts entry "${entry.id}" names no check`)
    for (const check of entry.checks) {
      const [kind, name] = String(check).split(':')
      if (kind === 'scenario') {
        if (!scenarios.has(name)) throw new Error(`build: src/contracts/timing.ts entry "${entry.id}" names the lane scenario "${name}", which tools/e2e.cjs does not run`)
        continue
      }
      if (kind === 'test') {
        if (!fs.existsSync(path.join(ROOT, name))) throw new Error(`build: src/contracts/timing.ts entry "${entry.id}" names the test "${name}", which does not exist`)
        continue
      }
      throw new Error(`build: src/contracts/timing.ts entry "${entry.id}" has the check "${check}", which is neither scenario:<name> nor test:<path>`)
    }
  }
}

/**
 * Refuse a module other than the scroll owner importing the spring: the chat
 * area's positions have one writer (D41), and a direct ease would bypass its
 * arbitration.
 *
 * @param metafile - esbuild's metafile for the bundle.
 */
function checkScrollOwner(metafile) {
  for (const [file, input] of Object.entries(metafile.inputs)) {
    if (file === 'src/shared/scroll-owner.ts') continue
    if (input.imports.some((item) => item.path === 'src/shared/scroll-ease.ts')) {
      throw new Error(`build: ${file} imports shared/scroll-ease.ts; positions go through shared/scroll-owner.ts (D41)`)
    }
  }
}

/**
 * The generated module (src/generated.d.ts) as an esbuild plugin: everything the
 * build produces for the browser half, as named exports.
 */
function generatedModule(values) {
  const contents = Object.entries(values).map(([name, value]) => `export const ${name} = ${JSON.stringify(value)}`).join('\n')
  return {
    name: 'generated',
    setup(build) {
      build.onResolve({ filter: /^virtual:dsh-claude-style\/generated$/ }, (args) => ({ path: args.path, namespace: 'generated' }))
      build.onLoad({ filter: /.*/, namespace: 'generated' }, () => ({ contents, loader: 'js' }))
    },
  }
}

async function main() {
  checkTypes()
  checkPrefDefaults()
  const manifests = manifestReader.readManifests()
  checkManifests(manifests)
  checkContracts(manifests)
  const sheets = styleFiles(manifests)

  // Every image, its content hash and its address (D38). Nothing is written
  // yet: the plan is read by everything below, and a refusal anywhere in this
  // build must leave lib/ as it was.
  const deepy = vectorizeDeepySheets()
  const plan = planAssets({ srcDir: SRC, generated: deepy.generated, replaced: deepy.replaced })
  const claimed = new Set()
  const tokens = { ...CONSTANTS.tokens }
  for (const [token, file] of Object.entries(BRAND_MARKS)) {
    const entry = plan.entries.get(`brand/${file}`)
    if (entry === undefined) throw new Error(`build: each asset is claimed or fails the build; brand/${file} (%%${token}%%) is missing`)
    claimed.add(`brand/${file}`)
    tokens[token] = `url("${entry.url}")`
  }
  const combines = loadCombines(plan, claimed)

  // The crab's sheets ride the bundle: one pair of data URIs per animation.
  const crab = {}
  for (const name of Object.keys(CONSTANTS.CRAB_SHEETS)) {
    const body = plan.entries.get(`mascot/crab/${name}.png`)
    const ink = plan.entries.get(`mascot/crab/${name}-ink.png`)
    if (body === undefined || ink === undefined) throw new Error(`build: CRAB_SHEETS["${name}"] has no sheet pair under src/assets/mascot/crab/`)
    claimed.add(body.file)
    claimed.add(ink.file)
    crab[name] = { body: body.url, ink: ink.url }
  }

  // Deepy's sheets are the vectors the build produced; the addresses are the
  // route's, one per sheet, and only the played ones are ever fetched.
  const deepyUrls = {}
  for (const name of Object.keys(CONSTANTS.DEEPY_SHEETS)) {
    const entry = plan.entries.get(`mascot/deepy/${name}.svg`)
    // vectorizeDeepySheets built every one of them, so absence is a bug here.
    if (entry === undefined) throw new Error(`build: DEEPY_SHEETS["${name}"] has no vector; the sheets and the table disagree`)
    claimed.add(entry.file)
    deepyUrls[name] = entry.url
  }
  checkClaimed(plan, claimed)

  const tokenDoc = loadTokens(SRC)
  const cssText = buildStylesheet({ sheets, srcDir: SRC, tokens, tokenDoc, gates: CONSTANTS.gates })
  if (writeTokenTable(STYLE_GUIDE, tokenDoc)) console.log('built docs/STYLE.md token table from src/theme/tokens.json')

  const result = await esbuild.build({
    entryPoints: [path.join(SRC, 'entry.ts')],
    bundle: true,
    format: 'cjs',
    platform: 'browser',
    target: 'esnext',
    charset: 'utf8',
    minify: true,
    sourcemap: 'linked',
    outfile: OUT,
    write: false,
    metafile: true,
    logLevel: 'silent',
    external: HOST_PACKAGES,
    // The factory around the body is part of the output, so the source map
    // counts its lines.
    banner: { js: FACTORY_OPEN },
    footer: { js: FACTORY_CLOSE },
    plugins: [featuresModule(manifests), generatedModule({
      STYLESHEET: cssText,
      // Vendor lockups: one markup table plus the word each lockup stands in for.
      COMBINE_SVGS: Object.fromEntries(Object.entries(combines).map(([id, item]) => [id, item.svg])),
      COMBINE_WORDS: Object.fromEntries(Object.entries(combines).map(([id, item]) => [id, item.word])),
      // The build id: a hash of the bundle itself, written into it below. The
      // skin puts it on <body data-dsh-claude-style>, so a live page can be
      // matched to the lib/client.js it runs — a hot reload swaps the bundle
      // without reloading the page, so the page's load time says nothing about
      // its code.
      BUILD_ID: BUILD_ID_SLOT,
      CRAB_SHEET_URLS: crab,
      DEEPY_SHEET_URLS: deepyUrls,
    })],
  })
  checkCycles(result.metafile)
  checkScrollOwner(result.metafile)
  const bundled = new Set(Object.keys(result.metafile.inputs).filter((file) => file.startsWith('src/')).map((file) => file.slice('src/'.length)))
  checkListed(bundled, sheets)

  const output = (suffix) => result.outputFiles.find((file) => file.path.endsWith(suffix)).text
  const draft = output('client.js')
  const sourceMap = output('client.js.map')
  // The slot and the id have the same length, so the source map's columns hold.
  const buildId = createHash('sha256').update(draft).digest('hex').slice(0, BUILD_ID_SLOT.length)
  if (draft.split(BUILD_ID_SLOT).length !== 2) throw new Error('build: the bundle does not carry the build id slot exactly once')
  const bundle = draft.replace(BUILD_ID_SLOT, buildId)

  // Syntax gate: the bundle must parse before it is written. The failing
  // bundle is kept in .debug/ so the line the parser names can be read.
  try {
    new vm.Script(bundle, { filename: 'lib/client.js' })
  } catch (error) {
    fs.mkdirSync(path.join(ROOT, '.debug'), { recursive: true })
    fs.writeFileSync(path.join(ROOT, '.debug', 'failed-bundle.js'), bundle)
    throw new Error(`build: generated bundle failed to parse (written to .debug/failed-bundle.js): ${error.message}`)
  }

  // Everything is validated before anything is written: a refusal anywhere in
  // this build must not leave lib/ holding one half of a new build beside the
  // other half of the previous one. lib/ is not in version control (D47), so a
  // fresh clone has no directory to write into yet.
  const copy = JSON.parse(fs.readFileSync(path.join(SRC, MODEL_COPY), 'utf8'))
  const exact = validateModelCopy(copy, combines)
  const copyText = JSON.stringify(copy, null, 2) + '\n'
  const iconSource = path.join(BRAND_ASSETS, ICON_SOURCE)
  const iconTarget = path.join(LIB, ICON_FILE)
  if (!fs.existsSync(iconSource)) throw new Error(`build: src/assets/brand/${ICON_SOURCE} is missing`)

  fs.mkdirSync(LIB, { recursive: true })
  fs.writeFileSync(OUT, bundle)
  fs.writeFileSync(`${OUT}.map`, sourceMap)
  console.log(`built lib/client.js (${Buffer.byteLength(bundle)} bytes, build ${buildId}) from src/ (${bundled.size} modules + ${sheets.length} stylesheets + ${Object.keys(combines).length} lockups)`)

  fs.writeFileSync(path.join(LIB, MODEL_COPY), copyText)
  console.log(`built lib/${MODEL_COPY} (${exact} exact entries, ${copy.families.length} family rules, ${copy.tiers.length} tier rules)`)

  fs.copyFileSync(iconSource, iconTarget)
  console.log(`built lib/${ICON_FILE} (${fs.statSync(iconTarget).size} bytes) from src/assets/brand/${ICON_SOURCE}`)

  const assets = writeAssets(LIB, plan)
  console.log(`built lib/assets/ (${assets.files} routed of ${plan.entries.size} assets, ${assets.bytes} bytes) from src/assets/`)
}

await main()
