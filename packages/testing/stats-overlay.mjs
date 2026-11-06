#!/usr/bin/env node
/**
 * stats-overlay.mjs — the context meter's ring in the composer row (D87).
 *
 * Registered in the lane's scenario table through packages/testing/stats-position.mjs.
 *
 * The host's meter cannot leave the dock the host renders it in, so the skin
 * draws the ring itself, after the seat box in the host's model slot, and the
 * host's meter keeps the place the host gave it with no paint. The row's own
 * layout is what holds the ring; the panel the ring opens is the host's, placed
 * by the skin over the ring in the panel's own pixels. This scenario holds the
 * context position on the real host and asserts what the reader sees: the ring
 * and the seat box on one line, the host's meter unpainted, and the panel over
 * the ring in every frame from the press to the settle — at the page's own
 * scale and under a page zoom.
 */

/**
 * The skin's own marks, read off the surface table rather than spelled here
 * (D87): the table is what a lane names a skin mark through.
 */
import surfaceTable from './data/surface.json' with { type: 'json' }

const SURFACE = surfaceTable.surface
const mark = (id) => {
  const entry = SURFACE.find((candidate) => candidate.id === id)
  if (entry === undefined || entry.attribute === undefined) throw new Error(`stats-overlay: surface "${id}" names no attribute`)
  return entry.attribute
}
const selector = (id) => {
  const entry = SURFACE.find((candidate) => candidate.id === id)
  if (entry === undefined || entry.selector === undefined) throw new Error(`stats-overlay: surface "${id}" names no element`)
  return entry.selector
}
const PAGE_ZOOM = mark('skin.page-zoom')
const CONTEXT_METER = mark('stats.context-meter')
const CONTEXT_PANEL = mark('stats.context-panel')
const CONTEXT_PANEL_PLACED = mark('stats.context-panel-placed')
const METER_RING = selector('stats.meter-ring')
const MODEL_SEAT = selector('model.seat')

const rounded = (box) => ({
  left: Math.round(box.left * 100) / 100,
  right: Math.round(box.right * 100) / 100,
  top: Math.round(box.top * 100) / 100,
  bottom: Math.round(box.bottom * 100) / 100,
  width: Math.round(box.width * 100) / 100,
  height: Math.round(box.height * 100) / 100,
})

/** The row the reader sees: the seat box, the ring, the host's meter and the card they stand in. */
const readRow = (page) => page.evaluate(([ringSelector, seatSelector, meterMark]) => {
  const card = document.querySelector('[data-composer-card]')
  const seat = document.querySelector(seatSelector)
  const ring = document.querySelector(ringSelector)
  const meter = document.querySelector(`[${meterMark}]`)
  const box = (element) => {
    if (element === null) return null
    const rect = element.getBoundingClientRect()
    return {
      left: Math.round(rect.left * 100) / 100,
      right: Math.round(rect.right * 100) / 100,
      top: Math.round(rect.top * 100) / 100,
      bottom: Math.round(rect.bottom * 100) / 100,
      width: Math.round(rect.width * 100) / 100,
      height: Math.round(rect.height * 100) / 100,
    }
  }
  const button = ring === null ? null : ring.querySelector('button')
  return {
    seat: box(seat),
    ring: box(ring),
    card: box(card),
    meter: box(meter),
    meterDisplay: meter === null ? null : getComputedStyle(meter).display,
    text: ring === null ? null : (ring.textContent ?? '').trim(),
    hostText: meter === null ? null : (meter.textContent ?? '').trim(),
    label: button === null ? null : button.getAttribute('aria-label'),
    hostLabel: meter === null ? null : meter.querySelector('button')?.getAttribute('aria-label') ?? null,
    cardScroll: card === null ? null : { scrollWidth: card.scrollWidth, clientWidth: card.clientWidth },
  }
}, [METER_RING, MODEL_SEAT, CONTEXT_METER])

/**
 * Sample the panel's box every frame from before the press, and answer what was
 * painted: a panel stands above the ring in every frame the reader could see it
 * in, and no frame of it stands in the window's corner.
 */
