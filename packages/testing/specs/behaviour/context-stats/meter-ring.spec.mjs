/**
 * The context meter's ring, drawn by the skin in the composer row.
 *
 * The host's meter cannot leave the dock the host renders it in, so the skin
 * draws the ring itself, after the seat box, and leaves the host's node in place
 * with no paint: the press on the ring is handed to the host's trigger, and the
 * host's panel opens over the ring. The ring says the same reading the host's
 * meter says, except while the newest usage sample is a failed attempt's zero:
 * the reading a provider last reported stands until a real sample lands. The
 * reading falls in colour bands, drawn as a pie; the reader may keep the drawn
 * ring in that continuous band instead, or take the measured ring in three
 * bands, and may hide the number beside either face. On a phone-width card it
 * keeps the arc and gives up the number.
 *
 * @capability context-stats
 * @features context-stats
 * @risk The ring the skin draws disagrees with the host's own reading, or names itself differently to a screen reader, or opens the host's panel somewhere the reader cannot see it, or ignores the face and the number the reader picked, or blanks the reading because a failed attempt's zero sample displaced the last one.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { seatStreamingStatsSession } from '../../fixtures/stats-session.mjs'

/** The ring, its button, the host's meter and the host's own trigger, as the page holds them. */
const readRing = (t) => t.page.evaluate(([ringSelector, meterAttr, rampAttr, rampSpanAttr, pieAttr, bandAttr]) => {
  const ring = document.querySelector(ringSelector)
  const meter = document.querySelector(`[${meterAttr}]`)
  if (ring === null) return null
  const button = ring.querySelector('button')
  const value = button === null ? null : button.querySelector('span')
  const image = button === null ? null : getComputedStyle(button).backgroundImage
  const hostButton = meter === null ? null : meter.querySelector('button')
  return {
    text: (ring.textContent ?? '').trim(),
    dash: ring.querySelector('circle[stroke-dasharray]')?.getAttribute('stroke-dasharray') ?? null,
    hostText: (meter?.textContent ?? '').trim(),
    label: button?.getAttribute('aria-label') ?? null,
    hostLabel: hostButton?.getAttribute('aria-label') ?? null,
    haspopup: button?.getAttribute('aria-haspopup') ?? null,
    expanded: button?.getAttribute('aria-expanded') ?? null,
    meterDisplay: meter === null ? null : getComputedStyle(meter).display,
    ramped: ring.getAttribute(rampAttr),
    span: ring.getAttribute(rampSpanAttr),
    band: ring.getAttribute(bandAttr),
    pie: ring.hasAttribute(pieAttr),
    svg: ring.querySelector('svg'),
    svgVisibility: ring.querySelector('svg') === null ? null : getComputedStyle(ring.querySelector('svg')).visibility,
    tone: value === null ? null : getComputedStyle(value).color,
    image: image === null || image === 'none' ? null : decodeURIComponent(image),
    valueShown: value !== null && value.getClientRects().length > 0,
    ringBox: ring.getBoundingClientRect().width > 0 && ring.getBoundingClientRect().height > 0,
  }
}, [
  t.surface('stats.meter-ring'),
  t.surface.attribute('stats.context-meter'),
  t.surface.attribute('stats.ramp'),
  t.surface.attribute('stats.ramp-span'),
  t.surface.attribute('stats.meter-pie'),
  t.surface.attribute('stats.context-band'),
])

