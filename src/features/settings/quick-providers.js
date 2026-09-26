    /**
     * The settings page's quick-provider picker — the providers whose models the
     * model picker's first level carries.
     *
     * It is the permission popover's design in multi-select form: the same card
     * and the same rows (`.dsh-claude-perm-popover` is that shared card, the name
     * is historical), with the accent check marking the chosen providers. It is a
     * settings control rather than a takeover, so it opens on click only —
     * hovering a settings row should not unfold a menu — and it stays open while
     * rows are toggled.
     *
     * The card is appended to <body> rather than rendered inside the settings row:
     * a dialog clips and may transform its own subtree, so a `position: fixed`
     * card in there would be positioned against the dialog, not the viewport.
     */
    function installQuickProviders(ctx, ui) {
      var CHECK_SVG = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3.2L13 5"/></svg>'
      var card = null
      var cardBody = null
      var anchor = null
      var onWrite = null
      var providers = []
      var unsubscribe = null

      function close() {
        if (card !== null && card.parentElement) card.parentElement.removeChild(card)
        if (anchor !== null) anchor.setAttribute('aria-expanded', 'false')
        card = null
        cardBody = null
        anchor = null
        onWrite = null
        document.removeEventListener('pointerdown', onOutsidePointerDown, true)
        document.removeEventListener('keydown', onKeyDown, true)
      }

      function onOutsidePointerDown(e) {
        if (card === null) return
        var target = e.target
        if (card.contains(target)) return
        if (anchor !== null && anchor.contains(target)) return
        close()
      }

      function onKeyDown(e) {
        if (e.key === 'Escape') close()
      }

      /** One provider: its name, how many models it offers, and a check when chosen. */
      function buildRow(provider, chosen, stale) {
        var row = modelEl('button', 'dsh-claude-popover-item')
        if (stale) row.classList.add('dsh-claude-model-stale')
        row.type = 'button'
        row.setAttribute('role', 'menuitemcheckbox')
        row.setAttribute('aria-checked', chosen ? 'true' : 'false')
        row.appendChild(modelEl('span', 'dsh-claude-popover-item-text', provider.name))
        row.appendChild(modelEl('span', 'dsh-claude-popover-item-badge', stale ? settingsCopy('quickRemoved', 'Removed') : String(provider.count)))
        var check = modelEl('span', 'dsh-claude-model-check')
        check.innerHTML = chosen ? CHECK_SVG : ''
        row.appendChild(check)
        row.addEventListener('click', function (e) {
          e.stopPropagation()
          var next = readPrefs().quickProviders.slice()
          var at = next.indexOf(provider.id)
          if (at === -1) next.push(provider.id)
          else next.splice(at, 1)
          if (typeof onWrite === 'function') onWrite(next)
          renderBody()
        })
        return row
      }

      function renderBody() {
        if (cardBody === null) return
        while (cardBody.firstChild) cardBody.removeChild(cardBody.firstChild)
        if (providers.length === 0) {
          cardBody.appendChild(modelEl('div', 'dsh-claude-model-status', settingsCopy('quickLoading', 'Loading providers…')))
          return
        }
        var chosen = readPrefs().quickProviders
        // The official service always leads the first level, so it is not a
        // choice here: it is never listed, and a stored id for it is pruned on
        // load. A provider that vanished from the catalog still appears, marked
        // removed, so it can be unchecked out of the stored list instead of
        // lingering invisibly.
        var known = {}
        for (var i = 0; i < providers.length; i++) {
          if (providers[i].id === MODEL_OFFICIAL_GROUP) continue
          known[providers[i].id] = true
          cardBody.appendChild(buildRow(providers[i], chosen.indexOf(providers[i].id) !== -1, false))
        }
        for (var s = 0; s < chosen.length; s++) {
          if (chosen[s] === MODEL_OFFICIAL_GROUP || known[chosen[s]]) continue
          cardBody.appendChild(buildRow({ id: chosen[s], name: chosen[s], count: 0 }, true, true))
        }
      }

      function open(trigger, write) {
        closeOtherPopovers('quickProviders')
        anchor = trigger
        anchor.setAttribute('aria-expanded', 'true')
        onWrite = write
        providers = ui.model && typeof ui.model.providers === 'function' ? ui.model.providers() : []
        card = modelEl('div', 'dsh-claude-perm-popover')
        card.setAttribute('role', 'menu')
        card.setAttribute('data-open', 'true')
        cardBody = modelEl('div', 'dsh-claude-model-popover-body')
        card.appendChild(cardBody)
        renderBody()
        document.body.appendChild(card)
        positionAnchoredPopover(trigger, card, { side: 'above', gap: 6, important: true })
        document.addEventListener('pointerdown', onOutsidePointerDown, true)
        document.addEventListener('keydown', onKeyDown, true)
      }

      function toggle(trigger, write) {
        if (card === null) open(trigger, write)
        else close()
      }

      // The catalog arrives after the settings page may already be open, so an
      // open card follows it rather than showing an empty list until reopened.
      if (ui.model && typeof ui.model.onProviders === 'function') {
        unsubscribe = ui.model.onProviders(function (list) {
          providers = list
          if (card !== null) renderBody()
        })
      }

      registerPopover('quickProviders', close)

      ui.quickProviders = {
        toggle: toggle,
        /**
         * The card closes on composer focus (and when the settings page tears it
         * down, which calls this with no reason). Esc and an outside press are
         * NOT its dismiss routes, so those reasons are ignored.
         */
        close: function (reason) {
          if (reason === 'escape' || reason === 'outside') return
          close()
        },
        isOpen: function () { return card !== null },
      }
      return function () {
        close()
        unregisterPopover('quickProviders')
        if (unsubscribe !== null) {
          try { unsubscribe() } catch (error) { /* already disposed */ }
          unsubscribe = null
        }
        delete ui.quickProviders
      }
    }