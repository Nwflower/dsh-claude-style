/**
 * The header band: the conversation header's title row in the Windows caption
 * row. The stand-in marks <html> the way the desktop shell does and answers the
 * Window Controls Overlay API the band is measured from, then mounts a header
 * shaped like the host's — a title row carrying a title, the utilities and the
 * corner seat, and a tab strip the view-tabs feature lifts into the same row.
 * The header goes in first: view-tabs lifts the first strip in the document,
 * and the band's own placement has to be measured against it.
 *
 * Four states are read: both sides lifted, the corner seat gone (the right
 * sidebar's own chrome carries those controls while it is open), neither side
 * fitting once the strip takes their room, and the preference switched off and
 * back on.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    await probe.onlyFor(['header-band'], async function () {
      // What the stand-in builds and what the placement has to answer: the
      // caption buttons' reserve, the skin's own air, the caption row's height,
      // the air the raised row keeps under it, and the header's top inset.
      var CONTROLS = 140
      var AIR = 8
      var BAND = 40
      var TUCK = 2
      // The skin's own optical drop below the caption row's middle: the title's
      // text draws 20px in a 28px box, so the box sits 2px low to read centred.
      var TITLE_DROP = 2
      var HEADER_TOP = 60
      var HEADER_INSET = 10
      var ROW_LEFT = 200
      var TITLE_HEIGHT = 28
      // The desktop shell's two answers: the caption row is on the page, and
      // the Window Controls Overlay API reports the three caption buttons.
      document.documentElement.setAttribute('data-windows-titlebar', '')
      Object.defineProperty(navigator, 'windowControlsOverlay', {
        configurable: true,
        value: {
          visible: true,
          getTitlebarAreaRect: function () {
            return {
              x: 0, y: 0, width: window.innerWidth - CONTROLS, height: BAND,
              top: 0, left: 0, right: window.innerWidth - CONTROLS, bottom: BAND,
            }
          },
        },
      })
      var header = document.createElement('header')
      header.className = '_b_header_1'
      header.style.cssText = 'position:fixed;left:' + ROW_LEFT + 'px;top:' + HEADER_TOP + 'px;width:900px;' +
        'padding-top:' + HEADER_INSET + 'px;display:block'
      header.innerHTML = '<div class="_b_titleRow_1" style="display:flex;align-items:center;width:100%;height:30px">' +
        '<div class="_b_titleCluster_1" style="display:flex;align-items:center;flex:1 1 0%;gap:10px">' +
        '<nav class="_b_crumbs_1" style="display:flex;height:' + TITLE_HEIGHT + 'px;width:180px">Session title</nav>' +
        '<div class="_b_headerActions_1" style="width:60px;height:' + TITLE_HEIGHT + 'px">Preset</div></div>' +
        '<div class="_b_headerUtilities_1" style="display:flex;width:114px;height:28px"></div>' +
        '<div class="_b_headerCorner_1" style="width:28px;height:28px"></div></div>' +
        '<div class="_b_tabs_1" role="tablist" style="width:152px;height:26px"></div>'
      document.body.insertBefore(header, document.body.firstChild)
      var row = header.querySelector('[class*="_titleRow"]')
      var title = header.querySelector('[class*="_crumbs"]')
      var actions = header.querySelector('[class*="_headerActions"]')
      var utilities = header.querySelector('[class*="_headerUtilities"]')
      var corner = header.querySelector('[class*="_headerCorner"]')
      var strip = header.querySelector('[class*="_tabs"]')
      var box = function (el) {
        var b = el.getBoundingClientRect()
        return { x: Math.round(b.x), y: Math.round(b.y), right: Math.round(b.right) }
      }
      // The viewport the fixed pieces are placed in, measured rather than
      // assumed: a page scrollbar comes off it, and the caption buttons hang
      // off its right edge.
      var edgeProbe = document.createElement('div')
      edgeProbe.style.cssText = 'position:fixed;right:0;top:0;width:0;height:0'
      document.body.appendChild(edgeProbe)
      var viewportRight = Math.round(edgeProbe.getBoundingClientRect().right)
      edgeProbe.remove()
      var marks = function () {
        return {
          band: document.body.getAttribute('data-dsh-header-band'),
          row: row.hasAttribute('data-dsh-header-row'),
          title: title.hasAttribute('data-dsh-header-title'),
          utilities: utilities.hasAttribute('data-dsh-header-actions'),
          corner: corner.hasAttribute('data-dsh-header-corner'),
        }
      }
      r.band = {
        controls: CONTROLS,
        air: AIR,
        band: BAND,
        tuck: TUCK,
        titleDrop: TITLE_DROP,
        headerTop: HEADER_TOP,
        headerInset: HEADER_INSET,
        rowLeft: ROW_LEFT,
        width: window.innerWidth,
        clientWidth: document.documentElement.clientWidth,
        viewportRight: viewportRight,
      }

      await sleep(250)
      r.band.laid = {
        marks: marks(),
        title: box(title),
        utilities: box(utilities),
        corner: box(corner),
        preset: box(actions),
        strip: box(strip),
        row: box(row),
        header: box(header),
        headerDisplay: getComputedStyle(header).display,
        headerPaddingTop: getComputedStyle(header).paddingTop,
        titleLeft: title.style.getPropertyValue('--dsh-header-band-left'),
        titleMax: title.style.getPropertyValue('--dsh-header-band-max'),
        utilitiesRight: utilities.style.getPropertyValue('--dsh-header-band-right'),
        cornerRight: corner.style.getPropertyValue('--dsh-header-band-right'),
        rowLift: row.style.getPropertyValue('--dsh-header-band-row-lift'),
        rowOffset: getComputedStyle(row).top,
        rowPosition: getComputedStyle(row).position,
        titlePosition: getComputedStyle(title).position,
        titleZ: getComputedStyle(title).zIndex,
        titleRegion: getComputedStyle(title).webkitAppRegion,
        utilitiesRegion: getComputedStyle(utilities).webkitAppRegion,
        cornerRegion: getComputedStyle(corner).webkitAppRegion,
      }
      // The corner seat is empty while the right sidebar is open, and the
      // cluster that is there still lifts — into the corner's own place. The
      // seat leaves the DOM, the way the host unmounts it: a display change
      // alone wakes no pass.
      corner.remove()
      await sleep(250)
      r.band.solo = { marks: marks(), utilities: box(utilities), corner: box(corner) }
      row.appendChild(corner)
      await sleep(250)
      // The desktop shell's own seat takes the row's left end; a wide one
      // leaves neither side any room, and both go back to the header's row.
      var seat = document.createElement('div')
      seat.setAttribute('data-windows-menu', '')
      seat.style.cssText = 'position:fixed;left:0;top:0;width:1200px;height:' + BAND + 'px'
      document.body.appendChild(seat)
      await sleep(250)
      r.band.tight = { marks: marks(), title: box(title), utilities: box(utilities), corner: box(corner), row: box(row) }
      seat.remove()
      // The switch hands the row back on its own, with the strip left in place,
      // and the placement comes back when it is switched on again.
      window.__pushForm({ headerBand: false })
      await sleep(250)
      r.band.off = { marks: marks(), stripStamped: strip.hasAttribute('data-dsh-view-tabs') }
      window.__pushForm({ headerBand: true })
      await sleep(250)
      r.band.back = { marks: marks(), title: box(title), utilities: box(utilities) }
      // The teardown of the stand-in: the row goes away, and neither the band
      // marker nor the element stamps may stay behind.
      header.remove()
      document.documentElement.removeAttribute('data-windows-titlebar')
      delete navigator.windowControlsOverlay
      await sleep(250)
      r.band.left = marks()
    })
  })
})()
