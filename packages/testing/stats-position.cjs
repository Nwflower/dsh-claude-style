#!/usr/bin/env node
/**
 * stats-position.cjs — the session's numbers on a line of their own (D27, D45).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.cjs).
 *
 * The stored value has to travel the whole host path: the preference is written
 * into the profile's patch layer, the host's settings schema has to carry the
 * field the host half declares, and the page has to read the answer back. That
 * path is what the smoke's stand-in form cannot prove, so the scenario holds
 * `inline` and asserts what the reader sees: the host's own words around the
 * host's own figures under the card, no glyph of the host's statistics row,
 * every figure written so it can re-enter, and the cache share and the meter's
 * ring each painted with the colour their reading fell on — on the real host's
 * own nodes.
 */
'use strict'
const { statsOverlayScenario } = require('./stats-overlay.cjs')

/** Read the composer's bottom line, the line of figures and the meter's ring. */
const readPosition = (page) => page.evaluate(() => {
  const card = document.querySelector('[data-composer-card]')
  const dock = card?.nextElementSibling ?? null
  const row = document.querySelector('[data-composer-stats], [data-composer-stat]')
  const meter = document.querySelector('[data-dsh-claude-context-meter]')
  const line = document.querySelector('[data-dsh-claude-inline-stats]')
  const cache = line?.querySelector('[data-dsh-claude-ramp="cache"]') ?? null
  const digit = line?.querySelector('.dsh-claude-digit') ?? null
  const fill = meter?.querySelector('circle[stroke-dasharray]') ?? null
  const track = meter?.querySelector('circle:not([stroke-dasharray])') ?? null
  const shown = (element) => element !== null && element !== undefined && getComputedStyle(element).display !== 'none'
  return {
    attribute: document.body.getAttribute('data-dsh-claude-stats-position'),
    text: (line?.textContent ?? '').replace(/\s+/g, ' ').trim(),
    // A figure the ladder has taken away stays in the document (it comes back
    // the same way), so this counts the ones the reader sees.
    figures: [...(line?.querySelectorAll('.dsh-claude-inline-seg:not([hidden]) .dsh-claude-digit-group') ?? [])]
      .map((group) => (group.textContent ?? '').trim()),
    glyphs: line?.querySelectorAll('svg, img').length ?? 0,
    animation: digit === null ? null : getComputedStyle(digit).animationName,
    rowDisplay: row === null ? null : getComputedStyle(row).display,
    lineShown: shown(line),
    cacheColor: cache === null ? null : getComputedStyle(cache).color,
    ringColor: fill === null ? null : getComputedStyle(fill).stroke,
    trackColor: track === null ? null : getComputedStyle(track).stroke,
    dockPosition: dock === null ? null : getComputedStyle(dock).position,
    meterPosition: meter === null ? null : getComputedStyle(meter).position,
    blocks: document.querySelectorAll('.dsh-claude-context-stats').length,
  }
})

/**
 * After two frames, how wide the line stands against the card, how many of its
 * figures show, and whether the meter gave up its reading; null when the page
 * stays busy past the bound.
 */
const readFit = (page) => Promise.race([
  page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => {
    const card = document.querySelector('[data-composer-card]')
    const line = document.querySelector('[data-dsh-claude-inline-stats]')
    const meter = document.querySelector('[data-dsh-claude-context-meter]')
    const groups = [...(line?.querySelectorAll('.dsh-claude-digit-group') ?? [])]
    resolve({
      card: card === null ? null : card.clientWidth,
      line: line === null ? null : line.getBoundingClientRect().width,
      figures: groups.filter((group) => group.getClientRects().length > 0).length,
      tight: meter !== null && meter.hasAttribute('data-dsh-claude-meter-tight'),
    })
  })))),
  new Promise((resolve) => setTimeout(() => resolve(null), 5000)),
])

