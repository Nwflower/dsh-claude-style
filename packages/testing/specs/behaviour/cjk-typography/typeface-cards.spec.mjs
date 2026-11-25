/**
 * The Appearance tab's typeface row renders three independent live preview cards
 * (Prose, Interface and Code), projects custom font stacks onto the document's
 * CSS custom properties in priority order, and exposes an icon-only reset button
 * only while a role carries custom families.
 *
 * @capability cjk-typography
 * @features settings
 * @risk Custom font stacks fail to reach body tokens, cards omit one of the three roles, or icon-only reset buttons leak text or fail to restore defaults.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { inspectSettingsTab } from '../../fixtures/settings-tree.mjs'

async function readTypefaceCards(t) {
  return inspectSettingsTab(t, 'appearance', (tree, { walk, textOf, has }, names) => {
    const cards = []
    walk(tree, node => {
      if (!has(node, names.card)) return
      let sample = ''
      let primary = ''
      let count = ''
      let reset = null
      walk(node, child => {
        if (has(child, names.sample)) sample = textOf(child)
        if (has(child, names.primary)) primary = textOf(child)
        if (has(child, names.count)) count = textOf(child)
        if (has(child, names.reset)) {
          reset = {
            text: textOf(child),
            ariaLabel: child.props?.['aria-label'] ?? '',
          }
        }
      })
      cards.push({
        role: node.props?.[names.roleAttr] ?? null,
        customized: node.props?.[names.customizedAttr] === '',
        sample,
        primary,
        count,
        reset,
      })
    })
    return cards
  }, {
    card: t.surface('typeface.card').slice(1),
    roleAttr: t.surface.attribute('typeface.role-attr'),
    customizedAttr: t.surface.attribute('typeface.customized-attr'),
    sample: t.surface('typeface.sample').slice(1),
    primary: t.surface('typeface.primary').slice(1),
    count: t.surface('typeface.count').slice(1),
    reset: t.surface('typeface.reset').slice(1),
  })
}

async function clickCardReset(t, role) {
  await inspectSettingsTab(t, 'appearance', (tree, { walk, has }, names) => {
    walk(tree, node => {
      if (!has(node, names.card) || node.props?.[names.roleAttr] !== names.role) return
      walk(node, child => {
        if (has(child, names.reset)) {
          child.props.onClick({ stopPropagation() {} })
        }
      })
    })
  }, {
    card: t.surface('typeface.card').slice(1),
    roleAttr: t.surface.attribute('typeface.role-attr'),
    reset: t.surface('typeface.reset').slice(1),
    role,
  })
  await t.settle()
}

export default spec({ page: 'settings' }, ({ test }) => {
  test('three role preview cards reflect custom font stacks, project body variables, and reset cleanly via icon buttons', async t => {
    const props = {
      prose: t.surface.property('skin.font-prose'),
      serif: t.surface.property('skin.font-serif'),
      code: t.surface.property('skin.font-code'),
    }

    await t.prefs({ typeface: 'claude', fontProse: [], fontUi: [], fontCode: [] })
    const initial = await readTypefaceCards(t)
    t.expectThat.equal(initial.map(card => card.role), ['prose', 'ui', 'code'], 'three independent cards render in Prose, Interface, Code order')
    t.expectThat.equal(initial.every(card => card.sample === 'DeepSeek探索未知之境' && !card.customized && card.reset === null), true, 'default state shows the fixed DeepSeek sample and hides reset icons')
    t.expectThat.equal(initial.map(card => card.primary), ['Anthropic Serif', 'Anthropic Sans', 'Anthropic Mono'], 'each card names its active preset primary family')

    await t.prefs({
      typeface: 'claude',
      fontProse: ['LXGW WenKai', 'Georgia'],
      fontUi: [],
      fontCode: ['Fira Code'],
    })
    const customized = await readTypefaceCards(t)
    const byRole = Object.fromEntries(customized.map(card => [card.role, card]))
    t.expectThat.equal(byRole.prose.primary, 'LXGW WenKai', 'prose card displays the top prioritized custom family')
    t.expectThat.equal(byRole.prose.count, '+1', 'prose card shows the compact overflow count for additional families')
    t.expectThat.equal(byRole.prose.reset !== null && byRole.prose.reset.text === '' && byRole.prose.reset.ariaLabel.length > 0, true, 'reset control is icon-only with an accessible label')
    t.expectThat.equal(byRole.ui.reset, null, 'unchanged interface card keeps its reset icon hidden')
    t.expectThat.equal(byRole.code.primary, 'Fira Code', 'code card displays its custom family')
    t.expectThat.equal(byRole.code.count, '', 'single custom family omits the overflow badge')

    const bodyVars = await t.page.evaluate((names) => ({
      prose: document.body.style.getPropertyValue(names.prose),
      serif: document.body.style.getPropertyValue(names.serif),
      ui: document.body.style.getPropertyValue('--dsw-font-family'),
      code: document.body.style.getPropertyValue(names.code),
    }), props)
    t.expectThat.equal(bodyVars.prose.startsWith("'LXGW WenKai', 'Georgia', "), true, 'prose custom stack prepends in user order ahead of preset fallback')
    t.expectThat.equal(bodyVars.serif, bodyVars.prose, 'display serif follows the prose custom stack')
    t.expectThat.equal(bodyVars.ui, '', 'empty interface stack leaves body --dsw-font-family untouched')
    t.expectThat.equal(bodyVars.code.startsWith("'Fira Code', "), true, 'code custom stack prepends ahead of preset code fallback')

    await clickCardReset(t, 'prose')
    const afterReset = await readTypefaceCards(t)
    const proseAfter = afterReset.find(card => card.role === 'prose')
    t.expectThat.equal(proseAfter.customized, false, 'clicking the prose refresh icon clears its custom stack')
    t.expectThat.equal(proseAfter.reset, null, 'refresh icon disappears once prose returns to default')
    const clearedProse = await t.page.evaluate((name) => document.body.style.getPropertyValue(name), props.prose)
    t.expectThat.equal(clearedProse, '', 'resetting prose removes its inline body override')
    const uiFont = '--dsw-font-family'
    await t.page.evaluate(name => document.body.style.setProperty(name, 'Georgia', 'important'), uiFont)
    await t.prefs({ typeface: 'host', fontUi: [] })
    const readHostFont = () => t.page.evaluate(name => [
      document.body.style.getPropertyValue(name), document.body.style.getPropertyPriority(name),
    ], uiFont)
    t.expectThat.equal(await readHostFont(), ['Georgia', 'important'], 'following host keeps its inline font')
    await t.prefs({ fontUi: ['Inter'] })
    t.expectThat.equal((await readHostFont())[0].startsWith("'Inter', "), true, 'custom font takes ownership')
    await t.prefs({ fontUi: [] })
    t.expectThat.equal(await readHostFont(), ['Georgia', 'important'], 'releasing the override restores the original declaration')
    await t.page.evaluate(name => document.body.style.removeProperty(name), uiFont)
  })
})
