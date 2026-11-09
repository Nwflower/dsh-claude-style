/**
 * A docked conversation's context meter opens its own panel above itself: each
 * card the restyle covers draws a ring in its own toolbar row, and the panel a
 * ring opens belongs over that ring. The card's host meter, drawn in the dock
 * line under the card, stays out of the paint.
 *
 * @capability context-stats
 * @features context-stats
 * @risk Pressing the meter in a sub-agent's sidebar opens the panel over the main conversation's ring, or the sub-agent's reading drops onto a line under its card, so the sub-agent's own context figures cannot be read beside its row.
 */
import { host, spec, surface } from '../../fixtures/behaviour.mjs'
import { mountDockedComposer, METER_PANEL_HTML, METER_TRIGGER_HTML } from '../../fixtures/docked-composer.mjs'

const SIDEBAR_CHAT = host('sidebar.chat')
const SESSION_ATTRIBUTE = host('conversation.session-attribute')
const COMPOSER_CARD = host('composer.card')
const METER = surface.attribute('stats.context-meter')
const PANEL = surface.attribute('stats.context-panel')
const PLACED = surface.attribute('stats.context-panel-placed')
const PART = surface.attribute('skin.part')
const RING = surface('stats.meter-ring')
const PHASE = host('shell.phase')
const VARIANT = host('composer.variant')

/** Pin the stand-in's composer at the window's bottom, the way the host keeps it, so a panel placed above the wrong anchor is caught. */
async function seatMainComposer(t) {
  await t.page.evaluate((card) => {
    const stack = document.querySelector(card).parentElement
    Object.assign(stack.style, { position: 'fixed', left: '8px', right: '8px', bottom: '8px' })
  }, COMPOSER_CARD)
  await t.settle()
}

/**
 * Gives the docked meter its host behaviour: a press opens a dialog above the
 * trigger by the host's own gap, portaled to <body> and clamped into the window.
 * The stand-in's own button is pressed: the skin's ring forwards the press to it.
 */
async function openDockedMeter(t) {
  await t.page.waitForFunction(([sidebar, attribute]) => document.querySelector(sidebar + ' [' + attribute + ']') !== null,
    [SIDEBAR_CHAT, METER], { timeout: 5000 })
  await t.page.evaluate((config) => {
    const trigger = document.querySelector(config.meter + ' button')
    let panel = null
    const place = () => {
      if (panel === null) return
      const row = trigger.getBoundingClientRect()
      const width = panel.offsetWidth
      const height = panel.offsetHeight
      let left = row.left
      let top = row.top - 8 - height
      if (width > 0) left = Math.min(Math.max(left, 12), window.innerWidth - width - 12)
      if (height > 0) top = Math.min(Math.max(top, 12), window.innerHeight - height - 12)
      panel.style.left = Math.round(left) + 'px'
      panel.style.top = Math.round(top) + 'px'
    }
    trigger.addEventListener('click', () => {
      if (panel !== null) {
        if (panel.parentElement) panel.parentElement.removeChild(panel)
        panel = null
        trigger.setAttribute('aria-expanded', 'false')
        return
      }
      trigger.setAttribute('aria-expanded', 'true')
      panel = document.createElement('div')
      panel.setAttribute('role', 'dialog')
      panel.setAttribute('aria-label', '上下文已用')
      panel.innerHTML = config.html
      Object.assign(panel.style, { position: 'fixed', boxSizing: 'border-box', width: 'max-content', minWidth: '300px', maxWidth: '440px' })
      document.body.appendChild(panel)
      place()
      if (typeof ResizeObserver === 'function') new ResizeObserver(() => requestAnimationFrame(place)).observe(panel)
    })
  }, { meter: SIDEBAR_CHAT + ' [' + METER + ']', html: METER_PANEL_HTML })
}

