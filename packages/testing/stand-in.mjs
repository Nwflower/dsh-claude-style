#!/usr/bin/env node
/**
 * stand-in.mjs — the built plugin's one stand-in-page lane (D92): host-half and
 * installation checks, then the behaviour specs a reader can observe. This file
 * owns one run's whole lifecycle — the request, the stand-in server, the browser
 * and the verify lock — and hands both halves the same server and browser, so
 * neither opens its own.
 *
 * One page factory answers the server: the name a case or spec drives is drawn
 * by the half that drives it. The behaviour specs' pages are the prelude alone
 * and the installation cases' pages carry the smoke's steps, all from one build.
 *
 * Usage: node packages/testing/stand-in.mjs [--case <name>[,<name>…]]
 *        [--feature <dir>[,<dir>…]] [--spec <id or file fragment>[,…]]
 *        [--band <name>[,<name>…]] [--quick] [--jobs <n>] [--host]
 * Exit: 0 passed · 1 a check failed · 2 the request names nothing to run · 3 no verdict.
 */
import fs from 'node:fs'
import path from 'node:path'
import { launchBrowser } from './browser.mjs'
import { FEATURE_CASES, failures, skips } from './smoke/shared.mjs'
import { pagesFor } from './smoke/shared.mjs'
import { page as standInPage, behaviourPage } from './smoke/page.mjs'
import { serveStandIn } from './smoke/server.mjs'
import { casesFor, serveInstallation, DEFAULT_JOBS } from './smoke.mjs'
import { serveBehaviour, listBehaviour } from './behaviour.mjs'
import { UNJUDGED_EXIT } from './host-version.mjs'
import { ROOT } from '../../scripts/shared/spec-header.mjs'
import { runsPath } from '../../scripts/shared/debug-paths.mjs'
import { withLock } from '../../scripts/shared/verify-lock.mjs'

const REPORT = runsPath(ROOT, 'stand-in', 'report.json')
const PLAIN = new Set(['quick', 'host', 'help', 'list'])
const VALUED = new Set(['case', 'feature', 'spec', 'band', 'jobs'])

/**
 * One command line split into two selections: the installation cases a case or
 * feature name selects, and the behaviour specs a feature, spec or band name
 * selects. A request with no case name runs the behaviour specs; a request with
 * no spec-side name runs the installation walk too, at the tier asked for.
 */
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
  if (plain.has('help')) return { help: true }
  for (const feature of named.feature) {
    if (!Object.hasOwn(FEATURE_CASES, feature)) throw new Error(`no feature directory named "${feature}"`)
  }
  const host = plain.has('host')
  if (host && (plain.has('quick') || named.case.length > 0 || named.feature.length > 0 || named.spec.length > 0 || named.band.length > 0)) {
    throw new Error('--host runs the Node host half alone and takes no case, feature, spec, band or tier')
  }
  const installationCases = [...named.case, ...named.feature.filter((feature) => FEATURE_CASES[feature].length > 0)]
  // A spec or band selects the behaviour half; a feature directory selects the
  // installation cases it names, then the behaviour specs that name it.
  const namedBehaviour = named.spec.length > 0 || named.band.length > 0
  const installPages = named.case.length > 0 || installationCases.length > 0
    || (named.feature.length === 0 && !namedBehaviour)
  // A case-only request is the installation case's own; a feature, spec, band
  // or bare request also runs the behaviour specs (D92).
  const behaviour = !host && (named.case.length === 0 || named.feature.length > 0 || namedBehaviour)
  return {
    host,
    quick: plain.has('quick'),
    list: plain.has('list'),
    jobs: jobs ?? DEFAULT_JOBS,
    installPages,
    behaviour,
    installationCases,
    feature: named.feature,
    spec: named.spec,
    band: named.band,
  }
}

/**
 * The page a request draws for a name: the installation half's pages are the
 * page groups its cases belong to, drawn with the smoke's steps; a page carrying
 * `probe=prelude` is a behaviour spec's, with the prelude alone. One server
 * therefore answers both halves even where they share a page name.
 */
function drawPages(asked) {
  const pages = asked.installPages ? pagesFor(casesFor(asked.installationCases)) : []
  return (name, probe) => {
    if (probe === 'prelude') return behaviourPage(name)
    const entry = pages.find((one) => one.page === name)
    return entry === undefined ? undefined : standInPage(entry.page, asked.quick ? 'quick' : 'full', entry.cases)
  }
}

/** Run both halves on one server and one browser; the request decides how much of each runs. */
async function runRequest(asked) {
  const codes = {}
  if (asked.host) {
    await serveInstallation({ host: true, cases: [], quick: false, jobs: asked.jobs })
    codes.smoke = failures() > 0 ? 1 : 0
    return codes
  }
  const server = await serveStandIn(drawPages(asked))
  let browser
  try {
    browser = await launchBrowser()
  } catch (error) {
    await server.close()
    console.error(`stand-in: the browser could not start: ${error.message}`)
    codes.smoke = asked.installPages ? UNJUDGED_EXIT : undefined
    codes.behaviour = asked.behaviour ? UNJUDGED_EXIT : undefined
    return Object.fromEntries(Object.entries(codes).filter(([, value]) => value !== undefined))
  }
  try {
    // Every non-host request runs the host half once; only a request naming
    // installation cases opens pages for them.
    await serveInstallation(
      { host: !asked.installPages, cases: asked.installPages ? asked.installationCases : [], quick: asked.quick, jobs: asked.jobs },
      browser,
      server.base,
    )
    codes.smoke = failures() > 0 ? 1 : 0
    if (asked.behaviour) {
      const report = await serveBehaviour(
        { feature: asked.feature, spec: asked.spec, band: asked.band, jobs: Math.max(1, Math.min(2, asked.jobs)) },
        browser,
        server.base,
      )
      codes.behaviour = report.blocking === 0 ? 0 : 1
    }
  } finally {
    await browser.close()
    await server.close()
  }
  return codes
}

async function main(args) {
  const asked = request(args)
  if (asked.help === true) {
    console.log('usage: node packages/testing/stand-in.mjs [--case <name>[,…]] [--feature <dir>[,…]] [--spec <id or fragment>[,…]] [--band <name>[,…]] [--quick] [--jobs <n>] [--host] [--list]')
    return 0
  }
  if (asked.list === true) {
    return listBehaviour({ feature: asked.feature, spec: asked.spec, band: asked.band })
  }
  let codes
  try {
    codes = await runRequest(asked)
  } catch (error) {
    console.error(error.stack ?? `stand-in: ${error.message}`)
    return 2
  }
  fs.mkdirSync(path.dirname(REPORT), { recursive: true })
  fs.writeFileSync(REPORT, `${JSON.stringify({ at: new Date().toISOString(), ...codes }, null, 2)}\n`)
  const values = Object.values(codes)
  const code = values.includes(1) ? 1 : values.includes(UNJUDGED_EXIT) ? UNJUDGED_EXIT : 0
  const skipped = skips() === 0 ? '' : `, ${skips()} timing checks skipped`
  console.log(`\nstand-in: ${Object.entries(codes).map(([lane, value]) => `${lane} exit ${value}`).join(', ')}${skipped}`)
  return code
}

withLock('stand-in', 'stand-in', () => main(process.argv.slice(2))).then((code) => process.exit(code), (error) => {
  console.error(`stand-in: ${error.message}`)
  process.exit(1)
})
