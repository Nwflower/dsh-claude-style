#!/usr/bin/env node
/**
 * stand-in.mjs — the built plugin's one stand-in-page lane (D92): host-half and
 * installation checks, then the behaviour specs a reader can observe.
 *
 * Usage: node packages/testing/stand-in.mjs [--case <name>[,<name>…]]
 *        [--feature <dir>[,<dir>…]] [--spec <id or file fragment>[,…]]
 *        [--band <name>[,<name>…]] [--quick] [--jobs <n>] [--host]
 * Exit: 0 passed · 1 a check failed · 2 the request names nothing to run · 3 no verdict.
 */
import fs from 'node:fs'
import path from 'node:path'
import { runSmoke } from './smoke.mjs'
import { FEATURE_CASES } from './smoke/shared.mjs'
import { runBehaviour } from './behaviour.mjs'
import { UNJUDGED_EXIT } from './host-version.mjs'
import { ROOT } from '../../scripts/shared/spec-header.mjs'
import { runsPath } from '../../scripts/shared/debug-paths.mjs'
import { withLock } from '../../scripts/shared/verify-lock.mjs'

const REPORT = runsPath(ROOT, 'stand-in', 'report.json')
const PLAIN = new Set(['quick', 'host', 'help'])
const VALUED = new Set(['case', 'feature', 'spec', 'band', 'jobs'])

function bad(message) {
  console.error(`stand-in: ${message}`)
  return 2
}

/** Split the two case kinds' flags without giving either implementation a second CLI. */
function request(args) {
  const named = { case: [], feature: [], spec: [], band: [] }
  const plain = new Set()
  let jobs = null
  for (let at = 0; at < args.length; at += 1) {
    const arg = args[at]
    const split = arg.indexOf('=')
    const flag = (split === -1 ? arg : arg.slice(0, split)).replace(/^--/, '')
    if (!arg.startsWith('--') || (!PLAIN.has(flag) && !VALUED.has(flag))) throw new Error(`unknown argument "${arg}"`)
    if (PLAIN.has(flag)) {
      if (split !== -1) throw new Error(`--${flag} takes no value`)
      plain.add(flag)
      continue
    }
    const value = split === -1 ? args[++at] : arg.slice(split + 1)
    if (value === undefined || value.trim() === '') throw new Error(`--${flag} needs a value`)
    if (flag === 'jobs') {
      if (!/^\d+$/.test(value) || Number(value) < 1) throw new Error(`--jobs takes how many pages to drive at once, not "${value}"`)
      jobs = Number(value)
      continue
    }
    named[flag].push(...value.split(',').map((name) => name.trim()).filter(Boolean))
  }
  return { named, plain, jobs }
}

async function main(args) {
  const { named, plain, jobs } = request(args)
  if (plain.has('help')) {
    console.log('usage: node packages/testing/stand-in.mjs [--case <name>[,…]] [--feature <dir>[,…]] [--spec <id or fragment>[,…]] [--band <name>[,…]] [--quick] [--jobs <n>] [--host]')
    return 0
  }
  if (plain.has('host') && (plain.has('quick') || Object.values(named).some((names) => names.length > 0))) {
    return bad('--host runs the Node host half alone and takes no case, feature, spec, band or tier')
  }
  const smokeArgs = []
  const behaviourArgs = []
  for (const name of named.case) smokeArgs.push('--case', name)
  for (const name of named.feature) {
    if (!Object.hasOwn(FEATURE_CASES, name)) return bad(`no feature directory named "${name}"`)
    // A feature guarded by behaviour specs or end-to-end scenarios alone has no
    // installation case to select; its host-half check still runs below.
    if (FEATURE_CASES[name].length > 0) smokeArgs.push('--feature', name)
    behaviourArgs.push('--feature', name)
  }
  for (const flag of ['spec', 'band']) for (const name of named[flag]) behaviourArgs.push(`--${flag}`, name)
  if (plain.has('quick')) smokeArgs.push('--quick')
  if (jobs !== null) smokeArgs.push('--jobs', String(jobs))
  if (jobs !== null) behaviourArgs.push('--jobs', String(Math.max(1, Math.min(2, jobs))))

  const hostOnly = plain.has('host')
  const hasSmokeSelection = named.case.length > 0 || named.feature.some((name) => FEATURE_CASES[name].length > 0)
  const behaviourOnly = !hostOnly && !plain.has('quick') && !hasSmokeSelection
    && (named.feature.length > 0 || named.spec.length > 0 || named.band.length > 0)
  const behaviourRequested = !hostOnly && (named.case.length === 0 || named.feature.length > 0 || named.spec.length > 0 || named.band.length > 0)
  const smoke = await runSmoke(hostOnly || behaviourOnly ? ['--host'] : smokeArgs)
  // An invalid request judges nothing and must not be hidden by a second lane's answer.
  if (smoke === 2) return smoke
  const behaviour = behaviourRequested ? await runBehaviour(behaviourArgs) : null
  const codes = behaviour === null ? { smoke } : { smoke, behaviour }
  fs.mkdirSync(path.dirname(REPORT), { recursive: true })
  fs.writeFileSync(REPORT, `${JSON.stringify({ at: new Date().toISOString(), ...codes }, null, 2)}\n`)
  const values = Object.values(codes)
  const code = values.includes(1) || values.includes(2) ? 1 : values.includes(UNJUDGED_EXIT) ? UNJUDGED_EXIT : 0
  console.log(`\nstand-in: ${Object.entries(codes).map(([lane, value]) => `${lane} exit ${value}`).join(', ')}`)
  return code
}

withLock('stand-in', 'stand-in', () => main(process.argv.slice(2))).then((code) => process.exit(code), (error) => {
  console.error(`stand-in: ${error.message}`)
  process.exit(1)
})
