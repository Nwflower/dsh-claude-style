    /**
     * The account area of the sidebar footer.
     *
     * One row model, two mount points (account/surface.js): on a host that has
     * an account row (Desktop 0.1.7+) that row is the entry and our container is
     * injected into the host's own account menu; on a host without one (Web)
     * the skin self-builds the trigger and the popover and the popover's
     * body is the container. The rows themselves — the account header with the
     * hold-screen easter egg, the plugin footer entries (account/footer-mirror.js)
     * and, on the self-built path only, the settings row — are shared.
     */
    function installAccountFooter(ctx, ui) {
      /** The marker the stylesheet hangs the host account row's Claude shape on. */
      var HOST_ROW_ATTR = 'data-dsh-claude-account-host-row'
      var profile = createAccountProfile(ctx, function () {
        if (typeof ui.schedule === 'function') ui.schedule()
      })
      var accountBtn = null
      var accountPopover = null
      var popoverBody = null
      var settingsItem = null
      var popoverHoverIntent = createHoverIntent(openPopover, closePopover, POPOVER_OPEN_DELAY, POPOVER_CLOSE_DELAY)
      // The host path's hover intent. The host owns its menu and unmounts it on
      // close, so this drives the host's trigger and dismisses the menu with the
      // Escape the host's own Menu handles.
      var hostHoverIntent = createHoverIntent(openHostMenu, closeHostMenuForHover, POPOVER_OPEN_DELAY, POPOVER_CLOSE_DELAY)
      /**
       * Identity of the row bindings THIS generation installed. A client reload
       * drops the old generation's disposals but the host's row node outlives
       * them, so a boolean guard would leave the new generation's listeners
       * unattached (the same reason session-stats keeps a binding token).
       */
      var hostRowBindingToken = {}
      // Whether the popover is up because it was CLICKED (rather than hovered).
      // Clicking the account row opens the ban-screen easter egg and leaves the
      // pointer inside the popover, so without this the row's own mouseleave
      // would tear the popover down behind the overlay; a click-opened popover
      // instead stays until the pointer leaves the whole footer.
      var popoverOpenedByClick = false

      function isPopoverOpen() {
        return !!(accountPopover && accountPopover.getAttribute('data-open') === 'true')
      }

      function openPopover() {
        if (!accountPopover || !accountBtn) return
        cancelClosePopover()
        closeOtherPopovers('account')
        // Mirrors are frozen while the popover is open (footer-mirror.sync
        // bails), so reconcile them here — before the reveal — to show fresh
        // content/order and bind click targets for the upcoming interaction.
        try {
          var footArea = findFootArea()
          if (footArea) mirror.sync(footArea)
        } catch (error) { /* opening must never fail because of a mirror sync */ }
        // Resolve the rail anchor before the reveal so the panel never paints at
        // its stale coordinates for a frame.
        positionAccountPopover()
        accountPopover.setAttribute('data-open', 'true')
        accountBtn.setAttribute('data-open', 'true')
        accountBtn.setAttribute('aria-expanded', 'true')
      }

      function closePopover() {
        if (!accountPopover || !accountBtn) return
        cancelClosePopover()
        popoverOpenedByClick = false
        accountPopover.setAttribute('data-open', 'false')
        accountBtn.setAttribute('data-open', 'false')
        accountBtn.setAttribute('aria-expanded', 'false')
      }

      function togglePopover() {
        if (!accountPopover) return
        if (isPopoverOpen()) {
          closePopover()
        } else {
          // The pointer stays on the trigger after a click, and the popover
          // hangs below it, so the trigger's mouseleave must not close what the
          // click just opened — otherwise the panel is unreachable with a mouse.
          popoverOpenedByClick = true
          openPopover()
        }
      }

      function cancelClosePopover() {
        popoverHoverIntent.cancel()
      }

      function scheduleClosePopover() {
        popoverHoverIntent.scheduleClose()
      }

      /**
       * Anchor the account popover to its trigger while the sidebar is a rail.
       *
       * In the rail the popover is `position: fixed` (components/account-footer.css): the sidebar
       * column clips its overflow, so an absolutely positioned panel would be cut
       * off at the 56px rail edge and never seen. Its coordinates therefore have
       * to be resolved here — the same contract the model picker's popovers use.
       * The declarations are written `important` because the stylesheet anchors
       * the wide-sidebar popover with `!important` as well, and an author
       * `!important` beats a plain inline declaration.
       *
       * With the sidebar wide the CSS anchor is the right one, so the inline
       * overrides are dropped again and the footer rule takes over.
       */
      function positionAccountPopover() {
        if (!accountPopover || !accountBtn) return
        if (accountBtn.closest('[class*="collapsed"]') === null) {
          accountPopover.style.removeProperty('left')
          accountPopover.style.removeProperty('top')
          return
        }
        positionAnchoredPopover(accountBtn, accountPopover, { side: 'right', important: true })
      }

      var hostMenu = createHostAccountMenu({ close: closePopover })
      var rows = createAccountRows({
        hostMenu: hostMenu,
        // Drawing the launcher's head is asynchronous and changes no DOM the
        // observer can see, so the picture asks for the pass that paints it.
        onChange: function () {
          if (typeof ui.schedule === 'function') ui.schedule()
        },
        openBan: function () {
          // Leave the surface up: the overlay is a full-window surface, so what
          // is behind it does not matter, and the footer is left as the user
          // had it once the screen is dismissed.
          popoverOpenedByClick = true
          if (ui.ban) ui.ban.open()
        }
      })
      var surface = createAccountSurface({
        hostTrigger: hostMenu.trigger,
        findMenu: hostMenu.findMenu,
        menuViewport: hostMenu.menuViewport,
        buildContainer: rows.buildHostContainer,
        syntheticContainer: function () { return popoverBody },
        onMode: onSurfaceMode,
        onMenu: onHostMenuChanged
      })
      var mirror = createFooterMirror({
        body: function () { return surface.container() },
        anchor: function () { return settingsItem },
        isOpen: function () { return surface.mode() === 'synthetic' && isPopoverOpen() },
        close: closeSurface
      })
      // The account area takes part in the shared popover rule (popover-utils.js):
      // ONE entry for both surfaces, since a given host has only one of them.
      registerPopover('account', closeAccountSurfaces)
      /** The entry row's width, as last written to the stylesheet. */
      var accountWidth = 0
      /** The self-built drawer's distance from the footer's edges, as last written. */
      var accountInsetLeft = -1
      var accountInsetRight = -1

      /**
       * Build (or reuse) the self-built trigger and popover and return the
       * popover body. Idempotent against a torn-down-less reload: client HMR
       * drops the old fiber's disposals instead of running them, so a previous
       * generation's button and popover are still in the DOM and this fresh
       * scope knows nothing of them. Sweep the strays before deciding whether to
       * build — otherwise the row renders twice (and the orphan keeps a stale
       * name).
       */
      function ensureSynthetic(footArea) {
        var username = getUsername(ctx)
        removeStrayNodes(footArea, '.dsh-claude-account-btn', [accountBtn])
        removeStrayNodes(document, '.dsh-claude-account-popover', [accountPopover])

        if (accountBtn === null || !footArea.contains(accountBtn)) {
          if (accountBtn && accountBtn.parentElement) accountBtn.parentElement.removeChild(accountBtn)
          accountBtn = document.createElement('div')
          accountBtn.className = 'dsh-claude-account-btn'
          accountBtn.setAttribute('role', 'button')
          accountBtn.setAttribute('tabindex', '0')
          accountBtn.setAttribute('aria-haspopup', 'menu')
          accountBtn.setAttribute('aria-expanded', 'false')
          accountBtn.innerHTML =
            '<span class="dsh-claude-account-avatar"></span>' +
            '<span class="dsh-claude-account-label">' +
              '<span class="dsh-claude-account-user"></span>' +
            '</span>' +
            '<span class="dsh-claude-account-chevron"></span>'

          // Hover is the default way in; the "Open popovers on hover"
          // preference turns it off, leaving the click handler below as the only
          // way in (and the only way out, so a click-opened popover does not
          // vanish when the pointer leaves). The account row is the one popover
          // the `account` scope keeps on hover.
          accountBtn.addEventListener('mouseenter', function () {
            if (readPrefs().autoPopover !== AUTO_POPOVER_OFF) popoverHoverIntent.scheduleOpen()
          })
          accountBtn.addEventListener('mouseleave', function () {
            if (readPrefs().autoPopover !== AUTO_POPOVER_OFF && !popoverOpenedByClick) scheduleClosePopover()
          })
          accountBtn.addEventListener('click', function (e) {
            e.stopPropagation()
            togglePopover()
          })
          footArea.appendChild(accountBtn)
        }
        // The name and the picture are user- and host-supplied (a preference, the
        // OS user, the account profile), so they are written as text and as an
        // image source, never spliced into markup — and synced on every pass, so a
        // profile that lands after the row was built still shows up.
        var userEl = accountBtn.querySelector('.dsh-claude-account-user')
        if (userEl && userEl.textContent !== username) userEl.textContent = username
        rows.syncAvatar(accountBtn.querySelector('.dsh-claude-account-avatar'))

        if (accountPopover === null || !footArea.contains(accountPopover)) {
          if (accountPopover && accountPopover.parentElement) accountPopover.parentElement.removeChild(accountPopover)
          accountPopover = document.createElement('div')
          accountPopover.id = 'dsh-claude-account-popover'
          accountPopover.className = 'dsh-claude-account-popover'
          accountPopover.setAttribute('data-open', 'false')

          accountPopover.addEventListener('mouseenter', function () {
            cancelClosePopover()
          })
          accountPopover.addEventListener('mouseleave', function () {
            scheduleClosePopover()
          })

          accountPopover.appendChild(rows.buildHeader(username))

          popoverBody = document.createElement('div')
          popoverBody.className = 'dsh-claude-account-popover-body'
          accountPopover.appendChild(popoverBody)

          settingsItem = null
          footArea.appendChild(accountPopover)
        }

        if (settingsItem === null || !popoverBody.contains(settingsItem)) {
          settingsItem = rows.buildSettingsItem()
          popoverBody.appendChild(settingsItem)
        }
        rows.syncSettingsItem(settingsItem)
        return popoverBody
      }

      /** Remove the self-built trigger and popover (the host path's shape). */
      function dropSynthetic() {
        cancelClosePopover()
        removeStrayNodes(document, '.dsh-claude-account-btn, .dsh-claude-account-popover', [])
        accountBtn = null
        accountPopover = null
        popoverBody = null
        settingsItem = null
      }

      /**
       * Close the active surface after one of OUR rows was picked. The host's
       * menu belongs to the host: it is dismissed the way the host dismisses it
       * (an Escape its own Menu handles), never by driving its trigger. The
       * self-built popover is ours and closes directly.
       */
      function closeSurface() {
        if (surface.mode() === 'host') {
          var menu = hostMenu.findMenu()
          if (menu !== null) {
            menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
          }
          return
        }
        closePopover()
      }

      /**
       * Close whichever account surface is up, for the shared popover rule
       * (popover-utils.js): the self-built drawer directly, the host's menu the
       * way the host dismisses it. Both halves are no-ops while their surface is
       * down, so this is safe to call on every open of every other popover.
       */
      function closeAccountSurfaces() {
        if (surface.mode() === 'host') closeSurface()
        else closePopover()
      }

      /**
       * Open the host's account menu for the hover preference. The menu is the
       * host's, so it is opened by driving its trigger; when it is already up
       * (the pointer re-entered the row) nothing is pressed, or the host's own
       * toggle would close it.
       */
      /** Set from the row's hover or press until the menu closes (constants.js). */
      function armAccountMenu() {
        if (!document.body.hasAttribute(ACCOUNT_ARMED_ATTR)) document.body.setAttribute(ACCOUNT_ARMED_ATTR, '')
      }

      function disarmAccountMenu() {
        if (document.body.hasAttribute(ACCOUNT_ARMED_ATTR)) document.body.removeAttribute(ACCOUNT_ARMED_ATTR)
      }

      function openHostMenu() {
        if (surface.mode() !== 'host') return
        if (hostMenu.findMenu() !== null) return
        closeOtherPopovers('account')
        armAccountMenu()
        hostMenu.openMenu()
      }

      /**
       * Close the host's menu for the hover preference.
       *
       * The host renders the row and portals the card, and the card moves over
       * its first placement frames, so a leave can arrive while the pointer is
       * still on the row or on the card. Only a pointer that is genuinely
       * elsewhere dismisses the menu; the next leave closes it.
       */
      function closeHostMenuForHover() {
        var row = hostMenu.trigger()
        if (row !== null && row.matches(':hover')) return
        var menu = hostMenu.findMenu()
        if (menu !== null && menu.matches(':hover')) return
        closeSurface()
      }

      /**
       * Bind the hover preference on the host's account row. The host renders
       * that row, so its listeners are bound in place and guarded per element:
       * a host re-render that replaces the row must not stack a second pair.
       */
      function bindHostRowHover(row) {
        if (row.__dshHostRowToken === hostRowBindingToken) return
        row.__dshHostRowToken = hostRowBindingToken
        row.addEventListener('mouseenter', function () {
          if (readPrefs().autoPopover !== AUTO_POPOVER_OFF) hostHoverIntent.scheduleOpen()
        })
        row.addEventListener('mouseleave', function () {
          if (readPrefs().autoPopover !== AUTO_POPOVER_OFF) hostHoverIntent.scheduleClose()
        })
        // The row's own click opens the menu too (autoPopover off, or a press
        // before the hover delay elapsed). A listener on the row runs in the
        // target phase, ahead of the host's own delegated onClick, so the armed
        // marker is in place before the host mounts the card.
        row.addEventListener('click', function () {
          armAccountMenu()
        })
      }

      /**
       * The host mounts and unmounts its menu around each open. Entering the
       * card cancels the row's pending close; leaving it schedules the close
       * that dismisses the menu.
       */
      function onHostMenuChanged(menu) {
        if (menu === null) {
          disarmAccountMenu()
          return
        }
        if (menu.__dshHostHoverBound) return
        menu.__dshHostHoverBound = true
        menu.addEventListener('mouseenter', function () {
          if (readPrefs().autoPopover !== AUTO_POPOVER_OFF) hostHoverIntent.cancel()
        })
        menu.addEventListener('mouseleave', function () {
          if (readPrefs().autoPopover !== AUTO_POPOVER_OFF) hostHoverIntent.scheduleClose()
        })
      }

      function onSurfaceMode(mode) {
        // The host's account row is the entry on that host, so the self-built
        // trigger and popover have no job there.
        if (mode === 'host') dropSynthetic()
      }

      /**
       * Hand the sidebar footer back to the host.
       *
       * The "Collapse the sidebar settings area" preference turns the whole
       * takeover off, so the skin's own nodes and injected container go and
       * every marker it put on the host's entries is removed — with the
       * stylesheet's takeover rules gated on the same attribute, the footer then
       * renders exactly as shipped.
       */
      function dropAccountFooter(footArea) {
        cancelClosePopover()
        hostHoverIntent.cancel()
        disarmAccountMenu()
        if (accountWidth !== 0) {
          accountWidth = 0
          document.body.style.removeProperty('--dsh-claude-account-width')
        }
        if (accountInsetLeft !== -1 || accountInsetRight !== -1) {
          accountInsetLeft = -1
          accountInsetRight = -1
          document.body.style.removeProperty('--dsh-claude-account-inset-left')
          document.body.style.removeProperty('--dsh-claude-account-inset-right')
        }
        dropSynthetic()
        // The menu marker goes with the takeover: an open host menu must not
        // keep the skin's card styling after the footer is handed back.
        surface.clearMenu()
        var injected = document.querySelectorAll('.dsh-claude-account-inject')
        for (var i = 0; i < injected.length; i++) {
          if (injected[i].parentElement) injected[i].parentElement.removeChild(injected[i])
        }
        var marked = document.querySelectorAll('[' + HOST_ROW_ATTR + ']')
        for (var m = 0; m < marked.length; m++) marked[m].removeAttribute(HOST_ROW_ATTR)
        if (footArea) mirror.clear(footArea)
      }

      /**
       * Measure the entry row and hand its box to the stylesheet.
       *
       * The host's account menu is portalled outside the sidebar, so it cannot
       * inherit the row's width: the card reads the measured width from
       * --dsh-claude-account-width. The self-built drawer is a child of the
       * footer instead, but the footer's padding box is wider than the row, so
       * its left and right are the measured distances from the footer's edges.
       * Every value is written only on a change.
       */
      function syncAccountRowBox(row, footArea) {
        if (row === null) return
        var rowRect = row.getBoundingClientRect()
        var rowWidth = Math.round(rowRect.width)
        if (rowWidth > 0 && rowWidth !== accountWidth) {
          accountWidth = rowWidth
          document.body.style.setProperty('--dsh-claude-account-width', rowWidth + 'px')
        }
        if (surface.mode() !== 'synthetic') return
        var footRect = footArea.getBoundingClientRect()
        var left = Math.round(rowRect.left - footRect.left)
        var right = Math.round(footRect.right - rowRect.right)
        if (left !== accountInsetLeft) {
          accountInsetLeft = left
          document.body.style.setProperty('--dsh-claude-account-inset-left', left + 'px')
        }
        if (right !== accountInsetRight) {
          accountInsetRight = right
          document.body.style.setProperty('--dsh-claude-account-inset-right', right + 'px')
        }
      }

      function syncAccountFooter() {
        var footArea = findFootArea()
        if (footArea === null) return

        if (!readPrefs().collapseFooter) {
          dropAccountFooter(footArea)
          return
        }
        surface.sync()
        if (surface.mode() === 'host') {
          dropSynthetic()
        } else {
          ensureSynthetic(footArea)
        }

        // The host's own account row is the entry on the host path: mark it so
        // the stylesheet can repaint it as a Claude row. It is left in the host's
        // DOM and flow, never moved or copied.
        var hostTrigger = hostMenu.trigger()
        if (hostTrigger !== null && !hostTrigger.hasAttribute(HOST_ROW_ATTR)) hostTrigger.setAttribute(HOST_ROW_ATTR, '')
        // The entry row — the host's own row, or the self-built button — is the
        // shape both cards have to match, so its box is measured here and handed
        // to the stylesheet. The hover preference is bound on the host's row in
        // the same pass, since the host renders that row itself.
        var entryRow = surface.mode() === 'host' ? hostTrigger : accountBtn
        syncAccountRowBox(entryRow, footArea)
        if (hostTrigger !== null) bindHostRowHover(hostTrigger)

        // The host's footer entries are hidden in place on every pass, drawer or
        // no drawer: the host re-renders them, and a pass that skipped this left
        // their icons painted beside the account row until the drawer had been
        // opened once. Only the mirroring needs a container to write into.
        mirror.sync(footArea)

        var root = surface.mode() === 'host' ? surface.container() : accountPopover
        if (root === null) return
        rows.syncHeader(root, hostTrigger)
        // The rail toggle (and any reflow) moves the anchor without a window
        // resize or a page scroll, so an open drawer re-resolves its position at
        // the end of its own pass.
        if (isPopoverOpen()) positionAccountPopover()
      }

      ui.footer = {
        sync: syncAccountFooter,
        /**
         * The self-built drawer's dismiss routes: 'outside' (a press the footer
         * does not own), 'escape' and 'composer'. The shipped scheduler only
         * closed an OPEN drawer on an outside press, so that reason keeps the
         * open check; Esc and composer focus close regardless. On the host path
         * the drawer is null, so this is a no-op and the host keeps its own
         * dismissal.
         */
        close: function (reason) {
          if (reason === 'outside' && !isPopoverOpen()) return
          closePopover()
        },
        openSettings: hostMenu.openSettings,
        /**
         * Ctrl+, opens settings. The scheduler's keydown handler owns the
         * unconditional preventDefault; this returns whether it acted, which the
         * scheduler does not gate on.
         */
        onKey: function (e) {
          if ((e.ctrlKey || e.metaKey) && e.key === ',') {
            hostMenu.openSettings()
            return true
          }
          return false
        },
        owns: function (target) {
          if (!target) return false
          if (accountBtn !== null && accountBtn.contains(target)) return true
          if (accountPopover !== null && accountPopover.contains(target)) return true
          var container = surface.container()
          return container !== null && container.contains(target)
        },
        isOpen: function () { return isPopoverOpen() },
        /** Re-anchor an open drawer after a viewport change; a closed one has
         * nothing to place. */
        reposition: function () {
          if (!isPopoverOpen()) return
          positionAccountPopover()
        }
      }
      return function () {
        profile.stop()
        unregisterPopover('account')
        dropAccountFooter(findFootArea())
      }
    }
