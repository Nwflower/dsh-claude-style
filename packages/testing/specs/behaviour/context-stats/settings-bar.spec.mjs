/**
 * The composer statistics bar row in settings folds its child controls away
 * while switched off, previews both placements with live sample figures while
 * enabled, remembers the last chosen placement across off/on toggles, and keeps
 * at least one figure chip active (D76, D113).
 *
 * @capability context-stats
 * @features context-stats, settings
 * @risk Disabled statistics rows clutter the settings page, preview cards drift out of sync with chosen figures or units, or toggling off loses the chosen layout.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { inspectSettingsTab } from '../../fixtures/settings-tree.mjs'

async function readStatsBarSettings(t) {
  return inspectSettingsTab(t, 'main-window', (tree, { walk, textOf, has }, names) => {
    let toggle = null
    const cards = []
    const chips = []
    let hint = null
    walk(tree, node => {
      if (node.props?.role === 'switch' && node.props?.['aria-label'] === 'Conversation statistics bar') {
        toggle = node.props['aria-checked']
      }
      if (has(node, names.card)) {
        let seatAlign = null
        let dockAlign = null
        let sampleText = ''
        walk(node, child => {
          if (has(child, names.seat)) seatAlign = child.props?.[names.align] ?? null
          if (has(child, names.dock)) dockAlign = child.props?.[names.align] ?? null
          if (has(child, names.figures)) sampleText = textOf(child)
        })
        cards.push({
          layout: node.props?.[names.layout] ?? null,
          pressed: node.props?.['aria-pressed'] ?? null,
          seatAlign,
          dockAlign,
          sampleText,
        })
      }
      if (has(node, names.chip)) {
        chips.push({
          metric: node.props?.[names.metric] ?? null,
          pressed: node.props?.['aria-pressed'] ?? null,
          disabled: Boolean(node.props?.disabled),
        })
      }
      if (has(node, names.hint)) {
        hint = textOf(node)
      }
    })
    return { toggle, cards, chips, hint }
  }, {
    card: t.surface('stats.settings-card').slice(1),
    layout: t.surface.attribute('stats.settings-layout'),
    seat: t.surface('stats.settings-seat').slice(1),
    dock: t.surface('stats.settings-dock').slice(1),
    align: t.surface.attribute('stats.settings-align'),
    figures: t.surface('stats.settings-figures').slice(1),
    chip: t.surface('stats.settings-chip').slice(1),
    metric: t.surface.attribute('stats.settings-metric'),
    hint: t.surface('stats.settings-hint').slice(1),
  })
}

async function pressStatsBarToggle(t) {
  await inspectSettingsTab(t, 'main-window', (tree, { walk }) => {
    walk(tree, node => {
      if (node.props?.role === 'switch' && node.props?.['aria-label'] === 'Conversation statistics bar') {
        node.props.onClick()
      }
    })
  }, null)
  await t.settle()
}

export default spec({ page: 'settings' }, ({ test }) => {
  test('the statistics bar configurator collapses while off, updates previews live, remembers its layout and locks the last active chip', async t => {
    await t.prefs({ statsPosition: 'off' })
    const off = await readStatsBarSettings(t)
    t.expectThat.equal(off.toggle, 'false', 'the statistics bar switch starts off')
    t.expectThat.equal([off.cards.length, off.chips.length, off.hint], [0, 0, null], 'child controls fold away while the switch is off')

    await pressStatsBarToggle(t)
    const opened = await readStatsBarSettings(t)
    t.expectThat.equal(opened.toggle, 'true', 'pressing the switch turns the statistics bar on')
    t.expectThat.equal(opened.cards.map(card => [card.layout, card.pressed]), [['footer', 'true'], ['inline', 'false']], 'turning on defaults to the toolbar-adaptive layout card')
    t.expectThat.equal(opened.cards[0].seatAlign, 'center', 'the toolbar card seats the sample inside the toolbar row')
    t.expectThat.equal(opened.cards[0].dockAlign, null, 'the toolbar card leaves no separate dock row')
    t.expectThat.equal(opened.cards[1].seatAlign, null, 'the dedicated-row card leaves the toolbar row clear')
    t.expectThat.equal(opened.cards[1].dockAlign, 'center', 'the dedicated-row card seats the sample in the dock below')
    t.expectThat.equal(opened.chips.map(chip => [chip.metric, chip.pressed]), [
      ['cost', 'true'],
      ['total', 'true'],
      ['cache', 'true'],
      ['speed', 'false'],
      ['ttft', 'false'],
      ['counts', 'false'],
    ], 'all six session-aggregate figure chips appear with the three defaults selected')

    await t.prefs({
      statsPosition: 'inline',
      statsFooterAlign: 'right',
      statsFooterTokenFormat: 'digits',
      statsFooterCounts: true,
      statsFooterSpeed: true,
      billingCurrency: 'off',
    })
    const customized = await readStatsBarSettings(t)
    t.expectThat.equal(customized.cards.map(card => [card.layout, card.pressed]), [['footer', 'false'], ['inline', 'true']], 'the dedicated-row card shows as selected')
    t.expectThat.equal([customized.cards[0].seatAlign, customized.cards[1].dockAlign], ['right', 'right'], 'both preview cards mirror the chosen horizontal position')
    t.expectThat.equal(customized.cards[1].sampleText.includes('12,400') && customized.cards[1].sampleText.includes('68 tok/s'), true, 'live sample figures follow grouped digits and enabled chips: ' + customized.cards[1].sampleText)
    t.expectThat.equal(typeof customized.hint === 'string' && customized.hint.length > 0, true, 'a billing hint appears while session cost is selected with billing currency off')

    await pressStatsBarToggle(t)
    t.expectThat.equal((await readStatsBarSettings(t)).toggle, 'false', 'pressing the switch again folds the configurator away')
    await pressStatsBarToggle(t)
    const remembered = await readStatsBarSettings(t)
    t.expectThat.equal(remembered.cards.map(card => [card.layout, card.pressed]), [['footer', 'false'], ['inline', 'true']], 'turning back on restores the previously chosen dedicated-row layout')

    await t.prefs({
      statsFooterCost: false,
      statsFooterTotal: false,
      statsFooterCache: true,
      statsFooterSpeed: false,
      statsFooterTtft: false,
      statsFooterCounts: false,
      billingCurrency: 'CNY',
    })
    const singleChip = await readStatsBarSettings(t)
    const cacheChip = singleChip.chips.find(chip => chip.metric === 'cache')
    const speedChip = singleChip.chips.find(chip => chip.metric === 'speed')
    t.expectThat.equal([cacheChip?.pressed, cacheChip?.disabled, speedChip?.disabled, singleChip.hint], ['true', true, false, null], 'the last enabled figure chip locks so the bar never empties')
  })
})
