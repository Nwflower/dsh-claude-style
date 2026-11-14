/**
 * css.mjs — check and join stylesheets on the syntax tree (D9). Enforce scope,
 * host-token and @composer-gate contracts, generated tokens and layer limits.
 */
import fs from 'node:fs'
import path from 'node:path'
import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'
import { featureSheet } from './feature-sheets.mjs'
import { sheetTemplate } from './part-template.mjs'
import { bucketSelectors, recordKey } from './selector-buckets.mjs'
import { minifyCss } from '../shared/minify-css.mjs'
import { loadModule } from '../shared/ts-module.mjs'
import { ruleKey } from '../shared/rule-key.mjs'
import { TOKEN_SHEET, tokenSheet } from './theme-tokens.mjs'

/** The selector root every skin rule hangs off. */
const SCOPE_TAG = 'body'
/** The element a rule painting the document has to be written on. */
const DOCUMENT_TAG = 'html'
const SCOPE_ATTRIBUTE = 'data-dsh-claude-style'
const SCOPE = `${SCOPE_TAG}[${SCOPE_ATTRIBUTE}]`
/** Surface sheets remain after the theme scope is removed (D74). */
const SURFACE_SCOPE_ATTRIBUTE = 'data-dsh-claude-surface'
/** The comment in a gated sheet below which every rule follows the composer preference. */
const COMPOSER_GATE_MARKER = '@composer-gate'
/** The region of docs/STYLE.md the motion table is written into. */
const MOTION_BEGIN = '<!-- generated:motion (packages/client/src/theme/tokens.json) -->'
const MOTION_END = '<!-- /generated:motion -->'
const LAYER_BEGIN = '<!-- generated:layers (packages/client/src/theme/tokens.json) -->'
const LAYER_END = '<!-- /generated:layers -->'
/** Only sibling-local stacking may use a literal z-index; host surfaces need tokens (D9). */
const LOCAL_LAYER = /^(?:auto|-1|[0-9])$/

