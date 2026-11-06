#!/usr/bin/env node
/**
 * remote-settings.mjs — a page under a non-loopback name on the real host
 * (D75, D87).
 *
 * The host serves a page whose hostname it was told to trust the same settings
 * document it serves the loopback page: one instance, two names, one store. The
 * scenario starts the host trusting one more name, maps that name onto the
 * loopback address in the browser, and opens the same instance under both names.
 * It writes the theme style from the loopback page and asserts the remote page
 * follows without a reload, then writes it back from the remote page and asserts
 * the loopback page follows, and reads the stored value at boot on the remote
 * one. The settings document lives in the scratch home the other scenarios
 * share, so the scenario writes the theme style back before it ends.
 */
import { bound } from './bounds.mjs'
import { waitForSkin, dismissOverlays, consoleProblem } from './dsh-web.mjs'
import { openSkinSettings, SETTINGS_PAGE } from './settings-route.mjs'

/** The non-loopback name the remote page is opened under; the browser maps it onto 127.0.0.1. */
const REMOTE_NAME = 'remote.test'

/** The skin's marks this scenario reads (packages/client/src/constants.ts and the settings page). */
const SKIN = {
  brand: 'data-dsh-claude-brand', // BRAND_ATTR
  page: SETTINGS_PAGE,
  rows: 'fieldset.dsh-claude-settings-rows',
  error: '.dsh-claude-settings-error',
  // The theme style's choices carry the brand they pick on their card.
  brandCard: (brand) => `.dsh-claude-brand-card[data-brand="${brand}"]`,
}

/** How long a written value may take to reach the other page. */
const FOLLOW_TIMEOUT_MS = bound('remoteSettingsFollowTimeoutMs')

const brandOf = (page) => page.evaluate((attribute) => document.body.getAttribute(attribute), SKIN.brand)

/** Whether the page comes to carry `brand` within the bound. */
const reaches = (page, brand) => page.waitForFunction(
  ({ attribute, wanted }) => document.body.getAttribute(attribute) === wanted,
  { attribute: SKIN.brand, wanted: brand },
  { timeout: FOLLOW_TIMEOUT_MS },
).then(() => true, () => false)

/** What the open settings page says about its own input. */
const readSettingsPage = (page) => page.evaluate((skin) => {
  const root = document.querySelector(skin.page)
  const rows = root.querySelector(skin.rows)
  const controls = [...rows.querySelectorAll('button, input')]
  return {
    disabled: rows.disabled,
    controls: controls.length,
    enabled: controls.filter((control) => !control.matches(':disabled')).length,
    tabs: [...root.querySelectorAll('[role="tab"]')].filter((tab) => !tab.disabled).length,
    error: root.querySelector(skin.error)?.textContent ?? null,
  }
}, { page: SKIN.page, rows: SKIN.rows, error: SKIN.error })

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
      remote.on('console', (message) => {
        const problem = consoleProblem(message)
        if (problem !== null) problems.push(problem)
      })
      remote.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
      await remote.goto(address.href, { waitUntil: 'domcontentloaded' })
      await waitForSkin(remote)
      await dismissOverlays(remote)
      const original = await brandOf(local)
      const target = original === 'deepseek' ? 'claude' : 'deepseek'
      const notes = { hostname: await remote.evaluate(() => location.hostname), original, target, remoteAtStart: await brandOf(remote), problems }
      context.notes.remoteSettings = notes
      // The loopback page writes one value; the remote page follows it without
      // a reload, and reads it back from the stored document after one.
      await openSkinSettings(local)
      await local.locator(SKIN.brandCard(target)).first().click()
      try {
        notes.localWrote = await reaches(local, target)
        notes.followed = await reaches(remote, target)
        await remote.reload({ waitUntil: 'domcontentloaded' })
        await waitForSkin(remote)
        await dismissOverlays(remote)
        notes.afterReload = (await reaches(remote, target)) ? target : await brandOf(remote)
        // The remote page writes the other value back: the same store, from the
        // far side. The loopback page follows without a reload, and the stored
        // document carries it after the remote page reloads.
        await openSkinSettings(remote)
        notes.remotePage = await readSettingsPage(remote)
        await remote.locator(SKIN.brandCard(original)).first().click()
        notes.remoteWrote = await reaches(remote, original)
        notes.followedBack = await reaches(local, original)
        await remote.reload({ waitUntil: 'domcontentloaded' })
        await waitForSkin(remote)
        await dismissOverlays(remote)
        notes.keptWrite = (await reaches(remote, original)) ? original : await brandOf(remote)
      } finally {
        // Whatever the walk did, the shared home ends on the value it started with.
        await local.locator(SKIN.brandCard(original)).first().click()
        notes.restored = await reaches(local, original)
        notes.localPage = await readSettingsPage(local)
      }
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
        check('远程设置页的控件可以操作', page.disabled === false && page.controls > 0 && page.enabled === page.controls, `controls=${page.controls} enabled=${page.enabled}`),
        check('远程设置页的标签页仍可切换', page.tabs > 1, `tabs=${page.tabs}`),
        check('远程设置页没有报错行', page.error === null, page.error ?? ''),
        check('远程页面写回的改动本机页面不刷新就跟上', remote.remoteWrote === true && remote.followedBack === true, `wrote=${remote.remoteWrote} followed=${remote.followedBack}`),
        check('远程页面写入的值刷新后仍在', remote.keptWrite === remote.original, `kept=${remote.keptWrite}`),
        check('本机设置页可写', local.disabled === false && local.enabled > 0, `enabled=${local.enabled}`),
        check('写回原值后本机页面回到原来的主题风格', remote.restored === true, `restored=${remote.restored}`),
        check('远程页面的控制台没有异常', remote.problems.length === 0, remote.problems.slice(0, 3).join(' | ')),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { remoteSettingsScenario, openSkinSettings }
