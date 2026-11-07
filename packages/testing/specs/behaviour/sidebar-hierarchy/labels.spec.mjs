/**
 * Sidebar group labels and session titles occupy distinct colour tiers in both
 * schemes, while the row's interactive states keep the primary ink.
 *
 * @capability sidebar-hierarchy
 * @features workspace
 * @risk A workspace label reads as another session, or dark-mode session titles lose their content tier.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { DARK_THEME_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'

export default spec({ page: 'desktop' }, ({ test }) => {
  test('group labels and session titles keep distinct tiers in light and dark', async (t) => {
    const ensureLabel = () => t.page.evaluate((part) => {
      const tree = document.querySelector('[role="tree"]')
      if (tree === null) throw new Error('the sidebar has no session tree')
      const label = document.createElement('div')
      label.className = '_sectionLabel_w1_' + '1'
      label.setAttribute(part, 'section-label')
      label.textContent = 'Workspace'
      tree.prepend(label)
    }, t.surface.attribute('skin.part'))
    const read = () => t.page.evaluate(([labelSelector, titleSelector]) => {
      const label = document.querySelector(labelSelector)
      const title = document.querySelector(titleSelector)
      if (label === null || title === null) throw new Error(`missing sidebar elements: ${JSON.stringify({ label: label !== null, title: title !== null })})`)
      const resolve = (value) => {
        const probe = document.createElement('span')
        probe.style.color = value
        document.body.append(probe)
        const color = getComputedStyle(probe).color
        probe.remove()
        return color
      }
      return {
        label: getComputedStyle(label).color,
        title: getComputedStyle(title).color,
        tertiary: resolve(getComputedStyle(document.body).getPropertyValue('--dsw-alias-label-tertiary')),
        secondary: resolve(getComputedStyle(document.body).getPropertyValue('--dsw-alias-label-secondary')),
      }
    }, [t.surface('sidebar.section-label'), t.surface('sidebar.session-title')])
    for (const scheme of ['light', 'dark']) {
      await t.page.evaluate(([name, attribute]) => document.body.toggleAttribute(attribute, name === 'dark'), [scheme, DARK_THEME_ATTRIBUTE])
      await ensureLabel()
      const state = await read()
      t.expectThat.equal(state.label, state.tertiary, `${scheme}: the group label uses the tertiary tier`)
      t.expectThat.equal(state.title, state.secondary, `${scheme}: the session title uses the secondary tier`)
      t.expectThat.equal(state.title === state.label, false, `${scheme}: the two tiers are visibly distinct`)
    }
    await t.page.locator(t.surface('sidebar.session-title')).first().hover()
    const hovered = await t.page.locator(t.surface('sidebar.session-title')).first().evaluate((element) => {
      const probe = document.createElement('span')
      probe.style.color = getComputedStyle(document.body).getPropertyValue('--dsw-alias-label-primary')
      document.body.append(probe)
      const primary = getComputedStyle(probe).color
      probe.remove()
      return { color: getComputedStyle(element).color, primary }
    })
    t.expectThat.equal(hovered.color, hovered.primary, 'hovering a session promotes its title to the primary tier')
  })
})
