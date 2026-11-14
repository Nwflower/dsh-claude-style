#!/usr/bin/env node
/**
 * turn-spacer.mjs — completion-time fold room and the reader's later position.
 *
 * The host can reserve room below an answer when process rows close at once.
 * This scenario records the real metrics, checks the room keeps the answer still
 * when it is present, and proves a later reading gesture keeps ownership.
 */

import { sanitizePage } from '../../../scripts/shared/privacy.mjs'

const SCROLLER = '[data-conversation-scroll]'
const SPACER = '[data-chat-turn-spacer]'
const STREAMING = '[data-streaming]'
const FOLLOWING = '[data-chat-following-tail]'
const RESPONSE = '[data-chat-group-part="response"]'
const REASONING = Array.from({ length: 30 }, (_, index) => 'Reasoning paragraph ' + (index + 1) + ': inspect the workspace and preserve the reading order.').join('\n\n')
const SCRIPT = {
  conversation: [
    { thinking: [REASONING], tool: { name: 'glob', input: { pattern: 'packages/**/*.json' } } },
    { thinking: [REASONING], tool: { name: 'glob', input: { pattern: 'scripts/**/*.json' } } },
    { thinking: ['The work is complete.'], text: ['# Answer\n\nA short final line.'] },
  ],
  auxiliary: { text: ['Scripted spacer answer'] },
}

async function read(page) {
  return page.evaluate(([scrollerSelector, spacerSelector, streamingSelector, followingSelector, responseSelector]) => {
    const scroller = document.querySelector(scrollerSelector)
    const spacer = scroller?.querySelector(spacerSelector)
    const answers = [...document.querySelectorAll(responseSelector)]
    const answer = answers.at(-1)
    if (scroller === null) return null
    return {
      top: scroller.scrollTop,
      scrollHeight: scroller.scrollHeight,
      clientHeight: scroller.clientHeight,
      room: spacer === null || spacer === undefined ? 0 : Number.parseFloat(spacer.style.height) || 0,
      answerBottom: answer === undefined ? null : answer.getBoundingClientRect().bottom - scroller.getBoundingClientRect().top,
      streaming: document.querySelector(streamingSelector) !== null,
      following: document.querySelector(followingSelector) !== null,
    }
  }, [SCROLLER, SPACER, STREAMING, FOLLOWING, RESPONSE])
}

async function settle(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

function turnSpacerScenario({ check }) {
  return {
    script: SCRIPT,
    prompt: 'write a long answer',
    delayMs: 100,
    patch: ['- id: ui-chat', '  config:', '    transcriptView: standard'],
    viewport: { width: 1280, height: 700 },
    initScript: () => {
      const trace = []
      window.__turnSpacerTrace = trace
      const sample = () => {
        const scroller = document.querySelector('[data-conversation-scroll]')
        if (scroller !== null) {
          const spacer = scroller.querySelector('[data-chat-turn-spacer]')
          const answers = [...document.querySelectorAll('[data-chat-group-part="response"]')]
          const answer = answers.at(-1)
          trace.push({
            top: scroller.scrollTop,
            scrollHeight: scroller.scrollHeight,
            clientHeight: scroller.clientHeight,
            room: spacer === null ? 0 : Number.parseFloat(spacer.style.height) || 0,
            answerBottom: answer === undefined ? null : answer.getBoundingClientRect().bottom - scroller.getBoundingClientRect().top,
            streaming: document.querySelector('[data-streaming]') !== null,
          })
        }
        if (trace.length < 6000) requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    },
    async afterTurn({ page, notes, out }) {
      await settle(page)
      notes.settled = await read(page)
      await sanitizePage(expression => page.evaluate(expression))
      await page.screenshot({ path: out + '/turn-spacer-completion.png' })
      if (notes.settled === null) throw new Error('turn-spacer: no conversation scroller after completion')
      console.log('turn-spacer completion:', JSON.stringify(notes.settled))
      if (notes.settled.top === 0) {
        notes.reader = notes.settled
        return
      }
      const scroller = await page.locator(SCROLLER).boundingBox()
      await page.mouse.move(scroller.x + scroller.width / 2, scroller.y + scroller.height / 2)
      await page.mouse.wheel(0, -240)
      await page.waitForFunction(([selector, top]) => {
        const node = document.querySelector(selector)
        return node !== null && node.scrollTop < top
      }, [SCROLLER, notes.settled.top], { timeout: 5000 })
      await settle(page)
      notes.reader = await read(page)
    },
    async assert({ page, session, notes }) {
      const trace = await page.evaluate(() => window.__turnSpacerTrace ?? [])
      const settled = notes.settled
      const reader = notes.reader
      if (settled === undefined || reader === undefined) throw new Error('turn-spacer: the completion or reader reading is missing')
      const streaming = trace.findLast(frame => frame.streaming)
      const answerShift = streaming === undefined || settled.answerBottom === null || streaming.answerBottom === null
        ? null : Math.abs(settled.answerBottom - streaming.answerBottom)
      const metrics = 'room=' + settled.room + 'px, scrollTop=' + settled.top + 'px, scrollHeight=' + settled.scrollHeight + 'px, clientHeight=' + settled.clientHeight + 'px'
      return [
        check('收起前后都有滚动指标', trace.some(frame => frame.streaming) && trace.length > 10, trace.length + ' frames; ' + metrics),
        check('原生底部占位不超过半个视口', settled.room >= 0 && settled.room <= settled.clientHeight / 2, metrics),
        check('占位存在时回答保持原阅读位置', settled.room === 0 || answerShift !== null && answerShift <= 24,
          settled.room === 0 ? 'no reserved room; ' + metrics : 'answer bottom shift=' + answerShift + 'px; ' + metrics),
        check('完成态仍由宿主跟随末尾', settled.following, metrics),
        check('读者回滚历史后位置不被拉回', settled.top === 0 ? reader.top === 0 : reader.top < settled.top,
          settled.top === 0 ? 'content has no scrollable overflow; scrollTop stays 0px' : 'scrollTop ' + settled.top + 'px → ' + reader.top + 'px'),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { turnSpacerScenario }
