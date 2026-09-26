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

/** Checks every case shares: a clean teardown and an idle scheduler. */
function commonChecks(r) {
  check('nothing the skin runs leaves an uncaught error or an unhandled rejection',
    Array.isArray(r.uncaught) && r.uncaught.length === 0, (r.uncaught || []).join(' | ').slice(0, 600))
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
  check('scheduler idle once settled (0 passes in 1 s)', r.idlePasses === 0, `${r.idlePasses} passes`)
  check('a closed popover card claims no menu role for the host\'s keyboard arbitration',
    r.closedMenuCards === 0, `${r.closedMenuCards} closed cards carry role=menu`)
  check('no Windows titlebar marker: the body carries no data-dsh-titlebar-tabs',
    r.titlebarTabs === false, JSON.stringify(r.titlebarTabs))
  check('teardown registered with the host', r.teardownRegistered)
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
  default(r) {
    check('apply() completes', r.applyError === null, r.applyError)
    check('stylesheet injected', r.stylesheet)
    const greeting = r.greeting || {}
    check('the classic hero draws its welcome on arrival and keeps it between passes',
      typeof greeting.low === 'string' && greeting.low !== 'Host greeting' && greeting.low !== '' &&
        greeting.held === greeting.low && typeof greeting.high === 'string' && greeting.high !== 'Host greeting' &&
        greeting.high !== greeting.low,
      JSON.stringify(greeting))
    check('the classic hero page carries no crab', r.classicCrab === false, JSON.stringify(r.classicCrab))
    const pill = r.viewPill || {}
    const under = (s) => !!s && s.attr && s.content !== 'none' && Math.abs(s.x - s.itemX) < 0.5 &&
      Math.abs(s.w - s.itemW) < 0.5 && s.itemFill === 'rgba(0, 0, 0, 0)'
    check('the conversation header\'s tab strip is stamped for the stylesheet', pill.stamped === true, JSON.stringify(pill.stamped))
    check('the view tabs draw their pill under the active tab without sliding in',
      under(pill.first) && pill.first.slides.length === 0, JSON.stringify(pill.first))
    check('a view switch slides the pill to the newly active tab',
      under(pill.switched) && pill.switched.slides.indexOf('transform') !== -1 && pill.switched.x > pill.first.x,
      JSON.stringify(pill.switched))
    check('the pill slides whatever the system motion setting: no reduced-motion rule reaches it',
      pill.reducedMotionRules === 0, `${pill.reducedMotionRules} rules`)
    check('teardown takes the pill, its placement and the strip stamp off the view tabs', pill.left === false, JSON.stringify(pill.left))
    const search = r.search || {}
    check('the search box goes in the brand row beside the brand, and rests hidden until the sidebar is hovered',
      search.placed === true && search.rowMarked === true && search.resting === 'hidden', JSON.stringify(search))
    check('pressing the search box renders the host modal through a root of the skin\'s own', search.modalRendered === true, JSON.stringify(search))
    check('teardown takes the search box, its row mark and its root away',
      search.left === 0 && search.rootUnmounted === true, JSON.stringify(search))
    check('teardown takes the draft marks off the composer cards', r.leftDraftMarks === 0, `${r.leftDraftMarks} left`)
    const controls = r.controls || {}
    check('the composer\'s host controls are marked by structure: commands, access, send',
      controls.commands === 'commands' && controls.access === 'access' && controls.send === 'send', JSON.stringify(controls))
    check('the submit button\'s mark follows its glyph to stop and back',
      controls.stopping === 'stop' && controls.back === 'send', JSON.stringify(controls))
    check('teardown takes the control marks off the host controls', r.leftControlMarks === 0, `${r.leftControlMarks} left`)
    check('no feature reported a failure', r.errors.length === 0, r.errors.join(' | '))
    check('detailed stats keep the merged sentence: host icons hidden, our separator in',
      r.statsMode === 'detailed' && r.statsIcons !== null && r.statsIcons.length === 2 &&
        r.statsIcons.every((d) => d === 'none') && r.statsSep !== null && r.statsSep.indexOf('·') !== -1,
      JSON.stringify({ mode: r.statsMode, icons: r.statsIcons, sep: r.statsSep }))
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
    check('Enter on an open composer menu reaches the host', same(r.keys, ['host picked the menu item']), JSON.stringify(r.keys))
    check("the permission control stands in for the host's access button", r.composerRestyle && !r.hostAccessVisible,
      JSON.stringify({ restyle: r.composerRestyle, hostAccess: r.hostAccessVisible }))
    check('the permission ladder is the catalog, in the skin order',
      same(r.permRows.map(function (row) { return row.preset }), ['read-only', 'workspace-write', 'auto', 'danger-full-access']),
      JSON.stringify(r.permRows))
    check('the Auto review tier is offered while the catalog carries the preset',
      r.permAutoRowDisplay !== null && r.permAutoRowDisplay !== 'none' &&
        r.permRows[2].text.indexOf('Auto review') === 0,
      JSON.stringify({ popoverRow: r.permAutoRowDisplay, row: r.permRows[2] }))
    check('the stats card keeps both sections when the host panels mount late',
      r.statsCardOpen === 1 && same(r.statsCardSections, ['会话统计', 'Token 用量']),
      JSON.stringify({ open: r.statsCardOpen, sections: r.statsCardSections }))
    check('the late card carries both sections\' rows',
      same(r.statsCardLabels, ['模型用时', '工具调用用时', '缓存命中', '输出']),
      JSON.stringify(r.statsCardLabels))
    check('the closed drawer takes its parked rows out of the paint tree',
      r.syntheticVisibility === 'hidden' && r.syntheticRowVisibility === 'hidden',
      JSON.stringify({ panel: r.syntheticVisibility, row: r.syntheticRowVisibility }))
    commonChecks(r)
  },
  // The auto mode cases: the ladder follows the host catalog, so a third-party
  // permission tier is a first-class row.
  automode(r) {
    check('apply() completes', r.applyError === null, r.applyError)
    check('no feature reported a failure', r.errors.length === 0, r.errors.join(' | '))
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
    check('apply() completes', r.applyError === null, r.applyError)
    check('no feature reported a failure', r.errors.length === 0, r.errors.join(' | '))
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
    check('apply() completes', r.applyError === null, r.applyError)
    check('no feature reported a failure', r.errors.length === 0, r.errors.join(' | '))
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
    check('apply() completes', r.applyError === null, r.applyError)
    check('no feature reported a failure', r.errors.length === 0, r.errors.join(' | '))
    check('the ladder is drawn in the conversation view', same(r.rowsBeforeHome, ladder), JSON.stringify(r.rowsBeforeHome))
    check('the home view shows it as segments and leaves no popover behind',
      same(r.segmentsInHome, ladder) && r.popoversInHome === 0,
      JSON.stringify({ segments: r.segmentsInHome, popovers: r.popoversInHome }))
    check('returning to the conversation draws the ladder again',
      same(r.rowsAfterReturn, ladder), JSON.stringify(r.rowsAfterReturn))
    commonChecks(r)
  },
  hdsl(r) {
    check('apply() completes', r.applyError === null, r.applyError)
    check('no feature reported a failure', r.errors.length === 0, r.errors.join(' | '))
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
    check('apply() completes', r.applyError === null, r.applyError)
    check('no feature reported a failure', r.errors.length === 0, r.errors.join(' | '))
    check('the launcher account still names the instance', r.accountUser === 'HDSLPlayer', JSON.stringify(r.accountUser))
    check('a built-in figure with no picture leaves the circle to the mark alone',
      r.skinCanvas === null && r.skinFlag === false && r.photo === null,
      JSON.stringify({ canvas: r.skinCanvas, flag: r.skinFlag, photo: r.photo }))
    commonChecks(r)
  },
  'hdsl-broken'(r) {
    check('apply() completes', r.applyError === null, r.applyError)
    check('no feature reported a failure', r.errors.length === 0, r.errors.join(' | '))
    check('a picture the launcher points at but cannot serve leaves no canvas and no marker',
      r.skinCanvas === null && r.skinFlag === false,
      JSON.stringify({ canvas: r.skinCanvas, flag: r.skinFlag }))
    check('the failed picture falls back to the circle as it was',
      r.avatarRadius === '50%', JSON.stringify(r.avatarRadius))
    commonChecks(r)
  },
  'stats-compact'(r) {
    check('apply() completes', r.applyError === null, r.applyError)
    check('no feature reported a failure', r.errors.length === 0, r.errors.join(' | '))
    check('compact stats carry the skin sentence: icons hidden, our separator in',
      r.statsMode === 'compact' && r.statsIcons !== null && r.statsIcons.length === 2 &&
        r.statsIcons.every((d) => d === 'none') && r.statsSep.indexOf('·') !== -1,
      JSON.stringify({ mode: r.statsMode, icons: r.statsIcons, sep: r.statsSep }))
    check('a hover on compact stats opens no card', r.statsOpen === 0, r.statsOpen + ' open')
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
    check('the rest of the skin keeps running', r.stylesheet && r.composerRestyle && same(r.keys, ['host picked the menu item']))
    commonChecks(r)
  },
  'sync-fault'(r) {
    check('apply() completes', r.applyError === null, r.applyError)
    check('only the two features that read the session list were switched off: the permission control and the model picker',
      r.errors.length === 2 && r.errors.some((e) => e.includes('"permissions"')) && r.errors.some((e) => e.includes('"model"')), r.errors.join(' | '))
    check("the host's own access button is handed back", r.hostAccessVisible === true, JSON.stringify(r.hostAccessVisible))
    check('the composer restyle keeps running', r.composerRestyle === true, JSON.stringify(r.composerRestyle))
    check('the rest of the skin keeps running', r.stylesheet && r.accountUser === 'Tester', JSON.stringify(r.accountUser))
    commonChecks(r)
  },
  studio(r) {
    check('apply() completes', r.applyError === null, r.applyError)
    check('no feature reported a failure', r.errors.length === 0, r.errors.join(' | '))
    check('the studio preference reaches the document',
      r.homeLayoutAttr === 'studio', JSON.stringify(r.homeLayoutAttr))
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
    check('the crab stands on the hero card on its resting frame, drawn from the inlined crab strip and rod mask',
      mascot.mounted === true && mascot.frame === '0' && mascot.body === true && mascot.rod === true &&
        mascot.bodyShift === '0px', JSON.stringify(mascot))
    check('the pointer leaving the crab plays the routine and it ends on the resting frame, without waking a pass',
      mascot.early !== '0' && mascot.early !== '' && mascot.earlyShift === `${-68 * Number(mascot.early)}px` &&
        mascot.settled === '0' && mascot.passesDuring === 0,
      JSON.stringify(mascot))
    check('a click reaches the crab; under reduced motion only a click plays the routine',
      mascot.reachable === true && mascot.reducedLeave === '0' && mascot.clicked !== '0' && mascot.clickSettled === '0',
      JSON.stringify(mascot))
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
    check('apply() completes', r.applyError === null, r.applyError)
    check('no feature reported a failure', r.errors.length === 0, r.errors.join(' | '))
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
    check('apply() completes', r.applyError === null, r.applyError)
    check('no feature reported a failure', r.errors.length === 0, r.errors.join(' | '))
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
      JSON.stringify({ keyframes: r.menuEntryKeyframes, animation: r.menuEntryAnimation }))
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
    check('apply() completes', r.applyError === null, r.applyError)
    check('no feature reported a failure', r.errors.length === 0, r.errors.join(' | '))
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
}

module.exports = { CASES }
