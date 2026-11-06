#!/usr/bin/env node
/**
 * wait-line.mjs — the waiting line's own words, end to end (D86).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.mjs).
 *
 * The `waitLine` script (packages/testing/mock-llm.mjs) reasons in an English
 * clause the line can take — "I am checking the file is true" — then in a
 * sentence carrying no clause, then in a second clause, and then reads a file.
 * The line has to say a clause as the model writes it and name the file while
 * the call is in flight; it has to change at most once a second however many
 * states the turn passes through in between (WORD_LOCK_MS: a wording shorter
 * than the lock is passed over, and a call's own words are the one thing that
 * waits for it); and the clause it stood on has to hold the line through the
 * stretch that says nothing, rather than falling back to the waiting word. The
 * state words the lock may pass over are held by the smoke case, which drives
 * each of them on its own.
 *
 * The clause is the model's own text, so it is the same in every language; the
 * file's words are copy, so they are matched in the two the document carries.
 * Everything the words are read off is the real host: the snapshot's reasoning
 * block and the call it reports in flight (D3). The head of the row is read off
 * that same row: under the Claude brand the skin's own loading dots stand where
 * the host draws its whale tail, resting on the wording's line.
 */
import { bound } from './bounds.mjs'
import fs from 'node:fs'
import path from 'node:path'

/** The clauses the model writes, which the line says back word for word. */
const PHRASES = ['Checking the file is true', 'Reading the row model']
/** The call the script makes, and the file whose name the line has to carry. */
const READ_WORD = /^(Reading app\.js|正在读取 app\.js)$/
/**
 * How close together two wordings may be read. The line locks a wording for a
 * second (WORD_LOCK_MS), so a turn that moves through several states that fast
 * still changes at most once a second; the record is stamped by the page when it
 * writes the wording, so the slack covers only a change landing between two
 * frames of that write.
 */
const MIN_GAP_MS = bound('waitLineMinGapMs')
/** The file the scripted read opens: written before the turn, so the call has something to read. */
const APP = 'const first = 1\n'

/**
 * The loader's motions, each with the lane it plays in, how many dots it draws,
 * the animation its first dot runs and that animation's own turn
 * (features/chat-wait/chat-wait.css). `wait-loader.ts` hands the row over from
 * one to the next every `--dsh-claude-period-dot-rotate`, so any of the three may
 * be the one standing when the head is read; the smoke case reads the same three
 * (cases/chat.mjs).
 */
const MOTIONS = [
  { lane: 'is-bounce', dots: 3, animation: 'dsh-claude-wait-dot', duration: '0.5s' },
  { lane: 'is-line', dots: 3, animation: 'dsh-claude-wait-dot-line', duration: '1.25s' },
  { lane: 'is-orbit', dots: 4, animation: 'dsh-claude-wait-dot-orbit-1', duration: '2.4s' },
]

/**
 * The head of the running row on the real host: the skin's own loader where the
 * host draws its whale tail, which is what the Claude brand stands in for it,
 * and the seat the loader takes — the row it stands in, and the wording's own
 * line box, which the dots rest on.
 */
const readHead = (page) => page.evaluate(() => {
  const row = document.querySelector('[data-chat-running]')
  if (row === null) return null
  const loader = row.querySelector('.dsh-claude-chat-wait-loader')
  // The loader carries one lane of dots per motion, of which the lane in play is
  // the one drawn and the one whose animation is running
  // (features/chat-wait/wait-loader.ts).
  const lane = loader === null ? null : loader.querySelector('.dsh-claude-chat-wait-lane.is-active')
  const dot = lane === null ? null : lane.firstElementChild
  const icon = row.querySelector('[data-dsh-claude-part~="running-icon"]')
  const label = row.querySelector('.dsh-claude-chat-wait-label')
  const dotStyle = dot === null ? null : getComputedStyle(dot)
  const box = (r) => ({ top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), height: +r.height.toFixed(1) })
  const seat = (element) => box(element.getBoundingClientRect())
  // The line's own text: while a wording swaps the label holds two copies, so
  // the one standing is the last of them.
  const copies = label === null ? [] : label.querySelectorAll('.dsh-claude-swap-copy')
  const standing = copies.length === 0 ? label : copies[copies.length - 1]
  let text = null
  if (standing !== null) {
    const range = document.createRange()
    range.selectNodeContents(standing)
    text = box(range.getBoundingClientRect())
  }
  return {
    dots: lane === null ? 0 : lane.children.length,
    shown: loader !== null && getComputedStyle(loader).display !== 'none',
    // Which of the loader's three motions stands: the dots bounce while the
    // turn thinks, walk their own lines while it works, or swap the corners of
    // their own rectangle. The reading beside it is the animation that motion
    // runs, so the two are checked against each other.
    motion: lane === null ? '' : lane.className,
    animation: dotStyle === null ? null : dotStyle.animationName,
    duration: dotStyle === null ? null : dotStyle.animationDuration,
    shadow: dotStyle === null ? null : dotStyle.boxShadow,
    iconShown: icon !== null && getComputedStyle(icon).display !== 'none',
    seats: loader === null || text === null ? null : { row: seat(row), loader: seat(loader), text },
  }
})

