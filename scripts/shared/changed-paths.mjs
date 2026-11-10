/** changed-paths.mjs — read working-tree changes once for verification and scope checks (D92). */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..')

/** Omit deleted paths: callers cannot read them, and remaining importers still reach their tests. */
export function changedPaths(...scope) {
  const out = execFileSync('git', ['status', '--porcelain', '-z', '--untracked-files=all', '--', ...scope], { cwd: ROOT, encoding: 'utf8' })
  const parts = out.split('\0')
  const paths = []
  for (let at = 0; at < parts.length; at += 1) {
    const entry = parts[at]
    if (entry.length === 0) continue
    const status = entry.slice(0, 2)
    const file = entry.slice(3)
    if (file !== '' && fs.existsSync(path.join(ROOT, file))) paths.push(file)
    // A rename or a copy states its original path in the part after this one.
    if (status.includes('R') || status.includes('C')) at += 1
  }
  return paths
}
