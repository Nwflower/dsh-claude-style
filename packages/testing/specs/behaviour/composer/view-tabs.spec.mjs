/**
 * The conversation's saved view id decides whether the inspection view stands
 * the composer down. Chat, reader and other content views keep it; a tablist in
 * an unrelated plugin still switches nothing.
 *
 * @capability composer
 * @features composer
 * @risk A reader-view session loses its whole input area because the skin infers the active view from the first tab's position.
 */
import { spec, host, surface } from '../../fixtures/behaviour.mjs'

const SEAT = host('composer.seat')
const PHASE = host('shell.phase')
const SESSION = host('conversation.session-attribute')
const VIEW_STORAGE = host('conversation.view-storage')
const HIDDEN = surface.attribute('composer.chat-hidden')
const INSPECTION_VIEWS = [
  host('conversation.view-trajectory'),
  host('conversation.view-context'),
  host('conversation.view-stats'),
]

const tablist = (attribute) => `<div role="tablist"${attribute === null ? '' : ` ${attribute}=""`}>` +
  '<button type="button" role="tab" aria-selected="false">first</button>' +
  '<button type="button" role="tab" aria-selected="true">second</button></div>'

function mountHome(t) {
  return t.page.evaluate(([seat, phase, menu]) => {
    const root = document.createElement('div')
    root.setAttribute(phase, 'hero')
    const seatBox = document.createElement('div')
    seatBox.setAttribute(seat.slice(1, -1), '')
    seatBox.style.height = '40px'
    seatBox.innerHTML = `<div role="menu">${menu}</div>`
    root.append(seatBox)
    document.body.append(root)
    window.__debugHome = { root, seat: seatBox }
  }, [SEAT, PHASE, tablist(null)])
}

function readHome(t) {
  return t.page.evaluate((hidden) => {
    const { root, seat } = window.__debugHome
    return { marked: root.hasAttribute(hidden), drawn: getComputedStyle(seat).display !== 'none' }
  }, HIDDEN)
}

function mountConversation(t, view) {
  return t.page.evaluate(([seat, phase, session, prefix, initial]) => {
    const id = 'composer-view-spec'
    localStorage.setItem(prefix + id, JSON.stringify({ view: initial }))
    const root = document.createElement('div')
    root.setAttribute(phase, 'active')
    const conversation = document.createElement('div')
    conversation.setAttribute(session, id)
    const seatBox = document.createElement('div')
    seatBox.setAttribute(seat.slice(1, -1), '')
    seatBox.style.height = '40px'
    conversation.append(seatBox)
    root.append(conversation)
    document.body.append(root)
    window.__debugConversation = { root, seat: seatBox, id }
  }, [SEAT, PHASE, SESSION, VIEW_STORAGE, view])
}

async function setView(t, view) {
  await t.page.evaluate(([prefix, next]) => {
    const { root, id } = window.__debugConversation
    localStorage.setItem(prefix + id, JSON.stringify({ view: next }))
    const marker = document.createElement('span')
    root.append(marker)
    marker.remove()
  }, [VIEW_STORAGE, view])
  await t.page.waitForTimeout(150)
}

function readConversation(t) {
  return t.page.evaluate((hidden) => {
    const { root, seat } = window.__debugConversation
    return { marked: root.hasAttribute(hidden), drawn: getComputedStyle(seat).display !== 'none' }
  }, HIDDEN)
}

function dropConversation(t) {
  return t.page.evaluate((prefix) => {
    const { root, id } = window.__debugConversation
    localStorage.removeItem(prefix + id)
    root.remove()
    delete window.__debugConversation
  }, VIEW_STORAGE)
}

export default spec({ page: 'composer' }, ({ test }) => {
  test('another plugin\'s tablist in the composer on the home page leaves the composer up', async (t) => {
    await mountHome(t)
    await t.page.waitForTimeout(150)
    t.expectThat.equal(await readHome(t), { marked: false, drawn: true }, 'the composer stays up with the plugin\'s second tab selected')
    await t.page.evaluate(() => { window.__debugHome.root.remove(); delete window.__debugHome })
  })

  test('chat, reader and an unknown content view keep the composer', async (t) => {
    await mountConversation(t, 'chat')
    for (const view of ['chat', 'reader', 'third-party']) {
      await setView(t, view)
      t.expectThat.equal(await readConversation(t), { marked: false, drawn: true }, `${view} keeps the composer`)
    }
    await dropConversation(t)
  })

  test('trajectory, context and stats stand the composer down', async (t) => {
    await mountConversation(t, 'chat')
    for (const view of INSPECTION_VIEWS) {
      await setView(t, view)
      t.expectThat.equal(await readConversation(t), { marked: true, drawn: false }, `${view} hides the composer`)
    }
    await dropConversation(t)
  })
})
