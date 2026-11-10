#!/usr/bin/env node
/**
 * ds-bot.mjs — the Chat / Code switch beside ds-bot's real browser half (D74, D87).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.mjs).
 *
 * ds-bot paints its whole Bot surface over the shell, and the theme gives the
 * page way to it; the switch is how a reader moves between the two. What the
 * theme leans on is ds-bot's own markup and its own order of work — when its
 * marks land, how its menu renders — which only its published browser half
 * has, so the scenario installs that package from the registry into a home of
 * its own and walks the switch on the assembled host:
 *
 *   - the page boots on the Code side and the theme has it;
 *   - Chat hands the page to ds-bot: the theme's sheet, marks and features
 *     leave, the switch and its own sheet stay;
 *   - a reload on the Chat side never shows the theme first;
 *   - Code takes the page back through ds-bot's own Agent mode item, with its
 *     menu never left open;
 *   - ds-bot's own controls move the theme too;
 *   - dressed as the Windows desktop, the switch takes the caption strip and
 *     leaves the screen while the sidebar is collapsed.
 */
import { dismissOverlays } from './dsh-web.mjs'

/** The ds-bot release the lane checks against. */
const DS_BOT = 'ds-bot@0.1.5'

/**
 * Before the page's own scripts: the first load starts on the Code side
 * (ds-bot's saved mode), and every change of either owner's mark is logged,
 * so a later boot on the Chat side can be read for a theme frame.
 */
const INIT = `
try { if (!sessionStorage.getItem('dsBotSeeded')) { sessionStorage.setItem('dsBotSeeded', '1'); localStorage.setItem('ds-bot:surface', 'agent') } } catch {}
window.__surfaceLog = []
new MutationObserver(() => {
  const body = document.body
  if (body === null) return
  window.__surfaceLog.push({ theme: body.hasAttribute('data-dsh-claude-style'), bot: body.hasAttribute('data-bt-motion') })
}).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-dsh-claude-style', 'data-bt-motion'] })
`

/** The page as the switch leaves it. */
const read = (page) => page.evaluate(() => {
  const body = document.body
  const root = document.querySelector('.dsh-claude-surface-switch')
  // The sidebar column's own box: both the band placement and the collapse are read against it.
  const column = document.querySelector('[data-slot="sidebar"] > [data-dsh-claude-part~="sidebar-root"]')
  const switchBox = root === null ? null : root.getBoundingClientRect()
  return {
    theme: body.hasAttribute('data-dsh-claude-style'),
    bot: body.hasAttribute('data-bt-motion'),
    saved: localStorage.getItem('ds-bot:surface'),
    mode: body.getAttribute('data-dsh-claude-surface'),
    themeSheet: document.getElementById('dsh-claude-style-style') !== null,
    surfaceSheet: document.getElementById('dsh-claude-style-surface') !== null,
    themeMarks: [...body.attributes].map((attribute) => attribute.name).filter((name) => name.startsWith('data-dsh-claude') && name !== 'data-dsh-claude-surface'),
    themeNodes: [...document.querySelectorAll(':is([class^="dsh-claude-"], [class*=" dsh-claude-"])')].filter((node) => root === null || !root.contains(node)).length,
    checked: root === null ? [] : [...root.querySelectorAll('.dsh-claude-surface-option')].map((option) => option.getAttribute('aria-checked') === 'true'),
    switchShown: root !== null && root.isConnected && switchBox.width > 0 && getComputedStyle(root).visibility !== 'hidden',
    menu: document.querySelector('.bt-account-menu') !== null,
    switching: body.hasAttribute('data-dsh-claude-surface-switching'),
    box: switchBox === null ? null : {
      place: root.getAttribute('data-dsh-claude-surface-place'),
      parent: root.parentElement === document.body ? 'body' : (root.parentElement?.className ?? null),
      inBody: root.parentElement === body,
      fixed: getComputedStyle(root).position === 'fixed',
      x: Math.round(switchBox.x),
      y: Math.round(switchBox.y),
      right: Math.round(switchBox.right),
      height: Math.round(switchBox.height),
      columnRight: column === null ? null : Math.round(column.getBoundingClientRect().right),
    },
  }
})

/** Wait for one side to hold the page: ds-bot's surface with the theme gone, or the reverse. */
const settle = (page, side) => page.waitForFunction((chat) => {
  const body = document.body
  return body.hasAttribute('data-bt-motion') === chat && body.hasAttribute('data-dsh-claude-style') === !chat &&
    body.getAttribute('data-dsh-claude-surface') === (chat ? 'chat' : 'code') && document.querySelector('.dsh-claude-surface-switch') !== null
}, side === 'chat', { timeout: 20000 })

