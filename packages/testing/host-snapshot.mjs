#!/usr/bin/env node
/**
 * host-snapshot.mjs — the host's own conversation and composer markup, captured
 * from a scratch instance of the installed host for the behaviour lane's
 * stand-in page (D3, D87).
 *
 * The two behaviour specs of the conversation's width and the composer's bottom
 * gap used to hand-build the host's phase root, conversation body, width handles
 * and input bar, and to write the host's numbers into the spec itself. Those are
 * the host's markup and the host's values: this tool boots a `dsh web` of its own
 * (a scratch home under .debug, never an instance the reader is using), sends one
 * scripted turn so the conversation stands in its active phase, runs the
 * screenshot path's privacy replacement and sweep over the page
 * (scripts/shared/privacy.mjs), and writes what the host wrote — tags, class
 * names, the host's own attributes, the room under the card and the two column
 * widths — to packages/testing/data/host-snapshot.json.
 *
 * The stand-in mounts its conversation frame from that file. The behaviour layer
 * reads the stored snapshot, so it cannot see the live host by itself: a host
 * upgrade is found when this command's output differs from the committed record,
 * and by the `contract` scenario's host-output observations, whose `computed`
 * entries compare the live host with this file. One command writes the record
 * again.
 *
 * Usage: node packages/testing/host-snapshot.mjs [--out <file>] [--home <dir>] [--viewport <w>x<h>]
 */
import fs from 'node:fs'
import path from 'node:path'
import { argOf } from './cli-args.mjs'
import { start, openPage, waitForSkin, dismissOverlays } from './dsh-web.mjs'
import { installedHostVersion } from './host-version.mjs'
import { startMockLlm } from './mock-llm.mjs'
import { sendPrompt, waitForTurn } from './prompt.mjs'
import { sanitizePage, assertClean } from '../../scripts/shared/privacy.mjs'
import { loadModule } from '../../scripts/shared/ts-module.mjs'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
/** Where the lane's stand-in reads the host's markup from. */
const SNAPSHOT = path.join(ROOT, 'packages', 'testing', 'data', 'host-snapshot.json')
/** The scratch home of the capture host: a run of its own, so no lane's state is read. */
const HOME = path.join(ROOT, '.debug', 'e2e', 'home-snapshot')
const VIEWPORT = { width: 1440, height: 900 }

const { HOST_DOM } = loadModule('packages/contracts/src/table.ts')
const { CONVERSATION_PARTS } = loadModule('packages/engine/src/parts-table.ts')
/** The literal of one contract entry, by id. */
const host = (id) => {
  const entry = HOST_DOM.find((candidate) => candidate.id === id)
  if (entry === undefined) throw new Error(`host snapshot: the contract table has no "${id}"`)
  return entry.value
}
/**
 * The host class local name of the composer stack, from the parts table: the
 * capture stops at the element carrying it, which is the stand-in's own anchor.
 */
const STACK_LOCAL = Object.entries(CONVERSATION_PARTS).find(([, part]) => part === 'composer-stack')?.[0]
if (STACK_LOCAL === undefined) throw new Error('host snapshot: the parts table names no composer stack')

/**
 * Attributes of the host's own that the skin writes or that carry the machine's
 * state: the skin's marks all start with `data-dsh`, and the variant and
 * attachment marks sit on a host card without that prefix. The session id is the
 * one attribute that would carry a reader's machine into the file.
 */
const OWN_HOST_ATTRIBUTES = new Set(['style', 'class', 'id', 'data-composer-variant', 'data-has-attachments', 'data-conversation-session'])

/**
 * Read the conversation frame in the page: the phase root and body the column
 * widths are declared on and their other children, and the composer's chain from
 * the card up to its stack. Runs in the browser.
 */
