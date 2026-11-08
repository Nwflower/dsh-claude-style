/**
 * The composer's seat is one item in the row: the model's name and the effort
 * level share a box that stands against the row's right end and grows leftward,
 * and the context meter's ring stands after that box, in the row's own flow. A
 * level's name changing width moves the box's left end and leaves the edge both
 * cards hang from where it was; a card too narrow for the row shortens the
 * model's name before it takes the ring out of the card.
 *
 * @capability effort-picker
 * @features effort, model, context-stats, composer
 * @risk In a narrow window the ring covers the model's name or pushes the composer wider than the window, and the conversation grows a horizontal scrollbar.
 */
import { spec, surface } from '../../fixtures/behaviour.mjs'
import { boxOf } from '../../fixtures/boxes.mjs'
import { MODEL_SEAT_NAME } from '../../fixtures/model-seat.mjs'

/** The host's model button: the reader finds it by its name, the model's. */
const modelButton = (page) => page.getByRole('button', { name: MODEL_SEAT_NAME })
const PART = surface.attribute('skin.part')

// The geometry is judged at both pixel densities: a device pixel is what the
// row's slack is spent in, and a fractional edge rounds differently at 2x.
export default spec({ page: 'effort', bands: ['phone', 'compact', 'wide'], densities: [1, 2] }, ({ test }) => {
  test('the seat box holds the model\'s name and the level as one row item', async (t) => {
    const seat = await t.read.box(t.surface('model.seat'))
    const level = await t.read.box(t.surface('effort.trigger'))
    const model = await boxOf(modelButton(t.page))
    const card = await t.read.box(t.host('composer.card'))
    const row = await t.read.box(t.surface('composer.row'))
    t.expectThat.visible(seat, 'the seat box is drawn')
    t.expectThat.visible(level, 'the level is drawn')
    t.expectThat.boxesApart(level, model, 'the level does not cover the model name')
    t.expectThat.equal(model.right <= level.left + 1, true, `the model's name comes first (${model.right} against ${level.left})`)
    t.expectThat.boxWithin(seat, card, 'the seat stays inside the composer card')
    t.expectThat.equal(seat.right <= row.right + 1, true, `the seat ends inside the row (${seat.right} against ${row.right})`)
    t.expectThat.noHorizontalOverflow(await t.read.overflow(t.host('composer.card')), 'the composer card')
    t.expectThat.noHorizontalOverflow(await t.read.overflow(t.host('chat.scroller')), 'the conversation')
  })

  test('the meter\'s ring stands after the seat box, on the row\'s own line and inside the card', async (t) => {
    const seat = await t.read.box(t.surface('model.seat'))
    const ring = await t.read.box(t.surface('stats.meter-ring'))
    const card = await t.read.box(t.host('composer.card'))
    const row = await t.read.box(t.surface('composer.row'))
    t.expectThat.visible(ring, 'the ring is drawn')
    t.expectThat.equal(ring.left >= seat.right - 1, true, `the ring stands after the seat box (${ring.left} against ${seat.right})`)
    // One line: the ring's box sits inside the seat box's own band.
    t.expectThat.equal(ring.top >= seat.top - 1 && ring.bottom <= seat.bottom + 1, true,
      `the ring shares the seat box's line (ring ${ring.top}–${ring.bottom}, seat ${seat.top}–${seat.bottom})`)
    t.expectThat.equal(ring.right <= row.right + 1, true, `the ring ends inside the row (${ring.right} against ${row.right})`)
    t.expectThat.boxWithin(ring, card, 'the ring stays inside the composer card')
    t.expectThat.noHorizontalOverflow(await t.read.overflow(t.host('composer.card')), 'the composer card')
  })

  test('a stacked card gives the model name its own line without taking the ring out of the card', async (t) => {
    const card = t.host('composer.card')
    await t.page.evaluate((selector) => {
      const node = document.querySelector(selector)
      node.style.width = '320px'
    }, card)
    await t.settle()
    const narrow = await t.read.box(t.surface('model.seat'))
    const ring = await t.read.box(t.surface('stats.meter-ring'))
    const cardBox = await t.read.box(card)
    const row = await t.read.box(t.surface('composer.row'))
    const tools = await t.read.box(`[${PART}~="tools"]`)
    const layout = await t.read.attribute(card, t.surface.attribute('composer.responsive-layout'))
    t.expectThat.visible(narrow, 'the seat box is still drawn')
    t.expectThat.visible(ring, 'the ring is still drawn')
    t.expectThat.equal(layout, 'stacked', 'the narrowest card keeps its deliberately stacked layout')
    t.expectThat.equal(narrow.top >= tools.bottom - 1, true, `the seat stands on the stacked second line: ${JSON.stringify({ tools, seat: narrow, row })}`)
    t.expectThat.equal(ring.right <= cardBox.right + 1, true, `the ring stays inside the card (${ring.right} against ${cardBox.right})`)
    t.expectThat.noHorizontalOverflow(await t.read.overflow(card), 'the composer card')
    t.expectThat.noHorizontalOverflow(await t.read.overflow(t.host('chat.scroller')), 'the conversation')
  })

  test('compact and wide layouts shorten the model name without wrapping the toolbar', async (t) => {
    const card = t.host('composer.card')
    const widths = await t.page.evaluate(() => innerWidth < 600 ? [400] : [400, 600])
    for (const width of widths) {
      await t.page.evaluate(([selector, value]) => {
        document.querySelector(selector).style.width = `${value}px`
      }, [card, width])
      await t.settle()
      const state = await t.page.evaluate(([cardSelector, rowSelector, part, layoutMark, seatSelector, labelSelector]) => {
        const cardElement = document.querySelector(cardSelector)
        const row = cardElement.querySelector(rowSelector)
        const tools = row.querySelector(`[${part}~="tools"]`)
        const trailing = row.querySelector(`[${part}~="trailing"]`)
        const controls = row.querySelector(`[${part}~="composer-controls"]`)
        const seat = row.querySelector(seatSelector)
        const label = row.querySelector(labelSelector)
        const centre = element => {
          const box = element.getBoundingClientRect()
          return box.top + box.height / 2
        }
        return {
          layout: cardElement.getAttribute(layoutMark),
          rowWrap: getComputedStyle(row).flexWrap,
          trailingWrap: getComputedStyle(trailing).flexWrap,
          controlsWrap: controls === null ? null : getComputedStyle(controls).flexWrap,
          seatWrap: getComputedStyle(seat).flexWrap,
          toolsCentre: centre(tools),
          trailingCentre: centre(trailing),
          labelOverflow: getComputedStyle(label).textOverflow,
          labelWidth: label.clientWidth,
          labelContent: label.scrollWidth,
        }
      }, [card, t.surface('composer.row'), PART, t.surface.attribute('composer.responsive-layout'), t.surface('model.seat'), t.surface('model.seat-name')])
      t.expectThat.equal(state.layout, width < 440 ? 'compact' : 'wide', 'the card width chooses the intended toolbar layout')
      t.expectThat.equal(state.trailingWrap, 'nowrap', 'the trailing controls keep their own line')
      if (state.layout === 'compact') {
        t.expectThat.equal([state.rowWrap, state.seatWrap], ['nowrap', 'nowrap'], 'the compact toolbar and seat take the shortage from the model name')
        if (state.controlsWrap !== null) t.expectThat.equal(state.controlsWrap, 'nowrap', 'the compact grouped controls stay on the same line')
      }
      t.expectThat.equal(Math.abs(state.toolsCentre - state.trailingCentre) <= 1, true, `the left and right controls share one line: ${JSON.stringify(state)}`)
      if (width === 400) {
        t.expectThat.equal(state.labelOverflow, 'ellipsis', 'the model name ends in an ellipsis')
        t.expectThat.equal(state.labelContent > state.labelWidth, true, `the long model name is truncated: ${JSON.stringify(state)}`)
      }
      t.expectThat.noHorizontalOverflow(await t.read.overflow(card), 'the composer card')
      t.expectThat.noHorizontalOverflow(await t.read.overflow(t.host('chat.scroller')), 'the conversation')
    }
  })

  test('switching the picker off hands the seat back, and the ring keeps the row', async (t) => {
    await t.prefs({ modelPicker: false })
    t.expectThat.absent(await t.read.box(t.surface('model.seat')), 'the seat box')
    t.expectThat.absent(await t.read.box(t.surface('effort.trigger')), 'the level')
    // The ring answers the context reading, not the picker's switch: with no
    // seat box it closes the slot rather than handing the row back to the host's
    // own, wider meter (features/context-stats/meter-ring.ts, issue #162).
    const ring = await t.read.box(t.surface('stats.meter-ring'))
    const hostSeat = await boxOf(modelButton(t.page))
    t.expectThat.visible(ring, 'the ring')
    t.expectThat.visible(hostSeat, 'the host\'s own seat')
    const ringLine = Math.round((ring.top + ring.bottom) / 2)
    const seatLine = Math.round((hostSeat.top + hostSeat.bottom) / 2)
    t.expectThat.equal(Math.abs(ringLine - seatLine) <= 4, true, `the ring rides the row's own line (${ringLine} against ${seatLine})`)
    t.expectThat.noHorizontalOverflow(await t.read.overflow(t.host('chat.scroller')), 'the conversation')
  })

  test('opening the card leaves the seat and the level where they stand', async (t) => {
    const seatDown = await t.read.box(t.surface('model.seat'))
    const levelDown = await t.read.box(t.surface('effort.trigger'))
    await t.page.click(t.surface('effort.trigger'))
    await t.settle()
    const seatUp = await t.read.box(t.surface('model.seat'))
    const levelUp = await t.read.box(t.surface('effort.trigger'))
    t.expectThat.equal(Math.round(seatUp.left * 10), Math.round(seatDown.left * 10), `the box keeps its left end (${seatDown.left} → ${seatUp.left})`)
    t.expectThat.equal(Math.round(seatUp.right * 10), Math.round(seatDown.right * 10), `the box keeps its right end (${seatDown.right} → ${seatUp.right})`)
    t.expectThat.equal(Math.round(levelUp.width * 10), Math.round(levelDown.width * 10), `the level keeps its width (${levelDown.width} → ${levelUp.width})`)
  })
})
