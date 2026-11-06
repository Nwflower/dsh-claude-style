import { same, check, basicChecks, commonChecks } from './_shared.mjs'

/** The shell surfaces a wallpaper plugin shows through, and what the Claude palette paints them */
const CLAUDE_SHELL = ['body', 'sidebar', 'conversation']
const CLAUDE_FILLS = [['body', 'rgb(255, 255, 255)'], ['sidebar', 'rgb(250, 250, 250)'], ['conversation', 'rgb(255, 255, 255)']]

export default {
  // The skin's own Claude palette: the white and near-black canvases, the clay
  // accent and the card fill, read from the live custom properties.
  brand(r) {
    basicChecks(r)
    const palette = r.claudePalette || {}
    check('the Claude brand keeps its white and near-black canvases and the clay accent',
      palette.canvas === 'rgb(255, 255, 255)' && palette.accent === '#d97757' && !!palette.dark &&
        palette.dark.canvas === 'rgb(25, 25, 25)' && palette.dark.accent === '#d97757' && palette.dark.card === '#232323',
      JSON.stringify(palette))
    const deepseek = r.deepseekPalette || {}
    check('the DeepSeek brand paints a pale blue-white light shell and keeps its blue-black dark shell',
      deepseek.canvas === 'rgb(251, 252, 255)' && deepseek.accent === '#4d6bfe' && !!deepseek.dark &&
        deepseek.dark.canvas === 'rgb(19, 22, 29)' && deepseek.dark.accent === '#4d6bfe',
      JSON.stringify(deepseek))
    commonChecks(r)
  },
  // The custom brand over the Claude brand (D30): both images painted where the
  // brand's art stood, the ink the image-colour choice names — the text colour
  // and the accent, the latter while the page follows a brand's colour card —
  // and the brand's own accent back once it is cleared.
  'custom-brand'(r) {
    basicChecks(r)
    const brand = r.customBrand || {}
    const images = brand.images || {}
    const markUrl = '/dsh-claude-style/brand/mark?v=1-1'
    const wordUrl = '/dsh-claude-style/brand/wordmark?v=1-1'
    check('the mark the host half holds replaces the brand\'s art in the sidebar, on the hero and as the account row\'s fallback picture',
      images.markAttr === '' && images.hostArt === 'none' &&
        images.mark.image.includes(markUrl) && images.mark.mask === 'none' && images.mark.width === '18px' &&
        images.hero.image.includes(markUrl) && images.hero.width === '42.5px' &&
        typeof images.avatar === 'string' && images.avatar.includes(markUrl),
      JSON.stringify(images))
    check('the wordmark replaces the brand name at the 18px cap height, its width read from the image\'s 4:1 proportions',
      images.wordAttr === 'image' && images.hostWord === 'none' &&
        images.word.image.includes(wordUrl) && images.word.width === '72px' && images.word.height === '18px',
      JSON.stringify(images.word))
    const tinted = brand.tinted || {}
    check('the text-colour choice paints the mark and the account row\'s fallback picture as shapes in the label colour, and the wordmark still outranks a brand name',
      tinted.tintAttr === '' && tinted.mark.image === 'none' && tinted.mark.mask.includes(markUrl) &&
        tinted.mark.fill !== 'rgba(0, 0, 0, 0)' &&
        tinted.avatar === 'none' && tinted.avatarFill !== 'rgba(0, 0, 0, 0)' && tinted.wordAttr === 'image',
      JSON.stringify(tinted))
    check('a custom accent takes the accent tokens, with the light ink on a dark fill',
      tinted.accent === '#1a7f5a' && tinted.accentInk === '#faf9f5', JSON.stringify({ accent: tinted.accent, ink: tinted.accentInk }))
    check('an unpicked inline-code colour keeps the card\'s own ink for each scheme, so the chip stays legible on the dark canvas',
      !!tinted.codeInk && tinted.codeInk.light === 'rgb(22, 22, 22)' && tinted.codeInk.dark === 'rgb(253, 253, 253)',
      JSON.stringify(tinted.codeInk))
    const accented = brand.accented || {}
    const accentRgb = brand.accentRgb
    check('the accent choice paints the mark, the wordmark and the account row\'s fallback picture as shapes in the accent, while the page follows a brand\'s own colour card',
      accented.tintAttr === '' && accented.mark.image === 'none' && accented.mark.mask.includes(markUrl) &&
        accented.mark.fill === accentRgb && accented.word.image === 'none' &&
        accented.avatar === 'none' && accented.avatarFill === accentRgb,
      JSON.stringify({ accented, accentRgb }))
    const cleared = brand.cleared || {}
    check('clearing the accent hands the brand\'s own accent back, and the images return to their own colours',
      cleared.accent === '#d97757' && cleared.tintAttr === null && cleared.mark.image.includes(markUrl),
      JSON.stringify(cleared))
    check('teardown takes the custom brand\'s values off <body>',
      Array.isArray(r.leftBrandProperties) && r.leftBrandProperties.length === 0, JSON.stringify(r.leftBrandProperties))
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
    check('the classic hero draws the permission segments in the card\'s mode strip',
      JSON.stringify(r.classicSegments) === JSON.stringify(['Read', 'Edit', 'Auto', 'Yolo']) && r.classicPermTrigger === false,
      JSON.stringify({ segments: r.classicSegments, trigger: r.classicPermTrigger }))
    check('the classic hero page carries the crab too', r.classicCrab === true, JSON.stringify(r.classicCrab))
    const ripple = r.ripple || {}
    check('the glyph field is off until its switch turns it on', ripple.off === true, JSON.stringify(ripple.off))
    check('the hero root carries the glyph field\'s canvas, under its content and taking no press',
      ripple.stamped === true && ripple.canvas === true && ripple.pointerEvents === 'none' && ripple.order === '-1', JSON.stringify(ripple))
    check('the glyph field\'s switch takes the canvas off the hero root, and putting it back mounts it again',
      ripple.gone === true && ripple.back === true, JSON.stringify({ gone: ripple.gone, back: ripple.back }))
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
  // The strip's row with the overflow button: the host draws the tablist and the
  // overflow button in a row of its own and counts the tabs it keeps from that
  // row's width, so the row keeps the header's width while the plate inside it
  // hugs the tabs and the pill travels inside the plate.
  'view-tabs-row'(r) {
    basicChecks(r)
    const row = r.viewRow || {}
    const plate = row.plate || {}
    const chip = row.chip || {}
    const under = (s) => !!s && s.attr && s.content !== 'none' && Math.abs(s.x - s.itemX) < 0.5 &&
      Math.abs(s.w - s.itemW) < 0.5 && s.itemFill === 'rgba(0, 0, 0, 0)'
    check('the row the host counts its tabs from spans the header, and the plate inside it hugs them',
      row.justifyContent === 'center' && row.pointerEvents === 'none' &&
        row.width === row.headerWidth && row.counted === row.headerWidth &&
        plate.width < row.width - chip.width,
      JSON.stringify({ justifyContent: row.justifyContent, pointerEvents: row.pointerEvents, row: row.width, counted: row.counted, plate: plate.width, chip: chip.width }))
    check('the lift rides the plate and the button, leaving the row that spans the header untranslated',
      row.transform !== undefined && row.transform.row === 'none' &&
        row.transform.list !== undefined && row.transform.list !== 'none',
      JSON.stringify(row.transform))
    check('the plate is the skin\'s small switch, carrying its shell and its own radius',
      plate.radius === '7px' && plate.padding === '2px' && plate.gap === '2px' && plate.background !== 'rgba(0, 0, 0, 0)',
      JSON.stringify(plate))
    check('the plate and the overflow button stand as one group in the row\'s middle, the button seated like a tab',
      Math.abs(row.groupCentre - row.width / 2) <= 1 && Math.abs(chip.centre - plate.centre) <= 1 &&
        chip.width === 22 && chip.height === 22 && chip.marginTop === '0px',
      JSON.stringify({ group: row.groupCentre, width: row.width, plate: plate, chip: chip }))
    check('the tabs are the compact 22px segment, without the shipped underline',
      row.tabHeight === '22px' && row.underline === 'none', JSON.stringify({ height: row.tabHeight, underline: row.underline }))
    const tabBoxes = row.tabBoxes || []
    check('neighbouring view-tab buttons keep separate layout boxes',
      tabBoxes.length === 4 && tabBoxes.every((box, index) => index === 0 || tabBoxes[index - 1].right <= box.left),
      JSON.stringify(tabBoxes))
    check('the view tabs draw their pill under the active tab inside the plate, without sliding in',
      under(row.pill) && row.pill.slides.length === 0, JSON.stringify(row.pill))
    check('a view switch slides the pill to the newly active tab',
      under(row.pillSwitched) && row.pillSwitched.slides.indexOf('transform') !== -1 && row.pillSwitched.x > row.pill.x,
      JSON.stringify(row.pillSwitched), 'timing')
    check('teardown hands the row and the plate back as the host drew them', row.left === false, JSON.stringify(row.left))
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
    check('the lifted title is drawn in the caption row, where a press on its own place reaches it: the cluster\'s own fade is dropped while the title stands outside that cluster',
      laid.titleHit === true && laid.clusterMask === 'none',
      JSON.stringify({ hit: laid.titleHit, mask: laid.clusterMask }))
    check('the words the row carries are the window\'s own: a press on the title starts no selection',
      laid.titleSelect === 'none' && laid.headerSelect === 'none',
      JSON.stringify({ title: laid.titleSelect, header: laid.headerSelect }))
    check('the title is handed the room left between its own edge and the controls once the strip\'s width is reserved, and the row it left keeps its gap under it',
      laid.titleLeft === laid.row.x + 'px' &&
        laid.titleMax === laid.utilities.x - b.air - ((laid.strip.right - laid.strip.x) + b.air) - laid.title.x + 'px' &&
        laid.row.y === laid.title.y + 28 + b.gap && laid.rowPosition === 'relative' && laid.rowOffset === laid.rowLift &&
        laid.row.y === laid.rowLift.replace('px', '') * 1 + laid.header.y + parseFloat(laid.headerPaddingTop) &&
        laid.preset.x === laid.row.x,
      JSON.stringify({ left: laid.titleLeft, max: laid.titleMax, lift: laid.rowLift, offset: laid.rowOffset, row: laid.row, header: laid.header, preset: laid.preset, utilities: laid.utilities, strip: laid.strip }))
    const panelClosed = b.panelClosed || {}
    check('the right panel\'s collapse control is the skin\'s own, drawn in the header\'s row: it shows while the panel is open and hides with the panel, and the panel\'s own copy stays where the host drew it',
      laid.closeInline === 'inline-flex' && laid.closeShown !== 'none' &&
        laid.hostToggleDisplay !== 'none' && panelClosed.close === 'none',
      JSON.stringify({ laid: { close: laid.closeInline, shown: laid.closeShown, host: laid.hostToggleDisplay }, closed: panelClosed }))
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
    check('switching the feature off hands the row back whole — the strip the other feature placed stays, and the cluster\'s own fade with it — and switching it on places both sides again',
      off.marks.band === null && off.marks.title === false && off.marks.utilities === false && off.marks.corner === false &&
        off.stripStamped === true && off.clusterMask !== 'none' &&
        back.marks.band === 'title actions' && back.marks.title === true && back.marks.utilities === true &&
        back.titleHit === true && back.clusterMask === 'none',
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
    const glyph = r.stopGlyph || {}
    check('the stop mark is drawn by the skin: a whole-pixel square filled with the button\'s ink under a 16px ring, the host\'s scaled glyph unpainted',
      glyph.hostGlyph === 'none' && glyph.ring === '16px' && glyph.squareWidth === '4px' &&
        glyph.squareHeight === '4px' && glyph.fill === glyph.ink,
      JSON.stringify(glyph))
    check('teardown takes the draft marks off the composer cards', r.leftDraftMarks === 0, `${r.leftDraftMarks} left`)
    check('teardown takes the control marks off the host controls', r.leftControlMarks === 0, `${r.leftControlMarks} left`)
    check('Enter on an open composer menu reaches the host', same(r.keys, ['host picked the menu item']), JSON.stringify(r.keys))
    commonChecks(r)
  },
  // The sidebar's search entry: the Standalone style registers a host panel-list
  // row without a main-panel seat; the Icon style hands it back and leaves the
  // host's own search control in place. Either way the host's modal opens through
  // a root of the skin's own.
  search(r) {
    basicChecks(r)
    const search = r.search || {}
    check('the Standalone style registers the search entry in the sidebar panel list when the case starts',
      search.registered === true && search.rowMarked === false, JSON.stringify(search))
    check('pressing the host\'s search control renders the host modal through a root of the skin\'s own', search.modalRendered === true, JSON.stringify(search))
    const standalone = search.standalone || {}
    check('the Standalone style keeps the panel entry and hides the host\'s own search slot',
      standalone.panelRegistered === true && standalone.rowMarked === false && standalone.hostSlotPosition === 'absolute',
      JSON.stringify(standalone))
    const icon = search.icon || {}
    check('the Icon style hands the panel entry back, leaves the host\'s search slot in the header, and takes its click over',
      icon.panelRegistered === false && icon.rowMarked === false &&
        icon.hostSlotPosition !== 'absolute' && icon.hostSlotWidth > 10 && icon.hostClicksReachingHost === 0,
      JSON.stringify(icon))
    const back = search.back || {}
    check('switching the style back to Standalone registers the entry again, live',
      back.panelRegistered === true && back.rowMarked === false && back.hostSlotPosition === 'absolute',
      JSON.stringify(back))
    // The New session row carries the same host markup the palette's caps are
    // cut for; both are read field by field, so the hints cannot drift apart.
    const caps = search.keycaps || {}
    const cap = Array.isArray(caps.search) && caps.search.length === 1 ? caps.search[0] : null
    check('the New session row wears the search button\'s own key caps, and the `+` between them is gone',
      cap !== null && Array.isArray(caps.shortcut) && caps.shortcut.length === 2 &&
        caps.shortcut.every((entry) => same(entry, cap)) &&
        caps.separators.length === 1 && caps.separators.every((display) => display === 'none'),
      JSON.stringify(caps))
    check('teardown takes the search entry and its root away',
      search.left === 0 && search.rootUnmounted === true, JSON.stringify(search))
    commonChecks(r)
  },
  // The account row's self-built drawer: the header, the plugin rows, the
  // settings row, the nickname and the avatar.
  account(r) {
    basicChecks(r)
    check('synthetic path: the popover carries the header, the plugin rows and the settings row',
      r.drawer !== null && same(r.drawer, ['embed', 'action', 'embed', 'settings']) && r.syntheticHeader === true,
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
    // The account area's switch is live: its teardown takes the row and the
    // drawer away and hands the host's own footer back.
    const footerSwitch = r.footerSwitch || {}
    check('switching the sidebar account area off takes its row and drawer off the page, and on builds them again',
      footerSwitch.before !== undefined && footerSwitch.before.row === true && footerSwitch.before.drawer === true &&
        footerSwitch.before.takeover === true && footerSwitch.off !== undefined &&
        footerSwitch.off.row === false && footerSwitch.off.drawer === false && footerSwitch.off.takeover === false &&
        footerSwitch.back !== undefined && footerSwitch.back.row === true && footerSwitch.back.drawer === true,
      JSON.stringify(footerSwitch))
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
    check('with the hover preference on, a press on the open drawer keeps it open',
      r.drawerAfterPress === 1 && r.drawerOpenAttrAfterPress === 'true',
      JSON.stringify({ open: r.drawerAfterPress, marker: r.drawerOpenAttrAfterPress }))
    check("opening the hero row's host menu folds the drawer",
      r.heroUp === true && r.drawerFoldedByHero === 0,
      JSON.stringify({ hero: r.heroUp, drawer: r.drawerFoldedByHero }))
    check('opening the permission card folds the hero menu',
      r.permReopened === 1 && r.heroFoldedByPerm === false,
      JSON.stringify({ permission: r.permReopened, hero: r.heroFoldedByPerm }))
    check('with the hover preference on, a press on the open permission card keeps it up',
      r.permUpAfterPress === 1, JSON.stringify(r.permUpAfterPress))
    check('with the hover preference on, a press on the open hero menu keeps it up and the leave closes it',
      r.heroUpBeforePress === true && r.heroUpAfterPress === true && r.heroLeftAfterPress === 0,
      JSON.stringify({ before: r.heroUpBeforePress, after: r.heroUpAfterPress, left: r.heroLeftAfterPress }))
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
  'sidebar-layout'(r) {
    basicChecks(r)
    const layout = r.sidebarLayout || {}
    const relaxed = layout.relaxed || {}
    const compact = layout.compact || {}
    const back = layout.back || {}
    check('the sidebar-layout choice resolves onto the document, relaxed by default',
      relaxed.attr === 'relaxed' && relaxed.rowHeight === 28 && relaxed.footPadding === '8px 6px',
      JSON.stringify(relaxed))
    check('Compact takes the conversation rows\' height and the footer\'s padding down',
      compact.attr === 'compact' && compact.rowHeight === 24 && compact.rowMin === '24px' &&
        compact.footPadding === '4px 3px',
      JSON.stringify(compact))
    check('switching back to Relaxed restores every value without a reload',
      back.attr === 'relaxed' && same(back, relaxed), JSON.stringify(back))
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
      claude.base === '#ffffff' && claude.body === 'rgb(255, 255, 255)' && claude.account === 'rgb(255, 255, 255)' &&
        claude.popover === 'rgb(255, 255, 255)' && /Anthropic Serif Web Text/.test(claude.heading || ''),
      JSON.stringify(claude))
    // A wallpaper under the Claude palette. The shell canvases stand down
    // and one fixed mask in the canvas colour lies over the wallpaper; the base
    // canvas the host paints its dialogs and cards with stays opaque, and so do
    // the skin's own faces. Taking the marker away brings the fills back and
    // lifts the mask. The document element's canvas stays behind the layer.
    const wallClaude = hp.claudeWallpaper || {}
    check('with the Claude palette and a wallpaper up the shell stands down under one mask',
      CLAUDE_SHELL.every((key) => wallClaude[key] === 'rgba(0, 0, 0, 0)') && wallClaude.sidebarFill === 'transparent' &&
        wallClaude.maskPosition === 'fixed' && /^color\(srgb 1 1 1 \/ 0\.86\)$/.test(wallClaude.mask || '') &&
        wallClaude.html === 'rgb(255, 255, 255)',
      JSON.stringify(wallClaude))
    check('and the base canvas and the skin\'s own faces keep their fill',
      wallClaude.base === '#ffffff' && wallClaude.popover === claude.popover && wallClaude.account === claude.account &&
        wallClaude.search === claude.search,
      JSON.stringify({ wallpaper: wallClaude, claude }))
    const half = hp.halfWallpaper || {}
    check('the background opacity multiplies the wallpaper mask while the cards keep their paint',
      /^color\(srgb 1 1 1 \/ 0\.43\)$/.test(half.mask || '') && half.popover === claude.popover && half.search === claude.search,
      JSON.stringify(half))
    check('with the wallpaper gone the skin\'s own fills are back and the mask is lifted',
      CLAUDE_FILLS.every(([key, value]) => claude[key] === value) && claude.sidebarFill === '#fafafa' &&
        claude.mask === 'rgba(0, 0, 0, 0)',
      JSON.stringify(claude))
    commonChecks(r)
  },
}
