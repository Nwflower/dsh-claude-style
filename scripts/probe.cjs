#!/usr/bin/env node
/**
 * probe.cjs — headless UI regression probe for the composer invariants.
 *
 * Drives a headless Chrome over CDP against a running DSH web GUI and asserts:
 *   1. the skin is applied (body[data-dsh-claude-style])
 *   2. a session page reaches phase "active"
 *   3. the composer seat is pinned to the viewport bottom (sticky contract —
 *      regression guard for the viewArea flex override incident)
 *   4. the composer field starts at one line (24px)
 *   5. the field grows with multiline content while the seat stays pinned
 *      (regression guard for the `[class*="row"]` → `.…_grow` substring hit)
 *   6. clearing restores the single-line height
 *
 * Usage:
 *   node scripts/probe.cjs --token <launch-token> [--url http://127.0.0.1:3080]
 *
 * The launch token comes from the GUI URL (`/?token=…`) of the running DSH
 * instance; it may also be passed via the DSH_WEB_TOKEN env var. Chrome is
 * launched headless with a throwaway profile (scripts/chrome.cjs) and stopped
 * when the probe ends.
 */
const { findChrome, launchChrome, connectTab } = require('./chrome.cjs')

const args = process.argv.slice(2)
const argOf = (name) => {
  const i = args.indexOf('--' + name)
  return i === -1 ? undefined : args[i + 1]
}
const TOKEN = argOf('token') || process.env.DSH_WEB_TOKEN
const BASE = (argOf('url') || 'http://127.0.0.1:3080').replace(/\/+$/, '')

if (!TOKEN) {
  console.error('usage: node scripts/probe.cjs --token <launch-token> [--url <base>]')
  process.exit(2)
}

const browser = findChrome()
if (!browser) {
  console.error('probe: no Chrome/Edge found; set CHROME_PATH')
  process.exit(2)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const chrome = await launchChrome(browser, { name: 'probe', width: 1440, height: 900 })
  try {
    return await probe(chrome.port)
  } finally {
    await chrome.close()
  }
}

/** Run the checks in a fresh tab; resolves with the number that failed. */
async function probe(port) {
  const { send, evalJs } = await connectTab(port)

  let failures = 0
  const check = (label, ok, detail) => {
    console.log((ok ? 'PASS' : 'FAIL') + '  ' + label + (detail ? '  (' + detail + ')' : ''))
    if (!ok) failures++
  }

  await send('Page.enable')
  await send('Page.navigate', { url: `${BASE}/?token=${TOKEN}` })
  await sleep(12000)

  check('skin applied', await evalJs(`!!document.body.hasAttribute('data-dsh-claude-style')`))

  // Open the most recent existing session. The sidebar's "new session" row
  // opens the hero, which has no session composer, and sessions can sit under
  // collapsed projects.
  const openSession = `(() => {
    const rows = Array.from(document.querySelectorAll('[class*="sessionRow"]'))
      .filter((r) => !/^(新会话|New session)$/i.test((r.textContent || '').trim()))
    if (!rows.length) return false
    const t = rows[0].closest('[role="treeitem"]') || rows[0]
    t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    t.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    t.click()
    t.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    t.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    return true
  })()`
  if (!(await evalJs(openSession))) {
    await evalJs(`(() => {
      for (const p of document.querySelectorAll('[class*="projectRow"]')) {
        if (p.getAttribute('aria-expanded') !== 'true') p.click()
      }
    })()`)
    await sleep(2000)
    if (!(await evalJs(openSession))) throw new Error('no existing session to open')
  }
  await sleep(7000)

  const state = () => evalJs(`(() => {
    const root = document.querySelector('[data-phase]')
    const seat = document.querySelector('[data-composer-seat]')
    const input = document.querySelector('[data-composer-card] [data-composer-input]')
    const rect = (el) => el ? el.getBoundingClientRect() : null
    const sr = rect(seat), ir = rect(input)
    return {
      phase: root && root.getAttribute('data-phase'),
      seatBottom: sr ? Math.round(sr.bottom) : null,
      inputH: ir ? Math.round(ir.height) : null,
      innerH: innerHeight,
    }
  })()`)

  const s0 = await state()
  check('session page active', s0.phase === 'active', 'phase=' + s0.phase)
  check('composer pinned at bottom', s0.seatBottom !== null && Math.abs(s0.seatBottom - s0.innerH) <= 2, 'seatBottom=' + s0.seatBottom + ' innerH=' + s0.innerH)
  check('single-line start (24px)', s0.inputH === 24, 'inputH=' + s0.inputH)

  // grow with multiline content
  await evalJs(`(() => { const i = document.querySelector('[data-composer-card] [data-composer-input]'); i.focus(); return true })()`)
  await send('Input.insertText', { text: 'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8' })
  await sleep(1500)
  const s1 = await state()
  check('field grows with content', s1.inputH !== null && s1.inputH >= 160, 'inputH=' + s1.inputH)
  check('seat stays pinned while grown', s1.seatBottom !== null && Math.abs(s1.seatBottom - s1.innerH) <= 2, 'seatBottom=' + s1.seatBottom)

  // clear the probe draft (real key events so Lexical processes them)
  await evalJs(`(() => { const i = document.querySelector('[data-composer-card] [data-composer-input]'); i.focus(); return true })()`)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2 })
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace' })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace' })
  await sleep(800)
  const s2 = await state()
  check('clears back to one line', s2.inputH === 24, 'inputH=' + s2.inputH)

  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
  return failures
}

main().then(
  (failures) => { process.exitCode = failures === 0 ? 0 : 1 },
  (e) => { console.error(e); process.exitCode = 1 },
)
