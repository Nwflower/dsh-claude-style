/**
 * build-cache.mjs — the results of the build's slow pure steps, kept between runs.
 *
 * Converting Deepy's sheets to vectors and brotli-compressing the routed text
 * assets take most of a build and change only when their inputs do. Each result
 * is stored under the hash of everything it is computed from, the code that
 * computes it included, so a hit hands back the very bytes a fresh run would
 * produce: `lib/` is the same with the cache or without it. The directory sits
 * in `.debug/` (gitignored); a fresh clone and CI start empty and compute all.
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

/**
 * How long an entry no build has used is kept. Another build of the same tree
 * may be reading entries this one does not use (an earlier stylesheet, another
 * branch's chunk), so pruning only takes what has stood unused for a day.
 */
const UNUSED_LIFETIME_MS = 24 * 60 * 60 * 1000

/**
 * Open the cache directory.
 *
 * @param dir - the cache directory; created on the first store.
 * @returns `get` to read or compute one result, `prune` to drop stale entries
 *     after a build that succeeded, and `counts` for the build log.
 */
export function openBuildCache(dir) {
  /** step → the keys this build read or stored. */
  const used = new Map()
  let hits = 0
  let misses = 0
  return {
    /**
     * @param step - the step's name, one directory under the cache.
     * @param inputs - everything the result depends on, as strings or bytes.
     * @param compute - the step itself; returns the result's bytes.
     * @returns the stored bytes for these inputs, or compute()'s, which are then stored.
     */
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
