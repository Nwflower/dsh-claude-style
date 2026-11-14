#!/usr/bin/env node
/**
 * Enter skin settings through the host shortcut. Current shells expose the
 * entry through the account menu; older web shells open the dialog directly (D92).
 */
import { bound } from '../bounds.mjs'

const SETTINGS_PAGE = '.dsh-claude-settings'
const MENU_WAIT_MS = bound('settingsRouteMenuWaitMs')
const SETTINGS_WAIT_MS = bound('settingsRouteDialogWaitMs')

/** Whether the skin's page stands visible on the page. */
const pageUp = (page) => page.evaluate((selector) => {
  const node = document.querySelector(selector)
  return node !== null && node.getClientRects().length > 0
}, SETTINGS_PAGE)

/**
 * Press what the shell opened: the account menu's first row when the shortcut
 * opened that menu, the skin's own entry when the dialog already stands. The
 * read and the press are one synchronous step, so a repaint between them cannot
 * take the element away (the shell's overlays open and close on their own).
 */
const pressEntry = (page) => page.evaluate(() => {
  const settings = document.querySelector('.dsh-claude-settings')
  if (settings !== null && settings.getClientRects().length > 0) return 'open'
  const menu = document.querySelector('[role="menu"] [role="menuitem"]')
  if (menu !== null) { menu.click(); return 'menu' }
  const entry = [...document.querySelectorAll('button, a, [role="tab"], [role="menuitem"]')]
    .find((node) => (node.textContent || '').trim() === 'Claude Style')
  if (entry !== undefined) { entry.click(); return 'entry' }
  return 'none'
})

async function openSkinSettings(page) {
  if (await pageUp(page)) return
  await page.keyboard.press('Control+Alt+Comma')
  // The shortcut answers with the account menu or with the dialog itself: wait
  // for whichever the shell shows before pressing anything.
  await page.waitForFunction((selector) => {
    const settings = document.querySelector(selector)
    if (settings !== null && settings.getClientRects().length > 0) return true
    if (document.querySelector('[role="menu"] [role="menuitem"]') !== null) return true
    return [...document.querySelectorAll('button, a, [role="tab"], [role="menuitem"]')]
      .some((node) => (node.textContent || '').trim() === 'Claude Style')
  }, SETTINGS_PAGE, { timeout: SETTINGS_WAIT_MS })
  if (await pressEntry(page) === 'menu') {
    // The menu row opens the host's settings dialog; its nav entry is pressed
    // in one step once it stands.
    await page.waitForTimeout(MENU_WAIT_MS)
    await page.waitForFunction((selector) => {
      const settings = document.querySelector(selector)
      if (settings !== null && settings.getClientRects().length > 0) return true
      return [...document.querySelectorAll('button, a, [role="tab"], [role="menuitem"]')]
        .some((node) => (node.textContent || '').trim() === 'Claude Style')
    }, SETTINGS_PAGE, { timeout: SETTINGS_WAIT_MS })
    await page.evaluate(() => {
      const settings = document.querySelector('.dsh-claude-settings')
      if (settings !== null && settings.getClientRects().length > 0) return
      const entry = [...document.querySelectorAll('button, a, [role="tab"], [role="menuitem"]')]
        .find((node) => (node.textContent || '').trim() === 'Claude Style')
      if (entry !== undefined) entry.click()
    })
  }
  await page.waitForFunction((selector) => {
    const node = document.querySelector(selector)
    return node !== null && node.getClientRects().length > 0
  }, SETTINGS_PAGE, { timeout: SETTINGS_WAIT_MS })
}

export { openSkinSettings, SETTINGS_PAGE }
