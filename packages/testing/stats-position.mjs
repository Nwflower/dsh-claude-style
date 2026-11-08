#!/usr/bin/env node
/**
 * stats-position.mjs — the session's numbers on a line of their own (D87).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.mjs).
 *
 * The stored value has to travel the whole host path: the preference is written
 * into the profile's patch layer, the host's settings schema has to carry the
 * field the host half declares, and the page has to read the answer back. That
 * path is what the smoke's stand-in form cannot prove, so the scenario holds
 * `inline` and asserts what the reader sees: the host's own words around the
 * host's own figures under the card, no glyph of the host's statistics row,
 * the figures written as plain text the count rewrites in place, the cache
 * share's figure and percent sign painted in the band their reading fell on,
 * and the meter's reading drawn as a pie in the occupancy's own — on the real
 * host's own nodes.
 */
import { statsFooterScenario, statsOverlayScenario } from './stats-overlay.mjs'

/** Read the composer's bottom line, the line of figures and the meter's pie. */
const readPosition = (page) => page.evaluate(() => {
  const card = document.querySelector('[data-composer-card]')
  const dock = card?.nextElementSibling ?? null
  const row = document.querySelector('[data-composer-stat]')
  const meter = document.querySelector('[data-dsh-claude-context-meter]')
  const line = document.querySelector('[data-dsh-claude-inline-stats]')
  const cache = line?.querySelector('[data-dsh-claude-ramp="cache"]') ?? null
  const cacheFigure = cache?.querySelector('.dsh-claude-digit-group') ?? null
  const cacheTail = cache?.querySelector('.dsh-claude-inline-tail') ?? null
  const cacheWords = cache?.querySelector('.dsh-claude-inline-label') ?? null
  const trigger = meter?.querySelector('button') ?? null
  const ring = trigger?.querySelector('svg') ?? null
  const reading = trigger?.querySelector('span') ?? null
  const shown = (element) => element !== null && element !== undefined && getComputedStyle(element).display !== 'none'
  return {
    attribute: document.body.getAttribute('data-dsh-claude-stats-position'),
    text: (line?.textContent ?? '').replace(/\s+/g, ' ').trim(),
    // A figure the ladder has taken away stays in the document (it comes back
    // the same way), so this counts the ones the reader sees.
    figures: [...(line?.querySelectorAll('.dsh-claude-inline-seg:not([hidden]) .dsh-claude-digit-group') ?? [])]
      .map((group) => (group.textContent ?? '').trim()),
    glyphs: line?.querySelectorAll('svg, img').length ?? 0,
    // The figures are plain text the count rewrites: no character carries a
    // span or an entrance of its own (features/context-stats/stats-count.ts).
    digits: line?.querySelectorAll('.dsh-claude-digit').length ?? 0,
    rowDisplay: row === null ? null : getComputedStyle(row).display,
    lineShown: shown(line),
    cacheColor: cacheFigure === null ? null : getComputedStyle(cacheFigure).color,
    cacheTailColor: cacheTail === null ? null : getComputedStyle(cacheTail).color,
    cacheWordsColor: cacheWords === null ? null : getComputedStyle(cacheWords).color,
    // The meter's reading is a pie: the host's ring keeps its cell, hidden
    // while the trigger's own background carries the image the feature drew.
    pie: meter !== null && meter.hasAttribute('data-dsh-claude-meter-pie'),
    ringVisibility: ring === null ? null : getComputedStyle(ring).visibility,
    pieImage: trigger === null ? null : getComputedStyle(trigger).backgroundImage,
    pieRest: trigger === null ? null : getComputedStyle(trigger).getPropertyValue('--dsh-claude-pie-rest').trim(),
    reading: reading === null ? null : (reading.textContent ?? '').trim(),
    readingColor: reading === null ? null : getComputedStyle(reading).color,
    dockPosition: dock === null ? null : getComputedStyle(dock).position,
    meterPosition: meter === null ? null : getComputedStyle(meter).position,
    blocks: document.querySelectorAll('.dsh-claude-context-stats').length,
  }
})

