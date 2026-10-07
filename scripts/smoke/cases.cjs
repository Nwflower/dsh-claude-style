/**
 * The smoke's browser-half assertions: what each case's report must show
 * (the report is the object scripts/smoke/probe.js builds in the page), plus
 * the checks every case shares.
 */
'use strict'
const { MARKUP, SKIN_FACE, SKIN_HAT, same, check } = require('./shared.cjs')

/** WCAG contrast ratio between two `rgb(r, g, b)` readings. */
function contrast(a, b) {
  const luminance = (css) => {
    const channels = css.match(/[\d.]+/g).slice(0, 3).map((raw) => {
      const c = Number(raw) / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  }
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

/**
 * The two checks every case opens with: the install completed and no feature
 * reported a failure. The cases whose subject is a failing host API
 * (install-fault, sync-fault) state their own expectations instead, and the
 * three that never look at the console keep the install check alone.
 */
function basicChecks(r) {
  check('apply() completes', r.applyError === null, r.applyError)
  check('no feature reported a failure', r.errors.length === 0, r.errors.join(' | '))
}

/** Checks every case shares: a clean teardown and an idle scheduler. */
function commonChecks(r) {
  check('nothing the skin runs leaves an uncaught error or an unhandled rejection',
    Array.isArray(r.uncaught) && r.uncaught.length === 0, (r.uncaught || []).join(' | ').slice(0, 600))
  check("the model trigger rule reaches the host's trigger alone: a menu nested in the seat stays a block, the marked seat root stays hidden",
    !r.composerRestyle || (r.modelSeat.trigger === 'inline-flex' && r.modelSeat.nestedMenu === 'block' && r.modelSeat.markedRoot === 'none'),
    JSON.stringify(r.modelSeat))
  check('the home layout attribute follows the preference',
    r.homeLayoutAttr === r.homeLayoutExpected,
    JSON.stringify({ attribute: r.homeLayoutAttr, expected: r.homeLayoutExpected }))
  check("the host's solid hover chip keeps its label readable on its fill",
    r.chipInk !== null && r.chipFill !== null && contrast(r.chipInk, r.chipFill) >= 4.5,
    JSON.stringify({ ink: r.chipInk, fill: r.chipFill }))
  check('a filled host anchor keeps its own ink instead of the link colour',
    r.topUpInk !== null && r.topUpFill !== null && r.topUpInk !== r.topUpFill &&
      contrast(r.topUpInk, r.topUpFill) >= 3,
    JSON.stringify({ ink: r.topUpInk, fill: r.topUpFill }))
  check('the idle session seat draws the status circle through the slot outlet',
    r.seatIdle !== null && r.seatIdle.content !== 'none' && r.seatIdle.width === '5px',
    JSON.stringify(r.seatIdle))
  check('a seat carrying the running status dot draws no circle',
    r.seatRunning !== null && r.seatRunning.content === 'none' && r.seatRunning.svgs > 0,
    JSON.stringify(r.seatRunning))
  check('scheduler idle once settled (0 passes in 1 s)', r.idlePasses === 0, `${r.idlePasses} passes`, 'timing')
  check('a closed popover card claims no menu role for the host\'s keyboard arbitration',
    r.closedMenuCards === 0, `${r.closedMenuCards} closed cards carry role=menu`)
  check('no Windows titlebar marker: the body carries no data-dsh-titlebar-tabs',
    r.titlebarTabs === false, JSON.stringify(r.titlebarTabs))
  check('teardown registered with the host', r.teardownRegistered)
  check("the sheet carries this package's own module-system tags, so no sibling's bookkeeping can take it away",
    r.sheetPlugin === 'dsh-claude-style' && r.sheetPluginCss === 'dsh-claude-style/client.css' && r.sheetClaimable === false,
    JSON.stringify({ plugin: r.sheetPlugin, css: r.sheetPluginCss, claimable: r.sheetClaimable }))
  check("a sibling's untagged sheet stays out of this package's bookkeeping, so no reload of this package removes it",
    r.siblingSheetTag === 'dsh-claude-style/foreign-sheet' && r.siblingSheetClaimable === false && r.siblingSheetSurvives === true,
    JSON.stringify({ tag: r.siblingSheetTag, claimable: r.siblingSheetClaimable, survives: r.siblingSheetSurvives }))
  check("a sibling's sheet arriving after this bundle is parked before any package can claim it",
    r.lateSheetTag === 'dsh-claude-style/foreign-sheet' && r.lateSheetClaimable === false,
    JSON.stringify({ tag: r.lateSheetTag, claimable: r.lateSheetClaimable }))
  if (!r.teardownRegistered) return
  check('teardown leaves no skin node, marker, body attribute or stylesheet',
    r.leftNodes === 0 && r.leftMarkers === 0 && r.leftAttrs.length === 0 && !r.leftStylesheet,
    `nodes ${r.leftNodes}, markers ${r.leftMarkers}, attrs ${JSON.stringify(r.leftAttrs)}, stylesheet ${r.leftStylesheet}`)
  check('no pass runs after teardown', r.passesAfterTeardown === 0, `${r.passesAfterTeardown} passes`)
  check("the host's own account row is handed back visible and clickable",
    !r.hostRowPresent || (r.hostRowEnd !== null && r.hostRowEnd.visibility === 'visible' &&
      r.hostRowEnd.pointerEvents === 'auto' && r.hostRowEnd.display !== 'none' && r.hostRowEnd.width > 0),
    JSON.stringify(r.hostRowEnd))
}

const CASES = {
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
  // The auto mode cases: the ladder follows the host catalog, so a third-party
  // permission tier is a first-class row.
  automode(r) {
    basicChecks(r)
    check('the ladder takes the catalog, the third-party tier included',
      same(r.permRows.map(function (row) { return row.preset }), ['read-only', 'workspace-write', 'auto-mode', 'danger-full-access']),
      JSON.stringify(r.permRows))
    check('a tier the catalog does not carry is absent, not hidden',
      r.permRows.every(function (row) { return row.preset !== 'auto' }) && r.permAutoRowDisplay === null,
      JSON.stringify(r.permRows))
    check('the tier reads as a Claude name, not as its machine id',
      r.permRows[2].text.indexOf('Auto mode') === 0 && r.permRows[2].text.indexOf('分类器') !== -1 &&
        r.permRows[2].text.indexOf('auto-mode') === -1,
      JSON.stringify(r.permRows[2].text))
    check('the ladder stays one text list: no row draws a glyph',
      r.permRows.every(function (row) { return row.glyphs === 0 }),
      JSON.stringify(r.permRows.map(function (row) { return row.glyphs })))
    check('the running preset reads as its Claude name',
      r.permLabel === 'Accept edits', JSON.stringify(r.permLabel))
    check('picking the tier switches through the host permission command',
      same(r.permissionCommands, ['/permission auto-mode']), JSON.stringify(r.permissionCommands))
    commonChecks(r)
  },
  'automode-current'(r) {
    basicChecks(r)
    check('a session running the third-party tier names it instead of its id',
      r.permLabel === 'Auto mode', JSON.stringify(r.permLabel))
    check('the running tier is marked in the popover',
      r.permRows[2].active === true && r.permRows[0].active === false,
      JSON.stringify(r.permRows.map(function (row) { return [row.preset, row.active] })))
    check("a glyph the deployment declares is left out with the rest of them",
      r.permRows[2].preset === 'auto-mode' && r.permRows[2].glyphs === 0,
      JSON.stringify(r.permRows[2]))
    commonChecks(r)
  },
  'automode-hero'(r) {
    basicChecks(r)
    check('the Auto slot binds to the tier the deployment offers',
      same(r.permSegments.map(function (s) { return s.preset }), ['read-only', 'workspace-write', 'auto-mode', 'danger-full-access']),
      JSON.stringify(r.permSegments))
    check('the slot keeps its Claude label while carrying that tier',
      r.permSegments[2].text === 'Auto' && r.permSegments[2].active === true,
      JSON.stringify(r.permSegments[2]))
    check('the built-in review tier stays out of the slot while the deployment has its own',
      r.permSegments.every(function (s) { return s.preset !== 'auto' }) && r.permAutoSegmentDisplay === null,
      JSON.stringify(r.permSegments))
    commonChecks(r)
  },
  'automode-roundtrip'(r) {
    var ladder = ['read-only', 'workspace-write', 'auto-mode', 'danger-full-access']
    basicChecks(r)
    check('the ladder is drawn in the conversation view', same(r.rowsBeforeHome, ladder), JSON.stringify(r.rowsBeforeHome))
    check('the home view shows it as segments and leaves no popover behind',
      same(r.segmentsInHome, ladder) && r.popoversInHome === 0,
      JSON.stringify({ segments: r.segmentsInHome, popovers: r.popoversInHome }))
    check('returning to the conversation draws the ladder again',
      same(r.rowsAfterReturn, ladder), JSON.stringify(r.rowsAfterReturn))
    commonChecks(r)
  },
  hdsl(r) {
    basicChecks(r)
    check("the launcher's account name outranks the OS-user probe", r.accountUser === 'HDSLPlayer', JSON.stringify(r.accountUser))
    check("the launcher's atlas is cropped into the head the launcher itself draws",
      r.skinCanvas !== null && r.skinCanvas.width === 64 && r.skinFlag === true,
      JSON.stringify({ canvas: r.skinCanvas, flag: r.skinFlag }))
    check('the head takes the box from the profile picture, uncut by a round mask',
      r.photo === null && r.avatarRadius === '0px',
      JSON.stringify({ photo: r.photo, radius: r.avatarRadius }))
    check('the crop is the face, inset, with the hat layer over the whole box',
      same(r.skinPixels && r.skinPixels.face, SKIN_FACE) &&
        same(r.skinPixels && r.skinPixels.hatTop, SKIN_HAT) &&
        same(r.skinPixels && r.skinPixels.hatBottom, SKIN_HAT) &&
        same(r.skinPixels && r.skinPixels.margin, [0, 0, 0, 0]),
      JSON.stringify(r.skinPixels))
    commonChecks(r)
  },
  'hdsl-noskin'(r) {
    basicChecks(r)
    check('the launcher account still names the instance', r.accountUser === 'HDSLPlayer', JSON.stringify(r.accountUser))
    check('a built-in figure with no picture leaves the circle to the mark alone',
      r.skinCanvas === null && r.skinFlag === false && r.photo === null,
      JSON.stringify({ canvas: r.skinCanvas, flag: r.skinFlag, photo: r.photo }))
    commonChecks(r)
  },
  'hdsl-broken'(r) {
    basicChecks(r)
    check('a picture the launcher points at but cannot serve leaves no canvas and no marker',
      r.skinCanvas === null && r.skinFlag === false,
      JSON.stringify({ canvas: r.skinCanvas, flag: r.skinFlag }))
    check('the failed picture falls back to the circle as it was',
      r.avatarRadius === '50%', JSON.stringify(r.avatarRadius))
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
  markup(r) {
    check('apply() completes', r.applyError === null, r.applyError)
    check('no injected markup executed', r.pwned === 0, `${r.pwned} executions`)
    check('account name rendered as text', r.accountUser === MARKUP, JSON.stringify(r.accountUser))
    check('mirrored plugin label and badge rendered as text', r.mirroredText === MARKUP && r.mirroredBadge === MARKUP, JSON.stringify([r.mirroredText, r.mirroredBadge]))
    check('account-hold toast renders the username as text', r.banToast === MARKUP + ': account_banned', JSON.stringify(r.banToast))
    check('avatar URL adds no attribute to the page',
      r.avatarAttrs !== null && r.avatarAttrs.every((a) => a === 'class' || a === 'data-dsh-claude-photo') &&
      (r.photo === null || r.photo.attrs.every((a) => !/^on/i.test(a))), JSON.stringify([r.avatarAttrs, r.photo]))
    commonChecks(r)
  },
  'install-fault'(r) {
    check('apply() completes although the account API is broken', r.applyError === null, r.applyError)
    check('only the account footer was switched off', r.errors.length === 1 && r.errors[0].includes('"footer"'), r.errors.join(' | '))
    check("the host's own footer is handed back", !r.footerTakeover && r.accountUser === null, JSON.stringify({ takeover: r.footerTakeover, row: r.accountUser }))
    check('the rest of the skin keeps running', r.composerRestyle && same(r.keys, ['host picked the menu item']))
    commonChecks(r)
  },
  'sync-fault'(r) {
    check('apply() completes', r.applyError === null, r.applyError)
    check('only the two features that read the session list were switched off: the permission control and the model picker',
      r.errors.length === 2 && r.errors.some((e) => e.includes('"permissions"')) && r.errors.some((e) => e.includes('"model"')), r.errors.join(' | '))
    check("the host's own access button is handed back", r.hostAccessVisible === true, JSON.stringify(r.hostAccessVisible))
    check('the composer restyle keeps running', r.composerRestyle === true, JSON.stringify(r.composerRestyle))
    check('the rest of the skin keeps running', r.accountUser === 'Tester', JSON.stringify(r.accountUser))
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
  'no-auto-review'(r) {
    basicChecks(r)
    check("the permission control stands in for the host's access button", r.composerRestyle && !r.hostAccessVisible,
      JSON.stringify({ restyle: r.composerRestyle, hostAccess: r.hostAccessVisible }))
    check('a preset the catalog does not carry is not drawn at all',
      r.permAutoRowDisplay === null &&
        same(r.permRows.map(function (row) { return row.preset }), ['read-only', 'workspace-write', 'danger-full-access']),
      JSON.stringify(r.permRows))
    check('the rows the catalog does carry stay offered',
      r.permRows.every(function (row) { return row.display !== 'none' }),
      JSON.stringify(r.permRows))
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
  desktop(r) {
    check('apply() completes', r.applyError === null, r.applyError)
    check('the footer entries are hidden in place before the drawer is ever opened',
      Array.isArray(r.footerEntriesBeforeOpen) && r.footerEntriesBeforeOpen.length === 2 &&
        r.footerEntriesBeforeOpen.every(function (entry) { return entry.hidden === true && entry.display === 'none' }),
      JSON.stringify(r.footerEntriesBeforeOpen))
    check("the host's own account row stays visible; the skin builds no trigger",
      r.hostRowVisible === true && r.hostRowDisplay !== 'none' && r.syntheticBtn === false,
      JSON.stringify({ visible: r.hostRowVisible, display: r.hostRowDisplay, synthetic: r.syntheticBtn }))
    check('the takeover marks the host account row for the stylesheet',
      r.hostRowMarked === true, JSON.stringify(r.hostRowMarked))
    check('the host trigger row is not hidden', r.triggerRowDisplay !== 'none', JSON.stringify(r.triggerRowDisplay))
    check('the open host account menu carries the skin marker',
      r.accountMenuMarked === true, JSON.stringify(r.accountMenuMarked))
    check("our container is injected as the list's first child",
      r.injectInViewport === true && r.injectFirst === true,
      JSON.stringify({ inViewport: r.injectInViewport, first: r.injectFirst }))
    check('the injected container carries the header and the plugin rows',
      same(r.injectRows, ['header', 'action', 'embed']) && r.injectName === 'Ada',
      JSON.stringify({ rows: r.injectRows, name: r.injectName }))
    check('the injected header names the same user as the host account row',
      r.injectName !== null && r.injectName === r.hostRowText,
      JSON.stringify({ header: r.injectName, row: r.hostRowText }))
    check('the account width variable is the account row box width',
      r.accountWidthVar === Math.round(r.hostRowWidth) + 'px',
      JSON.stringify({ variable: r.accountWidthVar, row: r.hostRowWidth }))
    check('the host menu card is as wide as the account row',
      r.menuCardWidth !== null && Math.round(r.menuCardWidth) === Math.round(r.hostRowWidth),
      JSON.stringify({ card: r.menuCardWidth, row: r.hostRowWidth }))
    check('hovering the host account row opens the host menu; leaving it closes',
      r.hoverOpenedMenu === true && r.hoverClosedMenu === true,
      JSON.stringify({ opened: r.hoverOpenedMenu, closed: r.hoverClosedMenu }))
    check('the host account menu carries the skin entry animation',
      r.menuEntryKeyframes === true && r.menuEntryAnimation === true,
      JSON.stringify({ keyframes: r.menuEntryKeyframes, animation: r.menuEntryAnimation }), 'timing')
    check('the card stays unpainted until the skin\'s rows are in it and the host has placed it',
      r.accountReveal.paintedWhileUnready === false && r.accountReveal.revealedAt > 0 &&
        r.accountReveal.rowsAtReveal === true && r.accountReveal.placedAtReveal === true &&
        r.accountReveal.mountTop !== r.accountReveal.topAtReveal,
      JSON.stringify(r.accountReveal))
    check('a host re-render is healed: container first and rows unchanged',
      r.injectHealedFirst === true && r.injectHealedSame === true,
      JSON.stringify({ first: r.injectHealedFirst, same: r.injectHealedSame }))
    check("the host's keyboard walk reaches our injected button",
      r.focusInInjected === true, JSON.stringify(r.focusInInjected))
    check('the hold screen opens over the menu and survives the leaves its overlay causes',
      r.banOpened === 1 && r.banSurvivesLeave === 1,
      JSON.stringify({ opened: r.banOpened, survived: r.banSurvivesLeave }))
    check('the host menu stays up behind the hold screen and the screen leaves by its own control',
      r.menuBehindBan === true && r.banAfterDismiss === 0,
      JSON.stringify({ menu: r.menuBehindBan, dismissed: r.banAfterDismiss }))
    check('closing the host menu leaves no injected container behind',
      r.injectAfterClose === 0 && r.hostMenuAfterClose === 0,
      JSON.stringify({ containers: r.injectAfterClose, menus: r.hostMenuAfterClose }))
    check('closing the host menu clears the skin marker',
      r.accountMenuMarkAfterClose === 0, JSON.stringify(r.accountMenuMarkAfterClose))
    check('Ctrl+, opens the host dialog', r.dialogAfterShortcut === 1, JSON.stringify(r.dialogAfterShortcut))
    check('the first account frame reads the profile exactly once',
      r.profileReadsAfterFirst === 1, JSON.stringify(r.profileReadsAfterFirst))
    check('a repeated same-state frame reads nothing more',
      r.profileReadsAfterRepeat === 1, JSON.stringify(r.profileReadsAfterRepeat))
    check('no feature reported a failure', r.errors.length === 0, r.errors.join(' | '))
    commonChecks(r)
  },
  'turn-status'(r) {
    basicChecks(r)
    const status = r.turnStatus || {}
    const failed = status.failed || {}
    const live = status.live || {}
    check('each status line moves below its turn\'s work: the failed turn\'s above its footer, the running turn\'s above the queued message',
      JSON.stringify(status.seen) === JSON.stringify(['first question', 'first work', 'error', 'Failed', 'footer',
        'second question', 'second work', 'Deep diving for 1m 5s', 'queued']),
      JSON.stringify(status.seen))
    check('the running line reads elapsed time · output tokens · what the model is doing, with a turning spark, in place of the host label',
      live.state === 'live' && /^1m [5-9]s · 1\.2k tokens · \S/.test(live.text || '') &&
        live.drawn === JSON.stringify(live.text) && live.label === 'none' && live.turning === 'dsh-claude-turn-spark',
      JSON.stringify(live))
    check('the failed line reads the host\'s word · how long it ran · output tokens, with a still spark',
      failed.state === 'failed' && failed.text === 'Failed · 12s · 300 tokens' &&
        failed.drawn === JSON.stringify(failed.text) && failed.label === 'none' && failed.turning === 'none',
      JSON.stringify(failed))
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
  'turn-nav'(r) {
    basicChecks(r)
    const nav = r.turnNav || {}
    const rail = nav.rail || {}
    const open = nav.open || {}
    const keys = nav.keys || {}
    check('the skin\'s rail stands in the host rail\'s slot, one mark per turn, the host\'s rail hidden but laid out',
      rail.hostHidden === 'hidden' && rail.inSlot === true && rail.marks === 5 && rail.current === 4 &&
        JSON.stringify(rail.unloaded) === '[true,true,true,false,false]',
      JSON.stringify(rail))
    check('the pointer reaching the rail opens the card at once, over it, and the rail\'s marks step back',
      nav.openAtOnce === 'true' && open.open === 'true' && open.railMarked === true && open.marksFaded === '0', JSON.stringify({ openAtOnce: nav.openAtOnce, open }))
    check('the card hangs in the rail\'s slot, so a pointer on it stays on the conversation pane', open.inSlot === true, JSON.stringify(open.inSlot))
    check('every turn of the outline is a row, the loaded prompt wins, a turn without a prompt reads in the host\'s words',
      JSON.stringify(open.rows) === JSON.stringify(['first question', 'Turn 2', 'third question', 'fourth question, as loaded', 'fifth question']) &&
        (open.labels || []).every((label, i) => label === `Jump to turn ${i + 1}`),
      JSON.stringify({ rows: open.rows, labels: open.labels }))
    check('the row of the turn being read is marked and sits exactly on its mark, dash on dash', open.current === '4' && open.rowGap === 0 && open.dashGap === 0,
      JSON.stringify({ current: open.current, rowGap: open.rowGap, dashGap: open.dashGap }))
    check('a row press presses the host\'s mark for that turn and lines the landed turn\'s first row',
      JSON.stringify(nav.rowPress) === '[3]' && nav.rowLanding === 'fourth question', JSON.stringify({ press: nav.rowPress, landing: nav.rowLanding }))
    check('the pointer leaving closes the card and gives the rail its marks back',
      !!nav.closed && nav.closed.open === 'false' && nav.closed.railMarked === false, JSON.stringify(nav.closed))
    check('Alt+↑ jumps one turn up from the reading position, and again on from the turn it went to',
      keys.up === true && keys.upAgain === true && JSON.stringify(keys.presses) === '[3,2]' && keys.landing === 'fourth question',
      JSON.stringify(keys))
    check('Shift+Alt+↑, a bare ↑ and an arrow in a field holding a draft stay with the page',
      keys.shifted === false && keys.bare === false && keys.draft === false, JSON.stringify(keys))
    check('switching it off hands the host its rail back; on stands the skin\'s in again, live',
      !!nav.switchedOff && nav.switchedOff.rail === 0 && nav.switchedOff.hostReplaced === false && nav.switchedOff.hostShown === 'visible' &&
        !!nav.switchedOn && nav.switchedOn.rail === 1 && nav.switchedOn.hostReplaced === true,
      JSON.stringify({ off: nav.switchedOff, on: nav.switchedOn }))
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
  settings(r) {
    basicChecks(r)
    const settings = r.settings || {}
    check('the settings section registers with the settings dialog', settings.registered === true, JSON.stringify(settings.registered))
    const expected = {
      general: ['username', 'motion', 'autoPopover', 'banLocale'],
      appearance: ['brand', 'palette', 'typeface', 'mascot', 'mascotScope'],
      composer: ['composerScope', 'homeLayout', 'modelPicker', 'quickProviders', 'permissionsControl'],
      sidebar: ['collapseFooter', 'sidebarSearch', 'workspaceView'],
      conversation: ['turnStatus', 'turnNav', 'chatAnimations', 'caretMotion', 'viewTabs'],
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
    check('a sub-row greys out while its parent is off: the mascot\'s place with the mascot off, the quick providers with the model picker off',
      !!off.appearance && JSON.stringify(off.appearance.disabled) === '["mascotScope"]' &&
        !!off.composer && JSON.stringify(off.composer.disabled) === '["quickProviders"]',
      JSON.stringify(off))
    commonChecks(r)
  },
  'crab-states'(r) {
    basicChecks(r)
    const crab = r.states || {}
    const is = (state, animation, place) => !!state && state.animation === animation && state.place === place && state.ready === true
    check('picked under the Claude brand, the crab stands on the home card idling, from its inlined sheet',
      is(crab.home, 'idle', 'card') && /^url\("data:image\/png/.test(crab.home.sheet), JSON.stringify(crab.home))
    check('its frames change on its own node without waking a pass',
      !!crab.idle && crab.idle.before !== crab.idle.after && crab.idle.passes === 0, JSON.stringify(crab.idle))
    check('a click on its left half pokes it', is(crab.poke, 'poke-left', 'card'), JSON.stringify(crab.poke))
    check('on the conversation page it stands on the input area: thinking, typing, the hard hat with three sessions at work',
      is(crab.thinking, 'thinking', 'stack') && is(crab.typing, 'typing', 'stack') && is(crab.building, 'building', 'stack'),
      JSON.stringify({ thinking: crab.thinking, typing: crab.typing, building: crab.building }))
    check('an approval puts it on the approval panel with the notification',
      is(crab.notification, 'notification', 'panel'), JSON.stringify(crab.notification))
    check('compaction, the celebration when it ends, and the error shake over it',
      is(crab.compacting, 'compacting', 'stack') && is(crab.celebrating, 'happy', 'stack') && is(crab.failed, 'error', 'stack'),
      JSON.stringify({ compacting: crab.compacting, celebrating: crab.celebrating, failed: crab.failed }))
    // The error sheet's still frame is its fifth: column 4 of 26-cell-wide frames at 2px a cell.
    check('reduced motion holds the error sheet\'s still frame',
      crab.stillAttr === 'reduced' && !!crab.still && crab.still.before === '-208px 0px' && crab.still.after === '-208px 0px',
      JSON.stringify(crab.still))
    check('it idles after work, sleeps after a quiet minute, and a pointer move wakes it',
      is(crab.afterWork, 'idle', 'stack') && is(crab.asleep, 'sleeping', 'stack') && is(crab.woken, 'waking', 'stack'),
      JSON.stringify({ afterWork: crab.afterWork, asleep: crab.asleep, woken: crab.woken }))
    // The walk this case drives is the only one that reaches these two: the
    // whale's case reads two sheets and leaves.
    check('it subscribes to the session\'s chat target, which the host builds only for a subscriber',
      crab.chatFollowed === true, JSON.stringify(crab.chatFollowed))
    check('a compaction whose end comes back with the whole feed after a reconnect stops playing, uncelebrated',
      is(crab.resendBefore, 'compacting', 'stack') && is(crab.resent, 'idle', 'stack'),
      JSON.stringify({ before: crab.resendBefore, after: crab.resent }))
    check('it leaves with the conversation, and takes its anchor mark along', crab.gone === true, JSON.stringify(crab.gone))
    check('kept to the home page it stays off the conversation and stands on the home card',
      crab.backInConversation === true && crab.homeOnly === null && is(crab.homeOnlyHero, 'idle', 'card'),
      JSON.stringify({ back: crab.backInConversation, homeOnly: crab.homeOnly, hero: crab.homeOnlyHero }))
    check('with the mascot off it leaves; picking Deepy puts the whale out instead',
      crab.off === null && crab.deepyPicked === true, JSON.stringify({ off: crab.off, deepy: crab.deepyPicked }))
    commonChecks(r)
  },
  'chat-follow'(r) {
    basicChecks(r)
    const follow = r.chatFollow || {}
    check('the follow feature marks the document, and only a capped process body is clipped to one axis',
      follow.marked === true && follow.overflowX === 'hidden' && follow.expandedOverflowX === 'auto',
      JSON.stringify(follow))
    // A browser clamps a scroll position a few pixels inside
    // `scrollHeight - clientHeight` when a child's own overflow or a scrollbar
    // rounds it, so "at the end" means "inside that clamp", and the point of the
    // check is that it got there by walking.
    const AT_END_PX = 6
    check('a structural moment hands the scroll back: the position was 60px off the end and lands at it',
      follow.before === 60 && follow.after <= AT_END_PX && follow.after < follow.before,
      JSON.stringify({ before: follow.before, after: follow.after }))
    check('a reader who scrolled away himself is left where he is',
      follow.readerBefore === 60 && follow.readerAfter === 60,
      JSON.stringify({ before: follow.readerBefore, after: follow.readerAfter }))
    // The catch-up is a curve, not a jump: a frame later the capped body is
    // still well short of its end, still moving at a tenth of a second, and held
    // at the end once the glide has run out (scroll-ease.ts).
    check('the capped body walks to its end instead of jumping: short a frame later, still moving at a tenth of a second, at the end afterwards',
      follow.catchUpEarly > 200 && follow.catchUpMid < follow.catchUpEarly && follow.catchUpMid > AT_END_PX &&
        follow.catchUpDone <= AT_END_PX && follow.catchUpLate <= AT_END_PX,
      JSON.stringify({
        early: follow.catchUpEarly, mid: follow.catchUpMid,
        done: follow.catchUpDone, late: follow.catchUpLate,
      }))
    // While the host's streaming mark is on the page, the end its own follow
    // writes is taken back before the frame paints and the spring walks the
    // distance (chat-follow.ts, scroll-ease.ts).
    check('the stream glide takes the host\'s own pin back and walks it: well short a frame later, still walking, at the end afterwards',
      follow.glideEarly > 100 && follow.glideMid < follow.glideEarly && follow.glideMid > AT_END_PX &&
        follow.glideDone <= AT_END_PX,
      JSON.stringify({
        early: follow.glideEarly, mid: follow.glideMid, done: follow.glideDone,
        diag: follow.glideDiag,
      }))
    check('a message the reader just sent is not taken back: the host\'s jump to it stands',
      follow.submitGap <= AT_END_PX && follow.submitGapLate <= AT_END_PX,
      JSON.stringify({ gap: follow.submitGap, late: follow.submitGapLate }))
    check('the host\'s own back-to-the-end button is kept out of sight while the glide follows, and shows again after',
      follow.glideButtonMarked === true && follow.glideButtonBack === true,
      JSON.stringify({ marked: follow.glideButtonMarked, back: follow.glideButtonBack }))
  },
  caret(r) {
    basicChecks(r)
    const caret = r.caret || {}
    const on = caret.on || {}
    const off = caret.off || {}
    const back = caret.back || {}
    check('the focused composer surface gets a drawn caret and the native one gives way',
      on.layer === true && on.visible === true && on.marked === true && on.nativeHidden === true,
      JSON.stringify(on))
    check('the drawn caret is placed with a transform',
      typeof on.transform === 'string' && on.transform.indexOf('translate(') === 0, JSON.stringify(on.transform))
    check('off takes the drawn caret and the mark away and gives the native caret back',
      off.layer === false && off.marked === false && off.nativeHidden === false, JSON.stringify(off))
    check('switching it back draws it again', back.layer === true && back.marked === true, JSON.stringify(back))
    const plain = caret.plain || {}
    check('a textarea under the composer seat is taken over the same way',
      plain.layer === true && plain.marked === true && plain.visible === true && plain.nativeHidden === true,
      JSON.stringify(plain))
    const caretReduced = caret.reduced || {}
    check('the animation choice stills the drawn caret without taking it away (D26)',
      caretReduced.layer === true &&
        String(caretReduced.transition).split(',').every(value => value.trim() === '0s') &&
        caretReduced.animation === 'none',
      JSON.stringify(caretReduced), 'timing')
  },
  'chat-fold'(r) {
    basicChecks(r)
    const fold = r.fold || {}
    check('a running thinking row and a running process group are opened',
      fold.thinkOpen === true && fold.groupOpen === true, JSON.stringify(fold))
    check('the opened group carries its mark, its live detail and the label half\'s width',
      fold.openMark === true && fold.liveDetail === true && fold.spread === '56px', JSON.stringify(fold))
    check('the opened group reads Working on its label and on its name',
      fold.label === 'Working' && fold.labelName === 'Working', JSON.stringify(fold))
    check('a tier that does not cap its body is never pressed',
      fold.expandedUntouched === true && (fold.clicks || {}).expanded === 0, JSON.stringify(fold.clicks))
    const after = fold.after || {}
    check('the thinking row folds back when the reasoning stops', after.thinkOpen === false, JSON.stringify(after))
    check('the process group folds back when the section ends, its mark and live detail with it',
      after.groupOpen === false && after.openMark === false && after.liveDetail === false, JSON.stringify(after))
    check('a group the reader opened himself in that phase stays open', fold.readerOpen === true, JSON.stringify(fold.readerOpen))
    const glide = fold.glide || {}
    const glideAfter = glide.after || {}
    check('a press on a folding row is intercepted and handed to the real element when the door lands',
      glide.clicksDuringRoll === 0 && glideAfter.clicks === 1, JSON.stringify(glide))
    check('the folding row carries the door over a clipped body',
      glide.rolling === true && glide.clipped === true, JSON.stringify(glide))
    check('when the door lands the body is gone and nothing is rolling',
      glideAfter.bodyGone === true && glideAfter.rollingAnywhere === false, JSON.stringify(glideAfter))
    const glideOpen = glide.open || {}
    const glideOpenAfter = glide.openAfter || {}
    check('the opening direction rolls the body the host inserts',
      glideOpen.inserted === true && glideOpen.rolling === true, JSON.stringify(glideOpen))
    check('when the door lands the inserted body stays and nothing rolls',
      glideOpenAfter.present === true && glideOpenAfter.rolling === false, JSON.stringify(glideOpenAfter))
    // The switch covers the door and the entrance fade as well (D29/D32).
    const animationsOff = fold.animationsOff || {}
    check('with Automatic folding on, the entrance fade runs',
      fold.entranceOn === '0.12s, 0.12s', JSON.stringify(fold.entranceOn))
    check('switching it off takes the mark and the fade, and lets the press land at once with nothing rolling',
      animationsOff.mark === false && animationsOff.entrance === '0s' &&
        animationsOff.immediateClicks === 1 && animationsOff.rolling === false, JSON.stringify(animationsOff))
    check('switching it back brings the fold mark back',
      (fold.animationsBack || {}).mark === true, JSON.stringify(fold.animationsBack))
  },
  'chat-reveal'(r) {
    basicChecks(r)
    const reveal = r.reveal || {}
    const opening = reveal.opening || {}
    const grown = reveal.grown || {}
    const settled = reveal.settled || {}
    const off = reveal.off || {}
    const back = reveal.back || {}
    const reduced = reveal.reduced || {}
    check('characters arriving in a streaming container are registered as step highlights from the faintest step',
      opening.mark === true && opening.total > 0 && opening.steps > 0, JSON.stringify(opening))
    check('more characters arriving join them', grown.total > 0 && grown.steps >= 1, JSON.stringify(grown))
    check('once faded they leave the registry', settled.total === 0, JSON.stringify(settled))
    check('the preference withdraws the engine whole, and switching it back installs it again',
      off.total === 0 && off.mark === false && back.mark === true, JSON.stringify({ off: off, back: back }))
    check('the animation choice reaches it too: Reduced withdraws the engine, not the system query (D26)',
      reduced.total === 0 && reduced.mark === false, JSON.stringify(reduced))
    const flip = reveal.systemFlip || {}
    check('the system setting flipping under "follow the system" takes the running engine with it, and brings it back',
      (flip.reduced || {}).total === 0 && (flip.reduced || {}).mark === false && (flip.back || {}).mark === true,
      JSON.stringify(flip))
  },
  'chat-files'(r) {
    basicChecks(r)
    const files = r.files || {}
    const seats = files.seats || []
    const collapsed = files.collapsed || {}
    const expanded = files.expanded || {}
    const failed = files.failed || {}
    const running = files.running || {}
    const escalated = files.escalated || {}
    check('both file tools are claimed from the tool view seat',
      seats.length === 2, JSON.stringify(seats))
    check('the edit seat comes first, at priority -1', (seats[0] || {}).seat === 'edit' && (seats[0] || {}).priority === -1, JSON.stringify(seats[0]))
    check('the write seat follows', (seats[1] || {}).seat === 'write', JSON.stringify(seats[1]))
    check('a settled edit reads as a row of the edit variant in the ok state',
      (collapsed.root || {}).variant === 'edit' && (collapsed.root || {}).state === 'ok', JSON.stringify(collapsed.root))
    check('the settled row names the shortened path and the +n -m tail',
      collapsed.texts.includes('app.js') && collapsed.texts.includes('+1') && collapsed.texts.includes('-1'),
      JSON.stringify(collapsed.texts))
    check('the settled row\'s summary carries the file link',
      typeof collapsed.summary === 'string' && collapsed.summary.includes('dsh-claude-file-link'),
      JSON.stringify(collapsed.summary))
    check('the row\'s title comes from the seat copy',
      (collapsed.disclosure || {}).title === 't:tool.title.edit', JSON.stringify(collapsed.disclosure))
    check('the row itself opens and closes, keeping its content while open',
      (collapsed.disclosure || {}).expandOnRowClick === true && (collapsed.disclosure || {}).keepContentWhenOpen === true,
      JSON.stringify(collapsed.disclosure))
    check('expanded, the hunks the result metadata reported go into the diff card',
      ((expanded.diff || {}).diffs || []).length === 1, JSON.stringify(expanded.diff))
    check('the diff card is capped at the chat line count and carries the skin\'s class',
      (expanded.diff || {}).maxLines === 9 && (expanded.diff || {}).className === 'dsh-claude-file-diff',
      JSON.stringify(expanded.diff))
    check('the expanded row carries the inspect label', expanded.texts.includes('t:row.inspect'), JSON.stringify(expanded.texts))
    check('a failed call reads as an error row', (failed.root || {}).state === 'error', JSON.stringify(failed.root))
    check('a failed call draws no diff', failed.diff === null, JSON.stringify(failed.diff))
    check('the failed call\'s verdict colours the summary and hides the failed label',
      typeof failed.summary === 'string' && failed.summary.includes('dsh-claude-file-error') &&
        failed.hiddenText === 't:row.failed',
      JSON.stringify({ summary: failed.summary, hidden: failed.hiddenText }))
    check('the failed call shows the tool\'s own error',
      failed.texts.includes('ToolError: permission_denied'), JSON.stringify(failed.texts))
    check('a write that is still running shows the change its arguments describe',
      (running.diff || {}).className === 'dsh-claude-file-diff', JSON.stringify(running.diff))
    check('the running write announces the running state', running.hiddenText === 't:row.running', JSON.stringify(running.hiddenText))
    check('a call whose change cannot be derived draws no diff card', escalated.diff === null, JSON.stringify(escalated.diff))
    check('it keeps the host\'s IN/OUT card, with no output row',
      escalated.io !== null && escalated.texts.indexOf('t:row.output') === -1, JSON.stringify(escalated.texts))
    check('it keeps the input row', escalated.texts.includes('t:row.input'), JSON.stringify(escalated.texts))
    check('switching the file rows off hands both seat keys back', files.offSeats === 0, JSON.stringify(files.offSeats))
    check('switching them back takes both again, without a reload', files.backSeats === 2, JSON.stringify(files.backSeats))
    // The other plugin coming and going mid-session (src/shared/peer-plugin.ts):
    // the decision is re-taken, not frozen at install.
    const peerOn = files.peerOn || {}
    const peerOff = files.peerOff || {}
    check('the other plugin arriving mid-session takes the seat keys down',
      peerOn.seats === 0, JSON.stringify(peerOn))
    check('it takes the ported fold and reveal marks down with them',
      peerOn.foldMark === false && peerOn.revealMark === false, JSON.stringify(peerOn))
    check('the other plugin leaving hands the seat keys back', peerOff.seats === 2, JSON.stringify(peerOff))
    check('leaving brings the fold mark back', peerOff.foldMark === true, JSON.stringify(peerOff))
  },
  // The other chat-behaviour plugin on the page: the ported features must hand
  // their behaviour over whole (src/shared/peer-plugin.ts, D32).
  'peer-chat-ux'(r) {
    basicChecks(r)
    const peer = r.peer || {}
    const marks = peer.marks || {}
    check('a streaming chat area gets none of the ported chat effects',
      marks.follow === false && marks.fold === false && marks.reveal === false, JSON.stringify(marks))
    check('a focused composer gets no drawn caret',
      marks.caretLayer === false && marks.caretMark === false, JSON.stringify(marks))
    check('no character is registered as a step highlight', peer.highlights === 0, JSON.stringify(peer.highlights))
    check('the file change rows leave the host its two seat keys',
      peer.seats === 0, JSON.stringify(peer.seats))
    check('a running thinking row is left as the host rendered it', peer.thinkExpanded === false, JSON.stringify(peer.thinkExpanded))
    check('a running process group is left as the host rendered it', peer.groupOpen === false, JSON.stringify(peer.groupOpen))
    const settings = peer.settings || {}
    const taken = ['chatAnimations', 'caretMotion']
    const answers = settings.answers || {}
    // The reader's own answer stays on show (these defaults are on, the caret
    // sits on Every move) while the control refuses input and the accent line
    // names the plugin that owns the behaviour.
    const showsOwnAnswer = (key) => {
      const answer = answers[key]
      return !!answer && (answer.on === true || answer.option === 'typing')
    }
    check('the Conversation tab carries both ported controls',
      settings.registered === true && taken.every(key => (settings.rows || []).includes(key)),
      JSON.stringify(settings.rows))
    check('both controls are greyed out and marked as managed by the other plugin',
      taken.every(key => (settings.refusing || []).includes(key)) &&
        taken.every(key => (settings.managed || []).includes(key)),
      JSON.stringify({ refusing: settings.refusing, managed: settings.managed }))
    check('each control keeps showing the reader\'s own answer', taken.every(showsOwnAnswer), JSON.stringify(answers))
    check('the accent line names dsh-chat-ux',
      (settings.texts || []).some(text => text.includes('dsh-chat-ux')), JSON.stringify(settings.texts))
    check('the rows the other plugin does not own keep answering',
      (settings.refusing || []).includes('turnStatus') === false && (settings.refusing || []).includes('viewTabs') === false,
      JSON.stringify(settings.refusing))
    commonChecks(r)
  },
  'chat-send'(r) {
    basicChecks(r)
    const send = r.send || {}
    const flying = send.flying || {}
    const landed = send.landed || {}
    check('a submission finds the composer input', send.inputFound === true, JSON.stringify(send.inputFound))
    check('a submission lifts a stand-in off the composer card',
      flying.ghost === true && flying.clone === true, JSON.stringify(flying))
    check('the real row is hidden while the stand-in flies',
      flying.hidden === true && flying.visibility === 'hidden', JSON.stringify(flying))
    check('the flight plays an animation', flying.animations > 0, JSON.stringify(flying.animations))
    check('when the flight lands the stand-in is gone', landed.ghost === false, JSON.stringify(landed))
    check('the row is visible again when the flight lands',
      landed.hidden === false && landed.visibility === 'visible', JSON.stringify(landed))
    const sendReduced = send.reduced || {}
    check('the animation choice reaches it too: Reduced flies nothing and leaves the row visible (D26)',
      sendReduced.ghost === false && sendReduced.hidden === false && sendReduced.visibility === 'visible',
      JSON.stringify(sendReduced))
  },
  // The DeepSeek brand's whale: its palette, the sheet it plays on the home
  // card, the sheet a state change switches to, and the motion choice holding a
  // sheet's still frame. The states it plays on the conversation page are the
  // crab case's, which walks the mascot feature whole.
  deepy(r) {
    basicChecks(r)
    const deepy = r.states || {}
    const is = (state, animation, place) => !!state && state.animation === animation && state.place === place && state.ready === true
    check('the brand stored as "off" reads as DeepSeek, and the light canvas turns sky white',
      deepy.brand === 'deepseek' && deepy.canvas === 'rgb(250, 251, 255)', JSON.stringify({ brand: deepy.brand, canvas: deepy.canvas }))
    check('the DeepSeek brand turns blue: DeepSeek\'s brand blue for the accent, a blue link, a blue-black dark canvas',
      deepy.accent === '#4d6bfe' && deepy.link === '#3b56d9' && !!deepy.dark && deepy.dark.canvas === 'rgb(19, 22, 29)' &&
        deepy.dark.accent === '#4d6bfe' && deepy.dark.raised === '#1b1f28',
      JSON.stringify({ accent: deepy.accent, link: deepy.link, dark: deepy.dark }))
    check('the whale takes the crab\'s place on the home card, idling, playing the vector rebuilt from its sheet',
      is(deepy.home, 'idle', 'card') && deepy.crab === false && /^url\("blob:/.test(deepy.home.sheet),
      JSON.stringify({ home: deepy.home, crab: deepy.crab }))
    check('its frames change on its own node without waking a pass',
      !!deepy.idle && deepy.idle.before !== deepy.idle.after && deepy.idle.passes === 0, JSON.stringify(deepy.idle))
    check('a click on its face pokes it', is(deepy.poke, 'poke-left', 'card'), JSON.stringify(deepy.poke))
    check('the state change switches the node to another served sheet',
      !!deepy.home && !!deepy.poke && deepy.poke.sheet !== deepy.home.sheet && /^url\("blob:/.test(deepy.poke.sheet),
      JSON.stringify({ home: deepy.home.sheet, poke: deepy.poke.sheet }))
    check('the animation choice resolves onto the document: reduced holds the still frame, always plays',
      deepy.stillAttr === 'reduced' && deepy.alwaysAttr === 'full' &&
        !!deepy.still && deepy.still.before === deepy.still.after,
      JSON.stringify({ stillAttr: deepy.stillAttr, alwaysAttr: deepy.alwaysAttr, frames: deepy.still }))
    check('it leaves with the page, and takes its anchor mark along', deepy.gone === true, JSON.stringify(deepy.gone))
    commonChecks(r)
  },
}

module.exports = { CASES }
