/**
 * The host re-enumerates the whole model directory after every selection, and
 * for seconds its snapshot can carry no groups and no seat. The composer is
 * read through that window: the model's name, the level and the card stay on
 * what the reader was looking at, and the answer, when it lands, moves both
 * texts in the same pass.
 *
 * @capability model-picker
 * @features model, effort
 * @risk A selection makes the seat blank for seconds — the model's name drops to the placeholder, the level's trigger goes away with its open card, or the two updates land in different passes and the seat reads as two decisions that disagree.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { MODEL_SEAT_NAME, holdEcho } from '../../fixtures/model-seat.mjs'

/** The skin's model trigger: the reader finds it by the name it carries. */
const trigger = (page) => page.getByRole('button', { name: `Select model, currently ${MODEL_SEAT_NAME}` })

/**
 * Watch the seat for `duration`: every frame reads the model's standing name,
 * the level's words, whether the trigger is drawn, the seat box and the effort
 * card's box, and the press's own timestamp. The loop stops itself, so the
 * caller can press in between and then wait for `done`.
 */
async function watch(t, duration) {
  const selectors = {
    name: t.surface('model.seat-name'),
    level: t.surface('effort.trigger'),
    seat: t.surface('model.seat'),
    card: t.surface('effort.popover'),
  }
  await t.page.evaluate(({ duration, selectors }) => {
    const box = (element) => {
      if (element === null) return null
      const rect = element.getBoundingClientRect()
      return { left: Math.round(rect.left * 10) / 10, top: Math.round(rect.top * 10) / 10, right: Math.round(rect.right * 10) / 10, bottom: Math.round(rect.bottom * 10) / 10, width: Math.round(rect.width * 10) / 10 }
    }
    const started = performance.now()
    const seen = { frames: [], clickedAt: null, done: false }
    const pressed = () => { if (seen.clickedAt === null) seen.clickedAt = performance.now() - started }
    document.addEventListener('pointerdown', pressed, true)
    const read = () => {
      const name = document.querySelector(selectors.name)
      const level = document.querySelector(selectors.level)
      seen.frames.push({
        at: Math.round((performance.now() - started) * 10) / 10,
        name: name === null ? null : (name.dataset.text ?? name.textContent),
        level: level === null || level.firstElementChild === null ? null : level.firstElementChild.textContent,
        trigger: level !== null && level.isConnected,
        seat: box(document.querySelector(selectors.seat)),
        card: box(document.querySelector(selectors.card)),
      })
    }
    const tick = () => {
      read()
      if (performance.now() - started < duration) requestAnimationFrame(tick)
      else {
        document.removeEventListener('pointerdown', pressed, true)
        seen.done = true
      }
    }
    requestAnimationFrame(tick)
    window.__seatWatch = seen
  }, { duration, selectors })
  return async () => {
    await t.page.waitForFunction(() => window.__seatWatch !== undefined && window.__seatWatch.done, undefined, { timeout: 15000 })
    return t.page.evaluate(() => window.__seatWatch)
  }
}

/** The frames from the press up to (not including) the frame at `at`. */
const upTo = (frames, clickedAt, at) => frames.filter((frame) => frame.at >= clickedAt && frame.at < at)

export default spec({ page: 'effort' }, ({ test }) => {
  test('the model\'s name, the level and the open card hold through the host\'s re-enumeration', async (t) => {
    await t.page.click(t.surface('effort.trigger'))
    await t.settle()
    await holdEcho(t.page, 1200)
    const track = await t.read.box(t.surface('effort.track'))
    const finish = await watch(t, 1800)
    // The weakest stop: a level change the reader made under the window.
    await t.page.mouse.click(track.left + 2, track.top + track.height / 2)
    const { frames, clickedAt } = await finish()
    const startLevel = frames[0].level
    const changed = frames.findIndex((frame) => frame.at > clickedAt && frame.level !== startLevel)
    t.expectThat.equal(changed !== -1, true, 'the host\'s answer landed inside the recording')
    const window = upTo(frames, clickedAt, frames[changed].at)
    t.expectThat.equal(window.length > 3, true, `the window stands for frames, not one (${window.length})`)
    t.expectThat.equal(new Set(window.map((frame) => frame.name)).size, 1, `the model's name holds through the window (${[...new Set(window.map((frame) => frame.name))].join(' / ')})`)
    t.expectThat.equal(window[0].name, MODEL_SEAT_NAME, `the name in the window is the model in force (${window[0].name})`)
    t.expectThat.equal(new Set(frames.map((frame) => frame.trigger)).size, 1, 'the level\'s trigger is drawn in every frame')
    t.expectThat.equal(new Set(frames.map((frame) => frame.level)).size >= 2, true, `the level changed at the answer (${[...new Set(frames.map((frame) => frame.level))].join(' → ')})`)
    t.expectThat.equal(new Set(window.map((frame) => frame.seat === null ? null : frame.seat.width)).size, 1, `the seat box keeps its width through the window (${[...new Set(window.map((frame) => frame.seat === null ? null : frame.seat.width))].join(', ')})`)
    t.expectThat.equal(new Set(window.map((frame) => JSON.stringify(frame.card))).size, 1, 'the open card keeps its box through the window')
    t.expectThat.equal(window.every((frame) => frame.card !== null && frame.card.width > 0), true, 'the card stays drawn through the window')
  })

  test('the model\'s name and the level move in the same pass when the answer lands', async (t) => {
    await holdEcho(t.page, 1200)
    await trigger(t.page).click()
    await t.settle()
    await t.page.getByRole('menuitem', { name: 'More models' }).click()
    await t.settle()
    // The row answers to the display name the catalog gives it, not to the words
    // its label draws: a vendor's lockup stands where that name's own word was.
    const row = t.page.locator(t.surface('model.sub-card')).getByRole('menuitemradio', { name: 'GLM-5.3' })
    const finish = await watch(t, 1800)
    await row.click()
    const { frames, clickedAt } = await finish()
    const startName = frames[0].name
    const startLevel = frames[0].level
    const nameAt = frames.findIndex((frame) => frame.at > clickedAt && frame.name !== startName)
    const levelAt = frames.findIndex((frame) => frame.at > clickedAt && frame.level !== startLevel)
    t.expectThat.equal(nameAt !== -1 && levelAt !== -1, true, 'both texts moved after the press')
    t.expectThat.equal(nameAt, levelAt, `both texts changed in one frame (name ${nameAt}, level ${levelAt})`)
    const settled = frames[frames.length - 1]
    t.expectThat.equal(settled.name, 'GLM-5.3', `the seat names the model picked (${settled.name})`)
    t.expectThat.equal(settled.level, 'Low', `the level is the picked model's own (${settled.level})`)
  })
})