function waitLineScenario({ check }) {
  return {
    script: 'waitLine',
    prompt: 'check the file and answer',
    // A piece per lock and a half: every sentence the script writes stands long
    // enough for the line to reach it, so what the wording does between two
    // clauses is the line's own doing (features/chat-wait/wait-state.ts).
    delayMs: 1400,
    /** The workspace the scratch host opens its session in, and a recorder of what the host says each call is doing. */
    async beforeSend(context) {
      const workspace = path.join(context.home, 'workspace')
      fs.mkdirSync(workspace, { recursive: true })
      fs.writeFileSync(path.join(workspace, 'app.js'), APP)
      // Every state the host's own call rows stand in, in order: what the line
      // reads is the snapshot, and this is what the host drew beside it.
      await context.page.evaluate(() => {
        window.__waitCalls = []
        window.__waitWords = []
        const seen = new Map()
        const record = () => {
          for (const row of document.querySelectorAll('[data-chat-call-id]')) {
            const marked = row.querySelector('[data-state]')
            const state = marked === null ? '' : (marked.getAttribute('data-state') ?? '')
            const key = `${state}|${(row.innerText || '').replace(/\s+/g, ' ').slice(0, 24)}`
            if (seen.get(row) === key) continue
            seen.set(row, key)
            window.__waitCalls.push(key)
          }
        }
        // The line's own wording, recorded where the page writes it. The lock
        // the wording is held under is the skin's own timer, and a wording read
        // from the runner's side is read whenever that side is scheduled again:
        // on a loaded machine the reading lands late and measures a shorter gap
        // than the lock held, so the record is taken here and stamped with the
        // page's clock.
        const recordWord = () => {
          const label = document.querySelector('[data-chat-running] .dsh-claude-chat-wait-label')
          const word = label === null ? null : (label.dataset.text ?? null)
          const last = window.__waitWords[window.__waitWords.length - 1]
          if (word === null || last?.word === word) return
          window.__waitWords.push({ word, at: performance.now() })
        }
        new MutationObserver(() => {
          record()
          recordWord()
        }).observe(document.body, { subtree: true, childList: true, attributes: true })
        record()
        recordWord()
      })
    },
    /** Hold the turn while the row stands, and take the page's own record of the words it stood on. */
    async duringTurn(context) {
      const { page } = context
      let head = null
      const deadline = Date.now() + 60000
      while (Date.now() < deadline) {
        const words = await page.evaluate(() => window.__waitWords ?? [])
        // The row's head is read once, off the row the host itself mounted.
        if (head === null) head = await readHead(page)
        // The call's own words are the last state of the turn's work here: once
        // they have stood, every wording before them has been recorded.
        if (words.some((entry) => READ_WORD.test(entry.word))) break
        if (words.length > 0 && await page.evaluate(() => document.querySelector('[data-chat-running]') === null)) break
        await page.waitForTimeout(80)
      }
      context.notes.seen = await page.evaluate(() => window.__waitWords ?? [])
      context.notes.head = head
    },
    async assert({ page, session, notes }) {
      const seen = notes.seen ?? []
      const words = seen.map((entry) => entry.word)
      const gaps = seen.slice(1).map((entry, at) => entry.at - seen[at].at)
      const calls = await page.evaluate(() => window.__waitCalls ?? [])
      const head = notes.head ?? null
      const seats = head?.seats ?? null
      // What stood between two clauses: from the first clause the line said to
      // the last. The sentence carrying no clause sits inside that stretch, and
      // only a clause may stand there — the call's own words come after the last
      // one, which is newer work and takes the line by design.
      const firstClause = words.findIndex((word) => PHRASES.includes(word))
      const lastClause = words.reduce((at, word, index) => (PHRASES.includes(word) ? index : at), -1)
      const held = firstClause === -1 || lastClause === -1 ? [] : words.slice(firstClause, lastClause + 1)
      return [
        check('推理里的进行时从句由这一行自己说出来',
          words.some((word) => PHRASES.includes(word)), JSON.stringify(words)),
        check('调用在跑时说出它读的文件',
          words.some((word) => READ_WORD.test(word)), JSON.stringify({ words, calls })),
        check('从句在下一次意图到达之前一直站着，中间不退回等待词',
          held.length > 0 && held.every((word) => PHRASES.includes(word)), JSON.stringify({ words, held })),
        check('一个说法锁住一秒：状态换得再快，这一行也只一秒换一次',
          gaps.length > 0 && gaps.every((gap) => gap >= MIN_GAP_MS),
          JSON.stringify({ gaps, words })),
        check('Claude 品牌下这一行开头换成插件自己的加载点，宿主的鲸鱼尾让位，加载点不带阴影，走的是这一轮该走的那套动作',
          head !== null && head.shown === true && head.shadow === 'none' && head.iconShown === false &&
            MOTIONS.some((motion) => head.motion.includes(motion.lane) && head.dots === motion.dots &&
              head.animation === motion.animation && head.duration === motion.duration),
          JSON.stringify(head)),
        check('加载点站在那一行里、落在说法的行上，不探出行外',
          seats !== null && seats.loader.top >= seats.row.top && seats.loader.bottom <= seats.row.bottom &&
            seats.loader.top >= seats.text.top - 2 && seats.loader.bottom <= seats.text.bottom + 2,
          JSON.stringify(seats)),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { waitLineScenario }
