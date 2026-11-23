/**
 * The Home layout choices in settings are small renderings of the real pages:
 * the Code card has the dashboard's six stats and heat grid, the Chat card has
 * the brand greeting and composer tray, and every choice has a composer.
 *
 * @capability home-layout
 * @features home
 * @risk A preview falls back to anonymous placeholder bars, loses the dashboard or composer, or shows the wrong pieces for its layout.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { inspectSettingsTab } from '../../fixtures/settings-tree.mjs'

/** The cards' contents, read from the settings section's rendered tree. */
async function readCards(t) {
  return inspectSettingsTab(t, 'appearance', (tree, { walk, has }, names) => {
    const cards = []
    walk(tree, node => {
      if (!has(node, names.card)) return
      const card = { layout: node.props[names.layout], stats: 0, heat: 0, context: 0, composer: 0, tray: 0, mark: 0 }
      walk(node, child => {
        if (has(child, names.stat)) card.stats += 1
        if (has(child, names.heat)) card.heat += 1
        if (has(child, names.context)) card.context += 1
        if (has(child, names.composer)) card.composer += 1
        if (has(child, names.tray)) card.tray += 1
        if (has(child, names.mark)) card.mark += 1
      })
      cards.push(card)
    })
    return cards
  }, {
    layout: t.surface.attribute('home.preview-layout'),
    card: t.surface('home.preview-card').slice(1),
    stat: t.surface('home.preview-stat').slice(1),
    heat: t.surface('home.heat-cell').slice(1),
    context: t.surface('home.preview-context').slice(1),
    composer: t.surface('home.preview-composer').slice(1),
    tray: t.surface('home.preview-tray').slice(1),
    mark: t.surface('home.preview-mark').slice(1),
  })
}

export default spec({ page: 'settings' }, ({ test }) => {
  test('each home-layout card draws the real pieces of its page', async t => {
    const cards = await readCards(t)
    const byLayout = Object.fromEntries(cards.map(card => [card.layout, card]))
    t.expectThat.equal(cards.length, 3, 'Off, Chat and Code each have a preview')
    t.expectThat.equal(cards.every(card => card.composer === 1), true, 'every preview has one composer')
    t.expectThat.equal(byLayout.off, { layout: 'off', stats: 0, heat: 0, context: 0, composer: 1, tray: 0, mark: 0 }, 'Off leaves out the skin’s brand and dashboard')
    t.expectThat.equal(byLayout.classic, { layout: 'classic', stats: 0, heat: 0, context: 0, composer: 1, tray: 1, mark: 1 }, 'Chat keeps its brand greeting and composer tray')
    t.expectThat.equal(byLayout.studio, { layout: 'studio', stats: 6, heat: 126, context: 1, composer: 1, tray: 0, mark: 1 }, 'Code keeps its six stats, 18×7 heat grid, context row and brand greeting')
  })
})
