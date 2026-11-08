/**
 * @capability composer
 * @features composer
 * @risk A gap stop leaves the host's own room under the conversation's composer, or the default stop writes over it.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { hostRoom, mountConversation } from '../../fixtures/host-frame.mjs'

/** The room between the card's bottom edge and the host's bar around it. */
async function gap(t) {
  return t.page.evaluate((cardSelector) => {
    const card = document.querySelector(cardSelector)
    return Math.round(card.parentElement.getBoundingClientRect().bottom - card.getBoundingClientRect().bottom)
  }, t.host('composer.card'))
}

export default spec({ page: 'composer' }, ({ test }) => {
  test('each gap stop sets the room under the conversation composer, and the default keeps the host’s', async t => {
    await mountConversation(t)
    const host = hostRoom()
    t.expectThat.equal(await gap(t), host, 'the default stop keeps the host’s own room')
    await t.prefs({ composerBottomGap: 'compact' })
    t.expectThat.equal(await t.read.attribute('body', t.surface.attribute('composer.bottom-gap')), 'compact', 'the compact stop reaches the page')
    t.expectThat.equal(await gap(t), 0, 'the compact stop takes the room away')
    await t.prefs({ composerBottomGap: 'roomy' })
    t.expectThat.equal(await gap(t), 16, 'the roomy stop widens the room')
    await t.prefs({ composerBottomGap: 'theme' })
    t.expectThat.equal(await gap(t), host, 'going back to the default hands the room back to the host')
  })

  test('a gap stop waits while the restyle leaves the conversation alone', async t => {
    await mountConversation(t)
    const host = hostRoom()
    await t.prefs({ composerBottomGap: 'roomy', composerScope: 'hero' })
    t.expectThat.equal(await gap(t), host, 'the host’s room stands under a composer the skin does not restyle')
    await t.prefs({ composerScope: 'all' })
    t.expectThat.equal(await gap(t), 16, 'the stop applies once the restyle covers the conversation again')
  })
})
