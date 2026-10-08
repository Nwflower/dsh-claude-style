#!/usr/bin/env node
/**
 * build.mjs — bundle `lib/client.js` from the TypeScript modules and stylesheets in `packages/client/src/` (D36).
 *
 * The DSH module loader takes one file per plugin client, registered with
 * `__ModuleLoader__.load` and handed a `require` for the packages the host
 * provides; it has no relative requires and no asset URLs. So esbuild bundles
 * packages/client/src/entry.ts into one minified CommonJS body with React and the host packages
 * external, and that body is wrapped in the loader's factory:
 *
 *   packages/client/src/entry.ts                 apply(): the FEATURES table, the deferred features installed from their chunks (D39)
 *   packages/client/src/constants.ts             constants; also evaluated here for the stylesheet gates
 *   scripts/chunks.mjs                           the deferred features' chunks (D39), routed like the assets
 *   packages/client/src/core/ packages/client/src/shared/ packages/client/src/features/<name>/   the modules, TypeScript, strict
 *   packages/client/src/features/<dir>/<main>.manifest.ts   each feature's manifest (D42), read by scripts/shared/read-manifests.cjs
 *   packages/client/src/theme/*.css and the feature stylesheets   concatenated by rank (THEME_SHEETS and the manifests),
 *                                checked and gated on the syntax tree (scripts/css.mjs)
 *   packages/client/src/theme/tokens.json        the design tokens: the token stylesheet and docs/STYLE.md's table
 *   packages/assets/src/                  every image (packages/assets/assets.mjs, D38): small ones inline, the rest
 *                                written to lib/assets/<hash>.<ext> and served by the host half
 *   packages/assets/src/fonts/            the four faces the package ships with their licences and
 *                                authors file, copied to lib/fonts/ (buildFonts)
 *
 * What the build produces for the browser half reaches the source as one
 * generated module, `virtual:dsh-claude-style/generated` (typed in
 * packages/client/src/generated.d.ts): the stylesheet, the asset addresses, the lockups, the
 * build id.
 *
 * Before anything is written, `tsc` type-checks packages/client/src/ and the bundle's import
 * graph must hold no cycle: a missing import, a cycle or a constant read before
 * it is initialized fails the build. Those refusals and the contract tables'
 * are in scripts/build-checks.mjs, the stylesheets' in scripts/css.mjs; the three
 * generated modules are scripts/virtual-modules.mjs.
 *
 * `packages/client/data/model-descriptions.json` is not bundled: it is validated
 * (scripts/model-copy.mjs) and copied to `lib/`, where the host half serves it to
 * the browser half at runtime. Model copy is data, so it must not enter the bundle (D5).
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import esbuild from 'esbuild'
import { PNG } from 'pngjs'
import { buildHostHalf } from '../packages/host/build.mjs'
import { buildFonts, checkClaimed, checkSheetPixels, checkSheets, planAssets, routeText, vectorizeSheet, writeAssets } from '../packages/assets/assets.mjs'
import { checkContracts, checkCycles, checkListed, checkManifests, checkScrollOwner, checkTypes } from './build-checks.mjs'
import { chunkFiles, chunkModules, splitChunks } from './chunks.mjs'
import { TOKEN_SHEET, buildStylesheet, loadTokens, writeTokenTable } from './css.mjs'
import { MODEL_COPY, validateModelCopy } from './model-copy.mjs'
import manifestReader from './shared/read-manifests.cjs'
import { loadModule } from './shared/ts-module.cjs'
import { chunkModulesModule, featuresModule, generatedModule } from './virtual-modules.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC = path.join(ROOT, 'packages', 'client', 'src')
/** The model copy: data beside the browser half's code, never bundled. */
const DATA = path.join(ROOT, 'packages', 'client', 'data')
/** Brand marks, mascot sheets and vendor lockups; packages/assets/assets.mjs plans their delivery (D38). */
const ASSETS = path.join(ROOT, 'packages', 'assets', 'src')
/** The plugin icon the manifest names, copied into lib/ as it is. */
const BRAND_ASSETS = path.join(ASSETS, 'brand')
/** The style guide; its token table is generated from packages/client/src/theme/tokens.json. */
const STYLE_GUIDE = path.join(ROOT, 'docs', 'STYLE.md')
const LIB = path.join(ROOT, 'lib')
const OUT = path.join(LIB, 'client.js')

