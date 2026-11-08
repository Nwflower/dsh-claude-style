/**
 * The composer row's two ends put their ink the same distance from the card's
 * inner edge (issue #272): the permission control's word on the left, the
 * context reading on the right, and the ring itself when the reader keeps the
 * numbers off. The row states one padding for both ends, so a control that adds
 * its own on one side leaves the line looking short of that side, and the gap
 * moves again when the reading's number comes and goes.
 *
 * @capability context-stats
 * @features context-stats, composer
 * @risk The composer's bottom line reads as pushed to one side, and shifts as the
 *   context reading's number appears or is hidden.
 */
import { host, spec, surface } from '../../fixtures/behaviour.mjs'

const PART = surface.attribute('skin.part')
const ROW = `[${PART}~="row"]`
const RING = surface('stats.meter-ring')
const ACCESS = host('composer.access-slot')

/** The row's two ends as the reader measures them: the ink, not the control's own box. */
const readEnds = (t) => t.page.evaluate(([rowSelector, accessSelector, ringSelector]) => {
  const row = document.querySelector(rowSelector)
  const permission = document.querySelector(accessSelector)
  const ring = document.querySelector(ringSelector)
  const drawn = ring === null ? null : (ring.querySelector('circle[stroke-dasharray]') ?? ring.querySelector('circle'))
  const value = ring === null ? null : ring.querySelector('button > span')
  if (row === null || permission === null || drawn === null) return null
  const rowBox = row.getBoundingClientRect()
  const ink = (node) => {
    const range = document.createRange()
    range.selectNodeContents(node)
    const box = range.getBoundingClientRect()
    return box.width === 0 ? null : box
  }
  const word = ink(permission)
  const number = value === null || value.getClientRects().length === 0 ? null : ink(value)
  const arc = drawn.getBoundingClientRect()
  const far = number ?? (arc.width === 0 ? null : arc)
  if (word === null || far === null) return null
  return {
    left: Math.round(word.left - rowBox.left),
    right: Math.round(rowBox.right - far.right),
  }
}, [ROW, ACCESS, RING])

export default spec({ page: 'context-stats', bands: ['wide'] }, ({ test }) => {
  test('the row puts its left word and its right reading the same distance from the card edge', async (t) => {
    const numbered = await readEnds(t)
    t.expectThat.equal(numbered !== null, true, 'the row has both ends to measure')
    t.expectThat.equal(Math.abs(numbered.left - numbered.right) <= 2, true, `the two ends share one ink margin: ${JSON.stringify(numbered)}`)

    await t.prefs({ contextNumbers: false })
    const ringOnly = await readEnds(t)
    t.expectThat.equal(ringOnly !== null, true, 'the ring stands alone with the numbers off')
    t.expectThat.equal(Math.abs(ringOnly.left - ringOnly.right) <= 2, true, `the ring keeps that margin: ${JSON.stringify(ringOnly)}`)
    t.expectThat.equal(Math.abs(ringOnly.right - numbered.right) <= 2, true, `hiding the number does not move the line's right edge: ${JSON.stringify({ numbered, ringOnly })}`)
  })
})