/** Press one side of the switch: its options are Chat, then Code. */
const press = (page, side) => page.locator('.dsh-claude-surface-option').nth(side === 'chat' ? 0 : 1).click()

/** The host's own collapse toggle, in the sidebar's brand row (packages/contracts/src/dom.ts). */
const SIDEBAR_TOGGLE = '[data-slot="sidebar"] [class*="_logoRow"] > [class*="_toggle"]'

/**
 * Collapse the rail through the host's own control, for a runner whose host
 * keeps the sidebar open at the narrow viewport. A host that has already
 * collapsed it has hidden the toggle, and there is nothing to press.
 */
async function pressSidebarToggle(page) {
  const toggle = page.locator(SIDEBAR_TOGGLE)
  if (await toggle.count() === 0 || !await toggle.first().isVisible()) return
  await toggle.first().click()
}

function dsBotScenario({ check }) {
  return {
    script: 'greeting',
    prompt: 'hello there',
    plugins: [DS_BOT],
    initScript: { content: INIT },
    async beforeSend({ page }) {
      // The plugin's first boot can delay the shell's preview notice past the
      // runner's first quiet window; answer it again before using the composer.
      if (!await dismissOverlays(page)) throw new Error('ds-bot left a first-run overlay over the composer')
    },
    async afterTurn(context) {
      const { page, notes } = context
      await settle(page, 'code')
      await page.locator('.dsh-claude-surface-option').nth(1).waitFor({ state: 'visible' })
      notes.boot = await read(page)
      // A host control can disappear during boot or a sidebar remount. Keep the
      // actual buttons and their tooltip anchors through repeated detachments.
      notes.reattach = []
      for (const turn of ['first', 'again']) {
        await page.evaluate(() => {
          const control = document.querySelector('.bt-return')
          const buttons = [...document.querySelectorAll('.dsh-claude-surface-option')]
          window.__surfaceRemount = { control, parent: control.parentElement, next: control.nextSibling,
            buttons, anchors: buttons.map(button => button.parentElement) }
          control.remove()
        })
        await page.waitForFunction(() => document.querySelector('.dsh-claude-surface-switch') === null)
        await page.evaluate(() => {
          const { control, parent, next } = window.__surfaceRemount
          if (!parent.isConnected) throw new Error('ds-bot: the control row left during the remount check')
          parent.insertBefore(control, next?.parentNode === parent ? next : null)
        })
        await settle(page, 'code')
        notes.reattach.push(await page.evaluate((turn) => {
          const { buttons, anchors } = window.__surfaceRemount
          const same = buttons.length > 0 && buttons.every((button, index) =>
            button.isConnected && button.parentElement === anchors[index])
          delete window.__surfaceRemount
          return { turn, same }
        }, turn))
      }

      await press(page, 'chat')
      await settle(page, 'chat')
      notes.chat = await read(page)

      await page.evaluate(() => { window.__surfaceLog = [] })
      await page.reload({ waitUntil: 'domcontentloaded' })
      await settle(page, 'chat')
      // The boot's own last marks land after the switch shows; the log is read once they have.
      await page.waitForTimeout(1500)
      notes.reload = { ...await read(page), log: await page.evaluate(() => window.__surfaceLog) }

      await press(page, 'code')
      await settle(page, 'code')
      await page.waitForTimeout(500)
      notes.code = await read(page)

      // ds-bot's own controls: its footer button back to the Bot surface (the
      // theme's footer keeps it out of sight, so it is pressed as the drawer
      // presses it), then its own Agent mode item.
      await page.evaluate(() => document.querySelector('.bt-return').click())
      await settle(page, 'chat')
      notes.ownChat = await read(page)
      await page.locator('.bt-account').click()
      await page.locator('.bt-account-menu > .bt-menu-sep:first-of-type + [role="menuitem"]').click()
      await settle(page, 'code')
      notes.ownCode = await read(page)

      // The Windows desktop: the shell marks <html> and publishes the caption
      // strip's box, and the switch moves into that strip at the sidebar
      // column's right edge. Collapsing the rail leaves it no room there, and
      // it leaves the screen while keeping its measured box.
      await page.evaluate(() => {
        const root = document.documentElement
        root.setAttribute('data-windows-titlebar', '')
        root.style.setProperty('--dsh-windows-titlebar-height', '40px')
        root.style.setProperty('--dsh-frame-top-clearance', '40px')
        Object.defineProperty(navigator, 'windowControlsOverlay', {
          configurable: true,
          value: Object.assign(new EventTarget(), {
            visible: true,
            getTitlebarAreaRect: () => new DOMRect(0, 0, window.innerWidth - 140, 40),
          }),
        })
      })
      await page.waitForTimeout(1000)
      notes.desktop = await read(page)
      // The Chat side under the same strip: the theme's part marks are gone
      // with the theme, so the caption-strip anchor is gone too — the switch
      // must still stand, in ds-bot's own top row, or the reader is stuck.
      await press(page, 'chat')
      await settle(page, 'chat')
      notes.desktopChat = await read(page)
      await press(page, 'code')
      await settle(page, 'code')
      await page.waitForTimeout(500)
      // The sidebar narrowed until its column cannot hold the switch: a headless
      // runner's window manager swallows the host's Control+Alt chord, so the
      // narrow viewport is the reader's way there, and the host's own toggle is
      // the other one on a runner whose host leaves the rail open at 420px.
      await page.setViewportSize({ width: 420, height: 800 })
      // The collapse has to be in the layout before the box means anything, and
      // the switch re-places itself in the frame after it: re-read until the
      // column is gone and the box has left the band. The assertion below still
      // judges what the last read saw, so a column that never goes, or a switch
      // that never leaves, fails there.
      notes.rail = await read(page)
      for (let tries = 0; tries < 24; tries += 1) {
        if ((notes.rail.box?.columnRight ?? 0) === 0 && notes.rail.box?.place !== 'band') break
        if (tries === 6) await pressSidebarToggle(page)
        await page.waitForTimeout(250)
        notes.rail = await read(page)
      }
    },
    async assert(context) {
      const { notes, session } = context
      const { boot, chat, reload, code, ownChat, ownCode, desktop, rail } = notes
      const themed = (state) => state.theme && state.themeSheet && state.mode === 'code' && !state.bot
      const onChat = (state) => JSON.stringify(state.checked) === '[true,false]'
      const onCode = (state) => JSON.stringify(state.checked) === '[false,true]'
      const band = desktop.box ?? {}
      return [
        check('以代码一侧启动时本主题拥有页面、切换选中「代码」', themed(boot) && boot.switchShown && onCode(boot), JSON.stringify(boot)),
        check('宿主控件反复暂离后，切换保留原按钮和提示锚点', notes.reattach.every(entry => entry.same), JSON.stringify(notes.reattach)),
        check('切到聊天后 ds-bot 画出它的界面、记下的模式是 bot', chat.bot && chat.saved === 'bot' && chat.mode === 'chat', JSON.stringify(chat)),
        check('聊天一侧本主题的样式表、body 标记与界面元素全部离开', !chat.theme && !chat.themeSheet && chat.themeMarks.length === 0 && chat.themeNodes === 0, JSON.stringify(chat)),
        check('聊天一侧切换与它自己的样式表留在页面上并选中「聊天」', chat.surfaceSheet && chat.switchShown && onChat(chat), JSON.stringify(chat)),
        check('在聊天一侧刷新，本主题一帧也没有画出', reload.log.length > 0 && reload.log.every((entry) => !entry.theme) && !reload.theme && reload.bot, JSON.stringify(reload.log.slice(0, 12))),
        check('刷新后的切换照样在、照样选中「聊天」', reload.switchShown && onChat(reload), JSON.stringify(reload)),
        check('切回代码后本主题拿回页面、ds-bot 记下 agent', themed(code) && code.saved === 'agent' && onCode(code), JSON.stringify(code)),
        check('切回代码时 ds-bot 的账户菜单没有留在页面上、隐藏标记已撤下', !code.menu && !code.switching, JSON.stringify(code)),
        check('用 ds-bot 自己的按钮回到 Bot 界面，本主题同样让开', !ownChat.theme && ownChat.bot && onChat(ownChat), JSON.stringify(ownChat)),
        check('用 ds-bot 自己的菜单项切到 Agent 模式，本主题同样回来', themed(ownCode) && onCode(ownCode), JSON.stringify(ownCode)),
        check('桌面端切换离开侧栏行、进入窗口顶端那一行并贴在侧栏列的右沿以内 12px',
          themed(desktop) && band.place === 'band' && band.inBody && band.fixed &&
            band.right === band.columnRight - 12 && band.y >= 0 && band.y + band.height <= 40,
          JSON.stringify(band)),
        check('桌面端在聊天一侧，切换留在 ds-bot 自己的顶行、没有被标题栏的测量丢掉',
          notes.desktopChat.bot && !notes.desktopChat.theme && notes.desktopChat.switchShown &&
            notes.desktopChat.box?.place === 'row' && notes.desktopChat.box?.parent === 'bt-side-top' &&
            notes.desktopChat.box?.fixed === false,
          JSON.stringify(notes.desktopChat.box)),
        check('侧栏收窄到放不下时切换离开屏幕，但仍在测量之中',
          rail.box !== null && rail.box.place === 'tucked' && rail.box.inBody && !rail.switchShown,
          JSON.stringify(rail.box)),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { dsBotScenario }
