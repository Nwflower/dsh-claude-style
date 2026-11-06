#!/usr/bin/env node
/**
 * lint.mjs — the rules that need no build.
 *
 * The promises the repository makes in prose and a tool can check without
 * guessing: no source file crosses the stop line, every link in the committed
 * Markdown resolves, every decision a comment or a document cites exists
 * (numbers are stable and a retired one stays citable, while a decision's own
 * prose names the decision in force), every decision file carries its four
 * sections in order, every repository path prose names exists, no feature
 * module reaches past the handles its manifest
 * declares (D72), no pair of files holds a copied stretch (jscpd), and every
 * spec keeps to the channels and the header D87 sets.
 * Everything else a tool could enforce is already a build check, the type check
 * or a smoke case.
 *
 * Usage: node scripts/lint.mjs
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { filesUnder } from './shared/file-walk.mjs'
import { checkWorkOrders } from './work.mjs'
import { createTemporaryFiles } from './shared/temporary-files.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const DECISIONS = path.join(ROOT, 'docs', 'adr')
/** The stop line: a source file approaching this gets split, not extended. */
const MAX_LINES = 750
/**
 * Files already past the stop line, with the size they stood at when the rule
 * was written: they may not grow until the split lands.
 */
const OVERSIZE = {}

const problems = []

/**
 * What the walk never enters: a directory of local scratch a rule does not
 * govern. `.claude/` holds the editor's own state (gitignored), and a whole
 * second copy of every document inside one would be read as the repository's
 * own files.
 */
const SKIPPED_DIRS = new Set(['.git', '.debug', '.claude', 'node_modules'])

const relative = (file) => path.relative(ROOT, file).replace(/\\/g, '/')

/**
 * The decision numbers that exist and the ones a replacing decision retired.
 * Numbers retired without a successor sit in retired.txt, one per line; a
 * number is never reused, so this set only grows.
 */
function decisionNumbers() {
  const live = new Set()
  const retired = new Set()
  for (const name of fs.readdirSync(DECISIONS)) {
    if (!/^D\d+-.*\.md$/.test(name)) continue
    live.add(Number(name.match(/^D(\d+)/)[1]))
    const text = fs.readFileSync(path.join(DECISIONS, name), 'utf8')
    const replaced = text.match(/^- \*\*取代\*\*：(.+)$/m)
    if (replaced !== null) for (const number of replaced[1].matchAll(/D(\d+)/g)) retired.add(Number(number[1]))
  }
  const retiredFile = path.join(DECISIONS, 'retired.txt')
  if (fs.existsSync(retiredFile)) {
    fs.readFileSync(retiredFile, 'utf8').split('\n').forEach((line, at) => {
      const trimmed = line.trim()
      if (trimmed === '' || trimmed.startsWith('#')) return
      const entry = trimmed.match(/^D(\d+)$/)
      if (entry === null) { problems.push(`docs/adr/retired.txt:${at + 1}: not a bare number: ${trimmed}`); return }
      retired.add(Number(entry[1]))
    })
  }
  return { live, retired }
}

// 1. The stop line. A unit test file counts like any other: a test that grew
// past the line is one file holding several subjects, which is the shape the
// line exists to catch (D87). Declaration files are generated and stand aside.
const sources = [
  ...filesUnder(path.join(ROOT, 'packages'), ['.ts', '.css', '.mjs', '.js'], SKIPPED_DIRS),
  ...filesUnder(path.join(ROOT, 'scripts'), ['.mjs', '.mjs', '.js'], SKIPPED_DIRS),
].filter((file) => !/\.d\.ts$/.test(file))
for (const file of sources) {
  const lines = fs.readFileSync(file, 'utf8').split('\n').length
  const exception = OVERSIZE[relative(file)]
  if (exception === undefined) {
    if (lines > MAX_LINES) problems.push(`${relative(file)}: ${lines} lines, over the ${MAX_LINES}-line stop line`)
  } else if (lines > exception.ceiling) {
    problems.push(`${relative(file)}: ${lines} lines, past its recorded ${exception.ceiling} (${exception.reason})`)
  }
}

