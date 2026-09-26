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
 *   src/core/                    host accessors, prefs, model copy, i18n, scheduler
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
import vm from 'node:vm'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC = path.join(ROOT, 'src')
const ASSETS = path.join(SRC, 'assets')
/** Brand marks inlined as CSS data URIs. */
const BRAND_ASSETS = path.join(ASSETS, 'brand')
/** The composer crab's sprite strips, inlined as CSS data URIs. */
const MASCOT_ASSETS = path.join(ASSETS, 'mascot')
/** Vendored vendor lockups (src/assets/icons/combine); mark + wordmark per brand id. */
const COMBINE_ASSETS = path.join(ASSETS, 'icons', 'combine')
const LIB = path.join(ROOT, 'lib')
const OUT = path.join(LIB, 'client.js')

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
  'core/prefs.js',
  'core/model-copy.js',
  'core/i18n.js',
  'shared/dom.js',
  'shared/notify.js',
  'shared/popover.js',
  'shared/sliding-pill.js',
  'features/selection/selection.js',
  'features/composer/composer.js',
  'features/copy/copy.js',
  'features/permissions/session-stats.js',
  'features/permissions/permissions.js',
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
  'features/view-tabs/view-tabs.js',
  'features/home/data.js',
  'features/home/overview.js',
  'features/home/models.js',
  'features/home/home-layout.js',
  'features/mascot/mascot.js',
  'core/scheduler.js',
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
  { file: 'features/mascot/mascot.css' },
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

/** Evaluate src/constants.js (pure, DOM-free) to obtain the %%TOKEN%% values. */
function loadTokens() {
  const constants = fs.readFileSync(path.join(SRC, 'constants.js'), 'utf8')
  const factory = new Function(`
    ${constants}
    return {
      SANS, SERIF, PROSE, MONO, BRAND_ATTR, BRAND_ANTHROPIC, BRAND_CLAUDE, FOOTER_ATTR, COMPOSER_ATTR, PERMISSIONS_ATTR, ACCOUNT_MENU_ATTR, ACCOUNT_ARMED_ATTR, HERO_MENU_ATTR,
      // "a skin brand is selected": the brand preference's third value is
      // "off", which must match neither variant — so the shared rules that
      // hide the host's mark and paint the ::before are gated on this rather
      // than on :not(anthropic), which "off" would satisfy.
      BRAND_ACTIVE: ':is([' + BRAND_ATTR + '="' + BRAND_CLAUDE + '"], [' + BRAND_ATTR + '="' + BRAND_ANTHROPIC + '"])',
      CLAUDE_WORD_WIDTH: (18 * CLAUDE_WORD_ASPECT).toFixed(1),
    }
  `)
  return factory()
}

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
  // Comments blanked in place, so offsets still give the right line.
  const source = text.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '))
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
  ANTHROPIC_MARK: 'anthropic-mark.svg',
  ANTHROPIC_BRAND_MARK: 'anthropic-brand-mark.svg',
  ANTHROPIC_BRAND_WORD: 'anthropic-brand-word.svg',
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
 * The composer crab's frames: one strip of the crab in its colours and one of
 * the fishing rod as a mask, a frame per 34×23 cells side by side, one pixel
 * per cell (src/features/mascot). Encoded into CSS url() %%TOKEN%% values the
 * same way as the brand marks.
 */
const PNG_TOKENS = {
  MASCOT_BODY: 'crab-body.png',
  MASCOT_ROD: 'crab-rod.png',
}

function loadPngAssets() {
  const out = {}
  for (const [token, file] of Object.entries(PNG_TOKENS)) {
    out[token] = 'url("data:image/png;base64,' + fs.readFileSync(path.join(MASCOT_ASSETS, file)).toString('base64') + '")'
  }
  return out
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

function main() {
  checkListed()
  const tokens = { ...loadTokens(), ...loadSvgAssets(), ...loadPngAssets() }
  const combines = loadCombines()

  const cssText = STYLE_FILES
    .map((fileDef) => {
      const file = fileDef.file
      const gated = fileDef.gate === true
      let text = fs.readFileSync(path.join(SRC, file), 'utf8').replace(/\r\n/g, '\n')
      checkHasPlacement(file, text)
      if (gated) text = gateComposerScope(file, text)
      return substitute(file, text, tokens).replace(/\n+$/, '')
    })
    .join('\n\n')

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

  const draft = [
    HEADER,
    fragment(FRAGMENTS[0]),
    cssDecl,
    combineDecl,
    buildDecl,
    ...FRAGMENTS.slice(1).map(fragment),
    FOOTER,
  ].join('\n\n')
  const buildId = createHash('sha256').update(draft).digest('hex').slice(0, 12)
  const bundle = draft.replace(BUILD_ID_SLOT, buildId)

  // Syntax gate: the bundle must parse before it is written.
  try {
    new vm.Script(bundle, { filename: 'lib/client.js' })
  } catch (error) {
    fs.mkdirSync(path.join(ROOT, '.debug'), { recursive: true })
    fs.writeFileSync(path.join(ROOT, '.debug', 'failed-bundle.js'), bundle)
    console.error('build: generated bundle failed to parse:', error.message)
    console.error('build: failing bundle written to .debug/failed-bundle.js')
    process.exit(1)
  }

  fs.writeFileSync(OUT, bundle)

  const lines = bundle.split('\n').length
  console.log(`built lib/client.js (${lines} lines, ${bundle.length} bytes, build ${buildId}) from src/ (${STYLE_FILES.length} stylesheets + ${FRAGMENTS.length} fragments + ${Object.keys(combines).length} lockups)`)

  const copy = JSON.parse(fs.readFileSync(path.join(SRC, MODEL_COPY), 'utf8'))
  const exact = validateModelCopy(copy, combines)
  fs.writeFileSync(path.join(LIB, MODEL_COPY), JSON.stringify(copy, null, 2) + '\n')
  console.log(`built lib/${MODEL_COPY} (${exact} exact entries, ${copy.families.length} family rules, ${copy.tiers.length} tier rules)`)

  const iconSource = path.join(BRAND_ASSETS, ICON_SOURCE)
  const iconTarget = path.join(LIB, ICON_FILE)
  fs.copyFileSync(iconSource, iconTarget)
  console.log(`built lib/${ICON_FILE} (${fs.statSync(iconTarget).size} bytes) from src/assets/brand/${ICON_SOURCE}`)
}

main()
