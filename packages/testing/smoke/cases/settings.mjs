import { BAND_ANIMATION, check, basicChecks, commonChecks } from './_shared.mjs'

export default {
  'late-forms'(r) {
    check('apply() completes', r.applyError === null, r.applyError)
    check('the store stays on the defaults (the studio home) until the namespace is served',
      r.lateBefore === 'studio', JSON.stringify(r.lateBefore))
    check('a namespace served after apply still binds the form and its value (classic)',
      r.lateAfter === 'classic' && r.homeLayoutAttr === 'classic',
      JSON.stringify({ after: r.lateAfter, final: r.homeLayoutAttr }))
    commonChecks(r)
  },
  settings(r) {
    basicChecks(r)
    const settings = r.settings || {}
    check('the settings section registers with the settings dialog', settings.registered === true, JSON.stringify(settings.registered))
    const expected = {
      general: ['brand', 'username', 'pageZoom', 'autoPopover', 'sodium'],
      appearance: ['sidebarBrand', 'brandLockup', 'brandInk', 'palette', 'paletteCards', 'backgroundOpacity', 'typeface', 'homeLayout', 'homeRipple', 'mascot', 'mascotScope'],
      'main-window': ['turnNav', 'messageActions', 'conversationWidth', 'viewTabs', 'headerBand', 'processRows', 'answerAnchor', 'composerScope', 'composerBottomGap', 'questionCard', 'permissionsControl', 'modelPicker', 'effortSlider', 'modelDescriptions', 'quickProviders', 'peakrate', 'effortAccent', 'contextDisplay', 'contextNumbers', 'statsPosition', 'statsFooterAlign', 'billingCurrency', 'billingTable'],
      sidebar: ['collapseFooter', 'banLocale', 'sidebarSearch', 'searchStyle', 'sidebarEntries', 'workspaceView', 'sidebarPeek', 'sidebarLayout'],
      motion: ['motion', 'chatAnimations', 'chatWait', 'statusDetail', 'statusMotion', 'chatReveal', 'chatSend', 'messageEnter', 'caretMotion', 'ongoingIndicator', 'ongoingIndicatorSide'],
    }
    // The main window's three groups, each under its label and carrying its own
    // rows: the conversation side, the composer's controls with the model
    // picker's rows, and the context meter with the statistics and the billing.
    const mainWindowGroups = [
      { label: 'Conversation', rows: ['turnNav', 'messageActions', 'conversationWidth', 'viewTabs', 'headerBand', 'processRows', 'answerAnchor'] },
      { label: 'Composer', rows: ['composerScope', 'composerBottomGap', 'questionCard', 'permissionsControl', 'modelPicker', 'effortSlider', 'modelDescriptions', 'quickProviders', 'peakrate', 'effortAccent'] },
      { label: 'Context and cost', rows: ['contextDisplay', 'contextNumbers', 'statsPosition', 'statsFooterAlign', 'billingCurrency', 'billingTable'] },
    ]
    // Greyed by the page itself rather than by a preference: the title-bar
    // band waits for the Windows desktop window, and the footer alignment for
    // the footer position the page opens away from.
    const expectedGrey = { 'main-window': ['headerBand', 'statsFooterAlign'] }
    const pages = settings.pages || {}
    for (const tab of Object.keys(expected)) {
      const page = pages[tab] || {}
      check(`the ${tab} tab is selected in the five-tab strip and carries its rows, greying only the rows that wait for something`,
        JSON.stringify(page.tabs) === JSON.stringify(Object.keys(expected)) && page.selected === tab &&
          JSON.stringify(page.rows) === JSON.stringify(expected[tab]) &&
          JSON.stringify(page.disabled || []) === JSON.stringify(expectedGrey[tab] || []) &&
          JSON.stringify(page.notes || []) === JSON.stringify(expectedGrey[tab] || []),
        JSON.stringify(page))
    }
    const mainWindow = pages['main-window'] || {}
    check('the main window page opens with the conversation group and continues with the composer\'s, each label above its own rows',
      JSON.stringify(mainWindow.groups) === JSON.stringify(mainWindowGroups),
      JSON.stringify(mainWindow.groups))
    const onWindows = settings.onWindows || {}
    check('on the Windows window the title-bar row takes input and the footer alignment still waits for its position',
      JSON.stringify(onWindows.rows) === JSON.stringify(expected['main-window']) &&
        JSON.stringify(onWindows.disabled) === '["statsFooterAlign"]' && JSON.stringify(onWindows.notes) === '["statsFooterAlign"]',
      JSON.stringify(onWindows))
    const palette = settings.paletteCards || {}
    const paletteCard = (state, id) => (state.cards || []).find((card) => (card.brand || 'custom') === id) || {}
    const followingCards = palette.following || {}
    const pinnedCards = palette.pinned || {}
    const customCards = palette.custom || {}
    check('the three colour cards are all buttons: the card the page paints is pressed, the others stand ready, and the trio carries the brand cards and the reader\'s own',
      [followingCards, pinnedCards, customCards].every((state) => (state.cards || []).length === 3 &&
        state.cards.every((card) => card.role === 'button' && card.pressed === (card.active ? 'true' : 'false') &&
          typeof card.label === 'string' && card.label.length > 0)),
      JSON.stringify(palette))
    check('following the brand presses the brand\'s card with no reset to offer; a picked card paints its own colours while the mark stays, and offers the way back',
      followingCards.mark?.join() === 'DeepSeek' &&
        paletteCard(followingCards, 'deepseek').pressed === 'true' && paletteCard(followingCards, 'claude').pressed === 'false' &&
        paletteCard(followingCards, 'deepseek').reset === null &&
        pinnedCards.mark?.join() === 'DeepSeek' &&
        paletteCard(pinnedCards, 'claude').pressed === 'true' && paletteCard(pinnedCards, 'deepseek').pressed === 'false' &&
        typeof paletteCard(pinnedCards, 'claude').reset === 'string' && paletteCard(pinnedCards, 'claude').reset.length > 0,
      JSON.stringify({ following: followingCards, pinned: pinnedCards }))
    check('the reader\'s own card presses itself, keeps the brand\'s tokens under it, and carries the same reset',
      customCards.mark?.join() === 'DeepSeek' &&
        paletteCard(customCards, 'custom').pressed === 'true' &&
        paletteCard(customCards, 'claude').pressed === 'false' && paletteCard(customCards, 'deepseek').pressed === 'false' &&
        typeof paletteCard(customCards, 'custom').reset === 'string' && paletteCard(customCards, 'custom').reset.length > 0,
      JSON.stringify(customCards))
    const off = settings.parentsOff || {}
    check('a sub-row greys out while its parent is off: the accent colour with the colours following the host, the mascot\'s place with the mascot off, the model descriptions, the effort accent colour, the quick providers and the peak rate meter with the model picker off, the custom price table with the billing off, the search button\'s style with the sidebar search off, and the title-bar band for the window on every page',
      !!off.appearance && JSON.stringify(off.appearance.disabled) === '["mascotScope"]' &&
        !!off.mainWindow && JSON.stringify(off.mainWindow.disabled) === '["headerBand","effortSlider","modelDescriptions","quickProviders","peakrate","effortAccent","statsFooterAlign","billingTable"]' &&
        !!off.sidebar && JSON.stringify(off.sidebar.disabled) === '["searchStyle"]',
      JSON.stringify(off))
    const offAppearance = (off.appearance || {}).rows || []
    check('the colour cards and the background opacity stand only under the skin\'s own palette: following the host leaves neither on the tab',
      offAppearance.indexOf('paletteCards') === -1 && offAppearance.indexOf('backgroundOpacity') === -1,
      JSON.stringify(offAppearance))
    const unmet = settings.requirementsOff || {}
    check('with the composer restyle off, the model picker with its sub-rows, the permission control and the statistics\' figures grey out, the two switches and the statistics rows saying what they wait for; with the footer takeover off, so does the easter egg under it',
      !!unmet.mainWindow && JSON.stringify(unmet.mainWindow.disabled) === '["headerBand","composerBottomGap","permissionsControl","modelPicker","effortSlider","modelDescriptions","quickProviders","peakrate","effortAccent","contextDisplay","contextNumbers","statsPosition","statsFooterAlign","billingCurrency","billingTable"]' &&
        JSON.stringify(unmet.mainWindow.notes) === '["headerBand","composerBottomGap","permissionsControl","modelPicker","contextDisplay","contextNumbers","statsPosition","statsFooterAlign","billingCurrency","billingTable"]' &&
        !!unmet.sidebar && JSON.stringify(unmet.sidebar.disabled) === '["banLocale"]' && JSON.stringify(unmet.sidebar.notes) === '[]',
      JSON.stringify(unmet))
    const hero = settings.heroOnly || {}
    check('with the restyle on the home page alone, the picker and the permission control take input, the statistics\' position still waits for a conversation and the title-bar band for the window',
      !!hero.mainWindow && JSON.stringify(hero.mainWindow.disabled) === '["headerBand","composerBottomGap","contextDisplay","contextNumbers","statsPosition","statsFooterAlign","billingCurrency","billingTable"]',
      JSON.stringify(hero))
    const pageZoom = settings.pageZoom || {}
    const zoomed = pageZoom.zoomed || {}
    const shrunk = pageZoom.shrunk || {}
    const following = pageZoom.following || {}
    check('page zoom reaches the document and the page is drawn at it above and below its own size; following the system writes neither',
      zoomed.attr === '1.5' && zoomed.zoom === '1.5' &&
        shrunk.attr === '0.8' && shrunk.zoom === '0.8' &&
        following.attr === null && following.zoom === '1',
      JSON.stringify(pageZoom))
    const control = settings.pageZoomControl || {}
    const box = control.box || {}
    const track = control.track || {}
    const reset = control.reset || {}
    const card = control.card || {}
    check('the zoom row takes any percentage in one field, resets from the label beside it and opens a seekbar over the same range, closed until the field is asked for',
      box.type === 'text' && box.value === '112' && box.placeholder === '100' && typeof box.label === 'string' && box.label.length > 0 &&
        typeof reset.text === 'string' && reset.text.length > 0 &&
        track.type === 'range' && track.min === 60 && track.max === 200 && track.step === 1 && track.value === 112 && typeof track.label === 'string' && track.label.length > 0 &&
        card.open === 'false',
      JSON.stringify(control))
    const atDefault = settings.pageZoomAtDefault || {}
    const defaultBox = atDefault.box || {}
    check('the reset label stands only while the page is drawn away from the default size',
      defaultBox.value === '100' && atDefault.reset === undefined,
      JSON.stringify(atDefault))
    const link = settings.link || {}
    const mark = settings.mark || {}
    check('the heading carries the plugin\'s repository link, opening in a new tab with an accessible name',
      link.href === 'https://github.com/Nwflower/dsh-claude-style' && link.target === '_blank' &&
        (link.rel || '').includes('noopener') && typeof link.label === 'string' && link.label.length > 0,
      JSON.stringify(link))
    check('the link\'s mark is the inlined asset, painted as a mask in the quiet ink',
      mark.mask.includes('data:image/svg+xml') && mark.size === '16px×16px',
      JSON.stringify(mark))
    const paintCards = settings.paintCards || {}
    const cards = paintCards.cards || []
    const previews = paintCards.previews || {}
    check('the Motion tab\'s row is two preview cards carrying no text of their own: each names itself for the reader, the stored choice alone is drawn as picked, and a card holds nothing but its words',
      cards.length === 2 && cards.every((card) => typeof card.label === 'string' && card.label.length > 0 && card.sample === true && card.sampleHidden === true) &&
        cards.every((card) => Array.isArray(card.words) && card.words.length === 2 && card.words[0] !== card.words[1]) &&
        cards[0].active === true && cards[0].pressed === 'true' && cards[1].active === false && cards[1].pressed === 'false',
      JSON.stringify(cards))
    check('each card previews its own paint: the host\'s band crosses a copy of the words, the wash fills them with seven orbiting washes over the ramp',
      previews.sweep?.band?.animation === BAND_ANIMATION && previews.sweep?.band?.matches === true && previews.sweep?.washes === 0 &&
        previews.wash?.band === null && previews.wash?.animation === 'dsh-claude-wash-hue, dsh-claude-wash-drift' && previews.wash?.washes === 7 &&
        previews.sweep?.words?.join() === previews.wash?.words?.join(),
      JSON.stringify(previews))
    const delayOf = (value) => Number.parseFloat(value || '0')
    check('the card\'s two wordings take turns where one stands: both run the line\'s swap on the preset card\'s period, the second offset half a turn, and they share one centre in a box as wide as the longer of them',
      ['sweep', 'wash'].every((kind) => {
        const preview = previews[kind] || {}
        const delays = preview.wordDelays || []
        const centres = preview.wordCentres || []
        return preview.wordAnimations?.join() === 'dsh-claude-motion-word,dsh-claude-motion-word' &&
          delays.length === 2 && delayOf(delays[0]) === 0 && delayOf(delays[1]) < 0 &&
          Math.abs(delayOf(delays[1])) === 2 && centres[0] === centres[1] &&
          preview.width === Math.max(...(preview.wordWidths || [0]))
      }),
      JSON.stringify(previews))
    const caretPreview = settings.caretPreview || {}
    const typingCaret = caretPreview.typing || {}
    const standingCaret = caretPreview.standing || {}
    const offCaret = caretPreview.off || {}
    check('the caret row previews its two answers on one typed line: a character waiting for its turn is unseen while the typed ones stand, the caret stands where the last typed character ends, and it is lit for the whole time the line is being typed and blinks on the native cycle once the line stands whole',
      typingCaret.typed === 'visible' && typingCaret.waiting === 'hidden' && typingCaret.x === 34 &&
        typingCaret.animation === 'none' && standingCaret.animation === 'dsh-claude-caret-blink',
      JSON.stringify(caretPreview))
    check('the on card\'s caret glides to each new place the line hands it and the off card\'s arrives there at once',
      typingCaret.transition === '0.08s' && offCaret.animation === 'dsh-claude-caret-blink' && offCaret.transition === '0s',
      JSON.stringify(caretPreview))
    const revealPreview = settings.revealPreview || {}
    const fade = revealPreview.fade || {}
    const waiting = revealPreview.waiting || {}
    const plain = revealPreview.plain || {}
    check('the new-text fade row previews its two answers: the fade card\'s character lands faint and settles over the reveal\'s own duration, the other stands solid as it arrives, and a character waiting for its turn is unseen',
      fade.animation === 'dsh-claude-reveal-piece' && Number.parseFloat(fade.duration) === 0.12 && fade.fill === 'both' &&
        waiting.opacity === '0' && plain.animation === 'none' && plain.opacity === '1',
      JSON.stringify(revealPreview))
    const ongoing = settings.ongoingCards || {}
    const ongoingCards = ongoing.cards || []
    const looks = ['breathe', 'ring', 'shimmer']
    check('the ongoing-effect row names three independent cards, each carrying a decorative title before its marker, with only the default breathing choice pressed',
      ongoingCards.length === 3 && ongoingCards.map(card => card.look).join() === looks.join() &&
        new Set(ongoingCards.map(card => card.label)).size === 3 &&
        ongoingCards.every(card => typeof card.label === 'string' && card.label.length > 0 &&
          card.sample === true && card.titleFirst === true && typeof card.title === 'string' && card.title.length > 0 &&
          card.active === (card.look === 'breathe') && card.pressed === String(card.look === 'breathe')),
      JSON.stringify(ongoingCards))
    const [breathe, ring, shimmer] = ongoingCards
    check('the carried preview parents give the breathing dot its opacity cadence, the ring its rotation and the shimmer title its sweep with no visible marker',
      breathe?.markPaint?.animation === 'dsh-claude-status-breathe' && Number.parseFloat(breathe.markPaint.duration) === 1.2 &&
        breathe.markPaint.visibility === 'visible' && breathe.titlePaint?.animation === 'none' &&
        ring?.markPaint?.animation === 'dsh-claude-ongoing-spin' && Number.parseFloat(ring.markPaint.duration) === 0.85 &&
        Number.parseFloat(ring.markPaint.width) > Number.parseFloat(breathe.markPaint.width) && Number.parseFloat(ring.markPaint.border) > 0 &&
        ring.markPaint.visibility === 'visible' && ring.titlePaint?.animation === 'none' &&
        shimmer?.titlePaint?.animation === 'dsh-claude-title-shine' && Number.parseFloat(shimmer.titlePaint.duration) === 3 &&
        shimmer.markPaint?.visibility === 'hidden' && shimmer.markPaint.animation === 'none',
      JSON.stringify(ongoingCards))
    for (const look of looks) {
      const cards = ongoing.choices?.[look] || []
      check(`storing ${look} selects only that card and leaves every option's own preview independent`,
        cards.length === 3 && cards.every((card, index) => card.look === looks[index] &&
          card.active === (card.look === look) && card.pressed === String(card.look === look) &&
          card.titlePaint?.animation === ongoingCards[index]?.titlePaint?.animation &&
          card.markPaint?.animation === ongoingCards[index]?.markPaint?.animation &&
          card.markPaint?.visibility === ongoingCards[index]?.markPaint?.visibility),
        JSON.stringify(cards))
    }
    const stored = settings.ongoingStored || {}
    check('all three stored effects reach the native running row live, with the shimmer title and native marker mutually exclusive',
      stored.ring?.attribute === 'ring' && stored.ring.mark?.animation === ring?.markPaint?.animation &&
        stored.ring.mark?.visibility === 'visible' && stored.ring.title?.animation === 'none' &&
        stored.breathe?.attribute === 'breathe' && stored.breathe.mark?.animation === breathe?.markPaint?.animation &&
        stored.breathe.mark?.visibility === 'visible' && stored.breathe.title?.animation === 'none' &&
        stored.shimmer?.attribute === 'shimmer' && stored.shimmer.applicable === true &&
        stored.shimmer.mark?.visibility === 'hidden' && stored.shimmer.title?.animation === shimmer?.titlePaint?.animation,
      JSON.stringify(stored))
    const reduced = settings.ongoingReduced || {}
    check('reduced motion keeps all three previews static and restores the visible native marker for the stored shimmer choice',
      reduced.cards?.length === 3 && reduced.cards.every(card => card.titlePaint?.animation === 'none' &&
        card.markPaint?.animation === 'none' && card.markPaint.visibility === 'visible') &&
        reduced.running?.attribute === 'shimmer' && reduced.running.title?.animation === 'none' &&
        reduced.running.mark?.animation === 'none' && reduced.running.mark.visibility === 'visible',
      JSON.stringify(reduced))
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
    const view = sw.view || {}
    const archivedView = view.archived || {}
    const activeView = view.active || {}
    check('the 已归档 segment drives the host\'s own view: archived rows alone in one flat list, and the segment checked',
      archivedView.snapshot?.archivedFilter === 'only' && archivedView.snapshot?.groupBy === 'flat' &&
        archivedView.checked === 'true',
      JSON.stringify(archivedView))
    check('the 进行中 segment puts the filter back with the date view\'s own flat list standing before the visit, and stands checked again',
      activeView.snapshot?.archivedFilter === 'default' && activeView.snapshot?.groupBy === 'flat' &&
        activeView.checked === 'true',
      JSON.stringify(activeView))
    const flatView = sw.flat || {}
    check('a 单列表 pick in the host\'s own view menu stands, and 已归档 brings it back instead of dropping it',
      flatView.picked?.snapshot?.groupBy === 'flat' && flatView.archived?.snapshot?.groupBy === 'flat' &&
        flatView.active?.snapshot?.groupBy === 'flat',
      JSON.stringify(flatView))
    const reinstall = sw.reinstall || {}
    check('a store left on 已归档 comes back on that segment when the feature installs again',
      reinstall.snapshot?.archivedFilter === 'only' && reinstall.snapshot?.groupBy === 'flat' &&
        reinstall.checked === 'true',
      JSON.stringify(reinstall))
    const rail = sw.rail || {}
    check('the host dropping the section heading takes the workspace control off the page with it, leaving the host\'s own tree where it stands',
      !!rail.wide && rail.wide.segments > 0 && rail.wide.rows > 0 && !!rail.collapsed &&
        rail.collapsed.segments === 0 && rail.collapsed.rows === rail.wide.rows,
      JSON.stringify(rail))
    check('the heading coming back seats the control in the section again',
      !!rail.back && rail.back.segments > 0 && rail.back.rows === rail.wide.rows, JSON.stringify(rail.back))
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
}
