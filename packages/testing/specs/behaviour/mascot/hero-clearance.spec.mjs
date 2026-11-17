/**
 * The hero context row keeps its right end clear of the mascot standing on the
 * card below it (#378): the row spans the whole stack while the card sits
 * inside the side clearance, and the widest character reaches 146px in from
 * the right edge of the card.
 *
 * @capability mascot
 * @features mascot,home
 * @risk The mascot covers the git branch and the worktree picker at the right end of the context row on the home page.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { mountRowControl, readClearance } from '../../fixtures/hero-clearance.mjs'

export default spec({ page: 'automode-hero' }, ({ test }) => {
  test('the context row keeps its right end clear of the standing mascot', async t => {
    await mountRowControl(t)
    const reading = await readClearance(t)
    t.expectThat.equal(reading && reading.standing, true, 'the hero stack carries the standing mark while the mascot is out')
    t.expectThat.equal(reading !== null && reading.pad >= 160, true, 'the row reserves the side clearance plus the widest character')
    t.expectThat.equal(reading !== null && reading.clear, true, 'the right-end control of the row stays clear of the mascot')
  })
})