const readPanelFrames = async (page, action) => {
  await page.evaluate(([panelMark, ringSelector]) => {
    const frames = []
    const started = performance.now()
    window.__panelFrames = frames
    const tick = () => {
      const panel = document.querySelector(`[${panelMark}]`)
      const rect = panel === null ? null : panel.getBoundingClientRect()
      const ring = document.querySelector(ringSelector)
      const ringRect = ring === null ? null : ring.getBoundingClientRect()
      frames.push({
        at: Math.round(performance.now() - started),
        painted: panel !== null && getComputedStyle(panel).visibility === 'visible',
        aligned: panel !== null && panel.hasAttribute('data-dsh-claude-context-aligned'),
        left: rect === null ? null : Math.round(rect.left),
        top: rect === null ? null : Math.round(rect.top),
        bottom: rect === null ? null : Math.round(rect.bottom),
        right: rect === null ? null : Math.round(rect.right),
        ringTop: ringRect === null ? null : Math.round(ringRect.top),
        ringRight: ringRect === null ? null : Math.round(ringRect.right),
        ringLeft: ringRect === null ? null : Math.round(ringRect.left),
        window: { width: innerWidth, height: innerHeight },
        zoom: Number.parseFloat(getComputedStyle(document.body).zoom) || 1,
      })
      if (performance.now() - started < 1600) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [CONTEXT_PANEL, METER_RING])
  await action()
  await page.waitForTimeout(1700)
  return page.evaluate(([panelMark, placedMark]) => {
    const frames = window.__panelFrames ?? []
    const painted = frames.filter((frame) => frame.painted)
    const panel = document.querySelector(`[${panelMark}]`)
    const rect = panel === null ? null : panel.getBoundingClientRect()
    return {
      painted: painted.length,
      first: painted[0] ?? null,
      settled: painted[painted.length - 1] ?? null,
      cornerFrames: painted.filter((frame) => frame.left <= 13 && frame.top <= 13).length,
      belowRingFrames: painted.filter((frame) => frame.bottom > frame.ringTop + 1).length,
      outsideWindowFrames: painted.filter((frame) => frame.left < 0 || frame.top < 0 ||
        frame.right > frame.window.width + 1 || frame.bottom > frame.window.height + 1).length,
      placed: panel !== null && panel.hasAttribute(placedMark),
      panel: rect === null ? null : {
        left: Math.round(rect.left * 10) / 10,
        top: Math.round(rect.top * 10) / 10,
        right: Math.round(rect.right * 10) / 10,
        bottom: Math.round(rect.bottom * 10) / 10,
      },
    }
  }, [CONTEXT_PANEL, CONTEXT_PANEL_PLACED])
}

/** Press the ring, the way a reader does: the pointer arrives, then the press. */
const pressSelector = async (page, target, pause = 250) => {
  const centre = await page.evaluate((selectorToPress) => {
    const node = document.querySelector(selectorToPress)
    if (node === null) return null
    const rect = node.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }, target)
  if (centre === null) return false
  await page.mouse.move(centre.x - 40, centre.y - 60)
  await page.waitForTimeout(120)
  await page.mouse.move(centre.x, centre.y)
  await page.waitForTimeout(pause)
  await page.mouse.down()
  await page.mouse.up()
  return true
}

/**
 * The context popover at a page zoom: the page is put at the factor the
 * preference mirror writes onto <body> (the stylesheet draws the page at that
 * attribute, and the skin's geometry reads it back — shared/page-zoom.ts), the
 * popover is opened from the ring, and the frames are read.
 *
 * The host places the panel from its own trigger's box, which is a node with no
 * box here; the skin reads the ring and the window in the panel's own pixels
 * and places it there.
 */
const readPopoverAtZoom = async (page, zoom) => {
  await page.evaluate(([attribute, value]) => document.body.setAttribute(attribute, value), [PAGE_ZOOM, zoom])
  await page.waitForTimeout(700)
  const frames = await readPanelFrames(page, () => pressSelector(page, `${METER_RING} button`))
  const gap = frames.settled === null ? null : (frames.settled.ringTop - frames.settled.bottom) / frames.settled.zoom
  await pressSelector(page, `${METER_RING} button`)
  await page.evaluate((attribute) => document.body.removeAttribute(attribute), PAGE_ZOOM)
  await page.waitForTimeout(700)
  return { ...frames, gap }
}

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
        (ringSelector) => document.querySelector(ringSelector) !== null,
        METER_RING, { timeout: 20000 },
      ).catch(() => {})
      const resting = await readRow(page)
      // A press on the ring opens the panel; every frame it is painted in stands
      // over the ring, and none in the window's corner.
      const opened = await readPanelFrames(page, () => pressSelector(page, `${METER_RING} button`))
      // The same press again, with the panel standing open: the pointer is still
      // the one that opened it, so it stays up (shared/popover.ts::
      // pressKeepsPopoverOpen), exactly as the host's own meter answers.
      const kept = await page.evaluate(([ringSelector, panelMark]) => {
        const ring = document.querySelector(ringSelector)
        const before = document.querySelector(`[${panelMark}]`)
        const button = ring?.querySelector('button')
        button?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, isPrimary: true, button: 0 }))
        button?.click()
        return { same: document.querySelector(`[${panelMark}]`) === before, before: before !== null }
      }, [METER_RING, CONTEXT_PANEL])
      await page.waitForTimeout(500)
      const afterPress = await page.evaluate(([ringSelector, panelMark]) => ({
        open: document.querySelector(`[${panelMark}]`) !== null,
        expanded: document.querySelector(`${ringSelector} button`)?.getAttribute('aria-expanded') ?? null,
      }), [METER_RING, CONTEXT_PANEL])
      // The popover on the same real page, at the reader's page zoom.
      const popover = await readPopoverAtZoom(page, '1.25')
      const gap = opened.settled === null ? null : (opened.settled.ringTop - opened.settled.bottom) /
        (opened.settled.zoom === 0 ? 1 : opened.settled.zoom)
      return [
        check('the ring the skin draws stands in the row after the seat box, inside the card',
          resting.ring !== null && resting.seat !== null &&
            resting.ring.left >= resting.seat.right - 1 &&
            resting.ring.top >= resting.seat.top - 1 && resting.ring.bottom <= resting.seat.bottom + 1 &&
            resting.ring.right <= resting.card.right &&
            resting.cardScroll.scrollWidth - resting.cardScroll.clientWidth <= 1,
          JSON.stringify(resting)),
        check('the host\'s meter keeps the place the host rendered it in and paints nothing there',
          resting.meter !== null && resting.meterDisplay === 'none' && resting.meter.width === 0,
          JSON.stringify({ meter: resting.meter, display: resting.meterDisplay })),
        check('the ring says the host\'s own reading in the host\'s own words',
          resting.text !== null && resting.text === resting.hostText && resting.label === resting.hostLabel,
          JSON.stringify({ text: resting.text, host: resting.hostText, label: resting.label, hostLabel: resting.hostLabel })),
        check('a press on the ring opens the host\'s panel, and every frame it is painted in stands over the ring',
          opened.painted > 0 && opened.cornerFrames === 0 && opened.belowRingFrames === 0 &&
            opened.panel !== null && gap >= 7 && gap <= 9,
          JSON.stringify({ ...opened, gap })),
        check('no frame of the panel stands outside the window',
          opened.outsideWindowFrames === 0, JSON.stringify({ outside: opened.outsideWindowFrames })),
        check('a press with the panel standing open leaves it up, on the same panel the reader had',
          kept.before === true && kept.same === true && afterPress.open === true && afterPress.expanded === 'true',
          JSON.stringify({ ...kept, ...afterPress })),
        check('页面缩放到 125% 时，上下文弹层仍贴在计量圆环上方并留在窗口内',
          popover.painted > 0 && popover.placed && popover.cornerFrames === 0 && popover.belowRingFrames === 0 &&
            popover.gap !== null && popover.gap >= 7 && popover.gap <= 9 && popover.outsideWindowFrames === 0,
          JSON.stringify({ painted: popover.painted, placed: popover.placed, gap: popover.gap, corner: popover.cornerFrames, below: popover.belowRingFrames, settled: popover.settled })),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { statsOverlayScenario }
