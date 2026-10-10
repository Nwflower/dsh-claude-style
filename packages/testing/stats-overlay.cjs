#!/usr/bin/env node
/**
 * stats-overlay.cjs — the meter's dock laid over the toolbar row (D27, D45).
 *
 * Registered in the lane's scenario table through packages/testing/stats-position.cjs.
 *
 * The dock is the card's next sibling and the stylesheet lays it over the
 * toolbar row from the row's own box: its distance above the containing block
 * and its height come from custom properties the composer pass measures, because
 * both are the host's. A host whose card leaves a different gap under that row
 * used to put the meter several pixels off the row's line. This scenario holds
 * the context position, moves that gap on the real page and asserts the overlay
 * follows the row: the box the numbers' meter stands on is the box the model and
 * effort triggers stand on.
 */
'use strict'

/** The row's box, the dock's box, the pill's own box and the properties the overlay reads. */
const readOverlay = (page) => page.evaluate(() => {
  const card = document.querySelector('[data-composer-card]')
  const row = card?.querySelector('[class*="_trailing"]')?.parentElement ?? null
  const cluster = card?.querySelector('[class*="_trailing"]') ?? null
  const meter = document.querySelector('[data-dsh-claude-context-meter]')
  const trigger = meter?.querySelector('button') ?? null
  const box = (el) => {
    if (el === null || el === undefined) return null
    const b = el.getBoundingClientRect()
    return { left: Math.round(b.left * 100) / 100, right: Math.round(b.right * 100) / 100, top: Math.round(b.top * 100) / 100, bottom: Math.round(b.bottom * 100) / 100, height: Math.round(b.height * 100) / 100 }
  }
  const style = getComputedStyle(document.body)
  const clusterBox = box(cluster)
  const pillBox = box(trigger)
  return {
    row: box(row),
    dock: box(card?.nextElementSibling ?? null),
    meter: box(meter),
    pill: pillBox,
    pillGap: clusterBox === null || pillBox === null ? null : Math.round((pillBox.left - clusterBox.right) * 100) / 100,
    offset: style.getPropertyValue('--dsh-claude-meter-row-offset').trim(),
    height: style.getPropertyValue('--dsh-claude-meter-row-height').trim(),
  }
})

/**
 * Move the card's own gap under the row, let the row's size watcher take the new
 * reading and the page settle on it, and read the boxes again.
 */
const readOverlayWithGap = async (page, gap) => {
  await page.evaluate((value) => {
    const card = document.querySelector('[data-composer-card]')
    if (card !== null) card.style.marginBottom = value
  }, gap)
  await page.waitForTimeout(900)
  const reading = await readOverlay(page)
  await page.evaluate(() => {
    const card = document.querySelector('[data-composer-card]')
    if (card !== null) card.style.marginBottom = ''
  })
  await page.waitForTimeout(900)
  return reading
}

/**
 * A host whose meter trigger reaches outside the node it is parked in: the pill
 * is shifted 14px left inside its wrapper, so the room has to cover the pill
 * rather than the wrapper. Read, then put the trigger back.
 */
const readOverlayWithWidePill = async (page) => {
  const reading = await page.evaluate(() => {
    const trigger = document.querySelector('[data-dsh-claude-context-meter] button')
    if (trigger === null) return null
    trigger.style.marginLeft = '-14px'
    return true
  })
  if (reading !== true) return null
  await page.waitForTimeout(900)
  const read = await readOverlay(page)
  await page.evaluate(() => {
    const trigger = document.querySelector('[data-dsh-claude-context-meter] button')
    if (trigger !== null) trigger.style.marginLeft = ''
  })
  await page.waitForTimeout(900)
  return read
}

/** Whether the dock stands on the row's own line, as the overlay is supposed to place it. */
const onTheRow = (reading) => reading !== null && reading.dock !== null && reading.row !== null &&
  reading.dock.top === reading.row.top && reading.dock.height === reading.row.height

function statsOverlayScenario({ check }) {
  return {
    script: 'greeting',
    prompt: 'hello there',
    patch: [
      '- id: ui-skin-claude-style',
      '  config:',
      '    statsPosition: context',
    ],
    async assert({ page, session }) {
      await page.waitForFunction(
        () => document.querySelector('[data-dsh-claude-context-meter]') !== null,
        undefined, { timeout: 20000 },
      ).catch(() => {})
      const resting = await readOverlay(page)
      // The host's own gap under the row, moved the way a host that leaves a
      // different one would: the overlay has to follow the row, not the number
      // this window happens to leave. Zero is the reading the issue reported.
      const flush = await readOverlayWithGap(page, '-4px')
      const wider = await readOverlayWithGap(page, '12px')
      const restored = await readOverlay(page)
      // The pill, reaching outside the node the host parks it in.
      const widePill = await readOverlayWithWidePill(page)
      return [
        check('the dock stands on the toolbar row\'s own line, measured off the row rather than assumed',
          onTheRow(resting) && Number.parseFloat(resting.offset) >= 0 && Number.parseFloat(resting.height) > 0,
          JSON.stringify(resting)),
        check('a card leaving no gap under that row still keeps the meter on the row\'s line',
          onTheRow(flush) && Number.parseFloat(flush.offset) === 0,
          JSON.stringify(flush)),
        check('a card leaving a wider gap under that row keeps the meter on the row\'s line',
          onTheRow(wider) && Number.parseFloat(wider.offset) === Number.parseFloat(resting.offset) + 12,
          JSON.stringify(wider)),
        check('the reading follows the gap back when the host leaves it as it was',
          onTheRow(restored) && Number.parseFloat(restored.offset) === Number.parseFloat(resting.offset),
          JSON.stringify(restored)),
        check('the room covers the pill itself: a trigger reaching outside the node it is parked in keeps 8px clear of the row\'s text',
          widePill !== null && widePill.pillGap !== null && widePill.pillGap >= 7,
          JSON.stringify(widePill === null ? null : { pillGap: widePill.pillGap, meter: widePill.meter, pill: widePill.pill })),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { statsOverlayScenario }
