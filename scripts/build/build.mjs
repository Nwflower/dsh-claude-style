#!/usr/bin/env node
/**
 * build.mjs — type-check and bundle the client, generated modules, assets and host
 * half (D36). Assets are written before client.js so hot reload finds their chunks.
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import { brotliCompressSync } from 'node:zlib'
import esbuild from 'esbuild'
import { PNG } from 'pngjs'
import { buildHostHalf } from './build-host.mjs'
import { buildFonts, checkClaimed, checkSheetPixels, checkSheets, layoutCells, planAssets, routeText, vectorizeSheet, writeAssets } from '../../packages/assets/assets.mjs'
import { openBuildCache } from './build-cache.mjs'
import { checkContracts, checkCycles, checkDependencies, checkListed, checkManifests, checkMotionSources, checkScrollOwner, checkTypes } from './build-checks.mjs'
import { chunkFiles, chunkModules, ownModuleIds, splitChunks } from './chunks.mjs'
import { checkPaletteCards, checkPaletteContrast } from './palette-checks.mjs'
import { TOKEN_SHEET, loadTokens, writeTokenTable } from './theme-tokens.mjs'
import { buildStylesheet, writeLayerTable, writeMotionTable } from './css.mjs'
import { FEATURE_SHEET_CONSTANTS } from './feature-sheets.mjs'
import { motionValues } from '../shared/motion-tokens.mjs'
import { readSourceTree } from './source-tree.mjs'
import { MODEL_COPY, validateModelCopy } from './model-copy.mjs'
import { PEAKRATE_CATALOG, validatePeakCatalog } from './peakrate-catalog.mjs'
import { PRICES_FILE, validatePrices } from './prices.mjs'
import { readManifests } from '../shared/read-manifests.mjs'
import { loadModule } from '../shared/ts-module.mjs'
import { cachePath, runsPath } from '../shared/debug-paths.mjs'
import { chunkModulesModule, featuresModule, generatedModule, settingsControlsModule } from './virtual-modules.mjs'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const SRC = path.join(ROOT, 'packages', 'client', 'src')
/** The model copy: data beside the browser half's code, never bundled. */
const DATA = path.join(ROOT, 'packages', 'client', 'data')
/** The peak rate catalog the host half serves: data beside the host half's code, never bundled */
const HOST_DATA = path.join(ROOT, 'packages', 'host', 'data')
/** Brand marks, mascot sheets and vendor lockups; packages/assets/assets.mjs plans their delivery */
const ASSETS = path.join(ROOT, 'packages', 'assets', 'src')
/** The plugin icon the manifest names, copied into lib/ as it is. */
const BRAND_ASSETS = path.join(ASSETS, 'brand')
/** The style guide; its token table is generated from packages/client/src/theme/tokens.json. */
const STYLE_GUIDE = path.join(ROOT, 'docs', 'STYLE.md')
const LIB = path.join(ROOT, 'lib')
const OUT = path.join(LIB, 'client.js')
/** The slow steps' results between runs (scripts/build/build-cache.mjs). */
const CACHE_DIR = cachePath(ROOT, 'build')
/** The code that checks and vectorizes a sheet: part of every vector's cache key. */
const ASSETS_MODULE = path.join(ROOT, 'packages', 'assets', 'assets.mjs')

/** The clay icon remains visible on both canvases where the plain black mark does not. */
const ICON_SOURCE = 'claude-mark-clay.svg'
const ICON_FILE = 'claude-mark.svg'

/** Theme and feature sheets share one rank order because later rules win ties (D72). */
const THEME_SHEETS = [
  // Generated from packages/client/src/theme/tokens.json (scripts/build/css.mjs).
  { file: TOKEN_SHEET, rank: 5 },
  { file: 'theme/tokens.css', rank: 10 },
  { file: 'theme/typography.css', rank: 20 },
  // Shared parts rank before every feature: a feature's own rule wins at equal specificity.
  { file: 'shared/motion.css', rank: 25 },
  { file: 'shared/popover.css', rank: 30 },
  { file: 'shared/swapping-text.css', rank: 35 },
  { file: 'shared/segment-control.css', rank: 38 },
  { file: 'shared/sliding-pill.css', rank: 40 },
  { file: 'shared/masked.css', rank: 45 },
  { file: 'shared/pointer-hint.css', rank: 47 },
  { file: 'theme/chrome.css', rank: 50 },
  { file: 'theme/hero.css', rank: 70 },
  { file: 'theme/sidebar.css', rank: 110 },
  { file: 'theme/third-party.css', rank: 300 },
  { file: 'shared/page-scale.css', rank: 390 },
  // Last: the page on a wallpaper restates what the features paint on the shell
  { file: 'theme/wallpaper.css', rank: 400 },
]

