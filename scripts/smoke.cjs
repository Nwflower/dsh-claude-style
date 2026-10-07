#!/usr/bin/env node
/**
 * smoke.cjs — zero-dependency smoke test of the BUILT plugin (`lib/`); no running
 * DSH instance is needed.
 *
 * Host half, in Node: `lib/host/index.js` is applied to a fake cordis context and the
 * username and session-delete routes get the request shapes that matter
 * (docs/decisions D11) — a cross-site page, a LAN peer and the browser's
 * own same-origin fetch, plus the deletion route's own guards (POST only, the id
 * shape, an open session, a path-shaped id) and a real deletion against a
 * scratch harness home under .debug/ — once through a host that offers
 * `connection.requestRejection()` and once through the local stand-in. The
 * public prefix route serves the assets the build routed from lib/assets/,
 * under the build's own manifest, and nothing else.
 *
 * Browser half, in headless Chrome/Edge over CDP: `lib/client.js` is loaded into
 * a page that stands in for the host (module loader, ctx, a sidebar footer with
 * an account menu and two plugin entries, a composer whose editor handles Enter
 * the way the host's keymap does), and checked for:
 *   - boot       apply() installs every feature and registers its teardown;
 *   - idle       once settled, no scheduler pass runs — a pass that mutates the
 *                DOM schedules the next one, and then the page never idles;
 *   - enter      Enter on an open composer menu reaches the host, never "Send";
 *   - popovers   the shared popover rule: a pointer crossing a trigger opens
 *                nothing before the dwell elapses, and whichever card opens last
 *                folds the one before it — the skin's own cards and the host's
 *                hero menu alike;
 *   - desktop    the 0.1.7 desktop footer: the host's own account row is the
 *                entry, and our container is injected into its account menu —
 *                first child, self-healing across a host re-render, reachable
 *                by the host's keyboard walk, and gone when the menu closes;
 *   - markup     strings from settings, the account service and plugins render
 *                as text, never as markup;
 *   - isolation  a host API that breaks one feature — at install or at sync —
 *                retires only that feature and hands its surface back (D12);
 *   - deepy      the DeepSeek brand: the whale stands on the home card and on
 *                the conversation's input area (or the panel replacing its
 *                card), follows the session's state and moments, changes
 *                frames without waking a pass, and leaves with the page;
 *   - teardown   dispose leaves no skin node, marker, body attribute or
 *                stylesheet behind, and no pass runs afterwards.
 *
 * This file is the runner. The parts live in scripts/smoke/: shared.cjs (paths,
 * fixtures, `check`), host-half.cjs (the Node half), page.cjs (one case's
 * stand-in page), the stand-in/ and probe/ parts (the scripts that page runs
 * before and after the bundle) and cases.cjs (what each case's report must show).
 *
 * Usage: node scripts/smoke.cjs [--case <name>[,<name>…]] [--feature <dir>[,<dir>…]] [--quick]
 *        (CHROME_PATH overrides the browser lookup)
 *        --case runs the named browser cases alone, --feature the cases that
 *        cover the named directories under packages/client/src/features/; both may be repeated,
 *        combined, and neither means every case. --quick leaves out the cases
 *        and the checks that watch motion (TIMING_CASES in scripts/smoke/
 *        shared.cjs). Cases that share a stand-in configuration and a markup
 *        run in one page load (PAGES in shared.cjs), and the log names the pages
 *        it loaded. The Node host half runs either way.
 * Exit:  0 every check passed · 1 a check failed · 2 the browser half could not run
 */
'use strict'
const fs = require('fs')
const http = require('http')
const path = require('path')
const { findChrome, launchChrome, connectTab } = require('./shared/chrome.cjs')
const { ROOT, CLIENT, SKIN_FIXTURE, SKIN_CASES, sleep, check, failures, skips, setTier, tierName, TIMING_CASES, FEATURE_CASES, pagesFor } = require('./smoke/shared.cjs')
const { hostHalf } = require('./smoke/host-half.cjs')
const { page } = require('./smoke/page.cjs')
const { CASES } = require('./smoke/cases.cjs')

/**
 * The build's asset manifest: which names the page may ask for, their type and
 * their storage (D38). The page's own server answers from it exactly as the
 * host half does.
 */