/**
 * What one rewritten figure does to the scroller the conversation and the
 * composer share: a figure that moved re-enters by sliding its characters up
 * from below their place (features/context-stats/stats-digits.ts), and that
 * overhang reaches past the composer's bottom edge unless the row it stands in
 * clips it. Every answer rewrites figures on every frame, so a scrollable height
 * that grows here grows the column with it.
 */
const readEntrance = (page) => page.evaluate(() => {
  const line = document.querySelector('[data-dsh-claude-inline-stats]')
  const group = line?.querySelector('.dsh-claude-digit-group') ?? null
  const scroller = document.querySelector('[class*="_scrollBody"]')
  if (group === null || scroller === null) return null
  const original = [...group.childNodes]
  const before = scroller.scrollHeight
  const spans = [...'12,345'].map((character) => {
    const span = document.createElement('span')
    span.className = 'dsh-claude-digit'
    span.textContent = character
    return span
  })
  group.replaceChildren(...spans)
  const during = scroller.scrollHeight
  group.replaceChildren(...original)
  return { before, during, grow: during - before }
})

/**
 * The row the numbers stand on, with and without the meter's reading: the
 * ladder's third step gives that reading up to win width, and the trigger's own
 * box is what the composer's bottom row is as tall as. The conversation above
 * pins its tail to that row, so a step that takes height with it moves every
 * message — once when the reading goes and once when it comes back.
 */
const readMeterStep = (page) => page.evaluate(() => {
  const card = document.querySelector('[data-composer-card]')
  const dock = card?.nextElementSibling ?? null
  const meter = document.querySelector('[data-dsh-claude-context-meter]')
  if (dock === null || meter === null) return null
  const height = () => Math.round(dock.getBoundingClientRect().height * 100) / 100
  const wasTight = meter.hasAttribute('data-dsh-claude-meter-tight')
  const withReading = height()
  meter.setAttribute('data-dsh-claude-meter-tight', '')
  const withoutReading = height()
  if (!wasTight) meter.removeAttribute('data-dsh-claude-meter-tight')
  return { wasTight, withReading, withoutReading }
})

/**
 * Press the line of numbers and read what its press does: the line is the
 * host's panel second trigger, so it opens the panel holding the same
 * session's rows, says so on its own `aria-expanded`, and closes it again.
 */
const readLinePanel = (page) => page.evaluate(async () => {
  const line = document.querySelector('[data-dsh-claude-inline-stats]')
  if (line === null) return null
  const panel = () => document.querySelector('[data-dsh-claude-context-panel]')
  const block = () => document.querySelector('.dsh-claude-context-stats')
  const wait = (open) => new Promise((resolve) => {
    const deadline = performance.now() + 1200
    const tick = () => {
      if ((panel() !== null) === open || performance.now() > deadline) resolve()
      else setTimeout(tick, 30)
    }
    tick()
  })
  const press = () => line.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  const role = line.getAttribute('role')
  const separators = Math.max(0, (line.textContent ?? '').split('·').length - 1)
  // The pointer path is the meter's alone: resting a pointer on the figures
  // must leave the panel down, whatever the hover preference says.
  line.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
  await new Promise((resolve) => setTimeout(resolve, 300))
  const hoverOpened = panel() !== null
  line.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }))
  press()
  await wait(true)
  const opened = panel() !== null
  const rows = block() === null
    ? []
    : [...block().querySelectorAll('.dsh-claude-context-stats-item')]
      .map((item) => (item.textContent ?? '').replace(/\s+/g, ' ').trim())
  // The line says on itself what the host's trigger says, one pass behind the press.
  await new Promise((resolve) => setTimeout(resolve, 250))
  const expanded = line.getAttribute('aria-expanded')
  press()
  await wait(false)
  return { role, separators, hoverOpened, opened, expanded, rows, closed: panel() === null }
})

