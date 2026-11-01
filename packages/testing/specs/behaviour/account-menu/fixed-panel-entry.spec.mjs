/**
 * A plugin's fixed-position panel mounted into the sidebar footer keeps its box
 * once the skin takes the footer over. The takeover gathers every unit the
 * footer's action slot holds and collapses each collected one with
 * `display: contents`, so a unit that is itself a fixed-position overlay has to
 * be read as an overlay on every pass, not on the pass that first saw it. The
 * Remote plugin's page is that shape: its action renders the trigger and, while
 * the page is open, a fixed backdrop holding the dialog — two siblings in the
 * same slot.
 *
 * @capability account-menu
 * @features account
 * @risk A plugin's footer entry that opens a fixed-position panel is collapsed with `display: contents` on the pass after it opens, so the panel paints no box and disappears the frame after it appears.
 */
import { host, spec, surface } from '../../fixtures/behaviour.mjs'

/** The attribute the skin writes its part marks into. */
const PART = surface.attribute('skin.part')
/** A slot anchor: its children are the host's real entries. */
const SLOT_ANCHOR = host('shell.slot-anchor')
/** The index linking an account-menu action to its live footer entry. */
const ACTION_INDEX = surface.attribute('account.action-index')

/**
 * The plugin's action as its own module renders it: a trigger in the action
 * slot, and — while the page is open — a fixed backdrop with the dialog inside,
 * mounted beside the trigger in the same slot. Both are the slot's children,
 * which is what the takeover collects as separate units.
 */
const mountPanelAction = (t) => t.page.evaluate(({ part, anchor }) => {
  const actions = document.querySelector(`[${part}~="footer-actions"]`)
  if (actions === null) throw new Error('the stand-in footer has no action slot')
  const slot = actions.querySelector(anchor) ?? actions
  const trigger = document.createElement('div')
  trigger.className = 'plugin-panel-entry'
  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute('aria-label', 'Remote workspace')
  button.textContent = 'Remote'
  let backdrop = null
  button.addEventListener('click', () => {
    if (backdrop !== null) {
      backdrop.remove()
      backdrop = null
      return
    }
    backdrop = document.createElement('div')
    backdrop.className = 'plugin-panel-backdrop'
    backdrop.setAttribute('role', 'presentation')
    backdrop.style.cssText = 'position:fixed;inset:0;z-index:1000;display:grid;place-items:center'
    const panel = document.createElement('section')
    panel.className = 'plugin-panel'
    panel.setAttribute('role', 'dialog')
    panel.setAttribute('aria-label', 'Remote workspace')
    panel.style.cssText = 'width:320px;height:200px'
    const heading = document.createElement('p')
    heading.className = 'plugin-panel-heading'
    heading.style.fontSize = '14px'
    heading.textContent = 'Remote workspace'
    panel.appendChild(heading)
    backdrop.appendChild(panel)
    trigger.after(backdrop)
  })
  trigger.appendChild(button)
  slot.appendChild(trigger)
  window.__panelTrigger = trigger
  window.__panelButton = button
}, { part: PART, anchor: SLOT_ANCHOR })

/** What the panel, its backdrop and the trigger are painting right now. */
const readPanel = (t) => t.page.evaluate(() => {
  const box = (el) => {
    if (el === null) return null
    const r = el.getBoundingClientRect()
    return { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height), display: getComputedStyle(el).display }
  }
  const trigger = window.__panelTrigger ?? null
  const backdrop = trigger === null ? null : (trigger.nextElementSibling?.classList.contains('plugin-panel-backdrop') ? trigger.nextElementSibling : null)
  return {
    mounted: backdrop !== null,
    backdrop: box(backdrop),
    panel: box(document.querySelector('.plugin-panel')),
    heading: box(document.querySelector('.plugin-panel-heading')),
    headingLineHeight: document.querySelector('.plugin-panel-heading') === null ? null : getComputedStyle(document.querySelector('.plugin-panel-heading')).lineHeight,
    triggerDisplay: trigger === null ? null : getComputedStyle(trigger).display,
  }
})

/** Ask for one more scheduler pass, the way any unrelated page change does. */
const askForAPass = (t) => t.page.evaluate(() => new Promise((resolve) => {
  const marker = document.createElement('div')
  marker.id = 'panel-pass-marker'
  marker.style.display = 'none'
  document.body.appendChild(marker)
  requestAnimationFrame(() => requestAnimationFrame(resolve))
}))

export default spec({ page: 'desktop' }, ({ test }) => {
  test('a fixed-position panel a footer entry mounts keeps its box after a press', async (t) => {
    await mountPanelAction(t)
    await t.settle()
    // The takeover has gathered the trigger out of the sidebar's paint by now.
    t.expectThat.equal((await readPanel(t)).triggerDisplay, 'none',
      'the takeover gathers the trigger out of the sidebar\'s paint')

    // The press goes to the plugin's own trigger, which is the node the skin's
    // mirrored row forwards a press to.
    await t.page.evaluate(() => window.__panelButton.click())
    await t.settle()
    const opened = await readPanel(t)
    t.expectThat.equal(opened.mounted, true, 'the press mounts the plugin\'s panel')
    t.expectThat.visible(opened.backdrop, 'the fixed backdrop keeps its box once the panel is up')
    t.expectThat.visible(opened.panel, 'the panel keeps its box once the panel is up')
    t.expectThat.visible(opened.heading, 'the panel text keeps a nonzero line box')
    t.expectThat.equal(opened.headingLineHeight, 'normal', 'the overlay restores normal inherited line height')

    // The defect lands on a later pass: the backdrop is classified again, this
    // time with the overlay mark it already carries.
    await askForAPass(t)
    await t.settle()
    const settled = await readPanel(t)
    t.expectThat.equal(settled.mounted, true, 'the panel is still mounted after a further pass')
    t.expectThat.visible(settled.backdrop, 'the backdrop still keeps its box after a further pass')
    t.expectThat.visible(settled.panel, 'the panel still keeps its box after a further pass')
  })

  test('a fixed-position panel opened from the account menu keeps its box', async (t) => {
    await mountPanelAction(t)
    await t.settle()
    await t.page.locator('#host-account').click()
    const mirror = t.page.locator(`[${ACTION_INDEX}]`).filter({ hasText: 'Remote workspace' }).first()
    await mirror.waitFor({ state: 'visible' })
    await mirror.click()
    await t.settle()
    const opened = await readPanel(t)
    t.expectThat.equal(opened.mounted, true, 'the mirrored row opens the plugin panel')
    t.expectThat.visible(opened.backdrop, 'the account-menu path keeps the fixed backdrop visible')
    t.expectThat.visible(opened.panel, 'the account-menu path keeps the panel visible')
    t.expectThat.visible(opened.heading, 'the account-menu path keeps the panel text readable')
    t.expectThat.equal(opened.headingLineHeight, 'normal', 'the account-menu path restores normal inherited line height')
  })
})