const ASSETS = (() => {
  const manifest = path.join(ROOT, 'lib', 'assets', 'manifest.json')
  if (!fs.existsSync(manifest)) throw new Error('smoke: lib/assets/manifest.json is missing; run npm run build')
  return JSON.parse(fs.readFileSync(manifest, 'utf8')).assets
})()

/** End the run over a command line or a table that cannot be honoured. */
function bad(message) {
  console.error(`smoke: ${message}`)
  process.exit(2)
}

/**
 * What the command line asked for: `--case a,b` names cases, `--feature dir`
 * names a directory under packages/client/src/features/ and stands for the cases the table
 * gives it, `--quick` picks the tier. Both name flags may be repeated and
 * combined. An unknown argument, case or directory ends the run with exit 2, so
 * a misspelling cannot pass as a full run.
 */
function selection() {
  const cases = []
  const args = process.argv.slice(2)
  let quick = false
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--quick') {
      quick = true
      continue
    }
    const flag = arg === '--case' || arg.startsWith('--case=') ? 'case'
      : arg === '--feature' || arg.startsWith('--feature=') ? 'feature'
      : null
    if (flag === null) bad(`unknown argument "${arg}"`)
    const value = arg.includes('=') ? arg.slice(arg.indexOf('=') + 1) : args[++i]
    if (value === undefined || value.trim() === '') bad(`--${flag} needs a name`)
    for (const raw of value.split(',')) {
      const name = raw.trim()
      if (name === '') continue
      if (flag === 'case') {
        if (!Object.hasOwn(CASES, name)) bad(`no browser case named "${name}" — the cases are: ${Object.keys(CASES).join(', ')}`)
        cases.push(name)
        continue
      }
      if (!Object.hasOwn(FEATURE_CASES, name)) bad(`no feature directory named "${name}" — the directories are: ${Object.keys(FEATURE_CASES).join(', ')}`)
      if (FEATURE_CASES[name].length === 0) bad(`packages/client/src/features/${name}/ has no smoke case of its own`)
      cases.push(...FEATURE_CASES[name])
    }
  }
  return { cases: [...new Set(cases)], quick }
}

/**
 * Every case a manifest names has to exist: a renamed case ends the run
 * instead of quietly leaving its feature uncovered.
 */
function checkFeatureTable() {
  for (const [name, covered] of Object.entries(FEATURE_CASES)) {
    for (const one of covered) {
      if (!Object.hasOwn(CASES, one)) bad(`a manifest in packages/client/src/features/${name}/ names the case "${one}", which the case table does not hold`)
    }
  }
}

/** Load one case in a fresh tab and return the page's report. */
async function runCase(port, base, name) {
  const tab = await connectTab(port)
  try {
    await tab.send('Page.enable')
    // The machine's own motion setting must not decide a check: every case
    // runs with no reduced-motion request, and a probe that needs one asks
    // for it itself.
    await tab.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
    await tab.send('Page.navigate', { url: `${base}/${name}` })
    for (let i = 0; i < 100; i++) {
      const out = await tab.send('Runtime.evaluate', { expression: 'window.__smoke', awaitPromise: true, returnByValue: true })
      // A probe that throws rejects its promise, which CDP answers as an
      // exception carrying an empty object as the value: without this the case
      // would report "no report" instead of the failure that caused it.
      if (out.result && out.result.exceptionDetails) {
        const exception = out.result.exceptionDetails.exception
        throw new Error(`case "${name}" threw: ${(exception && exception.description) || out.result.exceptionDetails.text}`)
      }
      const result = out.result && out.result.result
      if (result && result.type === 'object') return result.value
      await sleep(100)
    }
    throw new Error(`case "${name}" never reported`)
  } finally {
    await tab.close()
  }
}

/**
 * The cases this run loads: the picked ones (or every case) minus the timing
 * cases the quick tier leaves out. A selection that leaves nothing ends the run
 * before the host half, so an empty quick run cannot look like a pass.
 */
