/** run.mjs — run release commands through a shell so `npm` resolves on Windows. */
import { execFileSync } from 'node:child_process'

export function runner(root) {
  // Quote shell metacharacters and spaces; an unquoted Git format is invalid in /bin/sh.
  const safe = /^[A-Za-z0-9_@%+=:,./-]+$/
  const quote = (value) => safe.test(value) ? value : `"${value.replace(/"/g, '\\"')}"`
  return (command, args, options = {}) => {
    const line = [command, ...args.map(quote)].join(' ')
    return execFileSync(line, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], shell: true, ...options }).trim()
  }
}