/**
 * Once the card's own width has held for two frames, how wide the line stands
 * against the card, how many of its figures show, and whether the meter gave up
 * its reading; null when the page stays busy past the bound.
 *
 * Both boxes come from `getBoundingClientRect`, so a page drawn at a scale
 * compares like with like, and the reading waits for the card to stop moving:
 * a viewport change animates the frame around the composer, and a width taken
 * mid-slide says nothing about the card the line has to fit.
 */
const readFit = (page) => Promise.race([
  page.evaluate(() => new Promise((resolve) => {
    const startedAt = performance.now()
    let heldWidth = null
    let heldFrames = 0
    const tick = () => {
      const card = document.querySelector('[data-composer-card]')
      const line = document.querySelector('[data-dsh-claude-inline-stats]')
      const meter = document.querySelector('[data-dsh-claude-context-meter]')
      const groups = [...(line?.querySelectorAll('.dsh-claude-digit-group') ?? [])]
      const width = card === null ? null : Math.round(card.getBoundingClientRect().width * 100) / 100
      const reading = {
        card: width,
        line: line === null ? null : Math.round(line.getBoundingClientRect().width * 100) / 100,
        figures: groups.filter((group) => group.getClientRects().length > 0).length,
        tight: meter !== null && meter.hasAttribute('data-dsh-claude-meter-tight'),
      }
      if (width !== heldWidth) {
        heldWidth = width
        heldFrames = 0
      } else {
        heldFrames += 1
      }
      if (heldFrames >= 2 || performance.now() - startedAt > 4000) {
        resolve(reading)
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })),
  new Promise((resolve) => setTimeout(() => resolve(null), 5000)),
])

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

/**
 * Whether the image on the trigger carries the colour the reading is painted
 * with — the plate's own quiet tone instead when nothing has been taken, since
 * an empty reading has no sector to wear it.
 */
const piePaints = (state) => {
  if (state.pieImage === null || state.readingColor === null) return false
  const image = decodeURIComponent(state.pieImage)
  const occupancy = Number.parseFloat(state.reading ?? '')
  const tone = Number.isFinite(occupancy) && occupancy > 0 ? state.readingColor : state.pieRest
  return typeof tone === 'string' && tone !== '' && image.includes(`fill="${tone}"`)
}

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
        check('the figures are text a count rewrites in place, with no character carrying a span or an entrance of its own',
          state.digits === 0, JSON.stringify(state.digits)),
        check('the cache share\'s band colours its figure and percent sign alone, and the meter\'s reading is a pie in the occupancy\'s own colour',
          state.cacheColor !== null && state.cacheTailColor === state.cacheColor &&
            state.cacheWordsColor !== null && state.cacheWordsColor !== state.cacheColor &&
            state.pie && state.ringVisibility === 'hidden' &&
            state.pieImage !== null && state.pieImage.includes('data:image/svg+xml') && piePaints(state),
          JSON.stringify({ cache: state.cacheColor, percent: state.cacheTailColor, words: state.cacheWordsColor, pie: state.pie, ring: state.ringVisibility, reading: state.reading, image: state.pieImage })),
        check('the popover keeps none of the numbers here', state.blocks === 0, JSON.stringify(state.blocks)),
        check('giving up the meter\'s reading takes width alone: the row under the card keeps its height, so the conversation above never moves',
          step !== null && step.withReading === step.withoutReading &&
            narrowStep !== null && narrowStep.withReading === narrowStep.withoutReading,
          JSON.stringify({ roomyCard: step, narrowCard: narrowStep })),
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
 * The session statistics' scenarios: the line of their own, the meter's dock,
 * and the compact figures over the toolbar, registered under one factory.
 */
function statsScenarios({ check }) {
  return {
    statsPosition: statsPositionScenario({ check }),
    statsOverlay: statsOverlayScenario({ check }),
    statsFooter: statsFooterScenario({ check }),
  }
}

export { statsScenarios }