function plan(only, quick) {
  const all = Object.keys(CASES)
  const timing = new Set(TIMING_CASES)
  const asked = only.length ? only : all
  const cases = asked.filter((name) => !(quick && timing.has(name)))
  const leftOut = quick ? asked.filter((name) => timing.has(name)) : []
  if (cases.length === 0) bad(`the quick tier leaves nothing to run: ${leftOut.join(', ')} watch motion`)
  return { cases, leftOut, total: all.length }
}

async function browserHalf(planned) {
  const { cases, leftOut, total } = planned
  const pages = pagesFor(cases)
  const browser = findChrome()
  if (!browser) {
    console.log('\nbrowser half — skipped: no Chrome/Edge found (set CHROME_PATH)')
    return { ran: false, scope: '' }
  }
  /** The page being served; the picture route answers for it. */
  let current = null
  const server = http.createServer((req, res) => {
    const name = new URL(req.url, 'http://x').pathname.slice(1)
    if (name === 'client.js') {
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' })
      res.end(fs.readFileSync(CLIENT))
    } else if (name === 'dsh-claude-style/hdsl-skin.png') {
      // The launcher's atlas, which the skin loads outside `fetch`, so the
      // page-side stand-in cannot answer it. `hdsl-broken` models a file the
      // player removed after the launcher wrote the contract.
      if (SKIN_CASES.indexOf(current) === -1) {
        res.writeHead(404, { 'cache-control': 'no-store' })
        res.end()
        return
      }
      res.writeHead(200, { 'content-type': 'image/png' })
      res.end(fs.readFileSync(SKIN_FIXTURE))
    } else if (name.startsWith('dsh-claude-style/assets/')) {
      // The routed assets, from the build output the host half serves them from
      // (D38). The manifest is the same gate here: a name the build did not
      // produce answers 404.
      const file = name.slice('dsh-claude-style/assets/'.length)
      const asset = ASSETS[file]
      if (asset === undefined) {
        res.writeHead(404)
        res.end()
        return
      }
      const stored = path.join(ROOT, 'lib', 'assets', asset.encoding === 'br' ? `${file}.br` : file)
      if (!fs.existsSync(stored)) {
        res.writeHead(404)
        res.end()
        return
      }
      res.writeHead(200, {
        'content-type': asset.type,
        'cache-control': 'public, max-age=31536000, immutable',
        // The page is a browser: it takes the stored payload as it lies.
        ...(asset.encoding === 'br' ? { 'content-encoding': 'br' } : {}),
      })
      res.end(fs.readFileSync(stored))
    } else {
      const entry = pages.find((one) => one.page === name)
      if (entry === undefined) {
        res.writeHead(404)
        res.end()
        return
      }
      current = name
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(page(name, tierName(), entry.cases))
    }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

  const base = `http://127.0.0.1:${server.address().port}`
  const chrome = await launchChrome(browser, { name: 'smoke', width: 1280, height: 800 })
  try {
    console.log(`\nbrowser half — tier ${tierName()} — ${cases.length} of ${total} cases in ${pages.length} page loads: ${cases.join(', ')}`)
    if (leftOut.length) console.log(`browser half — left out as timing: ${leftOut.join(', ')}`)
    for (const { page: pageName, cases: pageCases } of pages) {
      if (pageCases.length > 1) console.log(`\nbrowser half — page ${pageName} — ${pageCases.join(', ')}`)
      const report = await runCase(chrome.port, base, pageName)
      for (const name of pageCases) {
        console.log(`\nbrowser half — ${name}`)
        CASES[name](report)
      }
    }
    return { ran: true, scope: `${cases.length} of ${total} browser cases in ${pages.length} page loads, tier ${tierName()}` }
  } finally {
    server.close()
    await chrome.close()
  }
}

async function main() {
  const { cases, quick } = selection()
  checkFeatureTable()
  const planned = plan(cases, quick)
  setTier(quick ? 'quick' : 'full')
  await hostHalf()
  const { ran, scope } = await browserHalf(planned)
  const skipped = skips() === 0 ? '' : `, ${skips()} timing checks skipped`
  console.log(failures() === 0
    ? `\nsmoke: all checks passed (${scope}${skipped})${ran ? '' : ' (browser half skipped)'}`
    : `\nsmoke: ${failures()} check(s) failed`)
  process.exit(failures() > 0 ? 1 : ran ? 0 : 2)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
