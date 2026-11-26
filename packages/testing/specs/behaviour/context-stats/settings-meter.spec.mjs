/**
 * The context meter row in settings combines two animated 1%–100% shape preview
 * cards (`pie` and `ring`), a three-way segmented colour-ramp control (`default`,
 * `classic`, `custom`) that unfolds the OKLCH stop editor only under `custom`
 * while preserving custom stops across mode switches, and the percentage switch
 * synced into the statistics-bar miniature toolbar (D76).
 *
 * @capability context-stats
 * @features context-stats, settings
 * @risk Shape preview cards fall out of sync with the percentage switch or colour ramp, the custom ramp strip shows outside custom mode, or switching presets erases the reader's custom stops.
 */
import { CONTEXT_RAMP_CLASSIC } from '@dsh-claude-style/contracts/context-ramp'
import { spec } from '../../fixtures/behaviour.mjs'
import { inspectSettingsTab } from '../../fixtures/settings-tree.mjs'

async function readMeterSettings(t) {
  return inspectSettingsTab(t, 'composer', (tree, { walk, textOf, has }, names) => {
    const cards = []
    const presets = []
    const stops = []
    let customStageShown = false
    let numberSwitch = null
    let removeShown = false
    let statsBarNumbers = 0

    walk(tree, node => {
      if (has(node, names.card)) {
        const values = []
        walk(node, child => {
          if (has(child, names.sampleValue)) values.push(textOf(child))
        })
        cards.push({
          face: node.props?.[names.faceAttr] ?? null,
          pressed: node.props?.['aria-pressed'] ?? null,
          values,
        })
      }
      if (node.props?.[names.presetAttr] !== undefined) {
        presets.push({
          id: node.props[names.presetAttr],
          pressed: node.props?.['aria-pressed'] ?? null,
        })
      }
      if (has(node, names.stage)) {
        customStageShown = true
      }
      if (has(node, names.stop)) {
        stops.push({
          left: node.props?.style?.left ?? null,
          color: node.props?.style?.backgroundColor ?? null,
          pressed: node.props?.['aria-pressed'] ?? null,
        })
      }
      if (has(node, names.remove)) {
        removeShown = true
      }
      if (node.props?.role === 'switch' && node.props?.['aria-label'] === 'Context percentage') {
        numberSwitch = node.props['aria-checked']
      }
      if (has(node, names.statsCard)) {
        walk(node, child => {
          if (has(child, names.sampleValue)) statsBarNumbers += 1
        })
      }
    })
    return { cards, presets, customStageShown, stops, numberSwitch, removeShown, statsBarNumbers }
  }, {
    card: t.surface('stats.meter-card').slice(1),
    faceAttr: t.surface.attribute('stats.meter-face-attr'),
    sampleValue: t.surface('stats.meter-sample-value').slice(1),
    presetAttr: t.surface.attribute('stats.ramp-preset-attr'),
    stage: t.surface('stats.ramp-stage').slice(1),
    stop: t.surface('stats.ramp-stop').slice(1),
    remove: t.surface('stats.ramp-remove').slice(1),
    statsCard: t.surface('stats.settings-card').slice(1),
  })
}

async function clickRampSegment(t, id) {
  await inspectSettingsTab(t, 'composer', (tree, { walk }, names) => {
    walk(tree, node => {
      if (node.props?.[names.presetAttr] === names.target) {
        node.props.onClick()
      }
    })
  }, {
    presetAttr: t.surface.attribute('stats.ramp-preset-attr'),
    target: id,
  })
  await t.settle()
}

