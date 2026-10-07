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
 *   src/assets/brand/*.svg       brand marks, stylesheet data URIs
 *   src/assets/icons/combine/*.svg     vendor lockups (mark + wordmark in one)
 *   src/assets/mascot/crab/*.png       the crab's sheets (scripts/draw-crab.py), data URIs
 *   src/assets/mascot/deepy/*.png      Deepy's sheets, copied to lib/deepy/ for the host half to serve
 *
 * What the build produces for the browser half reaches the source as one
 * generated module, `virtual:dsh-claude-style/generated` (typed in
 * src/generated.d.ts): the stylesheet, the lockups, the sheet stamps and data
 * URIs, the build id.
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
import { TOKEN_SHEET, buildStylesheet, loadTokens, writeTokenTable } from './css.mjs'
import manifestReader from './read-manifests.cjs'

const ROOT = path.resolve(import.meta.dirname, '..')
/**
 * The host half's preference table (host/settings.js): the browser half's
 * PREF_DEFAULTS and src/entry.ts's feature switches are both held to it.
 */
const { PREFS_DEFAULT } = await import(pathToFileURL(path.join(ROOT, 'host', 'settings.js')).href)
const SRC = path.join(ROOT, 'src')
const ASSETS = path.join(SRC, 'assets')
/** Brand marks inlined as CSS data URIs. */
const BRAND_ASSETS = path.join(ASSETS, 'brand')
/** The mascots' art. */
const MASCOT_ASSETS = path.join(ASSETS, 'mascot')
/** The composer crab's animation sheets (scripts/draw-crab.py), inlined as data URIs. */
const CRAB_ASSETS = path.join(MASCOT_ASSETS, 'crab')
/** Deepy's animation sheets, copied to lib/deepy/ for the host half to serve. */
const DEEPY_ASSETS = path.join(MASCOT_ASSETS, 'deepy')
/** Vendored vendor lockups (src/assets/icons/combine); mark + wordmark per brand id. */
const COMBINE_ASSETS = path.join(ASSETS, 'icons', 'combine')
/** The style guide; its token table is generated from src/theme/tokens.json. */
const STYLE_GUIDE = path.join(ROOT, 'docs', 'STYLE.md')
const LIB = path.join(ROOT, 'lib')
const OUT = path.join(LIB, 'client.js')
const DEEPY_OUT = path.join(LIB, 'deepy')

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
  const { outputFiles } = esbuild.buildSync({
    entryPoints: [path.join(SRC, 'constants.ts')],
    bundle: true,
    format: 'cjs',
    platform: 'neutral',
    write: false,
    logLevel: 'silent',
  })
  const module = { exports: {} }
  vm.runInNewContext(outputFiles[0].text, { module, exports: module.exports }, { filename: 'src/constants.ts' })
  const constants = module.exports
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
    ...pick(['CRAB_SHEETS', 'DEEPY_SHEETS', 'PREF_DEFAULTS']),
  }
})()

/**
 * Brand marks ship as runtime-inlined data URIs (the DSH loader exposes no
 * relative requires / asset URLs), so each src/assets/brand/*.svg is encoded into a
 * CSS url() %%TOKEN%% value here, at build time.
 */