/** Reject duplicate ranks because they would leave cascade order ambiguous. */
function styleFiles(manifests) {
  const sheets = [
    ...THEME_SHEETS,
    // A generated sheet has no file of its own; it is written from constants.ts (scripts/build/feature-sheets.mjs).
    ...manifests.flatMap((manifest) => manifest.stylesheets.map((sheet) => (sheet.generated === undefined ? { ...sheet, file: `features/${manifest.dir}/${sheet.file}` } : sheet))),
  ].sort((a, b) => a.rank - b.rank)
  for (let i = 1; i < sheets.length; i++) {
    if (sheets[i].rank === sheets[i - 1].rank) throw new Error(`build: ${sheets[i - 1].file ?? sheets[i - 1].generated} and ${sheets[i].file ?? sheets[i].generated} share the stylesheet rank ${sheets[i].rank}`)
  }
  return sheets
}

/** The package's own manifest; the loader id, the stylesheet's tag and the profile entry carry its name (D9). */
const PACKAGE = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
const PACKAGE_ID = PACKAGE.name

/** The packages the host's loader hands the factory's `require`; never bundled. */
const HOST_PACKAGES = ['react', 'react-dom/client', '@deepseek-ai/dsh-client-ui-primitives']

/** Retain old assets only for linked live pages; published and CI builds carry exactly their own (D72). */
const RETAIN_ASSETS = process.env.DSH_CLAUDE_STYLE_DEBUG === '1' && process.env.CI === undefined

