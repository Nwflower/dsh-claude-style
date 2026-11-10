#!/usr/bin/env node
/**
 * wash-line.mjs — the waiting line's colour wash, end to end (D92).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.mjs).
 *
 * The Motion tab's other paint is a document attribute the reader's stored
 * choice resolves onto (D40), and everything between that choice and the words
 * is real here: the loader patch writes `statusMotion` into the host's Config,
 * the host hands the value to the page's settings form, and the skin mirrors it
 * onto `<body>`. What the paint then is — seven radial washes orbiting the glyph
 * box while the hue turns — is the stylesheets' business, so this reads the two
 * animations off the copy that carries the words and checks that the wording,
 * its swap and the clock are the ones the sweep setting gives.
 */

/** The wordings the line may stand on in this run: the state it starts on. */
const ANY_WORD = /^(Thinking…|正在思考|Deep diving|深度求索中)/

/** The line's paint and its words, read off the copy that carries them. */
const readPaint = (page) => page.evaluate(() => {
  const row = document.querySelector('[data-chat-running]')
  const line = row === null ? null : row.querySelector('.dsh-claude-chat-wait')
  if (line === null) return { row: row !== null, line: false }
  // The line's parts are read by their own names rather than by position: the
  // loader leads them (chat-wait.css), and where each of the rest sits is the
  // stylesheet's business.
  const label = line.querySelector('.dsh-claude-chat-wait-label')
  const copies = label === null ? [] : label.querySelectorAll('.dsh-claude-swap-copy')
  const copy = copies.length === 0 ? null : copies[copies.length - 1]
  const paint = copy === null ? null : getComputedStyle(copy, '::before')
  const clock = line.querySelector('.dsh-claude-chat-wait-clock')
  return {
    row: true,
    line: true,
    statusMotion: document.body.getAttribute('data-dsh-claude-status-motion'),
    word: label.dataset.text ?? '',
    clock: clock !== null && clock.checkVisibility() ? clock.textContent : null,
    // The band's own box carries the class; the wash rides the same box, so the
    // reading is which animations the pseudo-element runs and how many washes
    // its background really holds.
    shimmer: copy !== null && copy.classList.contains('dsh-claude-swap-shimmer'),
    animations: paint === null ? null : paint.animationName,
    washes: paint === null ? 0 : (paint.backgroundImage.match(/url\("data:image\/svg/g) || []).length,
  }
})

function washLineScenario({ check }) {
  return {
    script: 'waitLine',
    prompt: 'check the file and answer',
    delayMs: 600,
    /** The reader's stored choice, written into the host's own settings (D75). */
    patch: [
      '- id: ui-skin-claude-style',
      '  config:',
      '    statusMotion: wash',
    ],
    /** Follow the line while the turn runs and keep the reading once it is painted. */
    async duringTurn(context) {
      const { page } = context
      const deadline = Date.now() + 60000
      let painted = null
      while (Date.now() < deadline) {
        const reading = await readPaint(page)
        if (reading.line === true && reading.washes > 0) {
          painted = reading
          break
        }
        if (reading.row === false && painted !== null) break
        await page.waitForTimeout(80)
      }
      context.notes.painted = painted
    },
    async assert({ page, session, notes }) {
      const painted = notes.painted ?? {}
      const body = await page.evaluate(() => document.body.getAttribute('data-dsh-claude-status-motion'))
      return [
        check('读者选的那一档由宿主设置一路走到页面上',
          body === 'wash' && painted.statusMotion === 'wash',
          JSON.stringify({ body, painted: painted.statusMotion })),
        check('状态行的文字跑起渐变流动的两个循环，扫光不再上场',
          painted.animations === 'dsh-claude-wash-hue, dsh-claude-wash-drift' && painted.washes === 7 && painted.shimmer === true,
          JSON.stringify(painted)),
        check('说法与计时照旧',
          ANY_WORD.test(painted.word ?? '') && /^\d+\s*(s|sec|secs|second|seconds|秒)$/i.test(painted.clock ?? ''),
          JSON.stringify({ word: painted.word, clock: painted.clock })),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { washLineScenario }
