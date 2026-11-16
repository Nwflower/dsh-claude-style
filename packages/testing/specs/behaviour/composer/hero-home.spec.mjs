/**
 * The home page keeps the workspace switch over its label and the model seat on
 * one line: the header carries the switch's positioning reference, and the hero
 * slot takes the external-control gate the picker's block styles (#371).
 *
 * @capability composer
 * @features composer,workspace,model
 * @risk The switch falls to the sidebar's middle, or the home model seat stacks into three lines and stretches the card.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { mountHeroHome, dropHeroHome, readHeroHome, readHeroGateLeft } from '../../fixtures/hero-home.mjs'

export default spec({ page: 'automode-hero' }, ({ test }) => {
  test('the workspace header keeps the view switch\'s positioning reference', async t => {
    await mountHeroHome(t)
    const reading = await readHeroHome(t)
    t.expectThat.equal({ header: reading.header, segments: reading.segments }, { header: 'relative', segments: 'absolute' }, 'the switch lays over the label inside the header, not over the sidebar root')
    await dropHeroHome(t)
  })

  test('the model pass marks the hero slot and the seat stays one line', async t => {
    await mountHeroHome(t)
    const reading = await readHeroHome(t)
    t.expectThat.equal(reading.gate, 'model-picker', 'the model pass marks the hero slot as an external seat')
    t.expectThat.equal(reading.seat, { display: 'flex', height: '28px' }, 'the marked seat lays out as one 28px line')
    await dropHeroHome(t)
    t.expectThat.equal(await readHeroGateLeft(t), false, 'the mark leaves with the slot')
  })
})
