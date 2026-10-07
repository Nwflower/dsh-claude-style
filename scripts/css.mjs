/**
 * css.mjs — the stylesheet half of the build (D51).
 *
 * Every stylesheet is parsed with PostCSS after its %%TOKEN%% placeholders are
 * substituted, and the rules the skin's CSS lives by are checked on the syntax
 * tree, selectors through postcss-selector-parser:
 *
 *   scope        every selector holds `body[data-dsh-claude-style]` (outside :not())
 *   :has()       only in its selector's last compound, at every nesting level (D9)
 *   token gates  a rule writing a host token carries the Claude palette or
 *                typeface gate, and every private token the Claude choice
 *                defines has an alias under the host's (D30)
 *   composer     the rules below a sheet's `@composer-gate` comment get the
 *                composer gate stamped onto their scope compound (D4)
 *
 * The token stylesheet is generated from packages/client/src/theme/tokens.json, and so is the
 * token table in docs/STYLE.md.
 */
import fs from 'node:fs'
import path from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'

/** The selector root every skin rule hangs off. */
const SCOPE_TAG = 'body'
const SCOPE_ATTRIBUTE = 'data-dsh-claude-style'
const SCOPE = `${SCOPE_TAG}[${SCOPE_ATTRIBUTE}]`
/** The comment in a gated sheet below which every rule follows the composer preference. */
const COMPOSER_GATE_MARKER = '@composer-gate'
/** The token stylesheet's place in the sheet list: generated, never read from disk. */
export const TOKEN_SHEET = 'theme/tokens.json'
const TOKEN_SCHEMA = 'theme/tokens.schema.json'
/** The region of docs/STYLE.md the token table is written into. */
const TABLE_BEGIN = '<!-- generated:tokens (packages/client/src/theme/tokens.json) -->'
const TABLE_END = '<!-- /generated:tokens -->'

/** Substitute %%TOKEN%% placeholders in one stylesheet; throws on leftovers. */
export function substitute(file, text, tokens) {
  const out = text.replace(/%%([A-Z_]+)%%/g, (match, name) => {
    if (!(name in tokens)) throw new Error(`build: unknown token %%${name}%% in src/${file}`)
    return tokens[name]
  })
  if (out.includes('%%')) throw new Error(`build: unsubstituted token remains in src/${file}`)
  return out
}

/* ---------- selectors ---------- */

/** The compound a selector node sits in: its siblings up to the nearest combinators. */
function compoundOf(node) {
  const nodes = node.parent.nodes
  let start = nodes.indexOf(node)
  let end = start
  while (start > 0 && nodes[start - 1].type !== 'combinator') start--
  while (end < nodes.length - 1 && nodes[end + 1].type !== 'combinator') end++
  return nodes.slice(start, end + 1)
}

/** Whether a selector node sits inside a :not(). */
function negated(node) {
  for (let parent = node.parent; parent !== undefined; parent = parent.parent) {
    if (parent.type === 'pseudo' && parent.value.toLowerCase() === ':not') return true
  }
  return false
}

/**
 * The scope compounds of one selector: each `[data-dsh-claude-style]` on a
 * `body` compound outside :not(), with the compound around it. A rule that
 * paints the document element reaches the scope through `html:has(…)`.
 */
function scopeCompounds(selector) {
  const found = []
  selector.walkAttributes((attribute) => {
    if (attribute.attribute !== SCOPE_ATTRIBUTE || negated(attribute)) return
    const compound = compoundOf(attribute)
    if (compound.some((node) => node.type === 'tag' && node.value === SCOPE_TAG)) found.push({ attribute, compound })
  })
  return found
}

/** Whether a selector's scope compound carries `[attribute="value"]`. */
function carries(selector, attribute, value) {
  return scopeCompounds(selector).some(({ compound }) => compound.some((node) => node.type === 'attribute' && node.attribute === attribute && node.value === value))
}

/**
 * Refuse a `:has()` outside its selector's last compound (D9): `A:has(B) C`
 * re-matches every descendant of every A on each DOM change below it. Each
 * level is checked on the way out, so `:is(A:has(B) C)` and
 * `A:not(:has(B)) C` are refused too.
 */
function checkHasPlacement(where, selector) {
  selector.walkPseudos((pseudo) => {
    if (pseudo.value.toLowerCase() !== ':has') return
    for (let node = pseudo; ;) {
      const level = node.parent
      if (level.nodes.slice(level.index(node) + 1).some((item) => item.type === 'combinator')) {
        throw new Error(`build: ${where} has a :has() followed by a combinator; mark the element from the skin's pass instead`)
      }
      if (level.parent.type !== 'pseudo') return
      node = level.parent
    }
  })
}

/**
 * Hold every write of a host token to its gate (D30), and record the private
 * tokens the Claude choice defines and the host choice aliases.
 *
 * A `--dsw-font-*` declaration must sit in a rule whose every selector carries
 * the Claude typeface gate; any other `--dsw-*` one in a rule carrying the
 * Claude palette gate. Under "follow the host" those rules drop out and the
 * host's tokens (or another theme plugin's) stand.
 */
