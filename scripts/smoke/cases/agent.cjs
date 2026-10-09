'use strict'
const { MARKUP, SKIN_FACE, SKIN_HAT, same, check, contrast, basicChecks, commonChecks } = require('./_shared.cjs')
const { deferredWanted } = require('../shared.cjs')

module.exports = {
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
  'chunk-fault'(r) {
    const switchedOff = r.errors.map((line) => (/"([A-Za-z]+)" failed and was switched off/.exec(line) || [])[1]).sort()
    check('apply() completes although no feature chunk loads', r.applyError === null, r.applyError)
    // The page sits on the shipped preferences, so a feature gated on the Redraw
    // tier of the chat-area animation choice never asks for its chunk here.
    check('each deferred feature the page wants was switched off once, and nothing else',
      same(switchedOff, [...deferredWanted({ chatAnimations: 'enhanced' })].sort()), r.errors.join(' | '))
    check('each report names the chunk that did not load', r.errors.every((line) => line.includes('/dsh-claude-style/assets/') && line.includes('failed to load')), r.errors.join(' | '))
    check('the features in the bundle keep running', r.composerRestyle === true && r.accountUser === 'Tester', JSON.stringify({ restyle: r.composerRestyle, account: r.accountUser }))
    commonChecks(r)
  },
  'chunk-late'(r) {
    check('apply() completes', r.applyError === null, r.applyError)
    check('a chunk arriving after its generation ended installs nothing', same(r.lateSlots, []) && r.lateNodes === 0,
      JSON.stringify({ slots: r.lateSlots, nodes: r.lateNodes }))
    check('no feature reported a failure', r.errors.length === 0, r.errors.join(' | '))
    check('nothing the skin runs leaves an uncaught error or an unhandled rejection',
      Array.isArray(r.uncaught) && r.uncaught.length === 0, (r.uncaught || []).join(' | ').slice(0, 600))
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
}