export default spec({ page: 'settings' }, ({ test }) => {
  test('two single-control preview cards, the segmented colour-ramp selector, conditional custom editor, and percentage switch stay synchronized', async t => {
    await t.prefs({
      contextDisplay: 'pie',
      contextRampMode: 'default',
      contextRamp: '',
      contextNumbers: true,
      statsPosition: 'footer',
      motion: 'full',
    })
    const initial = await readMeterSettings(t)
    t.expectThat.equal(initial.cards.map(card => [card.face, card.pressed]), [['pie', 'true'], ['ring', 'false']], 'pie and ring stand side by side with pie selected')
    t.expectThat.equal(initial.cards.map(card => card.values), [['1%'], ['1%']], 'each preview card renders one synchronized animated control starting at 1%')
    t.expectThat.equal(initial.presets, [
      { id: 'default', pressed: 'true' },
      { id: 'classic', pressed: 'false' },
      { id: 'custom', pressed: 'false' },
    ], 'the segmented control offers default, classic and custom with default selected')
    t.expectThat.equal([initial.customStageShown, initial.stops.length], [false, 0], 'the custom ramp strip stays folded while default is selected')
    t.expectThat.equal(initial.numberSwitch, 'true', 'the percentage switch starts on')
    t.expectThat.equal(initial.statsBarNumbers, 2, 'both statistics-bar miniature composer cards show the compact meter percentage')

    await clickRampSegment(t, 'classic')
    const classic = await readMeterSettings(t)
    t.expectThat.equal(classic.presets, [
      { id: 'default', pressed: 'false' },
      { id: 'classic', pressed: 'true' },
      { id: 'custom', pressed: 'false' },
    ], 'selecting classic highlights the middle segment')
    t.expectThat.equal(classic.customStageShown, false, 'the custom ramp strip remains folded under classic')

    await clickRampSegment(t, 'custom')
    const seededCustom = await readMeterSettings(t)
    t.expectThat.equal(seededCustom.presets, [
      { id: 'default', pressed: 'false' },
      { id: 'classic', pressed: 'false' },
      { id: 'custom', pressed: 'true' },
    ], 'selecting custom activates the custom segment')
    t.expectThat.equal(seededCustom.customStageShown, true, 'the custom OKLCH ramp editor unfolds when custom is selected')
    t.expectThat.equal(seededCustom.stops.map(stop => [stop.left, stop.color]), [
      ['55%', '#257de0'],
      ['78%', '#fbb315'],
      ['90%', '#dc3c3d'],
    ], `entering custom for the first time seeds stops from the previously viewed ${CONTEXT_RAMP_CLASSIC} ramp`)
    t.expectThat.equal(seededCustom.removeShown, true, 'three stops offer the remove-stop button')

    await t.prefs({
      contextDisplay: 'ring',
      contextRampMode: 'custom',
      contextRamp: '30:#11aa55,85:#dd3344',
      contextNumbers: false,
      motion: 'reduced',
    })
    const twoStops = await readMeterSettings(t)
    t.expectThat.equal(twoStops.cards.map(card => [card.face, card.pressed, card.values.length]), [
      ['pie', 'false', 0],
      ['ring', 'true', 0],
    ], 'switching to ring and turning percentages off hides numbers across both preview cards')
    t.expectThat.equal(twoStops.stops.length, 2, 'two custom stops render on the track')
    t.expectThat.equal(twoStops.removeShown, false, 'the minimum of two stops hides the remove button')
    t.expectThat.equal(twoStops.statsBarNumbers, 0, 'the statistics-bar miniature toolbar hides the compact meter percentage too')

    await clickRampSegment(t, 'default')
    t.expectThat.equal((await readMeterSettings(t)).customStageShown, false, 'returning to default folds the custom ramp strip away')
    await clickRampSegment(t, 'custom')
    const restoredCustom = await readMeterSettings(t)
    t.expectThat.equal(restoredCustom.stops.map(stop => [stop.left, stop.color]), [
      ['30%', '#11aa55'],
      ['85%', '#dd3344'],
    ], 're-entering custom restores the reader\'s saved custom stops intact')

    await t.prefs({ contextNumbers: true, motion: 'reduced' })
    const reduced = await readMeterSettings(t)
    t.expectThat.equal(reduced.cards.map(card => card.values), [['68%'], ['68%']], 'reduced motion holds both preview cards at a calm static percentage')
  })
})
