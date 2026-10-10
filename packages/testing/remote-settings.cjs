#!/usr/bin/env node
/**
 * remote-settings.cjs — a page under a non-loopback name on the real host
 * (D60, D45).
 *
 * The host's settings-form service keeps a page whose hostname is not loopback
 * in memory: it never reads the settings document and saves nothing. The skin
 * reads its own namespace through the remote instead and makes its settings
 * page read-only there. The scenario starts the host trusting one more name,
 * maps that name onto the loopback address in the browser, and opens the same
 * instance under both names. It writes the theme style from the loopback page
 * and asserts the remote page follows without a reload, reads the same value
 * at boot, and shows its settings page with the notice and every control
 * disabled. The settings document lives in the scratch home the other
 * scenarios share, so the scenario writes the theme style back before it ends.
 */
'use strict'
const { waitForSkin, dismissOverlays } = require('./dsh-web.cjs')

/** The non-loopback name the remote page is opened under; the browser maps it onto 127.0.0.1. */
const REMOTE_NAME = 'remote.test'

/** The skin's marks this scenario reads (packages/client/src/constants.ts and the settings page). */
const SKIN = {
  brand: 'data-dsh-claude-brand', // BRAND_ATTR
  page: '.dsh-claude-settings',
  rows: 'fieldset.dsh-claude-settings-rows',
  notice: '.dsh-claude-settings-notice',
  error: '.dsh-claude-settings-error',
  // The theme style's choices carry the brand they pick on their logo.
  brandCard: (brand) => `.dsh-claude-brand-card:has(.dsh-claude-brand-card-logo[data-brand="${brand}"])`,
}

/** How long a written value may take to reach the other page. */
const FOLLOW_TIMEOUT_MS = 15000

const brandOf = (page) => page.evaluate((attribute) => document.body.getAttribute(attribute), SKIN.brand)

/** Whether the page comes to carry `brand` within the bound. */
const reaches = (page, brand) => page.waitForFunction(
  ({ attribute, wanted }) => document.body.getAttribute(attribute) === wanted,
  { attribute: SKIN.brand, wanted: brand },
  { timeout: FOLLOW_TIMEOUT_MS },
).then(() => true, () => false)

/** Open the host's settings dialog on the skin's section, by the host's own shortcut. */
async function openSkinSettings(page) {
  await page.keyboard.press('Control+Alt+Comma')
  await page.getByText('Claude Style', { exact: true }).first().click({ force: true })
  await page.locator(SKIN.page).first().waitFor({ timeout: FOLLOW_TIMEOUT_MS })
}

/** What the open settings page says about its own input. */
const readSettingsPage = (page) => page.evaluate((skin) => {
  const root = document.querySelector(skin.page)
  const rows = root.querySelector(skin.rows)
  const controls = [...rows.querySelectorAll('button, input')]
  return {
    notice: root.querySelector(skin.notice)?.textContent ?? null,
    disabled: rows.disabled,
    controls: controls.length,
    enabled: controls.filter((control) => !control.matches(':disabled')).length,
    tabs: [...root.querySelectorAll('[role="tab"]')].filter((tab) => !tab.disabled).length,
    error: root.querySelector(skin.error)?.textContent ?? null,
  }
}, { page: SKIN.page, rows: SKIN.rows, notice: SKIN.notice, error: SKIN.error })

function remoteSettingsScenario({ check }) {
  return {
    script: 'greeting',
    prompt: 'hello there',
    hostArgs: [`--trusted-host ${REMOTE_NAME}`],
    // The mapped name reaches the scratch host directly, past any proxy the
    // machine routes other names through.
    browserArgs: [`--host-resolver-rules=MAP ${REMOTE_NAME} 127.0.0.1`, '--no-proxy-server'],
    async afterTurn(context) {
      const { page: local, session } = context
      const address = new URL(context.url)
      address.hostname = REMOTE_NAME
      const remote = await session.context.newPage()
      const problems = []
      remote.on('console', (message) => { if (message.type() === 'error' || message.type() === 'warning') problems.push(`${message.type()}: ${message.text()}`) })
      remote.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
      await remote.goto(address.href, { waitUntil: 'domcontentloaded' })
      await waitForSkin(remote)
      await dismissOverlays(remote)
      const original = await brandOf(local)
      const target = original === 'deepseek' ? 'claude' : 'deepseek'
      const notes = { hostname: await remote.evaluate(() => location.hostname), original, target, remoteAtStart: await brandOf(remote), problems }
      context.notes.remoteSettings = notes
      await openSkinSettings(local)
      await local.locator(SKIN.brandCard(target)).first().click()
      try {
        notes.localWrote = await reaches(local, target)
        notes.followed = await reaches(remote, target)
        await remote.reload({ waitUntil: 'domcontentloaded' })
        await waitForSkin(remote)
        await dismissOverlays(remote)
        notes.afterReload = (await reaches(remote, target)) ? target : await brandOf(remote)
        await openSkinSettings(remote)
        notes.remotePage = await readSettingsPage(remote)
        notes.localPage = await readSettingsPage(local)
      } finally {
        await local.locator(SKIN.brandCard(original)).first().click()
      }
      notes.restored = await reaches(local, original)
      notes.followedBack = await reaches(remote, original)
    },
    async assert({ session, notes }) {
      const remote = notes.remoteSettings
      const page = remote.remotePage
      const local = remote.localPage
      return [
        check('远程页面开在非 loopback 的名字下', remote.hostname === REMOTE_NAME, `hostname=${remote.hostname}`),
        check('远程页面一打开就是宿主的主题风格', remote.remoteAtStart === remote.original, `remote=${remote.remoteAtStart} local=${remote.original}`),
        check('本机页面写入了另一种主题风格', remote.localWrote === true, `target=${remote.target}`),
        check('远程页面不刷新就跟上本机的改动', remote.followed === true, `target=${remote.target}`),
        check('远程页面刷新后读到的仍是宿主的值', remote.afterReload === remote.target, `afterReload=${remote.afterReload}`),
        check('远程设置页开头有说明行', typeof page.notice === 'string' && page.notice !== '', page.notice ?? 'no notice'),
        check('远程设置页的控件全部禁用', page.disabled === true && page.controls > 0 && page.enabled === 0, `controls=${page.controls} enabled=${page.enabled}`),
        check('远程设置页的标签页仍可切换', page.tabs > 1, `tabs=${page.tabs}`),
        check('远程设置页没有报错行', page.error === null, page.error ?? ''),
        check('本机设置页可写且没有说明行', local.disabled === false && local.notice === null && local.enabled > 0, `disabled=${local.disabled} enabled=${local.enabled}`),
        check('写回原值后两边都回到原来的主题风格', remote.restored === true && remote.followedBack === true, `restored=${remote.restored} followedBack=${remote.followedBack}`),
        check('远程页面的控制台没有异常', remote.problems.length === 0, remote.problems.slice(0, 3).join(' | ')),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { remoteSettingsScenario }
