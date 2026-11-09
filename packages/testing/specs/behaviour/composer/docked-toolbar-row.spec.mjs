/**
 * A docked conversation's toolbar row lays out like the main card's: the
 * leading tools and the trailing model cluster share one line, with room to
 * spare.
 *
 * The sidebar chat is outside the part walk's regions, so the host's row
 * carries no part mark of its own — left alone it keeps the shipped wrapping
 * layout, and the model cluster drops onto a second line even when the row is
 * wide enough.
 *
 * @capability composer
 * @features composer
 * @risk The subagent's model selector wraps onto its own line, doubling the toolbar's height.
 */
import { host, spec, surface } from '../../fixtures/behaviour.mjs'
import { mountDockedComposer } from '../../fixtures/docked-composer.mjs'

const SIDEBAR_CHAT = host('sidebar.chat')
const SESSION_ATTRIBUTE = host('conversation.session-attribute')
const MODEL_SLOT = host('composer.model-slot')
const PART = surface.attribute('skin.part')
const ROW = surface('composer.row')

/** The docked card, its toolbar row drawn the way the host draws it. */
async function mountDocked(t) {
  await mountDockedComposer(t, {
    style: { position: 'fixed', left: '24px', top: '360px', width: '480px', zIndex: '40' },
    sidebar: host.attributes('sidebar.chat'),
    session: [[SESSION_ATTRIBUTE, 'docked-subagent']],
    card: host.attributes('composer.card'),
    // The host's model slot lives inside the trailing cluster of the row.
    parts: [{
      tag: 'div',
      // The shipped row's own metrics come from the host's sheet, not inline
      // style: an inline flex-wrap would outrank the skin's toolbar rule.
      style: { display: 'flex', justifyContent: 'space-between' },
      html: `
        <span style="display:inline-flex;gap:8px">
          <button type="button">自动审查</button><button type="button">+</button>
        </span>
        <span class="AbC34_trailing" style="display:inline-flex;gap:8px">
          <button type="button">kimi-k3.1-pro · Volcengine Ark</button>
          <button type="button">High</button>
        </span>
        <span data-slot="conversation.input.model" style="display:contents">
          <button type="button">Sub-agent model</button>
        </span>`,
    }],
  })
}

export default spec({ page: 'automode' }, ({ test }) => {
  test('the docked toolbar row keeps the model cluster on one line', async (t) => {
    await mountDocked(t)
    await t.settle()

    const row = t.page.locator(SIDEBAR_CHAT + ' [' + PART + '~="row"]').first()
    await row.waitFor({ state: 'attached' })
    await t.page.waitForTimeout(200)

    const read = () => t.page.evaluate(([sidebarSel, slotSel, rowSel]) => {
      const sidebar = document.querySelector(sidebarSel)
      const marked = sidebar.querySelector(rowSel)
      const trailing = sidebar.querySelector('[class$="_trailing"]')
      const leading = trailing?.previousElementSibling
      const box = (el) => {
        const r = el.getBoundingClientRect()
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }
      }
      const cs = getComputedStyle(marked)
      return {
        flexWrap: cs.flexWrap,
        row: box(marked),
        leading: box(leading),
        trailing: box(trailing),
        hasSlot: marked.contains(sidebar.querySelector(slotSel)),
      }
    }, [SIDEBAR_CHAT, MODEL_SLOT, ROW])

    const after = await read()
    t.expectThat.equal(after.flexWrap, 'nowrap', "the docked row takes the skin's toolbar layout")
    t.expectThat.equal(after.hasSlot, true, 'the marked row is the one carrying the model slot')
    // One line: the clusters are centred in the row, so their centres agree; a
    // wrapped cluster centres a line lower, and tops differ because the host's
    // buttons are taller than the 28px row.
    const centre = (box) => Math.round(box.top + box.height / 2)
    t.expectThat.equal(centre(after.leading), centre(after.trailing), 'tools and model cluster centre on the same line')
    t.expectThat.equal(centre(after.trailing), centre(after.row), 'the model cluster centres on the row')
    t.expectThat.equal(after.row.height, 28, 'the row stays one line tall')
  })
})
