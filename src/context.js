    // ============================================================================
    // Zone 3: 宿主上下文与通用辅助 (DSH Context & Helpers)
    // ============================================================================
    function findAccessTrigger() {
      var prefixes = ['访问模式', 'Access mode']
      var buttons = document.querySelectorAll('button[aria-label]')
      for (var i = 0; i < buttons.length; i++) {
        var label = buttons[i].getAttribute('aria-label') || ''
        for (var j = 0; j < prefixes.length; j++) {
          if (label.indexOf(prefixes[j]) === 0) return buttons[i]
        }
      }
      return null
    }

    /**
     * The current-session selection left the Session Controller in dsh 0.2:
     * the list snapshot no longer carries `current`, and the main-view
     * selection is projected by the `uiSession` service as a binding source
     * whose `value.key` is the selected session id (`undefined` when no
     * session is materialized). Read the new source first and fall back to
     * the legacy `list.current` so older hosts keep working.
     */
    function currentSessionId(ctx, sessions) {
      try {
        var uiSession = ctx.get('uiSession')
        var current = uiSession === void 0 || uiSession === null ? null : uiSession.current
        var value = current === void 0 || current === null ? null : current.value
        if (value !== void 0 && value !== null && typeof value.key === 'string') return value.key
      } catch (error) { /* fall through to the legacy snapshot field */ }
      return sessions.list.getSnapshot().current
    }

    function currentSession(ctx) {
      var sessions = ctx.get('sessions')
      if (sessions === void 0 || sessions === null) return null
      var id = currentSessionId(ctx, sessions)
      if (id === void 0 || id === null) return null
      var binding = sessions.binding(id)
      if (binding === void 0 || binding === null) return null
      return binding.session === void 0 ? null : binding.session
    }

    function currentPreset(session) {
      try {
        var snapshot = session.projections.faceOf('permissions').getSnapshot()
        if (snapshot === void 0 || snapshot === null) return null
        // dsh 0.2+ projection faces hand back the bare value (e.g. the preset
        // id string); older hosts wrapped it as `{ currentValue }`.
        if (typeof snapshot === 'object' && 'currentValue' in snapshot) return snapshot.currentValue
        return snapshot
      } catch (error) {
        return null
      }
    }

    /**
     * Read the persisted brand choice.
     *
     * Storage is the renderer's own localStorage, which DSH backs with the
     * `persist:dsh-desktop-renderer` partition, so the value survives an app
     * restart. Every access is guarded: a locked-down or full store must not
     * break the theme, so an unreadable value simply falls back to the default.
     *
     * @returns one of BRAND_CLAUDE / BRAND_ANTHROPIC.
     */
    function readStoredBrand() {
      try {
        var raw = window.localStorage.getItem(BRAND_STORAGE_KEY)
        if (raw === BRAND_ANTHROPIC) return BRAND_ANTHROPIC
        if (raw === BRAND_CLAUDE) return BRAND_CLAUDE
      } catch (error) {
        /* storage unavailable — fall through to the default */
      }
      return DEFAULT_BRAND
    }

    /** Persist the brand choice, ignoring a store that refuses writes. */
    function writeStoredBrand(brand) {
      try {
        window.localStorage.setItem(BRAND_STORAGE_KEY, brand)
      } catch (error) {
        /* storage unavailable — the session still shows the chosen brand */
      }
    }

    /**
     * Apply a brand to the document. The stylesheet keys off the attribute, so
     * this is the single mutation that repaints the sidebar brand; keeping it to
     * one attribute write is what makes the switch cheap and idempotent.
     *
     * @param brand - the brand to show; unknown values fall back to the default.
     * @returns the brand actually applied.
     */
    function applyBrand(brand) {
      var next = brand === BRAND_ANTHROPIC ? BRAND_ANTHROPIC : BRAND_CLAUDE
      document.body.setAttribute(BRAND_ATTR, next)
      return next
    }

    /**
     * The client context exposes no user or account service, so the account
     * name is inferred from the home-directory segment of a workspace path or
     * a session cwd. Falls back to 'User'.
     */
    function getUsername(ctx) {
      try {
        if (ctx && typeof ctx.get === 'function') {
          var workspaces = ctx.get('workspaces')
          if (workspaces && workspaces.list && typeof workspaces.list.getSnapshot === 'function') {
            var items = workspaces.list.getSnapshot().items || []
            for (var i = 0; i < items.length; i++) {
              var m = (items[i].path || '').match(/[/\\](?:Users|home)[/\\]([^/\\]+)/i)
              if (m && m[1]) return m[1]
            }
          }
          var sessions = ctx.get('sessions')
          if (sessions && sessions.list && typeof sessions.list.getSnapshot === 'function') {
            var byId = sessions.list.getSnapshot().byId || {}
            for (var id in byId) {
              var m2 = (byId[id].cwd || '').match(/[/\\](?:Users|home)[/\\]([^/\\]+)/i)
              if (m2 && m2[1]) return m2[1]
            }
          }
        }
      } catch (e) {}
      return 'User'
    }
