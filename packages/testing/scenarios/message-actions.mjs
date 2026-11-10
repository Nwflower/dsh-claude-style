import path from 'node:path'
import { HOST, check } from '../lane.mjs'
import { sanitizePage } from '../../../scripts/shared/privacy.mjs'

/** The visible host Tooltip, read off the page: its words and the look the host gives it. */
function readTooltip(page) {
  return page.evaluate(() => {
    const shown = [...document.querySelectorAll('[role="tooltip"]')].filter((tip) => tip.getBoundingClientRect().height > 0 && getComputedStyle(tip).opacity === '1')
    const tip = shown[shown.length - 1]
    if (tip === undefined) return null
    const style = getComputedStyle(tip)
    return { text: (tip.textContent ?? '').trim(), background: style.backgroundColor, color: style.color, radius: style.borderRadius, size: style.fontSize }
  })
}

/** Hover one control and read the Tooltip it raises, once the page has painted it. */
async function hoverTooltip(page, locator) {
  await locator.hover()
  await page.waitForFunction(() => [...document.querySelectorAll('[role="tooltip"]')].some((tip) => tip.getBoundingClientRect().height > 0 && getComputedStyle(tip).opacity === '1'), { timeout: 6000 }).catch(() => {})
  return readTooltip(page)
}


