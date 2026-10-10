#!/usr/bin/env node
/**
 * prompt.cjs — sending a prompt on the scratch page, for the lane's scenarios
 * (D45).
 *
 * The runner (packages/testing/e2e.cjs) and every scenario module send and wait
 * the same way, so both import them from here.
 */
'use strict'

/** The host's own marks this module waits on; each is a D44 entry in packages/contracts/src/dom.ts. */
const HOST = {
  composer: '[data-composer-input]', // COMPOSER_INPUT_SELECTOR
  userRow: '[data-chat-flow-kind="user"]', // FLOW_KIND_ATTRIBUTE with the host's user kind
  streaming: '[data-streaming]', // STREAMING_SELECTOR
  turnTail: '[data-chat-flow-kind="turn-tail"]',
}

/** Type a prompt into the composer and send it, the way a reader does. */
async function sendPrompt(page, text) {
  await page.waitForSelector(HOST.composer, { timeout: 60000 })
  // Focused by the element, not by a press at a point: on a fresh page the
  // sidebar is still settling, and a press aimed at the composer's centre
  // landed on the workspace control in a narrow window (the CI lane's `narrow`
  // scenario), which opened its menu instead and left the prompt unsent.
  await page.evaluate((selector) => document.querySelector(selector)?.focus(), HOST.composer)
  await page.keyboard.type(text)
  // Typing needs the host's own editable surface to hold the caret; a press at
  // it is the fallback, and what landed there is read back.
  if (!await composed(page, text)) {
    await page.click(HOST.composer).catch(() => {})
    await page.waitForTimeout(150)
    await page.keyboard.type(text)
  }
  await page.waitForTimeout(200)
  await page.keyboard.press('Enter')
  // The host echoes the submission as its own row; the row is attached even
  // while the send flight hides it, so this waits for attachment alone.
  try {
    await page.waitForSelector(HOST.userRow, { state: 'attached', timeout: 20000 })
  } catch {
    const state = await page.evaluate((selector) => {
      const composer = document.querySelector(selector)
      return {
        value: composer === null ? null : composer.value ?? composer.textContent ?? '',
        focused: composer === document.activeElement,
        dialogs: [...document.querySelectorAll('[role="dialog"], [role="menu"]')].filter(node => node.getBoundingClientRect().height > 0).length,
        rows: document.querySelectorAll('[data-chat-flow-kind]').length,
      }
    }, HOST.composer).catch(() => null)
    throw new Error(`the composer did not hand the prompt to a turn: ${JSON.stringify({ typed: text, ...state })}`)
  }
}

/** Whether the composer holds the text just typed into it, one retry's wait included. */
async function composed(page, text, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const held = await page.evaluate((selector) => (document.querySelector(selector)?.textContent ?? '').trim(), HOST.composer)
    if (held === text.trim()) return true
    if (Date.now() > deadline) return false
    await page.waitForTimeout(100)
  }
}

/** Wait until the turn has settled: its tail row is there and nothing streams. */
async function waitForTurn(page, timeoutMs = 90000) {
  await page.waitForSelector(HOST.turnTail, { timeout: timeoutMs })
  await page.waitForFunction((selector) => document.querySelectorAll(selector).length === 0, HOST.streaming, { timeout: timeoutMs })
}

module.exports = { sendPrompt, waitForTurn, PROMPT_HOST: HOST }