// The engine's dependency direction (D73): it serves the skin and talks to the
// host, so it may read the shared contract and the host's own packages, and
// nothing of the skin it serves — no client or host module, no generated module
// carrying the skin's own vocabulary.
const ENGINE = path.join(ROOT, 'packages', 'engine', 'src')
for (const file of sources.filter((candidate) => /^packages\/engine\/(?:src|node)\//.test(relative(candidate)))) {
  const text = fs.readFileSync(file, 'utf8')
  for (const match of text.matchAll(/from '([^']+)'/g)) {
    const specifier = match[1]
    const intoSkin = specifier.startsWith('@dsh-claude-style/client')
      || specifier.startsWith('@dsh-claude-style/host')
      || specifier.startsWith('virtual:dsh-claude-style/')
      || specifier.includes('../client/')
      || specifier.includes('../host/')
    if (intoSkin) problems.push(`${relative(file)}: the engine imports ${specifier}; the skin hands what the engine needs over the seam (packages/engine/src/skin.ts, D73)`)
  }
}

// 2. Links in the committed Markdown.
const markdown = [
  ...filesUnder(ROOT, ['.md'], SKIPPED_DIRS).filter((file) => !relative(file).startsWith('.debug/') && !relative(file).startsWith('node_modules/')),
]
let links = 0
for (const file of markdown) {
  const text = fs.readFileSync(file, 'utf8')
  for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1]
    if (/^(?:https?:|mailto:|#)/.test(target)) continue
    const [clean] = target.split('#')
    if (clean === '') continue
    links += 1
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(clean))
    if (!fs.existsSync(resolved)) problems.push(`${relative(file)}: link to ${target} resolves to nothing`)
  }
}

