/**
 * A plugin's footer entry that opens a menu keeps its place in the sidebar once
 * the account area is redrawn: the trigger stays visible and pressable, its menu
 * portals from the trigger's own box and returns focus to it, and switching the
 * redraw off hands the entry back untouched.
 *
 * @capability account-menu
 * @features account
 * @risk The fnos config-menu entry is hidden in the sidebar and skipped by the account mirror, so it disappears from both places and the reader cannot open its menu; the menu would also lose its placement and focus-return anchor (issue #417).
 */
import { host, spec, surface } from '../../fixtures/behaviour.mjs'

const PART = surface.attribute('skin.part')
const FOOTER_MENU = surface.attribute('account.footer-menu')
const FOOTER_ENTRY = surface.attribute('account.footer-entry')
const FOOTER_HIDDEN = surface.attribute('account.footer-hidden')
const SLOT_ANCHOR = host('shell.slot-anchor')

/**
 * Mount a plugin menu trigger into the footer's action slot, the way fnos mounts
 * its config-menu entry. `root` decides whether the trigger is the entry itself
 * or a button inside an entry wrapper. The menu portals to <body>, places itself
 * from the trigger's own box, and returns focus to the trigger on close.
 */
const mountMenuEntry = (t, root) => t.page.evaluate(({ part, anchor, isRoot }) => {
  const actions = document.querySelector(`[${part}~="footer-actions"]`)
  if (actions === null) throw new Error('the stand-in footer has no action slot')
  const slot = actions.querySelector(anchor) ?? actions
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'fnos-menu-trigger'
  button.setAttribute('aria-label', 'fnOS config menu')
  button.setAttribute('aria-haspopup', 'menu')
  button.setAttribute('aria-expanded', 'false')
  button.textContent = 'fnOS'
  const entry = isRoot ? button : document.createElement('div')
  if (!isRoot) {
    entry.className = 'fnos-menu-entry'
    entry.appendChild(button)
  }
  let menu = null
  const close = () => {
    if (menu === null) return
    menu.remove()
    menu = null
    button.setAttribute('aria-expanded', 'false')
    button.focus()
  }
  const onKey = (event) => {
    if (event.key === 'Escape') close()
  }
  const onOutside = (event) => {
    if (menu !== null && !menu.contains(event.target) && event.target !== button) close()
  }
  button.addEventListener('click', () => {
    if (menu !== null) { close(); return }
    menu = document.createElement('div')
    menu.className = 'fnos-menu-card'
    menu.setAttribute('role', 'menu')
    menu.style.cssText = 'position:fixed;z-index:1000;width:180px;padding:4px;background:#fff;border:1px solid #ccc'
    const item = document.createElement('button')
    item.type = 'button'
    item.setAttribute('role', 'menuitem')
    item.textContent = 'Settings'
    menu.appendChild(item)
    document.body.appendChild(menu)
    const box = button.getBoundingClientRect()
    menu.style.left = `${Math.round(box.left)}px`
    menu.style.top = `${Math.round(box.top - menu.offsetHeight - 6)}px`
    button.setAttribute('aria-expanded', 'true')
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('pointerdown', onOutside, true)
    item.focus()
  })
  slot.appendChild(entry)
  window.__menuEntry = entry
  window.__menuButton = button
  window.__menuClose = () => {
    document.removeEventListener('keydown', onKey, true)
    document.removeEventListener('pointerdown', onOutside, true)
    close()
  }
}, { part: PART, anchor: SLOT_ANCHOR, isRoot: root })

/** What the entry, its trigger and the portal menu are painting right now. */
const readState = (t) => t.page.evaluate(({ menuAttr, entryAttr, hiddenAttr }) => {
  const box = (el) => {
    if (el === null) return null
    const r = el.getBoundingClientRect()
    return { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) }
  }
  const entry = window.__menuEntry ?? null
  const button = window.__menuButton ?? null
  const menu = document.querySelector('.fnos-menu-card')
  return {
    entryDisplay: entry === null ? null : getComputedStyle(entry).display,
    buttonDisplay: button === null ? null : getComputedStyle(button).display,
    entryBox: box(entry),
    buttonBox: box(button),
    menuBox: box(menu),
    menuOpen: menu !== null,
    expanded: button === null ? null : button.getAttribute('aria-expanded'),
    focusOnButton: document.activeElement === button,
    focusInMenu: menu !== null && menu.contains(document.activeElement),
    keptMark: entry === null ? false : entry.hasAttribute(menuAttr),
    entryMark: entry === null ? false : entry.hasAttribute(entryAttr),
    hiddenMark: entry === null ? false : entry.hasAttribute(hiddenAttr),
  }
}, { menuAttr: FOOTER_MENU, entryAttr: FOOTER_ENTRY, hiddenAttr: FOOTER_HIDDEN })

