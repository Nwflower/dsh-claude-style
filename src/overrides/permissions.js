    function installPermissions(ctx, ui) {
      var segments = null
      var permContainer = null
      var permBtn = null
      var permLabel = null
      var permPopover = null
      var permHoverIntent = null
      /** The pick path the rows call back into; the rows are rebuilt, the path is not. */
      var permPick = null

      /**
       * The host's permission catalog: every preset this deployment offers, in
       * the host's order, or null before the first read settles. It is the
       * authority on what is switchable — a third-party plugin's preset rides
       * in it — while PERMISSION_PRESETS decides how a known one reads.
       */
      var catalogOptions = null
      /** The first catalog failure; thrown on the next sync to retire the feature. */
      var autoPresetError = null
      var catalogFiber = null
      var catalogChangedDisposer = null
      /** What the popover and the segment group currently render, so a change rebuilds them. */
      var renderedRows = ''
      var renderedRowsFor = null
      var renderedSegments = ''

      /** The catalog's entry for one preset, or null. */
      function catalogOption(preset) {
        if (catalogOptions === null) return null
        for (var i = 0; i < catalogOptions.length; i++) {
          var option = catalogOptions[i]
          if (option !== null && typeof option === 'object' && option.value === preset) return option
        }
        return null
      }

      /**
       * Whether the host offers a preset. Until the first read settles the
       * shipped built-ins stand in, which is what the control drew before the
       * catalog existed; a preset the catalog does not carry is not drawn at
       * all, so a deployment that configures fewer presets gets fewer rows
       * rather than dead ones.
       */
      function presetOffered(preset) {
        if (catalogOptions === null) return PERMISSION_SHIPPED_PRESETS.indexOf(preset) !== -1
        return catalogOption(preset) !== null
      }

      /** The name a preset reads as: the skin's table first, then the host's own name. */
      function presetLabel(preset) {
        var known = PERMISSION_PRESETS[preset]
        if (known !== undefined) return known.label
        var option = catalogOption(preset)
        if (option !== null && typeof option.name === 'string' && option.name !== '') return option.name
        var current = PERMISSION_CURRENT_LABELS[preset]
        return current === undefined ? preset : current
      }

      /** The one line under that name, from the same two sources. */
      function presetDesc(preset) {
        var known = PERMISSION_PRESETS[preset]
        if (known !== undefined) return known.desc
        var option = catalogOption(preset)
        return option !== null && typeof option.description === 'string' ? option.description : ''
      }

      /** Every preset the control offers, in the order its rows list them. */
      function offeredPresets() {
        var i
        if (catalogOptions === null) return PERMISSION_SHIPPED_PRESETS.slice()
        var offered = []
        for (i = 0; i < catalogOptions.length; i++) {
          var option = catalogOptions[i]
          if (option === null || typeof option !== 'object') continue
          if (typeof option.value !== 'string' || option.value === '') continue
          if (offered.indexOf(option.value) === -1) offered.push(option.value)
        }
        // The skin's order for the presets it knows; anything else the host
        // offers follows in the host's own order.
        var ordered = []
        for (i = 0; i < PERMISSION_ORDER.length; i++) {
          if (offered.indexOf(PERMISSION_ORDER[i]) !== -1) ordered.push(PERMISSION_ORDER[i])
        }
        for (i = 0; i < offered.length; i++) {
          if (ordered.indexOf(offered[i]) === -1) ordered.push(offered[i])
        }
        return ordered
      }

      /** The segments to draw: each slot bound to the first of its presets the host offers. */
      function resolvedSegments() {
        var out = []
        for (var i = 0; i < PERMISSION_SEGMENTS.length; i++) {
          var slot = PERMISSION_SEGMENTS[i]
          for (var j = 0; j < slot.presets.length; j++) {
            if (!presetOffered(slot.presets[j])) continue
            out.push({ label: slot.label, preset: slot.presets[j] })
            break
          }
        }
        return out
      }

      /**
       * Read the host's permission catalog into `catalogOptions`. The shipped
       * picker builds its rows from the same catalog, so it is the authority on
       * what is switchable — including presets a third-party plugin registered.
       * A rejected read retries like the account profile's reads (the client
       * connection may still be coming up at install); once the retries are
       * exhausted the failure is remembered and thrown on the next sync, which
       * retires this feature and hands the shipped access button back (D12).
       */
      var AUTO_PRESET_RETRY_MS = [1000, 5000]
      var autoPresetRetries = 0
      var autoPresetRead = 0
      var autoPresetRetry = null

      /** Invalidate the read in flight and drop any retry still waiting. */
      function dropAutoPresetRead() {
        autoPresetRead++
        if (autoPresetRetry !== null) {
          clearTimeout(autoPresetRetry)
          autoPresetRetry = null
        }
      }

      function probeAutoPreset() {
        var namespace = null
        try { namespace = ctx.get('remote.permissionPresets') } catch (error) { namespace = null }
        if (namespace === null || namespace === void 0 || typeof namespace.catalog !== 'function') {
          if (typeof ctx.inject !== 'function') {
            autoPresetError = new Error('permission: the host exposes no remote.permissionPresets catalog')
            ui.schedule()
          }
          return
        }
        dropAutoPresetRead()
        var read = autoPresetRead
        namespace.catalog().then(function (result) {
          if (read !== autoPresetRead) return
          if (result === null || typeof result !== 'object' || result.ok !== true ||
              result.value === null || typeof result.value !== 'object' ||
              !Array.isArray(result.value.options)) {
            autoPresetError = new Error('permission: unexpected permissionPresets catalog shape')
            ui.schedule()
            return
          }
          autoPresetRetries = 0
          autoPresetError = null
          // The whole option list is kept, not just whether one preset is in
          // it: the rows and the segments are built from what the host serves.
          catalogOptions = result.value.options.slice()
          ui.schedule()
        }, function () {
          if (read !== autoPresetRead) return
          if (autoPresetRetries >= AUTO_PRESET_RETRY_MS.length) {
            autoPresetError = new Error('permission: the permissionPresets catalog read failed ' + (AUTO_PRESET_RETRY_MS.length + 1) + ' times')
            ui.schedule()
            return
          }
          autoPresetRetry = setTimeout(function () {
            autoPresetRetry = null
            probeAutoPreset()
          }, AUTO_PRESET_RETRY_MS[autoPresetRetries++])
        })
      }

      /**
       * The namespace may register after this plugin (the host registers each
       * remote namespace as its package loads), so wait for it the way the
       * account row waits for remote.account; a host without inject gets one
       * read now. The catalog-changed event re-reads when the auto-review
       * integration is registered or dropped while the page stays open.
       */
      function startAutoPresetProbe() {
        if (typeof ctx.inject === 'function') {
          catalogFiber = ctx.inject(['remote.permissionPresets'], function (scope) {
            scope.effect(function () {
              probeAutoPreset()
              return function () {}
            }, 'dsh-claude-style: permission catalog')
          })
        } else {
          probeAutoPreset()
        }
        var remoteRoot = null
        try { remoteRoot = ctx.get('remote') } catch (error) { remoteRoot = null }
        if (remoteRoot !== null && remoteRoot !== void 0 && typeof remoteRoot.$on === 'function') {
          catalogChangedDisposer = remoteRoot.$on('permission-presets/catalog-changed', function () {
            probeAutoPreset()
          })
        }
      }

      /**
       * Build the segment group from the resolved slots. `specs` is what
       * resolvedSegments() returned, so a slot the host cannot serve is simply
       * absent instead of drawn dead.
       */
      function buildSegments(onPick, specs) {
        var group = document.createElement('div')
        group.className = SEGMENTS_CLASS
        group.setAttribute('role', 'radiogroup')
        group.setAttribute('aria-label', 'Permission')
        group.setAttribute('data-composer-segments', '')
        for (var i = 0; i < specs.length; i++) {
          var spec = specs[i]
          var item = document.createElement('button')
          item.type = 'button'
          item.className = SEGMENT_CLASS
          item.setAttribute('role', 'radio')
          item.setAttribute('data-preset', spec.preset)
          item.textContent = spec.label
          group.appendChild(item)
        }
        group.addEventListener('click', function (event) {
          var target = event.target
          var item = target !== null && typeof target.closest === 'function' ? target.closest('.' + SEGMENT_CLASS) : null
          if (item === null || !group.contains(item)) return
          onPick(item.getAttribute('data-preset'))
        })
        return group
      }

      var permDocPointerListener = null
      var permResizeListener = null
      /** The session-stats card (src/overrides/session-stats.js). */
      var stats = createSessionStats()

      /** Every dismiss route (item pick, outside pointer, resize/scroll, Escape) closes the menu through this one path. */
      function closePermMenu() {
        if (permBtn === null || permPopover === null) return
        permBtn.removeAttribute('data-open')
        permBtn.setAttribute('aria-expanded', 'false')
        permPopover.removeAttribute('data-open')
      }

      /**
       * One popover row for one preset: the name and the line under it from the
       * skin's table (the host's own copy for a preset the table does not know),
       * and the active check. No glyph: the tiers read as one list, and a
       * preset's own `icon` — which the host ignores natively — is left out so
       * the rows stay consistent with each other.
       */
      function buildPermRow(preset) {
        var item = document.createElement('button')
        item.type = 'button'
        item.className = 'dsh-claude-popover-item'
        item.setAttribute('role', 'menuitem')
        item.setAttribute('data-preset', preset)

        var col = document.createElement('div')
        col.style.cssText = 'display:flex; flex-direction:column; gap:2px; flex:1; text-align:left; min-width:0;'

        var itemTitle = document.createElement('span')
        itemTitle.style.cssText = 'font-weight:500; font-size:13px; line-height:16px;'
        itemTitle.textContent = presetLabel(preset)

        var itemDesc = document.createElement('span')
        itemDesc.style.cssText = 'font-size:11px; line-height:14px; color:var(--dsw-alias-label-tertiary);'
        itemDesc.textContent = presetDesc(preset)

        col.appendChild(itemTitle)
        col.appendChild(itemDesc)
        item.appendChild(col)

        var check = document.createElement('span')
        check.className = 'dsh-claude-perm-check'
        check.style.cssText = 'font-size:12px; color:var(--dsw-alias-brand-primary, #d97757); margin-left:8px; display:none;'
        check.textContent = '✓'
        item.appendChild(check)

        item.addEventListener('click', function (e) {
          e.stopPropagation()
          closePermMenu()
          if (permPick !== null) permPick(preset)
        })

        return item
      }

      /**
       * Rebuild the popover's rows when the set of offered presets changes.
       * Rows come from the host's catalog, so a preset a plugin registers while
       * the page stays open appears without a reload, and one it withdraws
       * disappears; an unchanged set leaves the DOM alone (the pass runs on
       * every mutation).
       *
       * The rendered signature is kept WITH the element it was rendered into: a
       * new popover starts empty (the hero view takes the old one out of the
       * tree), so a signature that merely matches the previous one must not
       * skip filling this one.
       */
      function syncPermRows() {
        if (permPopover === null) return
        var wanted = offeredPresets()
        var signature = wanted.join('|')
        if (signature === renderedRows && renderedRowsFor === permPopover) return
        renderedRows = signature
        renderedRowsFor = permPopover
        while (permPopover.firstChild !== null) permPopover.removeChild(permPopover.firstChild)
        for (var i = 0; i < wanted.length; i++) permPopover.appendChild(buildPermRow(wanted[i]))
      }

      registerPopover('permission', closePermMenu)

      function buildPermTriggerAndPopover(onPick) {
        permPick = onPick
        var container = document.createElement('div')
        container.className = 'dsh-claude-perm-container'

        var btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'dsh-claude-perm-btn'
        btn.setAttribute('aria-haspopup', 'menu')
        btn.setAttribute('aria-expanded', 'false')

        var label = document.createElement('span')
        label.className = 'dsh-claude-perm-label'
        label.textContent = 'Accept edits'

        var chevron = document.createElement('span')
        chevron.className = 'dsh-claude-perm-chevron'
        chevron.setAttribute('aria-hidden', 'true')

        btn.appendChild(label)
        btn.appendChild(chevron)

        var popover = document.createElement('div')
        popover.className = 'dsh-claude-perm-popover'
        popover.setAttribute('role', 'menu')

        function openPerm() {
          if (permHoverIntent) permHoverIntent.cancel()
          closeOtherPopovers('permission')
          var rect = btn.getBoundingClientRect()
          popover.style.left = Math.max(8, rect.left) + 'px'
          popover.style.bottom = Math.max(8, window.innerHeight - rect.top + 6) + 'px'
          btn.setAttribute('data-open', 'true')
          btn.setAttribute('aria-expanded', 'true')
          popover.setAttribute('data-open', 'true')
        }

        permHoverIntent = createHoverIntent(openPerm, closePermMenu, POPOVER_OPEN_DELAY, POPOVER_CLOSE_DELAY)

        btn.addEventListener('mouseenter', function () {
          if (readPrefs().autoPopover === AUTO_POPOVER_ALL) permHoverIntent.scheduleOpen()
        })
        btn.addEventListener('mouseleave', function () {
          if (readPrefs().autoPopover === AUTO_POPOVER_ALL) permHoverIntent.scheduleClose()
        })
        popover.addEventListener('mouseenter', function () {
          permHoverIntent.cancel()
        })
        popover.addEventListener('mouseleave', function () {
          permHoverIntent.scheduleClose()
        })

        btn.addEventListener('click', function (e) {
          e.stopPropagation()
          var isOpen = btn.getAttribute('data-open') === 'true'
          if (isOpen) {
            closePermMenu()
          } else {
            openPerm()
          }
        })

        if (!permDocPointerListener) {
          permDocPointerListener = function (e) {
            if (permPopover && permBtn && permPopover.getAttribute('data-open') === 'true') {
              if (!permBtn.contains(e.target) && !permPopover.contains(e.target)) closePermMenu()
            }
          }
          document.addEventListener('pointerdown', permDocPointerListener)
        }

        if (!permResizeListener) {
          permResizeListener = function () {
            if (permPopover && permBtn && permPopover.getAttribute('data-open') === 'true') closePermMenu()
          }
          window.addEventListener('resize', permResizeListener)
          window.addEventListener('scroll', permResizeListener, true)
        }

        container.appendChild(btn)
        // One popover per generation: a rebuild whose container a host
        // re-render dropped strands the previous popover in the document, so
        // installing this one sweeps every popover already there.
        removeStrayNodes(document, '.dsh-claude-perm-popover', [])
        document.body.appendChild(popover)

        return {
          container: container,
          btn: btn,
          label: label,
          popover: popover
        }
      }

      function updatePermState(preset) {
        if (!permLabel || !permPopover) return
        // The rows follow the host's catalog: one it does not serve is not
        // drawn at all, and one it starts serving appears.
        syncPermRows()
        // The running preset reads as its Claude-flavored name; a value no
        // preset carries (the host's `custom`) reads as the host's own word for
        // it rather than as the machine value.
        var matchedLabel = preset === null ? 'Accept edits' : presetLabel(preset)
        // Same-value guard: this runs on every pass, and an identical
        // textContent write still replaces the text node — a mutation that
        // schedules the next pass, so the page never went idle.
        if (permLabel.textContent !== matchedLabel) permLabel.textContent = matchedLabel

        var items = permPopover.querySelectorAll('[data-preset]')
        for (var j = 0; j < items.length; j++) {
          var it = items[j]
          var isCurrent = it.getAttribute('data-preset') === preset
          var check = it.querySelector('.dsh-claude-perm-check')
          if (check) {
            check.style.display = isCurrent ? 'inline' : 'none'
          }
          if (isCurrent) {
            it.setAttribute('data-active', '')
          } else {
            it.removeAttribute('data-active')
          }
        }
      }

      /**
       * The first failed switch request, thrown on the next sync so the feature
       * retires the way a failed catalog read does (D12): a control that cannot
       * switch must hand the shipped access button back, and the refusal must
       * not pass silently.
       */
      var submitError = null

      /**
       * Request the preset switch through the host's `/permission` command —
       * the same write the shipped picker's confirmation dialog ends in, minus
       * the dialog. The command validates the preset against the host's own
       * catalog, writes the sandbox mode and the approval policy, and appends
       * the preset event, so the next sync re-renders the control from the
       * projection alone.
       */
      function submitPreset(preset) {
        var session = currentSession(ctx)
        if (session === null) return
        var settled = session.command('/permission ' + preset)
        if (settled === void 0 || typeof settled.then !== 'function') return
        settled.then(function (result) {
          if (result === null || typeof result !== 'object' || result.ok !== true) {
            submitError = new Error('permission: the /permission ' + preset + ' command was refused')
          } else if (result.value === null || typeof result.value !== 'object' || result.value.matched !== true) {
            submitError = new Error('permission: the host offers no /permission command')
          } else {
            submitError = null
          }
          ui.schedule()
        }, function () {
          submitError = new Error('permission: the /permission ' + preset + ' command failed')
          ui.schedule()
        })
      }

      /**
       * Request the switch for every row, gated presets included: the host's
       * `/permission` command performs the switch itself, so no shipped menu
       * and no risk-confirmation dialog sit between the pick and the write.
       * A same-value pick writes nothing.
       */
      function pick(preset) {
        var session = currentSession(ctx)
        if (session === null || preset === null) return
        if (preset === currentPreset(session)) return
        submitPreset(preset)
      }

      // Re-insert when a re-render swapped the host row, then mirror the running preset.
      function syncSegments() {
        var isHero = ui.composer.isHero()
        var composerOn = ui.composer.isActive()

        var existingPermContainers = document.querySelectorAll('.dsh-claude-perm-container')
        var existingSegments = document.querySelectorAll('.' + SEGMENTS_CLASS + '[data-composer-segments]')

        if (!composerOn) {
          for (var ep = 0; ep < existingPermContainers.length; ep++) {
            existingPermContainers[ep].remove()
          }
          if (permPopover && permPopover.parentElement) {
            permPopover.parentElement.removeChild(permPopover)
          }
          permContainer = null
          permBtn = null
          permLabel = null
          permPopover = null

          for (var es0 = 0; es0 < existingSegments.length; es0++) {
            existingSegments[es0].remove()
          }
          segments = null
          return
        }

        var trigger = findAccessTrigger()
        if (trigger === null) return
        var host = trigger.parentElement
        if (host === null) return

        var session = currentSession(ctx)
        var preset = session === null ? null : currentPreset(session)

        if (isHero) {
          for (var i = 0; i < existingPermContainers.length; i++) {
            existingPermContainers[i].remove()
          }
          if (permPopover && permPopover.parentElement) {
            permPopover.parentElement.removeChild(permPopover)
          }
          permContainer = null
          permBtn = null
          permLabel = null
          permPopover = null

          // The slots follow the host's catalog: the deployment's own auto tier
          // takes the Auto slot when it is offered, and a slot with no offered
          // preset is not drawn. Rebuild when the binding changed; the shipped
          // group is reused otherwise, so a pass leaves the DOM alone.
          var segmentSpecs = resolvedSegments()
          var segmentSignature = segmentSpecs.map(function (spec) { return spec.label + '=' + spec.preset }).join('|')
          if (existingSegments.length > 1) {
            for (var s = 1; s < existingSegments.length; s++) existingSegments[s].remove()
          }
          if (segmentSignature === renderedSegments && existingSegments.length === 1 && host.contains(existingSegments[0])) {
            segments = existingSegments[0]
          } else {
            renderedSegments = segmentSignature
            for (var s2 = 0; s2 < existingSegments.length; s2++) existingSegments[s2].remove()
            segments = buildSegments(pick, segmentSpecs)
            host.insertBefore(segments, host.firstChild)
          }
          for (var j = 0; j < segments.children.length; j++) {
            var item = segments.children[j]
            if (item.getAttribute('data-preset') === preset) {
              item.setAttribute('data-active', '')
              item.setAttribute('aria-checked', 'true')
            } else {
              item.removeAttribute('data-active')
              item.setAttribute('aria-checked', 'false')
            }
          }
        } else {
          for (var es = 0; es < existingSegments.length; es++) {
            existingSegments[es].remove()
          }
          segments = null

          var allExisting = document.querySelectorAll('.dsh-claude-perm-container')
          if (allExisting.length > 0) {
            permContainer = allExisting[0]
            for (var p = 1; p < allExisting.length; p++) {
              allExisting[p].remove()
            }
            if (permContainer.parentElement !== host) {
              host.insertBefore(permContainer, host.firstChild)
            }
            permBtn = permContainer.querySelector('.dsh-claude-perm-btn')
            permLabel = permContainer.querySelector('.dsh-claude-perm-label')
            // The container can be adopted from a generation whose disposals a
            // client reload dropped; its popover is still in the document, and
            // without it updatePermState would early-return forever.
            if (permPopover === null) permPopover = document.querySelector('.dsh-claude-perm-popover')
          } else {
            var res = buildPermTriggerAndPopover(pick)
            permContainer = res.container
            permBtn = res.btn
            permLabel = res.label
            permPopover = res.popover
            host.insertBefore(permContainer, host.firstChild)
          }
          updatePermState(preset)
        }
      }

      ui.permissions = {
        sync: function () {
          if (autoPresetError !== null) throw autoPresetError
          if (submitError !== null) throw submitError
          stats.sync()
          syncSegments()
        },
        /**
         * Esc closes the menu; composer focus additionally closes the stats
         * card. There is deliberately no 'outside' route — the menu runs its
         * own document pointerdown listener (see buildPermTriggerAndPopover).
         */
        close: function (reason) {
          closePermMenu()
          if (reason === 'composer') stats.close()
        }
      }

      // The composer restyle hides the host's access button and statistics
      // dialogs only while this says their replacement is installed.
      document.body.setAttribute(PERMISSIONS_ATTR, '')
      startAutoPresetProbe()

      return function () {
        stats.teardown()
        unregisterPopover('permission')
        if (permHoverIntent) permHoverIntent.cancel()
        dropAutoPresetRead()
        if (catalogFiber !== null && typeof catalogFiber.dispose === 'function') {
          try { catalogFiber.dispose() } catch (error) { /* the fiber may already be gone */ }
          catalogFiber = null
        }
        if (catalogChangedDisposer !== null) {
          catalogChangedDisposer()
          catalogChangedDisposer = null
        }
        if (permDocPointerListener) {
          document.removeEventListener('pointerdown', permDocPointerListener)
          permDocPointerListener = null
        }
        if (permResizeListener) {
          window.removeEventListener('resize', permResizeListener)
          window.removeEventListener('scroll', permResizeListener, true)
          permResizeListener = null
        }
        removeStrayNodes(document, '.' + SEGMENTS_CLASS + '[data-composer-segments], .dsh-claude-perm-container, .dsh-claude-perm-popover', [])
        segments = null
        permPopover = null
        permBtn = null
        permLabel = null
        permContainer = null
        document.body.removeAttribute(PERMISSIONS_ATTR)
      }
    }