// 3. Decision numbers cited by code and documents. A retired number stays
// citable (D48): a comment or an older record points at it and the index leads
// on to the decision that replaced it. A decision file is where the reader
// stops, so its own prose names the decision in force — only its 取代 line, and
// the index generated from those lines, name retired numbers.
const { live, retired } = decisionNumbers()
const citing = [
  ...sources,
  ...markdown,
  path.join(ROOT, 'AGENTS.md'),
  // The licence file is prose as well, and names repository paths the same way.
  path.join(ROOT, 'LICENSE'),
].filter((file, at, all) => all.indexOf(file) === at && fs.existsSync(file))
const DECISION_FILE = /^docs\/adr\/D\d+-.*\.md$/
const REPLACES_LINE = /^\s*[-*]\s*\*\*取代\*\*：/
let citations = 0
let decisionProse = 0
for (const file of citing) {
  const text = fs.readFileSync(file, 'utf8')
  const lines = text.split('\n')
  const isDecision = DECISION_FILE.test(relative(file))
  lines.forEach((line, at) => {
    for (const match of line.matchAll(/(?<![\w#-])D(\d{1,3})(?![\w-])/g)) {
      const number = Number(match[1])
      citations += 1
      if (live.has(number)) {
        if (isDecision) decisionProse += 1
        continue
      }
      if (retired.has(number)) {
        if (isDecision && !REPLACES_LINE.test(line)) problems.push(`${relative(file)}:${at + 1}: cites D${number}, which a later decision replaced; name the decision in force`)
        continue
      }
      problems.push(`${relative(file)}:${at + 1}: cites D${number}, which is not a decision`)
    }
  })
}

// 4. The shape of a decision file (D48): 背景、决定、后果 and 重审条件 in that
// order, the last one saying when the direction is worth revisiting.
const SECTIONS = ['## 背景', '## 决定', '## 后果', '## 重审条件']
let decisionFiles = 0
for (const name of fs.readdirSync(DECISIONS)) {
  if (!/^D\d+-.*\.md$/.test(name)) continue
  decisionFiles += 1
  const lines = fs.readFileSync(path.join(DECISIONS, name), 'utf8').split('\n')
  const headings = lines.filter((line) => line.startsWith('## '))
  if (headings.join(' / ') !== SECTIONS.join(' / ')) {
    problems.push(`docs/adr/${name}: its sections are ${headings.join(' ')}; a decision carries ${SECTIONS.join('、')} in that order (D48)`)
    continue
  }
  if (lines.slice(lines.indexOf('## 重审条件') + 1).every((line) => line.trim() === '')) {
    problems.push(`docs/adr/${name}: 重审条件 says nothing; write the condition, or 「无。」 (D48)`)
  }
}

// 5. A backticked repository path in prose has to exist. Directory mentions and
// placeholder segments are out of reach; the CHANGELOG is a historical record.
// A path that starts at a feature layer names a file under packages/client/src.
const prose = citing.filter((file) => !relative(file).endsWith('CHANGELOG.md'))
const PROSE_PATHS = [
  { pattern: /`((?:packages|scripts|docs|tests|changes|locale)\/[^`\s]+?\.[a-z0-9]+)`/g, base: ROOT },
  { pattern: /`((?:features|core|shared|theme)\/[^`\s]+?\.[a-z0-9]+)`/g, base: path.join(ROOT, 'packages', 'client', 'src') },
]
let prosePaths = 0
for (const file of prose) {
  const text = fs.readFileSync(file, 'utf8')
  const lines = text.split('\n')
  lines.forEach((line, at) => {
    for (const { pattern, base } of PROSE_PATHS) {
      for (const match of line.matchAll(pattern)) {
        const mention = match[1]
        if (mention.includes('<') || mention.includes('*')) continue
        prosePaths += 1
        if (!fs.existsSync(path.resolve(base, mention))) problems.push(`${relative(file)}:${at + 1}: names ${mention}, which does not exist`)
      }
    }
  })
}

// 6. A feature sees `ui` as FeatureUi of its own manifest: its handle and the
// handles the manifest `reads` (D72). The whole registry type is the entry's
// and the scheduler's; a feature module importing it would read any handle
// with nothing declared.
const featureModules = filesUnder(path.join(ROOT, 'packages', 'client', 'src', 'features'), ['.ts'], SKIPPED_DIRS).filter((file) => !/\.(test|manifest)\.ts$/.test(file))
let featureUiChecked = 0
for (const file of featureModules) {
  const text = fs.readFileSync(file, 'utf8')
  if (/\bFeatureUi\b/.test(text)) featureUiChecked += 1
  if (/^import type \{[^}]*\bUi\b[^}]*\} from '[./]+core\/scheduler'/m.test(text)) problems.push(`${relative(file)}: imports the whole ui registry type; type ui as FeatureUi<typeof manifest> and list the handles it reads in the manifest (D72)`)
  // A host service is read through an accessor in the engine's host.ts, which owns its
  // name, its shape and the answer where the host carries none (D3, D73).
  text.split('\n').forEach((line, at) => {
    if (/^\s*(\*|\/\/|\/\*)/.test(line)) return
    if (/\b(?:ctx|scope|lookup)\??\.get\(/.test(line)) problems.push(`${relative(file)}:${at + 1}: reads a host service by name; add an accessor to packages/engine/src/host.ts and call it (D73)`)
  })
}

// 7. Copied code (jscpd, scanned as .jscpd.json says): a pattern's second copy
// is where it moves into the shared layer, so any copy at all fails, and so
// does a scan that read nothing. `npx jscpd` lists every copy.
const copies = spawnSync(process.execPath, [
  path.join(ROOT, 'node_modules', 'jscpd', 'run-jscpd.js'),
  '--threshold', '0',
  '--fail-on-empty',
  '--reporters', 'console',
  '--no-colors',
], { cwd: ROOT, encoding: 'utf8' })
if (copies.status !== 0) {
  // The console report lists every copy, each followed by its two places.
  problems.push(`copied code; move the shared part into the shared layer (npx jscpd lists every copy):\n${copies.stdout}${copies.stderr}`)
}

// 8. The whole-document lookups the browser half makes outside the modules that
// own them (D9): a lookup inside a refresh pass or a frame callback costs the
// page's own size on every frame of a long conversation, and each of the
// regressions behind that cost was one such call. A query by an element's id is
// not counted: the browser answers it from its own index rather than by walking
// the tree. The sanctioned readers are the accessors and registries that cache
// their answer — the engine's host.ts, bus.ts and chat-dom.ts, and the sheet the
// engine's stylesheet.ts mounts itself. Every other site is recorded in
// packages/testing/data/document-lookups.json with the reason it is still there: a
// file's count has to match its entry, and an entry whose count reaches zero
// comes out of the file. That the record's total never rises is held against
// the base by scripts/ci-scope.mjs --ledgers. A unit test stands outside the
// rule: its document runs in the test browser and costs no reader anything.
const LOOKUP = /document\.(?:querySelectorAll|querySelector)(?:<[^>]*>)?\s*\(|document\.body\.(?:querySelectorAll|querySelector)(?:<[^>]*>)?\s*\(|removeStrayNodes\(\s*document\b/g
const LOOKUP_OWNERS = new Set([
  'packages/engine/src/host.ts',
  'packages/engine/src/bus.ts',
  'packages/engine/src/stylesheet.ts',
  'packages/engine/src/chat-dom.ts',
])
const recordedLookups = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', 'testing', 'data', 'document-lookups.json'), 'utf8')).files
let lookups = 0
for (const file of sources) {
  if (!file.endsWith('.ts') || /\.test\.ts$/.test(file) || relative(file).includes('packages/testing/')) continue
  if (LOOKUP_OWNERS.has(relative(file))) continue
  const count = (fs.readFileSync(file, 'utf8').match(LOOKUP) ?? []).length
  lookups += count
  const entry = recordedLookups[relative(file)]
  if (count === 0) {
    if (entry !== undefined) problems.push(`packages/testing/data/document-lookups.json: ${relative(file)} records ${entry.count} whole-document lookups and the file has none — take the entry out`)
    continue
  }
  if (entry === undefined) {
    problems.push(`${relative(file)}: ${count} whole-document ${count === 1 ? 'lookup' : 'lookups'} with no entry in packages/testing/data/document-lookups.json — read the seat through the engine's host.ts accessors or bus.ts registry, or record it there with the reason it stays`)
    continue
  }
  if (entry.count !== count) {
    problems.push(`packages/testing/data/document-lookups.json: ${relative(file)} records ${entry.count} whole-document lookups and the file has ${count} — write the count down again with the reason it changed`)
  }
}
for (const file of Object.keys(recordedLookups)) {
  if (fs.existsSync(path.join(ROOT, file))) continue
  problems.push(`packages/testing/data/document-lookups.json: ${file} is gone from the tree — take its entry out`)
}

// 9. The bounds a check compares against, and every name a check asks for.
// packages/testing/data/bounds.json is where a limit on a reading lives, each with
// the reason it holds its value, so loosening one is a line in a diff rather
// than a number buried in an assertion (D87). A name nothing reads
// means the rule it guards is gone; a name something reads and the table does
// not hold fails where it is read, which is why the pass over the sources is
// part of the rule rather than a comment on the table.
const boundsFile = path.join(ROOT, 'packages', 'testing', 'data', 'bounds.json')
const readBounds = JSON.parse(fs.readFileSync(boundsFile, 'utf8'))
if (!Array.isArray(readBounds.bounds) || readBounds.bounds.length === 0) {
  problems.push('packages/testing/data/bounds.json: the table holds no bounds')
}
const boundNames = new Set()
for (const entry of readBounds.bounds) {
  if (typeof entry.name !== 'string' || entry.name === '') {
    problems.push('packages/testing/data/bounds.json: a bound has no name')
    continue
  }
  boundNames.add(entry.name)
  if (typeof entry.value !== 'number' || !Number.isFinite(entry.value)) {
    problems.push(`packages/testing/data/bounds.json: ${entry.name} is not a finite number`)
  }
  if (typeof entry.reason !== 'string' || entry.reason.trim().length < 40) {
    problems.push(`packages/testing/data/bounds.json: ${entry.name} carries no reason for its value`)
  }
}
if (boundNames.size !== readBounds.bounds.length) {
  problems.push('packages/testing/data/bounds.json: a name stands twice in the table')
}
const readBound = /bound\(\s*'([A-Za-z0-9_]+)'/g
const askedBounds = new Set()
let boundReads = 0
for (const file of sources) {
  if (!file.endsWith('.mjs') || !relative(file).startsWith('packages/testing/')) continue
  if (relative(file) === 'packages/testing/bounds.mjs') continue
  const text = fs.readFileSync(file, 'utf8')
  for (const match of text.matchAll(readBound)) {
    if (match[1] === 'name') continue
    askedBounds.add(match[1])
    boundReads += 1
  }
}
for (const name of askedBounds) {
  if (!boundNames.has(name)) problems.push(`packages/testing/data/bounds.json: ${name} is read by a check and the table does not hold it`)
}
for (const name of boundNames) {
  if (!askedBounds.has(name)) problems.push(`packages/testing/data/bounds.json: ${name} is in the table and no check reads it — take the entry out, or read it where its rule lives`)
}
if (boundReads === 0) problems.push('lint: no bound was read — the bounds pattern matches nothing')

// 10. The specs (D87). A spec reaches the product through three channels only —
// the declared logic surface, the contract and engine packages, and what the
// reader sees on the built page — and it names the skin's and the host's own
// marks through the surface table and the host contract, never by spelling
// them. Each opens with the header the runners, the fault corpus and the
// coverage read (scripts/shared/spec-header.mjs).
const require = createRequire(import.meta.url)
const { AREAS, specFiles, readHeader } = require('./shared/spec-header.mjs')
const featureDirs = new Set(fs.readdirSync(path.join(ROOT, 'packages', 'client', 'src', 'features'), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name))
/** What a spec may import or require by name; a relative path must stay inside packages/testing/specs/. */
const SPEC_IMPORTS = [/^vitest$/, /^vitest\/browser$/, /^fast-check$/, /^@dsh-claude-style\/client\/pure$/, /^@dsh-claude-style\/contracts\/[\w-]+$/, /^@dsh-claude-style\/engine\/[\w-]+$/]
/**
 * Calls that put a stand-in where the product's own code runs, or freeze an
 * output instead of judging it. The bracket form is the same call to the
 * engine, so it is refused by name too; the stub calls install a stand-in
 * globally and are refused for the same reason.
 */
const REFUSED_NAMES = 'mock|doMock|importMock|importActual|hoisted|stubGlobal|stubEnv'
const SPEC_REFUSED = [
  new RegExp(`\\bvi\\.(?:${REFUSED_NAMES})\\s*\\(`),
  new RegExp(`\\bvi\\[\\s*['"](?:${REFUSED_NAMES})['"]\\s*\\]\\s*\\(`),
  /\.toMatch(?:Inline|File)?Snapshot\s*\(/,
]
/** Watching the browser's own methods is allowed only for a cost the decisions name, said beside it. */
const SPEC_WATCHES = new RegExp(`\\bvi\\.spyOn\\s*\\(|\\bvi\\[\\s*['"]spyOn['"]\\s*\\]\\s*\\(|\\.prototype\\.\\w+\\s*=(?!=)`)
/** A host mark spelled out: a skin mark, a host attribute, a host's hashed class name. */
const SPEC_SPELLED = [
  { pattern: /(?<![@\w])(?:data-)?dsh-claude-(?!style\/)[a-z][\w-]*/, what: 'a skin mark; read it from packages/testing/data/surface.json' },
  { pattern: /['"`[]data-(?!test-)[a-z][\w-]*/, what: 'a host attribute; read it from packages/contracts (by constant or by table id)' },
  { pattern: /['"`]\.?_[A-Za-z]+_[A-Za-z0-9]+(?:_\d+)?['"`]/, what: 'a host class name; read it from the engine\'s part tables' },
]
/** A class name assembled from its own prefix at run time keeps the source free of the name. */
const CONCATENATED_CLASS = /['"`]_?[A-Za-z]+_['"`]\s*\+/
const specs = specFiles()
const spellingSpec = (file) => /\.spec\.(ts|mjs)$/.test(file)
/**
 * A stand-in page may carry a host's hashed class name: nothing in the part
 * tables names the rail ui-attachment draws a draft's files into until the walk
 * has marked it, and the page has to draw that rail itself.
 */
const standInPage = (file) => file.startsWith('packages/testing/smoke/')
/** Where a spec stands: `<layer>/<capability>/<name>.spec.(ts|mjs)`, and nowhere else. */
const SPEC_PLACE = /^packages\/testing\/specs\/(logic|mechanism|behaviour)\/[^/]+\/[^/]+\.spec\.(ts|mjs)$/
for (const file of specs) {
  if (!SPEC_PLACE.test(file)) problems.push(`${file}: a spec stands at packages/testing/specs/<layer>/<capability>/<name>.spec.(ts|mjs) (D87)`)
  const header = readHeader(file)
  if (!header.hasHeader) { problems.push(`${file}: opens with no header comment carrying @capability, @features and @risk (D87)`); continue }
  if (header.capability !== header.directory) problems.push(`${file}: @capability "${header.capability}" is not the directory it sits in (${header.directory})`)
  if (header.features.length === 0) problems.push(`${file}: @features names nothing`)
  for (const feature of header.features) {
    if (!featureDirs.has(feature) && !AREAS.includes(feature)) problems.push(`${file}: @features names "${feature}", which is neither a feature directory nor one of ${AREAS.join(', ')}`)
  }
  if (typeof header.risk !== 'string' || header.risk.trim().length < 40) problems.push(`${file}: @risk does not say, in the reader's terms, what goes wrong when it fails`)
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8')
  const lines = text.split('\n')
  // Every way a module reaches the file by name: a static import (side-effect
  // ones carry no binding), an export-from, a require and a dynamic import,
  // each quoted with either mark.
  const specifiers = [...text.matchAll(/\bfrom\s*['"]([^'"]+)['"]|\brequire\s*\(\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]|\bimport\s+['"]([^'"]+)['"]/g)]
    .map((match) => match[1] ?? match[2] ?? match[3] ?? match[4])
  for (const specifier of specifiers) {
    if (specifier.startsWith('.')) {
      const resolved = path.resolve(path.dirname(path.join(ROOT, file)), specifier)
      if (!relative(resolved).startsWith('packages/testing/specs/')) problems.push(`${file}: reaches ${specifier} outside packages/testing/specs/; reach the product through its declared surface (D87)`)
      continue
    }
    if (file.endsWith('.mjs') && specifier.startsWith('node:')) continue
    if (!SPEC_IMPORTS.some((allowed) => allowed.test(specifier))) problems.push(`${file}: imports ${specifier}; a spec reaches the product through @dsh-claude-style/client/pure, the contracts and the engine's public modules (D87)`)
  }
  lines.forEach((line, at) => {
    if (/^\s*(\*|\/\/|\/\*)/.test(line)) return
    for (const refused of SPEC_REFUSED) if (refused.test(line)) problems.push(`${file}:${at + 1}: puts a stand-in where the product runs, or freezes an output instead of judging it (D87)`)
    if (SPEC_WATCHES.test(line) && !lines.slice(Math.max(0, at - 2), at + 1).some((near) => /\/\/\s*cost: D\d+/.test(near))) {
      problems.push(`${file}:${at + 1}: watches a method; say the cost a decision names beside it (// cost: D<n> — …)`)
    }
    if (!spellingSpec(file)) return
    for (const { pattern, what } of SPEC_SPELLED) {
      if (!pattern.test(line)) continue
      // A class name built from its own prefix at run time spells no name.
      if (what.startsWith('a host class') && CONCATENATED_CLASS.test(line)) continue
      problems.push(`${file}:${at + 1}: spells ${what} (D87)`)
    }
  })
}

// The surface table (packages/testing/data/surface.json): each entry names a mark
// the browser half writes, under one id, and a spec reads every entry.
const surfaceTable = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', 'testing', 'data', 'surface.json'), 'utf8')).surface
const clientText = filesUnder(path.join(ROOT, 'packages', 'client', 'src'), ['.ts', '.css'], SKIPPED_DIRS).map((file) => fs.readFileSync(file, 'utf8')).join('\n')
const specText = specs.map((file) => fs.readFileSync(path.join(ROOT, file), 'utf8')).join('\n')
const surfaceIds = new Set()
for (const entry of surfaceTable) {
  if (surfaceIds.has(entry.id)) problems.push(`packages/testing/data/surface.json: "${entry.id}" stands twice`)
  surfaceIds.add(entry.id)
  if ((entry.selector === undefined) === (entry.attribute === undefined)) problems.push(`packages/testing/data/surface.json: "${entry.id}" names neither or both of a selector and an attribute`)
  if (!featureDirs.has(entry.feature) && !AREAS.includes(entry.feature)) problems.push(`packages/testing/data/surface.json: "${entry.id}" belongs to "${entry.feature}", which is no feature directory`)
  if (typeof entry.sees !== 'string' || entry.sees.length < 20) problems.push(`packages/testing/data/surface.json: "${entry.id}" does not say what the reader sees there`)
  const names = entry.attribute !== undefined ? [entry.attribute] : [...String(entry.selector).matchAll(/\.([\w-]+)|\[([\w-]+)/g)].map((match) => match[1] ?? match[2])
  for (const name of names) {
    if (!clientText.includes(name)) problems.push(`packages/testing/data/surface.json: "${entry.id}" names ${name}, which the browser half never writes`)
  }
  if (!specText.includes(`'${entry.id}'`)) problems.push(`packages/testing/data/surface.json: "${entry.id}" is read by no spec — take the entry out`)
}
for (const match of specText.matchAll(/surface(?:Attribute|Class|Selector|\.attribute)?\('([\w.-]+)'\)/g)) {
  if (!surfaceIds.has(match[1])) problems.push(`a spec reads the surface entry "${match[1]}", which packages/testing/data/surface.json does not hold`)
}

// The quarantine (packages/testing/data/quarantine.json): each entry is a behaviour
// test that exists, with the defect it fails over said in the reader's terms.
for (const entry of JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', 'testing', 'data', 'quarantine.json'), 'utf8')).tests) {
  const [layer, capability, ...rest] = entry.id.replace(/@[\w.]+$/g, '').split('/')
  const name = rest.join('/')
  const owner = specs.filter((file) => file.startsWith(`packages/testing/specs/${layer}/${capability}/`))
    .find((file) => fs.readFileSync(path.join(ROOT, file), 'utf8').includes(`test('${name.replace(/'/g, "\\'")}'`))
  if (layer !== 'behaviour' || owner === undefined) problems.push(`packages/testing/data/quarantine.json: "${entry.id}" is no behaviour test`)
  if (typeof entry.defect !== 'string' || entry.defect.length < 40) problems.push(`packages/testing/data/quarantine.json: "${entry.id}" does not name the defect it fails over`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(entry.since))) problems.push(`packages/testing/data/quarantine.json: "${entry.id}" carries no date it entered`)
}

// A width media query reads the window unzoomed, so a page drawn at a zoom
// would keep the layout of a window its own width is not: the stylesheets read
// the page's width marks instead (packages/client/src/shared/page-scale.ts).
for (const match of clientText.matchAll(/@media[^{]*\((?:max|min)-width:\s*\d+px\)/g)) {
  problems.push(`packages/client/src/: "${match[0]}" reads the window unzoomed — read the page's width mark (data-dsh-claude-page-under-<width>, shared/page-scale.ts) instead`)
}

// The release matrix's viewport bands (packages/testing/data/matrix.json) stand on
// both sides of every page width breakpoint the stylesheets read, so no layout
// the skin draws goes unwalked.
const bands = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', 'testing', 'data', 'matrix.json'), 'utf8')).bands
let breakpoints = 0
for (const match of new Set(clientText.match(/data-dsh-claude-page-under-\d+/g) ?? [])) {
  breakpoints += 1
  const edge = Number(match.slice(match.lastIndexOf('-') + 1))
  if (!bands.some((band) => band.width <= edge) || !bands.some((band) => band.width > edge)) {
    problems.push(`packages/testing/data/matrix.json: no band stands on each side of the ${edge}px breakpoint the stylesheets declare`)
  }
}

// The skin's marks spelled out in the smoke's and the lane's own code, which
// predate the surface table: a count per file that only shrinks
// (packages/testing/data/skin-literals.json, held against the base by
// scripts/ci-scope.mjs --ledgers). New code reads the table, except for the
// smoke's stand-in form, which writes a mark the host would have written.
const SKIN_MARK = /(?<![@\w/.])(?:data-)?dsh-claude-(?!style\b)[a-z][\w-]*/g
const recordedMarks = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', 'testing', 'data', 'skin-literals.json'), 'utf8')).files
/** The page that draws the host's own markup, where a skin mark is what the host's copy of it carries. */
const STAND_IN_FORM = 'packages/testing/smoke/page.mjs'
/** A skin mark the stand-in form writes for the host's own markup, which never enters the count above. */
const STAND_IN_MARK = /data-dsh-claude-part="input-grow"|id="\$\{HOST_HINT_ID\}"/g
let spelledMarks = 0
for (const file of sources) {
  const rel = relative(file)
  if (!rel.startsWith('packages/testing/') || rel.startsWith('packages/testing/specs/')) continue
  let text = fs.readFileSync(file, 'utf8')
  if (rel === STAND_IN_FORM) text = text.replace(STAND_IN_MARK, '')
  const count = (text.match(SKIN_MARK) ?? []).length
  spelledMarks += count
  const recorded = recordedMarks[rel] ?? 0
  if (count > recorded) problems.push(`${rel}: spells ${count} skin marks, past the ${recorded} packages/testing/data/skin-literals.json records — read new ones from packages/testing/data/surface.json`)
  if (count < recorded) problems.push(`packages/testing/data/skin-literals.json: ${rel} records ${recorded} skin marks and the file has ${count} — write the smaller count down`)
}
for (const file of Object.keys(recordedMarks)) {
  if (!fs.existsSync(path.join(ROOT, file))) problems.push(`packages/testing/data/skin-literals.json: ${file} is gone from the tree — take its entry out`)
}

// A rule whose pattern stopped matching anything would pass forever: each of the
// rules has to have looked at something.
if (specs.length === 0) problems.push('lint: no spec was examined — the spec rule matches nothing')
if (breakpoints === 0) problems.push('lint: no viewport breakpoint was read — the matrix rule matches nothing')
if (featureUiChecked === 0) problems.push('lint: no feature module types ui as FeatureUi — the feature rule matches nothing')
if (links === 0) problems.push('lint: no Markdown link was examined — the link pattern matches nothing')
if (citations === 0) problems.push('lint: no decision number was examined — the citation pattern matches nothing')
if (decisionProse === 0) problems.push('lint: no decision file named a decision in force — the decision-citation rule matches nothing')
if (decisionFiles === 0) problems.push('lint: no decision file was read — the decision-shape rule matches nothing')
if (prosePaths === 0) problems.push('lint: no repository path in prose was examined — the path pattern matches nothing')
if (lookups === 0) problems.push('lint: no whole-document lookup was counted — the lookup rule matches nothing')

// Work orders live under .debug/work: their facts are transient, so this reads
// the local tree only and passes in CI, where the directory is absent.
for (const result of [checkWorkOrders(), createTemporaryFiles(ROOT).check()]) {
  problems.push(...result.problems)
  for (const warning of result.warnings) console.warn(`lint: ${warning}`)
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`lint: ${problem}`)
  console.error(`lint: ${problems.length} problems in ${sources.length} sources and ${markdown.length} documents`)
  process.exitCode = 1
} else {
  console.log(`lint: ${sources.length} sources, ${markdown.length} documents, ${links} links, ${citations} decision citations in ${decisionFiles} decision files, ${prosePaths} prose paths, ${lookups} recorded whole-document lookups, ${featureUiChecked} feature modules' ui, ${specs.length} specs and ${spelledMarks} recorded skin marks in the older test code clean (stop line ${MAX_LINES} lines; no copied code anywhere)`)
}
