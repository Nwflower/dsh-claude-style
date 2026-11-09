#!/usr/bin/env node
/**
 * Capture one README screenshot pair in light and dark after the privacy sweep.
 * Only the home scene, or the demo conversation whose every user message is the
 * demo prompt, is admissible. Usage: `node packages/testing/shoot.mjs --token <token>
 * [--brand <name>] [--scene <name>] [--session <title>]`; `prepare(page)` runs
 * before sanitizing.
 */
import fs from 'fs'
import path from 'path'
import { openBrowser } from './browser.mjs'
import { SESSION_NAMES, sanitizePage } from '../../scripts/shared/privacy.mjs'

const WIDTH = 1440
/** The home page fits the classic frame; a conversation turn needs the taller one. */
const HEIGHTS = { home: 900, conversation: 1240 }

/** The conversation scene's only admissible user message, and its session's default title. */
const DEMO_PROMPT = '用一段简短的示例，展示你支持的 Markdown 格式。'
const DEMO_TITLE = 'Markdown rendering tour'

/**
 * Canvas colors that identify the resolved palette, per brand. Host builtin
 * themes carry empty token maps, so every color comes from the stylesheets
 * branching on `data-ds-dark-theme`: dark tokens are the base, light overrides
 * sit under `:not([data-ds-dark-theme])`, and the DeepSeek brand rewrites both.
 */
