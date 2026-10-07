#!/usr/bin/env node
/**
 * changelog.mjs — assemble CHANGELOG.md's [Unreleased] section from docs/changes/ (D48).
 *
 * A change adds one small JSON file under docs/changes/ and never edits the
 * CHANGELOG: the file carries its group, where it sits in that group, whether it
 * moves an external contract, the date it landed and the entry in both
 * languages. This script turns the pending files into the section the reader
 * sees, so the section cannot drift from what the changes actually are. At
 * release the same assembly becomes the version's section and the files are
 * cleared.
 *
 * Usage: node scripts/changelog.mjs [--check | --release <version> [--date <YYYY-MM-DD>]]
 *        --check writes nothing and fails when the committed section differs.
 *        --release turns the pending changes into the version's section, puts it
 *        above the older ones, and clears docs/changes/.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const CHANGES = path.join(ROOT, 'docs', 'changes')
const FILE = path.join(ROOT, 'CHANGELOG.md')

/** The groups in their fixed order, with the heading each language uses. */
const GROUPS = [
  { key: 'new', zh: '新增功能', en: 'New Features' },
  { key: 'improvements', zh: '体验优化', en: 'Improvements' },
  { key: 'fixes', zh: '问题修复', en: 'Bug Fixes' },
  { key: 'security', zh: '安全', en: 'Security' },
  { key: 'removals', zh: '移除', en: 'Removals' },
  { key: 'chores', zh: '其他变更', en: 'Chores' },
]

/** Every pending change, read and validated. */
function readFragments() {
  if (!fs.existsSync(CHANGES)) throw new Error('changelog: docs/changes/ does not exist')
  const fragments = []
  for (const name of fs.readdirSync(CHANGES)) {
    if (!/^[a-z0-9][a-z0-9-]*\.json$/.test(name)) throw new Error(`changelog: docs/changes/${name} is not <slug>.json`)
    const fragment = JSON.parse(fs.readFileSync(path.join(CHANGES, name), 'utf8'))
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fragment.at ?? '')) throw new Error(`changelog: docs/changes/${name} needs an "at" date (YYYY-MM-DD)`)
    if (!GROUPS.some((group) => group.key === fragment.group)) throw new Error(`changelog: docs/changes/${name} has group "${fragment.group}", which is not one of ${GROUPS.map((group) => group.key).join(', ')}`)
    if (!Number.isSafeInteger(fragment.order) || fragment.order < 0) throw new Error(`changelog: docs/changes/${name} needs "order", an integer from 0, saying where it sits in its group`)
    if (typeof fragment.external !== 'boolean') throw new Error(`changelog: docs/changes/${name} needs "external" as true or false`)
    for (const language of ['zh', 'en']) {
      const text = fragment[language]
      if (typeof text !== 'string' || text.trim() === '') throw new Error(`changelog: docs/changes/${name} has no "${language}" entry`)
      if (text.includes('\n')) throw new Error(`changelog: docs/changes/${name}'s "${language}" entry must be one line`)
    }
    fragments.push({ name, ...fragment })
  }
  return fragments.sort((a, b) => a.at === b.at ? a.name.localeCompare(b.name) : a.at.localeCompare(b.at))
}

/**
 * The section's body: the Chinese groups in order, then the English ones. The
 * first heading of each language carries the anchor that language's line points
 * at, so the anchors stay on whichever group happens to come first.
 */
function body(fragments) {
  const lines = []
  for (const [language, anchor] of [['zh', 'cn-unreleased'], ['en', 'en-unreleased']]) {
    const groups = GROUPS.filter((group) => fragments.some((fragment) => fragment.group === group.key))
    groups.forEach((group, at) => {
      const heading = language === 'zh' ? group.zh : group.en
      lines.push('', at === 0 ? `<h3 id="${anchor}">${heading}</h3>` : `### ${heading}`, '')
      const entries = fragments
        .filter((entry) => entry.group === group.key)
        .sort((a, b) => a.order === b.order ? a.name.localeCompare(b.name) : a.order - b.order)
      for (const fragment of entries) lines.push(`- ${fragment[language]}`)
    })
  }
  return lines
}

/** The whole [Unreleased] section: its heading, the language line, the groups, and the blank line after it. */
function section(fragments) {
  if (fragments.length === 0) return '## [Unreleased]\n\n'
  return `${['## [Unreleased]', '', '[中文](#cn-unreleased) | [English](#en-unreleased)', ...body(fragments)].join('\n')}\n\n`
}

/** One released version's section, anchored by its own number rather than `unreleased`. */
function releaseSection(fragments, version, date) {
  const lines = [`## [${version}] - ${date}`, '', `[中文](#cn-${version}) | [English](#en-${version})`, ...body(fragments)]
  return `${lines.join('\n').split('cn-unreleased').join(`cn-${version}`).split('en-unreleased').join(`en-${version}`)}\n\n`
}

/** Split CHANGELOG.md into its head and its [Unreleased] section and everything after it. */
function split(changelog) {
  const start = changelog.indexOf('## [Unreleased]')
  if (start === -1) throw new Error('changelog: CHANGELOG.md has no "## [Unreleased]" section')
  const next = changelog.indexOf('\n## [', start)
  return { start, body: changelog.slice(start, next === -1 ? changelog.length : next + 1), rest: changelog.slice(next === -1 ? changelog.length : next + 1) }
}

const fragments = readFragments()
const changelog = fs.readFileSync(FILE, 'utf8')
const { start, body: currentSection, rest } = split(changelog)
const built = section(fragments)

if (process.argv.includes('--check')) {
  if (currentSection !== built) {
    throw new Error('changelog: CHANGELOG.md\'s [Unreleased] section is not what docs/changes/ says; run `npm run changelog`')
  }
  console.log(`changelog: ${fragments.length} pending changes, up to date`)
} else if (process.argv.includes('--release')) {
  const version = process.argv[process.argv.indexOf('--release') + 1]
  if (version === undefined || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) throw new Error('changelog: --release needs a version like 0.12.0')
  const dateAt = process.argv.indexOf('--date')
  const date = dateAt === -1 ? new Date().toISOString().slice(0, 10) : process.argv[dateAt + 1]
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('changelog: --date needs a date like 2026-10-06')
  if (fragments.length === 0) throw new Error('changelog: docs/changes/ holds nothing to release')
  fs.writeFileSync(FILE, changelog.slice(0, start) + section([]) + releaseSection(fragments, version, date) + rest)
  for (const fragment of fragments) fs.rmSync(path.join(CHANGES, fragment.name))
  console.log(`changelog: released ${fragments.length} changes as ${version} on ${date}; docs/changes/ is clear`)
} else {
  fs.writeFileSync(FILE, changelog.slice(0, start) + built + rest)
  console.log(`changelog: assembled ${fragments.length} pending changes into the [Unreleased] section`)
}
