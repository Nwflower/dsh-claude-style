    /**
     * The account rows: the header with the hold-screen easter egg, the
     * self-built trigger's picture, and the self-built path's settings row.
     *
     * The footer (account-footer.js) builds the containers and decides which
     * mount point is active (account/surface.js); this factory builds and syncs
     * the rows that go into them. `options.hostMenu` is the host's account menu
     * (account/host-menu.js) and `options.openBan()` what a press on the header
     * does; the nickname and the picture come from the identity chain
     * (src/context/host.js).
     */
    function createAccountRows(options) {
      var hostMenu = options.hostMenu

      /**
       * The profile picture's address, or null when there is none usable. It
       * comes from the account service or from the plugin's own HDSL route, so
       * only http(s) and that route are accepted, and it is set as a property —
       * never written into markup.
       */
      function accountPhotoUrl(raw) {
        if (raw === HDSL_SKIN_ROUTE) return raw
        if (typeof raw !== 'string' || raw === '') return null
        try {
          var url = new URL(raw, window.location.href)
          return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
        } catch (error) {
          return null
        }
      }

      /** The head's canvas, and what a pass needs to decide whether to keep it. */
      var headCanvas = null
      /** A load has been started; the route is read once per page, so is a failure. */
      var headRequested = false
      var headFailed = false

      /**
       * Draw the head out of a launcher skin, the way the launcher's own
       * account list draws it: the front face of the head texel block, inset by
       * 1/18 of the box, then the hat layer over the whole box. The atlas may
       * be stored at any integer multiple of 64 (the launcher normalizes to
       * 64×64 and keeps an already-larger import at its size), so every texel
       * block is measured by that multiple.
       *
       * @returns whether a head was drawn.
       */
      function drawLauncherHead(canvas, image) {
        var box = canvas.width
        var scale = image.naturalWidth / 64
        var context = canvas.getContext('2d')
        if (context === null || scale < 1 || scale !== Math.floor(scale)) return false
        var offset = Math.round(box / 18)
        context.clearRect(0, 0, box, box)
        // The face is a 8×8 texel block drawn inside the inset; the pixels are
        // already at the right size, so smoothing would only blur them.
        context.imageSmoothingEnabled = false
        context.drawImage(image, 8 * scale, 8 * scale, 8 * scale, 8 * scale, offset, offset, box - 2 * offset, box - 2 * offset)
        context.drawImage(image, 40 * scale, 8 * scale, 8 * scale, 8 * scale, 0, 0, box, box)
        return true
      }

      /**
       * Load the launcher's atlas once. The canvas is built off-screen: the
       * avatar element a pass hands in may be a different one by the time the
       * picture lands, and a failure only means the mark keeps the circle.
       */
      function loadLauncherHead() {
        headRequested = true
        var image = new Image()
        image.decoding = 'async'
        image.addEventListener('load', function () {
          if (image.naturalWidth !== image.naturalHeight || image.naturalWidth < 64) {
            headFailed = true
            wake()
            return
          }
          if (headCanvas === null) {
            headCanvas = document.createElement('canvas')
            headCanvas.className = 'dsh-claude-account-skin'
            headCanvas.width = 64
            headCanvas.height = 64
            headCanvas.setAttribute('aria-hidden', 'true')
          }
          if (!drawLauncherHead(headCanvas, image)) headFailed = true
          wake()
        })
        image.addEventListener('error', function () {
          headFailed = true
          wake()
        })
        image.src = HDSL_SKIN_ROUTE
      }

      /** Ask for the pass that mounts the head (the picture changes no DOM). */
      function wake() {
        if (typeof options.onChange === 'function') options.onChange()
      }

      /** Drop the account profile's photo, if one is mounted. */
      function clearAccountPhoto(avatarEl) {
        var photo = avatarEl.querySelector('.dsh-claude-account-photo')
        if (photo === null) return
        avatarEl.removeChild(photo)
        if (avatarEl.hasAttribute('data-dsh-claude-photo')) avatarEl.removeAttribute('data-dsh-claude-photo')
      }

      /** Take the head's canvas back out of a circle the photo path owns again. */
      function detachLauncherHead(avatarEl) {
        if (headCanvas !== null && headCanvas.parentElement === avatarEl) avatarEl.removeChild(headCanvas)
        if (avatarEl.hasAttribute('data-dsh-claude-skin')) avatarEl.removeAttribute('data-dsh-claude-skin')
      }

      /**
       * Paint the player's own head. What the launcher serves is the normalized
       * skin atlas — a sheet of body parts, not a face — so it is cropped into
       * a canvas and never handed to the `<img>` the photo path uses. Until the
       * head is drawn, and when it cannot be, the mark keeps the circle.
       */
      function syncLauncherHead(avatarEl) {
        if (!headRequested) loadLauncherHead()
        if (headCanvas === null || headFailed) return
        if (headCanvas.parentElement !== avatarEl) {
          if (headCanvas.parentElement !== null) headCanvas.parentElement.removeChild(headCanvas)
          avatarEl.appendChild(headCanvas)
        }
        if (!avatarEl.hasAttribute('data-dsh-claude-skin')) avatarEl.setAttribute('data-dsh-claude-skin', '')
      }

      /**
       * Paint (or clear) the picture inside the avatar circle. The address comes
       * from the identity chain (src/context/host.js): the account's own avatar,
       * then the HDSL launcher's (drawn as a cropped head), then nothing — and
       * the brand mark the stylesheet draws shows through. The account's avatar
       * is a real `<img>` layered over that
       * mark rather than a CSS background: the host's own avatar `<img>` carries
       * `referrerPolicy="no-referrer"`, which is what the picture host expects,
       * and a background cannot drop the referrer. A picture that fails to load
       * hides itself, so the mark underneath shows instead of an empty circle.
       */
      function syncAccountAvatar(avatarEl) {
        if (avatarEl === null) return
        var src = accountPhotoUrl(resolveAvatarUrl())
        if (src === HDSL_SKIN_ROUTE) {
          // The launcher's picture only ever shows as the cropped head.
          clearAccountPhoto(avatarEl)
          syncLauncherHead(avatarEl)
          return
        }
        detachLauncherHead(avatarEl)
        var photo = avatarEl.querySelector('.dsh-claude-account-photo')
        if (src === null) {
          clearAccountPhoto(avatarEl)
          return
        }
        if (photo === null) {
          photo = document.createElement('img')
          photo.className = 'dsh-claude-account-photo'
          photo.alt = ''
          photo.decoding = 'async'
          photo.draggable = false
          photo.referrerPolicy = 'no-referrer'
          photo.addEventListener('load', function () { photo.hidden = false })
          photo.addEventListener('error', function () { photo.hidden = true })
          avatarEl.appendChild(photo)
        }
        if (photo.getAttribute('src') !== src) photo.src = src
        if (!avatarEl.hasAttribute('data-dsh-claude-photo')) avatarEl.setAttribute('data-dsh-claude-photo', '')
      }

      /**
       * The account header: the nickname and the hold-screen easter egg's entry.
       * It is the first row of whichever container is active — the injected
       * container on the host path, the popover's own header on the self-built
       * one. The header is only a WRAPPER: the clickable strip is the inner row,
       * so the hover plate covers the name and not the divider that follows it.
       */
      function buildAccountHeader(username) {
        var header = document.createElement('div')
        header.className = 'dsh-claude-account-popover-header'
        header.setAttribute('data-dsh-claude-ban-row', '')

        var rowEl = document.createElement('div')
        rowEl.className = 'dsh-claude-account-popover-row'
        rowEl.setAttribute('role', 'button')
        rowEl.setAttribute('tabindex', '0')
        rowEl.setAttribute('aria-haspopup', 'dialog')

        var nameEl = document.createElement('div')
        nameEl.className = 'dsh-claude-account-popover-name'
        nameEl.textContent = username

        var divider = document.createElement('div')
        divider.className = 'dsh-claude-account-popover-divider'

        rowEl.appendChild(nameEl)
        header.appendChild(rowEl)
        header.appendChild(divider)
        return header
      }

      /**
       * The nickname the header shows: the identity chain first (a custom
       * nickname, the account's own name, HDSL, the OS-user probe), then the
       * host's own rendered label when the chain resolved nothing — on the host
       * path that label is the host's own account name, so a host whose profile
       * read failed still shows what it renders.
       */
      function accountDisplayName(hostRow) {
        var resolved = resolveDisplayName()
        if (resolved) return resolved
        if (hostRow !== null) {
          var label = (hostRow.textContent || '').trim()
          if (label) return label
        }
        return 'User'
      }

      /**
       * Sync the header of the active container: the nickname and the easter
       * egg's binding. Bound OUTSIDE the build branch so the pass that creates
       * the container already wires the row; `__dshBanBound` keeps a later pass
       * from binding it twice, which would open the overlay twice per click.
       */
      function syncAccountHeader(root, hostRow) {
        if (root === null) return
        var nameEl = root.querySelector('.dsh-claude-account-popover-name')
        var username = accountDisplayName(hostRow)
        if (nameEl && nameEl.textContent !== username) nameEl.textContent = username
        var banRow = root.querySelector('[data-dsh-claude-ban-row]')
        if (banRow && !banRow.__dshBanBound) {
          banRow.__dshBanBound = true
          banRow.addEventListener('click', function (e) {
            // The row's gesture is the easter egg, not a menu selection.
            e.preventDefault()
            e.stopPropagation()
            options.openBan()
          })
          banRow.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return
            e.preventDefault()
            e.stopPropagation()
            options.openBan()
          })
        }
      }

      /** The container injected at the head of the host's account menu. */
      function buildHostContainer() {
        var container = document.createElement('div')
        container.className = 'dsh-claude-account-inject'
        container.appendChild(buildAccountHeader(accountDisplayName(hostMenu.trigger())))
        return container
      }

      /** The settings row, needed on the self-built path only. */
      function buildSettingsItem() {
        var item = document.createElement('button')
        item.type = 'button'
        item.className = 'dsh-claude-popover-item'
        item.setAttribute('data-action', 'settings')
        item.innerHTML =
          '<span class="dsh-claude-popover-item-icon">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
              '<circle cx="12" cy="12" r="3"></circle>' +
              '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>' +
            '</svg>' +
          '</span>' +
          '<span class="dsh-claude-popover-item-text"></span>'
        item.addEventListener('click', function (e) {
          e.stopPropagation()
          hostMenu.openSettings()
        })
        return item
      }

      /**
       * The settings row names and opens whatever the host's settings entry is:
       * its settings button, or the 设置 item of its account menu. The
       * self-built path is used exactly when the host has no account area, so
       * there is no host copy of this row to step aside for.
       */
      function syncSettingsItem(settingsItem) {
        if (settingsItem === null) return
        var labelText = '设置'
        var trigger = hostMenu.settingsTrigger()
        if (trigger) {
          var txt = (trigger.textContent || '').trim()
          if (!txt) txt = trigger.getAttribute('aria-label') || ''
          if (txt) labelText = txt
        }
        var txtEl = settingsItem.querySelector('.dsh-claude-popover-item-text')
        if (txtEl && txtEl.textContent !== labelText) txtEl.textContent = labelText
      }

      return {
        syncAvatar: syncAccountAvatar,
        buildHeader: buildAccountHeader,
        syncHeader: syncAccountHeader,
        buildHostContainer: buildHostContainer,
        buildSettingsItem: buildSettingsItem,
        syncSettingsItem: syncSettingsItem
      }
    }