function messageActionsScenario({ check }) {
  return {
    script: 'greeting',
    prompt: 'hello there',
    async beforeSend(context) {
      const { page, notes } = context
      const value = page.locator('.dsh-claude-home-stat-value').first()
      await value.waitFor({ timeout: 20000 }).catch(() => {})
      if (await value.count() === 0) {
        notes.homeTip = null
        return
      }
      notes.homeTitle = await value.getAttribute('title')
      notes.homeText = (await value.textContent() ?? '').trim()
      notes.homeTip = await hoverTooltip(page, value)
      await page.mouse.move(5, 5)
    },
    async assert({ page, session, notes, out }) {
      const ROW = '[data-chat-flow-kind="user"]'
      const LINE = `${ROW} [data-clock]`
      const EDITOR = `${ROW} textarea`
      // 宿主那一行里三个按钮按顺序排：时间之后是复制，然后是皮肤的两个。
      const buttons = page.locator(`${LINE} button`)
      const copyButton = buttons.nth(0)
      const retractButton = buttons.nth(1)
      const editButton = buttons.nth(2)
      await buttons.nth(2).waitFor({ timeout: 20000 })
      const read = () => page.evaluate((row) => {
        const line = document.querySelector(row)
        const clock = line?.querySelector('[data-clock]') ?? null
        const bubble = line?.querySelector('[data-message-bubble]') ?? null
        return {
          buttons: clock === null ? 0 : clock.querySelectorAll('button').length,
          opacity: clock === null ? null : getComputedStyle(clock).opacity,
          sessionId: document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') ?? null,
          draft: (document.querySelector('[data-composer-input]')?.innerText ?? '').trim(),
          bubbleText: (bubble?.textContent ?? '').trim(),
          bubbleShown: bubble === null ? false : getComputedStyle(bubble).display !== 'none',
        }
      }, ROW)
      const resting = await read()
      const answerButtons = {
        rerun: await page.getByRole('button', { name: /^(重跑这一轮|Run this turn again)$/ }).count(),
        delete: await page.getByRole('button', { name: /^(删除此轮|Delete this turn)$/ }).count(),
      }
      const answerState = await page.locator(HOST.answerRow).evaluateAll((rows) => rows.map((row) => ({
        turn: row.getAttribute('data-chat-turn'),
        key: row.getAttribute('data-chat-node-key'),
        parentKey: row.parentElement?.getAttribute('data-chat-node-key'),
        actions: row.querySelectorAll('[data-clock] button').length,
        parentActions: row.parentElement?.querySelectorAll('[data-clock] button').length,
      })))
      const clockState = await page.locator('[data-clock]').evaluateAll((rows) => rows.map((row) => ({
        turn: row.getAttribute('data-chat-turn'),
        key: row.getAttribute('data-chat-node-key'),
        closestKind: row.closest('[data-chat-flow-kind]')?.getAttribute('data-chat-flow-kind'),
        closestTurn: row.closest('[data-chat-turn]')?.getAttribute('data-chat-turn'),
        closestKey: row.closest('[data-chat-node-key]')?.getAttribute('data-chat-node-key'),
      })))
      await page.hover(HOST.answerRow)
      await sanitizePage((expression) => page.evaluate(expression))
      await page.screenshot({ path: path.join(out, 'message-actions.png') })
      await page.hover(ROW)
      await page.waitForFunction((row) => {
        const clock = document.querySelector(row)?.querySelector('[data-clock]')
        return clock !== null && clock !== undefined && getComputedStyle(clock).opacity === '1'
      }, ROW, { timeout: 5000 }).catch(() => {})
      const hovered = await read()
      const ourTip = await hoverTooltip(page, retractButton)
      const retractLabel = await retractButton.getAttribute('aria-label')
      await page.mouse.move(5, 5)
      await page.waitForTimeout(400)
      const hostTip = await hoverTooltip(page, copyButton)
      await editButton.click()
      await page.waitForSelector(EDITOR, { timeout: 5000 })
      const edited = await page.inputValue(EDITOR)
      const whileEditing = await read()
      await page.keyboard.press('Escape')
      await page.waitForSelector(EDITOR, { state: 'detached', timeout: 5000 }).catch(() => {})
      const cancelled = await read()
      await page.hover(ROW)
      await retractButton.click()
      await page.waitForFunction((before) => document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') !== before, resting.sessionId, { timeout: 30000 }).catch(() => {})
      await page.waitForFunction(() => (document.querySelector('[data-composer-input]')?.innerText ?? '').trim() === 'hello there', { timeout: 30000 }).catch(() => {})
      const rewound = await read()
      // 放回输入框的原文再发一次，再点编辑改过之后按 Enter：改过的文字在新会话里直接发出。
      await page.evaluate((selector) => document.querySelector(selector)?.focus(), '[data-composer-input]')
      await page.keyboard.press('Enter')
      // 分岔出来的会话自己带着一个合成的收尾行，所以这里等的是新消息那一轮的收尾
      // （下一轮），而不是「有收尾行就算结束」。
      await page.waitForSelector('[data-chat-turn="2"][data-chat-flow-kind="turn-tail"]', { timeout: 90000 })
      await page.hover(ROW)
      await editButton.click()
      await page.waitForSelector(EDITOR, { timeout: 5000 })
      // 文字清空时没有可发的消息：保存按钮先站起来。
      await page.fill(EDITOR, '')
      const emptySaveOff = await page.isDisabled(`${EDITOR} ~ div > button:last-child`)
      await page.fill(EDITOR, 'hello there, edited')
      await page.keyboard.press('Enter')
      await page.waitForFunction((before) => document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') !== before, rewound.sessionId, { timeout: 30000 }).catch(() => {})
      await page.waitForFunction(() => {
        const bubble = document.querySelector('[data-chat-flow-kind="user"] [data-message-bubble]')
        return (bubble?.textContent ?? '').trim() === 'hello there, edited'
      }, { timeout: 30000 }).catch(() => {})
      await page.waitForFunction(() => (document.querySelector('[data-composer-input]')?.innerText ?? '').trim() === '', { timeout: 10000 }).catch(() => {})
      const committed = await read()
      return [
        check('回答行提供重跑与删除此轮', answerButtons.rerun === 1 && answerButtons.delete === 1, `${JSON.stringify(answerButtons)} rows=${JSON.stringify(answerState)} clocks=${JSON.stringify(clockState)}`),
        check('控件行末尾长出撤回与编辑两个按钮', resting.buttons === 3, `${resting.buttons} 个按钮（宿主的时间与复制之外）`),
        check('控件行在指针离开时隐去、落上去显现', resting.opacity === '0' && hovered.opacity === '1', `resting=${resting.opacity} hovered=${hovered.opacity}`),
        check('撤回按钮的提示是宿主那份 Tooltip', ourTip !== null && ourTip.text === retractLabel && hostTip !== null && ourTip.background === hostTip.background && ourTip.color === hostTip.color && ourTip.radius === hostTip.radius && ourTip.size === hostTip.size, `ours=${JSON.stringify(ourTip)} host=${JSON.stringify(hostTip)}`),
        check('首页统计数值的提示也是宿主那份 Tooltip', notes.homeTip !== null && notes.homeTitle === null && notes.homeTip.text === notes.homeText && hostTip !== null && notes.homeTip.background === hostTip.background && notes.homeTip.radius === hostTip.radius, `title=${notes.homeTitle} home=${JSON.stringify(notes.homeTip)} host=${JSON.stringify(hostTip)}`),
        check('编辑框打开时带着那条消息的原文', edited.trim() === 'hello there', edited.slice(0, 80)),
        check('编辑期间原来的气泡让位', whileEditing.bubbleShown === false, `bubbleShown=${whileEditing.bubbleShown}`),
        check('编辑框按 Esc 收起，气泡回来', cancelled.bubbleShown === true && cancelled.bubbleText.includes('hello there'), `bubbleShown=${cancelled.bubbleShown} bubble=${cancelled.bubbleText.slice(0, 60)}`),
        check('撤回后打开新会话', rewound.sessionId !== resting.sessionId && rewound.sessionId !== null, `before=${resting.sessionId} after=${rewound.sessionId}`),
        check('原文回到新会话的输入框', rewound.draft === 'hello there', rewound.draft.slice(0, 80)),
        check('文字清空时保存按钮不可按', emptySaveOff === true, `disabled=${emptySaveOff}`),
        check('编辑保存后改过的文字在新会话里直接发出', committed.sessionId !== rewound.sessionId && committed.bubbleText === 'hello there, edited' && committed.draft === '', `session=${committed.sessionId} draft=${committed.draft.slice(0, 40)} bubble=${committed.bubbleText.slice(0, 60)}`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { messageActionsScenario }
