/**
 * The host-palette case: the host's own colours and type, the tokens and frames
 * the skin must leave alone, and what a wallpaper plugin's cleared canvas
 * reaches. Then the settings case: the section rendered through the stand-in
 * React, tab by tab, with the sub-rows that grey out behind a parent, and the
 * heading's link to the plugin's repository.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    // Following the host's colours and type: with the host's palette in the
    // page, the skin writes none of the host's tokens, paints none of the
    // host's frame, and its own surfaces read the host's tokens; a wallpaper
    // plugin's cleared canvas and glass then reach both. Back on Claude the
    // skin's own palette returns.
    await probe.onlyFor(['host-palette'], async function () {
      var hostProbe = function (html) {
        var holder = document.createElement('div')
        holder.innerHTML = html
        document.body.appendChild(holder.firstChild)
        return document.body.lastChild
      }
      var hostNodes = {
        sidebar: hostProbe('<div data-pane="sidebar">s</div>'),
        conversation: hostProbe('<div data-pane="conversation">c</div>'),
        popover: hostProbe('<div class="dsh-claude-popover-card" data-open="true">p</div>'),
        search: hostProbe('<div class="dsh-claude-search-dialog">q</div>'),
        group: hostProbe('<span class="dsh-claude-model-group">g</span>'),
        heading: hostProbe('<h1>h</h1>'),
        code: hostProbe('<pre><code>c</code></pre>'),
      }
      var readHost = async function (patch, wallpaper) {
        if (patch !== null) window.__pushForm(patch)
        if (wallpaper) document.body.setAttribute('data-we-wallpaper', '')
        else document.body.removeAttribute('data-we-wallpaper')
        await sleep(120)
        var bodyStyle = getComputedStyle(document.body)
        return {
          base: bodyStyle.getPropertyValue('--dsw-alias-bg-base').trim(),
          family: bodyStyle.getPropertyValue('--dsw-font-family').trim(),
          body: bodyStyle.backgroundColor,
          // The mask the Claude palette lays over a wallpaper
          mask: getComputedStyle(document.body, '::after').backgroundColor,
          maskPosition: getComputedStyle(document.body, '::after').position,
          html: getComputedStyle(document.documentElement).backgroundColor,
          sidebar: getComputedStyle(hostNodes.sidebar).backgroundColor,
          // The sidebar element carries this token itself: the Claude canvas
          // while the palette paints it, cleared while a wallpaper is up.
          sidebarFill: getComputedStyle(hostNodes.sidebar).getPropertyValue('--dsw-specific-sidebar-fill').trim(),
          conversation: getComputedStyle(hostNodes.conversation).backgroundColor,
          popover: getComputedStyle(hostNodes.popover).backgroundColor,
          popoverBlur: getComputedStyle(hostNodes.popover).backdropFilter,
          // The account drawer the footer feature built (it sweeps any other copy).
          account: getComputedStyle(document.querySelector('.dsh-claude-account-popover')).backgroundColor,
          search: getComputedStyle(hostNodes.search).backgroundColor,
          group: getComputedStyle(hostNodes.group).backgroundColor,
          groupInk: getComputedStyle(hostNodes.group).color,
          heading: getComputedStyle(hostNodes.heading).fontFamily,
          code: getComputedStyle(hostNodes.code.firstChild).fontFamily,
        }
      }
      await sleep(300)
      r.hostPalette = {
        host: await readHost({ palette: 'host', typeface: 'host' }, false),
        wallpaper: await readHost(null, true),
        claude: await readHost({ palette: 'claude', typeface: 'claude' }, false),
        // The wallpaper plugin showing one under the Claude palette: the
        // shell stands down, one mask lies over the wallpaper, and the base
        // canvas and the skin's own faces keep their fill.
        claudeWallpaper: await readHost(null, true),
      }
      document.body.removeAttribute('data-we-wallpaper')
      await sleep(120)
      for (var hostKey in hostNodes) hostNodes[hostKey].remove()
    })
    // The settings page, rendered through the stand-in React into a plain tree:
    // the tab strip, which rows each tab carries, and the sub-rows that grey
    // out while their parent is off. A tab is opened by standing the tab state
    // in for a click (the stand-in's `states`).
    await probe.onlyFor(['settings'], async function () {
      var Section = (window.__slotComponents || {})['claude-style']
      var walk = function (node, visit) {
        if (node === null || node === undefined || typeof node !== 'object') return
        if (Array.isArray(node)) { node.forEach(function (child) { walk(child, visit) }); return }
        visit(node)
        walk(node.props && node.props.children, visit)
      }
      var renderTab = function (tabId) {
        var react = window.__react
        react.rendering = true
        react.states = tabId === 'general' ? null : { general: tabId }
        var tree = Section({})
        react.rendering = false
        react.states = null
        var out = { tabs: [], selected: null, rows: [], disabled: [], notes: [], groups: [], notice: null, link: null }
        walk(tree, function (node) {
          var props = node.props || {}
          if (props.role === 'tab') {
            out.tabs.push(props.key)
            if (props['aria-selected'] === 'true') out.selected = props.key
          }
          // A group label opens one of the main window's groups as its heading.
          if (props.role === 'heading') {
            out.groups.push({ label: [].concat(props.children).filter(function (child) { return typeof child === 'string' }).join(''), rows: [] })
          }
          if (typeof props.className === 'string' && /(^| )dsh-claude-settings-row( |$)/.test(props.className)) {
            var rowKey = props.key
            out.rows.push(rowKey)
            if (props['data-disabled'] === '') out.disabled.push(rowKey)
            // A group's members follow its label in the tree, so the last
            // label seen is the group the row stands in.
            if (out.groups.length > 0) out.groups[out.groups.length - 1].rows.push(rowKey)
            walk(props.children, function (child) {
              if (((child.props || {}).className || '') === 'dsh-claude-settings-row-note' && out.notes.indexOf(rowKey) < 0) out.notes.push(rowKey)
            })
          }
          if (typeof props.className === 'string' && /(^| )dsh-claude-settings-tab-notice( |$)/.test(props.className)) {
            out.notice = [].concat(props.children).filter(function (child) { return typeof child === 'string' }).join('')
          }
          if (props.className === 'dsh-claude-settings-repo') {
            out.link = { href: props.href, target: props.target, rel: props.rel, label: props['aria-label'] }
          }
        })
        return out
      }
      // A settings tab's tree, for the preview cards read off it.
      var renderSettingsTab = function (tab) {
        var react = window.__react
        react.rendering = true
        react.states = { general: tab }
        var tree = Section({})
        react.rendering = false
        react.states = null
        return tree
      }
      r.settings = { registered: typeof Section === 'function', pages: {} }
      if (r.settings.registered) {
        var tabIds = ['general', 'appearance', 'main-window', 'sidebar', 'date-layout', 'motion']
        for (var ti = 0; ti < tabIds.length; ti++) r.settings.pages[tabIds[ti]] = renderTab(tabIds[ti])
        r.settings.link = r.settings.pages.general.link
        // The heading's mark: the build inlines the asset into the token sheet
        // and the rule paints it as a mask over the link's own box, so the
        // address and the size are read off the rendered pseudo-element.
        var linkNode = document.createElement('a')
        linkNode.className = 'dsh-claude-settings-repo'
        document.body.appendChild(linkNode)
        var markStyle = getComputedStyle(linkNode, '::before')
        r.settings.mark = {
          mask: (markStyle.maskImage === 'none' ? markStyle.webkitMaskImage : markStyle.maskImage).slice(0, 48),
          size: markStyle.width + '×' + markStyle.height,
          ink: markStyle.backgroundColor,
        }
        linkNode.remove()
        // The waiting line's paint cards: the stand-in renders the page as a
        // plain tree, so the two previews are stood up here with the classes and
        // the wordings the cards carry, and read through their own boxes — the
        // layer count is how many radial washes a paint really holds, and the
        // two wordings' animation names, delays and places are the taking-turns.
        r.settings.paintCards = (function () {
          var out = { cards: [], previews: {} }
          var tree = renderSettingsTab('motion')
          walk(tree, function (node) {
            var props = node.props || {}
            if (typeof props.className === 'string' && /(^| )dsh-claude-motion-card( |$)/.test(props.className)) {
              var kids = [].concat(props.children || [])
              var sample = kids[0] || {}
              var sampleProps = sample.props || {}
              // The two wordings, read through the tree: the sample's children
              // arrive nested (the module passes the mapped array as one child,
              // as React flattens it), so the walk is what finds the words.
              var words = []
              // The band a wording carries under the sweep (shared/sweep-band.ts):
              // its window and the copy inside it, as the tree holds them.
              var bands = []
              walk(sampleProps.children, function (word) {
                var wordProps = word.props || {}
                if (!/(^| )dsh-claude-motion-word( |$)/.test(wordProps.className || '')) return
                var parts = [].concat(wordProps.children || [])
                words.push(parts.filter(function (part) { return typeof part === 'string' }).join(''))
                var band = parts.filter(function (part) { return part !== null && typeof part === 'object' })[0]
                if (band === undefined) return
                var glyphs = [].concat((band.props || {}).children || [])[0] || {}
                bands.push({ window: band.props.className, glyphs: (glyphs.props || {}).className, text: (glyphs.props || {})['data-text'] })
              })
              out.cards.push({
                label: props['aria-label'],
                active: props['data-active'] === '',
                pressed: props['aria-pressed'],
                // The card's only content is its sample: the choice carries no
                // text of its own, and the sample is the words taking turns.
                sample: kids.length === 1 && /(^| )dsh-claude-motion-sample( |$)/.test(sampleProps.className || ''),
                words: words,
                bands: bands,
                sampleHidden: sampleProps['aria-hidden'] === 'true',
              })
            }
          })
          var kinds = ['sweep', 'wash']
          var wordings = (out.cards[0] || {}).words || []
          for (var ki = 0; ki < kinds.length; ki += 1) {
            // Inside a card, where the sample is a flex item: its box then takes
            // the room the card gives it, as it does on the page.
            var card = document.createElement('button')
            card.className = 'dsh-claude-motion-card'
            var box = document.createElement('span')
            box.className = 'dsh-claude-motion-sample'
            for (var wi = 0; wi < wordings.length; wi += 1) {
              var word = document.createElement('span')
              word.className = 'dsh-claude-motion-word dsh-claude-' + kinds[ki]
              word.setAttribute('data-text', wordings[wi])
              word.textContent = wordings[wi]
              // The band stands up the way the card's own tree carries it.
              var carried = ((out.cards[ki] || {}).bands || [])[wi]
              if (carried !== undefined) {
                var bandNode = document.createElement('span')
                bandNode.className = carried.window
                var glyphsNode = document.createElement('span')
                glyphsNode.className = carried.glyphs
                glyphsNode.setAttribute('data-text', carried.text)
                bandNode.appendChild(glyphsNode)
                word.appendChild(bandNode)
              }
              box.appendChild(word)
            }
            card.appendChild(box)
            document.body.appendChild(card)
            var nodes = [].slice.call(box.children)
            var style = nodes.length === 0 ? null : getComputedStyle(nodes[0])
            var paint = nodes.length === 0 ? null : getComputedStyle(nodes[0], '::before')
            var bandOf = nodes.length === 0 ? null : nodes[0].querySelector('.dsh-claude-sweep-band')
            var round = function (value) { return Math.round(value) }
            var centreOf = function (node) {
              var rect = node.getBoundingClientRect()
              return round((rect.left + rect.right) / 2)
            }
            out.previews[kinds[ki]] = {
              words: nodes.map(function (node) { return node.textContent }),
              // The band's two halves, and whether its copy reads the words it lies over.
              band: bandOf === null ? null : {
                animation: getComputedStyle(bandOf).animationName + ', ' + getComputedStyle(bandOf.firstElementChild).animationName,
                matches: bandOf.firstElementChild.getAttribute('data-text') === nodes[0].getAttribute('data-text'),
              },
              wordAnimations: nodes.map(function (node) { return getComputedStyle(node).animationName }),
              wordDelays: nodes.map(function (node) { return getComputedStyle(node).animationDelay }),
              wordCentres: nodes.map(centreOf),
              wordWidths: nodes.map(function (node) { return round(node.getBoundingClientRect().width) }),
              width: round(box.getBoundingClientRect().width),
              animation: paint === null ? null : paint.animationName,
              washes: paint === null ? 0 : (paint.backgroundImage.match(/url\("data:image\/svg/g) || []).length,
              ink: style === null ? null : style.color,
            }
            card.remove()
          }
          return out
        })()
        // The caret row's preview cards: one line is typed out in both cards,
        // character by character, with the caret standing where the last typed
        // character ends — lit for the whole time the line is being typed and
        // blinking on the native cycle once the line stands whole, the on card's
        // caret gliding to each new place and the off card's arriving there at
        // once. The stand-in renders the page as a plain tree and the cards'
        // clock lives in a component, so the cards are stood up here with the
        // classes and the attributes they carry and read through their own
        // boxes.
        var caretHost = document.createElement('div')
        caretHost.style.cssText = 'position:absolute;left:-10000px;top:-10000px'
        var caretCard = function (kind, typing) {
          var card = document.createElement('span')
          card.className = 'dsh-claude-caret-card'
          var sample = document.createElement('span')
          sample.className = 'dsh-claude-caret-sample'
          sample.style.setProperty('--dsh-claude-caret-x', '34px')
          var text = document.createElement('span')
          text.className = 'dsh-claude-caret-sample-text'
          var typed = document.createElement('span')
          typed.className = 'dsh-claude-caret-piece'
          typed.setAttribute('data-in', '')
          typed.textContent = 'H'
          var waiting = document.createElement('span')
          waiting.className = 'dsh-claude-caret-piece'
          waiting.textContent = 'i'
          text.appendChild(typed)
          text.appendChild(waiting)
          var bar = document.createElement('span')
          bar.className = 'dsh-claude-caret-sample-bar dsh-claude-caret-' + kind
          if (typing) bar.setAttribute('data-typing', '')
          sample.appendChild(text)
          sample.appendChild(bar)
          card.appendChild(sample)
          caretHost.appendChild(card)
          return { card: card, sample: sample, bar: bar, typed: typed, waiting: waiting }
        }
        document.body.appendChild(caretHost)
        var typingCaret = caretCard('typing', true)
        var standingCaret = caretCard('typing', false)
        var offCaret = caretCard('off', false)
        var caretRead = function (one) {
          var barStyle = getComputedStyle(one.bar)
          return {
            typed: getComputedStyle(one.typed).visibility,
            waiting: getComputedStyle(one.waiting).visibility,
            x: Math.round(one.bar.getBoundingClientRect().left - one.sample.getBoundingClientRect().left),
            animation: barStyle.animationName,
            transition: barStyle.transitionDuration,
          }
        }
        r.settings.caretPreview = {
          typing: caretRead(typingCaret),
          standing: caretRead(standingCaret),
          off: caretRead(offCaret),
        }
        caretHost.remove()
        // The new-text fade row's cards: the fade card hands each character its
        // turn and lets it land faint, settling over the reveal's own duration,
        // while the other card's characters stand solid the moment they arrive
        // and a character still waiting for its turn is unseen. The stand-in
        // renders the page as a plain tree and the cards' clock lives in a
        // component, so the pieces are stood up here with the classes and the
        // attributes the cards carry and read through their own boxes.
        var revealHost = document.createElement('div')
        revealHost.style.cssText = 'position:absolute;left:-10000px;top:-10000px'
        var revealCard = function (fade) {
          var card = document.createElement('button')
          card.className = 'dsh-claude-reveal-card'
          if (fade) card.setAttribute('data-fade', '')
          var piece = function (inTurn) {
            var span = document.createElement('span')
            span.className = 'dsh-claude-reveal-piece'
            if (inTurn) span.setAttribute('data-in', '')
            span.textContent = 'x'
            card.appendChild(span)
            return span
          }
          revealHost.appendChild(card)
          return piece
        }
        var fadePiece = revealCard(true)(true)
        var waitingPiece = revealCard(true)(false)
        var plainPiece = revealCard(false)(true)
        document.body.appendChild(revealHost)
        var readPiece = function (piece) {
          var style = getComputedStyle(piece)
          return { opacity: style.opacity, animation: style.animationName, duration: style.animationDuration, fill: style.animationFillMode }
        }
        r.settings.revealPreview = { fade: readPiece(fadePiece), waiting: readPiece(waitingPiece), plain: readPiece(plainPiece) }
        revealHost.remove()
        // The ongoing-mark row's cards: one sidebar row per card, led by the
        // mark its choice gives it, and the reader's stored choice repainting
        // the running row's own mark on the page. The mark's paint is the
        // sidebar's (theme/sidebar.css), so the cards are read through their own
        // boxes and the session row's box is read under each stored value.
        r.settings.ongoingCards = (function () {
          var out = { cards: [] }
          var tree = renderSettingsTab('motion')
          walk(tree, function (node) {
            var props = node.props || {}
            if (typeof props.className !== 'string' || !/(^| )dsh-claude-ongoing-card( |$)/.test(props.className)) return
            var sample = [].concat(props.children || [])[0] || {}
            var sampleProps = sample.props || {}
            var parts = [].concat(sampleProps.children || [])
            var mark = parts[0] || {}
            var title = parts[1] || {}
            out.cards.push({
              label: props['aria-label'],
              active: props['data-active'] === '',
              pressed: props['aria-pressed'],
              sample: sampleProps['aria-hidden'] === 'true' && /(^| )dsh-claude-ongoing-sample( |$)/.test(sampleProps.className || ''),
              look: (mark.props || {})['data-look'],
              title: [].concat((title.props || {}).children || []).join(''),
            })
          })
          return out
        })()
        var marksHost = document.createElement('div')
        marksHost.style.cssText = 'position:absolute;left:-10000px;top:-10000px'
        var markOf = function (look) {
          var mark = document.createElement('span')
          mark.className = 'dsh-claude-ongoing-mark'
          mark.setAttribute('data-look', look)
          marksHost.appendChild(mark)
          return mark
        }
        var breatheMark = markOf('breathe')
        var ringMark = markOf('ring')
        document.body.appendChild(marksHost)
        var readMark = function (mark) {
          var style = getComputedStyle(mark)
          return { width: style.width, border: style.borderTopWidth, animation: style.animationName, duration: style.animationDuration }
        }
        r.settings.ongoingMarks = { breathe: readMark(breatheMark), ring: readMark(ringMark) }
        marksHost.remove()
        var runningMark = document.querySelector('[data-dsh-claude-part~="session-row"] svg[data-state="ongoing"]')
        var readRunning = function () {
          var style = getComputedStyle(runningMark)
          return {
            attribute: document.body.getAttribute('data-dsh-claude-ongoing-indicator'),
            width: style.width,
            border: style.borderTopWidth,
            animation: style.animationName,
          }
        }
        window.__pushForm({ ongoingIndicator: 'ring' })
        await sleep(120)
        var ringRunning = readRunning()
        window.__pushForm({ ongoingIndicator: 'breathe' })
        await sleep(120)
        r.settings.ongoingStored = { ring: ringRunning, breathe: readRunning() }
        // The colour cards: all three are buttons, the card the page paints is
        // pressed, and a picked card hands the colours back through its reset.
        // The brand mark is read beside the card, because a picked card paints
        // its own colours without moving the mark.
        r.settings.paletteCards = await (async function () {
          var treeOf = function (states) {
            var react = window.__react
            react.rendering = true
            react.states = states
            var tree = Section({})
            react.rendering = false
            react.states = null
            return tree
          }
          var read = function () {
            var tree = treeOf({ general: 'appearance' })
            // The colour row is the appearance tab's only labelled group, so the
            // cards are its button children; their labels are what the reader sees.
            var group = null
            walk(tree, function (node) {
              var props = node.props || {}
              if (group === null && props.role === 'group' && typeof props['aria-label'] === 'string') group = props
            })
            var cards = []
            var readCard = function (node) {
              if (Array.isArray(node)) { node.forEach(readCard); return }
              if (node === null || typeof node !== 'object') return
              var props = node.props || {}
              if (props.role === 'button') {
                var reset = null
                var kids = [].concat(props.children || [])
                for (var ki = 0; ki < kids.length; ki++) {
                  var kid = kids[ki]
                  if (kid !== null && typeof kid === 'object' && (kid.props || {}).type === 'button') {
                    reset = [].concat(kid.props.children || []).join('')
                  }
                }
                cards.push({
                  label: props['aria-label'],
                  brand: props['data-brand'] || null,
                  role: props.role,
                  pressed: props['aria-pressed'],
                  active: props['data-active'] === '',
                  reset: reset,
                })
                return
              }
              readCard(props.children)
            }
            if (group !== null) readCard(group.children)
            return cards
          }
          var mark = function () {
            var tree = treeOf(null)
            // The general tab's theme style is its only group: the pressed card
            // names the brand whose mark the page paints.
            var group = null
            walk(tree, function (node) {
              var props = node.props || {}
              if (group === null && props.role === 'group') group = props
            })
            var pressed = []
            walk(group === null ? [] : group.children, function (node) {
              var props = node.props || {}
              if (props['aria-pressed'] === 'true' && typeof props['aria-label'] === 'string') pressed.push(props['aria-label'])
            })
            return pressed
          }
          window.__pushForm({ brand: 'deepseek', paletteColors: 'brand' })
          await sleep(120)
          var following = { cards: read(), mark: mark() }
          window.__pushForm({ paletteColors: 'claude' })
          await sleep(120)
          var pinned = { cards: read(), mark: mark() }
          window.__pushForm({ paletteColors: 'custom' })
          await sleep(120)
          var custom = { cards: read(), mark: mark() }
          window.__pushForm({ brand: 'claude', paletteColors: 'brand' })
          await sleep(120)
          return { following: following, pinned: pinned, custom: custom }
        })()
        window.__pushForm({ modelPicker: false, mascot: 'off', sidebarSearch: false, palette: 'host', billingCurrency: 'off' })
        r.settings.parentsOff = { appearance: renderTab('appearance'), mainWindow: renderTab('main-window'), sidebar: renderTab('sidebar') }
        window.__pushForm({ modelPicker: true, mascot: 'brand', sidebarSearch: true, palette: 'claude', billingCurrency: 'CNY' })
        // The rows that wait for another setting: the composer restyle off greys
        // the picker, its sub-rows, the permission control and the statistics'
        // figures; the footer takeover off greys the easter egg under it. Home
        // only still leaves the statistics without a conversation to stand in.
        window.__pushForm({ composerScope: 'off', collapseFooter: false })
        r.settings.requirementsOff = { mainWindow: renderTab('main-window'), sidebar: renderTab('sidebar') }
        window.__pushForm({ composerScope: 'hero', collapseFooter: true })
        r.settings.heroOnly = { mainWindow: renderTab('main-window') }
        window.__pushForm({ composerScope: 'all' })
        // Page zoom reaches the document through the preference mirror and the
        // sheet draws the page at it, above and below the page's own size; the
        // page the layout fills is read back in the sheet's dialogs and menus
        // too, so the whole document is what stands on show.
        var readZoom = function () {
          return {
            attr: document.body.getAttribute('data-dsh-claude-page-zoom'),
            zoom: getComputedStyle(document.body).zoom,
          }
        }
        window.__pushForm({ pageZoom: '1.5' })
        await sleep(120)
        var zoomed = readZoom()
        window.__pushForm({ pageZoom: '0.8' })
        await sleep(120)
        var shrunk = readZoom()
        window.__pushForm({ pageZoom: 'system' })
        await sleep(120)
        r.settings.pageZoom = { zoomed: zoomed, shrunk: shrunk, following: readZoom() }
        // The row's own control: one field that takes any percentage, the reset
        // label beside it and the seekbar the field opens, both covering the same
        // range. Read off the element tree — not the report `renderTab` walks into
        // — with a percentage the default does not carry, so the reset label is the
        // state under test; the same walk at the default reports no label at all.
        var readZoomRow = function () {
          var react = window.__react
          react.rendering = true
          react.states = null
          var tree = Section({})
          react.rendering = false
          var out = {}
          var zoomRow = null
          walk(tree, function (node) {
            var props = node.props || {}
            if (props.key === 'pageZoom') zoomRow = props
          })
          if (zoomRow !== null) {
            walk(zoomRow.children, function (node) {
              var props = node.props || {}
              if (props.inputMode === 'numeric') out.box = { type: props.type, value: props.value, placeholder: props.placeholder, label: props['aria-label'] }
              if (props.type === 'range') out.track = { type: props.type, min: props.min, max: props.max, step: props.step, value: props.value, label: props['aria-label'] }
              if (props.type === 'button') out.reset = { text: [].concat(props.children).join('') }
              if (props['data-open'] !== undefined) out.card = { open: props['data-open'] }
            })
          }
          return out
        }
        window.__pushForm({ pageZoom: '112' })
        await sleep(120)
        r.settings.pageZoomControl = readZoomRow()
        window.__pushForm({ pageZoom: '100' })
        await sleep(120)
        r.settings.pageZoomAtDefault = readZoomRow()
        window.__pushForm({ pageZoom: 'system' })
        await sleep(120)
        // On the Windows window the title-bar row takes input; everywhere else
        // it stays greyed with its note.
        document.documentElement.setAttribute('data-windows-titlebar', '')
        r.settings.onWindows = renderTab('main-window')
        document.documentElement.removeAttribute('data-windows-titlebar')
      }
    })
  })
})()
