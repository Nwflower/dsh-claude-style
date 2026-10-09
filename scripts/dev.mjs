#!/usr/bin/env node
/**
 * dev.mjs — rebuild on every change to what the build reads (`npm run dev`).
 *
 * Each rebuild is a whole `node scripts/build.mjs` in a fresh process: the build
 * evaluates packages/client/src/constants.ts and the manifests once at start, so
 * one process per run is what keeps a changed constant from being read stale.
 * The build cache (scripts/build-cache.mjs) is what makes that cheap.
 *
 * The runs carry DSH_CLAUDE_STYLE_DEBUG=1: a watched checkout is the linked one
 * whose live page hot-reloads to every new bundle, and the page still running the
 * previous one asks for that build's chunks (D39). A plain `npm run build`
 * afterwards leaves lib/assets/ holding one build's assets again.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const BUILD = path.join(ROOT, 'scripts', 'build.mjs')

/**
 * What the build reads, as paths relative to the repository. A directory covers
 * everything under it; packages/testing/ and the smoke scripts are not build
 * inputs, and the build writes nothing under any of these.
 */
const WATCHED_DIRS = ['packages/client', 'packages/assets', 'packages/host', 'packages/contracts', 'scripts']
const UNWATCHED_DIRS = ['scripts/smoke']
const WATCHED_FILES = ['package.json', 'tsconfig.json']

/** Changes this close together are one edit: a save that touches several files builds once. */
const SETTLE_MS = 120

/** @returns whether a change at this repository-relative path is a build input. */
function isInput(file) {
  if (WATCHED_FILES.includes(file)) return true
  if (UNWATCHED_DIRS.some((dir) => file.startsWith(`${dir}/`))) return false
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
    env: { ...process.env, DSH_CLAUDE_STYLE_DEBUG: '1' },
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
