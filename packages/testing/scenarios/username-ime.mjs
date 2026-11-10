#!/usr/bin/env node
/**
 * username-ime.mjs — the reader's own username under a Chinese input method on
 * the real host (D92).
 *
 * The field holds the reader's text as a draft until the edit commits. A save
 * that settled while a composition was open once wrote its older value back into
 * the field; the browser ended the composition there and the input method typed
 * the same pinyin again, which the reader saw as duplicated letters (issue
 * #299). Only a real host renders a live input, so the composition is driven
 * through Chrome's IME entry with the save debounce running underneath it, and
 * the run reads the field, the writes that reached it, and what the store keeps
 * once the page is loaded again. The username it finds is put back before the
 * scenario ends, so the home the next scenario boots on carries none of it.
 */
import { waitForSkin, dismissOverlays } from '../dsh-web.mjs'
import { openSkinSettings } from './settings-route.mjs'

/** The field the settings page draws for the custom username (settings-tab-general.ts). */
const FIELD = 'input.dsh-claude-settings-input'
/** The value this run starts from, which the store must take before the composition begins. */
const BASELINE = 'lane-base'
/** The text the input method composes, one syllable at a time. */
const COMPOSED = ['p', "p'p", "p'p'y"]
/** The text a second, abandoned edit leaves in the field. */
const DROPPED = 'lane-dropped'
/** Longer than the field's save debounce, so a save settles with the composition open. */
const COMPOSE_STEP_MS = 700
/** What a committed value takes to reach the store and come back on a reload. */
const SETTLE_MS = 1200
/** How long the settings page may take to draw its rows. */
const OPEN_TIMEOUT_MS = 20000

/** Runs before the page's own scripts: every write to the field and every composition event, in order. */
function instrument() {
  window.__usernameIme = []
  const t0 = performance.now()
  const at = () => Math.round(performance.now() - t0)
  const fieldOf = (node) => node !== null && node !== undefined && typeof node.matches === 'function' && node.matches('input.dsh-claude-settings-input')
  let composing = false
  document.addEventListener('compositionstart', (event) => {
    composing = true
    window.__usernameIme.push({ t: at(), kind: 'compositionstart', data: event.data })
  }, true)
  document.addEventListener('compositionend', (event) => {
    composing = false
    window.__usernameIme.push({ t: at(), kind: 'compositionend', data: event.data })
  }, true)
  document.addEventListener('input', (event) => {
    if (!fieldOf(event.target)) return
    window.__usernameIme.push({ t: at(), kind: 'input', composing: event.isComposing === true, value: event.target.value })
  }, true)
  // The value the page writes into the field, whoever asks for it: a controlled
  // input's own render is the write that ends a composition.
  const proto = HTMLInputElement.prototype
  const original = Object.getOwnPropertyDescriptor(proto, 'value')
  Object.defineProperty(proto, 'value', {
    configurable: true,
    enumerable: original.enumerable,
    get: original.get,
    set(value) {
      if (fieldOf(this) || composing) {
        window.__usernameIme.push({ t: at(), kind: 'write', composing, before: original.get.call(this), after: String(value) })
      }
      original.set.call(this, value)
    },
  })
}

function usernameImeScenario({ check }) {
  const fieldText = (page) => page.evaluate((selector) => {
    const input = document.querySelector(selector)
    return input === null ? null : input.value
  }, FIELD)

  /** Open the skin's settings page unless it already stands on the screen. */
  async function openSettings(page) {
    if (await fieldText(page) !== null) return
    await openSkinSettings(page)
    await page.locator(FIELD).waitFor({ timeout: OPEN_TIMEOUT_MS })
  }

  /** Leave the field, which commits the edit; the store takes it a debounce later. */
  async function commit(page) {
    await page.evaluate((selector) => document.querySelector(selector).blur(), FIELD)
    await page.waitForTimeout(SETTLE_MS)
  }

  /** Load the page again and read the username the store keeps. */
  async function storedUsername(page) {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await waitForSkin(page)
    await dismissOverlays(page)
    await openSettings(page)
    return fieldText(page)
  }

  return {
    script: 'greeting',
    prompt: 'hello there',
    initScript: instrument,
    async assert({ page, session }) {
      await openSettings(page)
      const found = await fieldText(page)
      await page.locator(FIELD).fill(BASELINE)
      await commit(page)
      const stored = await storedUsername(page)
      // The input method composes into the focused element, and the reload
      // above left the page on a fresh document.
      await page.locator(FIELD).focus()
      const cdp = await session.context.newCDPSession(page)
      const steps = []
      for (const text of COMPOSED) {
        await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length })
        await page.waitForTimeout(COMPOSE_STEP_MS)
        steps.push({ text, field: await fieldText(page) })
      }
      const log = await page.evaluate(() => window.__usernameIme.slice())
      const writes = log.filter((entry) => entry.kind === 'write' && entry.composing)
      // The composition commits where it stands, and the field is then left so
      // the edit settles into the store.
      await cdp.send('Input.insertText', { text: 'ppy' })
      await page.waitForTimeout(COMPOSE_STEP_MS)
      const committed = await fieldText(page)
      await commit(page)
      const keptAfterCommit = await storedUsername(page)
      // A second edit, dropped with Escape: the field gives the committed text
      // back, and the store, which the debounce may already have written
      // through, goes back to the username the edit replaced.
      await page.locator(FIELD).fill(DROPPED)
      await page.waitForTimeout(COMPOSE_STEP_MS)
      const typed = await fieldText(page)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(SETTLE_MS)
      await openSettings(page)
      const afterEscape = await fieldText(page)
      const keptAfterEscape = await storedUsername(page)
      // Put the reader's own username back: the home is shared with every other scenario.
      await page.locator(FIELD).fill(found ?? '')
      await commit(page)
      const restored = await storedUsername(page)
      return [
        check('the field shows the username the store holds', stored === BASELINE, `stored=${stored}`),
        check(
          'a composition held across the save debounce keeps the field on the reader\'s text',
          steps.every((step, at) => step.field === `${BASELINE}${COMPOSED[at]}`),
          steps.map((step) => `${step.text} → ${step.field}`).join(' | '),
        ),
        check('nothing writes the field while the composition is open', writes.length === 0, JSON.stringify(writes.slice(0, 2))),
        check('the committed text is what the store keeps', keptAfterCommit === committed, `field=${committed} stored=${keptAfterCommit}`),
        check(
          'Escape gives the committed text back and the store with it',
          afterEscape === keptAfterCommit && keptAfterEscape === keptAfterCommit,
          `typed=${typed} field=${afterEscape} stored=${keptAfterEscape}`,
        ),
        check('the username the scenario found is put back', restored === (found ?? ''), `wanted=${found} stored=${restored}`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { usernameImeScenario }
