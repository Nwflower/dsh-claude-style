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
 * back on. The title cluster carries the host's own fade, so what is read of
 * the lifted title is what stands in the caption row rather than the box the
 * host would have drawn in its row.
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
      var GAP = 8
      // The title and both control clusters share the caption row's middle.
      var TITLE_DROP = 0
      var ROW_GAP = 0
      var HEADER_TOP = 60
      var HEADER_INSET = 10
      var ROW_LEFT = 200
      var TITLE_HEIGHT = 28
      // The host's own rule on the title cluster — the breadcrumb's truncation
      // fade — as a live instance writes it: its class rule, so a stop of the
      // skin's can write over it the way it does on the real page. The fade's
      // clip is the cluster's own box, and a box lifted out of the cluster is
      // clipped with it.
      var hostCluster = document.createElement('style')
      hostCluster.textContent = '._titleCluster_b_1 { --title-cluster-fade: 20px;' +
        'margin: -4px -20px -4px -4px; padding: 4px 20px 4px 4px;' +
        'mask-image: linear-gradient(to left, transparent calc(.3 * var(--title-cluster-fade)), #000 var(--title-cluster-fade));' +
        'overflow: clip; }'
      document.head.append(hostCluster)
      // The desktop shell's two answers: the caption row is on the page, and
      // the Window Controls Overlay API reports the three caption buttons.
      document.documentElement.setAttribute('data-windows-titlebar', '')
      // The overlay's measurement is authoritative when the host's alias differs.
      document.documentElement.style.setProperty('--dsh-windows-titlebar-height', '56px')
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
      header.className = '_header_b_1'
      // The host's own header anchor: the skin reads the row's parts inside it (D3).
      header.setAttribute('data-slot', 'conversation.header')
      header.style.cssText = 'position:fixed;left:' + ROW_LEFT + 'px;top:' + HEADER_TOP + 'px;width:900px;' +
        'padding-top:' + HEADER_INSET + 'px;display:block'
      header.innerHTML = '<div class="_titleRow_b_1" style="display:flex;align-items:center;width:100%;height:30px">' +
        '<div class="_titleCluster_b_1" style="display:flex;align-items:center;flex:1 1 0%;gap:10px">' +
        '<nav class="_crumbs_b_1" style="display:flex;height:' + TITLE_HEIGHT + 'px;width:180px">Session title</nav>' +
        '<div class="_headerActions_b_1" style="width:60px;height:' + TITLE_HEIGHT + 'px">Preset</div></div>' +
        // The host's utilities seat, with the skin's own right-panel control in it,
        // the way the host's slot renders it: the pass shows or hides that node.
        '<div class="_headerUtilities_b_1" style="display:flex;width:114px;height:28px">' +
        '<button type="button" class="dsh-claude-rightbar-close" style="width:28px;height:28px">close</button></div>' +
        '<div class="_headerCorner_b_1" style="width:28px;height:28px"></div></div>' +
        '<div class="_tabs_b_1"><div class="_viewTabs_b_1" role="tablist" data-conversation-tabs="" style="width:152px;height:26px"></div></div>'
      document.body.insertBefore(header, document.body.firstChild)
      // The right panel's own collapse control, inside the panel it belongs to:
      // the pass leaves it alone while the skin's control shows in the header's row.
      var panel = document.createElement('div')
      panel.setAttribute('data-sidebar-right-panel', 'push')
      panel.setAttribute('data-sidebar-right-open', '')
      panel.innerHTML = '<div data-dockkit-strip-chrome style="display:flex">' +
        '<button type="button" data-sidebar-right-toggle style="width:28px;height:28px">collapse</button></div>'
      document.body.insertBefore(panel, document.body.firstChild)
      var hostToggle = panel.querySelector('[data-sidebar-right-toggle]')
      var closeButton = header.querySelector('.dsh-claude-rightbar-close')
      // The parts land on the pass after the subtree arrives (D3).
      var row = null
      for (var look = 0; look < 40 && row === null; look++) {
        await sleep(50)
        row = header.querySelector('[data-dsh-claude-part~="title-row"]')
      }
      var title = header.querySelector('[data-dsh-claude-part~="header-title"]')
      var actions = header.querySelector('[data-dsh-claude-part~="header-actions"]')
      // The cluster the title stands in: its own parent in the host's markup,
      // the seat the host writes its truncation fade on.
      var cluster = title.parentElement
      var utilities = header.querySelector('[data-dsh-claude-part~="header-utilities"]')
      var corner = header.querySelector('[data-dsh-claude-part~="header-corner"]')
      var strip = header.querySelector('[data-dsh-claude-part~="view-tabs"]')
      var box = function (el) {
        var b = el.getBoundingClientRect()
        return { x: Math.round(b.x), y: Math.round(b.y), right: Math.round(b.right) }
      }
      // What a press at the element's own place reaches: the element itself or a
      // node inside it. A mask on an ancestor clips the paint and the hit alike,
      // so this answers what the reader sees standing there.
      var hitAt = function (el) {
        var b = el.getBoundingClientRect()
        var at = document.elementFromPoint(Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2))
        return at !== null && (at === el || el.contains(at))
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
          band: header.getAttribute('data-dsh-header-band'),
          row: row.hasAttribute('data-dsh-header-row'),
          title: title.hasAttribute('data-dsh-header-title'),
          trail: actions.hasAttribute('data-dsh-header-trail'),
          utilities: utilities.hasAttribute('data-dsh-header-actions'),
          corner: corner.hasAttribute('data-dsh-header-corner'),
        }
      }
      r.band = {
        controls: CONTROLS,
        air: AIR,
        band: BAND,
        gap: GAP,
        rowGap: ROW_GAP,
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
        // The plate the strip's row holds: the row itself spans the window.
        strip: box(strip.querySelector('[data-conversation-tabs]')),
        row: box(row),
        header: box(header),
        headerDisplay: getComputedStyle(header).display,
        headerPaddingTop: getComputedStyle(header).paddingTop,
        titleLeft: title.style.getPropertyValue('--dsh-header-band-left'),
        titleMax: title.style.getPropertyValue('--dsh-header-band-max'),
        trailLeft: actions.style.getPropertyValue('--dsh-header-band-left'),
        trailMax: actions.style.getPropertyValue('--dsh-header-band-max'),
        utilitiesRight: utilities.style.getPropertyValue('--dsh-header-band-right'),
        cornerRight: corner.style.getPropertyValue('--dsh-header-band-right'),
        rowLift: row.style.getPropertyValue('--dsh-header-band-row-lift'),
        rowOffset: getComputedStyle(row).top,
        rowPosition: getComputedStyle(row).position,
        titlePosition: getComputedStyle(title).position,
        titleZ: getComputedStyle(title).zIndex,
        titleRegion: getComputedStyle(title).webkitAppRegion,
        titleSelect: getComputedStyle(title).userSelect,
        headerSelect: getComputedStyle(header).userSelect,
        utilitiesRegion: getComputedStyle(utilities).webkitAppRegion,
        cornerRegion: getComputedStyle(corner).webkitAppRegion,
        closeInline: closeButton.style.display,
        closeShown: getComputedStyle(closeButton).display,
        hostToggleDisplay: getComputedStyle(hostToggle).display,
        titleHit: hitAt(title),
        trailHit: hitAt(actions),
        clusterMask: getComputedStyle(cluster).maskImage,
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
      r.band.off = { marks: marks(), row: box(row), headerPaddingTop: getComputedStyle(header).paddingTop, stripStamped: strip.hasAttribute('data-dsh-view-tabs'), clusterMask: getComputedStyle(cluster).maskImage }
      window.__pushForm({ headerBand: true })
      await sleep(250)
      r.band.back = { marks: marks(), title: box(title), utilities: box(utilities), titleHit: hitAt(title), clusterMask: getComputedStyle(cluster).maskImage }
      // The panel closes: its own collapse control leaves the page with it, and
      // the skin's control goes back to hidden.
      panel.remove()
      await sleep(250)
      r.band.panelClosed = { close: getComputedStyle(closeButton).display }
      // The teardown of the stand-in: the row goes away, and neither the band
      // marker nor the element stamps may stay behind.
      header.remove()
      hostCluster.remove()
      document.documentElement.removeAttribute('data-windows-titlebar')
      document.documentElement.style.removeProperty('--dsh-windows-titlebar-height')
      delete navigator.windowControlsOverlay
      await sleep(250)
      r.band.left = marks()
    })
  })
})()