export default spec({ page: 'desktop' }, ({ test }) => {
  test('a menu trigger that is the entry root stays in the sidebar and opens its menu from its own box', async (t) => {
    await mountMenuEntry(t, true)
    await t.settle()
    const rest = await readState(t)
    t.expectThat.equal(rest.keptMark, true, 'the takeover marks the entry as a kept menu trigger')
    t.expectThat.equal(rest.entryMark, false, 'the entry is not gathered into the account menu')
    t.expectThat.equal(rest.hiddenMark, false, 'the entry is not hidden in place')
    t.expectThat.equal(rest.entryDisplay !== 'none', true, 'the entry keeps painting in the sidebar')
    t.expectThat.visible(rest.buttonBox, 'the trigger keeps a pressable box in the sidebar')

    await t.page.click('.fnos-menu-trigger')
    await t.settle()
    const opened = await readState(t)
    t.expectThat.equal(opened.menuOpen, true, 'a press on the trigger opens the plugin menu')
    t.expectThat.equal(opened.expanded, 'true', 'the trigger reports its menu open')
    t.expectThat.visible(opened.menuBox, 'the menu keeps a box')
    t.expectThat.equal(opened.focusInMenu, true, 'focus moves into the menu')
    t.expectThat.equal(opened.menuBox.bottom <= opened.buttonBox.top + 1, true,
      'the menu places itself from the trigger\'s own box, above it')

    await t.page.keyboard.press('Escape')
    await t.settle()
    const closed = await readState(t)
    t.expectThat.equal(closed.menuOpen, false, 'Escape closes the menu')
    t.expectThat.equal(closed.focusOnButton, true, 'focus returns to the trigger')
    await t.page.evaluate(() => window.__menuClose())
  })

  test('a menu trigger inside an entry wrapper keeps the whole entry reachable', async (t) => {
    await mountMenuEntry(t, false)
    await t.settle()
    const rest = await readState(t)
    t.expectThat.equal(rest.keptMark, true, 'the wrapper entry is marked as a kept menu trigger')
    t.expectThat.equal(rest.hiddenMark, false, 'the wrapper entry is not hidden in place')
    t.expectThat.visible(rest.entryBox, 'the wrapper keeps a box in the sidebar')
    t.expectThat.visible(rest.buttonBox, 'the trigger inside it keeps a pressable box')

    await t.page.click('.fnos-menu-trigger')
    await t.settle()
    const opened = await readState(t)
    t.expectThat.equal(opened.menuOpen, true, 'a press on the nested trigger opens the plugin menu')
    t.expectThat.visible(opened.menuBox, 'the menu keeps a box')
    t.expectThat.equal(opened.menuBox.bottom <= opened.buttonBox.top + 1, true,
      'the menu places itself from the nested trigger\'s own box')
    await t.page.keyboard.press('Escape')
    await t.settle()
    t.expectThat.equal((await readState(t)).focusOnButton, true, 'focus returns to the nested trigger')
    await t.page.evaluate(() => window.__menuClose())
  })

  test('switching the redraw off hands the menu entry back untouched', async (t) => {
    await mountMenuEntry(t, true)
    await t.settle()
    t.expectThat.equal((await readState(t)).keptMark, true, 'the entry is kept while the redraw is on')
    await t.prefs({ collapseFooter: false })
    const off = await readState(t)
    t.expectThat.equal(off.keptMark, false, 'the kept mark comes off with the takeover')
    t.expectThat.equal(off.entryMark, false, 'no gather mark is left on the entry')
    t.expectThat.equal(off.hiddenMark, false, 'no hidden mark is left on the entry')
    t.expectThat.visible(off.buttonBox, 'the trigger paints as the plugin drew it')
    await t.prefs({ collapseFooter: true })
    t.expectThat.equal((await readState(t)).keptMark, true, 'the entry is kept again when the redraw returns')
    await t.page.evaluate(() => window.__menuClose())
  })
})
