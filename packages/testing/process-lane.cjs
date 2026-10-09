#!/usr/bin/env node
/**
 * process-lane.cjs — the redraw process lane's end-to-end scenario (D45, D55).
 *
 * Its own module rather than a block inside packages/testing/e2e.cjs, which is
 * at its stop line (AGENTS.md); `importance.cjs` is here for the same reason.
 *
 * The scenario asks for the redraw tier of the chat-area animation choice and
 * runs a turn whose script holds an intermediate output with work on both sides
 * of it. It asserts what only the assembled client shows: the figures the lane
 * writes on the host's whole-turn control, the segment the work before that
 * output folded into, and the rows the output left standing.
 */
'use strict'

/** Everything one reading of the lane needs, straight from the page. */
const read = (page) => page.evaluate(() => {
  const control = document.querySelector('button[data-turn-process]')
  const groups = [...document.querySelectorAll('[data-step-process]')]
  const members = [...document.querySelectorAll('[data-turn-process-member]')]
  const folded = (row) => row.hasAttribute('hidden') || row.hasAttribute('data-segment-folded')
  return {
    counts: control === null ? null : control.getAttribute('data-dsh-claude-process-counts'),
    label: control === null ? null : (control.textContent ?? '').replace(/\s+/g, ' ').trim(),
    flat: document.querySelectorAll('[data-dsh-claude-process-flat]').length,
    heads: document.querySelectorAll('[data-dsh-claude-process-head]').length,
    summaries: [...document.querySelectorAll('[data-dsh-claude-process-segment]')].map((row) => row.querySelector('button').getAttribute('aria-label')),
    folds: document.querySelectorAll('[data-segment-folded]').length,
    rolls: document.querySelectorAll('[data-dsh-claude-number-roll]').length,
    groups: groups.length,
    open: groups.filter((group) => !group.querySelector('[data-step-process-body]').hasAttribute('hidden')).length,
    visibleMembers: members.filter((row) => !folded(row)).length,
    held: document.querySelectorAll('[data-dsh-claude-process-lane]').length,
    thinking: document.querySelectorAll('[data-step-process] [data-variant="think"]').length,
    calls: document.querySelectorAll('[data-step-process] [data-chat-call-id]').length,
    ground: groups.map((group) => Math.round(group.getBoundingClientRect().height)),
  }
})

function processScenario({ check }) {
  return {
    script: 'process',
    prompt: 'look at the workspace',
    patch: [
      '- id: ui-skin-claude-style',
      '  config:',
      '    chatAnimations: redraw',
    ],
    /**
     * Sample the live turn once, while it is still on: the readings the settled
     * page can no longer show (D56). The turn passes too quickly for an
     * after-the-fact poll, so the page itself watches for the first pass that
     * puts figures on the host's running line and keeps what it saw.
     */
    async beforeSend({ page }) {
      await page.evaluate(() => {
        window.__liveProcess = { counts: null, thinkOpen: false, tracks: 0 }
        const sample = () => {
          const line = document.querySelector('[data-chat-running]')
          if (line === null || !line.hasAttribute('data-dsh-claude-process-counts')) return
          const seen = window.__liveProcess
          // The figures and the row's opening land in the same pass but in
          // separate records, so each reading latches on its own.
          seen.counts = line.getAttribute('data-dsh-claude-process-counts')
          if ([...document.querySelectorAll('[data-variant="think"][data-state="running"]')]
            .some((row) => row.hasAttribute('data-expanded'))) seen.thinkOpen = true
          seen.tracks = Math.max(seen.tracks, document.querySelectorAll('[data-dsh-claude-think-track]').length)
        }
        new MutationObserver(sample).observe(document.body, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ['data-dsh-claude-process-counts', 'data-expanded'],
        })
      })
    },
    async assert({ page, session }) {
      const live = await page.evaluate(() => window.__liveProcess ?? { counts: null, thinkOpen: false, tracks: 0 })
      // The lane plays its closing sequence when the turn ends, and reads the
      // rows once more after it: the host can mount one of them twice for a
      // moment while it moves it, so the folded reading waits for that pass.
      await page.waitForFunction(() => {
        const control = document.querySelector('button[data-turn-process]')
        return control !== null
          && control.hasAttribute('data-dsh-claude-process-counts')
          && document.querySelectorAll('[data-dsh-claude-process-lane]').length === 0
      }, undefined, { timeout: 20000 })
      await page.waitForTimeout(400)
      const folded = await read(page)
      await page.click('button[data-turn-process]')
      await page.waitForTimeout(1200)
      const opened = await read(page)
      return [
        check('a running thinking row stands open while the model reasons',
          live.thinkOpen === true, JSON.stringify(live)),
        check('the host\'s running line carries the turn\'s figures while the turn is still on',
          typeof live.counts === 'string' && live.counts.startsWith(' · 思考×'),
          JSON.stringify(live.counts)),
        check('the lane takes the redraw tier and marks its own document',
          await page.evaluate(() => document.body.hasAttribute('data-dsh-claude-chat-process')), 'no lane mark on <body>'),
        check('the folded turn carries the turn\'s figures on the host\'s own control',
          folded.counts === ' · 思考×3 · 工具×2 · 记录×1' && folded.label.startsWith('已完成，用时'),
          `counts=${JSON.stringify(folded.counts)} label=${JSON.stringify(folded.label)}`),
        check('a folded turn holds its process rows and its segments behind the control',
          folded.visibleMembers === 0 && folded.summaries.length === 0 && folded.flat === 0 && folded.heads === 0 && folded.held === 0,
          JSON.stringify(folded)),
        check('opening the turn lays the process out as one column of rows',
          opened.flat === opened.groups && opened.heads === opened.groups && opened.open === opened.groups
            && opened.ground.every((height) => height > 0),
          JSON.stringify({ flat: opened.flat, heads: opened.heads, groups: opened.groups, open: opened.open, ground: opened.ground })),
        check('the work before the intermediate output folded into its own summary, and the output stands',
          opened.summaries.length === 1 && opened.folds === 3 && opened.visibleMembers === 3
            && opened.summaries[0] === '思考×2 · 工具×1',
          JSON.stringify({ summaries: opened.summaries, folds: opened.folds, visible: opened.visibleMembers })),
        check('the summary\'s figures are the rolling ones',
          opened.rolls > 0, `rolls=${opened.rolls}`),
        check('the figures describe the rows the lane counted',
          opened.counts === folded.counts && folded.counts === ' · 思考×3 · 工具×2 · 记录×1',
          `folded=${JSON.stringify(folded.counts)} opened=${JSON.stringify(opened.counts)}`),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { processScenario }