function readFrame({ contentSelector, cardSelector, stackLocal, dropped, contentWidthProperty, cardWidthProperty }) {
  const content = document.querySelector(contentSelector)
  const card = document.querySelector(cardSelector)
  if (content === null || card === null) throw new Error('host snapshot: the page shows no conversation body or composer card')
  const phase = content.parentElement
  if (phase === null) throw new Error('host snapshot: the conversation body has no phase root')
  const classesOf = (element) => [...element.classList].filter((token) => !token.startsWith('dsh-claude'))
  const attributesOf = (element) => Object.fromEntries([...element.attributes]
    .filter((attribute) => !attribute.name.startsWith('data-dsh') && !dropped.includes(attribute.name))
    .map((attribute) => [attribute.name, attribute.value]))
  const stepOf = (element) => {
    const step = { tag: element.tagName.toLowerCase(), classes: classesOf(element), attributes: attributesOf(element) }
    // The host's own wrapper around a slot keeps itself out of the layout from an
    // inline style; the stand-in has to carry that fact with the element.
    if (element.style.display === 'contents') step.style = { display: 'contents' }
    return step
  }
  const stack = (() => {
    for (let node = card.parentElement; node !== null && node !== phase; node = node.parentElement) {
      if ([...node.classList].some((token) => token.split('_').includes(stackLocal))) return node
    }
    return null
  })()
  if (stack === null) throw new Error(`host snapshot: no ancestor of the card carries the "${stackLocal}" class`)
  const scroller = content.querySelector('[data-conversation-scroll]')
  if (scroller === null) throw new Error('host snapshot: the conversation body holds no scroller')
  const bar = card.parentElement
  if (bar === null || bar === stack) throw new Error('host snapshot: the card stands directly in its stack, with no bar around it')
  const above = []
  for (let node = bar.parentElement; node !== null && node !== stack; node = node.parentElement) above.push(stepOf(node))
  const style = getComputedStyle(content)
  return {
    phase: stepOf(phase),
    content: {
      ...stepOf(content),
      properties: {
        [contentWidthProperty]: style.getPropertyValue(contentWidthProperty).trim(),
        [cardWidthProperty]: style.getPropertyValue(cardWidthProperty).trim(),
      },
    },
    siblings: [...content.children].filter((child) => child !== scroller).map(stepOf),
    composer: {
      bar: { ...stepOf(bar), paddingBottom: getComputedStyle(bar).paddingBottom },
      // Outward from the bar: the wrappers the host hangs the bar from.
      above,
      stack: stepOf(stack),
    },
  }
}

/** Refuse a value that would break out of the rule the stand-in writes it into. */
function ruleValue(value, where) {
  if (value === '' || /[;{}]/.test(value)) throw new Error(`host snapshot: ${where} reads ${JSON.stringify(value)}, which is no single declaration value`)
  return value
}

/** The day of the capture, in the reader's own time. */
function today() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * The real path of a path that may not exist yet: the nearest ancestor that
 * exists is resolved, and the rest is appended. A directory junction under
 * `.debug` that points outside is then refused as the outside path it is.
 */
function realPathOf(target) {
  const rest = []
  let existing = target
  while (!fs.existsSync(existing)) {
    rest.unshift(path.basename(existing))
    const parent = path.dirname(existing)
    if (parent === existing) break
    existing = parent
  }
  return path.join(fs.realpathSync(existing), ...rest)
}

/**
 * The scratch home a capture may use: a directory under this tree's `.debug`,
 * and not `.debug` itself. A capture resets the home it is given, so any other
 * path is refused before the scripted model or the host starts. The test reads
 * resolved, real paths, never how a shell spelled them.
 */
function scratchHome(requested) {
  const debug = realPathOf(path.join(ROOT, '.debug'))
  const home = realPathOf(path.resolve(requested ?? HOME))
  const inside = path.relative(debug, home)
  if (inside === '' || inside === '..' || inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside)) {
    throw new Error(`host snapshot: --home must name a directory under ${debug}, not ${home}`)
  }
  return home
}

