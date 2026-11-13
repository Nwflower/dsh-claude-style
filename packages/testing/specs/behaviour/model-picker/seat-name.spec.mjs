/**
 * The model's name swaps in place when the reader picks another model: the words
 * they left rise through a blur while the picked model's name comes up from
 * below, both standing in the seat box at once (shared/swapping-text.ts) — the
 * motion the wait line's own words take. Both names hold the seat's right edge
 * while the box travels between their widths, so neither slides sideways.
 *
 * @capability model-picker
 * @features model
 * @risk A model picked from the list lands on the seat in silence — the name changes between two frames with nothing showing which words left and which arrived — or the swap drags the names sideways while the seat's width travels.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { MODEL_SEAT_NAME } from '../../fixtures/model-seat.mjs'

/** The host's model button: the reader finds it by its name, the model's. */
const modelButton = (page) => page.getByRole('button', { name: MODEL_SEAT_NAME })

/**
 * Watch the seat's name while the next model lands: every frame's words, the
 * copies standing in the box, the box's own width, and where each copy's text
 * ends on the right. The recording ends once the swap has settled — both copies
 * were seen and one stands again — or at `capMs`, which is only the guard for a
 * swap that never settles; the press that starts the swap may take a frame or
 * more to reach the page, so a fixed window can end before the settle does.
 */
function watchName(t, capMs) {
  return t.page.evaluate(({ nameSelector, copySelector, duration }) => new Promise((resolve) => {
    const label = document.querySelector(nameSelector)
    const frames = []
    const until = performance.now() + duration
    let doubled = false
    let settledAt = null
    const tick = () => {
      const box = label.getBoundingClientRect()
      const copies = [...document.querySelectorAll(copySelector)].map((copy) => {
        const text = document.createRange()
        text.selectNodeContents(copy)
        return {
          words: (copy.textContent ?? '').trim(),
          right: text.getBoundingClientRect().right,
        }
      })
      frames.push({
        words: copies.map((copy) => copy.words),
        rights: copies.map((copy) => copy.right),
        standing: label.dataset.text ?? '',
        width: Math.round(box.width * 10) / 10,
        right: box.right,
      })
      const last = frames[frames.length - 1]
      if (last.words.length > 1) doubled = true
      // One copy alone is the swap's end; the box keeps the pinned width for the
      // slide it began with, then takes the arriving name's width. The recording
      // runs half a second past the settle so the travel between the two widths
      // is inside the frames either assertion reads.
      if (doubled && last.words.length === 1 && settledAt === null) settledAt = performance.now()
      if (settledAt !== null && performance.now() - settledAt > 500) return resolve(frames)
      if (performance.now() < until) requestAnimationFrame(tick)
      else resolve(frames)
    }
    requestAnimationFrame(tick)
  }), { nameSelector: t.surface('model.seat-name'), copySelector: t.surface('swap.copy'), duration: capMs })
}

export default spec({ page: 'effort' }, ({ test }) => {
  test('picking another model swaps the name in place', async (t) => {
    await modelButton(t.page).click()
    await t.settle()
    // The stand-in's other provider sits behind More models.
    await t.page.getByRole('menuitem', { name: 'More models' }).click()
    await t.settle()
    const rows = t.page.locator(t.surface('model.sub-row')).filter({ hasText: 'GLM-5.3' })
    const recording = watchName(t, 4000)
    await rows.first().click()
    const frames = await recording
    // Two copies stand in the box while the swap runs: the words that left and
    // the ones that arrived. The arrival ends alone, naming the picked model.
    const doubled = frames.filter((frame) => frame.words.length > 1 && new Set(frame.words).size > 1)
    t.expectThat.equal(doubled.length > 0, true, 'the leaving and arriving names stand in the box together')
    // In a seat whose right end is the fixed edge, both names hold it: the box
    // may travel between their widths, but neither name slides after it.
    const furthest = Math.max(...doubled.flatMap((frame) => frame.rights.map((right) => Math.abs(right - frame.right))))
    t.expectThat.equal(furthest <= 1, true, `both names hold the seat's right edge while the box travels (furthest ${furthest.toFixed(1)}px off)`)
    t.expectThat.equal(frames[frames.length - 1].words.length, 1, `the box settles on one copy (${frames[frames.length - 1].words.join(' / ')})`)
    t.expectThat.equal(frames[frames.length - 1].standing.includes('GLM-5.3'), true, `the seat names the model picked (${frames[frames.length - 1].standing})`)
    const widths = new Set(frames.map((frame) => frame.width))
    t.expectThat.equal(widths.size > 1, true, 'the box travels from one name\'s width to the other')
  })
})
