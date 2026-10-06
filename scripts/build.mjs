#!/usr/bin/env node
/**
 * build.mjs — assemble `lib/client.js` from the `src/` fragments and stylesheets.
 *
 * The shipped client bundle is a single self-contained file (the DSH module
 * loader has no relative requires and no asset URLs for plugin clients), so the
 * source is split for maintenance and inlined back at build time:
 *
 *   src/constants.js             constants & tokens (evaluated to substitute
 *                                %%TOKEN%% placeholders); brand SVGs live in src/assets/
 *   src/assets/icons/combine/*.svg     vendor lockups (mark + wordmark in one),
 *                                inlined as JS markup tables
 *   src/assets/mascot/deepy/*.png      Deepy's animation sheets, copied to
 *                                lib/deepy/ for the host half to serve
 *   src/assets/mascot/crab/*.png       the composer crab's animation sheets
 *                                (scripts/draw-crab.py), inlined as data URIs
 *   src/core/                   host accessors, prefs, model copy, i18n, scheduler
 *   src/shared/                  parts more than one feature uses (JS + CSS)
 *   src/theme/*.css              the global look no single feature owns
 *   src/features/<name>/         one feature: its installer, its split
 *                                factories and its stylesheets, side by side
 *   src/entry.js                 apply(): the FEATURES table + exports
 *
 * FRAGMENTS and STYLE_FILES below are the assembly order and the only list of
 * what ships.
 *
 * `src/model-descriptions.json` is not a fragment: it is validated here and
 * copied to `lib/`, where the host half serves it to the browser half at
 * runtime. Model copy is data, so it must not enter the bundle.
 *
 * Fragments are concatenated verbatim (they share one factory scope at
 * runtime), so each fragment must keep its 4-space base indentation and must
 * NOT use import/export.
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import vm from 'node:vm'

const ROOT = path.resolve(import.meta.dirname, '..')
/**
 * The host half's preference table (host/settings.js): the browser half's
 * PREF_DEFAULTS and src/entry.js's feature switches are both held to it.
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

const FRAGMENTS = [
  'constants.js',
  'core/host.js',
  'core/desktop-band.js',
  'core/prefs.js',
  'core/model-copy.js',
  'core/i18n.js',
  'core/stylesheet.js',
  'shared/dom.js',
  'shared/notify.js',
  'shared/resource.js',
  'shared/format.js',
  'shared/popover.js',
  'shared/sliding-pill.js',
  'shared/chat-dom.js',
  'shared/scroll-ease.js',
  'shared/peer-plugin.js',
  'features/selection/selection.js',
  'features/composer/composer.js',
  'features/copy/copy.js',
  'features/permissions/permissions.js',
  'features/context-stats/session-stats.js',
  'features/context-stats/context-stats.js',
  'features/model/brand.js',
  'features/model/copy-lookup.js',
  'features/model/catalog.js',
  'features/model/rows.js',
  'features/model/model-picker.js',
  'features/effort/matrix.js',
  'features/effort/control.js',
  'features/effort/effort-picker.js',
  'features/hero-menu/hero-menu.js',
  'features/settings/quick-providers.js',
  'features/account/profile.js',
  'features/account/host-menu.js',
  'features/account/rows.js',
  'features/account/footer-mirror.js',
  'features/account/surface.js',
  'features/account/account-footer.js',
  'features/ban-screen/ban-screen.js',
  'features/theme-flip/theme-flip.js',
  'features/workspace/workspace-view.js',
  'features/search/sources.js',
  'features/search/search.js',
  'features/turn-status/turn-status.js',
  'features/turn-nav/turn-nav-host.js',
  'features/turn-nav/turn-nav.js',
  'features/chat-follow/reader-intent.js',
  'features/chat-follow/chat-tail.js',
  'features/chat-follow/process-follow.js',
  'features/chat-follow/chat-follow.js',
  'features/chat-fold/fold-toggle.js',
  'features/chat-fold/reasoning-fold.js',
  'features/chat-fold/process-fold.js',
  'features/chat-fold/chat-fold.js',
  'features/chat-fold/fold-glide-parts.js',
  'features/chat-fold/fold-glide.js',
  'features/chat-reveal/reveal-engine.js',
  'features/chat-reveal/chat-reveal.js',
  'features/chat-files/file-row-model.js',
  'features/chat-files/chat-files.js',
  'features/chat-send/send-snapshot.js',
  'features/chat-send/send-shape.js',
  'features/chat-send/send-morph.js',
  'features/chat-send/send-flight.js',
  'features/caret/caret-measure.js',
  'features/caret/caret.js',
  'features/view-tabs/view-tabs.js',
  'features/home/data.js',
  'features/home/overview.js',
  'features/home/models.js',
  'features/home/home-layout.js',
  'features/mascot/mascot-signals.js',
  'features/mascot/mascot-player.js',
  'features/mascot/whale-sheets.js',
  'features/mascot/whale.js',
  'features/mascot/crab.js',
  'features/mascot/mascot.js',
  'core/scheduler.js',
  'features/settings/settings-controls.js',
  'features/settings/settings-tab-general.js',
  'features/settings/settings-tab-appearance.js',
  'features/settings/settings-tab-composer.js',
  'features/settings/settings-tab-sidebar.js',
  'features/settings/settings-tab-conversation.js',
  'features/settings/settings.js',
  'entry.js',
]

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

const HEADER = (() => {
  const jsFragments = FRAGMENTS.map((name) => ` *   - src/${name}`).join('\n')
  const styleSheets = STYLE_FILES.map((fileDef) => ` *   - src/${fileDef.file}`).join('\n')
  return `/**
 * Claude Style — Claude Code Desktop theme for the DeepSeek Harness web GUI.
 *
 * GENERATED FILE — do not edit. Source lives in src/ as feature fragments;
 * \`node scripts/build.mjs\` assembles this bundle.
 *
 * JS fragments (in assembly order):
 *   - src/assets/brand/*.svg   Brand marks (inlined as CSS url() data URIs at build time)
 * ${jsFragments}
 *
 * Stylesheets (in assembly order):
 * ${styleSheets}
 */