/** The docked card, its toolbar row drawn the way the host draws it, with the model slot the ring stands in. */
const dockedParts = [{
  tag: 'div',
  style: { display: 'flex', justifyContent: 'space-between' },
  html: `
    <span style="display:inline-flex;gap:8px">
      <button type="button">自动审查</button><button type="button">+</button>
    </span>
    <span class="AbC34_trailing" style="display:inline-flex;gap:8px">
      <button type="button">kimi-k3.1-pro · Volcengine Ark</button>
      <button type="button">High</button>
    </span>
    <span data-slot="conversation.input.model" style="display:contents">
      <button type="button">Sub-agent model</button>
    </span>`,
}]

/** Reads the two cards' variants and what the docked one draws, the reading both hero tests need to tell which card the phase marker reached. */
async function readDockedState(t) {
  return t.page.evaluate((config) => {
    const sidebar = document.querySelector(config.sidebar)
    const cards = [...document.querySelectorAll(config.card)]
    const main = cards.find(card => card.closest(config.sidebar) === null) ?? null
    const dockedCard = sidebar === null ? null : sidebar.querySelector(config.card)
    const meter = sidebar === null ? null : sidebar.querySelector('[' + config.meter + ']')
    return {
      pageVariant: main === null ? null : main.getAttribute(config.variant),
      dockedVariant: dockedCard === null ? null : dockedCard.getAttribute(config.variant),
      dockedRings: sidebar === null ? 0 : sidebar.querySelectorAll(config.ring).length,
      dockedMeter: meter === null ? null : getComputedStyle(meter).display,
      rings: document.querySelectorAll(config.ring).length,
    }
  }, { card: COMPOSER_CARD, sidebar: SIDEBAR_CHAT, variant: VARIANT, meter: METER, ring: RING })
}

/** The docked conversation every test here mounts: one card in a sidebar column, with the meter's trigger in its dock line. */
const dockedOptions = {
  style: { position: 'fixed', left: '24px', bottom: '200px', width: '360px', zIndex: '40' },
  cardStyle: { height: '72px' },
  sidebar: host.attributes('sidebar.chat'),
  session: [[SESSION_ATTRIBUTE, 'docked-subagent']],
  card: host.attributes('composer.card'),
  parts: dockedParts,
  dock: { html: METER_TRIGGER_HTML },
}

