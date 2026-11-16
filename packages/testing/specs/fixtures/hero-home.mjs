/**
 * The home page's own pieces the stand-in does not draw: the sidebar workspace
 * header and a model slot inside the hero card, in the host's shapes, so the
 * skin's passes meet them where the real host puts them.
 */
export async function mountHeroHome(t) {
  await t.page.evaluate(() => {
    const header = document.createElement('header')
    header.setAttribute('data-sidebar-workspace-header', '')
    const segments = document.createElement('div')
    segments.className = 'dsh-claude-ws-segments'
    header.append(segments)
    document.body.append(header)
    const card = document.querySelector('[data-composer-card][data-composer-variant="hero"]')
    const slot = document.createElement('div')
    slot.setAttribute('data-slot', 'conversation.input.model')
    card.append(slot)
    window.__heroHome = { header, segments, slot, card }
  })
  await t.settle()
}

/** The header's reference, the gate the model pass wrote, and the seat's layout, in one reading. */
export function readHeroHome(t) {
  return t.page.evaluate(() => {
    const home = window.__heroHome
    const seat = home.slot.querySelector('.dsh-claude-model-seat')
    return {
      header: getComputedStyle(home.header).position,
      segments: getComputedStyle(home.segments).position,
      gate: home.slot.getAttribute('data-dsh-claude-external-control'),
      seat: seat === null ? null : { display: getComputedStyle(seat).display, height: getComputedStyle(seat).height },
    }
  })
}

/** Whether any hero slot still carries the gate after the pieces left. */
export function readHeroGateLeft(t) {
  return t.page.evaluate(() => document.querySelector('[data-composer-variant="hero"] [data-dsh-claude-external-control]') !== null)
}

export async function dropHeroHome(t) {
  await t.page.evaluate(() => {
    const home = window.__heroHome
    if (home === undefined) return
    home.header.remove()
    home.slot.remove()
    delete window.__heroHome
  })
  await t.settle()
}