window.__ModuleLoader__.load({
  id: 'dsh-claude-style',
  factory: (require) => {
    'use strict'
    var module = { exports: {} }
    var exports = module.exports

    // React is resolved through the module loader's graph, so the settings
    // section can be a real component without a host half.
    var React = require('react')
`
})()

const FOOTER = `  },
})
`

/**
 * Evaluate src/constants.js once (pure, DOM-free): `tokens` are the %%TOKEN%%
 * values, beside them the two sheet tables and the preference defaults the
 * build checks. The file is written for both halves — the bundle inlines it
 * and host/routes.js reads it as text — so nothing imports it directly.
 */
const CONSTANTS = new Function(`
  ${fs.readFileSync(path.join(SRC, 'constants.js'), 'utf8')}
  return {
    tokens: {
      SANS, SERIF, PROSE, MONO, BRAND_ATTR, BRAND_CLAUDE, BRAND_DEEPSEEK, MOTION_ATTR, MOTION_REDUCED, FOOTER_ATTR, COMPOSER_ATTR, PERMISSIONS_ATTR, SESSION_STATS_ATTR, CHAT_FOLLOW_ATTR, STREAM_GLIDE_ATTR, CHAT_FOLD_ATTR, CHAT_ROLLING_ATTR, CHAT_REVEAL_ATTR, CHAT_FLYING_ATTR, CARET_ATTR, CARET_LAYER_ATTR, CARET_VISIBLE_ATTR, CARET_HOST_ATTR, ACCOUNT_MENU_ATTR, ACCOUNT_ARMED_ATTR, ACCOUNT_READY_ATTR, HERO_MENU_ATTR, SETTINGS_SCROLLER_ATTR,
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
      CLAUDE_WORD_WIDTH: (18 * CLAUDE_WORD_ASPECT).toFixed(1),
    },
    CRAB_SHEETS,
    DEEPY_SHEETS,
    PREF_DEFAULTS,
  }