/**
 * The plugin icon the 0.1.7 plugin manifest reads.
 *
 * `package.json` declares it as `icon`, a path relative to the manifest
 * (SVG/PNG/JPEG/WebP, at most 256 KiB, inside the package directory); the host
 * reads the bytes and hands the client a base64 data URI for an `<img>`. It is
 * copied like the copy document so the source of truth stays in `packages/client/src/` and
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
  // Generated from packages/client/src/theme/tokens.json (scripts/css.mjs).
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
 * @param manifests - the feature manifests (scripts/shared/read-manifests.cjs).
 * @returns `{ file, rank, gate? }` with `file` relative to packages/client/src.
 */
function styleFiles(manifests) {
  const sheets = [
    ...THEME_SHEETS,
    ...manifests.flatMap((manifest) => manifest.stylesheets.map((sheet) => ({ ...sheet, file: `features/${manifest.dir}/${sheet.file}` }))),
  ].sort((a, b) => a.rank - b.rank)
  for (let i = 1; i < sheets.length; i++) {
    if (sheets[i].rank === sheets[i - 1].rank) throw new Error(`build: packages/client/src/${sheets[i - 1].file} and packages/client/src/${sheets[i].file} share the stylesheet rank ${sheets[i].rank}`)
  }
  return sheets
}

