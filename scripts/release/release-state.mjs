#!/usr/bin/env node
/** release-state.mjs — report published, dev and packaged state so a release rerun resumes safely (D47). */
import fs from 'node:fs'
import path from 'node:path'
import { runner } from '../shared/run.mjs'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const PACKAGE = 'dsh-claude-style'
const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version
const tag = `v${version}`
const run = runner(ROOT)

const listed = JSON.parse(run('npm', ['view', PACKAGE, 'versions', '--json']))
const versions = Array.isArray(listed) ? listed : [listed]
const devPrefix = `${version}-dev.`
const dev = versions.filter((one) => one.startsWith(devPrefix)).pop() ?? ''

// `git tag --list` answers with an empty line where the tag is absent, which
// keeps an absent tag an answer rather than a failed command. `rev-list` peels
// an annotated tag itself: this runs through a shell, and cmd.exe eats the caret
// of `^{commit}`.
const tagged = run('git', ['tag', '--list', tag]) === '' ? null : run('git', ['rev-list', '-n', '1', `refs/tags/${tag}`])
const dist = run('git', ['for-each-ref', '--format=%(objectname)', 'refs/remotes/origin/dist'])
const packaged = tagged !== null && tagged === dist

process.stdout.write(`published=${versions.includes(version)}\n`)
process.stdout.write(`dev=${dev}\n`)
process.stdout.write(`packaged=${packaged}\n`)