`)()

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
 * Hold one mascot's sheet directory to its animation table in src/constants.js.
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
 * they all throw: a `families[].key` or `aliases` target that names no entry,
 * a rule whose `match` is not a compilable regexp, a `{zh, en}` pair missing a
 * language, or a document with no `exact` table at all.
 *
 * Brand bindings are checked too: every id named by `brands.providers` and
 * `brands.models[].brand` must be a vendored lockup under src/assets/icons/combine/,
 * and every model rule must compile — a typo there would otherwise render as a
 * silently missing mark on one row.
 *
 * @param doc - parsed `src/model-descriptions.json`.
 * @param lobeBrands - the vendored lockups keyed by brand id (loadCombines).
 * @returns the number of exact entries, for the build log.
 */
function validateModelCopy(doc, lobeBrands) {
  const fail = (message) => {
    throw new Error(`build: ${MODEL_COPY} ${message}`)
  }
  if (typeof doc !== 'object' || doc === null) fail('is not an object')
  if (typeof doc.fallback !== 'string' || doc.fallback === '') fail('needs a non-empty "fallback" locale id')
  if (typeof doc.exact !== 'object' || doc.exact === null) fail('needs an "exact" table')

  const requireBrand = (where, brand) => {
    if (typeof brand !== 'string' || brand === '') fail(`${where} is not a brand id string`)
    if (!(brand in lobeBrands)) fail(`${where} names brand "${brand}", which has no vendored lockup in src/assets/icons/combine/`)
  }

  const locales = new Set([doc.fallback])
  const requirePair = (where, pair) => {
    if (typeof pair !== 'object' || pair === null) fail(`${where} is not a {locale: string} object`)
    for (const [locale, text] of Object.entries(pair)) {
      locales.add(locale)
      if (typeof text !== 'string' || text.trim() === '') fail(`${where}.${locale} is not a non-empty string`)
    }
  }

  for (const [id, pair] of Object.entries(doc.exact)) requirePair(`exact["${id}"]`, pair)
  for (const group of ['ui', 'settings', 'ban']) {
    for (const [key, pair] of Object.entries(doc[group] ?? {})) requirePair(`${group}["${key}"]`, pair)
  }
  for (const [from, to] of Object.entries(doc.aliases ?? {})) {
    if (typeof to !== 'string' || !(to in doc.exact)) fail(`alias "${from}" points at unknown entry "${to}"`)
  }
  for (const list of ['families', 'tiers']) {
    for (const [index, rule] of (doc[list] ?? []).entries()) {
      const where = `${list}[${index}]`
      if (typeof rule?.match !== 'string') fail(`${where} needs a string "match"`)
      try {
        new RegExp(rule.match)
      } catch (error) {
        fail(`${where} has an uncompilable "match": ${error.message}`)
      }
      if (rule.key !== undefined && !(rule.key in doc.exact)) fail(`${where} points at unknown entry "${rule.key}"`)
      if (rule.key === undefined) requirePair(`${where}.text`, rule.text)
    }
  }

  const brandMap = doc.brands
  if (typeof brandMap !== 'object' || brandMap === null) fail('needs a "brands" section')
  for (const [provider, brand] of Object.entries(brandMap.providers ?? {})) {
    requireBrand(`brands.providers["${provider}"]`, brand)
  }
  if (!Array.isArray(brandMap.models)) fail('needs a "brands.models" rule list')
  for (const [index, rule] of brandMap.models.entries()) {
    const where = `brands.models[${index}]`
    if (typeof rule?.match !== 'string') fail(`${where} needs a string "match"`)
    try {
      new RegExp(rule.match)
    } catch (error) {
      fail(`${where} has an uncompilable "match": ${error.message}`)
    }
    requireBrand(`${where}.brand`, rule.brand)
  }

  if (locales.size < 2) fail('carries fewer than two locales; i18n needs at least the fallback and one translation')
  return Object.keys(doc.exact).length
}

/**
 * Refuse a source file that no list names: a fragment or stylesheet added
 * under src/ but left out of FRAGMENTS / STYLE_FILES would otherwise simply
 * not ship, with nothing to say so.
 */
function checkListed() {
  const listed = new Set([...FRAGMENTS, ...STYLE_FILES.map((fileDef) => fileDef.file)])
  const walk = (dir) => fs.readdirSync(path.join(SRC, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = dir === '' ? entry.name : `${dir}/${entry.name}`
    if (entry.isDirectory()) return rel === 'assets' ? [] : walk(rel)
    return /\.(js|css)$/.test(entry.name) ? [rel] : []
  })
  const unlisted = walk('').filter((file) => !listed.has(file))
  if (unlisted.length > 0) throw new Error(`build: src/${unlisted[0]} is in no list; add it to FRAGMENTS or STYLE_FILES`)
}

/**
 * Which fragment installs each feature of src/entry.js's FEATURES table.
 *
 * That table is runtime data inside a fragment the browser half evaluates, so
 * the build cannot read it by importing it; this table is the build's own copy
 * of the id → main fragment pairing, and checkFeatureRegistry holds the three
 * sources together. Without it, renaming a feature directory or its install id
 * would surface only at runtime, as a skin that silently never installs that
 * piece.
 */
const FEATURE_MAINS = {
  selection: 'features/selection/selection.js',
  composer: 'features/composer/composer.js',
  homeLayout: 'features/home/home-layout.js',
  mascot: 'features/mascot/mascot.js',
  copy: 'features/copy/copy.js',
  permissions: 'features/permissions/permissions.js',
  contextStats: 'features/context-stats/context-stats.js',
  model: 'features/model/model-picker.js',
  effort: 'features/effort/effort-picker.js',
  heroMenu: 'features/hero-menu/hero-menu.js',
  quickProviders: 'features/settings/quick-providers.js',
  footer: 'features/account/account-footer.js',
  ban: 'features/ban-screen/ban-screen.js',
  themeFlip: 'features/theme-flip/theme-flip.js',
  workspace: 'features/workspace/workspace-view.js',
  search: 'features/search/search.js',
  turnStatus: 'features/turn-status/turn-status.js',
  turnNav: 'features/turn-nav/turn-nav.js',
  chatFollow: 'features/chat-follow/chat-follow.js',
  chatFold: 'features/chat-fold/chat-fold.js',
  chatReveal: 'features/chat-reveal/chat-reveal.js',
  chatFiles: 'features/chat-files/chat-files.js',
  chatSend: 'features/chat-send/send-flight.js',
  caret: 'features/caret/caret.js',
  viewTabs: 'features/view-tabs/view-tabs.js',
  settings: 'features/settings/settings.js',
}

/** Installs in entry.js's table that are not features with a source directory. */
const NON_FEATURE_INSTALLS = ['scheduler']

/**
 * Every FEATURES entry answers whether the reader can switch it off: exactly
 * one of `pref: '<preference key>'` or `ungated: '<reason>'`. The preference
 * keys are host/settings.js's PREFS_DEFAULT. An entry with neither, with both,
 * or naming a key the table lacks fails the build, so a new feature cannot
 * ship without deciding.
 */
function checkFeatureSwitches(entry) {
  const block = entry.match(/const FEATURES = \[([\s\S]*?)\n\s*\]\n/)
  if (block === null) throw new Error('build: src/entry.js has no FEATURES table')
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
 * Hold src/entry.js's FEATURES table and the src/features/ directories to the
 * pairing above: an install this table does not name, a table entry naming a
 * fragment FRAGMENTS does not list, and a feature directory no id covers all
 * fail the build.
 */
function checkFeatureRegistry() {
  for (const [id, file] of Object.entries(FEATURE_MAINS)) {
    if (!FRAGMENTS.includes(file)) throw new Error(`build: feature "${id}" names ${file}, which FRAGMENTS does not list`)
  }
  const entry = fs.readFileSync(path.join(SRC, 'entry.js'), 'utf8')
  const declared = new Set([...entry.matchAll(/\bname: '([A-Za-z][A-Za-z0-9]*)'/g)].map((match) => match[1]))
  for (const id of NON_FEATURE_INSTALLS) declared.delete(id)
  for (const id of declared) {
    if (!(id in FEATURE_MAINS)) throw new Error(`build: src/entry.js installs feature "${id}", which FEATURE_MAINS does not name`)
  }
  for (const id of Object.keys(FEATURE_MAINS)) {
    if (!declared.has(id)) throw new Error(`build: FEATURE_MAINS names "${id}", which src/entry.js does not install`)
  }
  checkFeatureSwitches(entry)
  const covered = new Set(Object.values(FEATURE_MAINS).map((file) => file.split('/')[1]))
  const dirs = fs.readdirSync(path.join(SRC, 'features'), { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => item.name)
  for (const dir of dirs) {
    if (!covered.has(dir)) throw new Error(`build: src/features/${dir} has no install in src/entry.js`)
  }
}

/**
 * Hold the browser half's preference defaults (src/constants.js PREF_DEFAULTS)
 * to the host half's PREFS_DEFAULT: the same keys with the same values, so the
 * frames before the settings form answers show what the form will hold.
 */
function checkPrefDefaults() {
  const browser = CONSTANTS.PREF_DEFAULTS
  for (const key of new Set([...Object.keys(browser), ...Object.keys(PREFS_DEFAULT)])) {
    if (!(key in browser)) throw new Error(`build: src/constants.js PREF_DEFAULTS lacks "${key}", which host/settings.js PREFS_DEFAULT carries`)
    if (!(key in PREFS_DEFAULT)) throw new Error(`build: host/settings.js PREFS_DEFAULT lacks "${key}", which src/constants.js PREF_DEFAULTS carries`)
    if (JSON.stringify(browser[key]) !== JSON.stringify(PREFS_DEFAULT[key])) {
      throw new Error(`build: preference "${key}" defaults to ${JSON.stringify(browser[key])} in src/constants.js but ${JSON.stringify(PREFS_DEFAULT[key])} in host/settings.js`)
    }
  }
}

function main() {
  checkListed()
  checkFeatureRegistry()
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

  const cssDecl = [
    '    // ============================================================================',
    '    // 样式表（由 src/ 下的 .css 内联生成，勿手改） (CSS Stylesheet)',
    '    // ============================================================================',
    '    var CSS = [',
    ...cssText.split('\n').map((line) => '      ' + JSON.stringify(line) + ','),
    "    ].join('\\n')",
  ].join('\n')

  // Vendor lockups: one markup table plus the word each lockup stands in for.
  const combineDecl = [
    '    // ============================================================================',
    '    // 厂商锁定标（由 src/assets/icons/combine/*.svg 内联生成，勿手改） (Vendor lockups)',
    '    // ============================================================================',
    '    var COMBINE_SVGS = {',
    ...Object.entries(combines).map(([id, item]) => `      ${JSON.stringify(id)}: ${JSON.stringify(item.svg)},`),
    '    }',
    '    var COMBINE_WORDS = {',
    ...Object.entries(combines).map(([id, item]) => `      ${JSON.stringify(id)}: ${JSON.stringify(item.word)},`),
    '    }',
  ].join('\n')

  const fragment = (name) => {
    const text = fs.readFileSync(path.join(SRC, name), 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, '')
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (/^[ \t]*(import|export)[ \t]/m.test(line)) {
        throw new Error(`build: src/${name} uses import/export at line ${i + 1}`)
      }
      if (line.trim() !== '' && !/^ {4}/.test(line) && !/^ \* /.test(line)) {
        throw new Error(`build: src/${name} line ${i + 1} is not 4-space indented: ${line.trim().slice(0, 60)}`)
      }
    }
    return text
  }

  // The build id: a hash of the bundle itself, written into it. The skin puts
  // it on <body data-dsh-claude-style>, so a live page can be matched to the
  // lib/client.js it runs — a hot reload swaps the bundle without reloading
  // the page, so the page's load time says nothing about its code.
  const BUILD_ID_SLOT = '%%BUILD_ID%%'
  const buildDecl = [
    '    // ============================================================================',
    '    // 构建编号（由 scripts/build.mjs 按产物内容生成） (Build id)',
    '    // ============================================================================',
    `    var BUILD_ID = '${BUILD_ID_SLOT}'`,
  ].join('\n')

  // Deepy sheet stamps: content hashes of the sheets, for the browser half's
  // vector cache keys (planDeepySheets).
  const deepy = planDeepySheets()
  const deepyStampDecl = [
    '    // ============================================================================',
    '    // Deepy 帧图内容戳（由 scripts/build.mjs 按帧图字节生成） (Deepy sheet stamps)',
    '    // ============================================================================',
    `    var DEEPY_STAMPS = ${JSON.stringify(deepy.stamps)}`,
  ].join('\n')

  // The crab's sheets, inlined (loadCrabSheets).
  const crabSheetDecl = [
    '    // ============================================================================',
    '    // 螃蟹帧图（由 src/assets/mascot/crab/*.png 内联生成，勿手改） (Crab sheets)',
    '    // ============================================================================',
    `    var CRAB_SHEET_URLS = ${JSON.stringify(loadCrabSheets())}`,
  ].join('\n')

  const draft = [
    HEADER,
    fragment(FRAGMENTS[0]),
    cssDecl,
    combineDecl,
    buildDecl,
    deepyStampDecl,
    crabSheetDecl,
    ...FRAGMENTS.slice(1).map(fragment),
    FOOTER,
  ].join('\n\n')
  const buildId = createHash('sha256').update(draft).digest('hex').slice(0, 12)
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
  const lines = bundle.split('\n').length
  console.log(`built lib/client.js (${lines} lines, ${bundle.length} bytes, build ${buildId}) from src/ (${STYLE_FILES.length} stylesheets + ${FRAGMENTS.length} fragments + ${Object.keys(combines).length} lockups)`)

  fs.writeFileSync(path.join(LIB, MODEL_COPY), copyText)
  console.log(`built lib/${MODEL_COPY} (${exact} exact entries, ${copy.families.length} family rules, ${copy.tiers.length} tier rules)`)

  fs.copyFileSync(iconSource, iconTarget)
  console.log(`built lib/${ICON_FILE} (${fs.statSync(iconTarget).size} bytes) from src/assets/brand/${ICON_SOURCE}`)

  writeDeepySheets(deepy.names)
  console.log(`built lib/deepy/ (${deepy.names.length} sheets, ${deepy.bytes} bytes) from src/assets/mascot/deepy/`)
}

main()
