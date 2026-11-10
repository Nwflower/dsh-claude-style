/** The real studio home's panel geometry before any conversation is sent. */
import path from 'node:path'
import { COMPOSER_CARD_SELECTOR, COMPOSER_STACK_SELECTOR, DARK_THEME_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { check } from '../lane.mjs'
import { sanitizePage } from '../../../scripts/shared/privacy.mjs'

async function read(page) {
  return page.evaluate((host) => {
    const panel = document.querySelector('section[aria-busy="false"]')
    const card = document.querySelector(host.card)
    const stack = panel?.closest(host.stack)
    if (panel === null || card === null || stack === null || stack === undefined) throw new Error('the studio home has no settled panel, stack and composer')
    const panelBox = panel.getBoundingClientRect()
    const cardBox = card.getBoundingClientRect()
    const stackBox = stack.getBoundingClientRect()
    const cells = [...panel.querySelectorAll('[aria-label]')].filter((cell) => cell.getBoundingClientRect().width > 0).map((cell) => cell.getBoundingClientRect())
    return {
      viewport: window.innerWidth,
      left: panelBox.left,
      right: panelBox.right,
      cardLeft: cardBox.left,
      stackLeft: stackBox.left,
      stackRight: stackBox.right,
      heatLeft: cells.length === 0 ? null : Math.min(...cells.map((cell) => cell.left)),
      heatRight: cells.length === 0 ? null : Math.max(...cells.map((cell) => cell.right)),
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      margin: [getComputedStyle(panel).marginLeft, getComputedStyle(panel).marginRight],
      panelWidth: [getComputedStyle(panel).width, getComputedStyle(panel).maxWidth],
      clearance: getComputedStyle(panel).getPropertyValue('--dsh-composer-side-clearance'),
      parent: panel.parentElement === null ? null : {
        width: getComputedStyle(panel.parentElement).width,
        margin: [getComputedStyle(panel.parentElement).marginLeft, getComputedStyle(panel.parentElement).marginRight],
      },
    }
  }, { card: COMPOSER_CARD_SELECTOR, stack: COMPOSER_STACK_SELECTOR })
}

function mobileHomeScenario() {
  return {
    script: 'greeting',
    prompt: 'hello there',
    async beforeSend({ page, notes, out }) {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.waitForSelector('section[aria-busy="false"]', { timeout: 30000 })
      await page.waitForFunction(() => document.querySelector('section[aria-busy="false"]')?.querySelector('[aria-label]') !== null, undefined, { timeout: 30000 })
      notes.phone = await read(page)
      for (const scheme of ['light', 'dark']) {
        await page.evaluate(([name, attribute]) => document.body.toggleAttribute(attribute, name === 'dark'), [scheme, DARK_THEME_ATTRIBUTE])
        await sanitizePage((expression) => page.evaluate(expression))
        await page.screenshot({ path: path.join(out, `mobile-home-${scheme}.png`) })
      }
      await page.setViewportSize({ width: 1280, height: 900 })
      notes.desktop = await read(page)
    },
    async assert({ session, notes }) {
      const phone = notes.phone ?? {}
      const desktop = notes.desktop ?? {}
      const left = (phone.left ?? 0) - (phone.stackLeft ?? 0)
      const right = (phone.stackRight ?? 0) - (phone.right ?? 0)
      return [
        check('手机首页的面板左右余量相等', Math.abs(left - right) <= 1, `left=${left}px right=${right}px`),
        check('热力格留在面板内且页面没有横向滚动', phone.heatLeft !== null && phone.heatLeft >= phone.left && phone.heatRight <= phone.right && phone.overflow === false, JSON.stringify(phone)),
        check('宽屏下面板继续与输入卡左缘对齐', Math.abs((desktop.left ?? 0) - (desktop.cardLeft ?? 0)) <= 1, JSON.stringify(desktop)),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { mobileHomeScenario }
