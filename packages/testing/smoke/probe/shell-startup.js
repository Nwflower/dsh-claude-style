/**
 * The page's first collections: a generation disposed while its feature
 * chunks are on their way, the served-namespace read the late-forms case makes
 * before the host's directory has answered, and the popovers case's
 * arbitration between the permission card, the account drawer and the hero
 * row's own host menus.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var until = probe.until
  var nextPass = probe.nextPass
  var r = probe.report

  probe.step(async function () {
    await probe.onlyFor(['chunk-late'], async function () {
      // The way a hot reload ends a generation (D76): the chunks apply()
      // sent for still arrive, and must install nothing. The settings section
      // is the one a slot registration would show.
      window.__dispose()
      await sleep(600)
      r.lateSlots = (window.__slots || []).map(function (entry) { return entry.key })
      r.lateNodes = document.querySelectorAll(':is([class^="dsh-claude-"], [class*=" dsh-claude-"])').length
    })
    await probe.onlyFor(['late-forms'], async function () {
      // The directory has not answered yet: the skin holds the defaults.
      r.lateBefore = document.body.getAttribute('data-dsh-claude-home-layout')
      // A saved collapsed choice arrives with the namespace. Until then the
      // default stepped display must not press an already running row.
      window.__pushForm({ reasoningDisplay: 'collapsed' })
      var lateReasoning = document.createElement('div')
      lateReasoning.setAttribute('data-variant', 'think')
      lateReasoning.setAttribute('data-state', 'running')
      var lateReasoningControl = document.createElement('button')
      lateReasoningControl.type = 'button'
      var lateReasoningClicks = 0
      lateReasoningControl.addEventListener('click', function () {
        lateReasoningClicks++
        lateReasoning.toggleAttribute('data-expanded')
      })
      lateReasoning.appendChild(lateReasoningControl)
      document.body.appendChild(lateReasoning)
      await sleep(200)
      r.lateReasoningBefore = { clicks: lateReasoningClicks, expanded: lateReasoning.hasAttribute('data-expanded') }
      window.__serveNamespace()
      // A pass is driven by a mutation, the way the live page drives one.
      document.body.appendChild(document.createElement('i'))
      await sleep(200)
      r.lateAfter = document.body.getAttribute('data-dsh-claude-home-layout')
      r.lateReasoningAfter = { clicks: lateReasoningClicks, expanded: lateReasoning.hasAttribute('data-expanded') }
    })
    await probe.onlyFor(['popovers'], async function () {
      // The shared popover rule (shared/popover.ts): the dwell keeps a pointer that
      // merely crosses a trigger from unfolding anything, and only one card is up
      // at a time — whichever opens last folds the one before it.
      // The controls are built by the first scheduler pass, not by apply().
      await sleep(500)
      var permTrigger = document.querySelector('.dsh-claude-perm-btn')
      var drawerTrigger = document.querySelector('.dsh-claude-account-btn')
      var heroTrigger = document.getElementById('hero-workspace')
      var presetTrigger = document.getElementById('hero-preset')
      function permUp() { return document.querySelectorAll('.dsh-claude-perm-popover[data-open="true"]').length }
      function drawerUp() { return document.querySelectorAll('.dsh-claude-account-popover[data-open="true"]').length }
      function hostCards() { return document.querySelectorAll('body > :is([role="menu"], [data-menu-popup]):not(:is([class^="dsh-claude"], [class*=" dsh-claude"]))').length }
      // The dwell is 100 ms: at 50 ms a crossing pointer has opened nothing, and
      // by 250 ms a pointer that stayed has the card.
      permTrigger.dispatchEvent(new MouseEvent('mouseenter'))
      await sleep(50)
      r.permOpenAtDwell = permUp()
      await sleep(200)
      r.permOpenPastDwell = permUp()
      // An open card is the one moment it may answer the host's menu role.
      var openPermCard = document.querySelector('.dsh-claude-perm-popover[data-open="true"]')
      r.permCardRole = openPermCard !== null ? openPermCard.getAttribute('role') : null
      // The drawer opens over the permission card and folds it.
      drawerTrigger.dispatchEvent(new MouseEvent('mouseenter'))
      await sleep(250)
      r.drawerUp = drawerUp()
      r.permFoldedByDrawer = permUp()
      // The reader's hand presses the trigger the dwell just opened: the
      // drawer stays up, since the pointer is still on the row it opened from.
      drawerTrigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      await sleep(150)
      r.drawerAfterPress = drawerUp()
      r.drawerOpenAttrAfterPress = drawerTrigger.getAttribute('data-open')
      // The hero row's host menu opens on the same dwell, over the drawer.
      heroTrigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await sleep(250)
      r.heroUp = window.__heroMenuOpen('hero-workspace')
      r.drawerFoldedByHero = drawerUp()
      // ...and the permission card folds the host menu on its way back.
      permTrigger.dispatchEvent(new MouseEvent('mouseenter'))
      await sleep(250)
      r.permReopened = permUp()
      r.heroFoldedByPerm = window.__heroMenuOpen('hero-workspace')
      // A press on a trigger whose card the dwell opened leaves the card up:
      // the pointer is on the trigger it opened from, so the leave is the
      // reader's way out (shared/popover.ts::pressKeepsPopoverOpen).
      permTrigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      await sleep(150)
      r.permUpAfterPress = permUp()
      heroTrigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await sleep(250)
      r.heroUpBeforePress = window.__heroMenuOpen('hero-workspace')
      heroTrigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      await sleep(150)
      r.heroUpAfterPress = window.__heroMenuOpen('hero-workspace')
      heroTrigger.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }))
      await sleep(300)
      r.heroLeftAfterPress = window.__heroMenusOpen()
      permTrigger.dispatchEvent(new MouseEvent('mouseenter'))
      await sleep(250)
      r.permUpForLeave = permUp()
      // The row's two pickers are two host menus: crossing from the preset seat
      // straight to the workspace chip must fold the first, not leave both cards
      // up (with two cards up the skin stamps and places neither, and the pair
      // flickers as the hover-close path presses the wrong trigger).
      presetTrigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await sleep(250)
      r.presetUp = window.__heroMenuOpen('hero-preset')
      r.permFoldedByPreset = permUp()
      // The stamp names the picker, and only the workspace card is drawn as
      // Claude's folder menu: the preset card keeps its row glyph.
      var heroStamp = '[data-dsh-claude-hero-menu]'
      function heroCardShape() {
        var card = document.querySelector(heroStamp)
        if (card === null) return null
        var icons = card.querySelectorAll('[data-dsh-claude-part~="menu-item-icon"]')
        var row = card.querySelector('[role="menuitem"]')
        return {
          kind: card.getAttribute(heroStamp.slice(1, -1)),
          iconsShown: Array.prototype.filter.call(icons, function (icon) { return getComputedStyle(icon).display !== 'none' }).length,
          rowHeight: row === null ? null : Math.round(row.getBoundingClientRect().height),
        }
      }
      /** Where the stamped card sits against its trigger, in the skin's own terms. */
      function heroCardPlacement() {
        var card = document.querySelector(heroStamp)
        var row = document.getElementById('hero-workspace')
        if (card === null) return null
        var c = card.getBoundingClientRect()
        var t = row.getBoundingClientRect()
        return {
          side: c.bottom <= t.top + 1 ? 'above' : (c.top >= t.bottom - 1 ? 'below' : 'overlapping'),
          airAbove: Math.round(t.top - c.bottom),
          airBelow: Math.round(c.top - t.bottom),
          rightDelta: Math.round(t.right - c.right),
        }
      }
      // A card's row height follows the face its words are drawn in, so the
      // reading waits for the face the card asked for: a fallback face lands a
      // pixel under the skin's own.
      await document.fonts.ready
      r.presetCard = heroCardShape()
      heroTrigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      // The dwell opens the workspace picker, and the pass over that change
      // stamps its card: wait on the page's own state and pass count, not on
      // a duration a busy display pushes later (D92).
      await until(function () { return window.__heroMenuOpen('hero-workspace') },
        function (readings) { return readings[readings.length - 1] === true },
        'the workspace picker to open over the preset')
      await nextPass('the pass that stamps the workspace card')
      await document.fonts.ready
      r.workspaceUpAfterCrossing = window.__heroMenuOpen('hero-workspace')
      r.presetFoldedBySibling = window.__heroMenuOpen('hero-preset')
      r.heroCardsUp = hostCards()
      r.workspaceCard = heroCardShape()
      r.workspacePlacement = heroCardPlacement()
      // A null shape while the menu stands open says the stamp never landed:
      // the trigger's anchor name and every card's position anchor are the
      // evidence for which half of the tie is missing.
      if (r.workspaceCard === null) {
        r.workspaceStampDiagnostics = {
          expanded: heroTrigger.getAttribute('aria-expanded'),
          triggerAnchor: heroTrigger.style.getPropertyValue('anchor-name'),
          cards: Array.prototype.map.call(document.querySelectorAll(':is([role="menu"], [data-menu-popup])'), function (card) {
            return {
              skin: /dsh-claude-/.test(card.className),
              positionAnchor: card.style.getPropertyValue('position-anchor'),
              stamped: card.getAttribute(heroStamp.slice(1, -1))
            }
          })
        }
      }
      // The pointer travels from the trigger to the card across the air between
      // them: the grace keeps the card while the pointer crosses, and the card's
      // own hover cancels the close once it arrives. A card the stamp never
      // landed on answers neither, and the leave folds it mid-travel.
      var stampedCard = document.querySelector(heroStamp)
      var triggerBox = heroTrigger.getBoundingClientRect()
      var cardBox = stampedCard === null ? null : stampedCard.getBoundingClientRect()
      if (cardBox !== null) {
        var gapY = (cardBox.bottom + triggerBox.top) / 2
        heroTrigger.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }))
        document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: triggerBox.x + triggerBox.width / 2, clientY: gapY }))
        await sleep(300)
        r.workspaceUpInGap = window.__heroMenuOpen('hero-workspace')
        stampedCard.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: heroTrigger }))
        document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: cardBox.x + cardBox.width / 2, clientY: cardBox.y + cardBox.height / 2 }))
        await sleep(150)
        r.workspaceUpAfterTravel = window.__heroMenuOpen('hero-workspace')
        // The pointer leaves the card for desktop far from the row, so the leave
        // below reads a departure rather than a crossing.
        stampedCard.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }))
        document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 5, clientY: 5 }))
      }
      // Leaving the row folds the menu the hover opened, and only that one.
      heroTrigger.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }))
      await sleep(300)
      r.heroMenusLeft = window.__heroMenusOpen()
      // The row against the viewport's top edge leaves no room above: the card
      // flips below its trigger rather than leaving the screen.
      var heroRow = document.querySelector('[data-dsh-claude-part~="hero-workspace-row"]')
      heroRow.style.bottom = 'auto'
      heroRow.style.top = '0px'
      heroTrigger.click()
      await sleep(250)
      r.workspacePlacementTight = heroCardPlacement()
      heroTrigger.click()
      await sleep(200)
      r.heroMenusLeftAfterFlip = window.__heroMenusOpen()
      heroRow.style.bottom = ''
      heroRow.style.top = ''
      permTrigger.dispatchEvent(new MouseEvent('mouseleave'))
      drawerTrigger.dispatchEvent(new MouseEvent('mouseleave'))
      await sleep(250)
      r.cardsLeftAfterLeave = permUp() + drawerUp()
    })
  })
})()
