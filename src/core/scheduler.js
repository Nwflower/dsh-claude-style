    /**
     * A feature's handle on the shared `ui` registry. The scheduler calls the
     * hooks; every hook is optional, and a feature that does not implement one
     * is simply skipped for that trigger. The scheduler reads nothing else from
     * a handle except `sync`, which decides pass order.
     *
     * @typedef {Object} FeatureHandle
     * @property {Function} [sync] Every scheduler pass. The one hook a pass
     *     feature must have.
     * @property {Function} [owns] `owns(target) → boolean`: whether the press
     *     landed inside the feature's own DOM. A press the feature does not own
     *     closes it through `close('outside')`.
     * @property {Function} [onPointerDown] `onPointerDown(target)`: every
     *     pointer press, owned or not. The composer focuses its editor from
     *     here; settingsNav uses it because its class changes are outside the
     *     observer's attributeFilter, so no pass fires.
     * @property {Function} [close] `close(reason)`: `'outside'` (press
     *     outside), `'escape'` (Esc), or `'composer'` (focus moved into the
     *     composer). Features ignore the reasons they do not act on, so each
     *     keeps its exact shipped dismiss routes.
     * @property {Function} [onInput] `onInput(target)`: an input or
     *     compositionend event whose target is inside the composer input.
     * @property {Function} [reposition] `reposition(reason)`: `'viewport'` (a
     *     viewport scroll or resize) or `'composer'` (the composer card changed
     *     size). A popover checks whether it is open; the composer keeps the
     *     transcript at its end on a card change.
     * @property {Function} [onCopyChange] `onCopyChange()`: the locale, the
     *     preferences or the model copy changed.
     * @property {Function} [onKey] `onKey(event) → boolean`: a keydown, after
     *     the scheduler's own Esc handling. The return value does not gate the
     *     scheduler's unconditional Ctrl+, preventDefault.
     *
     * Cross-feature reads outside the scheduler stay direct handle reads:
     *   copy, permissions → composer.{isHero, isActive}
     *   heroMenu → composer.isActive
     *   mascot → composer.heroCard
     *   effort → model.{seat, trigger, effort, named, settled, pickEffort, close}
     *   model → effort.close, composer.isActive
     *   quickProviders → model.{providers, onProviders}
     *   footer → ban.open
     */
    /**
     * Say once, loudly, that a feature was switched off. The skin keeps running
     * without it, so the console line is the only trace — it names the feature.
     */
    function reportFeatureFailure(name, error) {
      try {
        console.error('[dsh-claude-style] "' + name + '" failed and was switched off:', error)
      } catch (ignored) { /* no console */ }
    }

    function installScheduler(ctx, ui, passFeatures, hookFeatures) {
      function onGlobalPointerDown(e) {
        var target = e.target
        // A press a feature does not own closes it: the model picker and the
        // effort card are hover-driven popovers, the account drawer a click one.
        // Features without an `owns` keep their own dismiss route — permissions
        // runs its own outside-press listener, and quickProviders closes only on
        // composer focus — so none gains a route it did not have.
        for (var i = 0; i < HOOK_FEATURES.length; i++) {
          var handle = ui[HOOK_FEATURES[i]]
          if (!handle || typeof handle.owns !== 'function' || typeof handle.close !== 'function') continue
          if (target && !handle.owns(target)) handle.close('outside')
        }
        // A press also drives hooks that are not about closing: settingsNav's
        // class changes are outside the observer's attributeFilter, so its sync
        // runs on the press itself. It is last, in feature order.
        for (var j = 0; j < HOOK_FEATURES.length; j++) {
          var pressed = ui[HOOK_FEATURES[j]]
          if (pressed && typeof pressed.onPointerDown === 'function') pressed.onPointerDown(target)
        }
      }

      function onGlobalKeyDown(e) {
        if (e.key === 'Escape') {
          // Every feature's own Esc route, in feature order. The account-hold
          // overlay is the one layer that does NOT close on a window blur (it is
          // meant to be read, and reading it may mean switching windows), so Esc
          // is its keyboard way out; a feature that ignores the reason is skipped.
          for (var i = 0; i < HOOK_FEATURES.length; i++) {
            var handle = ui[HOOK_FEATURES[i]]
            if (handle && typeof handle.close === 'function') handle.close('escape')
          }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === ',') {
          // Unconditional: the hook's return value never gates this.
          e.preventDefault()
          for (var k = 0; k < HOOK_FEATURES.length; k++) {
            var keyHandle = ui[HOOK_FEATURES[k]]
            if (keyHandle && typeof keyHandle.onKey === 'function') keyHandle.onKey(e)
          }
        }
        // Enter is deliberately NOT handled here. The host's composer keymap
        // already sends on Enter, and first picks
        // the highlighted item of an open `/` or `@` menu, holds back for IME
        // (including Safari's late keydown) and ignores key repeat. This listener
        // runs in the capture phase, before the editor: clicking Send from here
        // stole all of that — Enter on an open menu sent the half-typed text.
      }

      // Focus moving into the composer means the user is about to type: every
      // popover the skin keeps open around the card is in the way there, so each
      // feature's composer route runs, in feature order. `focusin` bubbles
      // (unlike focus), so one listener covers the card and everything inside
      // it; the observer's attributeFilter does not watch focus events, so this
      // cannot feed itself another pass. The hero menu has no close of its own —
      // it lives and dies with the host's hover state, and syncHeroMenu notices
      // when it is gone — so it has no hook and is simply skipped.
      function onComposerFocusIn(e) {
        var target = e.target
        if (!target || typeof target.closest !== 'function') return
        if (target.closest('[data-composer-card]') === null) return
        for (var i = 0; i < HOOK_FEATURES.length; i++) {
          var handle = ui[HOOK_FEATURES[i]]
          if (handle && typeof handle.close === 'function') handle.close('composer')
        }
      }

      function onComposerInput(e) {
        var target = e.target
        if (!target) return
        if (target.hasAttribute && (target.hasAttribute('data-composer-input') || (target.closest && target.closest('[data-composer-input]')))) {
          // The [data-composer-input] filter stays in this event pipe; a feature
          // is only told that a composer-input event happened.
          for (var i = 0; i < HOOK_FEATURES.length; i++) {
            var handle = ui[HOOK_FEATURES[i]]
            if (handle && typeof handle.onInput === 'function') handle.onInput(target)
          }
        }
      }

      document.addEventListener('pointerdown', onGlobalPointerDown)
      document.addEventListener('keydown', onGlobalKeyDown, true)
      document.addEventListener('input', onComposerInput, true)
      document.addEventListener('compositionend', onComposerInput, true)
      document.addEventListener('focusin', onComposerFocusIn, true)

      // Re-pin every feature that anchors to a moving target. The scheduler
      // knows only the hook: a feature with a `reposition(reason)` re-resolves
      // its own anchor (and checks whether it is open).
      function repositionFeatures(reason) {
        for (var i = 0; i < HOOK_FEATURES.length; i++) {
          var handle = ui[HOOK_FEATURES[i]]
          if (handle && typeof handle.reposition === 'function') handle.reposition(reason)
        }
      }

      // Fixed popovers are anchored to their trigger; scroll of the page (not
      // the conversation's own auto-stick) and resizes move the anchor, so
      // whichever is open must re-resolve it in the same frame as the reflow.
      function onFixedPopoverViewportChange() {
        repositionFeatures('viewport')
      }
      window.addEventListener('resize', onFixedPopoverViewportChange)
      window.addEventListener('scroll', onFixedPopoverViewportChange, true)

      // A copy source changed — the locale, the preferences or the model copy
      // document. Each feature that paints copy rebuilds its render signatures
      // through onCopyChange, then one pass repaints. The picker's copy follows
      // the shell language, so a locale switch has to rebuild the rows it already
      // painted; subscribing here (rather than reading the locale at render time
      // only) is what makes the change land while a popover is open.
      function onCopyChange() {
        for (var i = 0; i < HOOK_FEATURES.length; i++) {
          var handle = ui[HOOK_FEATURES[i]]
          if (handle && typeof handle.onCopyChange === 'function') handle.onCopyChange()
        }
        schedule()
      }
      var localeUnsubscribe = null
      try {
        var localeService = ctx.get('locale')
        if (localeService && typeof localeService.subscribe === 'function') {
          localeUnsubscribe = localeService.subscribe(onCopyChange)
        }
      } catch (error) { /* no locale service: the picker keeps the fallback language */ }

      // Preferences gate the stylesheet and this scheduler both — the footer
      // takeover adds or removes the account row, and the composer scope flips
      // an attribute the stylesheet reads — so a change re-runs the pass. The
      // first read also arrives through here, which is what replaces the
      // defaults with the stored values.
      var prefsUnsubscribe = null
      prefsUnsubscribe = subscribePrefs(onCopyChange)
      loadPrefs()

      var modelCopyUnsubscribe = null
      modelCopyUnsubscribe = onModelCopyLoaded(onCopyChange)

      var usernameUnsubscribe = null
      usernameUnsubscribe = onUsernameLoaded(function () {
        schedule()
      })

      // The HDSL contract lands after the first pass too, and it can carry both
      // the nickname and the picture, so its arrival repaints the same way.
      var hdslUnsubscribe = null
      hdslUnsubscribe = onHdslLoaded(function () {
        schedule()
      })

      // Chat streaming mutates the tree constantly; coalesce to one pass a frame.
      var scheduled = false
      /** The frame the pending pass waits on, so the teardown can cancel it. */
      var pendingFrame = 0
      /** Set by the teardown: no pass may be scheduled, or run, after it. */
      var stopped = false
      var composerCardObserver = null
      var observedCard = null
      if (typeof ResizeObserver !== 'undefined') {
        composerCardObserver = new ResizeObserver(function () {
          // The card resizing moves the anchors pinned to it (the rail toggle,
          // a container width change) with no window resize: re-pin in the same
          // frame, or a JS-pinned control trails the ones CSS just reflowed.
          repositionFeatures('composer')
        })
      }

      /**
       * The features a pass syncs (their `ui` handle names), in pass order.
       * entry.js passes them in FEATURES order, filtered to handles that exist
       * and have a `sync`.
       */
      var PASS_FEATURES = passFeatures || []
      /** Every installed feature handle, in install order, for the event hooks. */
      var HOOK_FEATURES = hookFeatures || []
      /** Failed passes in a row after which a feature's sync is switched off. */
      var SYNC_FAILURE_LIMIT = 3
      var syncFailures = {}

      /**
       * Run one feature's sync in isolation. A sync that throws is retried on the
       * next pass; after SYNC_FAILURE_LIMIT failures in a row the feature is
       * reported once and retired (src/entry.js: its teardown runs and the host
       * gets back what it had taken over), and the rest of the pass carries on
       * without it. (Unguarded, one throwing sync aborted every sync after it,
       * on every pass.)
       */
      function runSync(name) {
        var feature = ui[name]
        if (!feature || typeof feature.sync !== 'function') return
        var failures = syncFailures[name] || 0
        if (failures >= SYNC_FAILURE_LIMIT) return
        try {
          feature.sync()
          syncFailures[name] = 0
        } catch (error) {
          syncFailures[name] = failures + 1
          if (failures + 1 < SYNC_FAILURE_LIMIT) return
          reportFeatureFailure(name, error)
          if (typeof ui.retire === 'function') ui.retire(name)
        }
      }

      function schedule() {
        if (scheduled || stopped) return
        scheduled = true
        pendingFrame = requestAnimationFrame(function () {
          scheduled = false
          if (stopped) return
          for (var i = 0; i < PASS_FEATURES.length; i++) runSync(PASS_FEATURES[i])
          try {
            if (composerCardObserver) {
              var currentCard = document.querySelector('[data-composer-card]')
              if (currentCard !== observedCard) {
                if (observedCard) composerCardObserver.unobserve(observedCard)
                observedCard = currentCard
                if (observedCard) composerCardObserver.observe(observedCard)
              }
            }
          } catch (error) { /* the next pass tries again */ }
        })
      }
      ui.schedule = schedule

      var observer = new MutationObserver(schedule)
      observer.observe(document.body, {
        childList: true,
        characterData: true,
        subtree: true,
        attributes: true,
        // The shipped trigger carries the current preset in its aria-label;
        // the conversation tabs carry the active view in aria-selected.
        attributeFilter: ['aria-label', 'aria-selected'],
      })
      schedule()

      // Copy that follows the clock (the hero greeting rolls over on the hour)
      // has no DOM change to wake a pass, so the clock runs one every minute
      // while the app stays open. The syncs skip identical writes, so this
      // cannot feed the observer.
      var clockTimer = setInterval(schedule, 60000)

      return function () {
        // A pass already requested would run against torn-down features and
        // build their DOM again after the teardown (measured: dozens of skin
        // nodes and the composer's body attribute came back). Cancel it, and
        // refuse every later schedule() — a feature's pending promise (the
        // account profile, a preset switch) may still call it.
        stopped = true
        if (scheduled) cancelAnimationFrame(pendingFrame)
        scheduled = false
        clearInterval(clockTimer)
        clockTimer = null
        window.removeEventListener('resize', onFixedPopoverViewportChange)
        window.removeEventListener('scroll', onFixedPopoverViewportChange, true)
        if (localeUnsubscribe !== null) {
          try { localeUnsubscribe() } catch (error) { /* already disposed */ }
          localeUnsubscribe = null
        }
        if (prefsUnsubscribe !== null) {
          try { prefsUnsubscribe() } catch (error) { /* already disposed */ }
          prefsUnsubscribe = null
        }
        if (modelCopyUnsubscribe !== null) {
          try { modelCopyUnsubscribe() } catch (error) { /* already disposed */ }
          modelCopyUnsubscribe = null
        }
        if (usernameUnsubscribe !== null) {
          try { usernameUnsubscribe() } catch (error) { /* already disposed */ }
          usernameUnsubscribe = null
        }
        if (hdslUnsubscribe !== null) {
          try { hdslUnsubscribe() } catch (error) { /* already disposed */ }
          hdslUnsubscribe = null
        }
        observer.disconnect()
        if (composerCardObserver) {
          composerCardObserver.disconnect()
          composerCardObserver = null
          observedCard = null
        }
        document.removeEventListener('pointerdown', onGlobalPointerDown)
        document.removeEventListener('keydown', onGlobalKeyDown, true)
        document.removeEventListener('input', onComposerInput, true)
        document.removeEventListener('compositionend', onComposerInput, true)
        document.removeEventListener('focusin', onComposerFocusIn, true)
      }
    }
