#!/usr/bin/env node
/**
 * smoke.cjs — zero-dependency smoke test of the BUILT plugin (`lib/`); no running
 * DSH instance is needed.
 *
 * Host half, in Node: `host/index.js` is applied to a fake cordis context and the
 * username and session-delete routes get the request shapes that matter
 * (docs/architecture.md D11) — a cross-site page, a LAN peer and the browser's
 * own same-origin fetch, plus the deletion route's own guards (POST only, the id
 * shape, an open session, a path-shaped id) and a real deletion against a
 * scratch harness home under .debug/ — once through a host that offers
 * `connection.requestRejection()` and once through the local stand-in.
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
 *   - teardown   dispose leaves no skin node, marker, body attribute or
 *                stylesheet behind, and no pass runs afterwards.
 *
 * This file is the runner. The parts live in scripts/smoke/: shared.cjs (paths,
 * fixtures, `check`), host-half.cjs (the Node half), page.cjs (one case's
 * stand-in page), stand-in.js and probe.js (the scripts that page runs before
 * and after the bundle) and cases.cjs (what each case's report must show).
 *
 * Usage: node scripts/smoke.cjs        (CHROME_PATH overrides the browser lookup)
 * Exit:  0 every check passed · 1 a check failed · 2 the browser half could not run
 */
'use strict'
const fs = require('fs')
const http = require('http')
const { findChrome, launchChrome, connectTab } = require('./chrome.cjs')
const { CLIENT, SKIN_FIXTURE, SKIN_CASES, sleep, check, failures } = require('./smoke/shared.cjs')
const { hostHalf } = require('./smoke/host-half.cjs')
const { page } = require('./smoke/page.cjs')
const { CASES } = require('./smoke/cases.cjs')

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

async function browserHalf() {
  const browser = findChrome()
  if (!browser) {
    console.log('\nbrowser half — skipped: no Chrome/Edge found (set CHROME_PATH)')
    return false
  }
  /** The case whose page is being served; the picture route answers for it. */
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
    } else if (Object.prototype.hasOwnProperty.call(CASES, name)) {
      current = name
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(page(name))
    } else {
      res.writeHead(404)
      res.end()
    }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

  const base = `http://127.0.0.1:${server.address().port}`
  const chrome = await launchChrome(browser, { name: 'smoke', width: 1280, height: 800 })
  try {
    for (const name of Object.keys(CASES)) {
      console.log(`\nbrowser half — ${name}`)
      CASES[name](await runCase(chrome.port, base, name))
    }
    return true
  } finally {
    server.close()
    await chrome.close()
  }
}

async function main() {
  await hostHalf()
  const ran = await browserHalf()
  console.log(failures() === 0 ? `\nsmoke: all checks passed${ran ? '' : ' (browser half skipped)'}` : `\nsmoke: ${failures()} check(s) failed`)
  process.exit(failures() > 0 ? 1 : ran ? 0 : 2)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
