    /**
     * The reasoning-effort picker: its own seat trigger and its own card.
     *
     * The model card used to carry the effort slider in its footer, so picking a
     * model and picking how hard it thinks were the same gesture. They are two
     * decisions with two different cadences — the model changes rarely, the level
     * is nudged often — so the level now owns a trigger of its own beside the
     * model's, and a card of its own. The model card keeps only the model list
     * and the More-models row.
     *
     * Everything else follows the model picker's discipline: the trigger is
     * created once and reused, the card is a fixed-position sibling on <body>,
     * hover opens it under the "all" scope and click does so otherwise, and the
     * slider element is NEVER detached once built — re-inserting it restarts its
     * CSS animations (the name's blur-in, the apex matrix's entrance sweep),
     * which is exactly the flicker the model footer used to cause on every host
     * round-trip.
     *
     * @param ctx - the plugin context (unused; kept for the installer shape).
     * @param ui - the shared UI registry. `ui.model` provides the seat element
     *   (`seat()`), the model trigger (`trigger()`), the catalog's state
     *   (`effort()`, `named()`, `settled()`), the commit call (`pickEffort()`)
     *   and `close()`.
     * @returns a teardown function.
     */
    function installEffortPicker(ctx, ui) {
      var effortBtn = null
      var effortPop = null
      var effortSlider = null
      /**
       * The last ladder the seat named. A selection makes the host re-enumerate
       * the whole directory for seconds, and the snapshot can go blank in that
       * window — the trigger must not vanish and the knob must not fall into its
       * empty state just because the answer is in flight. Only a SETTLED seat
       * that names no ladder takes the trigger away.
       */
      var lastEffort = null
      var effortHoverIntent = createHoverIntent(
        function () { openEffortPopover() },
        function () { closeEffortPopover() },
        POPOVER_OPEN_DELAY,
        POPOVER_CLOSE_DELAY
      )

      /** What the catalog currently says about the seat's ladder. */
      function effortInfo() {
        return ui.model && typeof ui.model.effort === 'function' ? ui.model.effort() : null
      }

      /** True while the catalog cannot name the seat (a selection in flight). */
      function seatInFlight() {
        return !!(ui.model && typeof ui.model.settled === 'function' && !ui.model.settled())
      }

      /**
       * The ladder to draw: the catalog's when it has one, otherwise the last one
       * it named — but only while the seat is in flight. A settled seat with no
       * ladder returns null, which is the control's empty state.
       */
      function readEffort() {
        var info = effortInfo()
        if (info !== null) {
          lastEffort = info
          return info
        }
        return seatInFlight() ? lastEffort : null
      }

      /** The host slot the seat lives in (owned by the model picker). */
      function seat() {
        return ui.model && typeof ui.model.seat === 'function' ? ui.model.seat() : null
      }

      /** The model trigger this one sits beside (owned by the model picker), or null. */
      function modelTrigger() {
        return ui.model && typeof ui.model.trigger === 'function' ? ui.model.trigger() : null
      }

      /**
       * Hand back the room this trigger reserves on the model trigger's right
       * edge (see positionEffortTrigger), or the gap outlives the trigger.
       */
      function releaseModelMargin() {
        var modelBtn = modelTrigger()
        if (modelBtn !== null && modelBtn.style.marginRight !== '') modelBtn.style.marginRight = ''
      }

      function cancelCloseEffort() {
        effortHoverIntent.cancel()
      }

      function closeEffortPopover() {
        effortHoverIntent.cancel()
        if (effortPop !== null) effortPop.setAttribute('data-open', 'false')
      }

      function openEffortPopover() {
        effortHoverIntent.cancel()
        ensureEffortChrome()
        // One card at a time: the model trigger sits beside this one, so leaving
        // its card up would stack two panels over the same corner.
        closeOtherPopovers('effort')
        if (effortSlider !== null) effortSlider.update()
        positionEffortPopover()
        if (effortPop !== null) effortPop.setAttribute('data-open', 'true')
      }

      function positionEffortPopover() {
        if (effortBtn === null || effortPop === null) return
        positionAnchoredPopover(effortBtn, effortPop, { side: 'above', gap: 6 })
      }

      /** Pin the body-mounted trigger beside the model trigger (every pass: the
       * seat moves with the window and the composer's own growth). */
      function positionEffortTrigger() {
        if (effortBtn === null) return
        var modelBtn = modelTrigger()
        if (modelBtn === null) {
          effortBtn.style.display = 'none'
          return
        }
        // The row's own rhythm is the 12px flex gap (8px in narrow cards) the
        // host puts between the trailing cluster's children: sit 2px past the
        // model trigger, and with its 8px right padding and this trigger's 2px
        // left padding the two texts land 12px apart — the same 12 the meter's
        // ring (8px into its pill) and the send icon then keep. The model
        // trigger is OUR element, so the effort picker reserves room for itself
        // on its right edge (a margin on it shifts the trigger left, out from
        // under the context meter / send button) and then sits in that reserved
        // space: the row's 12px gap covers 12 of the needed width+2, the margin
        // covers the rest. Measured, not a magic number: the width follows the
        // current level's name.
        // A seat the host keeps in the DOM without laying it out (another view is
        // up, or an ancestor is hidden) reports a zero box; pinning to it put the
        // trigger in the window's top-left corner. No box, no trigger.
        var seatBox = modelBtn.getBoundingClientRect()
        if (seatBox.width === 0 || seatBox.height === 0) {
          hideEffortTrigger()
          return
        }
        // Show it BEFORE measuring: a trigger coming back from the hidden state
        // (its seat returned) would otherwise read offsetWidth 0, reserve no
        // room for that one pass and overlap the control that follows.
        if (effortBtn.style.display !== 'inline-flex') effortBtn.style.display = 'inline-flex'
        var need = Math.max(0, effortBtn.offsetWidth - 6)
        if (modelBtn.style.marginRight !== need + 'px') modelBtn.style.marginRight = need + 'px'
        var shifted = modelBtn.getBoundingClientRect()
        effortBtn.style.left = Math.round(shifted.right + 2) + 'px'
        effortBtn.style.top = Math.round(shifted.top + (shifted.height - effortBtn.offsetHeight) / 2) + 'px'
      }

      /** The slider, built once; the card holds this node for its whole life. */
      function effortControlElement() {
        if (effortSlider === null) {
          effortSlider = createEffortControl({
            read: readEffort,
            onPick: function (levelId) {
              if (ui.model && typeof ui.model.pickEffort === 'function') ui.model.pickEffort(levelId)
            },
            // A drag must not be cut short by the hover-close timer: the pointer
            // is inside the control the whole time.
            onDragStart: cancelCloseEffort,
            // ...and a hold that leaves the card closes it on the RELEASE, not
            // at the boundary crossing (the mouseleave guard stands down while
            // the button is held; this is the other half).
            onDragEnd: function (e) {
              if (effortPop === null || effortPop.getAttribute('data-open') !== 'true') return
              var under = e && typeof e.clientX === 'number' ? document.elementFromPoint(e.clientX, e.clientY) : null
              if (under !== null && effortPop.contains(under)) return
              closeEffortPopover()
            },
          })
        }
        return effortSlider.el
      }

      /**
       * Build (or re-find) the trigger and the card. Idempotence guards, not
       * null checks: client HMR drops the previous generation's disposals, so a
       * stale trigger or card can still be in the document while this scope
       * starts from null. The model picker sweeps its own strays the same way.
       */
      function ensureEffortChrome() {
        var slot = seat()
        if (slot !== null) removeStrayNodes(slot, '.dsh-claude-effort-btn', [effortBtn])
        removeStrayNodes(document, 'body > .dsh-claude-effort-popover', [effortPop])
        if (effortPop === null || effortPop.parentElement === null) {
          if (effortPop !== null && effortPop.parentElement !== null) effortPop.parentElement.removeChild(effortPop)
          effortPop = document.createElement('div')
          effortPop.className = 'dsh-claude-effort-popover'
          effortPop.setAttribute('role', 'menu')
          effortPop.setAttribute('data-open', 'false')
          effortPop.addEventListener('mouseenter', cancelCloseEffort)
          effortPop.addEventListener('mouseleave', function () {
            // A hold must not be cut short by the hover-close timer: the
            // slider settles at its own edge while the pointer travels on
            // with the button down, and the card closing mid-hold read as a
            // crash. A release OUTSIDE the card closes it (onDragEnd).
            if (effortSlider !== null && effortSlider.isHeld()) return
            effortHoverIntent.scheduleClose()
          })
          document.body.appendChild(effortPop)
        }
        // Append the slider only when it is not already the card's child: a
        // detach/re-append would restart its animations (see the header note).
        var control = effortControlElement()
        if (control.parentElement !== effortPop) effortPop.appendChild(control)
      }

      /**
       * Take the body-mounted trigger down with its seat. It is removed rather
       * than hidden: the stylesheet pins `display: inline-flex` with !important,
       * which beats an inline `display: none`, so a hidden trigger stayed on
       * screen at its last coordinates after the seat lost its box (the
       * trajectory and context views) or went away with the composer. The model
       * trigger's reserved margin goes back with it.
       */
      function hideEffortTrigger() {
        if (effortBtn !== null) {
          if (effortBtn.parentElement !== null) effortBtn.parentElement.removeChild(effortBtn)
          effortBtn = null
        }
        releaseModelMargin()
        closeEffortPopover()
      }

      /** Re-point the trigger and the slider at the seat in force (every pass). */
      function syncEffortControl() {
        var slot = seat()
        // No seat to sit beside, or no model trigger to attach to: the trigger
        // comes down (see hideEffortTrigger).
        if (slot === null || modelTrigger() === null) {
          hideEffortTrigger()
          return
        }
        // Never take the trigger away on an in-flight catalog: that is the
        // "selector crashed" report — a pick blanks the snapshot for seconds and
        // the trigger (with its open card) disappeared with it.
        if (seatInFlight()) {
          if (effortSlider !== null) effortSlider.update()
          return
        }
        var info = effortInfo()
        if (info === null) {
          // A catalog that cannot name the seat (the current selection is not in
          // its snapshot yet) has said nothing about that seat's levels: the
          // trigger stays as it is, the way the in-flight branch above keeps it.
          // Only a named model without a ladder takes it away.
          if (ui.model && typeof ui.model.named === 'function' && !ui.model.named()) return
          // No ladder on this seat: the trigger goes away with it, exactly as the
          // model card drew no effort row for such a model.
          hideEffortTrigger()
          return
        }
        ensureEffortChrome()
        if (effortBtn === null || effortBtn.parentElement !== document.body) {
          if (effortBtn !== null && effortBtn.parentElement !== null) effortBtn.parentElement.removeChild(effortBtn)
          effortBtn = document.createElement('button')
          effortBtn.type = 'button'
          effortBtn.className = 'dsh-claude-effort-btn'
          effortBtn.setAttribute('aria-haspopup', 'menu')
          effortBtn.innerHTML = '<span class="dsh-claude-effort-btn-label"></span>'
          // Same contract as the model trigger: hover under the "All" scope,
          // click-only otherwise.
          effortBtn.addEventListener('mouseenter', function () {
            if (readPrefs().autoPopover === AUTO_POPOVER_ALL) effortHoverIntent.scheduleOpen()
          })
          effortBtn.addEventListener('mouseleave', function () {
            if (readPrefs().autoPopover === AUTO_POPOVER_ALL) effortHoverIntent.scheduleClose()
          })
          effortBtn.addEventListener('click', function (e) {
            e.stopPropagation()
            if (effortPop !== null && effortPop.getAttribute('data-open') === 'true') closeEffortPopover()
            else openEffortPopover()
          })
          // NOT inside the seat slot: that subtree is React-managed, and a foreign
          // node in it crashed the host with React #130 at plugin load. The button
          // lives on <body> like the card and is pinned beside the model trigger
          // on every pass instead.
          document.body.appendChild(effortBtn)
        }
        // Same-value guards: sync runs on every scheduler pass, and an identical
        // write still mutates the DOM (textContent replaces the text node;
        // setAttribute queues a record the scheduler's observer sees).
        var labelEl = effortBtn.querySelector('.dsh-claude-effort-btn-label')
        if (labelEl !== null && labelEl.textContent !== info.label) labelEl.textContent = info.label
        var aria = copyLabel('effortLabel', MODEL_EFFORT_LABEL) + ' ' + info.label
        if (effortBtn.getAttribute('aria-label') !== aria) effortBtn.setAttribute('aria-label', aria)
        if (effortSlider !== null) effortSlider.update()
        positionEffortTrigger()

        if (effortPop !== null && effortPop.getAttribute('data-open') === 'true') positionEffortPopover()
      }

      function ownsEffort(target) {
        if (!target) return false
        return (effortBtn !== null && effortBtn.contains(target)) ||
               (effortPop !== null && effortPop.contains(target))
      }

      function teardown() {
        effortHoverIntent.cancel()
        if (effortBtn !== null && effortBtn.parentElement !== null) effortBtn.parentElement.removeChild(effortBtn)
        if (effortPop !== null && effortPop.parentElement !== null) effortPop.parentElement.removeChild(effortPop)
        effortBtn = null
        effortPop = null
        effortSlider = null
        releaseModelMargin()
        unregisterPopover('effort')
      }

      registerPopover('effort', closeEffortPopover)

      ui.effort = {
        sync: syncEffortControl,
        /**
         * The effort card closes on an outside press and on Esc. Composer focus
         * is NOT one of its dismiss routes (the model picker closes there, this
         * one does not), so that reason is ignored.
         */
        close: function (reason) {
          if (reason === 'composer') return
          closeEffortPopover()
        },
        owns: ownsEffort,
        /**
         * The trigger is JS-pinned beside the model trigger, so a viewport or
         * composer-card change has to re-pin it in the SAME frame as the CSS
         * reflow. The scheduler calls this on resize / scroll (and on a card
         * resize); without it the pin waited for the next pass and visibly
         * trailed the controls it sits between.
         */
        reposition: function () {
          positionEffortTrigger()
          positionEffortPopover()
        },
        teardown: teardown,
      }
      return teardown
    }
