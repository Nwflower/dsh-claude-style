    // --- Footer action redirection helpers ---
    function createFooterMirror(options) {
      /**
       * The `sidebar.footer.action` list slot accepts arbitrary plugin
       * controls, not just buttons: a plugin may render a composite widget
       * (toggles, selects, status chips) straight into the sidebar footer.
       * Redirection therefore works on ENTRIES (direct children of
       * footerActions), not on `querySelectorAll('button')`:
       *   - every entry is marked `data-dsh-claude-footer-entry` (CSS
       *     collapses its box so nothing paints in the sidebar);
       *   - entries without a floating overlay are hidden wholesale via
       *     `data-dsh-claude-footer-hidden`;
       *   - entries hosting an overlay — a fixed-position panel (the cordis
       *     inventory panel) or a dialog/menu/listbox — stay visible, but
       *     every branch of their subtree that does not lead to the overlay
       *     is hidden, so only the overlay itself can surface.
       * Returns the live entry list for popover mirroring.
       */
      function syncFooterActionVisibility(footerActions) {
        if (!footerActions) return []
        var entries = footerEntriesOf(footerActions)
        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i]
          entry.setAttribute('data-dsh-claude-footer-entry', '')
          var all = entry.querySelectorAll('*')
          for (var j = 0; j < all.length; j++) {
            var el = all[j]
            if (el.hasAttribute('data-dsh-claude-footer-overlay')) continue
            var role = el.getAttribute('role') || ''
            var overlay = role === 'dialog' || role === 'menu' || role === 'listbox'
            if (!overlay) {
              try { overlay = window.getComputedStyle(el).position === 'fixed' } catch (e) { overlay = false }
            }
            if (overlay) el.setAttribute('data-dsh-claude-footer-overlay', '')
          }
          markFooterHiddenBranches(entry)
        }
        return entries
      }

      /**
       * Mirrorable footer units. Every slot outlet renders inside a
       * `div[data-slot]` anchor with `display:contents`, so a list slot's
       * entries are the ANCHOR's children, not footerActions' — reading
       * `footerActions.children` directly collapses every registrant into a
       * single mirrorable unit and drops all but the first from the popover.
       * Dead cells (`data-slot-error`) never mirror.
       */
      function footerEntriesOf(footerActions) {
        var entries = []
        var kids = footerActions.children
        for (var i = 0; i < kids.length; i++) {
          var kid = kids[i]
          if (kid.hasAttribute('data-slot-error')) continue
          if (kid.hasAttribute('data-slot')) {
            var slotKids = kid.children
            for (var j = 0; j < slotKids.length; j++) {
              if (!slotKids[j].hasAttribute('data-slot-error')) entries.push(slotKids[j])
            }
          } else {
            entries.push(kid)
          }
        }
        return entries
      }

      /** Hide every branch of `el`'s subtree that does not carry an overlay. */
      function markFooterHiddenBranches(el) {
        if (el.hasAttribute('data-dsh-claude-footer-overlay')) {
          el.removeAttribute('data-dsh-claude-footer-hidden')
          return
        }
        if (el.querySelector('[data-dsh-claude-footer-overlay]') !== null) {
          el.removeAttribute('data-dsh-claude-footer-hidden')
          var kids = el.children
          for (var i = 0; i < kids.length; i++) markFooterHiddenBranches(kids[i])
          return
        }
        el.setAttribute('data-dsh-claude-footer-hidden', '')
      }

      /**
       * Bring one mirrored text item in line with the entry behind its index.
       * The label and badge are the plugin's own strings, so they are written as
       * text; the icon is a copy of the plugin's node rather than re-parsed
       * markup, and is replaced only when the source's markup changed.
       */
      function syncMirrorItem(item, iconEl, text, badge) {
        var iconBox = item.querySelector('.dsh-claude-popover-item-icon')
        var iconHtml = iconEl ? iconEl.outerHTML : ''
        if (iconBox !== null && iconBox.__dshIconHtml !== iconHtml) {
          iconBox.__dshIconHtml = iconHtml
          while (iconBox.firstChild) iconBox.removeChild(iconBox.firstChild)
          if (iconEl) iconBox.appendChild(iconEl.cloneNode(true))
        }
        var textBox = item.querySelector('.dsh-claude-popover-item-text')
        if (textBox !== null && textBox.textContent !== text) textBox.textContent = text
        var badgeBox = item.querySelector('.dsh-claude-popover-item-badge')
        if (badge) {
          if (badgeBox === null) {
            badgeBox = document.createElement('span')
            badgeBox.className = 'dsh-claude-popover-item-badge'
            item.appendChild(badgeBox)
          }
          if (badgeBox.textContent !== badge) badgeBox.textContent = badge
        } else if (badgeBox !== null) {
          item.removeChild(badgeBox)
        }
      }

      /** Remove the mirrored text item for one entry index, if present. */
      function removeActionMirror(idx) {
        var item = options.body().querySelector('[data-action-index="' + idx + '"]')
        if (item && item.parentElement) item.parentElement.removeChild(item)
      }

      /** Remove the embedded widget clone for one entry index, if present. */
      function removeEmbedMirror(idx) {
        var embed = options.body().querySelector('[data-embed-index="' + idx + '"]')
        if (embed && embed.parentElement) embed.parentElement.removeChild(embed)
      }

      /**
       * Whether an entry reads as a plain ACTION (mirror it as a text menu
       * item) or as a rich WIDGET (embed a live clone). A text item is only
       * faithful when the trigger accounts for essentially all of the
       * entry's visible content: a clickable progress-bar stack (cost-meter
       * balance) would otherwise shrink to one label and lose its bars.
       * Overlay text is excluded so an open cordis panel does not flip its
       * own entry into a widget.
       */
      function entryIsActionLike(entry, trigger) {
        if (trigger === null) return false
        if (trigger === entry) {
          // Only genuinely interactive ROOTS count as actions; a clickable
          // container (a region or tabindex wrapper) is still a widget.
          var tag = entry.tagName
          var role = entry.getAttribute('role') || ''
          return tag === 'BUTTON' || tag === 'A' || role === 'button'
        }
        // Semantic meter markup is always a widget, however small.
        if (entry.querySelector('[role="progressbar"], [role="meter"], meter, progress') !== null) return false
        var entryText = textExcludingOverlays(entry)
        var triggerText = (trigger.textContent || '').trim()
        // Tight slack: the trigger must account for essentially all of the
        // entry's visible text. A balance box reading "余额¥10.07" beside an
        // icon-only trigger already exceeds it — and its bar must survive.
        return entryText.length - triggerText.length <= 2
      }

      /** Visible text of an entry, skipping overlay subtrees. */
      function textExcludingOverlays(entry) {
        var text = ''
        var walker = document.createTreeWalker(entry, 4 /* SHOW_TEXT */, {
          acceptNode: function (node) {
            var p = node.parentElement
            while (p && p !== entry) {
              if (p.hasAttribute('data-dsh-claude-footer-overlay')) return 2 // REJECT
              p = p.parentElement
            }
            return 1 // ACCEPT
          }
        })
        while (walker.nextNode()) text += walker.currentNode.nodeValue
        return text.trim()
      }

      /**
       * Embed a live clone of a display-only footer entry (a progress bar
       * reads as nothing as a text menu item — the cost-meter balance/quota
       * stack is the known case). The clone is replaced only when the
       * source's markup changes, so it tracks the plugin's re-renders without
       * churning the popover DOM. Skin marker attributes, ids, and overlay
       * subtrees are stripped from the copy: it must never be re-hidden by
       * the footArea hiding rule, double-register an id, or duplicate an
       * open panel next to the real one. Event listeners do not survive
       * cloning, so the embed forwards clicks back into the live entry —
       * path-mapped to the clicked sub-control (see resolveEmbedActivator) —
       * and deliberately leaves the popover open so the widget's response
       * stays visible; it still closes on pointer-leave as usual. The embed
       * is marked `data-clickable` for the cursor when the entry has a
       * trigger at all.
       */
      function syncEmbedMirror(entry, idx, forward) {
        var embed = options.body().querySelector('[data-embed-index="' + idx + '"]')
        if (!embed) {
          embed = document.createElement('div')
          embed.className = 'dsh-claude-popover-embed'
          embed.setAttribute('data-embed-index', idx)
          embed.addEventListener('click', function (e) {
            if (!embed.__dshEntry) return
            e.stopPropagation()
            var activator = resolveEmbedActivator(e.target, embed)
            if (activator) activator.click()
          })
          options.body().insertBefore(embed, options.anchor())
        }
        embed.__dshEntry = entry
        embed.__dshForward = forward || null
        if (forward) {
          embed.setAttribute('data-clickable', '')
        } else {
          embed.removeAttribute('data-clickable')
        }
        var clone = entry.cloneNode(true)
        clone.removeAttribute('id')
        clone.removeAttribute('data-dsh-claude-footer-entry')
        clone.removeAttribute('data-dsh-claude-footer-hidden')
        clone.removeAttribute('data-dsh-claude-footer-overlay')
        var overlays = clone.querySelectorAll('[data-dsh-claude-footer-overlay]')
        for (var o = 0; o < overlays.length; o++) {
          overlays[o].parentElement.removeChild(overlays[o])
        }
        var stripped = clone.querySelectorAll('[id], [data-dsh-claude-footer-hidden]')
        for (var s = 0; s < stripped.length; s++) {
          stripped[s].removeAttribute('id')
          stripped[s].removeAttribute('data-dsh-claude-footer-hidden')
        }
        var html = clone.outerHTML
        if (embed.getAttribute('data-embed-html') !== html) {
          embed.setAttribute('data-embed-html', html)
          while (embed.firstChild) embed.removeChild(embed.firstChild)
          embed.appendChild(clone)
        }
      }

      var INTERACTIVE_SELECTOR = 'button, [role="button"], a[href], [tabindex], input, select, summary'

      /**
       * Map a click inside the embedded clone back to the matching control
       * of the live entry. Forwarding every embed click to the entry's FIRST
       * trigger misfires for multi-control widgets (the cost-meter stack
       * carries refresh / collapse / tab buttons): the user clicks the
       * balance box but the first button in tree order fires. The clone
       * preserves the entry's tree shape, so the clicked node's child-index
       * path replays onto the original (tag-checked per level — overlay
       * stripping can shift siblings); the nearest interactive element at or
       * above the mapped node wins, and any mismatch falls back to the
       * entry's primary trigger.
       */
      function resolveEmbedActivator(clicked, embed) {
        var entry = embed.__dshEntry
        var cloneRoot = embed.firstChild
        if (!entry || !cloneRoot || !clicked || clicked.nodeType !== 1) return embed.__dshForward
        if (clicked === embed || clicked === cloneRoot) return embed.__dshForward
        // Child-index path from the clicked clone node up to the clone root.
        var path = []
        var node = clicked
        while (node && node !== cloneRoot) {
          var parent = node.parentElement
          if (!parent) return embed.__dshForward
          path.unshift(Array.prototype.indexOf.call(parent.children, node))
          node = parent
        }
        // Replay the path on the live entry, verifying shape level by level.
        var original = entry
        var cloneNode = cloneRoot
        for (var i = 0; i < path.length; i++) {
          var nextClone = cloneNode.children[path[i]]
          var nextOrig = original.children[path[i]]
          if (!nextClone || !nextOrig || nextClone.tagName !== nextOrig.tagName) {
            return embed.__dshForward
          }
          cloneNode = nextClone
          original = nextOrig
        }
        // Nearest interactive element at or above the mapped original,
        // bounded by the entry and never inside an overlay subtree.
        var target = original
        while (target) {
          if (target !== entry && target.matches && target.matches(INTERACTIVE_SELECTOR) &&
              !hasOverlayAncestor(target, entry)) {
            return target
          }
          if (target === entry) break
          target = target.parentElement
        }
        return embed.__dshForward
      }

      /** Whether `el` sits inside an overlay-marked subtree above `entry`. */
      function hasOverlayAncestor(el, entry) {
        var node = el
        while (node && node !== entry) {
          if (node.hasAttribute && node.hasAttribute('data-dsh-claude-footer-overlay')) return true
          node = node.parentElement
        }
        return false
      }

      /**
       * First interactive element of a footer entry that is not part of an
       * overlay subtree (an open panel may render action buttons of its own,
       * and those must never become the popover item's activation target).
       */
      function findFooterTrigger(entry) {
        var selector = INTERACTIVE_SELECTOR
        if (entry.matches && entry.matches(selector) &&
            !entry.hasAttribute('data-dsh-claude-footer-overlay')) {
          return entry
        }
        var found = entry.querySelectorAll(selector)
        for (var i = 0; i < found.length; i++) {
          var candidate = found[i]
          var node = candidate
          var insideOverlay = false
          while (node && node !== entry) {
            if (node.hasAttribute && node.hasAttribute('data-dsh-claude-footer-overlay')) {
              insideOverlay = true
              break
            }
            node = node.parentElement
          }
          if (!insideOverlay) return candidate
        }
        return null
      }

      function sync(footArea) {
        var footerActions = footArea.querySelector('[class*="footerActions"]')
        var footerEntries = syncFooterActionVisibility(footerActions)
        var body = options.body()

        // A closed host drawer has no container to mirror into, but the entries
        // above are hidden in place all the same: the host re-renders them, and a
        // pass that skips this leaves their icons painted in the sidebar until the
        // drawer is opened once.
        if (body === null) return

        // While the popover is open, its mirrors must stay completely static:
        // a content rewrite, reorder, or embedded-clone replacement under the
        // pointer cancels the browser's :hover state and can swallow the click
        // between pointerdown and pointerup. Sync runs only while closed;
        // openPopover runs one final pass right before the reveal — and the
        // sidebar-side redirection above stays live, so a newly mounted entry
        // keeps being hidden even with the popover open.
        if (options.isOpen()) return

        var existingActionItems = body.querySelectorAll('[data-action-index], [data-embed-index]')
        for (var ea = 0; ea < existingActionItems.length; ea++) {
          var staleIdx = parseInt(existingActionItems[ea].getAttribute('data-action-index') || existingActionItems[ea].getAttribute('data-embed-index'), 10)
          if (isNaN(staleIdx) || staleIdx >= footerEntries.length) {
            existingActionItems[ea].parentElement.removeChild(existingActionItems[ea])
          }
        }

        for (var f = 0; f < footerEntries.length; f++) {
          try {
            (function (entry, idx) {
            // The host's account area also lives in the footer, and its logout
            // button used to be mirrored into the drawer's header (the stray [→]
            // icon above the account name). Skip anything that is a menu anchor or
            // contains one, and anything that reads as sign-out.
            if (entry.getAttribute('aria-haspopup') === 'menu') return
            if (entry.querySelector('[aria-haspopup="menu"]') !== null) return
            if (/退出|登出|注销|sign ?out|log ?out/i.test(entry.textContent || '')) return
            // The host's sign-out row is ICON-ONLY, so its text says nothing. Read
            // the label/title/class, and skip anything living in the host's account
            // area — that is where the stray [→] in the drawer header came from.
            var entryLabel = (entry.getAttribute('aria-label') || '') + ' ' + (entry.getAttribute('title') || '') + ' ' + String(entry.className || '')
            if (/退出|登出|注销|sign ?out|log ?out|logout/i.test(entryLabel)) return
            if (typeof entry.closest === 'function' && entry.closest('[class*="account"]') !== null) return
            var trigger = findFooterTrigger(entry)
            var hasContent = (entry.textContent || '').trim() !== '' ||
                             entry.querySelector('svg, img, canvas') !== null

            // Rich widgets (progress bars, stat panels) cannot collapse into
            // a text menu item — embed a live clone instead, forwarding
            // clicks to the entry's trigger when it has one (the cost-meter
            // balance stack is itself clickable).
            if (!entryIsActionLike(entry, trigger)) {
              removeActionMirror(idx)
              if (hasContent) {
                syncEmbedMirror(entry, idx, trigger)
              } else {
                removeEmbedMirror(idx)
              }
              return
            }
            removeEmbedMirror(idx)

            // The mirrored item activates the first interactive element
            // outside any overlay.
            var activator = trigger
            var item = body.querySelector('[data-action-index="' + idx + '"]')
            var iconEl = (trigger && trigger.querySelector('svg')) || entry.querySelector('svg')
            var text = activator.getAttribute('aria-label') || (activator.textContent || '').trim() || '插件'
            var badge = activator.getAttribute('data-cordis-badge') || entry.getAttribute('data-cordis-badge') || ''

            if (!item) {
              item = document.createElement('button')
              item.type = 'button'
              item.className = 'dsh-claude-popover-item'
              item.setAttribute('data-action-index', idx)
              item.innerHTML =
                '<span class="dsh-claude-popover-item-icon"></span>' +
                '<span class="dsh-claude-popover-item-text"></span>'

              item.addEventListener('click', function (e) {
                e.stopPropagation()
                options.close()
                // The activator is rebound on every (closed-state) sync pass
                // (`item.__dshActivator`), never captured at creation — the
                // host re-sorts list slots by `order` on each render, so the
                // entry behind an index changes over time.
                var live = item.__dshActivator
                if (!live || typeof live.click !== 'function') {
                  // Safety net: re-resolve the current trigger for this index
                  // from the live footer DOM. Covers the rare case where the
                  // stored node was detached by a host re-render while the
                  // popover was open.
                  try {
                    var fa = findFootArea()
                    var actions = fa ? fa.querySelector('[class*="footerActions"]') : null
                    var liveEntries = actions ? footerEntriesOf(actions) : []
                    var liveEntry = liveEntries[idx] || null
                    live = liveEntry ? findFooterTrigger(liveEntry) : null
                  } catch (error) {
                    live = null
                  }
                }
                if (live && typeof live.click === 'function') live.click()
              })
              body.insertBefore(item, options.anchor())
            }
            // Entries are reused by index: the host re-sorts list slots by
            // `order` on every render, so a re-sort can seat a different
            // plugin under an existing item — icon, text, badge AND the
            // click target must all re-sync, or the label shows one entry
            // while the click fires the previous occupant's trigger.
            syncMirrorItem(item, iconEl, text, badge)
            // Rebind the click target to the entry currently behind this
            // index. Done on every pass, for new and reused items alike.
            item.__dshActivator = activator
            })(footerEntries[f], f)
          } catch (err) {
            // A single broken entry must not abort the rest of the mirror
            // sync (which would leave later items without a rebound
            // activator or un-ordered).
          }
        }

        // The host re-sorts list-slot outlets by `order` on every render
        // (stable, ties keep registration order), and plugins mount
        // progressively at startup — so the mirror nodes must track the live
        // footer order on every pass: a later re-sort would otherwise leave
        // the popover frozen in a stale order that no longer matches the
        // real controls. Re-append action items and embedded widgets in
        // entry-index order.
        var mirrors = []
        for (var mi = 0; mi < body.children.length; mi++) {
          var mirrorNode = body.children[mi]
          if (mirrorNode === options.anchor()) continue
          if (mirrorNode.hasAttribute('data-action-index') || mirrorNode.hasAttribute('data-embed-index')) {
            mirrors.push(mirrorNode)
          }
        }
        mirrors.sort(function (a, b) {
          var ai = parseInt(a.getAttribute('data-action-index') || a.getAttribute('data-embed-index'), 10) || 0
          var bi = parseInt(b.getAttribute('data-action-index') || b.getAttribute('data-embed-index'), 10) || 0
          return ai - bi
        })
        // Walk back from the settings row and move a mirror only when it is out
        // of place. Inserting front to back before the settings row moved every
        // mirror on every pass once there were two (each insert lands after the
        // ones already placed), and each move is a mutation that schedules the
        // next pass — the scheduler never went idle.
        var nextMirror = options.anchor()
        for (var mr = mirrors.length - 1; mr >= 0; mr--) {
          if (mirrors[mr].nextSibling !== nextMirror) body.insertBefore(mirrors[mr], nextMirror)
          nextMirror = mirrors[mr]
        }
      }

      /** Drop every takeover marker from the host's footer entries. */
      function clear(footArea) {
        var marked = footArea.querySelectorAll(
          '[data-dsh-claude-footer-entry], [data-dsh-claude-footer-hidden], [data-dsh-claude-footer-overlay]',
        )
        for (var i = 0; i < marked.length; i++) {
          marked[i].removeAttribute('data-dsh-claude-footer-entry')
          marked[i].removeAttribute('data-dsh-claude-footer-hidden')
          marked[i].removeAttribute('data-dsh-claude-footer-overlay')
        }
      }

      return { sync: sync, clear: clear }
    }
