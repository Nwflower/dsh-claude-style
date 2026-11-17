/**
 * The workspace view switch keeps the left edge of the heading: the header
 * padding of the host carries the label in from the edge of the header, and
 * the switch lays over the slot of the label, not over the padding beside it
 * (#378).
 *
 * @capability workspace-archive
 * @features workspace
 * @risk The switch covers the sidebar padding beside the heading, eleven pixels left of the label it replaces on hover.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { mountSection, readAlignment } from '../../fixtures/workspace-switch.mjs'

export default spec({ page: 'switches' }, ({ test }) => {
  test('the view switch keeps the left edge of the heading', async t => {
    await mountSection(t)
    const reading = await readAlignment(t)
    t.expectThat.equal(reading && reading.offset, 11, 'the header padding carries the label in from the edge')
    t.expectThat.equal(reading && reading.delta, 0, 'the left edge of the switch is the left edge of the label')
  })
})
