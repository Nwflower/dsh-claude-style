/**
 * The custom-brand case (D97): the host half's status names a preset's mark
 * and 4:1 wordmark, and the page paints them over the brand's own art — the sidebar's
 * mark and wordmark, the hero's mark and the account row's fallback picture —
 * then inks them in the colour the preset's ink names, and hands the accent
 * back when it is cleared. With no preset selected, the art the brand draws
 * itself takes the mark-colour choice through the same token.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  /** A colour the page paints with, resolved by the browser through a token name. */
  var resolved = function (property) {
    var swatch = document.createElement('span')
    swatch.style.color = 'var(' + property + ')'
    document.body.appendChild(swatch)
    var colour = getComputedStyle(swatch).color
    swatch.remove()
    return colour
  }

  /** A colour as the sRGB bytes the page paints: a scheme seed stands as an oklch
      colour naming its hue, so read the paint rather than the spelling. */
  var painted = function (colour) {
    var canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    var context = canvas.getContext('2d')
    context.fillStyle = colour
    context.fillRect(0, 0, 1, 1)
    var data = context.getImageData(0, 0, 1, 1).data
    var hex = '#' + [data[0], data[1], data[2]].map(function (v) { return v.toString(16).padStart(2, '0') }).join('')
    return { hex: hex, rgb: 'rgb(' + data[0] + ', ' + data[1] + ', ' + data[2] + ')' }
  }

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
        var light = painted(getComputedStyle(chip).color).rgb
        document.body.setAttribute('data-ds-dark-theme', '')
        var dark = painted(getComputedStyle(chip).color).rgb
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
          accent: painted(resolved('--dsw-alias-brand-primary')).hex,
          accentInk: body.getPropertyValue('--dsw-alias-label-primary-foreground').trim(),
          codeInk: codeInk(),
        }
      }
      r.customBrand = { images: read() }
      // The accent the page paints, resolved the way the browser resolves the
      // token the images are filled with.
      r.customBrand.accentRgb = resolved('--dsw-alias-brand-primary')
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

  // The art the brand draws itself, under the mark-colour choice with no preset
  // selected (D97): the Claude brand draws its mark as an alpha mask and the
  // DeepSeek brand keeps the host's whale, and the two take their ink from the
  // logo-ink token, the one the settings page's preview and the account row's
  // picture read. The palette is held on the Claude card, so the three inks
  // answer against one set of tokens whichever mark stands above them.
  probe.step(async function () {
    await probe.onlyFor(['custom-brand'], async function () {
      // The host's sidebar brand in the shape ui-sidebar renders it, inside the
      // host anchor the skin reads its parts in (D3).
      var sidebar = document.createElement('div')
      sidebar.setAttribute('data-slot', 'sidebar')
      sidebar.innerHTML =
        '<span class="_brandIdentity_x_1"><span class="_brandMark_x_1"><svg viewBox="0 0 8 8"></svg></span></span>'
      document.body.appendChild(sidebar)
      var mark = sidebar.querySelector('._brandMark_x_1')
      if (mark === null) throw new Error('smoke: the sidebar brand carries no mark seat')
      // The parts land on the pass after the subtree arrives (D3), under either
      // brand: the seat reads as one of the host's own the moment they do.
      var seated = function () {
        return probe.attrs(mark).some(function (name) { return /-part$/.test(name) })
      }
      for (var look = 0; look < 40 && !seated(); look++) await sleep(50)
      if (!seated()) throw new Error('smoke: the sidebar mark never took its part')
      // A masked seat is the skin's own drawing, so its ink is the mask's fill;
      // the host's whale keeps its art and takes the colour it inherits.
      var seatInk = function (art) { return art.masked ? art.fill : art.colour }
      var read = function () {
        var art = getComputedStyle(mark, '::before')
        return {
          masked: art.maskImage !== 'none',
          fill: art.backgroundColor,
          colour: getComputedStyle(mark).color,
          accent: resolved('--dsw-alias-brand-primary'),
          text: resolved('--dsw-alias-label-primary'),
        }
      }
      var brands = ['claude', 'deepseek']
      var inks = ['original', 'accent', 'text']
      var readings = { claude: {}, deepseek: {} }
      for (var at = 0; at < brands.length; at++) {
        for (var ink = 0; ink < inks.length; ink++) {
          window.__pushForm({ brandingPreset: '', brandInk: inks[ink], brand: brands[at], paletteColors: 'claude' })
          await sleep(150)
          readings[brands[at]][inks[ink]] = read()
        }
      }
      r.customBrand.sidebarInk = readings
      var failures = []
      var seen = []
      for (var one = 0; one < brands.length; one++) {
        var brand = brands[one]
        var tones = readings[brand]
        var original = seatInk(tones.original)
        seen.push(brand + ': ' + inks.map(function (tone) { return tone + ' ' + seatInk(tones[tone]) }).join(', '))
        if (seatInk(tones.accent) !== tones.accent.accent) {
          failures.push(brand + ' paints the accent in ' + seatInk(tones.accent) + ' rather than in the accent token ' + tones.accent.accent)
        }
        if (seatInk(tones.text) !== tones.text.text) {
          failures.push(brand + ' paints the text ink in ' + seatInk(tones.text) + ' rather than in the label token ' + tones.text.text)
        }
        if (seatInk(tones.accent) === original) failures.push(brand + ' keeps its original ink ' + original + ' under the accent')
      }
      sidebar.remove()
      // The shipped state back: the theme style's own art in its own ink.
      window.__pushForm({ brandingPreset: '', brandInk: 'original', brand: 'claude', paletteColors: 'brand' })
      await sleep(150)
      if (failures.length > 0) {
        throw new Error('smoke: the sidebar mark does not take the ink the choice names — ' +
          failures.join('; ') + ' — ' + seen.join('; '))
      }
    })
  })
})()
