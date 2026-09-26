#!/usr/bin/env node
/**
 * shoot.cjs — capture the README screenshots (docs/light.png, docs/dark.png).
 *
 * Drives a headless Chrome over CDP against a running DSH web GUI with this
 * theme loaded, replaces personal data in the DOM (workspace / session titles,
 * inferred username, absolute paths, quota amounts) with neutral stand-ins,
 * then captures the new-conversation hero in light and dark. Dark mode is
 * produced by setting `body[data-ds-dark-theme]` — the same DOM state the
 * host's theme presenter produces for the dark palette — instead of writing
 * the shared theme preference or relying on emulation, which the durable
 * light preference would ignore. The visible text must pass a leak sweep
 * before anything is written, so a miss fails the run instead of shipping a
 * screenshot with real workspace names in it.
 *
 * Usage:
 *   node scripts/shoot.cjs --token <launch-token> [--url http://127.0.0.1:3080]
 *
 * The launch token comes from the `dsh web` banner (GUI URL `/?token=…`) or
 * the DSH_WEB_TOKEN env var. Chrome is launched headless with a throwaway
 * profile (scripts/chrome.cjs) and stopped when the run ends.
 */
const fs = require('fs')
const path = require('path')
const { findChrome, launchChrome, connectTab } = require('./chrome.cjs')

const args = process.argv.slice(2)
const argOf = (name) => {
  const i = args.indexOf('--' + name)
  return i === -1 ? undefined : args[i + 1]
}
const TOKEN = argOf('token') || process.env.DSH_WEB_TOKEN
const BASE = (argOf('url') || 'http://127.0.0.1:3080').replace(/\/+$/, '')
const OUT = path.resolve(argOf('out') || path.join(__dirname, '..', 'docs'))
const WIDTH = 1440
const HEIGHT = 900

if (!TOKEN) {
  console.error('usage: node scripts/shoot.cjs --token <launch-token> [--url <base>]')
  process.exit(2)
}

const START_URL = `${BASE}/?token=${encodeURIComponent(TOKEN)}`

/** Neutral stand-ins for the six sidebar workspace rows and the session titles. */
const PROJECT_NAMES = ['demo-project', 'sample-app', 'docs-site', 'theme-lab', 'notes-app', 'e-comm-demo']
const SESSION_NAMES = [
  'Fix flaky onboarding test',
  'Add CSV export',
  'Refactor auth flow',
  'Polish settings page',
  'Update README screenshots',
  'Investigate scroll jitter',
  'Migrate build script',
  'Trim bundle size',
]
const USERNAME = 'you'

/**
 * Canvas colors that identify the resolved palette. Host builtin themes carry
 * empty token maps, so every color comes from the stylesheets branching on
 * `data-ds-dark-theme`: dark tokens are the base, light overrides sit under
 * `:not([data-ds-dark-theme])`.
 */
const LIGHT_BG = 'rgb(252, 252, 251)'
const DARK_BG = 'rgb(20, 20, 19)'

/**
 * Personal-data regex sources, kept as strings so the page sweep and the
 * final assertion rebuild from one copy. LEAK covers the local username,
 * drive paths and quota amounts; PATH and BALANCE cover the two rewrites.
 */
const USERNAME_RE_SOURCE = 'Nwflower'
const PATH_RE_SOURCE = '[A-Z]:[\\\\/][^\\\\s"\']*'
const BALANCE_RE_SOURCE = '\u00a5\\s?[0-9][0-9.,]*'

if (!new RegExp(`${USERNAME_RE_SOURCE}|${PATH_RE_SOURCE}`, 'i').test('C:\\Users\\Nwflower\\tmp')) {
  console.error('shoot: leak regex failed self-test')
  process.exit(2)
}

