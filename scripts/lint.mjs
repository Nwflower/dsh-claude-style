#!/usr/bin/env node
/**
 * lint.mjs — the rules that need no build (D48).
 *
 * The promises the repository makes in prose and a tool can check without
 * guessing: no source file crosses the stop line, every link in the committed
 * Markdown resolves, every decision a comment or a document cites exists
 * (numbers are stable and a retired one stays citable, D48), every repository
 * path prose names exists, and no feature module reaches past the handles its
 * manifest declares (D42). Everything else a tool could enforce is already a
 * build check (D44, D51), the type check or a smoke case.
 *
 * Usage: node scripts/lint.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const DECISIONS = path.join(ROOT, 'docs', 'decisions')
/** The stop line: a source file approaching this gets split, not extended. */
const MAX_LINES = 750
/**
 * Files already past the stop line, with the size they stood at when the rule
 * was written: they may not grow until the split lands.
 */
const OVERSIZE = {}

const problems = []

/** Every file under `dir`, by extension, skipping what the rule does not govern. */
function filesUnder(dir, extensions) {
  const found = []
  const walk = (at) => {
    for (const entry of fs.readdirSync(at, { withFileTypes: true })) {
      const full = path.join(at, entry.name)
      if (entry.isDirectory()) { walk(full); continue }
      if (extensions.some((extension) => entry.name.endsWith(extension))) found.push(full)
    }
  }
  if (fs.existsSync(dir)) walk(dir)
  return found
}

const relative = (file) => path.relative(ROOT, file).replace(/\\/g, '/')

/** The decision numbers that exist, and the ones a replacing decision retired. */
function decisionNumbers() {
  const live = new Set()
  const retired = new Set()
  for (const name of fs.readdirSync(DECISIONS)) {
    if (!/^D\d+-.*\.md$/.test(name)) continue
    live.add(Number(name.match(/^D(\d+)/)[1]))
    const text = fs.readFileSync(path.join(DECISIONS, name), 'utf8')
    const related = text.match(/^- \*\*关联\*\*：(.+)$/m)
    const replaced = related === null ? null : related[1].match(/取代\s*([^；;]+)/)
    if (replaced !== null) for (const number of replaced[1].matchAll(/D(\d+)/g)) retired.add(Number(number[1]))  }
  return { live, retired }
}

// 1. The stop line.
const sources = [
  ...filesUnder(path.join(ROOT, 'packages'), ['.ts', '.tsx', '.css', '.cjs', '.js']),
  ...filesUnder(path.join(ROOT, 'scripts'), ['.mjs', '.cjs', '.js']),
].filter((file) => !/\.test\.tsx?$/.test(file) && !/\.d\.ts$/.test(file))
for (const file of sources) {
  const lines = fs.readFileSync(file, 'utf8').split('\n').length
  const exception = OVERSIZE[relative(file)]
  if (exception === undefined) {
    if (lines > MAX_LINES) problems.push(`${relative(file)}: ${lines} lines, over the ${MAX_LINES}-line stop line`)
  } else if (lines > exception.ceiling) {
    problems.push(`${relative(file)}: ${lines} lines, past its recorded ${exception.ceiling} (${exception.reason})`)
  }
}

// 2. Links in the committed Markdown.
const markdown = [
  ...filesUnder(ROOT, ['.md']).filter((file) => !relative(file).startsWith('.debug/') && !relative(file).startsWith('node_modules/')),
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

// 3. Decision numbers cited by code and documents.
const { live, retired } = decisionNumbers()
const citing = [
  ...sources,
  ...markdown,
  path.join(ROOT, 'AGENTS.md'),
].filter((file, at, all) => all.indexOf(file) === at && fs.existsSync(file))
let citations = 0
for (const file of citing) {
  const text = fs.readFileSync(file, 'utf8')
  const lines = text.split('\n')
  lines.forEach((line, at) => {
    for (const match of line.matchAll(/(?<![\w#-])D(\d{1,3})(?![\w-])/g)) {
      const number = Number(match[1])
      citations += 1
      if (live.has(number) || retired.has(number)) continue
      problems.push(`${relative(file)}:${at + 1}: cites D${number}, which is not a decision`)
    }
  })
}

// 4. A backticked repository path in prose has to exist. Directory mentions and
// placeholder segments are out of reach; the CHANGELOG is a historical record.
// A path that starts at a feature layer names a file under packages/client/src.
const prose = citing.filter((file) => !relative(file).startsWith('CHANGELOG'))
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

// 5. A feature sees `ui` as FeatureUi of its own manifest: its handle and the
// handles the manifest `reads` (D42). The whole registry type is the entry's
// and the scheduler's; a feature module importing it would read any handle
// with nothing declared.
const featureModules = filesUnder(path.join(ROOT, 'packages', 'client', 'src', 'features'), ['.ts', '.tsx']).filter((file) => !/\.(test\.tsx?|manifest\.ts)$/.test(file))
let featureUiChecked = 0
for (const file of featureModules) {
  const text = fs.readFileSync(file, 'utf8')
  if (/\bFeatureUi\b/.test(text)) featureUiChecked += 1
  if (/^import type \{[^}]*\bUi\b[^}]*\} from '[./]+core\/scheduler'/m.test(text)) problems.push(`${relative(file)}: imports the whole ui registry type; type ui as FeatureUi<typeof manifest> and list the handles it reads in the manifest (D42)`)
}

// A rule whose pattern stopped matching anything would pass forever: each of the
// rules has to have looked at something.
if (featureUiChecked === 0) problems.push('lint: no feature module types ui as FeatureUi — the feature rule matches nothing')
if (links === 0) problems.push('lint: no Markdown link was examined — the link pattern matches nothing')
if (citations === 0) problems.push('lint: no decision number was examined — the citation pattern matches nothing')
if (prosePaths === 0) problems.push('lint: no repository path in prose was examined — the path pattern matches nothing')

if (problems.length > 0) {
  for (const problem of problems) console.error(`lint: ${problem}`)
  console.error(`lint: ${problems.length} problems in ${sources.length} sources and ${markdown.length} documents`)
  process.exitCode = 1
} else {
  console.log(`lint: ${sources.length} sources, ${markdown.length} documents, ${links} links, ${citations} decision citations, ${prosePaths} prose paths and ${featureUiChecked} feature modules' ui clean (stop line ${MAX_LINES} lines)`)
}
