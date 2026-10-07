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
 *   src/theme/*.css and the feature stylesheets   concatenated in STYLE_FILES order
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

const STYLE_FILES = [
  { file: 'theme/tokens.css' },
  { file: 'theme/typography.css' },
  // Shared parts before every feature: a feature's own rule comes later and
  // wins where the two meet at the same specificity.
  { file: 'shared/popover.css' },
  { file: 'shared/sliding-pill.css' },
  { file: 'theme/chrome.css' },
  { file: 'features/view-tabs/view-tabs.css' },
  { file: 'theme/hero.css' },
  { file: 'features/composer/card.css', gate: true },
  { file: 'features/composer/inline.css', gate: true },
  { file: 'features/composer/inline-bar.css', gate: true },
  { file: 'theme/sidebar.css' },
  { file: 'features/workspace/workspace.css' },
  { file: 'features/search/search.css' },
  { file: 'features/turn-status/turn-status.css' },
  { file: 'features/turn-nav/turn-nav.css' },
  { file: 'features/chat-follow/chat-follow.css' },
  { file: 'features/chat-fold/fold.css' },
  { file: 'features/chat-reveal/reveal-rules.css' },
  { file: 'features/chat-files/chat-files.css' },
  { file: 'features/chat-send/send-flight.css' },
  { file: 'features/chat-fold/fold-motion.css' },
  { file: 'features/caret/caret.css' },
  { file: 'features/permissions/permissions.css' },
  { file: 'features/account/account-footer.css' },
  { file: 'features/ban-screen/ban-screen.css' },
  { file: 'features/model/model-picker.css' },
  { file: 'features/effort/effort-picker.css' },
  { file: 'features/hero-menu/hero-menu.css', gate: true },
  { file: 'features/account/footer-takeover.css' },
  { file: 'theme/third-party.css' },
  { file: 'features/settings/settings.css' },
  { file: 'features/home/home-panel.css' },
  { file: 'features/home/home-overview.css' },
  { file: 'features/home/home-models.css' },
  { file: 'features/mascot/crab.css' },
  { file: 'features/mascot/whale.css' },
  { file: 'features/theme-flip/theme-flip.css' },
]

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
      // host token carries the Claude gate (checkTokenGates), and the host
      // blocks alias the skin's private tokens to the host's.
      PALETTE_CLAUDE: '[' + PALETTE_ATTR + '="' + PALETTE_CLAUDE + '"]',
      PALETTE_HOST: '[' + PALETTE_ATTR + '="' + PALETTE_HOST + '"]',
      TYPEFACE_CLAUDE: '[' + TYPEFACE_ATTR + '="' + TYPEFACE_CLAUDE + '"]',
      TYPEFACE_HOST: '[' + TYPEFACE_ATTR + '="' + TYPEFACE_HOST + '"]',
      CLAUDE_WORD_WIDTH: (18 * constants.CLAUDE_WORD_ASPECT).toFixed(1),
    },
    ...pick(['CRAB_SHEETS', 'DEEPY_SHEETS', 'PREF_DEFAULTS']),
  }
})()

/** Marker delimiting the region of a stylesheet the composer preference gates. */
const COMPOSER_GATE_MARKER = '/* @composer-gate */'
/** The selector root every skin rule hangs off; the gate is stamped onto it. */
const SELECTOR_ROOT = 'body[data-dsh-claude-style]'

/**
 * Stamp the composer gate onto every rule below the `@composer-gate` marker.
 *
 * The "Composer restyle" preference decides which surfaces the skin may
 * repaint, and both surfaces are mutually exclusive per view — the new
 * conversation page renders the hero composer, a session renders the inline
 * one — so the decision is page-level and one attribute on `<body>` carries it.
 * That keeps this a per-rule stamp rather than a selector rewrite: every rule
 * below the marker is turned on and off together, and the skin decides whether
 * the page on screen is a surface the preference covers.
 *
 * Lines inside comments are skipped, and a rule that carries the root but no
 * gate after the pass is a hard error — a silently ungated rule would ignore
 * the preference.
 *
 * @param file - stylesheet name, for diagnostics.
 * @param text - stylesheet source (LF-normalised).
 * @returns the gated source.
 */
