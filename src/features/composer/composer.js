    /**
     * The composer's own layout: one feature for the whole input area.
     *
     * Each pass starts here. It reads the page's composer state once — whether
     * the host shows the hero composer, and whether the restyle applies to it —
     * and every other feature reads that answer through `ui.composer` for the
     * rest of the pass. From the same reading it writes what the stylesheet
     * keys on: the hero/inline variant on the cards and their stack, the
     * composer gate on <body>, the attachment state and tiles, the context
     * meter's stamp and room, and whether the chat tab (the composer's only
     * view) is up. The scheduler triggers its two behaviours through hooks: a
     * press on the inline card focuses the editor, and the transcript follows
     * the card when it changes height.
     */
    function installComposer(ctx, ui) {
      /** Whether the page shows the hero composer, as of the last reading. */
      var hero = false
      /** Whether the composer restyle applies to the page shown, as of the last reading. */
      var active = false
      /** Whether the studio home layout owns the hero page, as of the last reading. */
      var studioHome = false
      /** The hero page's composer card, or null off the hero page, as of the last pass. */
      var heroCard = null

      /**
       * Read the page's composer state. The host marks the conversation root
       * `data-phase="hero"` exactly when it renders the hero composer (no
       * session yet, or a blank one), so that marker is the whole test; the
       * composer-scope preference then decides whether the restyle covers the
       * page.
       */
      function readState() {
        hero = document.querySelector('[data-phase="hero"]') !== null
        var scope = readPrefs().composerScope
        active = !composerRestyleRetired && (scope === 'all' || (hero ? scope === 'hero' : scope === 'conversation'))
        studioHome = hero && readPrefs().homeLayout === HOME_LAYOUT_STUDIO
      }

      /**
       * Mirror the variant onto every card and its composerStack ancestor, so
       * stack-scoped rules read an attribute instead of re-deriving hero/inline
       * through :has() on every DOM mutation. Write only when the value differs
       * (re-setting the same value still invalidates the element's styles), and
       * once per stack even when several cards share one.
       *
       * The studio home layout draws its composer in the conversation's
       * single-line form, so a studio hero page stamps `inline`, not `hero`.
       */
      function syncVariant(cards) {
        var value = hero && !studioHome ? 'hero' : 'inline'
        var syncedStacks = []
        for (var c = 0; c < cards.length; c++) {
          var card = cards[c]
          if (card.getAttribute('data-composer-variant') !== value) card.setAttribute('data-composer-variant', value)
          var stack = card.closest('[class*="composerStack"]')
          if (stack !== null && syncedStacks.indexOf(stack) === -1) {
            if (stack.getAttribute('data-composer-variant') !== value) {
              stack.setAttribute('data-composer-variant', value)
            }
            syncedStacks.push(stack)
          }
        }
      }

      /** The input rail inside a card: the attachment shell and its scrolling inner rail. */
      var ATTACHMENT_RAIL = '[class*="rail"]:not([class*="trailing"])'
      /** Anything in a card that means it carries attachments. */
      var ATTACHMENT_PRESENT = '[class*="imageItem"], [class*="thumbnail"], [class*="FileCard"], ' + ATTACHMENT_RAIL + ' :is([class*="item"], img, [class*="card"])'
      /**
       * The attachment tiles the stylesheet reshapes into thumbnails. They are
       * found here once per pass and marked, so the rules read one attribute
       * instead of re-running this list, with its structural :has(img), on
       * every DOM change.
       */
      var ATTACHMENT_TILES = ATTACHMENT_RAIL + ' :is([class*="imageItem"], [class*="thumbnail"], [class*="FileCard"], [class*="item"]:has(img), [class*="card"]:has(img), [class*="attachment"]:has(img))'
      var ATTACHMENT_TILE_ATTR = 'data-dsh-claude-attachment'

      /** Mark the cards that carry attachments, and the tiles inside them. */
      function syncAttachments(cards) {
        var tiles = []
        for (var ci = 0; ci < cards.length; ci++) {
          var card = cards[ci]
          if (active && card.querySelector(ATTACHMENT_PRESENT) !== null) {
            if (card.getAttribute('data-has-attachments') !== 'true') card.setAttribute('data-has-attachments', 'true')
            var found = card.querySelectorAll(ATTACHMENT_TILES)
            for (var t = 0; t < found.length; t++) tiles.push(found[t])
          } else if (card.hasAttribute('data-has-attachments')) {
            card.removeAttribute('data-has-attachments')
          }
        }
        var marked = document.querySelectorAll('[' + ATTACHMENT_TILE_ATTR + ']')
        for (var m = 0; m < marked.length; m++) {
          if (tiles.indexOf(marked[m]) === -1) marked[m].removeAttribute(ATTACHMENT_TILE_ATTR)
        }
        for (var n = 0; n < tiles.length; n++) {
          if (!tiles[n].hasAttribute(ATTACHMENT_TILE_ATTR)) tiles[n].setAttribute(ATTACHMENT_TILE_ATTR, '')
        }
      }

      var DRAFT_EMPTY_ATTR = 'data-dsh-claude-draft-empty'

      /**
       * Mark the cards whose draft is empty. The host's editor shows its
       * placeholder exactly then (DraftEditor's `data-composer-placeholder`),
       * and the send button's ghost and ready looks key on this mark — as a
       * stylesheet test (`card:has(placeholder) button`) it made every DOM
       * change re-match the whole document. The placeholder comes and goes as a
       * DOM change, so the pass that follows it moves the mark in the same frame.
       */
      function syncDraftState(cards) {
        for (var i = 0; i < cards.length; i++) {
          var empty = cards[i].querySelector('[data-composer-placeholder]') !== null
          if (empty === cards[i].hasAttribute(DRAFT_EMPTY_ATTR)) continue
          if (empty) cards[i].setAttribute(DRAFT_EMPTY_ATTR, '')
          else cards[i].removeAttribute(DRAFT_EMPTY_ATTR)
        }
      }

      /**
       * The composer's dock line, which the host renders right after the card
       * (a notice line, when there is one, sits before it).
       */
      function composerDock(card) {
        return card.nextElementSibling
      }

      /** The meter the host parks in that dock, or null when it is not there. */
      function dockedContextMeter(dock) {
        if (dock === null) return null
        var triggers = dock.querySelectorAll('button[aria-haspopup="dialog"]')
        for (var i = 0; i < triggers.length; i++) {
          // The meter's trigger IS the occupancy reading ("42%") and no stats
          // pill ever is, so the label alone identifies it without a class name
          // (the host hashes those per build).
          if (!/^\d{1,3}%$/.test((triggers[i].textContent || '').trim())) continue
          var node = triggers[i]
          while (node.parentElement !== null && node.parentElement !== dock) node = node.parentElement
          return node
        }
        return null
      }

      /** The room the meter takes at the toolbar row's right end, as last written. */
      var meterRoom = ''

      /**
       * Stamp the context-occupancy meter and keep its room on the toolbar row.
       *
       * The meter stays in the host's dock line, its native React parent: moving
       * it out crashed React's unmount (Node.removeChild). The stylesheet lays
       * the dock over the toolbar row and puts the meter at the row's right end,
       * after the model and effort triggers; the trailing cluster keeps that
       * room free through --dsh-claude-meter-room — the meter's width plus the
       * cluster's own 8px gap, written only on a change.
       */
      function stampContextMeter(card) {
        var meter = card === void 0 ? null : dockedContextMeter(composerDock(card))
        var room = ''
        if (meter !== null) {
          if (!meter.hasAttribute('data-dsh-claude-context-meter')) meter.setAttribute('data-dsh-claude-context-meter', '')
          if (active && meter.offsetWidth > 0) room = (meter.offsetWidth + 8) + 'px'
        }
        if (room === meterRoom) return
        meterRoom = room
        if (room === '') document.body.style.removeProperty('--dsh-claude-meter-room')
        else document.body.style.setProperty('--dsh-claude-meter-room', room)
      }

      /**
       * The composer is chat-view-only. The host mounts the seat inside the
       * conversation root on every tab (轨迹 / 上下文 even reserve room for
       * it), so the skin reflects the active view on <body> and CSS drops the
       * whole bottom area unless the chat tab is selected.
       *
       * Scope: the conversation tablist lives in the panel header, which is
       * the root's first child — any other tablist (the trajectory detail
       * panel, say) renders later inside the ledger. The chat view registers
       * at order 0, so it is always the tablist's FIRST tab; reading that
       * tab's aria-selected is locale-independent. No tab bar at all (hero /
       * single view) means the chat surface is all there is.
       */
      function syncChatTabComposer() {
        if (!active) {
          document.body.removeAttribute('data-dsh-claude-composer-hidden')
          return
        }
        var chatActive = true
        var seat = document.querySelector('[data-composer-seat]')
        var root = seat && seat.closest ? seat.closest('[data-phase]') : null
        if (root) {
          var list = root.querySelector('[role="tablist"]')
          if (list) {
            var first = list.querySelector('[role="tab"]')
            if (first) chatActive = first.getAttribute('aria-selected') === 'true'
          }
        }
        if (chatActive) document.body.removeAttribute('data-dsh-claude-composer-hidden')
        else document.body.setAttribute('data-dsh-claude-composer-hidden', '')
      }

      function syncComposer() {
        readState()
        var cards = document.querySelectorAll('[data-composer-card]')
        heroCard = hero && cards.length > 0 ? cards[0] : null
        syncVariant(cards)
        if (active !== document.body.hasAttribute(COMPOSER_ATTR)) {
          if (active) document.body.setAttribute(COMPOSER_ATTR, '')
          else document.body.removeAttribute(COMPOSER_ATTR)
        }
        syncAttachments(cards)
        syncDraftState(cards)
        stampContextMeter(cards[0])
        syncChatTabComposer()
      }

      /**
       * A press on the inline card lands in its editor: the card's padding and
       * toolbar row surround a one-line field, and a press on the card that is
       * not one of its controls means the field.
       */
      function focusEditorOnPress(target) {
        var card = target && target.closest && target.closest('[data-composer-card][data-composer-variant="inline"]')
        if (!card) return
        if (target.closest('button, [role="button"], [role="menu"], [role="radiogroup"], input, select')) return
        var input = card.querySelector('[data-composer-input]')
        if (input && document.activeElement !== input) {
          input.focus()
        }
      }

      /**
       * Keep a reader who was at the transcript's end there while the card
       * changes height: the card growing with a multi-line draft (or shrinking
       * back) moves the transcript's bottom edge without any scroll. Within
       * 150px of the end counts as at the end.
       */
      function followTranscript() {
        var scroller = document.querySelector('[data-conversation-scroll], [class*="scrollBody"]')
        if (scroller) {
          var dist = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
          if (dist < 150) {
            scroller.scrollTop = scroller.scrollHeight
          }
        }
      }

      ui.composer = {
        sync: syncComposer,
        /** Whether the page shows the hero composer, as of this pass. */
        isHero: function () { return hero },
        /** The hero page's composer card as of this pass, or null off the hero page. */
        heroCard: function () { return heroCard },
        /** Whether the composer restyle applies to the page shown, as of this pass. */
        isActive: function () { return active && !composerRestyleRetired },
        /** A copy source changed, the composer-scope preference among them: read again now. */
        onCopyChange: readState,
        onPointerDown: focusEditorOnPress,
        /** The composer card changed size: the transcript follows it. */
        reposition: function (reason) {
          if (reason === 'composer') followTranscript()
        }
      }
      readState()

      return function () {
        active = false
        heroCard = null
        if (document.body.hasAttribute(COMPOSER_ATTR)) document.body.removeAttribute(COMPOSER_ATTR)
        document.body.removeAttribute('data-dsh-claude-composer-hidden')
        var marks = ['data-composer-variant', 'data-has-attachments', ATTACHMENT_TILE_ATTR, DRAFT_EMPTY_ATTR, 'data-dsh-claude-context-meter']
        for (var k = 0; k < marks.length; k++) {
          var marked = document.querySelectorAll('[' + marks[k] + ']')
          for (var i = 0; i < marked.length; i++) marked[i].removeAttribute(marks[k])
        }
        if (meterRoom !== '') {
          meterRoom = ''
          document.body.style.removeProperty('--dsh-claude-meter-room')
        }
      }
    }
