/**
 * The custom-brand case (D30): the host half's status names a preset's mark
 * and 4:1 wordmark, and the page paints them over the brand's own art — the sidebar's
 * mark and wordmark, the hero's mark and the account row's fallback picture —
 * then inks them in the colour the preset's ink names, and hands the accent
 * back when it is cleared.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    await probe.onlyFor(['custom-brand'], async function () {
      // The host's sidebar brand and hero hitbox, in the shape ui-sidebar and
      // the hero render them (hashed class names, the art one level down). Each
      // sits in the host anchor the skin reads its parts inside (D3).
      var sidebar = document.createElement('div')
      sidebar.setAttribute('data-slot', 'sidebar')
      sidebar.innerHTML =
        '<span class="_brandIdentity_x_1"><span class="_brandMark_x_1"><svg viewBox="0 0 8 8"></svg></span>' +
          '<span class="_brandName_x_1"><span>DeepSeek</span></span></span>'
      var heroHolder = document.createElement('div')
      heroHolder.setAttribute('data-conversation-scroll', '')
      heroHolder.innerHTML =
        '<div class="_fishHitbox_h_1" style="display:flex"><svg viewBox="0 0 8 8"></svg></div>'
      document.body.appendChild(sidebar)
      document.body.appendChild(heroHolder)
      // The images are a preset's; its record carries the ink they are painted in.
      var preset = function (ink) {
        var record = { id: 'company', name: 'Company', mark: '@managed/mark-light', wordmark: '@managed/wordmark-light' }
        if (ink !== 'original') record.ink = ink
        return { brandingPreset: 'company', brandingPresets: [record] }
      }
      window.__pushForm(preset('original'))
      // The parts land on the pass after the subtree arrives (D3).
      var mark = null
      for (var look = 0; look < 40 && mark === null; look++) {
        await sleep(50)
        mark = sidebar.querySelector('[data-dsh-claude-part~="brand-mark"]')
      }
      var name = sidebar.querySelector('[data-dsh-claude-part~="brand-name"]')
      var hero = heroHolder.querySelector('[data-dsh-claude-part~="hero-mark"]')
      for (var wait = 0; wait < 40 && !document.body.hasAttribute('data-dsh-claude-custom-mark'); wait++) await sleep(50)
      // An inline-code chip in the same place the host draws one, read under each
      // scheme: the skin writes one code colour per scheme, so a chip that keeps
      // the light ink on the dark canvas is invisible.
      var chip = document.createElement('code')
      chip.textContent = 'c'
      document.body.appendChild(chip)
      var codeInk = function () {
        var light = getComputedStyle(chip).color
        document.body.setAttribute('data-ds-dark-theme', '')
        var dark = getComputedStyle(chip).color
        document.body.removeAttribute('data-ds-dark-theme')
        return { light: light, dark: dark }
      }
      var read = function () {
        var body = getComputedStyle(document.body)
        var markArt = getComputedStyle(mark, '::before')
        var wordArt = getComputedStyle(name, '::before')
        var heroArt = getComputedStyle(hero, '::before')
        var avatar = document.querySelector('.dsh-claude-account-avatar')
        return {
          markAttr: document.body.getAttribute('data-dsh-claude-custom-mark'),
          wordAttr: document.body.getAttribute('data-dsh-claude-custom-word'),
          tintAttr: document.body.getAttribute('data-dsh-claude-custom-tint'),
          hostArt: getComputedStyle(mark.firstChild).display,
          hostWord: getComputedStyle(name.firstChild).display,
          mark: { image: markArt.backgroundImage, mask: markArt.maskImage, width: markArt.width, fill: markArt.backgroundColor },
          word: { image: wordArt.backgroundImage, width: wordArt.width, height: wordArt.height },
          hero: { image: heroArt.backgroundImage, width: heroArt.width },
          avatar: avatar === null ? null : getComputedStyle(avatar).backgroundImage,
          avatarFill: avatar === null ? null : getComputedStyle(avatar, '::before').backgroundColor,
          accent: body.getPropertyValue('--dsw-alias-brand-primary').trim(),
          accentInk: body.getPropertyValue('--dsw-alias-label-primary-foreground').trim(),
          codeInk: codeInk(),
        }
      }
      r.customBrand = { images: read() }
      // The accent the page paints, resolved the way the browser resolves the
      // token the images are filled with.
      var swatch = document.createElement('span')
      swatch.style.color = 'var(--dsw-alias-brand-primary)'
      document.body.appendChild(swatch)
      r.customBrand.accentRgb = getComputedStyle(swatch).color
      swatch.remove()
      window.__pushForm(Object.assign(preset('text'), { paletteColors: 'custom', customAccent: '#1a7f5a', brandName: 'Acme' }))
      await sleep(150)
      r.customBrand.tinted = read()
      // The accent choice with the page following a brand's own colour card:
      // the tint has to resolve there too, where no custom accent is stored.
      window.__pushForm(Object.assign(preset('accent'), { paletteColors: 'brand', customAccent: '' }))
      await sleep(150)
      r.customBrand.accented = read()
      window.__pushForm(Object.assign(preset('original'), { paletteColors: 'brand', customAccent: '' }))
      await sleep(150)
      r.customBrand.cleared = read()
      sidebar.remove()
      heroHolder.remove()
    })
  })
})()