function checkTokenGates(file, rule, selectors, gates, names) {
  const every = (gate, value) => selectors.every((selector) => carries(selector, gate.attribute, value))
  for (const node of rule.nodes) {
    if (node.type !== 'decl' || !node.prop.startsWith('--')) continue
    const name = node.prop
    const where = `src/${file}:${node.source.start.line}`
    if (name.startsWith('--dsw-font-')) {
      if (!every(gates.typeface, gates.typeface.claude)) throw new Error(`build: ${where} writes ${name} outside the Claude typeface gate`)
    } else if (name.startsWith('--dsw-')) {
      if (!every(gates.palette, gates.palette.claude)) throw new Error(`build: ${where} writes ${name} outside the Claude palette gate`)
    }
    if (!name.startsWith('--dsh-claude-')) continue
    const gate = name.startsWith('--dsh-claude-font-') ? gates.typeface : gates.palette
    if (every(gate, gate.claude)) names.claude.add(name)
    if (every(gate, gate.host)) names.host.add(name)
  }
}

/**
 * Parse one substituted stylesheet, check every rule, and stamp the composer
 * gate below the marker of a gated sheet (D4). The composer preference decides
 * per page which composer surface the skin repaints, so the gate is one
 * attribute on `<body>` stamped onto the scope compound of every rule below
 * the marker; a gated sheet without the marker, or with no rule below it,
 * fails the build.
 *
 * @returns the sheet's text, comments and formatting kept.
 */
