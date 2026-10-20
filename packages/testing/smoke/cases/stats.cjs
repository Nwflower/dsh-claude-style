'use strict'
const { same, check, basicChecks, commonChecks } = require('./_shared.cjs')

/** The context popover's left edge lines up with the meter's; the statistics cases read the same two marks. */
const checkPanelEdge = (r) =>
  check('the skin hands the stylesheet the left edge that lines the panel up with the meter',
    r.context.aligned === true && r.context.edgeAligned === true,
    JSON.stringify({ aligned: r.context.aligned, edgeAligned: r.context.edgeAligned }))

/** Another plugin's popover on the page, and the marks a generation before this one left on it. */
const checkForeignPopover = (r) =>
  check('another plugin\'s popover is not taken for the host\'s panel, and the marks a previous generation left on it are cleared',
    r.context.panelId === 'context-panel' && r.context.strayBlockGone === true && r.context.foreignUnmarked === true,
    JSON.stringify({ panel: r.context.panelId, strayGone: r.context.strayBlockGone, foreignUnmarked: r.context.foreignUnmarked }))

/** The meter's reading, drawn as a pie whichever surface the numbers live on. */
const checkMeterPie = (r) =>
  check('the meter draws its reading as a pie in the popover position too',
    r.context.meterPie === true, JSON.stringify(r.context.meterPie))