export default spec({ page: 'context-stats' }, ({ test }) => {
  test('a docked conversation\'s meter opens its own panel over itself', async (t) => {
    await seatMainComposer(t)
    t.expectThat.equal(await t.page.locator(RING).count(), 1, 'the main conversation carries the skin\'s ring')
    await mountDockedComposer(t, dockedOptions)
    // The docked card draws a ring of its own: every card the restyle covers has
    // one, and the statistics pass marks the card's own meter while binding it.
    await t.page.waitForFunction(([ring, sidebar, attribute]) => document.querySelectorAll(ring).length === 2 &&
      document.querySelector(sidebar + ' [' + attribute + ']') !== null,
      [RING, SIDEBAR_CHAT, METER], { timeout: 5000 })
    await openDockedMeter(t)
    await t.settle()

    const panelSelector = '[role="dialog"][' + PANEL + ']'
    await t.page.locator(SIDEBAR_CHAT + ' ' + RING + ' button').click()
    await t.page.locator(panelSelector).waitFor({ state: 'visible' })
    await t.page.waitForFunction(([selector, mark]) => document.querySelector(selector)?.hasAttribute(mark) === true,
      [panelSelector, PLACED], { timeout: 10000 })
    // The panel's entrance is an animation: its box settles a moment after it opens.
    await t.page.waitForTimeout(400)

    const reading = await t.page.evaluate((config) => {
      const box = (el) => {
        const r = el.getBoundingClientRect()
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }
      }
      const sidebar = document.querySelector(config.sidebar)
      const panel = document.querySelector(config.panel)
      const card = sidebar.querySelector(config.card)
      const ring = sidebar.querySelector(config.ring)
      const meter = sidebar.querySelector(config.meter)
      const row = card.querySelector(config.row)
      const mainRing = document.querySelector(config.ring)
      if (panel === null || card === null || ring === null || meter === null || mainRing === null) return null
      return {
        panel: box(panel),
        card: box(card),
        ring: box(ring),
        meter: { display: getComputedStyle(meter).display },
        row: row === null ? null : box(row),
        mainRing: box(mainRing),
        window: { width: innerWidth, height: innerHeight },
        zoom: Number.parseFloat(getComputedStyle(document.body).zoom) || 1,
      }
    }, {
      sidebar: SIDEBAR_CHAT,
      panel: panelSelector,
      card: COMPOSER_CARD,
      ring: RING,
      meter: SIDEBAR_CHAT + ' [' + METER + ']',
      row: '[' + PART + '~="row"]',
    })

    t.expectThat.visible(reading === null ? null : reading.panel, 'the context popover of the docked conversation is drawn')
    if (reading === null) return
    const gap = (reading.ring.top - reading.panel.bottom) / reading.zoom
    t.expectThat.equal(gap >= 7 && gap <= 9, true, 'the popover opens over the ring the reader pressed, ' + gap.toFixed(1) + 'px above it')
    t.expectThat.equal(reading.panel.bottom < reading.mainRing.top - 100, true,
      'the popover hangs from the docked ring, not from the main conversation\'s ring (panel bottom ' + Math.round(reading.panel.bottom) + ', ring top ' + Math.round(reading.mainRing.top) + ')')
    t.expectThat.equal(reading.ring.top >= reading.card.top && reading.ring.bottom <= reading.card.bottom + 1, true,
      'the docked ring stands inside the card, not in the dock line under it (ring ' + Math.round(reading.ring.top) + '–' + Math.round(reading.ring.bottom) + ', card ' + Math.round(reading.card.top) + '–' + Math.round(reading.card.bottom) + ')')
    t.expectThat.equal(reading.row === null ? false : reading.ring.top >= reading.row.top && reading.ring.bottom <= reading.row.bottom,
      true, 'the docked ring stands in the toolbar row with the model cluster')
    t.expectThat.equal(reading.meter.display, 'none', 'the docked card\'s host meter stays out of the paint')
    t.expectThat.boxWithin(reading.panel,
      { left: 0, top: 0, right: reading.window.width, bottom: reading.window.height, width: reading.window.width, height: reading.window.height },
      'the popover stays inside the window', 1)
  })

  test('a docked conversation stays inline when the page is in the hero phase', async (t) => {
    await seatMainComposer(t)
    await mountDockedComposer(t, { ...dockedOptions, heroRoot: { inside: false, attributes: [[PHASE, 'hero']] } })
    const docked = SIDEBAR_CHAT + ' ' + COMPOSER_CARD
    await t.page.waitForFunction(([selector, variant, phase]) => {
      const card = document.querySelector(selector)
      return card !== null && card.getAttribute(variant) === 'inline' &&
        document.querySelector('[' + phase + '="hero"]') !== null
    }, [docked, VARIANT, PHASE], { timeout: 5000 })
    await t.settle()

    const read = await readDockedState(t)

    t.expectThat.equal(read.pageVariant, 'hero', "the page's own card takes the hero variant")
    t.expectThat.equal(read.dockedVariant, 'inline', 'the docked card keeps the inline variant on a hero page')
    t.expectThat.equal(read.dockedRings, 1, 'the docked card draws its ring instead of leaving the host meter under it')
    t.expectThat.equal(read.dockedMeter, 'none', "the docked card's host meter stays out of the paint")
  })

  test('a blank docked session does not turn the page into a hero page', async (t) => {
    await seatMainComposer(t)
    await mountDockedComposer(t, { ...dockedOptions, heroRoot: { inside: true, attributes: [[PHASE, 'hero']] } })
    await t.page.waitForFunction(([ring]) => document.querySelectorAll(ring).length === 2, [RING], { timeout: 5000 })

    const read = await readDockedState(t)

    t.expectThat.equal(read.pageVariant, 'inline', "the docked session's hero marker does not reach the page's card")
    t.expectThat.equal(read.dockedVariant, 'inline', 'the docked card keeps the inline variant')
    t.expectThat.equal(read.rings, 2, 'both cards keep their rings')
  })
})
