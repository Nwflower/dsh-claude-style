#!/usr/bin/env node
/**
 * worktree.mjs — manage scratch worktrees with linked node_modules. Unlink
 * before removal because Windows git would otherwise delete the link target.
 */
import fs from 'node:fs'
import path from 'node:path'
import { runner } from './shared/run.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const run = runner(ROOT)

/** The directories a scratch worktree may sit in; the main working tree is never a candidate. */
const SCRATCH = [path.join(ROOT, '.debug'), path.join(ROOT, '.agents', 'worktrees')]
  .map((dir) => dir.toLowerCase() + path.sep)

function usage() {
  console.error('usage: node scripts/worktree.mjs add <path> <ref>\n       node scripts/worktree.mjs remove <path> [--dry-run]')
  process.exit(2)
}

/** The target resolved under a scratch directory, or the process exits naming the rule. */
function scratch(target) {
  const worktree = path.resolve(ROOT, target)
  if (!SCRATCH.some((dir) => worktree.toLowerCase().startsWith(dir))) {
    console.error(`worktree: ${worktree} is outside .debug/ and .agents/worktrees/; the main tree is never a candidate`)
    process.exit(1)
  }
  return worktree
}

function add(args) {
  const [target, ref, ...extra] = args
  if (target === undefined || ref === undefined || ref.trim() === '' || extra.length > 0) usage()
  const worktree = scratch(target)
  if (fs.lstatSync(worktree, { throwIfNoEntry: false }) !== undefined) {
    console.error(`worktree: ${worktree} already exists`)
    process.exit(1)
  }
  const modules = path.join(ROOT, 'node_modules')
  if (!fs.existsSync(modules)) {
    console.error(`worktree: ${modules} is missing; run npm install in the main tree first`)
    process.exit(1)
  }
  let commit
  try {
    commit = run('git', ['rev-parse', '--verify', '--quiet', '--end-of-options', `${ref}^{commit}`])
  } catch {
    // Git's exit status is the only evidence that the ref names no commit here.
    console.error(`worktree: ${ref} is not a commit in this repository`)
    process.exit(1)
  }
  run('git', ['worktree', 'add', '--detach', worktree, commit])
  // A junction resolves without the privilege a symbolic link needs on Windows;
  // `remove` unlinks either kind before git sees the directory.
  fs.symlinkSync(modules, path.join(worktree, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
  console.log(`worktree: added ${path.relative(ROOT, worktree)} at ${commit.slice(0, 12)} (node_modules linked)`)
}

function remove(args) {
  const [target, ...flags] = args
  if (target === undefined) usage()
  const dryRun = flags.includes('--dry-run')
  const worktree = scratch(target)

  // The listed worktrees are absolute paths with forward slashes, one per line.
  const listed = run('git', ['worktree', 'list', '--porcelain'])
    .split('\n')
    .filter((line) => line.startsWith('worktree '))
    .map((line) => path.resolve(line.slice('worktree '.length)).toLowerCase())
  if (!listed.includes(worktree.toLowerCase())) {
    console.error(`worktree: ${worktree} is not a linked worktree of this repository`)
    process.exit(1)
  }

  /** The entries at the worktree's top level that are links rather than directories of their own. */
  const links = fs.existsSync(worktree)
    ? fs.readdirSync(worktree).flatMap((name) => {
      const full = path.join(worktree, name)
      return fs.lstatSync(full).isSymbolicLink() ? [full] : []
    })
    : []

  for (const link of links) {
    console.log(`${dryRun ? 'would unlink' : 'unlink'} ${path.relative(ROOT, link)} -> ${fs.readlinkSync(link)}`)
    // `unlink` takes the link itself away: the directory it names keeps its files.
    if (!dryRun) fs.unlinkSync(link)
  }
  if (dryRun) process.exit(0)

  run('git', ['worktree', 'remove', '--force', worktree])
  console.log(`worktree: removed ${path.relative(ROOT, worktree)} (${links.length} link${links.length === 1 ? '' : 's'} unlinked first)`)
}

const [action, ...args] = process.argv.slice(2)
if (action === 'add') add(args)
else if (action === 'remove') remove(args)
else usage()
