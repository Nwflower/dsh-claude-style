'use strict'
const { MARKUP, SKIN_FACE, SKIN_HAT, same, check, contrast, basicChecks, commonChecks } = require('./_shared.cjs')

module.exports = {
  // The skin's own Claude palette: the ivory and warm-black canvases, the clay
  // accent and the raised card fill, read from the live custom properties.
  brand(r) {
    basicChecks(r)
    const palette = r.claudePalette || {}
    check('the Claude brand keeps its ivory and warm-black canvases and the clay accent',
      palette.canvas === 'rgb(252, 252, 251)' && palette.accent === '#d97757' && !!palette.dark &&
        palette.dark.canvas === 'rgb(20, 20, 19)' && palette.dark.accent === '#d97757' && palette.dark.raised === '#1e1e1d',
      JSON.stringify(palette))
    commonChecks(r)
  },
  // The classic hero: the welcome is drawn on arrival and held between passes,
  // and the crab stands on that page's card too.
  hero(r) {
    basicChecks(r)
    const greeting = r.greeting || {}
    check('the classic hero draws its welcome on arrival and keeps it between passes',
      typeof greeting.low === 'string' && greeting.low !== 'Host greeting' && greeting.low !== '' &&
        greeting.held === greeting.low && typeof greeting.high === 'string' && greeting.high !== 'Host greeting' &&
        greeting.high !== greeting.low,
      JSON.stringify(greeting))
    check('the classic hero page carries the crab too', r.classicCrab === true, JSON.stringify(r.classicCrab))
    commonChecks(r)
  },
  // The conversation header's tab strip: the pill is drawn under the active tab
  // without sliding in, slides to the tab a switch selects, and the teardown
  // takes it back off.
  'view-tabs'(r) {
    basicChecks(r)
    const pill = r.viewPill || {}
    const under = (s) => !!s && s.attr && s.content !== 'none' && Math.abs(s.x - s.itemX) < 0.5 &&
      Math.abs(s.w - s.itemW) < 0.5 && s.itemFill === 'rgba(0, 0, 0, 0)'
    check('the conversation header\'s tab strip is stamped for the stylesheet', pill.stamped === true, JSON.stringify(pill.stamped))
    check('the view tabs draw their pill under the active tab without sliding in',
      under(pill.first) && pill.first.slides.length === 0, JSON.stringify(pill.first))
    check('a view switch slides the pill to the newly active tab',
      under(pill.switched) && pill.switched.slides.indexOf('transform') !== -1 && pill.switched.x > pill.first.x,
      JSON.stringify(pill.switched), 'timing')
    check('the pill slides whatever the system motion setting: no reduced-motion rule reaches it',
      pill.reducedMotionRules === 0, `${pill.reducedMotionRules} rules`)
    check('teardown takes the pill, its placement and the strip stamp off the view tabs', pill.left === false, JSON.stringify(pill.left))
    commonChecks(r)
  },
  // The header band: the conversation's title and the header's control clusters
  // in the desktop caption row, and the row they leave behind.
  'header-band'(r) {
    basicChecks(r)
    const b = r.band || {}
    const laid = b.laid || {}
    const marks = laid.marks || {}
    const right = b.viewportRight - (b.controls + b.air)
    /** The caption row's own middle for a 28px box; the title sits the skin's optical drop below it. */
    const middle = Math.round((b.band - 28) / 2)
    const top = middle + b.titleDrop
    // Where the row sits with the lift taken back out: the header's own inset.
    const naturalRow = laid.row.y - parseFloat(laid.rowLift || '0')
    check('the caption row takes both sides: the title at the row\'s left, the two control clusters against the caption buttons',
      marks.band === 'title actions' && marks.title === true && marks.utilities === true && marks.corner === true &&
        laid.title.x === laid.row.x && laid.title.y === top &&
        laid.utilities.y === middle && laid.corner.right === right && laid.corner.y === middle &&
        laid.utilities.right === laid.corner.x - b.air,
      JSON.stringify(laid))
    check('the pieces placed there are fixed, stacked over the page and clickable inside the shell\'s drag region',
      laid.titlePosition === 'fixed' && laid.titleZ === '30' &&
        laid.titleRegion === 'no-drag' && laid.utilitiesRegion === 'no-drag' && laid.cornerRegion === 'no-drag',
      JSON.stringify({ position: laid.titlePosition, z: laid.titleZ, regions: [laid.titleRegion, laid.utilitiesRegion, laid.cornerRegion] }))
    check('the title is handed the room left between its own edge and the controls once the strip\'s width is reserved, and the row it left tucks under it',
      laid.titleLeft === laid.row.x + 'px' &&
        laid.titleMax === laid.utilities.x - b.air - ((laid.strip.right - laid.strip.x) + b.air) - laid.title.x + 'px' &&
        laid.row.y === laid.title.y + 28 - b.tuck && laid.rowPosition === 'relative' && laid.rowOffset === laid.rowLift &&
        laid.row.y === laid.rowLift.replace('px', '') * 1 + laid.header.y + parseFloat(laid.headerPaddingTop) &&
        laid.preset.x === laid.row.x,
      JSON.stringify({ left: laid.titleLeft, max: laid.titleMax, lift: laid.rowLift, offset: laid.rowOffset, row: laid.row, header: laid.header, preset: laid.preset, utilities: laid.utilities, strip: laid.strip }))
    const solo = b.solo || {}
    check('with the corner seat empty — the right sidebar is open — the cluster that is there still lifts, into the corner\'s own place',
      solo.marks.band === 'title actions' && solo.marks.corner === false && solo.utilities.right === right,
      JSON.stringify(solo))
    const tight = b.tight || {}
    check('when the shell\'s own seat takes the row\'s left end, both sides stay in the header\'s row: no marker, no stamp, the row back at its own inset',
      tight.marks.band === null && tight.marks.row === false && tight.marks.title === false &&
        tight.marks.utilities === false && tight.marks.corner === false &&
        tight.row.y === naturalRow && tight.title.y > b.band && tight.utilities.y > b.band,
      JSON.stringify({ tight: tight, natural: naturalRow }))
    const off = b.off || {}
    const back = b.back || {}
    check('switching the feature off hands the row back whole — the strip the other feature placed stays — and switching it on places both sides again',
      off.marks.band === null && off.marks.title === false && off.marks.utilities === false && off.marks.corner === false &&
        off.stripStamped === true &&
        back.marks.band === 'title actions' && back.marks.title === true && back.marks.utilities === true,
      JSON.stringify({ off: off, back: back }))
    const left = b.left || {}
    check('taking the desktop shell\'s marker away leaves no band marker and no stamps behind',
      left.band === null && left.row === false && left.title === false && left.utilities === false && left.corner === false,
      JSON.stringify(left))
    commonChecks(r)
  },
  // The composer's host controls, marked by structure, the marks their teardown
  // leaves behind, and the host's own Enter on an open menu.
  composer(r) {
    basicChecks(r)
    const controls = r.controls || {}
    check('the composer\'s host controls are marked by structure: commands, access, send',
      controls.commands === 'commands' && controls.access === 'access' && controls.send === 'send', JSON.stringify(controls))
    check('the submit button\'s mark follows its glyph to stop and back',
      controls.stopping === 'stop' && controls.back === 'send', JSON.stringify(controls))
    check('teardown takes the draft marks off the composer cards', r.leftDraftMarks === 0, `${r.leftDraftMarks} left`)
    check('teardown takes the control marks off the host controls', r.leftControlMarks === 0, `${r.leftControlMarks} left`)
    check('Enter on an open composer menu reaches the host', same(r.keys, ['host picked the menu item']), JSON.stringify(r.keys))
    commonChecks(r)
  },
  // The sidebar's search box: placed in the brand row, resting hidden, opening
  // the host's modal through a root of the skin's own.
  search(r) {
    basicChecks(r)
    const search = r.search || {}
    check('the search box goes in the brand row beside the brand, and rests hidden until the sidebar is hovered',
      search.placed === true && search.rowMarked === true && search.resting === 'hidden', JSON.stringify(search))
    check('pressing the search box renders the host modal through a root of the skin\'s own', search.modalRendered === true, JSON.stringify(search))
    check('teardown takes the search box, its row mark and its root away',
      search.left === 0 && search.rootUnmounted === true, JSON.stringify(search))
    commonChecks(r)
  },
  // The account row's self-built drawer: the header, the plugin rows, the
  // settings row, the nickname and the avatar.
  account(r) {
    basicChecks(r)
    check('synthetic path: the popover carries the header, the plugin rows and the settings row',
      r.drawer !== null && same(r.drawer, ['action', 'embed', 'settings']) && r.syntheticHeader === true,
      JSON.stringify({ drawer: r.drawer, header: r.syntheticHeader }))
    check('synthetic path injects nothing into a host menu', r.syntheticInject === 0, `${r.syntheticInject} containers`)
    check('a custom nickname outranks the signed-in profile', r.accountUser === 'Tester', JSON.stringify(r.accountUser))
    check('avatar is an <img> sent without a referrer', r.photo !== null && r.photo.referrerPolicy === 'no-referrer', JSON.stringify(r.photo))
    check('the self-built drawer matches the account row box',
      r.syntheticBox !== null && r.syntheticBox.popoverLeft === r.syntheticBox.buttonLeft &&
        r.syntheticBox.popoverWidth === r.syntheticBox.buttonWidth,
      JSON.stringify(r.syntheticBox))
    check('the closed drawer takes its parked rows out of the paint tree',
      r.syntheticVisibility === 'hidden' && r.syntheticRowVisibility === 'hidden',
      JSON.stringify({ panel: r.syntheticVisibility, row: r.syntheticRowVisibility }))
    commonChecks(r)
  },
  // The permission control's ladder: the catalog in the skin order, with the
  // Auto review tier offered while the catalog carries that preset.
  permissions(r) {
    basicChecks(r)
    check('the permission ladder is the catalog, in the skin order',
      same(r.permRows.map(function (row) { return row.preset }), ['read-only', 'workspace-write', 'auto', 'danger-full-access']),
      JSON.stringify(r.permRows))
    check('the Auto review tier is offered while the catalog carries the preset',
      r.permAutoRowDisplay !== null && r.permAutoRowDisplay !== 'none' &&
        r.permRows[2].text.indexOf('Auto review') === 0,
      JSON.stringify({ popoverRow: r.permAutoRowDisplay, row: r.permRows[2] }))
    commonChecks(r)
  },
  // The context popover's numbers: read from the host's session projections
  // (never by opening its stat dialogs) and rendered into the panel's block.
  'context-stats'(r) {
    basicChecks(r)
    check('the host\'s stats row is hidden, its pills left as the data\'s own surface',
      r.statsHidden === true && r.statsStrayCards === 0,
      JSON.stringify({ hidden: r.statsHidden, cards: r.statsStrayCards }))
    check('the host\'s panel takes the skin\'s own entrance, stamped by the feature',
      r.context.panelStamped === true, JSON.stringify(r.context.panelStamped))
    check('another plugin\'s popover is not taken for the host\'s panel, and the marks a previous generation left on it are cleared',
      r.context.panelId === 'context-panel' && r.context.strayBlockGone === true && r.context.foreignUnmarked === true,
      JSON.stringify({ panel: r.context.panelId, strayGone: r.context.strayBlockGone, foreignUnmarked: r.context.foreignUnmarked }))
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
    check('the rows carry the host\'s own formatting: compact durations, exact token counts, a cache-hit share',
      same(r.context.values, ['1.2s', '0.4s', '0.8s', '105 tok/s', '90%', '1,000 tok', '9,000 tok', '105 tok']),
      JSON.stringify(r.context.values))
    check('a projection frame rewrites the block while the popover is open',
      r.context.pushed === '1m1s', JSON.stringify(r.context.pushed))
    check('the skin hands the stylesheet the left edge that lines the panel up with the meter',
      r.context.aligned === true && r.context.edgeAligned === true,
      JSON.stringify({ aligned: r.context.aligned, edgeAligned: r.context.edgeAligned }))
    check('leaving the meter closes the popover and takes the block with it',
      r.context.closedAfterLeave === true, JSON.stringify(r.context.closedAfterLeave))
    check('the meter\'s room survives a reading taken with no box',
      r.context.roomBefore !== '' && /^\d+px$/.test(r.context.roomAfter || ''),
      JSON.stringify({ before: r.context.roomBefore, after: r.context.roomAfter }))
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
    check('another plugin\'s popover is not taken for the host\'s panel, and the marks a previous generation left on it are cleared',
      r.context.panelId === 'context-panel' && r.context.strayBlockGone === true && r.context.foreignUnmarked === true,
      JSON.stringify({ panel: r.context.panelId, strayGone: r.context.strayBlockGone, foreignUnmarked: r.context.foreignUnmarked }))
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
    check('the skin hands the stylesheet the left edge that lines the panel up with the meter',
      r.context.aligned === true && r.context.edgeAligned === true,
      JSON.stringify({ aligned: r.context.aligned, edgeAligned: r.context.edgeAligned }))
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
    check('the usage panel draws under the hero stack only, so sending a message never shows it full width',
      r.panelDisplay !== undefined && r.panelDisplay.hero === 'flex' && r.panelDisplay.coldStart === 'flex' &&
        r.panelDisplay.conversation === 'none',
      JSON.stringify(r.panelDisplay))
    const cold = r.coldStart || {}
    check('the cold start screen carries the usage panel on the skin\'s own seat, given back once the dock arrives',
      cold.seat === true && cold.rendered === true && cold.seatAfterDock === false && cold.unmountedAfterDock === true,
      JSON.stringify(cold))
    check('the cold start screen shows the permission segments on the new-session default, disabled',
      Array.isArray(cold.segments) && cold.segments.length === 4 &&
        cold.segments.every((item) => item.disabled === true && item.active === (item.label === 'Edit')),
      JSON.stringify(cold.segments))
    const coldPill = cold.pill
    check('the permission segments draw their sliding pill under the active segment',
      !!coldPill && coldPill.attr && coldPill.content !== 'none' && Math.abs(coldPill.x - coldPill.itemX) < 0.5 &&
        Math.abs(coldPill.w - coldPill.itemW) < 0.5 && coldPill.itemFill === 'rgba(0, 0, 0, 0)',
      JSON.stringify(coldPill))
    check('the open model list shows every row and a "Show less" row',
      rows('models-open') === 8 && said('models-open', /^Show less$/) && !said('models-open', /^Show \d+ more$/),
      JSON.stringify({ rows: rows('models-open'), texts: renders['models-open'] && renders['models-open'].texts.slice(-3) }))
    check('the composer restyle keeps running', r.composerRestyle === true, JSON.stringify(r.composerRestyle))
    commonChecks(r)
  },
  'late-forms'(r) {
    check('apply() completes', r.applyError === null, r.applyError)
    check('the store stays on the defaults (the studio home) until the namespace is served',
      r.lateBefore === 'studio', JSON.stringify(r.lateBefore))
    check('a namespace served after apply still binds the form and its value (classic)',
      r.lateAfter === null && r.homeLayoutAttr === null,
      JSON.stringify({ after: r.lateAfter, final: r.homeLayoutAttr }))
    commonChecks(r)
  },
  popovers(r) {
    basicChecks(r)
    check('a pointer crossing a trigger opens nothing before the dwell elapses',
      r.permOpenAtDwell === 0, `${r.permOpenAtDwell} open at 50 ms`)
    check('a pointer that stays the dwell out opens the card',
      r.permOpenPastDwell === 1, `${r.permOpenPastDwell} open past the dwell`)
    check('an open card answers the host\'s menu role',
      r.permCardRole === 'menu', JSON.stringify(r.permCardRole))
    check('opening the account drawer folds the permission card',
      r.drawerUp === 1 && r.permFoldedByDrawer === 0,
      JSON.stringify({ drawer: r.drawerUp, permission: r.permFoldedByDrawer }))
    check("opening the hero row's host menu folds the drawer",
      r.heroUp === true && r.drawerFoldedByHero === 0,
      JSON.stringify({ hero: r.heroUp, drawer: r.drawerFoldedByHero }))
    check('opening the permission card folds the hero menu',
      r.permReopened === 1 && r.heroFoldedByPerm === false,
      JSON.stringify({ permission: r.permReopened, hero: r.heroFoldedByPerm }))
    check("the row's other picker opens over the permission card and folds it",
      r.presetUp === true && r.permFoldedByPreset === 0,
      JSON.stringify({ preset: r.presetUp, permission: r.permFoldedByPreset }))
    check('crossing to the row\'s other trigger folds the picker left behind',
      r.workspaceUpAfterCrossing === true && r.presetFoldedBySibling === false && r.heroCardsUp === 1,
      JSON.stringify({ workspace: r.workspaceUpAfterCrossing, preset: r.presetFoldedBySibling, cards: r.heroCardsUp }))
    check('the preset card is stamped as the preset picker and keeps its row glyph',
      r.presetCard !== null && r.presetCard.kind === 'preset' && r.presetCard.iconsShown === 1 && r.presetCard.rowHeight === 32,
      JSON.stringify(r.presetCard))
    check('the workspace card is drawn as a folder menu: plain text rows, the add row included, set closer together',
      r.workspaceCard !== null && r.workspaceCard.kind === 'workspace' && r.workspaceCard.iconsShown === 0 &&
        r.workspaceCard.rowHeight === 26,
      JSON.stringify(r.workspaceCard))
    check('the hero card opens above its trigger, right-aligned with it, by the skin\'s 6px air',
      r.workspacePlacement !== null && r.workspacePlacement.side === 'above' &&
        r.workspacePlacement.airAbove === 6 && Math.abs(r.workspacePlacement.rightDelta) <= 1,
      JSON.stringify(r.workspacePlacement))
    check('with no room above, the hero card flips below its trigger',
      r.workspacePlacementTight !== null && r.workspacePlacementTight.side === 'below' &&
        r.workspacePlacementTight.airBelow === 6,
      JSON.stringify(r.workspacePlacementTight))
    check('leaving the row leaves no hero picker up',
      r.heroMenusLeft === 0, `${r.heroMenusLeft} open`)
    check('leaving every trigger leaves no card up',
      r.cardsLeftAfterLeave === 0, `${r.cardsLeftAfterLeave} open`)
    commonChecks(r)
  },
  settings(r) {
    basicChecks(r)
    const settings = r.settings || {}
    check('the settings section registers with the settings dialog', settings.registered === true, JSON.stringify(settings.registered))
    const expected = {
      general: ['username', 'motion', 'autoPopover', 'banLocale'],
      appearance: ['brand', 'palette', 'typeface', 'mascot', 'mascotScope'],
      composer: ['composerScope', 'homeLayout', 'modelPicker', 'quickProviders', 'peakrate', 'permissionsControl'],
      sidebar: ['collapseFooter', 'sidebarSearch', 'workspaceView', 'dockCards'],
      conversation: ['turnStatus', 'turnNav', 'chatAnimations', 'caretMotion', 'viewTabs', 'headerBand'],
    }
    const pages = settings.pages || {}
    for (const tab of Object.keys(expected)) {
      const page = pages[tab] || {}
      check(`the ${tab} tab is selected in the five-tab strip and carries its rows, every sub-row enabled`,
        JSON.stringify(page.tabs) === JSON.stringify(Object.keys(expected)) && page.selected === tab &&
          JSON.stringify(page.rows) === JSON.stringify(expected[tab]) && Array.isArray(page.disabled) && page.disabled.length === 0,
        JSON.stringify(page))
    }
    const off = settings.parentsOff || {}
    check('a sub-row greys out while its parent is off: the mascot\'s place with the mascot off, the quick providers and the peak rate meter with the model picker off',
      !!off.appearance && JSON.stringify(off.appearance.disabled) === '["mascotScope"]' &&
        !!off.composer && JSON.stringify(off.composer.disabled) === '["quickProviders","peakrate"]',
      JSON.stringify(off))
    commonChecks(r)
  },
  'dock-cards'(r) {
    basicChecks(r)
    const dock = r.dock || {}
    const card = dock.card || {}
    const flush = dock.flush || {}
    const back = dock.back || {}
    const carded = (one) => one.radius === '16px' && parseFloat(one.border) > 0 &&
      one.overflow === 'hidden' && one.shadow !== 'none'
    const flat = (one) => one.margin === '0px' && one.radius === '0px' &&
      parseFloat(one.border) === 0 && one.overflow === 'visible' && one.shadow === 'none'
    check('every docked pane floats as the skin\'s card: 8px inside the column, a hairline, a 16px radius and the host\'s elevation',
      card.look === 'card' && card.empty.margin === '8px' && card.pane.margin === '8px' &&
        carded(card.empty) && carded(card.pane) && carded(card.left) && carded(card.right),
      JSON.stringify(card))
    check('a split comes in toward the seam, and the dock\'s own resting line goes',
      card.left.margin === '6px 3px 6px 6px' && card.right.margin === '6px 6px 6px 3px' && card.divider === 'rgba(0, 0, 0, 0)',
      JSON.stringify({ left: card.left, right: card.right, divider: card.divider }))
    check('switching the cards off leaves every pane in the host\'s own fill, flush with the column, split panes included',
      flush.look === 'flush' && flat(flush.empty) && flat(flush.pane) && flat(flush.left) && flat(flush.right),
      JSON.stringify(flush))
    check('and the dock\'s own resting line is back between the flush panes',
      flush.divider === 'rgb(0, 0, 255)', JSON.stringify(flush.divider))
    check('switching them back on brings the cards back without a reload',
      back.look === 'card' && same(back, card), JSON.stringify(back))
    commonChecks(r)
  },
  switches(r) {
    basicChecks(r)
    const sw = r.switches || {}
    const keys = Object.keys(sw.start || {})
    const present = (marks, key) => !!marks && marks[key] > 0
    check('every switched feature is on by default', keys.length === 5 && keys.every((key) => present(sw.start, key)), JSON.stringify(sw.start))
    for (const step of sw.steps || []) {
      check(`switching ${step.key} off leaves none of its marks and keeps the others`,
        !present(step.off, step.key) && keys.filter((key) => key !== step.key).every((key) => present(step.off, key)),
        JSON.stringify(step.off))
      check(`switching ${step.key} back on brings it back, live`,
        keys.every((key) => present(step.on, key)), JSON.stringify(step.on))
    }
    check('all switches off leave no switched feature on the page',
      !!sw.allOff && keys.every((key) => !present(sw.allOff, key)), JSON.stringify(sw.allOff))
    check('all switches back on bring every feature back', !!sw.allOn && keys.every((key) => present(sw.allOn, key)), JSON.stringify(sw.allOn))
    commonChecks(r)
  },
  'switches-off'(r) {
    basicChecks(r)
    const sw = r.switches || {}
    const keys = Object.keys(sw.start || {})
    check('a feature switched off before the page loads never installs',
      keys.length === 5 && keys.every((key) => sw.start[key] === 0), JSON.stringify(sw.start))
    check('switching them on installs every one, live',
      !!sw.allOn && keys.every((key) => sw.allOn[key] > 0), JSON.stringify(sw.allOn))
    commonChecks(r)
  },
  'host-palette'(r) {
    basicChecks(r)
    const hp = r.hostPalette || {}
    const host = hp.host || {}
    check('under the host\'s colours and type the skin writes none of the host\'s tokens',
      host.base === 'rgb(250, 250, 252)' && host.family === '"Host Sans", sans-serif', JSON.stringify(host))
    check('and paints none of the host\'s frame: the sidebar keeps the host\'s fill, the conversation column and the canvases stay unpainted',
      host.sidebar === 'rgb(244, 245, 250)' && host.conversation === 'rgba(0, 0, 0, 0)' &&
        host.body === 'rgba(0, 0, 0, 0)' && host.html === 'rgba(0, 0, 0, 0)',
      JSON.stringify(host))
    check('the skin\'s own cards take the host\'s overlay layer, blurred behind',
      host.popover === 'rgb(240, 241, 250)' && host.account === 'rgb(240, 241, 250)' && host.search === 'rgb(240, 241, 250)' &&
        /blur\(16px\)/.test(host.popoverBlur || ''),
      JSON.stringify(host))
    check('the inverted chip becomes the host\'s hover plate with its primary ink',
      host.group === 'rgba(10, 20, 30, 0.08)' && host.groupInk === 'rgb(17, 18, 19)', JSON.stringify(host))
    check('the skin\'s display and code faces fall back to the host\'s',
      host.heading === '"Host Sans", sans-serif' && host.code === '"Host Mono", monospace', JSON.stringify(host))
    const wall = hp.wallpaper || {}
    check('a wallpaper plugin\'s cleared canvas and glass reach the sidebar and the cards',
      wall.sidebar === 'rgba(0, 0, 0, 0)' && wall.popover === 'rgba(255, 255, 255, 0.6)' &&
        wall.account === 'rgba(255, 255, 255, 0.6)' && wall.body === 'rgba(0, 0, 0, 0)',
      JSON.stringify(wall))
    const claude = hp.claude || {}
    check('back on Claude the skin\'s palette and faces return',
      claude.base === '#fcfcfb' && claude.body === 'rgb(252, 252, 251)' && claude.account === 'rgb(252, 252, 251)' &&
        claude.popover === 'rgb(255, 255, 255)' && /Anthropic Serif Web Text/.test(claude.heading || ''),
      JSON.stringify(claude))
    commonChecks(r)
  },
}