module.exports = {
  // The context popover's numbers: read from the host's session projections
  // (never by opening its stat dialogs) and rendered into the panel's block.
  'context-stats'(r) {
    basicChecks(r)
    check('the host\'s stats row is hidden, its pills left as the data\'s own surface',
      r.statsHidden === true && r.statsStrayCards === 0,
      JSON.stringify({ hidden: r.statsHidden, cards: r.statsStrayCards }))
    check('the host\'s panel takes the skin\'s own entrance, stamped by the feature',
      r.context.panelStamped === true, JSON.stringify(r.context.panelStamped))
    checkMeterPie(r)
    checkForeignPopover(r)
    check('with no projection frame yet the block holds the numbers\' place under the real headings',
      same(r.context.skeletonSections, ['Session statistics', 'Token usage']) &&
        r.context.skeletonRows === 8 && r.context.skeletonItemHeight === 37,
      JSON.stringify({ sections: r.context.skeletonSections, rows: r.context.skeletonRows, itemHeight: r.context.skeletonItemHeight }))
    check('the first projection frame replaces the place with the numbers read from the projections',
      r.context.opened === true && r.context.expanded === 'true' && r.context.hostRows === 3 &&
        r.context.skeletonGone === true &&
        same(r.context.sections, ['Session statistics', 'Token usage']) &&
        same(r.context.labels, ['LLM time', 'Tool call time', 'Avg time to first token (TTFT)', 'Tokens per second (TPS)', 'Cache hit', 'Uncached input', 'Cached input', 'Output']),
      JSON.stringify({ opened: r.context.opened, hostRows: r.context.hostRows, gone: r.context.skeletonGone, sections: r.context.sections, labels: r.context.labels }))
    check('with the hover preference on, a press on the open panel\'s ring leaves the panel up',
      r.meterPanelAfterPress === true && r.meterExpandedAfterPress === 'true',
      JSON.stringify({ panel: r.meterPanelAfterPress, expanded: r.meterExpandedAfterPress }))
    check('the rows carry the host\'s own formatting: compact durations, exact token counts, a cache-hit share',
      same(r.context.values, ['1.2s', '0.4s', '0.8s', '105 tok/s', '90%', '1,000 tok', '9,000 tok', '105 tok']),
      JSON.stringify(r.context.values))
    check('a projection frame rewrites the block while the popover is open',
      r.context.pushed === '1m1s', JSON.stringify(r.context.pushed))
    check('the block\'s figures count to a new reading instead of jumping to it',
      r.context.pushedDuring !== null && r.context.pushedDuring !== '1.2s' &&
        r.context.pushedDuring !== '1m1s',
      JSON.stringify({ during: r.context.pushedDuring, after: r.context.pushed }))
    checkPanelEdge(r)
    check('leaving the meter closes the popover and takes the block with it',
      r.context.closedAfterLeave === true, JSON.stringify(r.context.closedAfterLeave))
    check('the meter\'s room survives a reading taken with no box',
      r.context.roomBefore !== '' && /^\d+px$/.test(r.context.roomAfter || ''),
      JSON.stringify({ before: r.context.roomBefore, after: r.context.roomAfter }))
    // A mobile plugin's statistics strip takes the dock's own band; the overlay's
    // line gives that band up, and only that band (issue #47).
    const withStrip = r.context.bandWith || {}
    const removed = r.context.bandRemoved || {}
    const restored = r.context.bandRestored || {}
    check('a mobile plugin\'s statistics strip is measured, and the dock\'s line is lifted by its height alone',
      withStrip.stripHeight > 0 && withStrip.lift === `${withStrip.stripHeight}px` &&
        withStrip.lowestLine !== null && withStrip.lowestLine <= withStrip.stripBottom,
      JSON.stringify(withStrip))
    check('the strip leaving takes the lift with it, and the band comes back with it',
      removed.gone === true && removed.lift === '' &&
        restored.stripHeight === withStrip.stripHeight && restored.lift === withStrip.lift,
      JSON.stringify({ removed: removed.lift, restored: restored.lift }))
    // The composer's own switch is live, and the numbers outlive it: the meter
    // is taken from the host's dock when the composer's mark is not there.
    const composerOff = r.context.composerOff || {}
    const composerBack = r.context.composerBack || {}
    check('with the composer restyle switched off the numbers still read the host\'s docked meter',
      composerOff.gate === false && composerOff.marked === false &&
        composerOff.ramp === 'context' && composerOff.pie === true,
      JSON.stringify(composerOff))
    check('the composer restyle coming back marks the meter again',
      composerBack.gate === true && composerBack.marked === true,
      JSON.stringify(composerBack))
    commonChecks(r)
  },
  'stats-compact'(r) {
    basicChecks(r)
    check('the compact row is hidden too, and no card of the skin\'s own is left',
      r.statsHidden === true && r.statsStrayCards === 0,
      JSON.stringify({ hidden: r.statsHidden, cards: r.statsStrayCards }))
    check('the compact row carries no trigger of its own; the meter still opens the panel',
      r.context.panelStamped === true && r.context.opened === true && r.context.expanded === 'true',
      JSON.stringify({ stamped: r.context.panelStamped, opened: r.context.opened, expanded: r.context.expanded }))
    checkMeterPie(r)
    checkForeignPopover(r)
    check('with no projection frame yet the place is the compact one: four items in a 2x2 grid, no section headings',
      same(r.context.skeletonSections, []) &&
        r.context.skeletonRows === 4 && r.context.skeletonItemHeight === 37,
      JSON.stringify({ sections: r.context.skeletonSections, rows: r.context.skeletonRows, itemHeight: r.context.skeletonItemHeight }))
    check('the compact block keeps four figures: the total time, the first-token average, the output speed and the cache-hit share in one 2x2 grid with no section headings',
      r.context.skeletonGone === true &&
        same(r.context.sections, []) &&
        same(r.context.labels, ['Total time', 'Avg time to first token (TTFT)', 'Tokens per second (TPS)', 'Cache hit']) &&
        same(r.context.values, ['1.6s', '0.8s', '105 tok/s', '90%']),
      JSON.stringify({ labels: r.context.labels, values: r.context.values }))
    check('the total is the model time plus the tool calls\'',
      r.context.pushed === '1m1s', JSON.stringify(r.context.pushed))
    checkPanelEdge(r)
    commonChecks(r)
  },
  // The numbers asked onto a line of their own: the host's statistics row and
  // its detail dialog stand, the skin's block is never built, and the
  // composer's dock keeps the host's own placement instead of the overlay.
  // The numbers asked onto a line of their own: the host's words around the
  // host's figures, none of the host's row's glyphs, the cache share and the
  // meter each in their colour band, and the popover taking them back live.
  'stats-inline'(r) {
    basicChecks(r)
    check('the line stands under the card, in the host\'s own placement, with the meter at its end',
      r.statsInline.attr === 'inline' && r.statsInline.dockPosition === 'static' &&
        r.statsInline.rowDisplay === 'none' && r.statsInline.meterPosition === 'static' &&
        r.statsInline.text !== null && r.statsInline.glyphs === 0,
      JSON.stringify({ attr: r.statsInline.attr, dock: r.statsInline.dockPosition, row: r.statsInline.rowDisplay, meter: r.statsInline.meterPosition, glyphs: r.statsInline.glyphs }))
    check('the figures are the host\'s own words around the host\'s own numbers',
      same(r.statsInline.figures, ['2', '374', '279', '777,345,457', '7,345,457', '99']) &&
        r.statsInline.text.indexOf('2 轮 374 步') === 0 &&
        r.statsInline.text.indexOf('缓存命中') !== -1,
      JSON.stringify({ figures: r.statsInline.figures, text: r.statsInline.text }))
    check('the figures are text a count rewrites in place, with no character carrying a span or an entrance of its own',
      r.statsInline.digits === 0, JSON.stringify(r.statsInline.digits))
    check('a new reading counts to its value: part way through the count the figures have moved without having arrived, and they settle on the reading',
      (r.statsInline.count.before || []).length === 6 &&
        r.statsInline.count.during.some((value, index) => value !== r.statsInline.count.before[index] && value !== r.statsInline.count.after[index]) &&
        same(r.statsInline.count.after, ['8', '400', '120', '777,345,457', '7,345,457', '99']),
      JSON.stringify(r.statsInline.count))
    check('the cache share and the meter\'s occupancy take their colour bands: the share\'s band reaches its figure and percent sign alone, and the meter\'s reading is a pie cut in the occupancy\'s own colour',
      r.statsInline.cacheRamp !== null && r.statsInline.cacheRamp.span === 'high' &&
        r.statsInline.cacheRamp.color === r.statsInline.cacheRamp.tail &&
        r.statsInline.cacheLabelColor !== null && r.statsInline.cacheLabelColor !== r.statsInline.cacheRamp.color &&
        r.statsInline.meterRamp !== null && r.statsInline.meterRamp.kind === 'context' && r.statsInline.meterRamp.span === 'high' &&
        r.statsInline.pie === true && r.statsInline.ringVisibility === 'hidden' && r.statsInline.pieTone === true,
      JSON.stringify({ cache: r.statsInline.cacheRamp, cacheWords: r.statsInline.cacheLabelColor, meter: r.statsInline.meterRamp, pie: r.statsInline.pie, ring: r.statsInline.ringVisibility, tone: r.statsInline.pieTone }))
    check('asking the numbers back into the popover takes the line away, live',
      r.statsInline.backAttr === 'context' && r.statsInline.backLine === 0,
      JSON.stringify({ attr: r.statsInline.backAttr, line: r.statsInline.backLine }))
    check('the figures stand apart by the line\'s own gap: no separator glyph between them',
      r.statsInline.separators === 0, JSON.stringify(r.statsInline.separators))
    check('the line is the panel\'s second trigger: pressing it opens the host\'s panel with the session\'s rows, and pressing it again closes it',
      r.statsInline.role === 'button' && r.statsInline.panelOpened === true &&
        r.statsInline.expanded === 'true' && r.statsInline.panelRows > 0 && r.statsInline.panelClosed === true,
      JSON.stringify({ role: r.statsInline.role, opened: r.statsInline.panelOpened, expanded: r.statsInline.expanded, rows: r.statsInline.panelRows, closed: r.statsInline.panelClosed }))
    check('opening and closing on hover stays the meter\'s path: a pointer resting on the figures leaves the panel down',
      r.statsInline.hoverOpened === false, JSON.stringify(r.statsInline.hoverOpened))
    check('a card with room shows every figure',
      r.statsInline.roomy.counts === true && r.statsInline.roomy.cacheLabel === true &&
        r.statsInline.roomy.input === true && r.statsInline.roomy.output === true &&
        r.statsInline.roomy.total === false && r.statsInline.roomy.meterTight === false &&
        r.statsInline.roomy.meterNumber === true,
      JSON.stringify(r.statsInline.roomy))
    check('a card too narrow drops the cache words, the turns and steps and the meter\'s number, and merges the two token figures into one',
      r.statsInline.tight.cacheLabel === false && r.statsInline.tight.counts === false &&
        r.statsInline.tight.meterTight === true && r.statsInline.tight.meterNumber === false &&
        r.statsInline.tight.input === false && r.statsInline.tight.output === false &&
        r.statsInline.tight.total === true && /^[\d,]+$/.test(r.statsInline.tight.totalText || ''),
      JSON.stringify(r.statsInline.tight))
    check('one step tighter folds the figures into k, M and B',
      r.statsInline.tightest.total === true && /^[\d.]+[kMB]$/.test(r.statsInline.tightest.totalText || ''),
      JSON.stringify(r.statsInline.tightest))
    check('a card with room again gets every figure back',
      r.statsInline.backToRoom.counts === true && r.statsInline.backToRoom.cacheLabel === true &&
        r.statsInline.backToRoom.input === true && r.statsInline.backToRoom.output === true &&
        r.statsInline.backToRoom.total === false && r.statsInline.backToRoom.meterNumber === true,
      JSON.stringify(r.statsInline.backToRoom))
    commonChecks(r)
  },
  studio(r) {
    basicChecks(r)
    check('the usage panel registers into the dock list seat with an id',
      Array.isArray(r.slotRegistrations) && r.slotRegistrations.length === 1 &&
        r.slotRegistrations[0].key === 'conversation.input.dock' &&
        r.slotRegistrations[0].id === 'claude-style-usage' &&
        r.slotRegistrations[0].component === 'function',
      JSON.stringify(r.slotRegistrations))
    const renders = r.panelRenders || {}
    const drew = (tab, className) => renders[tab] !== undefined && renders[tab].error === null &&
      renders[tab].classes.includes(className)
    check('the usage panel renders its Overview tab: stat cells and heat grid',
      drew('overview', 'dsh-claude-home-stat') && drew('overview', 'dsh-claude-home-heat'),
      JSON.stringify(renders.overview))
    // The heat grid's cells: 26 weeks of days, every one of them naming its
    // own day's tokens, whichever source the panel drew from.
    const tips = (renders.overview && renders.overview.tips) || []
    check('every heat cell names the day\'s tokens',
      tips.length > 150 && tips.every((tip) => / — [\d.]+[kMB]? tokens$/.test(tip)),
      `${tips.length} tips: ${JSON.stringify(tips.slice(0, 3))}`)
    const said = (tab, pattern) => renders[tab] !== undefined && renders[tab].texts.some((text) => pattern.test(text))
    check('all time: the peak hour and the book line read the whole history (500k steps down to The Brothers Karamazov)',
      said('overview', /^3 AM$/) && said('overview', /^You've used ~1× the tokens in The Brothers Karamazov\.$/),
      JSON.stringify(renders.overview && renders.overview.texts))
    check('7d: the peak hour and the book line follow the range window (250k steps down to Dracula)',
      said('overview-7d', /^3 PM$/) && said('overview-7d', /^You've used ~1× the tokens in Dracula\.$/),
      JSON.stringify(renders['overview-7d'] && renders['overview-7d'].texts))
    check('the usage panel renders its Models tab: stacked chart and ranked list',
      drew('models', 'dsh-claude-home-chart-seg') && drew('models', 'dsh-claude-home-model'),
      JSON.stringify(renders.models))
    const rows = (tab) => (renders[tab] === undefined ? 0
      : renders[tab].classes.filter((name) => name === 'dsh-claude-home-model').length)
    check('the folded model list shows six rows and a "Show 2 more" row',
      rows('models') === 6 && said('models', /^Show 2 more$/),
      JSON.stringify({ rows: rows('models'), texts: renders.models && renders.models.texts.slice(-3) }))
    const mascot = r.mascot || {}
    check('the crab stands on the hero card idling, drawn from its inlined sheet and ink mask',
      mascot.mounted === true && mascot.ready === true && mascot.animation === 'idle' && mascot.body === true && mascot.ink === true,
      JSON.stringify(mascot))
    check('a click on its left half reaches the crab and pokes it; the poke plays back to idle without waking a pass',
      mascot.reachable === true && mascot.poked === 'poke-left' && mascot.afterPoke === 'idle' && mascot.passesDuring === 0,
      JSON.stringify(mascot), 'timing')
    check('with the animation choice on "reduced" it holds the idle still frame; a click still pokes it',
      mascot.reducedAttr === 'reduced' && mascot.stillFrame === 'translate(0px, 0px)' && mascot.stillAnimations === 0 &&
        mascot.reducedClick === 'poke-left',
      JSON.stringify(mascot), 'timing')
    check('the crab leaves with the hero page', mascot.afterHero === false, JSON.stringify(mascot))
    check('the studio hero mark is on the document on the hero page and off it elsewhere, and the studio rules reach the stack',
      r.homeHero !== undefined && r.homeHero.onHero === true && r.homeHero.offHero === false && r.homeHero.stackMaxWidth === '720px',
      JSON.stringify(r.homeHero))
    check('the panel reads the roll-up again rather than standing on the figures it opened with: a reader coming back to the window past the floor, and a panel standing on the hero past the period',
      r.homeRefresh !== undefined && r.homeRefresh.afterWake > r.homeRefresh.atStart &&
        r.homeRefresh.afterTick > r.homeRefresh.afterWake,
      JSON.stringify(r.homeRefresh))
    check('the studio hero draws the conversation\'s permission trigger in the card\'s mode strip, with no segment group',
      r.heroPerm !== undefined && r.heroPerm.trigger === true && r.heroPerm.segments === 0 &&
        r.heroPerm.label === 'Accept edits' && r.heroPerm.disabled === false,
      JSON.stringify(r.heroPerm))
    check('the usage panel draws under the hero stack only, so sending a message never shows it full width',
      r.panelDisplay !== undefined && r.panelDisplay.hero === 'flex' && r.panelDisplay.coldStart === 'flex' &&
        r.panelDisplay.conversation === 'none',
      JSON.stringify(r.panelDisplay))
    const cold = r.coldStart || {}
    check('the cold start screen carries the usage panel on the skin\'s own seat, given back once the dock arrives',
      cold.seat === true && cold.rendered === true && cold.seatAfterDock === false && cold.unmountedAfterDock === true,
      JSON.stringify(cold))
    check('the cold start screen shows the permission trigger on the new-session default, inert, and opens no card',
      cold.trigger !== null && cold.trigger !== undefined && cold.segments === 0 &&
        cold.trigger.label === 'Accept edits' && cold.trigger.disabled === true && cold.openCard === 0,
      JSON.stringify({ segments: cold.segments, trigger: cold.trigger, open: cold.openCard }))
    check('the open model list shows every row and a "Show less" row',
      rows('models-open') === 8 && said('models-open', /^Show less$/) && !said('models-open', /^Show \d+ more$/),
      JSON.stringify({ rows: rows('models-open'), texts: renders['models-open'] && renders['models-open'].texts.slice(-3) }))
    check('the composer restyle keeps running', r.composerRestyle === true, JSON.stringify(r.composerRestyle))
    commonChecks(r)
  },
}
