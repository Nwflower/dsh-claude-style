#!/usr/bin/env node
/**
 * features.mjs — write the feature docs' list from the feature manifests (D48).
 *
 * Every feature already carries its own title and prose in both languages
 * (description.zh and description.en, which scripts/shared/read-manifests.cjs checks
 * for completeness), so the list of what the plugin does is assembled from the
 * manifests instead of typed a second time. It sits between two markers inside
 * docs/FEATURES.md and docs/FEATURES.en.md, whose heading and lead line are
 * hand-written; the READMEs link to those documents rather than carrying the
 * list.
 *
 * Usage: node scripts/features.mjs [--print | --check]
 *        --print writes nothing and shows the section; --check fails when a
 *        committed document's section differs from the manifests.
 */
import fs from 'node:fs'
import path from 'node:path'
import manifestReader from './shared/read-manifests.cjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const START = '<!-- features:start — written by npm run features, not by hand -->'
const END = '<!-- features:end -->'

/** The documents this fills, each with the language its manifest prose comes in and its own punctuation. */
const DOCUMENTS = [
  { file: 'docs/FEATURES.md', language: 'zh', separator: '：' },
  { file: 'docs/FEATURES.en.md', language: 'en', separator: ': ' },
]

/**
 * The list itself: one bullet per feature in installation order, titled and
 * described from the manifest.
 */
function list(language, separator) {
  const manifests = manifestReader.readManifests().slice().sort((a, b) => a.order - b.order)
  return manifests.map((manifest) => {
    const copy = manifest.description[language]
    return `- **${copy.title}**${separator}${copy.text}`
  }).join('\n')
}

/** The whole section, markers included. */
function section(language, separator) {
  return [START, '', list(language, separator), '', END].join('\n')
}

/** The committed section of one document, or a failure naming what to paste. */
function committed(file) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8')
  const start = text.indexOf(START)
  const end = text.indexOf(END)
  if (start === -1 || end === -1) {
    throw new Error(`features: ${file} has no feature list markers; add these two lines where the list belongs:\n  ${START}\n  ${END}`)
  }
  return text.slice(start, end + END.length)
}

if (process.argv.includes('--print')) {
  for (const { file, language, separator } of DOCUMENTS) console.log(`--- ${file}\n${section(language, separator)}\n`)
} else if (process.argv.includes('--check')) {
  const problems = []
  for (const { file, language, separator } of DOCUMENTS) {
    const built = section(language, separator)
    const current = committed(file)
    if (current !== built) problems.push(`${file}: the feature list is not what the manifests say`)
  }
  if (problems.length > 0) {
    for (const problem of problems) console.error(`features: ${problem}`)
    console.error('features: run `npm run features` to write them')
    process.exitCode = 1
  } else {
    console.log(`features: ${DOCUMENTS.length} feature lists, up to date`)
  }
} else {
  for (const { file, language, separator } of DOCUMENTS) {
    const full = path.join(ROOT, file)
    const text = fs.readFileSync(full, 'utf8')
    committed(file)
    const start = text.indexOf(START)
    const end = text.indexOf(END)
    fs.writeFileSync(full, text.slice(0, start) + section(language, separator) + text.slice(end + END.length))
  }
  console.log(`features: wrote ${DOCUMENTS.length} feature lists`)
}
