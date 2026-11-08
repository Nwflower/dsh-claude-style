/**
 * @capability context-stats
 * @features context-stats, composer
 * @risk Compact statistics cover controls, move React-owned nodes, draw the ring away from the row the popover position draws it in, or leave footer positioning behind on a mode switch.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { seatStatsSession } from '../../fixtures/stats-session.mjs'

const stats = { turns: 2, steps: 20, decodeMs: 10000, decodeTokens: 1000 }
const usage = { uncachedInputTokens: 1000, cacheReadTokens: 99000, cacheWriteTokens: 0, outputTokens: 100 }

async function reading(t) {
  return t.page.evaluate(([cardSelector, lineSelector, part, lineMark, detailMark, ringSelector, meterMark, labelSelector]) => {
    const card = document.querySelector(cardSelector)
    const dock = card.parentElement.querySelector(`[${part}~="composer-dock"]`)
    const row = card.querySelector(`[${part}~="trailing"]`)?.parentElement ?? null
    const line = document.querySelector(lineSelector)
    const ring = document.querySelector(ringSelector)
    const meter = document.querySelector(`[${meterMark}]`)
    const box = element => {
      if (element === null) return null
      const { left, right, top, bottom, width, height } = element.getBoundingClientRect()
      return { left, right, top, bottom, width, height }
    }
    const label = line === null ? null : line.querySelector(labelSelector)
    const visible = line === null ? [] : [...line.children].filter(child => child.getClientRects().length > 0)
      .sort((left, right) => left.getBoundingClientRect().left - right.getBoundingClientRect().left)
    const segments = visible.map(child => (child.textContent ?? '').replace(/\s+/g, ' ').trim())
    return {
      mode: line === null ? null : line.getAttribute(lineMark),
      detail: line === null ? null : line.getAttribute(detailMark),
      lineInDock: line !== null && line.parentElement === dock,
      segments: visible.length,
      order: segments,
      gap: line === null ? null : getComputedStyle(line).columnGap,
      text: segments.join(' '),
      cacheLabel: label === null ? null : label.getClientRects().length,
      ring: box(ring),
      meterHidden: meter !== null && getComputedStyle(meter).display === 'none',
      dock: box(dock),
      dockMinHeight: dock === null ? null : getComputedStyle(dock).minHeight,
      dockPaddingTop: dock === null ? null : getComputedStyle(dock).paddingTop,
      line: box(line),
      toolbar: box(row),
      tools: row === null ? null : box(row.querySelector(`[${part}~="tools"]`)),
      trailing: row === null ? null : box(row.querySelector(`[${part}~="trailing"]`)),
    }
  }, [t.host('composer.card'), t.surface('stats.inline-line'), t.surface.attribute('skin.part'), t.surface.attribute('stats.footer-line'), t.surface.attribute('stats.footer-detail'), t.surface('stats.meter-ring'), t.surface.attribute('stats.context-meter'), t.surface('stats.inline-label')])
}

export default spec({ page: 'stats-inline' }, ({ test }) => {
  test('footer figures share the toolbar, follow alignment and restore other modes', async t => {
    await seatStatsSession(t, stats, usage)
    await t.prefs({ statsPosition: 'footer', composerBottomGap: 'compact', motion: 'reduced' })
    const center = await reading(t)
    t.expectThat.equal(center.mode, 'overlay', 'the wide toolbar has room for compact figures')
    t.expectThat.equal(center.detail, 'directions', 'the wide toolbar takes the footer\'s widest detail')
    t.expectThat.equal(center.lineInDock, true, 'the figures keep the dock the host renders them in')
    t.expectThat.absent(center.dock.height, 'the overlaid figures leave no blank dock below the compact composer')
    t.expectThat.equal([center.dockMinHeight, center.dockPaddingTop], ['0px', '0px'], 'the overlay releases the host\'s reserved statistics row and its top pad')
    t.expectThat.equal(center.segments, 4, 'cost, both token directions and the cache share stand over the toolbar')
    t.expectThat.equal(center.order[0].startsWith('¥') && center.order[1].startsWith('↑') && center.order[2].startsWith('↓') && center.order[3].endsWith('%'), true, 'the cost leads, the directions follow in order and the cache share closes')
    t.expectThat.equal(center.cacheLabel, 0, 'the cache figure carries its percent sign alone')
    t.expectThat.equal(/tok/.test(center.text) && /%$/.test(center.text), true, 'the token figures say their unit and the cache figure closes with its percent sign')
    t.expectThat.visible(center.ring, 'the ring the skin draws stands in the composer row')
    t.expectThat.equal(center.meterHidden, true, 'the host meter leaves the row unpainted behind the ring')
    t.expectThat.boxWithin(center.line, center.toolbar, 'the footer fits inside the toolbar')
    t.expectThat.boxesApart(center.line, center.tools, 'the footer leaves the left controls free')
    t.expectThat.boxesApart(center.line, center.trailing, 'the footer leaves the right controls free')
    await t.prefs({ statsFooterAlign: 'left' })
    const left = await reading(t)
    await t.prefs({ statsFooterAlign: 'right' })
    const right = await reading(t)
    t.expectThat.equal(left.line.left < center.line.left && center.line.left < right.line.left, true, 'alignment moves the compact figures left to right')
    t.expectThat.equal(right.ring, center.ring, 'the alignment moves the figures alone, not the ring')
    await t.prefs({ statsPosition: 'context' })
    const context = await reading(t)
    t.expectThat.equal([context.mode, context.line], [null, null], 'the popover position takes the figures back out of the toolbar')
    t.expectThat.equal(context.ring, center.ring, 'and keeps the ring where the footer drew it')
    t.expectThat.equal(context.meterHidden, true, 'the host meter stays unpainted behind the ring')
    await t.prefs({ statsPosition: 'inline' })
    const inline = await reading(t)
    t.expectThat.equal(inline.mode, null, 'inline mode takes the footer placement off the line')
    t.expectThat.equal(inline.detail, null, 'inline mode takes the footer detail mark off the line')
    t.expectThat.equal(inline.segments > center.segments, true, 'inline mode restores the fuller statistics')
    t.expectThat.equal(center.gap, inline.gap, 'the compact footer keeps the gap the line puts between its figures on its own line')
    await t.prefs({ statsPosition: 'context' })
  })

  test('a roomier footer expands the token total in place before it moves below', async t => {
    await seatStatsSession(t, stats, usage)
    await t.prefs({ statsPosition: 'footer', motion: 'reduced' })
    const at = async width => {
      await t.page.evaluate(([selector, value]) => {
        document.querySelector(selector).parentElement.style.width = `${value}px`
      }, [t.host('composer.card'), width])
      await t.settle()
      return reading(t)
    }

    // The widths where each step first fits depend on the font, so walk outward
    // and read the steps as they appear instead of naming a platform's pixels.
    const found = new Map()
    for (let width = 360; width <= 900; width += 5) {
      const fitted = await at(width)
      if (fitted.mode === 'overlay' && !found.has(fitted.detail)) {
        found.set(fitted.detail, fitted)
        for (const source of ['context', 'inline']) {
          await t.prefs({ statsPosition: source })
          await t.prefs({ statsPosition: 'footer' })
          const switched = await reading(t)
          t.expectThat.equal([switched.mode, switched.detail, switched.order], [fitted.mode, fitted.detail, fitted.order], `switching from ${source} preserves the fitting footer detail without a resize`)
          t.expectThat.boxWithin(switched.line, switched.toolbar, 'the switched footer stays inside the toolbar')
          t.expectThat.boxesApart(switched.line, switched.trailing, 'the switched footer leaves room for the model and ring')
        }
      }
      if (found.has('compact') && found.has('exact') && found.has('directions')) break
    }
    t.expectThat.equal([...found.keys()], ['compact', 'exact', 'directions'], 'the footer expands through every step as the card widens')
    const compact = found.get('compact')
    t.expectThat.equal([compact.mode, compact.segments], ['overlay', 3], 'the narrowest overlay keeps the folded total')
    t.expectThat.equal(compact.order[1].includes('100.1k') && !/[↑↓]/.test(compact.order[1]), true, 'the folded total stays a compact figure with no directions')
    const exact = found.get('exact')
    t.expectThat.equal([exact.mode, exact.segments], ['overlay', 3], 'a wider overlay expands the total without leaving the line')
    t.expectThat.equal(exact.order[1].includes('100,100 tok') && !/[↑↓]/.test(exact.order[1]), true, 'the total becomes its exact grouped value')
    const directions = found.get('directions')
    t.expectThat.equal([directions.mode, directions.segments], ['overlay', 4], 'the widest overlay gives the total up for both directions')
    t.expectThat.equal(directions.order[0].startsWith('¥') && directions.order[1].startsWith('↑') && directions.order[2].startsWith('↓') && directions.order[3].endsWith('%'), true, 'the cost leads, the directions follow and the cache share closes')
  })

  test('a narrow toolbar gives statistics their own line and widening restores the overlay', async t => {
    await seatStatsSession(t, stats, usage)
    await t.prefs({ statsPosition: 'footer', motion: 'reduced' })
    await t.page.setViewportSize({ width: 420, height: 844 })
    await t.page.evaluate(selector => {
      document.querySelector(selector).parentElement.style.width = '320px'
    }, t.host('composer.card'))
    await t.settle()
    const narrow = await reading(t)
    t.expectThat.equal(narrow.mode, 'below', 'the narrow toolbar leaves figures below it')
    t.expectThat.visible(narrow.dock, 'the dock keeps the line\'s own room when the figures move below')
    t.expectThat.boxWithin(narrow.line, narrow.dock, 'the below figures stay inside the dock that holds their room')
    t.expectThat.boxesApart(narrow.line, narrow.tools, 'statistics do not cover the left controls')
    t.expectThat.boxesApart(narrow.line, narrow.trailing, 'statistics do not cover the right controls')
    t.expectThat.visible(narrow.ring, 'the ring keeps its place in the row')
    await t.page.setViewportSize({ width: 1440, height: 900 })
    await t.page.evaluate(selector => {
      document.querySelector(selector).parentElement.style.removeProperty('width')
    }, t.host('composer.card'))
    await t.settle()
    t.expectThat.equal((await reading(t)).mode, 'overlay', 'widening restores the toolbar position')
    await t.prefs({ composerScope: 'off' })
    const off = await reading(t)
    t.expectThat.equal([off.mode, off.meterHidden, off.ring], [null, false, null], 'disabling the restyle clears footer placement, the ring and the hidden meter')
  })
})
