/**
 * The footer's seated entries: a control a plugin mounts into the sidebar footer
 * that the skin keeps in the sidebar stands as a copy at the right end of the
 * account row, and a press on the copy reaches the plugin's own node.
 *
 * @capability account-menu
 * @features account
 * @risk The update control a plugin mounts into the sidebar footer disappears once the skin takes the footer over, and the reader has no way to reach it from the sidebar.
 */
import { host, spec, surface } from '../../fixtures/behaviour.mjs'

const SEAT_COPY = surface.attribute('skin.footer-seat-copy')
const ACCOUNT_ROW = surface('account.row')
const UPDATE_ENTRY = host('footer.plugin-entry-update')

/**
 * The plugin's update control, as its own module mounts it: the footer's action
 * slot holds the button the plugin names, and every press lands on a counter.
 */
const mountEntry = (t, entry) => t.page.evaluate((selector) => {
  // The stand-in's own footer button names the slot anchor it sits in: the
  // anchor is a wrapper the host builds, reached here by the button's parent.
  const slot = document.getElementById('plugin-action')?.parentElement ?? null
  if (slot === null) throw new Error('the stand-in footer has no action slot')
  const button = document.createElement('button')
  button.type = 'button'
  // The contract's selector is the plugin's own naming: every `[name="value"]`
  // pair it carries goes onto the stand-in control.
  for (const [, name, value] of selector.matchAll(/\[([^\]=]+)(?:="([^"]*)")?\]/g)) {
    button.setAttribute(name, value ?? '')
  }
  button.setAttribute('aria-label', 'Check for updates')
  button.textContent = 'Update'
  window.__seatPresses = 0
  button.addEventListener('click', () => { window.__seatPresses += 1 })
  window.__seatEntry = button
  slot.append(button)
}, UPDATE_ENTRY)

const read = (t, names) => t.page.evaluate(({ copyAttr, rowSelector }) => {
  const entry = window.__seatEntry
  const copy = document.querySelector(`[${copyAttr}]`)
  const row = document.querySelector(rowSelector)
  const box = (el) => {
    if (el === null) return null
    const r = el.getBoundingClientRect()
    return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height) }
  }
  return {
    presses: window.__seatPresses,
    entryDisplay: getComputedStyle(entry).display,
    copyInRow: copy !== null && row !== null && copy.parentElement === row,
    copyParent: copy === null || copy.parentElement === null ? null : `${copy.parentElement.tagName}.${typeof copy.parentElement.className === 'string' ? copy.parentElement.className : ''}`,
    rowFound: row === null ? null : `${row.tagName}.${typeof row.className === 'string' ? row.className : ''}`,
    copyText: copy === null ? null : (copy.textContent || '').trim(),
    copyLabel: copy === null ? null : (copy.querySelector('[aria-label]')?.getAttribute('aria-label') ?? null),
    copyBox: box(copy),
    rowBox: box(row),
    window: innerWidth,
  }
}, { copyAttr: names.copy, rowSelector: names.row })

export default spec({ page: 'account', bands: ['wide', 'phone'] }, ({ test }) => {
  test('a seated footer entry stands in the account row and its press reaches the plugin', async (t) => {
    await mountEntry(t, UPDATE_ENTRY)
    await t.settle()
    const state = await read(t, { copy: SEAT_COPY, row: ACCOUNT_ROW })
    t.expectThat.equal(state.entryDisplay, 'none', 'the plugin\'s own entry is out of the sidebar\'s paint')
    t.expectThat.equal(state.copyInRow, true, `a copy of the entry stands in the account row (copy under ${state.copyParent}, row ${state.rowFound})`)
    t.expectThat.equal(state.copyText, 'Update', 'the copy carries the plugin\'s own words')
    t.expectThat.equal(state.copyLabel, 'Check for updates', 'the copy carries the plugin\'s own label')
    t.expectThat.equal(state.copyBox !== null && state.copyBox.right <= state.window, true, 'the copy stays inside the window')
    await t.page.click(`[${SEAT_COPY}] > *`)
    const after = await read(t, { copy: SEAT_COPY, row: ACCOUNT_ROW })
    t.expectThat.equal(after.presses, 1, 'a press on the copy reaches the plugin\'s own entry')
  })
})
