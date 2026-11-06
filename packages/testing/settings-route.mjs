#!/usr/bin/env node
/**
 * settings-route.mjs — entering the skin's settings page from the host's shell
 * (D87).
 *
 * The way in is the host's own shortcut, and which shell answers it decides the
 * route: the older web shell opens the settings dialog itself, while the newer
 * one — the desktop and the current web shell — answers it with its account
 * menu, whose settings row leads to the dialog. Both lanes that walk the
 * settings page come in through here, so the route lives in one place.
 */
import { bound } from './bounds.mjs'

/** The skin's settings root: what both routes end on. */
const SETTINGS_PAGE = '.dsh-claude-settings'

/** How long the host may take to answer the shortcut with its account menu. */
const MENU_WAIT_MS = bound('settingsRouteMenuWaitMs')

/** How long the settings dialog may take after its entry is pressed. */
const SETTINGS_WAIT_MS = bound('settingsRouteDialogWaitMs')

/**
 * Open the skin's settings page in the host's shell.
 *
 * @param page - the Playwright page on the host.
 */
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
