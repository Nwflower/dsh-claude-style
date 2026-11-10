/**
 * A settled answer carries rerun and delete-turn actions in its turn-tail. Both
 * fork before the turn's prompt, leaving the source session untouched.
 *
 * @capability message-actions
 * @features message-actions
 * @risk A rerun repeats the wrong turn, a double click creates competing branches, or a deleted turn returns after a reload.
 */
import path from 'node:path'
import { CONVERSATION_SESSION_ATTRIBUTE, CONVERSATION_SESSION_SELECTOR, TURN_TAIL_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { HOST } from '../lane.mjs'
import { sendPrompt } from '../prompt.mjs'
import { sanitizePage } from '../../../scripts/shared/privacy.mjs'

const RERUN = /^(重跑这一轮|Run this turn again)$/
const DELETE = /^(删除此轮|Delete this turn)$/

/** The answer rows' two buttons by their accessible names, in the row that holds them. */
function readPlacement(page) {
  return page.evaluate(({ rerun, remove }) => {
    const labels = { rerun: new RegExp(rerun), remove: new RegExp(remove) }
    return [...document.querySelectorAll('[data-clock="end"]')].map((line) => {
      const info = line.lastElementChild
      const ours = [...line.querySelectorAll('button')].filter((button) => {
        const label = button.getAttribute('aria-label') ?? ''
        return labels.rerun.test(label) || labels.remove.test(label)
      })
      // 宿主的 Tooltip 可能给按钮套一层盒子：取按钮在行里的那一层，比较行的孩子。
      const holder = (node) => {
        let at = node
        while (at.parentElement !== null && at.parentElement !== line) at = at.parentElement
        return at
      }
      const first = holder(ours[0])
      const last = holder(ours[1])
      return {
        buttons: line.querySelectorAll('button').length,
        ours: ours.length,
        beforeInfo: info !== null && ours.length === 2 && first === last && last.nextElementSibling === info,
      }
    })
  }, { rerun: RERUN.source, remove: DELETE.source })
}

function read(page) {
  return page.evaluate((host) => ({
    sessionId: document.querySelector(host.session)?.getAttribute(host.sessionAttribute) ?? null,
    prompts: [...document.querySelectorAll(host.userRow)].map((row) => (row.textContent ?? '').replace(/\s+/g, ' ').trim()),
    answers: document.querySelectorAll(host.answerRow).length,
    draft: (document.querySelector(host.composer)?.textContent ?? '').trim(),
  }), {
    ...HOST,
    session: CONVERSATION_SESSION_SELECTOR,
    sessionAttribute: CONVERSATION_SESSION_ATTRIBUTE,
  })
}

async function waitForAnswers(page, count) {
  await page.waitForFunction((host) => document.querySelectorAll(host.answerRow).length >= host.count && document.querySelectorAll(host.streaming).length === 0, { ...HOST, count }, { timeout: 90000 })
}

async function waitForBranch(page, before) {
  await page.waitForFunction(({ selector, attribute, previous }) => {
    const current = document.querySelector(selector)?.getAttribute(attribute)
    return current !== null && current !== undefined && current !== previous
  }, { selector: CONVERSATION_SESSION_SELECTOR, attribute: CONVERSATION_SESSION_ATTRIBUTE, previous: before }, { timeout: 30000 })
}

function messageAnswerActionsScenario({ check }) {
  return {
    script: 'greeting',
    prompt: 'hello there',
    /** Slow enough that the second turn is still running when its row is read. */
    delayMs: 700,
    async assert({ page, session, notes, out }) {
      await sendPrompt(page, 'second turn')
      await page.waitForFunction((selector) => document.querySelectorAll(selector).length > 1, HOST.answerRow, { timeout: 20000 })
      const runningAnswer = page.locator(TURN_TAIL_SELECTOR).nth(1)
      notes.runningButtons = await runningAnswer.getByRole('button', { name: RERUN }).count() + await runningAnswer.getByRole('button', { name: DELETE }).count()
      await waitForAnswers(page, 2)
      notes.before = await read(page)
      // 两个按钮排在宿主行尾的用量与时间之前，跟宿主的动作按钮同处一簇。
      notes.placement = await readPlacement(page)
      const firstAnswer = page.locator(HOST.answerRow).first()
      await firstAnswer.hover()
      await sanitizePage((expression) => page.evaluate(expression))
      await page.screenshot({ path: path.join(out, 'answer-actions.png') })
      const rerun = page.getByRole('button', { name: RERUN }).first()
      await rerun.evaluate((button) => {
        button.click()
        button.click()
      })
      await waitForBranch(page, notes.before.sessionId)
      await waitForAnswers(page, 1)
      notes.reran = await read(page)

      await sendPrompt(page, 'second turn')
      await waitForAnswers(page, 2)
      await page.getByRole('button', { name: DELETE }).first().click()
      await waitForBranch(page, notes.reran.sessionId)
      notes.deleted = await read(page)
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForSelector(HOST.composer, { timeout: 30000 })
      notes.restored = await read(page)

      const reran = notes.reran ?? {}
      const deleted = notes.deleted ?? {}
      const restored = notes.restored ?? {}
      return [
        check('两轮会话与两条回答都已就位', notes.before?.prompts?.length === 2 && notes.before?.answers === 2, JSON.stringify(notes.before)),
        check('重跑与删除排在回答行的用量与时间之前', notes.placement?.length > 0 && notes.placement.every((row) => row.beforeInfo && row.buttons >= 4), JSON.stringify(notes.placement)),
        check('正在运行的回答不提供重跑或删除', notes.runningButtons === 0, `buttons=${notes.runningButtons}`),
        check('重跑中间回答只重放该轮提问并创建新分岔', reran.sessionId !== notes.before?.sessionId && reran.prompts?.length === 1 && reran.prompts[0].includes('hello there') && !reran.prompts[0].includes('second turn') && reran.answers === 1 && reran.draft === '', JSON.stringify(reran)),
        check('删除中间轮次创建不含该轮及后续内容的新分岔', deleted.sessionId !== reran.sessionId && deleted.prompts?.length === 0 && deleted.answers === 0 && deleted.draft === '', JSON.stringify(deleted)),
        check('删除后的会话在页面重载后仍保持该前缀', (restored.sessionId === deleted.sessionId || restored.sessionId === null) && restored.prompts?.length === 0 && restored.answers === 0, JSON.stringify(restored)),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { messageAnswerActionsScenario }
