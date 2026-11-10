/** The composer remains reachable and keeps its draft through a visible-height change. */
import path from 'node:path'
import { COMPOSER_CARD_SELECTOR, COMPOSER_INPUT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { check } from '../lane.mjs'
import { sanitizePage } from '../../../scripts/shared/privacy.mjs'

async function read(page) {
  return page.evaluate((host) => {
    const card = [...document.querySelectorAll(host.card)].find((element) => element.getClientRects().length > 0)
    const input = [...document.querySelectorAll(host.input)].find((element) => element.getClientRects().length > 0)
    if (card === null || input === null) throw new Error('the composer is missing')
    const viewport = window.visualViewport
    return {
      bottom: card.getBoundingClientRect().bottom,
      visibleBottom: viewport === null ? window.innerHeight : viewport.height + viewport.offsetTop,
      draft: input.textContent ?? '',
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    }
  }, { card: COMPOSER_CARD_SELECTOR, input: COMPOSER_INPUT_SELECTOR })
}

function composerViewportScenario() {
  return {
    script: 'greeting',
    prompt: 'hello there',
    viewport: { width: 390, height: 844 },
    async assert({ page, session, out }) {
      await page.locator(COMPOSER_INPUT_SELECTOR).filter({ visible: true }).last().focus()
      await page.keyboard.type('draft kept')
      const before = await read(page)
      await sanitizePage((expression) => page.evaluate(expression))
      await page.screenshot({ path: path.join(out, 'composer-viewport-before.png') })
      await page.setViewportSize({ width: 390, height: 500 })
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      const resized = await read(page)
      await sanitizePage((expression) => page.evaluate(expression))
      await page.screenshot({ path: path.join(out, 'composer-viewport-resized.png') })
      await page.setViewportSize({ width: 390, height: 844 })
      const restored = await read(page)
      return [
        check('可视高度变化后输入区仍完整位于可视区内', resized.bottom <= resized.visibleBottom + 1 && resized.overflow === false, JSON.stringify(resized)),
        check('视口变化与恢复都保留草稿', before.draft === 'draft kept' && resized.draft === before.draft && restored.draft === before.draft, JSON.stringify({ before: before.draft, resized: resized.draft, restored: restored.draft })),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { composerViewportScenario }