/** Match declaration values, not identifiers; mechanical linear and step timing stay literal (D9). */
const TIME_PATTERN = /(?<![\w.#-])(\d*\.?\d+)(ms|s)(?![\w-])/g
const EASE_PATTERN = /(?<![\w-])(?:ease|ease-in|ease-out|ease-in-out)(?![\w-])|cubic-bezier\(/

/** The prefix of the attributes the skin writes; the host's own are read as contracts (D3). */
const SKIN_ATTRIBUTE_PREFIX = 'data-dsh-'
/** The attribute carrying the skin's own names for host elements; the one host anchor a rule reads (D3). */
const PART_ATTRIBUTE = 'data-dsh-claude-part'
/** The attribute carrying what an element's subtree holds; a relation the pass answers (D9). */
const HOLDS_ATTRIBUTE = 'data-dsh-claude-holds'

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

/** Find body scope compounds outside :not(); document rules enter through html:has(…). */
function scopeCompounds(selector, scopeAttribute = SCOPE_ATTRIBUTE) {
  const found = []
  selector.walkAttributes((attribute) => {
    if (attribute.attribute !== scopeAttribute || negated(attribute)) return
    const compound = compoundOf(attribute)
    if (compound.some((node) => node.type === 'tag' && node.value === SCOPE_TAG)) found.push({ attribute, compound })
  })
  return found
}

/** Whether a selector's scope compound carries `[attribute="value"]`. */
function carries(selector, attribute, value) {
  return scopeCompounds(selector).some(({ compound }) => compound.some((node) => node.type === 'attribute' && node.attribute === attribute && node.value === value))
}

/** A trailing combinator after :has() causes descendant-wide rematching; reject at every nesting level (D9). */
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

/** Read known attribute relations through data-dsh-claude-holds instead of querying them with :has() (D9). */
function checkHasMarks(where, selector) {
  selector.walkPseudos((pseudo) => {
    if (pseudo.value.toLowerCase() !== ':has') return
    if (compoundOf(pseudo).some((node) => node.type === 'tag' && node.value === DOCUMENT_TAG)) return
    pseudo.walkAttributes((attribute) => {
      throw new Error(`build: ${where} has a :has() asking whether an element holds [${attribute.attribute}]; write the relation in packages/engine/src/parts-table.ts and read ${HOLDS_ATTRIBUTE} instead`)
    })
  })
}

/** Gate host-token writes so follow-host mode can drop every override (D30). */
function checkTokenGates(label, rule, selectors, gates, names) {
  const every = (gate, value) => selectors.every((selector) => carries(selector, gate.attribute, value))
  for (const node of rule.nodes) {
    if (node.type !== 'decl' || !node.prop.startsWith('--')) continue
    const name = node.prop
    const where = `${label}:${node.source.start.line}`
    if (name.startsWith('--dsw-font-')) {
      if (!every(gates.typeface, gates.typeface.claude) && !every(gates.typeface, gates.typeface.system)) throw new Error(`build: ${where} writes ${name} outside the skin-owned typeface gates`)
    } else if (name.startsWith('--dsw-')) {
      if (!every(gates.palette, gates.palette.claude)) throw new Error(`build: ${where} writes ${name} outside the Claude palette gate`)
    }
    if (!name.startsWith('--dsh-claude-')) continue
    const gate = name.startsWith('--dsh-claude-font-') ? gates.typeface : gates.palette
    if (every(gate, gate.claude)) names.claude.add(name)
    if (every(gate, gate.host)) names.host.add(name)
  }
}

/** Whether a declaration is one of the motion properties the literal check reads. */
function motionProperty(prop) {
  return prop.startsWith('transition') || prop.startsWith('animation') || prop.startsWith('--')
}

/**
 * Hold every time and easing curve in a stylesheet to the token table (D9):
 * outside the token sheet itself, motion values are read as `var(--dsh-claude-…)`
 * and never written as literals, so one look at the token table answers what the
 * skin's motion is made of. `linear` and the step functions are timing rather
 * than a style choice, and a zero delay or duration is no motion at all, so both
 * stay in the sheets.
 */
function checkMotionLiterals(sheet, label, rule) {
  if (sheet.file === TOKEN_SHEET) return
  for (const node of rule.nodes) {
    if (node.type !== 'decl' || !motionProperty(node.prop)) continue
    const time = [...node.value.matchAll(TIME_PATTERN)].map((match) => match[0]).filter((value) => Number.parseFloat(value) !== 0)
    const easing = node.value.match(EASE_PATTERN)
    if (time.length === 0 && easing === null) continue
    const found = [...time, ...easing === null ? [] : [easing]].join(', ')
    throw new Error(`build: ${label}:${node.source.start.line} writes ${found} in ${node.prop}; read the token table in packages/client/src/${TOKEN_SHEET} (D9)`)
  }
}

/**
 * Hold every z-index in a stylesheet to the layer tokens (D9): a sheet orders
 * siblings inside its own box with a literal from -1 to 9, and anything that has
 * to clear what the host draws reads `var(--dsh-claude-layer-…)`, so the
 * levels the skin stacks on are one table.
 */
function checkLayerLiterals(sheet, label, rule) {
  if (sheet.file === TOKEN_SHEET) return
  for (const node of rule.nodes) {
    if (node.type !== 'decl' || node.prop !== 'z-index') continue
    const value = node.value.trim()
    if (LOCAL_LAYER.test(value) || /^var\(--dsh-claude-layer-[a-z0-9-]+\)$/.test(value)) continue
    throw new Error(`build: ${label}:${node.source.start.line} writes z-index: ${value}; above the local orders -1 to 9, read a layer from packages/client/src/${TOKEN_SHEET} (D9)`)
  }
}

/**
 * Record one sheet's keyframes, refusing a second body that says the same thing
 * as an earlier one: the same effect twice is what the shared presets are for
 * (D9). A keyframe's own curve cannot read a token — Chromium drops a `var()`
 * there and runs the stretch linear — so the curve goes on the animation and
 * the keyframes take it from there.
 *
 * @param seen - signature → `name (file:line)`, across the sheets in cascade order.
 */
function collectKeyframes(label, root, seen) {
  root.walkAtRules(/keyframes$/i, (at) => {
    at.walkDecls('animation-timing-function', (node) => {
      if (node.value.includes('var(')) throw new Error(`build: ${label}:${node.source.start.line} reads a token in a keyframe's animation-timing-function, which runs linear; give the animation that curve (D9)`)
    })
    const body = at.nodes.map((rule) => `${rule.selector}{${rule.nodes.filter((node) => node.type === 'decl').map((node) => `${node.prop}:${node.value.replace(/\s+/g, ' ')}`).join(';')}}`).join(' ')
    const where = `${at.params} (${label}:${at.source.start.line})`
    const first = seen.get(body)
    if (first !== undefined) throw new Error(`build: ${where} repeats the keyframes of ${first}; use the shared preset (D9)`)
    seen.set(body, where)
  })
}

/** Where a sheet's rules are reported: its file, or the generator that wrote it (scripts/build/feature-sheets.mjs). */
function sheetLabel(sheet) {
  return sheet.generated === undefined ? `packages/client/src/${sheet.file}` : `scripts/build/feature-sheets.mjs (${sheet.generated})`
}

/**
 * Parse one stylesheet, check every rule, and stamp the composer
 * gate below the marker of a gated sheet (D9). The composer preference decides
 * per page which composer surface the skin repaints, so the gate is one
 * attribute on `<body>` stamped onto the scope compound of every rule below
 * the marker; a gated sheet without the marker, or with no rule below it,
 * fails the build.
 *
 * @param read - collects the skin attributes the sheet's selectors read, each with where.
 * @param keyframes - signature → where, across the sheets, for the repeat check (D9).
 * @param relations - relation name → where, for the hold-mark check (D9).
 * @param unkeyed - selector → where, for the selectors no bucket key can be written into (D101).
 * @returns the sheet's text, comments and formatting kept.
 */
function processSheet(sheet, text, gates, names, read, parts, relations, keyframes, unkeyed) {
  const label = sheetLabel(sheet)
  const root = postcss.parse(text, { from: label })
  const surface = sheet.scope === 'surface'
  const scopeAttribute = surface ? SURFACE_SCOPE_ATTRIBUTE : SCOPE_ATTRIBUTE
  // The composer gate is an attribute of the theme's own scope, which a surface sheet outlives.
  if (surface && sheet.gate === true) throw new Error(`build: ${label} is a surface sheet and cannot be composer-gated`)
  let markerEnd = null
  if (sheet.gate === true) {
    const marker = root.nodes.find((node) => node.type === 'comment' && node.text === COMPOSER_GATE_MARKER)
    if (marker === undefined) throw new Error(`build: ${label} is missing the /* ${COMPOSER_GATE_MARKER} */ marker`)
    markerEnd = marker.source.end.offset
  }
  let stamped = 0
  root.walkRules((rule) => {
    if (rule.parent.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return
    const where = `${label}:${rule.source.start.line}`
    const selectors = selectorParser().astSync(rule.selector)
    selectors.walkAttributes((attribute) => {
      if (attribute.attribute.startsWith(SKIN_ATTRIBUTE_PREFIX) && !read.has(attribute.attribute)) read.set(attribute.attribute, where)
      if (attribute.attribute === HOLDS_ATTRIBUTE && attribute.operator === '~=' && typeof attribute.value === 'string' && !relations.has(attribute.value)) {
        relations.set(attribute.value, where)
      }
      if (attribute.attribute !== PART_ATTRIBUTE || attribute.operator !== '~=') return
      if (typeof attribute.value === 'string' && !parts.has(attribute.value)) parts.set(attribute.value, where)
    })
    const stamp = markerEnd !== null && rule.source.start.offset > markerEnd
    for (const selector of selectors.nodes) {
      const scopes = scopeCompounds(selector, scopeAttribute)
      if (scopes.length === 0) throw new Error(`build: ${where} selector "${selector.toString().trim()}" is not under ${SCOPE_TAG}[${scopeAttribute}]`)
      checkHasPlacement(where, selector)
      checkHasMarks(where, selector)
      const written = recordKey(selector.toString())
      if (!unkeyed.has(written) && bucketSelectors(written).some((item) => !item.keyed)) unkeyed.set(written, where)
      if (!stamp) continue
      for (const { attribute } of scopes) attribute.parent.insertAfter(attribute, selectorParser.attribute({ attribute: gates.composer }))
    }
    checkTokenGates(label, rule, selectors.nodes, gates, names)
    checkMotionLiterals(sheet, label, rule)
    checkLayerLiterals(sheet, label, rule)
    if (!stamp) return
    rule.selector = selectors.toString()
    stamped += 1
  })
  collectKeyframes(label, root, keyframes)
  if (markerEnd !== null && stamped === 0) throw new Error(`build: ${label} has no rules below /* ${COMPOSER_GATE_MARKER} */`)
  return root.toString()
}

/**
 * A token value as a Markdown table cell: a code span, with the backslash
 * escaped before the pipe, since a value's own `\` would otherwise escape the
 * `\|` that keeps the cell from ending at a pipe inside the value.
 */
function tableCell(value) {
  return '`' + value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|') + '`'
}

/**
 * Write `table` into the region of docs/STYLE.md between `begin` and `end`.
 * @returns whether the file changed.
 */
function writeRegion(stylePath, begin, end, table) {
  const text = fs.readFileSync(stylePath, 'utf8')
  const from = text.indexOf(begin)
  const to = text.indexOf(end)
  if (from === -1 || to < from) throw new Error(`build: ${path.basename(stylePath)} lacks the ${begin} … ${end} region`)
  const next = text.slice(0, from + begin.length) + '\n' + table + '\n' + text.slice(to)
  if (next === text) return false
  fs.writeFileSync(stylePath, next)
  return true
}

/** A group of one-value tokens as a Markdown table: the value and the role it plays. */
function valueTable(items) {
  const rows = items.map((item) => `| \`${item.token}\` | ${tableCell(item.value)} | ${item.use} |`)
  return [
    '| Token | Value | Use |',
    '|---|---|---|',
    ...rows,
  ].join('\n')
}

/**
 * Write the motion table into its region of docs/STYLE.md (D9).
 * @returns whether the file changed.
 */
export function writeMotionTable(stylePath, doc) {
  return writeRegion(stylePath, MOTION_BEGIN, MOTION_END, valueTable(doc.motion))
}

/**
 * Write the layer table into its region of docs/STYLE.md (D9).
 * @returns whether the file changed.
 */
export function writeLayerTable(stylePath, doc) {
  return writeRegion(stylePath, LAYER_BEGIN, LAYER_END, valueTable(doc.layer))
}

/* ---------- the stylesheet ---------- */

/**
 * Hold every motion and layer token to a reader (D9): a token nothing
 * reads is a value the token table claims the skin uses and nothing does. The
 * readers are the stylesheets and, for motion, the browser half's TypeScript,
 * which reads the same table through packages/client/src/shared/motion.ts.
 *
 * The names the browser half asks for are checked the other way round: a name
 * that is not a motion token throws where it is read, so a misspelt one has to
 * fail here instead of on the page.
 *
 * @param doc - packages/client/src/theme/tokens.json.
 * @param sheetText - every stylesheet but the token sheet, and the tokens' own values.
 * @param sources - the browser half on its syntax tree (scripts/build/source-tree.mjs).
 */
function checkTokensRead(doc, sheetText, sources) {
  const names = new Set(doc.motion.map((item) => item.token))
  for (const [name, where] of sources.motion) {
    if (names.has(name)) continue
    throw new Error(`build: ${where} reads the motion token ${name}, which packages/client/src/${TOKEN_SHEET} does not declare (D9)`)
  }
  const named = (token) => [...sources.strings].some((text) => text.includes(token))
  for (const item of doc.motion) {
    if (sheetText.includes(item.token) || named(item.token)) continue
    throw new Error(`build: packages/client/src/${TOKEN_SHEET} declares ${item.token}, which no stylesheet or module reads (D9)`)
  }
  // A layer is read by the sheets alone: the browser half stacks nothing by
  // hand, it marks the element and the sheet places it (D9).
  for (const item of doc.layer) {
    if (sheetText.includes(item.token)) continue
    throw new Error(`build: packages/client/src/${TOKEN_SHEET} declares ${item.token}, which no stylesheet reads (D9)`)
  }
}

/**
 * Hold every skin attribute a selector reads to the browser half: some code
 * has to write it (scripts/build/source-tree.mjs follows the name into the DOM call
 * or the React props that write it). An attribute renamed in the code, written
 * nowhere any more, or misspelt in a sheet leaves a rule that matches nothing.
 *
 * @param read - attribute name → where a selector first reads it.
 * @param sources - the browser half on its syntax tree.
 */
function checkAttributes(read, sources) {
  for (const [name, where] of read) {
    if (!sources.attributes.has(name)) throw new Error(`build: ${where} reads [${name}], which nothing in the browser half's sources writes`)
  }
}

/** Reject unknown part names that would leave selectors matching nothing (D3). */
function checkParts(parts) {
  const known = new Set(partNames())
  if (known.size === 0) {
    throw new Error('build: packages/engine/src/parts-table.ts defines no part names')
  }
  for (const [name, where] of parts) {
    if (!known.has(name)) throw new Error(`build: ${where} reads the part "${name}", which packages/engine/src/parts-table.ts does not define`)
  }
}

/** Build relation tables with the same skin vocabulary the browser uses (D73). */
function partsVocabulary() {
  const { ACCOUNT_MENU_ATTR, HERO_MENU_ATTR, MORE_MENU_ATTR, PART_ATTR } = loadModule('packages/client/src/constants.ts')
  return { part: PART_ATTR, regions: { account: ACCOUNT_MENU_ATTR, hero: HERO_MENU_ATTR, more: MORE_MENU_ATTR } }
}

/** Every part name the tables define, sorted. */
function partNames() {
  const { partNames } = loadModule('packages/engine/src/parts-table.ts')
  return partNames(partsVocabulary())
}

/** Every relation a stylesheet reads. */
function holdRelations() {
  const { holdRelations } = loadModule('packages/engine/src/parts-table.ts')
  return holdRelations(partsVocabulary())
}

/** Reject unknown relations and unused declarations in both directions (D9). */
function checkHolds(relations) {
  const relationsTable = holdRelations()
  if (!Array.isArray(relationsTable)) throw new Error('build: packages/engine/src/parts-table.ts exports no hold relations')
  const known = new Set(partNames())
  const declared = new Set()
  for (const relation of relationsTable) {
    declared.add(relation.name)
    for (const side of [relation.holder, relation.held, relation.scope]) {
      if (typeof side !== 'string') continue
      for (const match of side.matchAll(/\[data-dsh-claude-part~="([^"]+)"\]/g)) {
        if (!known.has(match[1])) {
          throw new Error(`build: the hold relation "${relation.name}" names the part "${match[1]}", which packages/engine/src/parts-table.ts does not define`)
        }
      }
    }
  }
  for (const [name, where] of relations) {
    if (!declared.has(name)) throw new Error(`build: ${where} reads the hold "${name}", which packages/engine/src/parts-table.ts does not declare`)
  }
  for (const name of declared) {
    if (!relations.has(name)) throw new Error(`build: the hold relation "${name}" is declared but no stylesheet reads it — take it out of HOLD_RELATIONS`)
  }
}

/** Run all source checks before minifying and joining the main and surface sheets (D74). */
export function buildStylesheet({ sheets, srcDir, sources, tokenDoc, gates, images, featureConstants }) {
  const names = { claude: new Set(), host: new Set() }
  const read = new Map()
  const parts = new Map()
  const relations = new Map()
  const keyframes = new Map()
  const unkeyed = new Map()
  const processed = sheets.map((sheet) => {
    const source = sheet.file === TOKEN_SHEET
      ? tokenSheet(tokenDoc, gates, images)
      : sheet.generated !== undefined
        ? featureSheet(sheet.generated, featureConstants)
        : fs.readFileSync(path.join(srcDir, sheet.file), 'utf8').replace(/\r\n/g, '\n')
    return { sheet, text: processSheet(sheet, source, gates, names, read, parts, relations, keyframes, unkeyed).replace(/\n+$/, '') }
  })
  const joined = (surface) => processed.filter((item) => (item.sheet.scope === 'surface') === surface).map((item) => item.text).join('\n\n')
  for (const name of names.claude) {
    if (!names.host.has(name)) throw new Error(`build: ${name} is defined under the Claude palette or typeface but has no alias under the host's`)
  }
  checkAttributes(read, sources)
  checkParts(parts)
  checkHolds(relations)
  checkBuckets(unkeyed, srcDir)
  // The token sheet declares every token, so it is no reader of any: what reads
  // a token is another sheet, or another token's value (a shorthand).
  const readers = [
    ...processed.filter((item) => item.sheet.file !== TOKEN_SHEET).map((item) => item.text),
    ...tokenDoc.motion.map((item) => item.value),
  ].join('\n')
  checkTokensRead(tokenDoc, readers, sources)
  const main = minifyCss(joined(false))
  checkImportance(main, srcDir)
  return { main: sheetTemplate(bucketSheet(main), PART_ATTRIBUTE), surface: sheetTemplate(bucketSheet(minifyCss(joined(true))), PART_ATTRIBUTE) }
}

/**
 * Hold every selector's last compound to a bucket key (D101): a selector that
 * stays unkeyed once its lists are written out has to stand in the record with
 * its reason, and a record that names no selector any more is struck — so the
 * record is the whole of what the browser tries on every element, and it only
 * shrinks.
 */
function checkBuckets(unkeyed, srcDir) {
  const file = 'packages/testing/data/unkeyed-selectors.json'
  const record = JSON.parse(fs.readFileSync(path.resolve(srcDir, '..', '..', '..', ...file.split('/')), 'utf8'))
  const recorded = new Set(record.groups.flatMap((group) => group.selectors))
  const missing = [...unkeyed].filter(([selector]) => !recorded.has(selector))
  if (missing.length > 0) {
    throw new Error(`build: ${missing.length} selector(s) end in a compound with no class, id, attribute or tag, so the browser tries them on every element (D101) — name the elements they mean, or record each in ${file} with its reason: ${missing.slice(0, 5).map(([selector, where]) => `${where} "${selector}"`).join('；')}`)
  }
  const stale = [...recorded].filter((selector) => !unkeyed.has(selector))
  if (stale.length > 0) throw new Error(`build: ${file} records ${stale.length} selector(s) no sheet writes unkeyed any more — strike them: ${stale.slice(0, 5).join('；')}`)
}

/**
 * Write every selector of a joined sheet out by its bucket keys (D101). The
 * checks above and the importance record read the selectors as the sources
 * write them, so this runs after them; the part template is cut from its result.
 */
function bucketSheet(text) {
  const root = postcss.parse(text)
  root.walkRules((rule) => {
    if (rule.parent.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return
    const written = bucketSelectors(rule.selector).map((item) => item.selector).join(',')
    if (written !== rule.selector) rule.selector = written
  })
  return root.toString()
}

/**
 * Require every !important declaration in the recorded page audit (D9).
 * DSH_IMPORTANCE_LEDGER=write bypasses the check only while recording that sheet.
 */
function checkImportance(main, srcDir) {
  if (process.env.DSH_IMPORTANCE_LEDGER === 'write') return
  const root = path.resolve(srcDir, '..', '..', '..')
  const ledger = JSON.parse(fs.readFileSync(path.join(root, 'packages', 'testing', 'data', 'importance-ledger.json'), 'utf8')).entries
  const problems = []
  postcss.parse(main).walkRules((rule) => {
    const important = rule.nodes.filter((node) => node.type === 'decl' && node.important)
    if (important.length === 0) return
    const key = ruleKey(rule)
    for (const node of important) {
      if (ledger[`${key}|${node.prop.toLowerCase()}`] !== undefined) continue
      problems.push(`${rule.selector.replace(/\s+/g, ' ').slice(0, 90)} { ${node.prop} }`)
    }
  })
  if (problems.length > 0) {
    throw new Error(`build: ${problems.length} !important declaration(s) the importance walk has not decided — read the page for each (the weight is only for a host !important, an inline style or another skin rule), then record it: ${problems.slice(0, 3).join('；')}`)
  }
}
