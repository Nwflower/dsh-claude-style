/**
 * tree-hash.mjs — the hash of the tree a verdict belongs to.
 *
 * `scripts/verify.mjs` files its verdicts under this hash and the continuous
 * integration workflow keys the build cache with it, so a run here and a run in
 * the cloud name the same tree the same way (D86).
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { filesUnder } from './file-walk.mjs'

/**
 * The directories whose bytes decide a verdict. `lib/` is the build's own output
 * and `.debug/` is what the runs write, so neither is an input.
 */
export const TREES = ['packages', 'scripts', 'locale', 'docs']

/** What no walk enters: the build output, the local scratch and the editor's own state under `.claude/`. */
export const SKIPPED = new Set(['.git', '.debug', '.claude', 'node_modules', 'lib'])

/**
 * Every file the hash covers, as root-relative paths in one fixed order: the
 * directories above, and the files at the root that hold the scripts, the
 * lockfile and the configuration they read.
 */
export function treeFiles(root) {
  const files = []
  // An empty extension matches every name, which is what hashing the tree wants.
  for (const dir of TREES) files.push(...filesUnder(path.join(root, dir), [''], SKIPPED))
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile()) files.push(path.join(root, entry.name))
  }
  return files.map((file) => path.relative(root, file).replace(/\\/g, '/')).sort()
}

/** The hash of the tree: each file's own path and content hash. */
export function treeHash(root) {
  const files = treeFiles(root)
  const digest = crypto.createHash('sha256')
  for (const file of files) {
    digest.update(file)
    digest.update('\0')
    digest.update(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest())
  }
  return { hash: digest.digest('hex'), files: files.length }
}