const browser = findChrome()
if (!browser) {
  console.error('shoot: no Chrome/Edge found; set CHROME_PATH')
  process.exit(2)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Replace sidebar titles with stand-ins; swap the username nodes for static
 *  ones under a different class — the theme's footer sync re-writes any node
 *  still carrying `.dsh-claude-account-user` with the inferred real name, so
 *  the stand-in must be invisible to that query. */
const SANITIZE_JS = `(() => {
  const projects = ${JSON.stringify(PROJECT_NAMES)}
  const sessions = ${JSON.stringify(SESSION_NAMES)}
  let swapped = 0
  document.querySelectorAll('[class*="projectRow"]').forEach((row, i) => {
    const el = row.querySelector('[class*="projectText"]')
    if (el && (el.textContent || '').trim()) { el.textContent = projects[i % projects.length]; swapped++ }
  })
  document.querySelectorAll('[class*="sessionRow"] [class*="title"]').forEach((el, i) => {
    if ((el.textContent || '').trim()) { el.textContent = sessions[i % sessions.length]; swapped++ }
  })
  document.querySelectorAll('.dsh-claude-account-user').forEach((el) => {
    const rep = document.createElement('span')
    rep.className = 'dsh-claude-account-you'
    rep.style.cssText = 'font-weight:500;color:var(--dsw-alias-label-primary);'
    rep.textContent = ${JSON.stringify(USERNAME)}
    el.replaceWith(rep)
    swapped++
  })
  document.querySelectorAll('.dsh-claude-account-popover-name').forEach((el) => {
    const rep = document.createElement('div')
    rep.className = 'dsh-claude-account-popover-name-static'
    rep.style.cssText = 'font-size:14px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-primary);'
    rep.textContent = ${JSON.stringify(USERNAME)}
    el.replaceWith(rep)
    swapped++
  })
  return swapped
})()`

/** Rewrite any surviving username / drive-path / quota text; report what was caught. */
const SWEEP_JS = `(() => {
  const userRe = new RegExp(${JSON.stringify(USERNAME_RE_SOURCE)}, 'gi')
  const pathRe = new RegExp(${JSON.stringify(PATH_RE_SOURCE)}, 'g')
  const balRe = new RegExp(${JSON.stringify(BALANCE_RE_SOURCE)}, 'g')
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const caught = []
  while (walker.nextNode()) {
    const node = walker.currentNode
    const text = node.nodeValue || ''
    userRe.lastIndex = 0; pathRe.lastIndex = 0; balRe.lastIndex = 0
    if (userRe.test(text) || pathRe.test(text) || balRe.test(text)) {
      caught.push(text.trim().slice(0, 80))
      node.nodeValue = text
        .replace(userRe, ${JSON.stringify(USERNAME)})
        .replace(pathRe, '…')
        .replace(balRe, '\u00a5\u2022\u2022')
    }
  }
  return caught
})()`

/** The palette must not contain personal data anywhere in its visible text. */
function assertClean(visibleText) {
  const leak = new RegExp(`${USERNAME_RE_SOURCE}|${PATH_RE_SOURCE}|${BALANCE_RE_SOURCE}`, 'i')
  if (leak.test(visibleText)) throw new Error('sensitive text still visible after sanitize')
}

async function captureOnce({ send, evalJs }, scheme, outFile) {
  await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false })
  await send('Page.enable')
  await send('Page.navigate', { url: START_URL })
  await sleep(12000)

  if (!(await evalJs(`!!document.body.hasAttribute('data-dsh-claude-style')`))) {
    throw new Error('theme not applied — is the plugin active in this profile?')
  }

  if (scheme === 'dark') {
    // The same DOM flip the theme service's presenter produces for the dark
    // snapshot; no durable preference is read or written.
    await evalJs(`document.body.setAttribute('data-ds-dark-theme', '')`)
  }
  const wantBg = scheme === 'dark' ? DARK_BG : LIGHT_BG
  const bg = await evalJs(`getComputedStyle(document.body).backgroundColor`)
  if (bg !== wantBg) {
    throw new Error(`${scheme} palette did not take effect (body bg ${bg}, expected ${wantBg})`)
  }

  const turns = await evalJs(`document.querySelectorAll('[data-turn], [data-message-id]').length`)
  if (turns > 0) throw new Error(`landing view shows ${turns} conversation turns — refusing to screenshot session content`)

  const swapped = await evalJs(SANITIZE_JS)
  const caught = await evalJs(SWEEP_JS)
  const visibleText = await evalJs(`document.body.innerText`)
  assertClean(visibleText)

  // Presenter re-applies can race the flip; re-assert the palette at the last
  // moment so a wiped attribute fails the run instead of shipping a light
  // dark-mode screenshot.
  if (scheme === 'dark') {
    await evalJs(`document.body.setAttribute('data-ds-dark-theme', '')`)
    const bgAgain = await evalJs(`getComputedStyle(document.body).backgroundColor`)
    if (bgAgain !== wantBg) throw new Error(`dark palette was reverted before capture (${bgAgain})`)
  }

  const shot = await send('Page.captureScreenshot', { format: 'png' })
  const buf = Buffer.from(shot.result.data, 'base64')
  fs.writeFileSync(outFile, buf)
  console.log(`captured ${outFile} (${buf.length} bytes, scheme=${scheme}, sanitized ${swapped} nodes, sweep caught ${caught.length})`)
  console.log('--- visible text ---')
  console.log(visibleText.replace(/\n{2,}/g, '\n').slice(0, 1200))
  console.log('--- end text ---')
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const chrome = await launchChrome(browser, { name: 'shoot', width: WIDTH, height: HEIGHT })
  try {
    const conn = await connectTab(chrome.port)
    await captureOnce(conn, 'light', path.join(OUT, 'light.png'))
    await captureOnce(conn, 'dark', path.join(OUT, 'dark.png'))
  } finally {
    await chrome.close()
  }
  console.log('\nSCREENSHOTS CAPTURED')
}

main().catch((e) => { console.error(e.message || e); process.exitCode = 1 })
