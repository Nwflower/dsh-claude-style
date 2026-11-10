#!/usr/bin/env node
/** Slow IME composition in the real host's username field (D92). */

import path from 'node:path'
import { openSkinSettings } from './settings-route.mjs'
import { sanitizePage } from '../../../scripts/shared/privacy.mjs'

const INPUT = '.dsh-claude-settings-input'

function usernameCompositionScenario({ check }) {
  return {
    script: 'greeting',
    prompt: 'hello there',
    viewport: { width: 1440, height: 900 },
    async afterTurn(context) {
      const { page, out } = context
      await openSkinSettings(page)
      const input = page.locator(INPUT).first()
      await input.waitFor()
      const initial = await input.inputValue()
      const notes = { initial, values: [], writes: [], events: [], final: null, restored: null }
      context.notes.usernameComposition = notes
      await input.evaluate((element) => {
        const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
        if (descriptor === undefined || descriptor.get === undefined || descriptor.set === undefined) throw new Error('the input value property cannot be observed')
        window.__usernameWrites = 0
        window.__usernameEvents = []
        for (const type of ['compositionstart', 'compositionend', 'input', 'keydown', 'blur']) {
          element.addEventListener(type, (event) => {
            window.__usernameEvents.push({ type, key: event.key ?? null, data: event.data ?? null, composing: event.isComposing ?? null, value: element.value })
          })
        }
        Object.defineProperty(element, 'value', {
          configurable: true,
          get() { return descriptor.get.call(this) },
          set(value) {
            window.__usernameWrites += 1
            descriptor.set.call(this, value)
          },
        })
      })
      await input.click()
      const cdp = await context.session.context.newCDPSession(page)
      try {
        for (const text of ['p', "p'p", "p'p'y"]) {
          await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length })
          await page.waitForTimeout(700)
          notes.values.push(await input.inputValue())
          notes.writes.push(await input.evaluate(() => window.__usernameWrites))
        }
        await input.press('Escape')
        notes.final = await input.inputValue()
        notes.events = await input.evaluate(() => window.__usernameEvents)
        await page.waitForTimeout(700)
        await page.reload({ waitUntil: 'domcontentloaded' })
        await openSkinSettings(page)
        notes.restored = await page.locator(INPUT).first().inputValue()
        for (const scheme of ['light', 'dark']) {
          await page.evaluate((dark) => document.body.toggleAttribute('data-ds-dark-theme', dark), scheme === 'dark')
          await sanitizePage((expression) => page.evaluate(expression))
          await page.screenshot({ path: path.join(out, `username-composition-${scheme}.png`) })
        }
      } finally {
        if (notes.final !== initial || notes.restored !== initial) {
          let current = page.locator(INPUT).first()
          if (await current.count() === 0) {
            await openSkinSettings(page)
            current = page.locator(INPUT).first()
          }
          await current.fill(initial)
          await current.press('Enter')
        }
        await cdp.detach()
      }
    },
    async assert({ session, notes }) {
      const state = notes.usernameComposition
      return [
        check('慢速组词逐字保留当前拼音', JSON.stringify(state.values) === JSON.stringify(['p', "p'p", "p'p'y"]), JSON.stringify(state.values)),
        check('组词期间没有旧值写回输入框', state.writes.every((count) => count === 0), JSON.stringify(state.writes)),
        check('Escape 恢复进入编辑前的用户名', state.final === state.initial, `final=${state.final} initial=${state.initial} events=${JSON.stringify(state.events)}`),
        check('恢复后的用户名刷新后仍然保存', state.restored === state.initial, `stored=${state.restored} initial=${state.initial}`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { usernameCompositionScenario }