function gateComposerScope(file, text) {
  const markerAt = text.indexOf(COMPOSER_GATE_MARKER)
  if (markerAt === -1) throw new Error(`build: src/${file} is missing the ${COMPOSER_GATE_MARKER} marker`)
  const gate = `[%%COMPOSER_ATTR%%]`
  const head = text.slice(0, markerAt + COMPOSER_GATE_MARKER.length)
  const body = text.slice(markerAt + COMPOSER_GATE_MARKER.length)

  let inComment = false
  let stamped = 0
  const out = body.split('\n').map((line) => {
    if (inComment) {
      if (line.includes('*/')) inComment = false
      return line
    }
    const commentAt = line.indexOf('/*')
    if (commentAt !== -1 && !line.includes('*/', commentAt)) {
      inComment = true
      return line
    }
    // A selector line starts a block (`{`) or continues a selector list (`,`).
    if (!/[,{]\s*$/.test(line) || !line.includes(SELECTOR_ROOT)) return line
    stamped += 1
    return line.split(SELECTOR_ROOT).join(SELECTOR_ROOT + gate)
  })

  const gated = out.join('\n')
  if (stamped === 0) throw new Error(`build: src/${file} has no rules below ${COMPOSER_GATE_MARKER}`)
  const missed = gated
    .split('\n')
    .filter((line) => /[,{]\s*$/.test(line) && line.includes(SELECTOR_ROOT) && !line.includes(gate))
  if (missed.length > 0) {
    throw new Error(`build: src/${file} left ${missed.length} rule(s) ungated: ${missed[0].trim().slice(0, 80)}`)
  }
  return head + gated
}

/** A stylesheet with its comments blanked in place, so offsets still give the right line. */
function blankComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '))
}

/** A selector list's members: split at the commas outside any `(` / `[`. */
function splitSelectorList(list) {
  const parts = []
  let depth = 0
  let from = 0
  for (let i = 0; i < list.length; i++) {
    const ch = list[i]
    if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth--
    else if (ch === ',' && depth === 0) {
      parts.push(list.slice(from, i).trim())
      from = i + 1
    }
  }
  parts.push(list.slice(from).trim())
  return parts
}

/**
 * Hold every write of a host token to its gate, and every private token the
 * Claude choice defines to an alias under the host choice.
 *
 * A `--dsw-font-*` declaration must sit in a rule whose every selector carries
 * %%TYPEFACE_CLAUDE%%; any other `--dsw-*` declaration in one that carries
 * %%PALETTE_CLAUDE%%. Under "follow the host" those rules drop out and the
 * host's tokens (or another theme plugin's) stand. The private tokens those
 * rules define are recorded in `names`, together with the ones the
 * %%PALETTE_HOST%% / %%TYPEFACE_HOST%% rules alias, for checkTokenAliases.
 */
function checkTokenGates(file, text, names) {
  const source = blankComments(text)
  const declaration = /(?<![\w(-])(--[A-Za-z0-9-]+)\s*:/g
  for (const match of source.matchAll(declaration)) {
    const name = match[1]
    const open = source.lastIndexOf('{', match.index)
    if (open === -1) continue
    const start = Math.max(source.lastIndexOf('}', open), source.lastIndexOf('{', open - 1)) + 1
    const selectors = splitSelectorList(source.slice(start, open))
    const every = (token) => selectors.every((selector) => selector.includes(token))
    const line = source.slice(0, match.index).split('\n').length
    if (name.startsWith('--dsw-font-')) {
      if (!every('%%TYPEFACE_CLAUDE%%')) throw new Error(`build: src/${file}:${line} writes ${name} outside the %%TYPEFACE_CLAUDE%% gate`)
    } else if (name.startsWith('--dsw-')) {
      if (!every('%%PALETTE_CLAUDE%%')) throw new Error(`build: src/${file}:${line} writes ${name} outside the %%PALETTE_CLAUDE%% gate`)
    }
    if (!name.startsWith('--dsh-claude-')) continue
    const typeface = name.startsWith('--dsh-claude-font-')
    if (every(typeface ? '%%TYPEFACE_CLAUDE%%' : '%%PALETTE_CLAUDE%%')) names.claude.add(name)
    if (every(typeface ? '%%TYPEFACE_HOST%%' : '%%PALETTE_HOST%%')) names.host.add(name)
  }
}

/** Every private token the Claude choice defines needs its alias under the host choice. */
function checkTokenAliases(names) {
  for (const name of names.claude) {
    if (!names.host.has(name)) throw new Error(`build: ${name} is defined under the Claude palette or typeface but has no alias under the host's`)
  }
}

/**
 * Refuse a `:has()` that is not in its selector's last compound.
 *
 * `A:has(B) C` (and `body:not(:has(B)) C`) makes the browser re-match every
 * descendant of every A on each DOM change anywhere below it: measured at
 * 7–13ms of style recalculation per changed frame for a single such rule on a
 * conversation page, where the whole stylesheet without them costs 1.6ms. In
 * the last compound (`A:has(B)`, `A :has(B)`) it costs a fraction of a
 * millisecond. What such a rule needs is a mark the skin's pass writes — the
 * view tabs, the draft state — or a selector that reads the state going down.
 *
 * @param file - stylesheet name, for diagnostics.
 * @param text - stylesheet source (LF-normalised).
 */
function checkHasPlacement(file, text) {
  const source = blankComments(text)
  let from = 0
  for (;;) {
    const at = source.indexOf(':has(', from)
    if (at === -1) return
    from = at + 5
    // Past the :has() argument.
    let i = at + 4
    let depth = 0
    for (; i < source.length; i++) {
      if (source[i] === '(') depth++
      else if (source[i] === ')' && --depth === 0) { i++; break }
    }
    // Past the rest of its compound; a `)` with nothing open closes an
    // enclosing :not( / :is( and belongs to the same compound.
    let nest = 0
    for (; i < source.length; i++) {
      const ch = source[i]
      if (ch === '(' || ch === '[') nest++
      else if (ch === ')' || ch === ']') { if (nest > 0) nest-- }
      else if (nest === 0 && /[\s,{>~+]/.test(ch)) break
    }
    while (i < source.length && /\s/.test(source[i])) i++
    if (source[i] === '{' || source[i] === ',') continue
    const line = source.slice(0, at).split('\n').length
    throw new Error(`build: src/${file}:${line} has a :has() followed by a combinator; mark the element from the skin's pass instead`)
  }
}

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

/** Substitute %%TOKEN%% placeholders in one stylesheet; throws on leftovers. */
function substitute(file, text, tokens) {
  const out = text.replace(/%%([A-Z_]+)%%/g, (match, name) => {
    if (!(name in tokens)) throw new Error(`build: unknown token %%${name}%% in src/${file}`)
    return tokens[name]
  })
  if (out.includes('%%')) throw new Error(`build: unsubstituted token remains in src/${file}`)
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
 * Refuse a source file that does not ship: a stylesheet STYLE_FILES leaves out,
 * or a module nothing imports, would otherwise sit in src/ with nothing to say
 * it never reaches the page.
 *
 * @param bundled - the src/-relative modules in the bundle (esbuild's metafile).
 */
function checkListed(bundled) {
  const listed = new Set(STYLE_FILES.map((fileDef) => fileDef.file))
  const walk = (dir) => fs.readdirSync(path.join(SRC, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = dir === '' ? entry.name : `${dir}/${entry.name}`
    if (entry.isDirectory()) return rel === 'assets' ? [] : walk(rel)
    return [rel]
  })
  for (const file of walk('')) {
    if (file.endsWith('.css') && !listed.has(file)) throw new Error(`build: src/${file} is in no list; add it to STYLE_FILES`)
    if (file.endsWith('.ts') && !file.endsWith('.d.ts') && !bundled.has(file)) throw new Error(`build: src/${file} is imported by no module the bundle reaches`)
  }
}

/**
 * Which module installs each feature of src/entry.ts's FEATURES table.
 *
 * That table is runtime data inside a module the browser half evaluates, so
 * the build cannot read it by importing it; this table is the build's own copy
 * of the id → main module pairing, and checkFeatureRegistry holds the three
 * sources together. Without it, renaming a feature directory or its install id
 * would surface only at runtime, as a skin that silently never installs that
 * piece.
 */
const FEATURE_MAINS = {
  selection: 'features/selection/selection.ts',
  composer: 'features/composer/composer.ts',
  homeLayout: 'features/home/home-layout.ts',
  mascot: 'features/mascot/mascot.ts',
  copy: 'features/copy/copy.ts',
  permissions: 'features/permissions/permissions.ts',
  contextStats: 'features/context-stats/context-stats.ts',
  model: 'features/model/model-picker.ts',
  effort: 'features/effort/effort-picker.ts',
  heroMenu: 'features/hero-menu/hero-menu.ts',
  quickProviders: 'features/settings/quick-providers.ts',
  footer: 'features/account/account-footer.ts',
  ban: 'features/ban-screen/ban-screen.ts',
  themeFlip: 'features/theme-flip/theme-flip.ts',
  workspace: 'features/workspace/workspace-view.ts',
  search: 'features/search/search.ts',
  turnStatus: 'features/turn-status/turn-status.ts',
  turnNav: 'features/turn-nav/turn-nav.ts',
  chatFollow: 'features/chat-follow/chat-follow.ts',
  chatFold: 'features/chat-fold/chat-fold.ts',
  chatReveal: 'features/chat-reveal/chat-reveal.ts',
  chatFiles: 'features/chat-files/chat-files.ts',
  chatSend: 'features/chat-send/send-flight.ts',
  caret: 'features/caret/caret.ts',
  viewTabs: 'features/view-tabs/view-tabs.ts',
  settings: 'features/settings/settings.ts',
}

/** Installs in entry.ts's table that are not features with a source directory. */
const NON_FEATURE_INSTALLS = ['scheduler']

/**
 * Every FEATURES entry answers whether the reader can switch it off: exactly
 * one of `pref: '<preference key>'` or `ungated: '<reason>'`. The preference
 * keys are host/settings.js's PREFS_DEFAULT. An entry with neither, with both,
 * or naming a key the table lacks fails the build, so a new feature cannot
 * ship without deciding.
 */
function checkFeatureSwitches(entry) {
  const block = entry.match(/const FEATURES: Feature\[\] = \[([\s\S]*?)\n\s*\]\n/)
  if (block === null) throw new Error('build: src/entry.ts has no FEATURES table')
  for (const line of block[1].split('\n')) {
    const name = line.match(/\bname: '([A-Za-z][A-Za-z0-9]*)'/)
    if (name === null) continue
    const pref = line.match(/\bpref: '([A-Za-z][A-Za-z0-9]*)'/)
    const ungated = /\bungated: '[^']+'/.test(line)
    if ((pref === null) === !ungated) throw new Error(`build: FEATURES entry "${name[1]}" must declare exactly one of pref or ungated`)
    if (pref !== null && !(pref[1] in PREFS_DEFAULT)) throw new Error(`build: FEATURES entry "${name[1]}" names pref "${pref[1]}", which host/settings.js PREFS_DEFAULT does not carry`)
  }
}

/**
 * Hold src/entry.ts's FEATURES table and the src/features/ directories to the
 * pairing above: an install this table does not name, a table entry naming a
 * module the bundle does not reach, and a feature directory no id covers all
 * fail the build.
 *
 * @param bundled - the src/-relative modules in the bundle (esbuild's metafile).
 */
function checkFeatureRegistry(bundled) {
  for (const [id, file] of Object.entries(FEATURE_MAINS)) {
    if (!bundled.has(file)) throw new Error(`build: feature "${id}" names ${file}, which the bundle does not reach`)
  }
  const entry = fs.readFileSync(path.join(SRC, 'entry.ts'), 'utf8')
  const declared = new Set([...entry.matchAll(/\bname: '([A-Za-z][A-Za-z0-9]*)'/g)].map((match) => match[1]))
  for (const id of NON_FEATURE_INSTALLS) declared.delete(id)
  for (const id of declared) {
    if (!(id in FEATURE_MAINS)) throw new Error(`build: src/entry.ts installs feature "${id}", which FEATURE_MAINS does not name`)
  }
  for (const id of Object.keys(FEATURE_MAINS)) {
    if (!declared.has(id)) throw new Error(`build: FEATURE_MAINS names "${id}", which src/entry.ts does not install`)
  }
  checkFeatureSwitches(entry)
  const covered = new Set(Object.values(FEATURE_MAINS).map((file) => file.split('/')[1]))
  const dirs = fs.readdirSync(path.join(SRC, 'features'), { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => item.name)
  for (const dir of dirs) {
    if (!covered.has(dir)) throw new Error(`build: src/features/${dir} has no install in src/entry.ts`)
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
  const tokens = { ...CONSTANTS.tokens, ...loadSvgAssets() }
  const combines = loadCombines()

  const tokenNames = { claude: new Set(), host: new Set() }
  const cssText = STYLE_FILES
    .map((fileDef) => {
      const file = fileDef.file
      const gated = fileDef.gate === true
      let text = fs.readFileSync(path.join(SRC, file), 'utf8').replace(/\r\n/g, '\n')
      checkHasPlacement(file, text)
      checkTokenGates(file, text, tokenNames)
      if (gated) text = gateComposerScope(file, text)
      return substitute(file, text, tokens).replace(/\n+$/, '')
    })
    .join('\n\n')
  checkTokenAliases(tokenNames)

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
    plugins: [generatedModule({
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
  const bundled = new Set(Object.keys(result.metafile.inputs).filter((file) => file.startsWith('src/')).map((file) => file.slice('src/'.length)))
  checkListed(bundled)
  checkFeatureRegistry(bundled)

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
  console.log(`built lib/client.js (${Buffer.byteLength(bundle)} bytes, build ${buildId}) from src/ (${bundled.size} modules + ${STYLE_FILES.length} stylesheets + ${Object.keys(combines).length} lockups)`)

  fs.writeFileSync(path.join(LIB, MODEL_COPY), copyText)
  console.log(`built lib/${MODEL_COPY} (${exact} exact entries, ${copy.families.length} family rules, ${copy.tiers.length} tier rules)`)

  fs.copyFileSync(iconSource, iconTarget)
  console.log(`built lib/${ICON_FILE} (${fs.statSync(iconTarget).size} bytes) from src/assets/brand/${ICON_SOURCE}`)

  writeDeepySheets(deepy.names)
  console.log(`built lib/deepy/ (${deepy.names.length} sheets, ${deepy.bytes} bytes) from src/assets/mascot/deepy/`)
}

await main()
