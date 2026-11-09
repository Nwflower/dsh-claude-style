#!/usr/bin/env node
/**
 * dev.mjs — rebuild inputs in a fresh process to avoid stale evaluated constants.
 * Debug builds retain previous chunks for live linked pages (D72).
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const BUILD = path.join(ROOT, 'scripts', 'build.mjs')

/** Name individual testing records because the rest of packages/testing is not a build input. */
const WATCHED_DIRS = ['packages/client', 'packages/assets', 'packages/host', 'packages/engine', 'packages/contracts', 'scripts']
const WATCHED_FILES = ['package.json', 'tsconfig.json', 'packages/testing/data/importance-ledger.json']

/** Changes this close together are one edit: a save that touches several files builds once. */
const SETTLE_MS = 120

/** @returns whether a change at this repository-relative path is a build input. */
function isInput(file) {
  if (WATCHED_FILES.includes(file)) return true
  return WATCHED_DIRS.some((dir) => file.startsWith(`${dir}/`))
}

let running = false
let pending = null
let timer = 0

function build(reason) {
  running = true
  const started = Date.now()
  console.log(`\n[dev] build (${reason})`)
  const child = spawn(process.execPath, [BUILD], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, DSH_CLAUDE_STYLE_DEBUG: '1', DSH_CLAUDE_STYLE_DEV: '1' },
  })
  child.on('close', (code) => {
    const took = Date.now() - started
    console.log(code === 0 ? `[dev] built in ${took} ms; watching` : `[dev] build failed (exit ${code}) after ${took} ms; lib/ is unchanged, watching for the next edit`)
    running = false
    if (pending !== null) {
      const next = pending
      pending = null
      build(next)
    }
  })
}

function changed(file) {
  if (!isInput(file)) return
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (running) pending = file
    else build(file)
  }, SETTLE_MS)
}

const relative = (dir, name) => `${dir}/${name.split(path.sep).join('/')}`
for (const dir of WATCHED_DIRS) {
  fs.watch(path.join(ROOT, dir), { recursive: true }, (_event, name) => {
    if (name !== null) changed(relative(dir, name))
  })
}
fs.watch(ROOT, (_event, name) => {
  if (name !== null && WATCHED_FILES.includes(name)) changed(name)
})

console.log(`[dev] watching ${[...WATCHED_DIRS.map((dir) => `${dir}/`), ...WATCHED_FILES].join(', ')} (builds carry DSH_CLAUDE_STYLE_DEBUG=1)`)
build('start')
