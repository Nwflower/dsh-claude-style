#!/usr/bin/env node
/**
 * host-version.mjs — which host a run was judged against (D92).
 *
 * The end-to-end lane reads what the host draws, so a verdict only means
 * something when the host is the newest one published, whichever dist-tag it
 * sits under. The cloud installs that version; a machine with an older one gets
 * an answer that differs from the cloud's for reasons the repository does not
 * control, and the lane declines to give a verdict there rather than report a
 * failure or a pass it cannot stand behind.
 */
import { execSync } from 'node:child_process'

const HOST_PACKAGE = '@deepseek-ai/dsh'

/** The exit code of a run that gave no verdict, which `scripts/checks/verify.mjs` reads as "unjudged". */
const UNJUDGED_EXIT = 3

/** Run a command line (fixed words only) and return its trimmed standard output. */
function output(commandLine) {
  return execSync(commandLine, { encoding: 'utf8' }).trim()
}

/** The version published most recently, across every dist-tag: the registry's publish times decide. */
function newestHostVersion() {
  const times = JSON.parse(output(`npm view ${HOST_PACKAGE} time --json`))
  const published = Object.entries(times).filter(([key]) => key !== 'created' && key !== 'modified')
  published.sort(([, left], [, right]) => Date.parse(right) - Date.parse(left))
  return published[0][0]
}

/** The version of the `dsh` on this machine's PATH. */
function installedHostVersion() {
  return output('dsh --version')
}

/** Stop a run whose host is not the newest published one. */
function requireNewestHost() {
  const newest = newestHostVersion()
  const installed = installedHostVersion()
  if (installed === newest) return
  process.stderr.write(`host: this machine has dsh ${installed} and the newest published is ${newest}; the end-to-end lane gives no verdict on another host version. Install it (npm install --global ${HOST_PACKAGE}@${newest}).\n`)
  process.exit(UNJUDGED_EXIT)
}

export { UNJUDGED_EXIT, newestHostVersion, installedHostVersion, requireNewestHost }

if (import.meta.main) process.stdout.write(`${newestHostVersion()}\n`)