/** One run: boot a host, take the frame, write the record. */
async function capture(options) {
  const viewport = options.viewport ?? VIEWPORT
  // Before the model service or the host starts: the home is reset by the boot.
  const home = scratchHome(options.home)
  const mock = await startMockLlm({ script: 'greeting' })
  let hostInstance
  let session
  try {
    hostInstance = await start({
      patch: ['- id: llm-deepseek', '  config:', `    baseURL: ${mock.url}`, '    apiKeyEnv: MOCK_KEY'].join('\n'),
      env: { MOCK_KEY: 'mock' },
      home,
      resetState: true,
    })
    console.log(`host snapshot: host ${hostInstance.url}`)
    session = await openPage(hostInstance.url, viewport)
    const { page } = session
    await waitForSkin(page)
    if (!(await dismissOverlays(page))) throw new Error('host snapshot: the shell left a first-run overlay open')
    await sendPrompt(page, 'hello there')
    await waitForTurn(page)
    // The host paints the composer's seat and the column's handles after the
    // turn settles; one frame is enough, the next read waits for layout anyway.
    await page.waitForTimeout(500)
    const sanitized = await sanitizePage((expression) => page.evaluate(expression))
    if (sanitized.swapped > 0 || sanitized.caught.length > 0) {
      console.log(`host snapshot: privacy replaced ${sanitized.swapped} node${sanitized.swapped === 1 ? '' : 's'} and swept ${sanitized.caught.length}`)
    }
    const frame = await page.evaluate(readFrame, {
      contentSelector: host('chat.content'),
      cardSelector: host('composer.card'),
      stackLocal: STACK_LOCAL,
      dropped: [...OWN_HOST_ATTRIBUTES],
      contentWidthProperty: host('chat.content-width'),
      cardWidthProperty: host('composer.card-max-width'),
    })
    ruleValue(frame.content.properties[host('chat.content-width')], 'the column width')
    ruleValue(frame.content.properties[host('composer.card-max-width')], 'the composer card width')
    if (frame.content.classes.length === 0) throw new Error('host snapshot: the conversation body carries no host class name')
    if (frame.composer.bar.classes.length === 0) throw new Error('host snapshot: the bar around the card carries no host class name')
    const snapshot = {
      note: 'The host\'s own conversation and composer markup, captured by packages/testing/host-snapshot.mjs on a scratch host and read by the stand-in page (packages/testing/specs/fixtures/host-frame.mjs, D3, D87). Regenerate with node packages/testing/host-snapshot.mjs.',
      host: { version: installedHostVersion(), viewport, captured: today() },
      conversation: { phase: frame.phase, content: frame.content, siblings: frame.siblings },
      composer: frame.composer,
    }
    assertClean(JSON.stringify(snapshot))
    fs.mkdirSync(path.dirname(path.resolve(options.out ?? SNAPSHOT)), { recursive: true })
    fs.writeFileSync(path.resolve(options.out ?? SNAPSHOT), `${JSON.stringify(snapshot, null, 2)}\n`)
    console.log(`host snapshot: ${hostInstance.home} → ${options.out ?? SNAPSHOT}`)
    console.log(`  phase ${frame.phase.tag}${frame.phase.classes.map((name) => `.${name}`).join('')}, content ${frame.content.classes.map((name) => `.${name}`).join('') || '(no class)'}`)
    console.log(`  column ${frame.content.properties[host('chat.content-width')]}`)
    console.log(`  card ${frame.content.properties[host('composer.card-max-width')]}`)
    console.log(`  handles ${frame.siblings.length}, bar padding-bottom ${frame.composer.bar.paddingBottom}`)
    return snapshot
  } finally {
    if (session !== undefined) await session.close()
    if (hostInstance !== undefined) hostInstance.stop()
    await mock.stop()
  }
}

if (import.meta.main) {
  capture({ out: argOf('out'), home: argOf('home'), viewport: argOf('viewport') === undefined ? undefined : sizeOf(argOf('viewport')) }).catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}

/** Parse a `--viewport` as `<width>x<height>`. */
function sizeOf(spec) {
  const match = /^(\d+)x(\d+)$/.exec(spec)
  if (match === null) throw new Error(`--viewport takes <width>x<height>, not "${spec}"`)
  return { width: Number(match[1]), height: Number(match[2]) }
}

export { capture, SNAPSHOT }
