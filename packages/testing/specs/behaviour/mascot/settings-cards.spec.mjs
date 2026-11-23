/**
 * The mascot settings row shows an on/off switch in its header and three
 * character preview cards below it while enabled: following the theme marks
 * the active brand's character as following the theme, pinning a character
 * offers a button to follow the theme again, and turning the switch off
 * collapses the cards.
 *
 * @capability mascot
 * @features mascot, settings
 * @risk The mascot row shows standalone off/auto cards, loses the switch or following-theme indicator, or keeps cards visible while off.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { inspectSettingsTab } from '../../fixtures/settings-tree.mjs'

async function readMascotSettings(t) {
  return inspectSettingsTab(t, 'appearance', (tree, { walk, textOf, has }, names) => {
    let toggle = null
    const cards = []
    walk(tree, node => {
      if (node.props?.role === 'switch' && node.props?.['aria-label'] === 'Mascot') {
        toggle = node.props['aria-checked']
      }
      if (!has(node, names.card)) return
      let tag = null
      let reset = null
      walk(node, child => {
        if (has(child, names.tag)) tag = textOf(child)
        if (has(child, names.reset)) reset = textOf(child)
      })
      cards.push({
        id: node.props[names.id],
        pressed: node.props['aria-pressed'],
        tag,
        reset,
      })
    })
    return { toggle, cards }
  }, {
    card: t.surface('mascot.preview-card').slice(1),
    id: t.surface.attribute('mascot.preview-id'),
    tag: t.surface('mascot.preview-tag').slice(1),
    reset: t.surface('mascot.preview-reset').slice(1),
  })
}

export default spec({ page: 'settings' }, ({ test }) => {
  test('the mascot row toggles off cleanly and tracks following vs pinned characters across three cards', async t => {
    await t.prefs({ brand: 'claude', mascot: 'brand' })
    const claudeFollowing = await readMascotSettings(t)
    t.expectThat.equal(claudeFollowing.toggle, 'true', 'the mascot header switch is on while following the theme')
    t.expectThat.equal(claudeFollowing.cards.map(card => card.id), ['crab', 'deepy', 'whalegirl'], 'three character cards are shown')
    t.expectThat.equal(claudeFollowing.cards[0], { id: 'crab', pressed: 'true', tag: 'Following theme', reset: null }, 'Crab is active and marked as following the theme under Claude')
    t.expectThat.equal(claudeFollowing.cards[1].pressed, 'false', 'Deepy is not pressed under Claude')
    t.expectThat.equal(claudeFollowing.cards[2].pressed, 'false', 'Whale Girl is not pressed under Claude')

    await t.prefs({ brand: 'deepseek', mascot: 'brand' })
    const deepseekFollowing = await readMascotSettings(t)
    t.expectThat.equal(deepseekFollowing.cards[1], { id: 'deepy', pressed: 'true', tag: 'Following theme', reset: null }, 'Deepy is active and marked as following the theme under DeepSeek')

    await t.prefs({ brand: 'claude', mascot: 'whalegirl' })
    const pinned = await readMascotSettings(t)
    t.expectThat.equal(pinned.cards[2], { id: 'whalegirl', pressed: 'true', tag: null, reset: 'Follow theme again' }, 'a pinned character offers the follow-theme reset button')
    t.expectThat.equal(pinned.cards[0].pressed, 'false', 'Crab is no longer pressed while Whale Girl is pinned')

    await t.prefs({ brand: 'claude', mascot: 'off' })
    const off = await readMascotSettings(t)
    t.expectThat.equal(off.toggle, 'false', 'the mascot header switch is off when mascot is off')
    t.expectThat.equal(off.cards.length, 0, 'character cards collapse while the mascot switch is off')
  })
})
