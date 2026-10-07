/**
 * The shared reads off the page the shell features built: the account drawer and
 * the synthetic popover, the row's avatar and its served skin sheet, this
 * package's own stylesheet tags beside a sibling's, the body marks, the slot
 * registrations and the model seat inside an inline card.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var attrs = probe.attrs
  var r = probe.report

  probe.step(async function () {
    var drawer = document.querySelector('.dsh-claude-account-popover-body')
    r.drawer = drawer ? Array.prototype.map.call(drawer.children, function (c) {
      if (c.hasAttribute('data-action-index')) return 'action'
      if (c.hasAttribute('data-embed-index')) return 'embed'
      if (c.getAttribute('data-action') === 'settings') return 'settings'
      return 'other'
    }) : null
    var syntheticPopover = document.querySelector('.dsh-claude-account-popover')
    r.syntheticHeader = !!(syntheticPopover && syntheticPopover.querySelector('[data-dsh-claude-ban-row]'))
    // The closed drawer's rows are built and reconciled while it is closed, so
    // the panel sits over the account row with its icons in it: visibility has
    // to take that content out of the paint and hit-test tree.
    r.syntheticVisibility = syntheticPopover ? getComputedStyle(syntheticPopover).visibility : null
    r.syntheticRowVisibility = syntheticPopover && syntheticPopover.querySelector('.dsh-claude-popover-item')
      ? getComputedStyle(syntheticPopover.querySelector('.dsh-claude-popover-item')).visibility
      : null
    // offsetLeft/offsetWidth, not the rect: the closed drawer still carries its
    // translateY/scale transition, which would shrink a measured rect.
    var syntheticBtn = document.querySelector('.dsh-claude-account-btn')
    r.syntheticBox = (syntheticPopover && syntheticBtn) ? {
      popoverLeft: syntheticPopover.offsetLeft,
      popoverWidth: syntheticPopover.offsetWidth,
      buttonLeft: syntheticBtn.offsetLeft,
      buttonWidth: syntheticBtn.offsetWidth,
    } : null
    r.syntheticInject = document.querySelectorAll('.dsh-claude-account-inject').length
    var user = document.querySelector('.dsh-claude-account-user')
    r.accountUser = user ? user.textContent : null
    var avatar = document.querySelector('.dsh-claude-account-avatar')
    r.avatarAttrs = attrs(avatar)
    var photo = avatar ? avatar.querySelector('img') : null
    r.photo = photo ? { attrs: attrs(photo), referrerPolicy: photo.referrerPolicy } : null
    r.photoSrc = photo ? photo.getAttribute('src') : null
    r.photoHidden = photo ? photo.hidden : null
    // The launcher's own picture is a texture sheet, so the row crops the head
    // into a canvas instead of handing the sheet to the <img>. Sampled at the
    // fixture's landmarks: red face inside the inset, green hat at the box's
    // corners, nothing in the margin between them.
    r.skinFlag = r.avatarAttrs !== null && r.avatarAttrs.indexOf('data-dsh-claude-skin') !== -1
    r.avatarRadius = avatar ? getComputedStyle(avatar).borderRadius : null
    var skinHead = avatar ? avatar.querySelector('canvas.dsh-claude-account-skin') : null
    r.skinCanvas = skinHead ? { width: skinHead.width, height: skinHead.height } : null
    r.skinPixels = null
    if (skinHead) {
      var skinContext = skinHead.getContext('2d')
      var pixelAt = function (x, y) {
        var data = skinContext.getImageData(x, y, 1, 1).data
        return [data[0], data[1], data[2], data[3]]
      }
      r.skinPixels = { face: pixelAt(32, 32), hatTop: pixelAt(2, 2), hatBottom: pixelAt(62, 62), margin: pixelAt(62, 30) }
    }
    var mirrored = drawer ? drawer.querySelector('[data-action-index]') : null
    r.mirroredText = mirrored ? mirrored.querySelector('.dsh-claude-popover-item-text').textContent : null
    var badge = mirrored ? mirrored.querySelector('.dsh-claude-popover-item-badge') : null
    r.mirroredBadge = badge ? badge.textContent : null
    r.stylesheet = !!document.getElementById('dsh-claude-style-style')
    // The skin's sheet wears this package's own module-system tags (D33): the
    // host's claim sweep reads untagged tags alone, so a tagged sheet cannot be
    // claimed by a sibling package and removed by that sibling's reload.
    var skinStyle = document.getElementById('dsh-claude-style-style')
    r.sheetPlugin = skinStyle ? skinStyle.getAttribute('data-plugin') : null
    r.sheetPluginCss = skinStyle ? skinStyle.getAttribute('data-plugin-css') : null
    r.sheetClaimable = skinStyle ? skinStyle.matches('style:not([data-plugin])') : null
    // The sibling's sheet (the stand-in parts planted it before this bundle's factory
    // ran): this package must keep it out of its own bookkeeping, so no reload of
    // this package removes it (D33).
    var siblingSheet = probe.siblingSheet = document.getElementById('smoke-sibling-sheet')
    r.siblingSheetTag = siblingSheet ? siblingSheet.getAttribute('data-plugin') : null
    r.siblingSheetClaimable = siblingSheet ? siblingSheet.matches('style:not([data-plugin])') : null
    // A sibling's sheet that arrives after this bundle's factory ran, the way a
    // plugin mounting its sheet from apply() arrives: the head watch parks it
    // before the next package materializes (D33).
    var lateSheet = document.createElement('style')
    lateSheet.id = 'smoke-late-sibling-sheet'
    lateSheet.textContent = '.smoke-late-sibling-sheet{color:rgb(4, 5, 6)}'
    document.head.appendChild(lateSheet)
    await Promise.resolve()
    await sleep(0)
    r.lateSheetTag = lateSheet.getAttribute('data-plugin')
    r.lateSheetClaimable = lateSheet.matches('style:not([data-plugin])')
    lateSheet.remove()
    // This stand-in host never carries the Windows titlebar marker, so the
    // skin must leave the body marker off and keep its measured placement.
    r.titlebarTabs = document.body.hasAttribute('data-dsh-titlebar-tabs')
    r.footerTakeover = document.body.hasAttribute('data-dsh-claude-footer-takeover')
    r.homeLayoutAttr = document.body.getAttribute('data-dsh-claude-home-layout')
    r.homeLayoutExpected = window.SMOKE_CASE === 'studio' ? 'studio' : null
    // A copy, not the live list: the teardown at the end of this run hands every
    // registration back, and what this check is about is what was registered
    // while the page was up.
    r.slotRegistrations = window.__slots ? window.__slots.map(function (entry) { return Object.assign({}, entry) }) : null
    r.composerRestyle = document.body.hasAttribute('data-dsh-claude-composer-active')
    // The host's model seat inside an inline card, with a menu another plugin
    // nests in it (its hashed class says "model"). Read and removed within one
    // task, so no skin pass ever sees it: the trigger rule must reach the
    // host's trigger, leave the nested menu its block layout, and leave the
    // seat root hidden once the picker marks it.
    var modelCard = document.createElement('div')
    modelCard.setAttribute('data-composer-card', '')
    modelCard.setAttribute('data-composer-variant', 'inline')
    modelCard.innerHTML = '<div class="_x_trailing_2"><div data-slot="conversation.input.model" style="display:contents">' +
      '<div class="_m_root_1"><button type="button" class="_m_trigger_1">model-a</button>' +
      '<div class="_m_menu_1"><div class="_p_providerModelMenu_1"></div></div></div></div></div>'
    document.body.appendChild(modelCard)
    var modelSeatRoot = modelCard.querySelector('._m_root_1')
    r.modelSeat = {
      trigger: getComputedStyle(modelCard.querySelector('._m_trigger_1')).display,
      nestedMenu: getComputedStyle(modelCard.querySelector('._p_providerModelMenu_1')).display,
    }
    modelSeatRoot.setAttribute('data-dsh-claude-model-host', '')
    r.modelSeat.markedRoot = getComputedStyle(modelSeatRoot).display
    modelCard.remove()
  })
})()
