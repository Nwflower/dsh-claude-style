/**
 * file-walk.mjs — list files by extension without entering nested checkouts,
 * whose duplicate documents would be mistaken for this repository's own.
 */
import fs from 'node:fs'
import path from 'node:path'


export function filesUnder(dir, extensions, skipped) {
  const found = []
  const walk = (at) => {
    for (const entry of fs.readdirSync(at, { withFileTypes: true })) {
      const full = path.join(at, entry.name)
      if (entry.isDirectory() && !skipped.has(entry.name) && !fs.existsSync(path.join(full, '.git'))) walk(full)
      else if (!entry.isDirectory() && extensions.some((extension) => entry.name.endsWith(extension))) found.push(full)
    }
  }
  if (fs.existsSync(dir)) walk(dir)
  return found
}
