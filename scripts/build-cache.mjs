/** build-cache.mjs — cache pure build steps by every input, including the computing code. */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

/** Delay pruning because another build of the tree may still read entries this one skips. */
const UNUSED_LIFETIME_MS = 24 * 60 * 60 * 1000


export function openBuildCache(dir) {
  /** step → the keys this build read or stored. */
  const used = new Map()
  let hits = 0
  let misses = 0
  return {

    get(step, inputs, compute) {
      const hash = createHash('sha256')
      for (const input of inputs) {
        const bytes = typeof input === 'string' ? Buffer.from(input, 'utf8') : input
        // The length keeps two inputs from reading as one: ["ab", "c"] ≠ ["a", "bc"].
        hash.update(`${bytes.byteLength}:`).update(bytes)
      }
      const key = hash.digest('hex')
      if (!used.has(step)) used.set(step, new Set())
      used.get(step).add(key)
      const file = path.join(dir, step, key)
      if (fs.existsSync(file)) {
        hits += 1
        const now = new Date()
        fs.utimesSync(file, now, now)
        return fs.readFileSync(file)
      }
      misses += 1
      const result = compute()
      fs.mkdirSync(path.dirname(file), { recursive: true })
      // Written aside and renamed into place: a killed build leaves a partial
      // file under another name, never a truncated entry under a real key.
      const partial = `${file}.${process.pid}.partial`
      fs.writeFileSync(partial, result)
      fs.renameSync(partial, file)
      return result
    },
    /** Drop the entries of the steps this build ran that have gone unused for a day. */
    prune() {
      const cutoff = Date.now() - UNUSED_LIFETIME_MS
      let removed = 0
      for (const [step, keys] of used) {
        const stepDir = path.join(dir, step)
        if (!fs.existsSync(stepDir)) continue
        for (const file of fs.readdirSync(stepDir)) {
          if (keys.has(file)) continue
          const at = path.join(stepDir, file)
          if (fs.statSync(at).mtimeMs >= cutoff) continue
          fs.rmSync(at)
          removed += 1
        }
      }
      return removed
    },
    counts: () => ({ hits, misses }),
  }
}
