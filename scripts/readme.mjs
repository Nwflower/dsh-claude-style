#!/usr/bin/env node
/**
 * readme.mjs — write the READMEs' feature list from the feature manifests (D48).
 *
 * Every feature already carries its own title and prose in both languages
 * (description.zh and description.en, which scripts/read-manifests.cjs checks
 * for completeness), so the list of what the plugin does is assembled from the
 * manifests instead of typed a second time. The section sits between two markers
 * and everything around them is the README's own hand-written prose.
 *
 * Usage: node scripts/readme.mjs [--print | --check]
 *        --print writes nothing and shows the section; --check fails when a
 *        committed README's section differs from the manifests.
 */
import fs from 'node:fs'
import path from 'node:path'
import manifestReader from './read-manifests.cjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const START = '<!-- features:start — written by npm run readme, not by hand -->'
const END = '<!-- features:end -->'

/** The READMEs this fills, each with the language its manifest prose comes in and its own punctuation. */
const READMES = [
  { file: 'README.md', language: 'zh', separator: '：' },
  { file: 'README.en.md', language: 'en', separator: ': ' },
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

/** The committed section of one README, or a failure naming what to paste. */
function committed(file) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8')
  const start = text.indexOf(START)
  const end = text.indexOf(END)
  if (start === -1 || end === -1) {
    throw new Error(`readme: ${file} has no feature list markers; add these two lines where the list belongs:\n  ${START}\n  ${END}`)
  }
  return text.slice(start, end + END.length)
}

if (process.argv.includes('--print')) {
  for (const { file, language, separator } of READMES) console.log(`--- ${file}\n${section(language, separator)}\n`)
} else if (process.argv.includes('--check')) {
  const problems = []
  for (const { file, language, separator } of READMES) {
    const built = section(language, separator)
    const current = committed(file)
    if (current !== built) problems.push(`${file}: the feature list is not what the manifests say`)
  }
  if (problems.length > 0) {
    for (const problem of problems) console.error(`readme: ${problem}`)
    console.error('readme: run `npm run readme` to write them')
    process.exitCode = 1
  } else {
    console.log(`readme: ${READMES.length} feature lists, up to date`)
  }
} else {
  for (const { file, language, separator } of READMES) {
    const full = path.join(ROOT, file)
    const text = fs.readFileSync(full, 'utf8')
    committed(file)
    const start = text.indexOf(START)
    const end = text.indexOf(END)
    fs.writeFileSync(full, text.slice(0, start) + section(language, separator) + text.slice(end + END.length))
  }
  console.log(`readme: wrote ${READMES.length} feature lists`)
}
