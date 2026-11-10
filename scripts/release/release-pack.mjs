#!/usr/bin/env node
/**
 * release-pack.mjs — build once and pack release plus dev tarballs that differ
 * only in version (D47); publishing tarballs prevents a second build.
 */
import fs from 'node:fs'
import path from 'node:path'
import { runner } from '../shared/run.mjs'
import { runsPath } from '../shared/debug-paths.mjs'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const DEFAULT_OUT = runsPath(ROOT, 'release')
const run = runner(ROOT)

function fail(message) {
  console.error(`release-pack: ${message}`)
  process.exit(1)
}

/** The last non-empty line of a command's stdout, which is where npm names what it wrote. */
const lastLine = (text) => text.split('\n').map((line) => line.trim()).filter(Boolean).pop() ?? ''

const args = process.argv.slice(2)
const argOf = (flag) => {
  const at = args.indexOf(`--${flag}`)
  return at === -1 ? undefined : args[at + 1]
}
const dev = argOf('dev')
if (args.includes('--dev') && (dev === undefined || dev.trim() === '' || dev.startsWith('--'))) {
  fail('--dev needs the dev version to write into the tarball')
}
const out = path.resolve(argOf('out') ?? DEFAULT_OUT)

// A tarball left by an earlier run would otherwise sit beside this one and make
// the printed paths ambiguous.
fs.rmSync(out, { recursive: true, force: true })
const pack = path.join(out, 'pack')
fs.mkdirSync(pack, { recursive: true })

console.error('release-pack: build')
run('npm', ['run', 'build'])
const release = path.join(pack, lastLine(run('npm', ['pack', '--pack-destination', pack])).replace(/^.*[\\/]/, ''))
if (!fs.existsSync(release)) fail(`npm pack wrote no tarball under ${pack}`)
console.error(`release-pack: ${path.basename(release)}`)

const paths = [release]
if (dev !== undefined) {
  const staged = path.join(out, 'dev')
  fs.mkdirSync(staged, { recursive: true })
  run('tar', ['-xzf', release, '-C', staged, '--strip-components=1'])
  const manifest = path.join(staged, 'package.json')
  const copy = JSON.parse(fs.readFileSync(manifest, 'utf8'))
  copy.version = dev
  fs.writeFileSync(manifest, `${JSON.stringify(copy, null, 2)}\n`)
  // Packing the staged directory runs `prepack` and `prepare` only; the package
  // declares neither, and the tarball's own `prepublishOnly` never runs.
  const devName = lastLine(run('npm', ['pack', staged, '--pack-destination', out])).replace(/^.*[\\/]/, '')
  const devTarball = path.join(out, devName)
  if (!fs.existsSync(devTarball)) fail(`npm pack wrote no dev tarball under ${out}`)
  console.error(`release-pack: ${devName}`)
  paths.push(devTarball)
}

process.stdout.write(`${paths.join('\n')}\n`)
