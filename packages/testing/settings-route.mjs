#!/usr/bin/env node
/**
 * Enter skin settings through the host shortcut. Current shells expose the
 * entry through the account menu; older web shells open the dialog directly (D87).
 */
import { bound } from './bounds.mjs'

const SETTINGS_PAGE = '.dsh-claude-settings'
const MENU_WAIT_MS = bound('settingsRouteMenuWaitMs')
const SETTINGS_WAIT_MS = bound('settingsRouteDialogWaitMs')
async function openSkinSettings(page) {
  await page.keyboard.press('Control+Alt+Comma')
  await page.waitForTimeout(MENU_WAIT_MS)
  const entry = page.locator('[role="menu"] [role="menuitem"]').first()
  if (await entry.count() > 0) {
    await entry.click({ force: true })
    await page.waitForTimeout(800)
  }
  await page.getByText('Claude Style', { exact: true }).first().click({ force: true })
  await page.locator(SETTINGS_PAGE).first().waitFor({ timeout: SETTINGS_WAIT_MS })
}

export { openSkinSettings, SETTINGS_PAGE }
