/**
 * The two spellings a session id has: the logical id the host's services name
 * it by, and the single directory name the storage keeps it under.
 *
 * This restates `encodeSegment` in the host's session persistence
 * (`@deepseek-ai/dsh-session-persistence-jsonl`), which no shared module hands
 * to the host half. A code unit outside `A-Za-z0-9._-` becomes `~XXXX`, `.` and
 * `..` included, so a plugin-generated id (`im:<channel>:dm:<user>:<token>@<domain>`)
 * has a name of its own.
 */

/** One escaped code unit: the four uppercase hex digits the storage writes. */
const ESCAPE = /^[0-9A-F]{4}$/

/**
 * The directory name the harness stores one session id under.
 *
 * @param id - the logical id, as the session services name it.
 * @returns the directory name.
 */
export function sessionDirectoryName(id: string): string {
  if (id === '.') return '~002E'
  if (id === '..') return '~002E~002E'
  let name = ''
  for (let index = 0; index < id.length; index += 1) {
    const unit = id.charAt(index)
    name += unit !== '~' && /^[A-Za-z0-9._-]$/.test(unit)
      ? unit
      : `~${id.charCodeAt(index).toString(16).toUpperCase().padStart(4, '0')}`
  }
  return name
}

/**
 * The logical id a stored directory name stands for.
 *
 * The mapping is reversible in both directions: every `~` is itself escaped to
 * `~007E`, so a `~XXXX` in a name can only be an escape, never a literal tilde
 * followed by four hex digits.
 *
 * @param name - the directory name.
 * @returns the logical id.
 */
export function sessionIdFromDirectoryName(name: string): string {
  let id = ''
  for (let index = 0; index < name.length; index += 1) {
    const hex = name.charAt(index) === '~' ? name.slice(index + 1, index + 5) : ''
    if (ESCAPE.test(hex)) {
      id += String.fromCharCode(Number.parseInt(hex, 16))
      index += 4
      continue
    }
    id += name.charAt(index)
  }
  return id
}
