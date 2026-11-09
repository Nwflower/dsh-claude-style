/**
 * The context popover opens over the ring the composer row carries and stays
 * inside the window at the page's own scale and under page zoom alike. The host
 * places it from the host meter's box, which has none once the skin's ring
 * replaces it, so the skin reads the ring and writes both edges itself.
 *
 * @capability context-stats
 * @features context-stats
 * @risk Under a page zoom the context popover opens a factor of its anchor's distance too low and runs past the window's bottom edge, so its last rows — model time, tool time, the first token's average, output speed — cannot be read.
 */
import { spec } from '../../fixtures/behaviour.mjs'

/**
 * Pin the composer stack the way the host pins it: the popover opens upward from
 * a ring standing at the window's bottom, which is where its placement means
 * anything.
 */
async function seatComposer(t) {
  await t.page.evaluate((card) => {
    const stack = document.querySelector(card).parentElement
    Object.assign(stack.style, { position: 'fixed', left: '8px', right: '8px', bottom: '8px' })
  }, t.host('composer.card'))
  await t.page.waitForTimeout(500)
}

/**
 * Every frame from the press on, so a panel painted anywhere but over the ring
 * is caught.
 */
async function watchPanel(t) {
  await t.page.evaluate((selector) => {
    const frames = []
    const started = performance.now()
    window.__panelFrames = frames
    const tick = () => {
      const panel = document.querySelector(selector)
      const box = panel === null ? null : panel.getBoundingClientRect()
      frames.push({
        at: Math.round(performance.now() - started),
        painted: panel !== null && getComputedStyle(panel).visibility === 'visible',
        left: box === null ? null : Math.round(box.left),
        top: box === null ? null : Math.round(box.top),
        bottom: box === null ? null : Math.round(box.bottom),
        right: box === null ? null : Math.round(box.right),
      })
      if (performance.now() - started < 1500) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, `[${t.surface.attribute('stats.context-panel')}]`)
}

/** Open the popover through the ring and wait for the skin's placement. */
async function openPanel(t) {
  const panel = `[${t.surface.attribute('stats.context-panel')}]`
  const ring = `${t.surface('stats.meter-ring')} button`
  await watchPanel(t)
  await t.page.locator(ring).click()
  await t.page.locator(panel).waitFor({ state: 'visible' })
  await t.page.waitForFunction(([selector, mark]) => document.querySelector(selector)?.hasAttribute(mark) === true,
    [panel, t.surface.attribute('stats.context-panel-placed')], { timeout: 10000 })
  // The panel's entrance is an animation: its box settles a moment after it opens.
  await t.page.waitForTimeout(400)
  return panel
}

/** The popover's box, the ring's box, the window's, and every frame the panel was painted in. */
async function readPlacement(t, panel) {
  return t.page.evaluate(([selector, ringSelector, placedMark]) => {
    const element = document.querySelector(selector)
    const ring = document.querySelector(ringSelector)
    if (element === null || ring === null) return null
    const box = element.getBoundingClientRect()
    const anchor = ring.getBoundingClientRect()
    return {
      placed: element.hasAttribute(placedMark),
      panel: { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height },
      ring: { top: anchor.top, left: anchor.left, right: anchor.right },
      window: { width: innerWidth, height: innerHeight },
      zoom: Number.parseFloat(getComputedStyle(document.body).zoom) || 1,
      frames: (window.__panelFrames ?? []).filter((frame) => frame.painted),
    }
  }, [panel, t.surface('stats.meter-ring'), t.surface.attribute('stats.context-panel-placed')])
}

/** The panel stands above the ring, by the host's own gap, in every frame it is painted in. */
function judgeThePlacement(t, reading, label) {
  t.expectThat.visible(reading === null ? null : reading.panel, `the context popover is drawn (${label})`)
  if (reading === null) return
  t.expectThat.equal(reading.placed, true, `the skin has placed the popover (${label})`)
  // The host's gap is measured in the page's own pixels, so the window shows it
  // at the page's scale.
  const gap = (reading.ring.top - reading.panel.bottom) / reading.zoom
  t.expectThat.equal(gap >= 7 && gap <= 9, true, `the popover opens over the ring by the host's own gap, ${gap.toFixed(1)}px above it (${label})`)
  t.expectThat.boxWithin(reading.panel,
    { left: 0, top: 0, right: reading.window.width, bottom: reading.window.height, width: reading.window.width, height: reading.window.height },
    `the popover stays inside the window (${label})`, 1)
  // Every painted frame: above the ring, and never in the window's corner. A
  // panel mounted before the skin has placed it would paint at the host's own
  // answer, which is that corner.
  const corner = reading.frames.filter((frame) => frame.left <= 13 && frame.top <= 13)
  t.expectThat.equal(corner.length, 0, `no frame of the popover stands in the window's corner (${label})`)
  const offTheRing = reading.frames.filter((frame) => frame.bottom > reading.ring.top + 1)
  t.expectThat.equal(offTheRing.length, 0, `every painted frame stands above the ring (${label})`)
  t.expectThat.equal(reading.frames.length > 0, true, `the popover was painted at all (${label})`)
}

export default spec({ page: 'context-stats' }, ({ test }) => {
  test('the context popover opens over the ring, inside the window', async (t) => {
    await seatComposer(t)
    const panel = await openPanel(t)
    judgeThePlacement(t, await readPlacement(t, panel), 'at the page\'s own scale')
  })

  test('under page zoom the context popover still opens over the ring, inside the window', async (t) => {
    await seatComposer(t)
    await t.prefs({ pageZoom: '1.25' })
    // The zoom is judged too: a preference that never reached the page would
    // leave the placement at 100% and the comparison would pass over nothing.
    t.expectThat.equal(await t.read.attribute('body', t.surface.attribute('skin.page-zoom')), '1.25', 'the page zoom reaches the document')
    t.expectThat.equal(await t.read.computed('body', 'zoom'), '1.25', 'the page is drawn at 125%')
    const panel = await openPanel(t)
    judgeThePlacement(t, await readPlacement(t, panel), 'at 125%')
  })
})
