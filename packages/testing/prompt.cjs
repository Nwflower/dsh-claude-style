#!/usr/bin/env node
/**
 * prompt.cjs — sending a prompt on the scratch page, for the lane's scenarios
 * (D45).
 *
 * Their own module rather than blocks inside packages/testing/e2e.cjs, which is
 * at its stop line (AGENTS.md): every scenario module sends and waits the same
 * way, and importing them from `e2e.cjs` would close a cycle.
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
  await page.click(HOST.composer)
  await page.keyboard.type(text)
  await page.waitForTimeout(200)
  await page.keyboard.press('Enter')
  // The host echoes the submission as its own row; the row is attached even
  // while the send flight hides it, so this waits for attachment alone. Without
  // it the turn never started, and the timeout further on would say nothing
  // about why.
  try {
    await page.waitForSelector(HOST.userRow, { state: 'attached', timeout: 20000 })
  } catch {
    throw new Error('the composer did not hand the prompt to a turn (no user row appeared)')
  }
}

/** Wait until the turn has settled: its tail row is there and nothing streams. */
async function waitForTurn(page, timeoutMs = 90000) {
  await page.waitForSelector(HOST.turnTail, { timeout: timeoutMs })
  await page.waitForFunction((selector) => document.querySelectorAll(selector).length === 0, HOST.streaming, { timeout: timeoutMs })
}

/**
 * Put the host in one work-details mode and wait until the page has adopted it.
 *
 * The write goes through the host's settings service and the page re-reads the
 * answer, so a scenario that sends a turn right after a write could race the
 * attribute the reading view reads. A host already holding the wanted value
 * answers the write with no change at all, so the page is first moved to a mode
 * that differs, then to the wanted one.
 */
async function setWorkDetails(page, mode, timeoutMs = 10000) {
  const adopted = () => page.evaluate((wanted) => document.body.getAttribute('data-dsh-claude-step-display') === wanted, mode)
  const wait = async () => {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if (await adopted()) return true
      await page.waitForTimeout(150)
    }
    return false
  }
  await page.evaluate((wanted) => window.__dshStepDisplay?.set(wanted), mode)
  if (await wait()) return true
  const bridge = await page.evaluate(() => window.__dshStepDisplay !== undefined)
  if (!bridge) throw new Error('the work-details bridge is not on the page (skill/core/step-display.ts)')
  await page.evaluate((wanted) => window.__dshStepDisplay.set(wanted === 'compact' ? 'standard' : 'compact'), mode)
  await page.waitForTimeout(300)
  await page.evaluate((wanted) => window.__dshStepDisplay.set(wanted), mode)
  if (!await wait()) throw new Error(`the page never adopted the work-details mode "${mode}"`)
  return true
}

module.exports = { sendPrompt, waitForTurn, setWorkDetails, PROMPT_HOST: HOST }
