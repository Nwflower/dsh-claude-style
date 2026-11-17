/**
 * Cache-file permissions and degradation through the built shared module
 * (packages/engine/node/cache-file.ts): files 0600, directories 0700, an existing
 * loose file or directory tightened by one write, and a failure degrading to no
 * cache with a single warning (D12). The mode bits are the permission boundary on
 * POSIX only; on Windows they carry no ACL meaning, so the bit assertions run on
 * POSIX and the write/degradation assertions run everywhere (bounty#1460).
 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { runsPath } from '../../../scripts/shared/debug-paths.mjs'
import { ROOT, HOST, check } from './shared.mjs'

export async function hostCache() {
  console.log('\nhost half — cache file permissions')
  const { cachePath, writeJsonDocument } = await import(pathToFileURL(path.join(path.dirname(HOST), 'cache-file.js')).href)
  const home = runsPath(ROOT, 'smoke', 'home-cache')
  fs.rmSync(home, { recursive: true, force: true })
  const posix = process.platform !== 'win32'
  // The host creates $DSH_HOME and the shared cache parent loose; pre-create them
  // so the check judges whether the plugin leaves them as the host left them.
  fs.mkdirSync(path.join(home, 'cache'), { recursive: true })
  if (posix) {
    fs.chmodSync(home, 0o755)
    fs.chmodSync(path.join(home, 'cache'), 0o755)
  }
  const warnings = []
  const ctx = {
    get: (name) => (name === 'dshHomePath' ? (...segments) => path.join(home, ...segments) : undefined),
    logger: { warn: (message) => warnings.push(message) },
  }
  const bits = (p) => fs.statSync(p).mode & 0o777
  const octal = (p) => `0${bits(p).toString(8)}`
  const root = cachePath(ctx)
  const target = cachePath(ctx, 'search', 'doc.json')

  // A fresh write creates the file and its directories tight.
  const wrote = writeJsonDocument(ctx, target, 'cache permission probe', { v: 1 })
  check('a cache document writes successfully', wrote === true && fs.existsSync(target))
  if (posix) {
    check('a new cache file is 0600', bits(target) === 0o600, octal(target))
    check('the nested cache directory is 0700', bits(path.dirname(target)) === 0o700, octal(path.dirname(target)))
    check('the plugin cache root is 0700', bits(root) === 0o700, octal(root))
    check('the shared cache parent stays as the host left it', bits(path.join(home, 'cache')) === 0o755, octal(path.join(home, 'cache')))
    check('the harness home stays as the host left it', bits(home) === 0o755, octal(home))
  } else {
    console.log('  skip POSIX mode-bit assertions on Windows (mode is not an ACL boundary)')
  }

  // An existing loose file and directory are tightened by one write.
  if (posix) {
    fs.chmodSync(target, 0o644)
    fs.chmodSync(path.dirname(target), 0o755)
    fs.chmodSync(root, 0o755)
    const rewrote = writeJsonDocument(ctx, target, 'cache permission probe', { v: 2 })
    check('a rewrite tightens a loose file to 0600', rewrote === true && bits(target) === 0o600, octal(target))
    check('a rewrite tightens loose directories to 0700',
      bits(path.dirname(target)) === 0o700 && bits(root) === 0o700, `${octal(path.dirname(target))} ${octal(root)}`)
  }

  // A replace onto an existing directory fails at rename: the temporary survives
  // the failure, so its mode is observable, and the write degrades to no cache.
  const blocked = cachePath(ctx, 'blocked')
  fs.mkdirSync(blocked, { recursive: true })
  const temporary = `${blocked}.${process.pid}.tmp`
  let before = warnings.length
  let failed = writeJsonDocument(ctx, blocked, 'cache permission probe', { v: 3 })
  check('a failed replace degrades to no cache and warns once, without throwing',
    failed === false && warnings.length === before + 1 && fs.statSync(blocked).isDirectory(),
    JSON.stringify({ failed, warned: warnings.slice(before) }))
  check('the temporary left by a failed replace survives', fs.existsSync(temporary))
  if (posix) check('the temporary left by a failed replace is 0600', bits(temporary) === 0o600, octal(temporary))
  fs.rmSync(temporary, { force: true })

  // A location whose parent is a file fails at mkdir: the same degradation, before
  // any temporary exists. This path fails on every platform.
  const blocker = cachePath(ctx, 'blocker')
  fs.writeFileSync(blocker, 'not a directory')
  const unwritable = path.join(blocker, 'sub', 'doc.json')
  before = warnings.length
  failed = writeJsonDocument(ctx, unwritable, 'cache permission probe', { v: 4 })
  check('an unwritable location degrades to no cache and warns once, without throwing',
    failed === false && warnings.length === before + 1 && !fs.existsSync(unwritable),
    JSON.stringify({ failed, warned: warnings.slice(before) }))

  // A file directly under <home>/<package> (the usage record's pluginPath layout,
  // not under cache/) tightens its own directory chain and leaves the home loose.
  const usage = path.join(home, 'dsh-claude-style', 'usage.json')
  const usageWrote = writeJsonDocument(ctx, usage, 'cache permission probe', { v: 5 })
  check('a pluginPath-style document writes successfully', usageWrote === true && fs.existsSync(usage))
  if (posix) {
    check('a pluginPath-style file is 0600', bits(usage) === 0o600, octal(usage))
    check('the pluginPath-style directory is 0700', bits(path.dirname(usage)) === 0o700, octal(path.dirname(usage)))
    check('the harness home stays loose after a pluginPath write', bits(home) === 0o755, octal(home))
  }

  fs.rmSync(home, { recursive: true, force: true })
}