export default spec({ page: 'context-stats', bands: ['phone', 'wide'] }, ({ test }) => {
  test('the ring stands in the row with the host\'s own reading and the host\'s own words', async (t) => {
    const reading = await readRing(t)
    t.expectThat.visible(await t.read.box(t.surface('stats.meter-ring')), 'the ring is drawn')
    t.expectThat.equal(reading.ringBox, true, 'the ring has a box')
    t.expectThat.equal(reading.text, reading.hostText, `the ring says what the host's meter says (${reading.text} against ${reading.hostText})`)
    t.expectThat.equal(reading.label, reading.hostLabel, `the ring is named as the host's trigger is (${reading.label})`)
    t.expectThat.equal(reading.haspopup, 'dialog', 'the ring names the popover it opens')
    // The host's meter is behind the paint: it keeps the node the host rendered
    // it in, and draws nothing there.
    t.expectThat.equal(reading.meterDisplay, 'none', `the host's meter is unpainted (${reading.meterDisplay})`)
  })

  test('the ring draws the reading as a pie in the colour band it fell on', async (t) => {
    const reading = await readRing(t)
    t.expectThat.equal(reading.ramped, 'context', `the ring takes the occupancy's band (${reading.ramped})`)
    t.expectThat.equal(reading.span !== null && reading.span !== '', true, `the band names its segment (${reading.span})`)
    t.expectThat.equal(reading.pie, true, 'the ring carries the pie mark')
    t.expectThat.equal(reading.svgVisibility, 'hidden', 'the ring\'s own circle stands down under the pie')
    t.expectThat.equal(reading.image !== null && reading.image.includes('data:image/svg+xml'), true, 'the plate is the image the feature drew')
    t.expectThat.equal(reading.tone !== null && reading.image !== null && reading.image.includes(`fill="${reading.tone}"`), true,
      `the plate is painted in the reading's own colour (${reading.tone})`)
  })

  test('the reader can keep the drawn ring in the continuous band instead of the pie', async (t) => {
    await t.prefs({ contextDisplay: 'ring-ramp' })
    const reading = await readRing(t)
    t.expectThat.equal(reading.pie, false, 'the ring carries no pie mark')
    t.expectThat.equal(reading.image, null, 'no plate image is painted')
    t.expectThat.equal(reading.svgVisibility, 'visible', `the ring's own circle stands (${reading.svgVisibility})`)
    t.expectThat.equal(reading.ramped, 'context', `the ring takes the occupancy's continuous band (${reading.ramped})`)
    t.expectThat.equal(reading.span !== null && reading.span !== '', true, `the band names its segment (${reading.span})`)
  })

  test('the pointer and the open panel paint nothing behind the ring', async (t) => {
    // The pointer's dwell opens the panel over the row, which would put the
    // panel's own paint between the reader and the cell; the plate is judged
    // with that path off, and the panel keeps its own tests.
    await t.prefs({ autoPopover: 'off' })
    const button = `${t.surface('stats.meter-ring')} button`
    const at = () => t.page.evaluate((selector) => {
      const cell = document.querySelector(selector)
      if (cell === null) return null
      const style = getComputedStyle(cell)
      return { paint: style.backgroundColor, image: style.backgroundImage, hovered: cell.matches(':hover') }
    }, button)
    const resting = await at()
    t.expectThat.equal(resting === null, false, 'the ring has a cell to hover')
    if (resting === null) return
    t.expectThat.equal(resting.paint, 'rgba(0, 0, 0, 0)', `the cell rests on the row's own paint (${resting.paint})`)
    await t.page.hover(button)
    await t.page.waitForTimeout(200)
    const hovered = await at()
    t.expectThat.equal(hovered === null ? null : hovered.hovered, true, 'the pointer stands on the cell')
    t.expectThat.equal(hovered === null ? null : hovered.paint, resting.paint, `the pointer paints no plate (${hovered === null ? null : hovered.paint})`)
    t.expectThat.equal(hovered === null ? null : hovered.image, resting.image, 'the reading keeps the face it had under the pointer')
  })

  test('the measured face takes the band its reading fell in, and the number follows the switch', async (t) => {
    await t.prefs({ contextDisplay: 'ring-band', contextNumbers: false })
    const reading = await readRing(t)
    t.expectThat.equal(reading.band, 'yellow', `84 % falls in the yellow band (${reading.band})`)
    t.expectThat.equal(reading.ramped, null, 'the continuous band is taken off')
    const paint = await t.page.evaluate((ringSelector) => {
      const ring = document.querySelector(ringSelector)
      const arc = ring?.querySelector('circle[stroke-dasharray]') ?? null
      const track = ring === null || ring === undefined
        ? null
        : [...ring.querySelectorAll('circle')].find((circle) => !circle.hasAttribute('stroke-dasharray')) ?? null
      const value = ring?.querySelector('button > span') ?? null
      return {
        stroke: arc === null ? null : getComputedStyle(arc).stroke,
        track: track === null ? null : getComputedStyle(track).stroke,
        width: arc === null ? null : getComputedStyle(arc).strokeWidth,
        ink: value === null ? null : getComputedStyle(value).color,
        shown: value !== null && value.getClientRects().length > 0,
      }
    }, t.surface('stats.meter-ring'))
    t.expectThat.equal(paint.stroke !== null && paint.stroke !== paint.track, true,
      `the arc takes the band's colour, apart from the plate (${paint.stroke} against ${paint.track})`)
    t.expectThat.equal(paint.ink !== null && paint.ink !== paint.track, true, `the number takes the band's ink (${paint.ink})`)
    t.expectThat.equal(paint.width, '2.2px', `the measured face keeps its heavier stroke (${paint.width})`)
    t.expectThat.equal(paint.shown, false, 'the number is given up while the switch is off')
    await t.prefs({ contextNumbers: true })
    // A phone-width card gives the number up whatever the switch says (the
    // card's own room rule, meter-ring.css).
    const narrow = await t.page.evaluate(() => innerWidth <= 480)
    t.expectThat.equal((await readRing(t)).valueShown, !narrow,
      narrow ? 'the phone-width card keeps the number away' : 'the number comes back with the switch')
  })

  test('a press on the ring opens the host\'s panel, and the pointer leaving the ring closes it', async (t) => {
    const panel = `[${t.surface.attribute('stats.context-panel')}]`
    const ring = `${t.surface('stats.meter-ring')} button`
    await t.page.locator(ring).click()
    await t.page.locator(panel).waitFor({ state: 'visible' })
    t.expectThat.equal((await readRing(t)).expanded, 'true', 'the ring says the panel is open')
    // The dwell opened it and the press keeps it: the leave is the way out, as
    // it is for the host's own meter (shared/popover.ts::pressKeepsPopoverOpen).
    await t.page.mouse.move(4, 4)
    await t.page.waitForTimeout(600)
    t.expectThat.absent(await t.read.count(panel), 'the panel is closed')
    t.expectThat.equal((await readRing(t)).expanded, 'false', 'the ring says the panel is shut')
  })

  test('with the hover path off, a press on the ring opens the panel and a second press closes it', async (t) => {
    await t.prefs({ autoPopover: 'off' })
    const panel = `[${t.surface.attribute('stats.context-panel')}]`
    const ring = `${t.surface('stats.meter-ring')} button`
    await t.page.locator(ring).click()
    await t.page.locator(panel).waitFor({ state: 'visible' })
    t.expectThat.equal((await readRing(t)).expanded, 'true', 'the press opens the panel')
    await t.page.waitForTimeout(300)
    await t.page.locator(ring).click()
    await t.page.waitForTimeout(400)
    t.expectThat.absent(await t.read.count(panel), 'the second press closes the panel')
    t.expectThat.equal((await readRing(t)).expanded, 'false', 'the ring says the panel is shut')
  })

  test('the number beside the ring is drawn while the card has room, and given up on a phone-width card', async (t) => {
    const reading = await readRing(t)
    const narrow = await t.page.evaluate(() => innerWidth <= 480)
    t.expectThat.equal(reading.valueShown, !narrow,
      narrow ? 'the number is given up on a phone-width card' : `the number is drawn beside the arc (${reading.text})`)
    t.expectThat.visible(await t.read.box(t.surface('stats.meter-ring')), 'the ring stands at both widths')
  })

  test('a failed attempt\'s zero sample leaves the last reading standing', async (t) => {
    await seatStreamingStatsSession(t)
    // The ring's own words stay readable when the phone-width card gives the
    // span up, and the arc carries the reading at every width.
    await t.page.evaluate(() => window.__pushStats('contextPressure', { pressureTokens: 200000, projectedTokens: 200000, contextWindow: 1000000 }))
    await t.page.evaluate(() => window.__dshClaudePass())
    await t.settle()
    const sampled = await readRing(t)
    t.expectThat.equal(sampled.text, '20%', 'the ring answers the provider\'s sample')
    // A request that never reached the provider reports a zero prompt-side
    // sample: the host's projection takes it as the newest one and re-anchors
    // projectedTokens to that zero, which a meter would read as an empty window.
    await t.page.evaluate(() => window.__pushStats('contextPressure', { pressureTokens: 0, projectedTokens: 0 }))
    await t.page.evaluate(() => window.__dshClaudePass())
    await t.settle()
    const failed = await readRing(t)
    t.expectThat.equal(failed.text, '20%', 'the failed attempt keeps the reading it displaced')
    t.expectThat.equal(failed.dash, sampled.dash, `the arc still covers the reading (${failed.dash})`)
  })
})