function statsPositionScenario({ check }) {
  return {
    script: 'greeting',
    prompt: 'hello there',
    patch: [
      '- id: ui-skin-claude-style',
      '  config:',
      '    statsPosition: inline',
    ],
    async assert({ page, session }) {
      // The projections answer while the turn runs; the line appears with them.
      await page.waitForFunction(
        () => document.querySelector('[data-dsh-claude-inline-stats]') !== null,
        undefined, { timeout: 20000 },
      ).catch(() => {})
      const state = await readPosition(page)
      const wide = await readFit(page)
      const step = await readMeterStep(page)
      const entrance = await readEntrance(page)
      const linePanel = await readLinePanel(page)
      // A card narrower than the whole line: the line gives up steps until it
      // fits, and takes them back when the room returns. A ladder that never
      // stops holds the main thread, so each reading is bounded.
      await page.setViewportSize({ width: 390, height: 900 })
      const tight = await readFit(page)
      const narrowStep = await readMeterStep(page)
      await page.setViewportSize({ width: 1280, height: 900 })
      const roomy = await readFit(page)
      return [
        check('the stored position reaches the page', state.attribute === 'inline', JSON.stringify(state.attribute)),
        check('the host\'s own figures stand on a line under the card, with none of the row\'s glyphs',
          state.lineShown && state.text !== '' && state.figures.length === 6 &&
            state.figures.every((figure) => /\d/.test(figure)) &&
            state.glyphs === 0 && state.rowDisplay === 'none' &&
            state.dockPosition === 'static' && state.meterPosition === 'static',
          JSON.stringify(state)),
        check('every figure is written one character per span, so a number that moved re-enters',
          state.animation === 'dsh-claude-digit-pop-in', JSON.stringify(state.animation)),
        check('the cache share and the meter\'s ring each take the colour their reading fell on',
          state.cacheColor !== null && state.ringColor !== null && state.trackColor !== null &&
            state.ringColor !== state.trackColor,
          JSON.stringify({ cache: state.cacheColor, ring: state.ringColor, track: state.trackColor })),
        check('the popover keeps none of the numbers here', state.blocks === 0, JSON.stringify(state.blocks)),
        check('giving up the meter\'s reading takes width alone: the row under the card keeps its height, so the conversation above never moves',
          step !== null && step.withReading === step.withoutReading &&
            narrowStep !== null && narrowStep.withReading === narrowStep.withoutReading,
          JSON.stringify({ roomyCard: step, narrowCard: narrowStep })),
        check('a rewritten figure re-enters inside the row: the column the composer shares with the conversation keeps its scrollable height',
          entrance !== null && entrance.grow === 0,
          JSON.stringify(entrance)),
        check('the figures stand apart by their own gap alone: no separator glyph between them',
          linePanel !== null && linePanel.separators === 0,
          JSON.stringify(linePanel === null ? null : linePanel.separators)),
        check('the line opens the host\'s panel, which carries the same session\'s rows, and closes it again',
          linePanel !== null && linePanel.role === 'button' && linePanel.opened &&
            linePanel.expanded === 'true' && linePanel.rows.length > 0 && linePanel.closed,
          JSON.stringify(linePanel)),
        check('opening and closing on hover stays the meter\'s path: a pointer resting on the figures leaves the panel down',
          linePanel !== null && linePanel.hoverOpened === false,
          JSON.stringify(linePanel === null ? null : linePanel.hoverOpened)),
        check('a narrow card shortens the line until it fits, and the page keeps answering',
          tight !== null && tight.line !== null && tight.line <= tight.card && wide !== null && tight.figures < wide.figures,
          JSON.stringify({ wide, tight })),
        check('the room coming back gives the whole line back',
          roomy !== null && wide !== null && roomy.figures === wide.figures && !roomy.tight,
          JSON.stringify(roomy)),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

/**
 * The session statistics' scenarios, one per surface they can take: the line of
 * their own (stats-position.cjs) and the meter's dock laid over the toolbar row
 * (stats-overlay.cjs), registered together under one factory.
 */
function statsScenarios({ check }) {
  return {
    statsPosition: statsPositionScenario({ check }),
    statsOverlay: statsOverlayScenario({ check }),
  }
}

module.exports = { statsScenarios }
