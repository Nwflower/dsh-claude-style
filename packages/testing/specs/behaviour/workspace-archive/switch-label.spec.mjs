/**
 * The workspace view menu keeps the heading's text slot: the header padding
 * of the host carries the label in from the edge of the header, and the
 * trigger's words stand on the label's own edge and line, while its hover
 * plate grows around them without pushing them down and right (#378).
 *
 * @capability workspace-archive
 * @features workspace
 * @risk The trigger's words shift off the heading's edge and line, or the plate covers the sidebar padding eleven pixels left of the label it replaces.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { mountSection, readAlignment } from '../../fixtures/workspace-switch.mjs'

export default spec({ page: 'switches' }, ({ test }) => {
  test('the view menu keeps the heading\'s text slot', async t => {
    await mountSection(t)
    const reading = await readAlignment(t)
    t.expectThat.equal(reading && reading.offset, 11, 'the header padding carries the label in from the edge')
    t.expectThat.equal(reading && reading.delta, 0, 'the trigger\'s words stand on the heading\'s left edge')
    t.expectThat.equal(reading && reading.topDelta, 0, 'the trigger\'s words stand on the heading\'s own line')
  })
})