/** Find linked profiles so the build log explains retained or replaced assets. */
function linkedProfiles() {
  const profiles = path.join(process.env.DSH_HOME ?? path.join(homedir(), '.dsh'), 'profiles')
  if (!fs.existsSync(profiles)) return []
  const self = fs.realpathSync(ROOT)
  const linked = []
  for (const entry of fs.readdirSync(profiles, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const installed = path.join(profiles, entry.name, 'node_modules', PACKAGE_ID)
    if (fs.existsSync(installed) && fs.realpathSync(installed) === self) linked.push(entry.name)
  }
  return linked
}

/** Stands where the build id goes until the bundle's own hash is known. */
const BUILD_ID_SLOT = '%%BUILD_ID%%'

/** The host factory supplies external require and receives apply through module.exports. */
const FACTORY_OPEN = `/**
 * Claude Style — Claude Code Desktop theme for the DeepSeek Harness web GUI.
 * GENERATED FILE — do not edit. Source lives in packages/client/src/; \`npm run build\` bundles it.
 * Contains the Sodium rendering engine, licensed under the PolyForm Shield License 1.0.0
 * rather than MIT; see docs/NOTICE.md and packages/client/src/features/sodium/LICENSE.
 */
window.__ModuleLoader__.load({
  id: ${JSON.stringify(PACKAGE_ID)},
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports`
const FACTORY_CLOSE = `    return module.exports
  },
})`

/** Evaluate DOM-free constants once for gates, sheet geometry and preference defaults. */
const CONSTANTS = (() => {
  const constantsFile = 'packages/client/src/constants.ts'
  const sheetsFile = 'packages/client/src/features/mascot/sheets.ts'
  const constants = loadModule(constantsFile)
  const sheets = loadModule(sheetsFile)
  const pick = (module, file, names) => Object.fromEntries(names.map((name) => {
    if (module[name] === undefined) throw new Error(`build: ${file} exports no ${name}`)
    return [name, module[name]]
  }))
  const { BRAND_ATTR, BRAND_DEEPSEEK, BRAND_DEFAULT_PRESETS, BRANDS, COMPOSER_ATTR, CUSTOM_EDGES_ATTR, PALETTE_ATTR, PALETTE_CARD_ATTR, PALETTE_CLAUDE, PALETTE_EDGES, PALETTE_HOST, PALETTE_PRESETS, TYPEFACE_ATTR, TYPEFACE_CLAUDE, TYPEFACE_HOST, TYPEFACE_SYSTEM } = pick(constants, constantsFile, ['BRAND_ATTR', 'BRAND_DEEPSEEK', 'BRAND_DEFAULT_PRESETS', 'BRANDS', 'COMPOSER_ATTR', 'CUSTOM_EDGES_ATTR', 'PALETTE_ATTR', 'PALETTE_CARD_ATTR', 'PALETTE_CLAUDE', 'PALETTE_EDGES', 'PALETTE_HOST', 'PALETTE_PRESETS', 'TYPEFACE_ATTR', 'TYPEFACE_CLAUDE', 'TYPEFACE_HOST', 'TYPEFACE_SYSTEM'])
  return {
    // The gate attributes css.mjs stamps and writes the token blocks under: who paints
    // the colours and who sets the type (D30), the composer preference and the brand's blocks (D9).
    gates: {
      composer: COMPOSER_ATTR,
      palette: { attribute: PALETTE_ATTR, claude: PALETTE_CLAUDE, host: PALETTE_HOST },
      paletteCard: { attribute: PALETTE_CARD_ATTR },
      customEdges: { attribute: CUSTOM_EDGES_ATTR, values: PALETTE_EDGES },
      typeface: { attribute: TYPEFACE_ATTR, claude: TYPEFACE_CLAUDE, system: TYPEFACE_SYSTEM, host: TYPEFACE_HOST },
      brand: { attribute: BRAND_ATTR, deepseek: BRAND_DEEPSEEK, defaults: BRAND_DEFAULT_PRESETS },
    },
    brands: BRANDS,
    presets: PALETTE_PRESETS,
    brandDefaults: BRAND_DEFAULT_PRESETS,
    ...pick(sheets, sheetsFile, ['CRAB_SHEETS', 'CRAB_GUTTER', 'DEEPY_SHEETS', 'DEEPY_SCALE', 'DEEPY_GUTTER', 'WHALE_GIRL_SHEETS']),
    featureSheets: pick(constants, constantsFile, FEATURE_SHEET_CONSTANTS),
  }
})()

/**
 * The brand marks the stylesheets paint, each as `--dsh-claude-image-<name>`: the loader
 * exposes no asset URLs, so a mark is a data URI or a route address.
 */
const BRAND_MARKS = [
  'claude-mark.svg',
  'claude-word.svg',
  'claude-mark-clay.svg',
  // The account row's picture when no avatar is behind it, under the Claude brand.
  'anthropic-mark.svg',
  // The host's own whale mark (ui-primitives FishLogo), in DeepSeek's brand blue.
  'deepseek-mark.svg',
  // The host's own word beside that whale, from its frontend bundle: the settings lockup draws it.
  'deepseek-word.svg',
  // GitHub's own mark, for the settings page's link to the repository.
  'github-mark.svg',
]

/**
 * The vendored vendor lockups, keyed by brand id: one file per vendor, composed by
 * scripts/data/fetch-lobe-combines.py, each carrying its word in `data-combine-word` (the
 * word is not derivable from the brand id: `moonshot` draws "MoonshotAI"). Markup
 * rather than a data URI, because the picker stamps it in with `innerHTML` so the
 * mono layer inherits the row's `color`.
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
    if (svg.includes('\n')) throw new Error(`build: packages/assets/src/${file} is multi-line; run scripts/data/fetch-lobe-combines.py`)
    const word = /data-combine-word="([^"]+)"/.exec(svg)
    if (word === null) throw new Error(`build: packages/assets/src/${file} has no data-combine-word`)
    out[id] = { svg, word: word[1] }
  }
  if (Object.keys(out).length === 0) throw new Error('build: packages/assets/src/icons/combine/ holds no lockups; run scripts/data/fetch-lobe-combines.py')
  return out
}

/**
 * Deepy's sheets as the vectors the browser plays: each PNG held to its animation table's
 * crop box and rebuilt as SVG over the sprite's own cell layout. A vector is cached under
 * the PNG's bytes, its table entry, the scale, the gutter and packages/assets/assets.mjs,
 * so a hit stands for a sheet that passed checkSheetPixels with these inputs.
 */
function vectorizeDeepySheets(cache) {
  const dir = path.join(ASSETS, 'mascot', 'deepy')
  const sheets = CONSTANTS.DEEPY_SHEETS
  checkSheets('DEEPY_SHEETS', sheets, [52, 52], dir, (name) => [`${name}.png`])
  const code = fs.readFileSync(ASSETS_MODULE)
  const generated = new Map()
  const replaced = new Set()
  for (const [name, sheet] of Object.entries(sheets)) {
    const png = fs.readFileSync(path.join(dir, `${name}.png`))
    const shape = JSON.stringify({ sheet, scale: CONSTANTS.DEEPY_SCALE, gutter: CONSTANTS.DEEPY_GUTTER })
    const svg = cache.get('deepy-vector', [code, png, shape], () => {
      const image = PNG.sync.read(png)
      checkSheetPixels('DEEPY_SHEETS', name, image, sheet, CONSTANTS.DEEPY_SCALE)
      return Buffer.from(vectorizeSheet(image, sheet.box, CONSTANTS.DEEPY_SCALE, CONSTANTS.DEEPY_GUTTER).svg, 'utf8')
    }).toString('utf8')
    generated.set(`mascot/deepy/${name}.svg`, svg)
    replaced.add(`mascot/deepy/${name}.png`)
  }
  return { generated, replaced }
}

/**
 * The crab's sheets laid out with CRAB_GUTTER of transparency around every frame, the
 * colour sheet and the ink mask alike, under their own paths.
 */
function gutterCrabSheets(cache) {
  const dir = path.join(ASSETS, 'mascot', 'crab')
  const code = fs.readFileSync(ASSETS_MODULE)
  const generated = new Map()
  for (const [name, sheet] of Object.entries(CONSTANTS.CRAB_SHEETS)) {
    for (const file of [`${name}.png`, `${name}-ink.png`]) {
      const png = fs.readFileSync(path.join(dir, file))
      const shape = JSON.stringify({ sheet, gutter: CONSTANTS.CRAB_GUTTER })
      generated.set(`mascot/crab/${file}`, cache.get('crab-gutter', [code, png, shape], () => {
        const image = PNG.sync.read(png)
        checkSheetPixels('CRAB_SHEETS', name, image, sheet, 1)
        const laid = layoutCells(image, sheet.box, 1, CONSTANTS.CRAB_GUTTER)
        const out = new PNG({ width: laid.width, height: laid.height })
        laid.data.copy(out.data)
        return PNG.sync.write(out)
      }))
    }
  }
  return generated
}

async function main() {
  checkTypes()
  const manifests = readManifests()
  checkManifests(manifests)
  checkContracts(manifests)
  checkDependencies()
  // The browser half on its syntax tree, once the type check has passed: the attributes
  // it writes, its easing curves and stacking levels, the motion tokens it asks for.
  const sources = readSourceTree(ROOT, [SRC, path.join(ROOT, 'packages', 'engine', 'src')])
  checkMotionSources(sources)
  const sheets = styleFiles(manifests)

  // Nothing is written yet: the plan is read by everything below, and a refusal
  // anywhere in this build must leave lib/ as it was.
  const cache = openBuildCache(CACHE_DIR)
  const deepy = vectorizeDeepySheets(cache)
  const builtSheets = new Map([...deepy.generated, ...gutterCrabSheets(cache)])
  const plan = planAssets({
    assetsDir: ASSETS,
    generated: builtSheets,
    replaced: deepy.replaced,
    // Whalegirl's strips keep the deferred mascot chunk small: her art is fetched
    // from the route when an animation is first wanted, as Deepy's is.
    route: new Set(Object.keys(CONSTANTS.WHALE_GIRL_SHEETS).map((name) => `mascot/whalegirl/${name}.png`)),
  })
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

  // Deepy's sheets are the vectors the build produced, addressed by the route: only the played ones are fetched.
  const deepyUrls = {}
  for (const name of Object.keys(CONSTANTS.DEEPY_SHEETS)) {
    const entry = plan.entries.get(`mascot/deepy/${name}.svg`)
    // vectorizeDeepySheets built every one of them, so absence is a bug here.
    if (entry === undefined) throw new Error(`build: DEEPY_SHEETS["${name}"] has no vector; the sheets and the table disagree`)
    claimed.add(entry.file)
    deepyUrls[name] = entry.url
  }
  // Whalegirl's strips are small PNGs, so each rides the deferred mascot chunk as a data URI.
  const whaleGirlUrls = {}
  for (const name of Object.keys(CONSTANTS.WHALE_GIRL_SHEETS)) {
    const entry = plan.entries.get(`mascot/whalegirl/${name}.png`)
    if (entry === undefined) throw new Error(`build: WHALE_GIRL_SHEETS["${name}"] has no sheet under packages/assets/src/mascot/whalegirl/`)
    claimed.add(entry.file)
    whaleGirlUrls[name] = entry.url
  }
  checkClaimed(plan, claimed)

  const tokenDoc = loadTokens(SRC)
  // The selection stores a preset id, so a card outside the vocabulary would be unpickable
  // and a preset or brand default without its card would have nothing to paint (D96).
  checkPaletteCards(tokenDoc, { presets: CONSTANTS.presets, brands: CONSTANTS.brands, brandDefaults: CONSTANTS.brandDefaults })
  checkPaletteContrast(tokenDoc)
  const css = buildStylesheet({ sheets, srcDir: SRC, sources, tokenDoc, gates: CONSTANTS.gates, images, featureConstants: CONSTANTS.featureSheets })
  // The authored sheet, for the live importance walk: it judges the rules the
  // build's own record is keyed by (D9), which the page's finished sheet no
  // longer spells (D101). Kept out of the package, beside the build output the
  // cloud hands the end-to-end lane.
  fs.mkdirSync(path.join(ROOT, 'lib', 'audit'), { recursive: true })
  fs.writeFileSync(path.join(ROOT, 'lib', 'audit', 'importance-sheet.css'), css.authored)
  if (writeTokenTable(STYLE_GUIDE, tokenDoc)) console.log('built docs/STYLE.md token table from packages/client/src/theme/tokens.json')
  if (writeMotionTable(STYLE_GUIDE, tokenDoc)) console.log('built docs/STYLE.md motion table from packages/client/src/theme/tokens.json')
  if (writeLayerTable(STYLE_GUIDE, tokenDoc)) console.log('built docs/STYLE.md layer table from packages/client/src/theme/tokens.json')

  // The build-time values, for the bundle and for the chunks alike: each carries the ones its own modules read.
  const generated = generatedModule({
    STYLESHEET: css.main,
    // The surface sheets apart: they stay mounted while ds-bot's surface has the page (D74).
    SURFACE_STYLESHEET: css.surface,
    // Vendor lockups: one markup table plus the word each lockup stands in for.
    COMBINE_SVGS: Object.fromEntries(Object.entries(combines).map(([id, item]) => [id, item.svg])),
    COMBINE_WORDS: Object.fromEntries(Object.entries(combines).map(([id, item]) => [id, item.word])),
    // The build id: a hash of the bundle itself, written into it below. The skin puts
    // it on <body data-dsh-claude-style>, so a hot-reloaded page says which lib/client.js it runs.
    BUILD_ID: BUILD_ID_SLOT,
    // The client build version the host's account Remote carries on every call.
    CLIENT_VERSION: PACKAGE.version,
    CRAB_SHEET_URLS: crab,
    DEEPY_SHEET_URLS: deepyUrls,
    WHALE_GIRL_SHEET_URLS: whaleGirlUrls,
    // The motion tokens, by name: the browser half reads the same table the token
    // stylesheet carries, so a duration cannot differ between CSS and a Web Animations call (D9).
    MOTION: motionValues(tokenDoc),
    // The colour cards as the settings page shows them: the data the token sheet resolves.
    PALETTE_CARDS: tokenDoc.palette.cards,
  })

  /**
   * The bundle's esbuild options around a feature registry and a chunk-module table; the
   * graph passes below read them unchanged.
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
    // The factory around the body is part of the output, so the source map counts its lines.
    banner: { js: FACTORY_OPEN },
    footer: { js: FACTORY_CLOSE },
    plugins: [featuresModule(manifests, chunkUrls), chunkModulesModule(shared), settingsControlsModule(manifests), generated],
  })

  // The deferred features leave the bundle for chunks of their own (D72); a graph
  // pass stands every chunk's address in with its feature id.
  const deferred = manifests.filter((manifest) => manifest.load === 'deferred')
  const standIns = Object.fromEntries(deferred.map((manifest) => [manifest.id, manifest.id]))
  const split = await splitChunks({
    deferred,
    mainModules: async (promoted) => {
      const graph = await esbuild.build({ ...clientOptions(standIns, promoted), minify: false, sourcemap: false })
      return new Set(ownModuleIds(graph.metafile))
    },
    options: { external: HOST_PACKAGES, plugins: [settingsControlsModule(manifests), generated] },
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
    routeText(plan, { file: `chunks/${id}.js.map`, name: files.mapName, type: 'application/json; charset=utf-8', text: files.map })
  }

  const result = await esbuild.build(clientOptions(chunkUrls, split.shared))
  checkCycles(result.metafile)
  checkScrollOwner(result.metafile)
  // The metafile keys paths the way esbuild saw them: repository-relative. Both sides are
  // the repository's own modules, generated ones included: a second copy ships its values twice (D72).
  const prefix = `${path.relative(ROOT, SRC).split(path.sep).join('/')}/`
  const mainIds = ownModuleIds(result.metafile)
  const twice = mainIds.filter((id) => chunkInputs.includes(id))
  if (twice.length > 0) throw new Error(`build: the bundle and a feature chunk both carry ${twice.join(', ')}`)
  const bundled = new Set([...mainIds, ...chunkInputs].filter((id) => id.startsWith(prefix)).map((id) => id.slice(prefix.length)))
  checkListed(bundled, sheets)

  const output = (suffix) => result.outputFiles.find((file) => file.path.endsWith(suffix)).text
  const draft = output('client.js')
  const sourceMap = output('client.js.map')
  // The slot and the id have the same length, so the source map's columns hold.
  const buildId = createHash('sha256').update(draft).digest('hex').slice(0, BUILD_ID_SLOT.length)
  if (draft.split(BUILD_ID_SLOT).length !== 2) throw new Error('build: the bundle does not carry the build id slot exactly once')
  const bundle = draft.replace(BUILD_ID_SLOT, buildId)

  // Syntax gate: the bundle must parse before it is written. The failing bundle is
  // kept under .debug/runs/build/ so the line the parser names can be read.
  try {
    new vm.Script(bundle, { filename: 'lib/client.js' })
  } catch (error) {
    fs.mkdirSync(runsPath(ROOT, 'build'), { recursive: true })
    fs.writeFileSync(runsPath(ROOT, 'build', 'failed-bundle.js'), bundle)
    throw new Error(`build: generated bundle failed to parse (written to .debug/runs/build/failed-bundle.js): ${error.message}`)
  }

  // Everything is validated before anything is written: a refusal must not leave lib/
  // holding one half of a new build beside the other half of the previous one.
  const copy = JSON.parse(fs.readFileSync(path.join(DATA, MODEL_COPY), 'utf8'))
  const familyRules = validateModelCopy(copy, combines)
  const copyText = JSON.stringify(copy, null, 2) + '\n'
  // The peak rate catalog is the data source's own document, shipped as the copy a machine
  // with no reach judges by; the host half's parser is the one the build checks it with.
  const catalogPath = path.join(HOST_DATA, PEAKRATE_CATALOG)
  const catalogText = fs.readFileSync(catalogPath, 'utf8')
  const catalogProfiles = validatePeakCatalog(JSON.parse(catalogText), catalogPath)
  // The price snapshot is the repository's validated scrape, shipped as the copy a machine with no reach prices by.
  const pricesPath = path.join(HOST_DATA, PRICES_FILE)
  const pricesText = fs.readFileSync(pricesPath, 'utf8')
  const pricedModels = validatePrices(JSON.parse(pricesText), pricesPath)
  const iconSource = path.join(BRAND_ASSETS, ICON_SOURCE)
  const iconTarget = path.join(LIB, ICON_FILE)
  if (!fs.existsSync(iconSource)) throw new Error(`build: packages/assets/src/brand/${ICON_SOURCE} is missing`)

  fs.mkdirSync(LIB, { recursive: true })

  fs.writeFileSync(path.join(LIB, MODEL_COPY), copyText)
  console.log(`built lib/${MODEL_COPY} (${familyRules} family rules, ${copy.tiers.length} tier rules)`)

  fs.writeFileSync(path.join(LIB, PEAKRATE_CATALOG), catalogText)
  console.log(`built lib/${PEAKRATE_CATALOG} (${catalogProfiles} profiles) from packages/host/data/${PEAKRATE_CATALOG}`)

  fs.writeFileSync(path.join(LIB, PRICES_FILE), pricesText)
  console.log(`built lib/${PRICES_FILE} (${pricedModels} models) from packages/host/data/${PRICES_FILE}`)

  fs.copyFileSync(iconSource, iconTarget)
  console.log(`built lib/${ICON_FILE} (${fs.statSync(iconTarget).size} bytes) from packages/assets/src/brand/${ICON_SOURCE}`)

  // Brotli's output is fixed by its input and the library's version, so both key it.
  const compress = (bytes) => cache.get('brotli', [process.versions.brotli, bytes], () => brotliCompressSync(bytes))
  const assets = writeAssets(LIB, plan, { retain: RETAIN_ASSETS, compress })
  console.log(`built lib/assets/ (${assets.files} routed of ${plan.entries.size} assets, ${assets.bytes} bytes) from packages/assets/src/`)
  if (assets.kept > 0) {
    console.log(`kept ${assets.kept} asset(s) an earlier build shipped (DSH_CLAUDE_STYLE_DEBUG=1): a page running that build still asks for them`)
  }

  const fonts = buildFonts({ assetsDir: ASSETS, libDir: LIB })
  console.log(`built lib/fonts/ (${fonts.files} files, ${fonts.bytes} bytes) from packages/assets/src/fonts/`)

  const host = await buildHostHalf({ outDir: LIB })
  console.log(`built lib/host/ (${host.files} modules) from packages/host/src/`)

  // Last, always: this is the file a running page's client hot reload watches, and the
  // generation it swaps to reads its chunks from this build, so every asset is on disk first (D72).
  fs.writeFileSync(OUT, bundle)
  fs.writeFileSync(`${OUT}.map`, sourceMap)
  console.log(`built lib/client.js (${Buffer.byteLength(bundle)} bytes, build ${buildId}) from packages/client/src/ (${bundled.size} modules + ${sheets.length} stylesheets + ${Object.keys(combines).length} lockups)`)
  for (const [id, url] of Object.entries(chunkUrls)) {
    console.log(`built the deferred feature "${id}" as ${url} (${Buffer.byteLength(plan.entries.get(`chunks/${id}.js`).text)} bytes)`)
  }
  const pruned = cache.prune()
  const { hits, misses } = cache.counts()
  console.log(`build cache .debug/cache/build/: ${hits} reused, ${misses} computed${pruned > 0 ? `, ${pruned} unused for a day removed` : ''}`)
  if (!RETAIN_ASSETS) {
    const linked = linkedProfiles()
    if (linked.length > 0) {
      console.log(`linked into ${linked.join(', ')}: a rebuild replaces lib/assets, and a page still running the previous bundle asks for chunks this build replaced — build with DSH_CLAUDE_STYLE_DEBUG=1 to keep them`)
    }
  }
}

// A build never waits on the test lock (D92): a run a build swaps the page under says so itself.
await main()