const CANVAS = {
  claude: { light: 'rgb(255, 255, 255)', dark: 'rgb(25, 25, 25)' },
  deepseek: { light: 'rgb(255, 255, 255)', dark: 'rgb(19, 22, 29)' },
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Open the conversation titled `title` from the sidebar, and prove it is the
 * demo: a stand-in title and nothing but DEMO_PROMPT from the user.
 */
async function openDemoConversation(page, title) {
  if (!SESSION_NAMES.includes(title)) throw new Error(`"${title}" is not a stand-in title — refusing to open it`)
  const opened = await page.evaluate(`(() => {
    const row = [...document.querySelectorAll('[data-dsh-claude-part~="session-row"]')]
      .find((el) => { const t = el.querySelector('[data-dsh-claude-part~="row-title"]'); return t && t.textContent.trim() === ${JSON.stringify(title)} })
    if (!row) return false
    row.click()
    return true
  })()`)
  if (!opened) throw new Error(`no sidebar row titled "${title}" — expand its workspace in this instance first`)
  // The pointer never rests on the sidebar: a row's hover card shows its path.
  await page.mouse.move(WIDTH - 8, 400)
  await sleep(4000)
  const prompts = await page.evaluate(`[...document.querySelectorAll('[data-chat-flow-kind="user"]')].map((el) => el.innerText.trim().split('\\n')[0])`)
  if (!Array.isArray(prompts) || prompts.length === 0) throw new Error('the conversation shows no user message — is it the demo?')
  const foreign = prompts.filter((text) => text !== DEMO_PROMPT)
  if (foreign.length > 0) throw new Error(`the conversation holds user messages other than the demo prompt — refusing to screenshot it: ${JSON.stringify(foreign.map((t) => t.slice(0, 40)))}`)
  await page.evaluate(`document.querySelectorAll('[data-dsh-claude-part~="scroll-body"]').forEach((el) => { el.scrollTop = 0 })`)
  await sleep(500)
}

async function captureOnce(page, options, scheme, outFile) {
  const { scene, brand, startUrl } = options
  await page.setViewportSize({ width: WIDTH, height: HEIGHTS[scene] })
  await page.goto(startUrl, { waitUntil: 'domcontentloaded' })
  await sleep(12000)

  if (!(await page.evaluate(`!!document.body.hasAttribute('data-dsh-claude-style')`))) {
    throw new Error('theme not applied — is the plugin active in this profile?')
  }
  const pageBrand = await page.evaluate(`document.body.getAttribute('data-dsh-claude-brand')`)
  if (pageBrand !== brand) throw new Error(`the page carries brand "${pageBrand}", expected "${brand}" — switch the Theme style in settings`)

  if (scene === 'conversation') {
    await openDemoConversation(page, options.session)
  } else {
    // The host's chat renderer marks every row of a conversation with its flow kind.
    const turns = await page.evaluate(`document.querySelectorAll('[data-chat-flow-kind]').length`)
    if (turns > 0) throw new Error(`landing view shows ${turns} conversation rows — refusing to screenshot session content`)
  }
  if (options.prepare) await options.prepare(page)

  if (scheme === 'dark') {
    // The same DOM flip the theme service's presenter produces for the dark
    // snapshot; no durable preference is read or written.
    await page.evaluate(`document.body.setAttribute('data-ds-dark-theme', '')`)
  }
  const wantBg = CANVAS[brand][scheme]
  const bg = await page.evaluate(`getComputedStyle(document.body).backgroundColor`)
  if (bg !== wantBg) {
    throw new Error(`${scheme} palette did not take effect (body bg ${bg}, expected ${wantBg})`)
  }

  const { swapped, caught, visibleText } = await sanitizePage((expression) => page.evaluate(expression))

  // Presenter re-applies can race the flip; re-assert the palette at the last
  // moment so a wiped attribute fails the run instead of shipping a light
  // dark-mode screenshot.
  if (scheme === 'dark') {
    await page.evaluate(`document.body.setAttribute('data-ds-dark-theme', '')`)
    const bgAgain = await page.evaluate(`getComputedStyle(document.body).backgroundColor`)
    if (bgAgain !== wantBg) throw new Error(`dark palette was reverted before capture (${bgAgain})`)
  }

  const buf = await page.screenshot({ path: outFile })
  console.log(`captured ${outFile} (${buf.length} bytes, brand=${brand}, scene=${scene}, scheme=${scheme}, sanitized ${swapped} nodes, sweep caught ${caught.length})`)
  console.log('--- visible text ---')
  console.log(visibleText.replace(/\n{2,}/g, '\n').slice(0, 1200))
  console.log('--- end text ---')
}

/**
 * Capture one brand and scene in light and dark.
 *
 * @param options - `{ token, url, out, brand, scene, session, name, prepare }`:
 *   `name` is the file stem (default `<brand>-<scene>`), `prepare(page)` an
 *   optional hook that stages the page before the sanitize.
 * @returns the two files written.
 */
async function shoot(options) {
  const brand = options.brand || 'claude'
  const scene = options.scene || 'home'
  if (!CANVAS[brand]) throw new Error(`unknown brand "${brand}" (claude or deepseek)`)
  if (!HEIGHTS[scene]) throw new Error(`unknown scene "${scene}" (home or conversation)`)
  const base = (options.url || 'http://127.0.0.1:3080').replace(/\/+$/, '')
  const out = path.resolve(options.out || path.join(import.meta.dirname, '..', '..', 'docs', 'screenshots'))
  const name = options.name || `${brand}-${scene}`
  const run = {
    brand,
    scene,
    session: options.session || DEMO_TITLE,
    prepare: options.prepare,
    startUrl: `${base}/?token=${encodeURIComponent(options.token)}`,
  }
  fs.mkdirSync(out, { recursive: true })
  const files = [path.join(out, `${name}-light.png`), path.join(out, `${name}-dark.png`)]
  const instance = await openBrowser({ width: WIDTH, height: HEIGHTS[scene] })
  try {
    await captureOnce(instance.page, run, 'light', files[0])
    await captureOnce(instance.page, run, 'dark', files[1])
  } finally {
    await instance.close()
  }
  return files
}

export { shoot, DEMO_PROMPT, DEMO_TITLE, CANVAS }

if (import.meta.main) {
  const args = process.argv.slice(2)
  const argOf = (name) => {
    const i = args.indexOf('--' + name)
    return i === -1 ? undefined : args[i + 1]
  }
  const token = argOf('token') || process.env.DSH_WEB_TOKEN
  if (!token) {
    console.error('usage: node packages/testing/shoot.mjs --token <launch-token> [--url <base>] [--brand claude|deepseek] [--scene home|conversation] [--session <title>]')
    process.exit(2)
  }
  shoot({ token, url: argOf('url'), out: argOf('out'), brand: argOf('brand'), scene: argOf('scene'), session: argOf('session') })
    .then(() => console.log('\nSCREENSHOTS CAPTURED'))
    .catch((e) => { console.error(e.message || e); process.exitCode = 1 })
}