function processSheet(sheet, text, gates, names) {
  const root = postcss.parse(text, { from: `src/${sheet.file}` })
  let markerEnd = null
  if (sheet.gate === true) {
    const marker = root.nodes.find((node) => node.type === 'comment' && node.text === COMPOSER_GATE_MARKER)
    if (marker === undefined) throw new Error(`build: src/${sheet.file} is missing the /* ${COMPOSER_GATE_MARKER} */ marker`)
    markerEnd = marker.source.end.offset
  }
  let stamped = 0
  root.walkRules((rule) => {
    if (rule.parent.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return
    const where = `src/${sheet.file}:${rule.source.start.line}`
    const selectors = selectorParser().astSync(rule.selector)
    const stamp = markerEnd !== null && rule.source.start.offset > markerEnd
    for (const selector of selectors.nodes) {
      const scopes = scopeCompounds(selector)
      if (scopes.length === 0) throw new Error(`build: ${where} selector "${selector.toString().trim()}" is not under ${SCOPE}`)
      checkHasPlacement(where, selector)
      if (!stamp) continue
      for (const { attribute } of scopes) attribute.parent.insertAfter(attribute, selectorParser.attribute({ attribute: gates.composer }))
    }
    checkTokenGates(sheet.file, rule, selectors.nodes, gates, names)
    if (!stamp) return
    rule.selector = selectors.toString()
    stamped += 1
  })
  if (markerEnd !== null && stamped === 0) throw new Error(`build: src/${sheet.file} has no rules below /* ${COMPOSER_GATE_MARKER} */`)
  return root.toString()
}

/* ---------- tokens ---------- */

/**
 * Read and validate packages/client/src/theme/tokens.json: its declared shape, and each token
 * named once per group.
 */
export function loadTokens(srcDir) {
  const schema = JSON.parse(fs.readFileSync(path.join(srcDir, TOKEN_SCHEMA), 'utf8'))
  const validate = new Ajv2020({ allErrors: true }).compile(schema)
  const doc = JSON.parse(fs.readFileSync(path.join(srcDir, TOKEN_SHEET), 'utf8'))
  if (!validate(doc)) throw new Error(`build: src/${TOKEN_SHEET} ${validate.errors.map((error) => `${error.instancePath || '/'} ${error.message}`).join('; ')}`)
  for (const group of ['typeface', 'apex', 'palette']) {
    const seen = new Set()
    for (const item of doc[group]) {
      if (seen.has(item.token)) throw new Error(`build: src/${TOKEN_SHEET} names ${item.token} twice in ${group}`)
      seen.add(item.token)
    }
  }
  return doc
}

/** One rule of the token sheet; a block with nothing in it is left out. */
function tokenBlock(selector, declarations) {
  if (declarations.length === 0) return ''
  return `${selector} {\n${declarations.map(([token, value]) => `  ${token}: ${value};`).join('\n')}\n}\n`
}

/** The declarations a group holds for one choice: `pick` reads the value, undefined when the token has none there. */
function declarationsOf(items, pick) {
  return items.flatMap((item) => {
    const value = pick(item)
    return value === undefined ? [] : [[item.token, value]]
  })
}

/**
 * The token stylesheet, placeholders still in, in cascade order.
 *
 * Every block that writes a host token carries the Claude gate, so under
 * "follow the host" the host's own tokens stand (D30). The palette blocks name
 * `[data-ds-dark-theme]` for dark on purpose: the host's own dark block weighs
 * the same (0,1,1) as a bare `body[data-dsh-claude-style]`, so whichever sheet
 * the loader appended last would win; naming the attribute lifts these to
 * (0,2,1). The DeepSeek blocks add the brand attribute on top and only state
 * what differs from Claude's.
 */
function tokenSheet(doc) {
  const dark = '[data-ds-dark-theme]'
  const light = ':not([data-ds-dark-theme])'
  const claude = `${SCOPE}%%PALETTE_CLAUDE%%`
  const deepseek = `${claude}[%%BRAND_ATTR%%="%%BRAND_DEEPSEEK%%"]`
  return [
    `/* Generated from src/${TOKEN_SHEET} by scripts/css.mjs; edit the JSON. */\n`,
    tokenBlock(`${SCOPE}%%TYPEFACE_CLAUDE%%`, declarationsOf(doc.typeface, (item) => item.claude)),
    tokenBlock(`${SCOPE}%%TYPEFACE_HOST%%`, declarationsOf(doc.typeface, (item) => item.host)),
    tokenBlock(`${SCOPE}${dark}`, declarationsOf(doc.apex, (item) => item.dark)),
    tokenBlock(`${SCOPE}${light}`, declarationsOf(doc.apex, (item) => item.light)),
    tokenBlock(`${claude}${dark}`, declarationsOf(doc.palette, (item) => item.claude?.dark)),
    tokenBlock(`${claude}${light}`, declarationsOf(doc.palette, (item) => item.claude?.light)),
    tokenBlock(`${deepseek}${light}`, declarationsOf(doc.palette, (item) => item.deepseek?.light)),
    tokenBlock(`${deepseek}${dark}`, declarationsOf(doc.palette, (item) => item.deepseek?.dark)),
    tokenBlock(`${SCOPE}%%PALETTE_HOST%%`, declarationsOf(doc.palette, (item) => item.host)),
  ].filter((block) => block !== '').join('\n')
}

/**
 * The palette as a Markdown table: each token's value in the four brand ×
 * theme cells (a DeepSeek cell shows the Claude value it keeps), its value
 * under the host palette (a host token keeps the host's own) and its use.
 */
function tokenTable(doc) {
  const cell = (value) => (value === undefined ? '—' : '`' + value.replace(/\|/g, '\\|') + '`')
  const rows = doc.palette.map((item) => {
    const claudeLight = item.claude?.light
    const claudeDark = item.claude?.dark
    const host = item.host === undefined && item.token.startsWith('--dsw-') ? "host's own" : cell(item.host)
    return `| \`${item.token}\` | ${cell(claudeLight)} | ${cell(item.deepseek?.light ?? claudeLight)} | ${cell(claudeDark)} | ${cell(item.deepseek?.dark ?? claudeDark)} | ${host} | ${item.use ?? ''} |`
  })
  return [
    '| Token | Claude light | DeepSeek light | Claude dark | DeepSeek dark | Host alias | Use |',
    '|---|---|---|---|---|---|---|',
    ...rows,
  ].join('\n')
}

/**
 * Write the token table into its region of docs/STYLE.md.
 * @returns whether the file changed.
 */
export function writeTokenTable(stylePath, doc) {
  const text = fs.readFileSync(stylePath, 'utf8')
  const begin = text.indexOf(TABLE_BEGIN)
  const end = text.indexOf(TABLE_END)
  if (begin === -1 || end < begin) throw new Error(`build: ${path.basename(stylePath)} lacks the ${TABLE_BEGIN} … ${TABLE_END} region`)
  const next = text.slice(0, begin + TABLE_BEGIN.length) + '\n' + tokenTable(doc) + '\n' + text.slice(end)
  if (next === text) return false
  fs.writeFileSync(stylePath, next)
  return true
}

/* ---------- the stylesheet ---------- */

/**
 * Every sheet in cascade order, substituted, checked, gated and joined.
 *
 * @param options.sheets - `{ file, rank, gate? }` in cascade order (TOKEN_SHEET generated).
 * @param options.srcDir - the source directory.
 * @param options.tokens - the placeholder values.
 * @param options.tokenDoc - packages/client/src/theme/tokens.json (loadTokens).
 * @param options.gates - `{ composer, palette: { attribute, claude, host }, typeface: { attribute, claude, host } }`.
 * @returns the stylesheet text.
 */
export function buildStylesheet({ sheets, srcDir, tokens, tokenDoc, gates }) {
  const names = { claude: new Set(), host: new Set() }
  const text = sheets.map((sheet) => {
    const source = sheet.file === TOKEN_SHEET
      ? tokenSheet(tokenDoc)
      : fs.readFileSync(path.join(srcDir, sheet.file), 'utf8').replace(/\r\n/g, '\n')
    return processSheet(sheet, substitute(sheet.file, source, tokens), gates, names).replace(/\n+$/, '')
  }).join('\n\n')
  for (const name of names.claude) {
    if (!names.host.has(name)) throw new Error(`build: ${name} is defined under the Claude palette or typeface but has no alias under the host's`)
  }
  return text
}