/** The package's own manifest; the loader id, the stylesheet's tag and the profile entry carry its name (D33). */
const PACKAGE = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
const PACKAGE_ID = PACKAGE.name

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
 * GENERATED FILE — do not edit. Source lives in packages/client/src/; \`npm run build\` bundles it.
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
 * Evaluate packages/client/src/constants.ts and the mascot sheet tables once (pure, DOM-free):
 * the gate attributes the stylesheets are checked against, the two sheet
 * tables, the asset scales and the preference defaults the browser half carries.
 */
const CONSTANTS = (() => {
  const constantsFile = 'packages/client/src/constants.ts'
  const sheetsFile = 'packages/client/src/features/mascot/sheets.ts'
  const constants = loadModule(constantsFile)
  const sheets = loadModule(sheetsFile)
  const pick = (module, file, names) => Object.fromEntries(names.map((name) => {
    if (module[name] === undefined) throw new Error(`build: ${file} exports no ${name}`)
    return [name, module[name]]
  }))
  const { BRAND_ATTR, BRAND_DEEPSEEK, COMPOSER_ATTR, PALETTE_ATTR, PALETTE_CLAUDE, PALETTE_HOST, TYPEFACE_ATTR, TYPEFACE_CLAUDE, TYPEFACE_HOST } = pick(constants, constantsFile, ['BRAND_ATTR', 'BRAND_DEEPSEEK', 'COMPOSER_ATTR', 'PALETTE_ATTR', 'PALETTE_CLAUDE', 'PALETTE_HOST', 'TYPEFACE_ATTR', 'TYPEFACE_CLAUDE', 'TYPEFACE_HOST'])
  return {
    // The gate attributes scripts/css.mjs checks, stamps and writes the token
    // blocks under: who paints the colours and who sets the type (D30), the
    // composer preference (D4) and the DeepSeek brand's own blocks (D50).
    gates: {
      composer: COMPOSER_ATTR,
      palette: { attribute: PALETTE_ATTR, claude: PALETTE_CLAUDE, host: PALETTE_HOST },
      typeface: { attribute: TYPEFACE_ATTR, claude: TYPEFACE_CLAUDE, host: TYPEFACE_HOST },
      brand: { attribute: BRAND_ATTR, deepseek: BRAND_DEEPSEEK },
    },
    ...pick(sheets, sheetsFile, ['CRAB_SHEETS', 'DEEPY_SHEETS', 'DEEPY_SCALE', 'DEEPY_GUTTER']),
    ...pick(constants, constantsFile, ['PREF_DEFAULTS']),
  }
})()

/**
 * The brand marks the stylesheets paint, each as the custom property
 * `--dsh-claude-image-<name>` the token sheet declares (the skin has no asset
 * URLs: the DSH loader exposes none, so a mark is a data URI or a route
 * address, whichever the asset manifest decided).
 */
const BRAND_MARKS = [
  'claude-mark.svg',
  'claude-word.svg',
  'claude-mark-clay.svg',
  // The account row's picture when no avatar is behind it, under the Claude
  // brand: Anthropic's own mark.
  'anthropic-mark.svg',
  // The host's own whale mark (ui-primitives FishLogo, FISH_LOGO_PATH), in
  // DeepSeek's brand blue: a picture where it is painted, a shape where it masks.
  'deepseek-mark.svg',
]

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
      throw new Error(`build: packages/assets/src/${file} is not a scalable SVG (needs <svg viewBox=…>)`)
    }
    if (svg.includes('</') && /<\/script/i.test(svg)) throw new Error(`build: packages/assets/src/${file} carries a script end tag`)
    if (svg.includes('\n')) throw new Error(`build: packages/assets/src/${file} is multi-line; run scripts/fetch-lobe-combines.py`)
    const word = /data-combine-word="([^"]+)"/.exec(svg)
    if (word === null) throw new Error(`build: packages/assets/src/${file} has no data-combine-word`)
    out[id] = { svg, word: word[1] }
  }
  if (Object.keys(out).length === 0) throw new Error('build: packages/assets/src/icons/combine/ holds no lockups; run scripts/fetch-lobe-combines.py')
  return out
}

/**
 * Deepy's sheets as the vectors the browser plays (D38).
 *
 * Each PNG is decoded, held to its animation table's crop box and frame count,
 * and rebuilt as SVG over the sprite's own cell layout. The vector is what the
 * asset plan ships under the sheet's name; the PNG is an input of the build.
 *
 * @returns the vectors to ship, keyed by their path under packages/assets/src/, and the
 *     PNGs they take the place of.
 */
function vectorizeDeepySheets() {
  const dir = path.join(ASSETS, 'mascot', 'deepy')
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

async function main() {
  checkTypes()
  const manifests = manifestReader.readManifests()
  checkManifests(manifests)
  checkContracts(manifests)
  const sheets = styleFiles(manifests)

  // Every image, its content hash and its address (D38). Nothing is written
  // yet: the plan is read by everything below, and a refusal anywhere in this
  // build must leave lib/ as it was.
  const deepy = vectorizeDeepySheets()
  const plan = planAssets({ assetsDir: ASSETS, generated: deepy.generated, replaced: deepy.replaced })
  const claimed = new Set()
  const images = {}
  for (const file of BRAND_MARKS) {
    const entry = plan.entries.get(`brand/${file}`)
    if (entry === undefined) throw new Error(`build: each asset is claimed or fails the build; brand/${file} is missing`)
    claimed.add(`brand/${file}`)
    images[path.basename(file, '.svg')] = entry.url
  }
  const combines = loadCombines(plan, claimed)

  // The crab's sheets ride the bundle: one pair of data URIs per animation.
  const crab = {}
  for (const name of Object.keys(CONSTANTS.CRAB_SHEETS)) {
    const body = plan.entries.get(`mascot/crab/${name}.png`)
    const ink = plan.entries.get(`mascot/crab/${name}-ink.png`)
    if (body === undefined || ink === undefined) throw new Error(`build: CRAB_SHEETS["${name}"] has no sheet pair under packages/assets/src/mascot/crab/`)
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
  const cssText = buildStylesheet({ sheets, srcDir: SRC, tokenDoc, gates: CONSTANTS.gates, images })
  if (writeTokenTable(STYLE_GUIDE, tokenDoc)) console.log('built docs/STYLE.md token table from packages/client/src/theme/tokens.json')

  // The build-time values, for the bundle and for the chunks alike: each
  // carries the ones its own modules read.
  const generated = generatedModule({
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
    // The version this client bundle reports wherever the host asks a client
    // for its build: the account Remote carries it on every call.
    CLIENT_VERSION: PACKAGE.version,
    CRAB_SHEET_URLS: crab,
    DEEPY_SHEET_URLS: deepyUrls,
  })

  /**
   * The bundle's esbuild options around a feature registry and a chunk-module
   * table. The graph passes below take them as they are: the modules a pass
   * reaches do not depend on minifying or on the chunks' addresses.
   */
  const clientOptions = (chunkUrls, shared) => ({
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
    plugins: [featuresModule(manifests, chunkUrls), chunkModulesModule(shared), generated],
  })

  // The deferred features leave the bundle for chunks of their own (D39). A
  // graph pass stands every chunk's address in with its feature id.
  const deferred = manifests.filter((manifest) => manifest.load === 'deferred')
  const standIns = Object.fromEntries(deferred.map((manifest) => [manifest.id, manifest.id]))
  const split = await splitChunks({
    deferred,
    mainModules: async (promoted) => {
      const graph = await esbuild.build({ ...clientOptions(standIns, promoted), minify: false, sourcemap: false })
      return new Set(Object.keys(graph.metafile.inputs).filter((file) => file.startsWith('packages/')))
    },
    options: { external: HOST_PACKAGES, plugins: [generated] },
    slot: BUILD_ID_SLOT,
  })
  const chunkUrls = {}
  const chunkInputs = []
  for (const [id, { result: chunk }] of split.chunks) {
    checkCycles(chunk.metafile)
    checkScrollOwner(chunk.metafile)
    chunkInputs.push(...chunkModules(chunk))
    const files = chunkFiles(chunk)
    chunkUrls[id] = routeText(plan, { file: `chunks/${id}.js`, name: files.name, type: 'text/javascript; charset=utf-8', text: files.code }).url
    routeText(plan, { file: `chunks/${id}.js.map`, name: `${files.name}.map`, type: 'application/json; charset=utf-8', text: files.map })
  }

  const result = await esbuild.build(clientOptions(chunkUrls, split.shared))
  checkCycles(result.metafile)
  checkScrollOwner(result.metafile)
  // The metafile keys paths the way esbuild saw them: repository-relative.
  const prefix = `${path.relative(ROOT, SRC).split(path.sep).join('/')}/`
  const mainInputs = Object.keys(result.metafile.inputs).filter((file) => file.startsWith(prefix))
  // A module the bundle and a chunk both carried would run twice, with its state split in two (D39).
  const twice = mainInputs.filter((file) => chunkInputs.includes(file))
  if (twice.length > 0) throw new Error(`build: the bundle and a feature chunk both carry ${twice.join(', ')}`)
  const bundled = new Set([...mainInputs, ...chunkInputs].filter((file) => file.startsWith(prefix)).map((file) => file.slice(prefix.length)))
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
  const copy = JSON.parse(fs.readFileSync(path.join(DATA, MODEL_COPY), 'utf8'))
  const familyRules = validateModelCopy(copy, combines)
  const copyText = JSON.stringify(copy, null, 2) + '\n'
  const iconSource = path.join(BRAND_ASSETS, ICON_SOURCE)
  const iconTarget = path.join(LIB, ICON_FILE)
  if (!fs.existsSync(iconSource)) throw new Error(`build: packages/assets/src/brand/${ICON_SOURCE} is missing`)

  fs.mkdirSync(LIB, { recursive: true })
  fs.writeFileSync(OUT, bundle)
  fs.writeFileSync(`${OUT}.map`, sourceMap)
  console.log(`built lib/client.js (${Buffer.byteLength(bundle)} bytes, build ${buildId}) from packages/client/src/ (${bundled.size} modules + ${sheets.length} stylesheets + ${Object.keys(combines).length} lockups)`)
  for (const [id, url] of Object.entries(chunkUrls)) {
    console.log(`built the deferred feature "${id}" as ${url} (${Buffer.byteLength(plan.entries.get(`chunks/${id}.js`).text)} bytes)`)
  }

  fs.writeFileSync(path.join(LIB, MODEL_COPY), copyText)
  console.log(`built lib/${MODEL_COPY} (${familyRules} family rules, ${copy.tiers.length} tier rules)`)

  fs.copyFileSync(iconSource, iconTarget)
  console.log(`built lib/${ICON_FILE} (${fs.statSync(iconTarget).size} bytes) from packages/assets/src/brand/${ICON_SOURCE}`)

  const assets = writeAssets(LIB, plan)
  console.log(`built lib/assets/ (${assets.files} routed of ${plan.entries.size} assets, ${assets.bytes} bytes) from packages/assets/src/`)

  const fonts = buildFonts({ assetsDir: ASSETS, libDir: LIB })
  console.log(`built lib/fonts/ (${fonts.files} files, ${fonts.bytes} bytes) from packages/assets/src/fonts/`)

  const host = await buildHostHalf({ outDir: LIB })
  console.log(`built lib/host/ (${host.files} modules) from packages/host/src/`)
}

await main()