const SVG_TOKENS = {
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

/** Read one SVG source and wrap it as a CSS url() data URI. */
function loadSvgAssets() {
  const out = {}
  for (const [token, file] of Object.entries(SVG_TOKENS)) {
    const svg = fs.readFileSync(path.join(BRAND_ASSETS, file), 'utf8').replace(/\r\n/g, '\n').trim()
    out[token] = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'
  }
  return out
}

/**
 * The file name a mascot sheet may have. The host half serves Deepy's sheets
 * under exactly the names this shape allows (host/routes.js, DEEPY_FILE), so a
 * name outside it would be copied and never served.
 */
const SHEET_FILE = /^[a-z]+(?:-[a-z]+)*\.png$/

/**
 * Hold one mascot's sheet directory to its animation table in src/constants.ts.
 *
 * Each entry needs its files and a well-formed row — a frame count, a crop box
 * inside the character's grid, a still frame the sheet holds — and a file no
 * entry names is refused, so the package never ships a sheet the mascot cannot
 * play or an entry that would draw nothing.
 *
 * @param table - the table's name, for diagnostics.
 * @param sheets - animation → `{ frames, box, still }`.
 * @param grid - `[width, height]` of the character's grid.
 * @param dir - the sheet directory.
 * @param filesOf - animation → the file names its entry needs.
 */
function checkSheets(table, sheets, grid, dir, filesOf) {
  const where = path.relative(ROOT, dir).replace(/\\/g, '/')
  const wanted = new Set(Object.keys(sheets).flatMap(filesOf))
  const files = fs.readdirSync(dir)
  for (const file of files) {
    if (!SHEET_FILE.test(file) || !wanted.has(file)) throw new Error(`build: ${where}/${file} has no entry in ${table}`)
  }
  for (const [name, sheet] of Object.entries(sheets)) {
    const [x, y, w, h] = Array.isArray(sheet.box) ? sheet.box : []
    const whole = [sheet.frames, sheet.still, x, y, w, h].every(Number.isInteger)
    if (!whole || sheet.frames < 1 || sheet.still < 0 || sheet.still >= sheet.frames || x < 0 || y < 0 || w < 1 || h < 1 || x + w > grid[0] || y + h > grid[1]) {
      throw new Error(`build: ${table}["${name}"] needs whole frames, still < frames and a box inside the ${grid[0]}×${grid[1]} grid`)
    }
    for (const file of filesOf(name)) {
      if (!files.includes(file)) throw new Error(`build: ${table}["${name}"] has no ${file} in ${where}/`)
    }
  }
}

/**
 * The composer crab's sheets, inlined into the bundle as CRAB_SHEET_URLS.
 *
 * Drawn by scripts/draw-crab.py into src/assets/mascot/crab/: per animation a
 * sheet in the crab's colours and an ink mask, eight frames to a row, one
 * pixel a cell, on a 52×36 grid. Together they are a few dozen kilobytes, so
 * they ride the bundle as data URIs and every animation is ready the moment
 * it is wanted.
 *
 * @returns animation → { body, ink } data URIs.
 */
function loadCrabSheets() {
  const sheets = CONSTANTS.CRAB_SHEETS
  checkSheets('CRAB_SHEETS', sheets, [52, 36], CRAB_ASSETS, (name) => [`${name}.png`, `${name}-ink.png`])
  const read = (file) => 'data:image/png;base64,' + fs.readFileSync(path.join(CRAB_ASSETS, file)).toString('base64')
  const out = {}
  for (const name of Object.keys(sheets)) out[name] = { body: read(`${name}.png`), ink: read(`${name}-ink.png`) }
  return out
}

/**
 * Check Deepy's sheets before lib/ is touched, and stamp each one.
 *
 * Deepy is drawn on a 52×52 grid. The sheets are too large to inline (about
 * 0.4 MB together) and the browser only fetches the ones it plays, so they are
 * copied; every check that can fail runs here, while nothing has been written
 * yet. The stamps are emitted into the bundle as DEEPY_STAMPS: the browser
 * half keys its generated vector cache on the sheet's own stamp, so a sheet is
 * re-converted only when its own pixels change.
 *
 * @returns the sheet names in table order, their total size and their content stamps.
 */
function planDeepySheets() {
  const names = Object.keys(CONSTANTS.DEEPY_SHEETS)
  checkSheets('DEEPY_SHEETS', CONSTANTS.DEEPY_SHEETS, [52, 52], DEEPY_ASSETS, (name) => [`${name}.png`])
  let bytes = 0
  const stamps = {}
  for (const name of names) {
    const sheet = fs.readFileSync(path.join(DEEPY_ASSETS, `${name}.png`))
    bytes += sheet.byteLength
    stamps[name] = createHash('sha256').update(sheet).digest('hex').slice(0, 12)
  }
  return { names, bytes, stamps }
}

/** Copy the planned sheets into lib/deepy/, replacing whatever was there. */
function writeDeepySheets(names) {
  fs.rmSync(DEEPY_OUT, { recursive: true, force: true })
  fs.mkdirSync(DEEPY_OUT)
  for (const name of names) {
    fs.copyFileSync(path.join(DEEPY_ASSETS, `${name}.png`), path.join(DEEPY_OUT, `${name}.png`))
  }
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
 * @returns brand id → { svg, word }.
 */
function loadCombines() {
  const out = {}
  if (!fs.existsSync(COMBINE_ASSETS)) return out
  for (const name of fs.readdirSync(COMBINE_ASSETS).sort()) {
    if (!name.endsWith('.svg')) continue
    const id = name.slice(0, -4)
    const svg = fs.readFileSync(path.join(COMBINE_ASSETS, name), 'utf8').replace(/\r\n/g, '\n').trim()
    if (!svg.startsWith('<svg') || !svg.includes('viewBox=')) {
      throw new Error(`build: src/assets/icons/combine/${name} is not a scalable SVG (needs <svg viewBox=…>)`)
    }
    if (svg.includes('</') && /<\/script/i.test(svg)) throw new Error(`build: src/assets/icons/combine/${name} carries a script end tag`)
    if (svg.includes('\n')) throw new Error(`build: src/assets/icons/combine/${name} is multi-line; run scripts/fetch-lobe-combines.py`)
    const word = /data-combine-word="([^"]+)"/.exec(svg)
    if (word === null) throw new Error(`build: src/assets/icons/combine/${name} has no data-combine-word`)
    out[id] = { svg, word: word[1] }
  }
  if (Object.keys(out).length === 0) throw new Error('build: src/assets/icons/combine/ holds no lockups; run scripts/fetch-lobe-combines.py')
  return out
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
 * with nothing to say it never reaches the page. Manifests are data the build
 * reads and unit tests run under Vitest; neither is a module the bundle carries.
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
  const sheets = styleFiles(manifests)
  const tokens = { ...CONSTANTS.tokens, ...loadSvgAssets() }
  const combines = loadCombines()

  const tokenDoc = loadTokens(SRC)
  const cssText = buildStylesheet({ sheets, srcDir: SRC, tokens, tokenDoc, gates: CONSTANTS.gates })
  if (writeTokenTable(STYLE_GUIDE, tokenDoc)) console.log('built docs/STYLE.md token table from src/theme/tokens.json')

  // Deepy sheet stamps: content hashes of the sheets, for the browser half's
  // vector cache keys (planDeepySheets).
  const deepy = planDeepySheets()

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
      DEEPY_STAMPS: deepy.stamps,
      CRAB_SHEET_URLS: loadCrabSheets(),
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
  // other half of the previous one.
  const copy = JSON.parse(fs.readFileSync(path.join(SRC, MODEL_COPY), 'utf8'))
  const exact = validateModelCopy(copy, combines)
  const copyText = JSON.stringify(copy, null, 2) + '\n'
  const iconSource = path.join(BRAND_ASSETS, ICON_SOURCE)
  const iconTarget = path.join(LIB, ICON_FILE)
  if (!fs.existsSync(iconSource)) throw new Error(`build: src/assets/brand/${ICON_SOURCE} is missing`)

  fs.writeFileSync(OUT, bundle)
  fs.writeFileSync(`${OUT}.map`, sourceMap)
  console.log(`built lib/client.js (${Buffer.byteLength(bundle)} bytes, build ${buildId}) from src/ (${bundled.size} modules + ${sheets.length} stylesheets + ${Object.keys(combines).length} lockups)`)

  fs.writeFileSync(path.join(LIB, MODEL_COPY), copyText)
  console.log(`built lib/${MODEL_COPY} (${exact} exact entries, ${copy.families.length} family rules, ${copy.tiers.length} tier rules)`)

  fs.copyFileSync(iconSource, iconTarget)
  console.log(`built lib/${ICON_FILE} (${fs.statSync(iconTarget).size} bytes) from src/assets/brand/${ICON_SOURCE}`)

  writeDeepySheets(deepy.names)
  console.log(`built lib/deepy/ (${deepy.names.length} sheets, ${deepy.bytes} bytes) from src/assets/mascot/deepy/`)
}

await main()
