/**
 * The features a test run leaves out, by name (docs/DEBUGGING.md, 功能二分).
 *
 * The testing prelude sets `window.__dshClaudeOff` before the bundle boots, so a
 * run can bisect the page without a rebuild; a page the reader opens never sets
 * it. The list is read as it is: a name in it installs nothing, and a value that
 * is not a list leaves every feature on.
 */
export function switchedOff(id: string, off: unknown): boolean {
  return Array.isArray(off) && off.includes(id)
}
