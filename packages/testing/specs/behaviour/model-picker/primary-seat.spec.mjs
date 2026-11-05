/**
 * The model seat stays in the main conversation's composer.
 *
 * A sub-agent's sidebar mounts a composer card of its own, with the host's model
 * slot in it. The skin's seat stands in one card only — the shell the reader
 * types in — whichever card the host mounted first.
 *
 * @capability model-picker
 * @features model
 * @risk A docked conversation standing earlier in the document takes the skin's model seat, so the main composer loses its model selector, and the sidebar's menu drives the main session or nothing at all.
 */
import { host, spec, surface } from '../../fixtures/behaviour.mjs'
import { mountDockedComposer } from '../../fixtures/docked-composer.mjs'

const SIDEBAR_CHAT = host('sidebar.chat')
const SESSION_ATTRIBUTE = host('conversation.session-attribute')
const COMPOSER_CARD = host('composer.card')
const SEAT = surface('model.seat')
/** The host's model slot, the one node the seat is appended beside (contracts' composer.model-slot). */
const MODEL_SLOT = host('composer.model-slot')

/** Where every seat on the page stands, and whether the docked card comes first. */
function readSeats(t) {
  return t.page.evaluate(([sidebarSel, cardSel, slotSel, seatSel]) => {
    const sidebar = document.querySelector(sidebarSel)
    const cards = [...document.querySelectorAll(cardSel)]
    const mainCard = cards.find((card) => !card.closest(sidebarSel)) ?? null
    const seats = [...document.querySelectorAll(seatSel)]
    const dockedSlot = sidebar === null ? null : sidebar.querySelector(slotSel)
    return {
      cards: cards.length,
      total: seats.length,
      inMain: mainCard === null ? 0 : seats.filter((seat) => mainCard.contains(seat)).length,
      inSidebar: sidebar === null ? 0 : seats.filter((seat) => sidebar.contains(seat)).length,
      dockedSlotFirst: dockedSlot !== null && mainCard !== null
        && (dockedSlot.compareDocumentPosition(mainCard) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
    }
  }, [SIDEBAR_CHAT, COMPOSER_CARD, MODEL_SLOT, SEAT])
}

/**
 * The docked conversation as the host mounts it, before the main card in the
 * document: a sidebar chat column with an embedded conversation whose composer
 * carries the host's model slot and its own unser-marked trigger.
 */
async function mountDockedConversation(t) {
  await mountDockedComposer(t, {
    style: { position: 'fixed', left: '24px', top: '360px', width: '360px', zIndex: '40' },
    prepend: true,
    cardStyle: { height: '72px' },
    sidebar: host.attributes('sidebar.chat'),
    session: [[SESSION_ATTRIBUTE, 'docked-subagent']],
    card: host.attributes('composer.card'),
    parts: [{
      attributes: host.attributes('composer.model-slot'),
      style: { display: 'contents' },
      html: '<button type="button">Sub-agent model</button>',
    }],
  })
}

export default spec({ page: 'context-stats' }, ({ test }) => {
  test('a docked conversation mounted before the main card does not take the model seat', async (t) => {
    await t.page.locator(SEAT).first().waitFor({ state: 'visible' })
    await t.settle()
    const before = await readSeats(t)
    t.expectThat.equal(before.total, 1, 'the page carries one model seat to begin with')
    t.expectThat.equal(before.inMain, 1, 'the seat stands in the main conversation\'s card')

    await mountDockedConversation(t)
    await t.settle()
    await t.page.waitForTimeout(300)

    const after = await readSeats(t)
    t.expectThat.equal(after.cards, 2, 'the page now carries the docked composer as a second card')
    t.expectThat.equal(after.dockedSlotFirst, true, 'the docked conversation comes before the main card in the document')
    t.expectThat.equal(after.total, 1, 'the skin still draws one model seat')
    t.expectThat.equal(after.inMain, 1, 'the model seat stays in the main conversation\'s composer')
    t.expectThat.equal(after.inSidebar, 0, 'the docked conversation takes no model seat of its own')
    t.expectThat.visible(await t.read.box(SEAT), 'the main composer\'s model seat is still drawn')
  })
})