    /**
     * The skin's settings page, mounted by whichever seat this host has.
     *
     * 0.1.7 moved a bundle's own configuration onto its plugin page, so there
     * the rows register as a `plugins.bundle.config` entry keyed by the package
     * name. Older hosts have no such slot and keep the full-page
     * `settings.section` entry. Both render the same component, and neither
     * seat hands it a store: it reads and writes the skin preferences through
     * src/context/prefs.js, which owns the host round trip, and follows changes
     * the same way the rest of the skin does.
     *
     * Copy comes from the model copy document's `settings` block, so the page
     * follows the shell language like every other string the skin paints. The
     * English literals here are the fallback for a failed fetch.
     *
     * Its segmented controls reuse the shared `.dsh-claude-segments` /
     * `.dsh-claude-segment` classes and sliding highlight — the same control the
     * composer's permission picker uses — so the two read as one design instead
     * of two lookalikes.
     */
    /**
     * The quick-provider popover (src/overrides/quick-providers.js). The settings
     * row is React-rendered while that card is imperative, so the row reaches the
     * popover through this handle.
     */
    var quickProviderApi = null

    /**
     * One segmented control on the page, carrying the shared sliding highlight
     * (src/overrides/sliding-pill.js). The group is React's, so the pill is
     * placed from a layout effect after every render — before the frame is
     * painted — and taken off when the group unmounts.
     */
    function ClaudeStyleSegmentGroup(props) {
      var group = React.useRef(null)
      var pill = React.useRef(null)
      React.useLayoutEffect(function () {
        pill.current = createSlidingPill('[data-active]')
        return function () {
          pill.current.release()
          pill.current = null
        }
      }, [])
      React.useLayoutEffect(function () {
        pill.current.sync(group.current)
      })
      return React.createElement('div', { ref: group, className: SEGMENTS_CLASS, role: 'group' }, props.children)
    }

    function ClaudeStyleSettingsSection(props) {
      var state = React.useState(readPrefs())
      var prefs = state[0]
      var setPrefs = state[1]
      var errorState = React.useState(null)
      var error = errorState[0]
      var setError = errorState[1]
      var usernameState = React.useState(prefs.username)
      var username = usernameState[0]
      var setUsername = usernameState[1]
      var usernameTimer = React.useRef(null)
      var quickTrigger = React.useRef(null)

      // The skin's own apply-side writes land here too (a reload, a conflict
      // re-read), so the page never drifts from what the document says.
      React.useEffect(function () {
        syncSettingsNav()
        var alive = true
        var unsubscribe = subscribePrefs(function (next) {
          if (alive) {
            setPrefs(next)
            setUsername(next.username)
          }
        })
        var unsubscribeCopy = onModelCopyLoaded(function () {
          if (alive) setPrefs(function (p) { return Object.assign({}, p) })
        })
        return function () {
          alive = false
          unsubscribe()
          if (unsubscribeCopy) unsubscribeCopy()
          if (usernameTimer.current) clearTimeout(usernameTimer.current)
        }
      }, [])

      /**
       * Apply one change. The control flips immediately and the host write
       * follows; a refusal re-reads the authoritative value and says so.
       */
      var write = function (patch) {
        setError(null)
        setPrefs(Object.assign({}, prefs, patch))
        savePrefs(patch).then(function (result) {
          if (result === null) setError(settingsCopy('unavailable', 'The settings store is unavailable, so changes will not be saved.'))
        })
      }

      var saveUsernameNow = function (value) {
        var next = value.trim().slice(0, USERNAME_MAX)
        if (next === readPrefs().username) return
        setError(null)
        setPrefs(Object.assign({}, readPrefs(), { username: next }))
        savePrefs({ username: next }).then(function (result) {
          if (result === null) setError(settingsCopy('unavailable', 'The settings store is unavailable, so changes will not be saved.'))
        })
      }

      var queueUsernameSave = function (value) {
        if (usernameTimer.current) clearTimeout(usernameTimer.current)
        usernameTimer.current = setTimeout(function () {
          usernameTimer.current = null
          saveUsernameNow(value)
        }, 600)
      }

      var commitUsername = function () {
        if (usernameTimer.current) {
          clearTimeout(usernameTimer.current)
          usernameTimer.current = null
        }
        saveUsernameNow(username)
      }

      var segment = function (options, active, onPick) {
        var buttons = []
        for (var i = 0; i < options.length; i++) {
          buttons.push(React.createElement(
            'button',
            {
              key: options[i].value,
              type: 'button',
              className: SEGMENT_CLASS,
              'data-active': options[i].value === active ? '' : undefined,
              'aria-pressed': options[i].value === active ? 'true' : 'false',
              onClick: (function (value) {
                return function () {
                  if (value !== active) onPick(value)
                }
              })(options[i].value),
            },
            options[i].label,
          ))
        }
        return React.createElement(ClaudeStyleSegmentGroup, null, buttons)
      }

      var toggle = function (on, onPick) {
        return React.createElement(
          'button',
          {
            type: 'button',
            className: 'dsh-claude-settings-switch',
            role: 'switch',
            'aria-checked': on ? 'true' : 'false',
            'data-on': on ? '' : undefined,
            onClick: function () { onPick(!on) },
          },
          React.createElement('span', { className: 'dsh-claude-settings-switch-knob' }),
        )
      }

      var row = function (key, title, description, control) {
        return React.createElement(
          'div',
          { className: 'dsh-claude-settings-row', key: key },
          React.createElement(
            'div',
            { className: 'dsh-claude-settings-row-text' },
            React.createElement('div', { className: 'dsh-claude-settings-row-title' }, title),
            React.createElement('div', { className: 'dsh-claude-settings-row-desc' }, description),
          ),
          control,
        )
      }

      var brandOptions = [
        { value: BRAND_OFF, label: settingsCopy('brandOff', 'Off') },
        { value: BRAND_CLAUDE, label: settingsCopy('brandClaude', 'Claude') },
        { value: BRAND_ANTHROPIC, label: settingsCopy('brandAnthropic', 'Anthropic') },
      ]
      var scopeOptions = [
        { value: 'off', label: settingsCopy('scopeOff', 'Off') },
        { value: 'hero', label: settingsCopy('scopeHero', 'Home only') },
        { value: 'conversation', label: settingsCopy('scopeConversation', 'Conversation only') },
        { value: 'all', label: settingsCopy('scopeAll', 'All') },
      ]
      var banLocaleOptions = [
        { value: BAN_LOCALE_ZH, label: settingsCopy('banLocaleZh', '中文') },
        { value: BAN_LOCALE_EN, label: settingsCopy('banLocaleEn', 'English') },
      ]
      var autoPopoverOptions = [
        { value: AUTO_POPOVER_OFF, label: settingsCopy('autoPopoverOff', 'Off') },
        { value: AUTO_POPOVER_ACCOUNT, label: settingsCopy('autoPopoverAccount', 'Account only') },
        { value: AUTO_POPOVER_ALL, label: settingsCopy('autoPopoverAll', 'All') },
      ]
      var homeLayoutOptions = [
        { value: HOME_LAYOUT_CLASSIC, label: settingsCopy('homeClassic', 'Classic') },
        { value: HOME_LAYOUT_STUDIO, label: settingsCopy('homeStudio', 'Studio') },
      ]

      /** What the quick-provider trigger reads: how many, or nothing chosen. */
      var quickSummary = function (chosen) {
        if (chosen.length === 0) return settingsCopy('quickNone', 'None')
        return settingsCopy('quickCount', '{count} providers', { count: chosen.length })
      }

      var rows = [
        row(
          'username',
          settingsCopy('usernameTitle', 'Username'),
          settingsCopy('usernameDesc', 'Shown in the new-conversation greeting and the account row. Leave empty to use the signed-in account name, then the HDSL launcher\'s account name, then the local system user.'),
          React.createElement('input', {
            type: 'text',
            className: 'dsh-claude-settings-input',
            value: username,
            maxLength: USERNAME_MAX,
            placeholder: settingsCopy('usernamePlaceholder', 'Auto-detect account or host user'),
            spellCheck: false,
            autoComplete: 'off',
            onChange: function (e) {
              setUsername(e.target.value)
              queueUsernameSave(e.target.value)
            },
            onBlur: commitUsername,
            onKeyDown: function (e) {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitUsername()
                if (e.currentTarget && e.currentTarget.blur) e.currentTarget.blur()
              } else if (e.key === 'Escape') {
                setUsername(prefs.username)
                if (e.currentTarget && e.currentTarget.blur) e.currentTarget.blur()
              }
            },
          }),
        ),
        row(
          'brand',
          settingsCopy('brandTitle', 'Brand mark'),
          settingsCopy('brandDesc', 'Which brand mark the sidebar shows. "Off" leaves the host\'s own brand area untouched.'),
          segment(brandOptions, prefs.brand, function (value) { write({ brand: value }) }),
        ),
        row(
          'collapseFooter',
          settingsCopy('collapseTitle', 'Collapse the sidebar settings area'),
          settingsCopy('collapseDesc', 'Fold the sidebar footer\'s settings entry into the account popover. Off hands the footer back to the host entirely.'),
          toggle(prefs.collapseFooter, function (value) { write({ collapseFooter: value }) }),
        ),
        row(
          'autoPopover',
          settingsCopy('autoPopoverTitle', 'Open popovers on hover'),
          settingsCopy('autoPopoverDesc', 'Which popovers hover opens. Off leaves them all click-to-open.'),
          segment(autoPopoverOptions, prefs.autoPopover, function (value) { write({ autoPopover: value }) }),
        ),
        row(
          'composerScope',
          settingsCopy('composerTitle', 'Composer restyle'),
          settingsCopy('composerDesc', 'Which input area the skin restyles: the new-conversation page, the conversation, or both.'),
          segment(scopeOptions, prefs.composerScope, function (value) { write({ composerScope: value }) }),
        ),
        row(
          'homeLayout',
          settingsCopy('homeTitle', 'Home layout'),
          settingsCopy('homeDesc', 'The new-conversation page: the centered hero, or the dashboard form with the greeting at the top left, the composer at the bottom edge and the usage panel in between.'),
          segment(homeLayoutOptions, prefs.homeLayout, function (value) { write({ homeLayout: value }) }),
        ),
        row(
          'modelPicker',
          settingsCopy('pickerTitle', 'Redraw the model picker'),
          settingsCopy('pickerDesc', 'Replace the composer\'s model seat with the two-level Claude-style menu. Off hands the model menu back to the host; the rest of the composer restyle is unaffected.'),
          toggle(prefs.modelPicker, function (value) { write({ modelPicker: value }) }),
        ),
        row(
          'quickProviders',
          settingsCopy('quickTitle', 'Quick providers'),
          settingsCopy('quickDesc', 'Providers whose models the picker\'s first level lists, one rule between providers. Nothing picked keeps the default: the official service.'),
          React.createElement('button', {
            type: 'button',
            ref: quickTrigger,
            className: 'dsh-claude-settings-picker',
            'aria-haspopup': 'menu',
            'aria-expanded': 'false',
            onClick: function () {
              if (quickProviderApi === null || quickTrigger.current === null) return
              quickProviderApi.toggle(quickTrigger.current, function (next) { write({ quickProviders: next }) })
            },
          }, quickSummary(prefs.quickProviders)),
        ),
        row(
          'banLocale',
          settingsCopy('banLocaleTitle', 'Account-hold easter egg language'),
          settingsCopy('banLocaleDesc', 'The language the account-hold page (click the account row in the sidebar footer popover) is written in. It is its own choice, so the page reads the way Claude wrote it whatever the interface language is.'),
          segment(banLocaleOptions, prefs.banLocale, function (value) { write({ banLocale: value }) }),
        ),
      ]

      if (error !== null) {
        rows.push(React.createElement('div', { className: 'dsh-claude-settings-error', key: 'error' }, error))
      }

      // The plugin page already heads the form with the bundle's own title and
      // description, so the embedded rendering drops the skin's title rather
      // than printing it twice.
      var embedded = !!(props && props.embed)
      return React.createElement(
        'div',
        { className: embedded ? 'dsh-claude-settings dsh-claude-settings-embedded' : 'dsh-claude-settings' },
        embedded ? null : React.createElement('div', { className: 'dsh-claude-settings-title' }, settingsCopy('title', 'Claude Style')),
        rows,
      )
    }

    /**
     * The plugin page's configuration entry (0.1.7+).
     *
     * A `plugins.bundle.config` entry is asked for two views: `summary` is the
     * one-liner on the bundle's card, `page` is the form itself. The host does
     * not hand this seat a form — the entry is keyed to the package, not to a
     * namespace — so the rows read and write through src/context/prefs.js like
     * every other surface in the skin, which is where the official form is
     * bound.
     */
    function ClaudeStyleBundleConfig(props) {
      if (props && props.view === 'summary') {
        return React.createElement('span', null, settingsCopy('title', 'Claude Style'))
      }
      return React.createElement(ClaudeStyleSettingsSection, { embed: true })
    }

    /**
     * Register the settings section.
     *
     * Two waits are needed, and both are declarative rather than polling:
     *
     *   1. `ctx.inject(['slots'], …)` waits for the slot registry service. The
     *      renderer provides it, so reading `ctx.get('slots')` directly during
     *      `apply` could see nothing and silently drop the section.
     *   2. `slots.inject('settings.section', …)` waits for the slot *declaration*,
     *      which `dsh-client-ui-settings-general` publishes later. Registering
     *      eagerly instead would throw and fail the boot.
     *
    /**
     * Stamped onto the Claude Style nav button in the settings dialog so CSS
     * can replace the host's default settings gear with the black Claude mark.
     */
    function syncSettingsNav() {
      var navList = document.querySelector(':is([class*="settingsArea"], [class*="_overlay"], [class*="SettingsRoot"]) [class*="_navList"]')
      if (!navList) return
      var buttons = navList.querySelectorAll('button')
      var targetTitle = (typeof settingsCopy === 'function' ? settingsCopy('title', 'Claude Style') : 'Claude Style') || 'Claude Style'
      for (var i = 0; i < buttons.length; i++) {
        var btn = buttons[i]
        var label = btn.querySelector('[class*="_navLabel"]') || btn
        var text = (label.textContent || '').trim()
        if (text === 'Claude Style' || text === targetTitle) {
          if (btn.getAttribute('data-dsh-section') !== 'claude-style') {
            btn.setAttribute('data-dsh-section', 'claude-style')
          }
          return
        }
      }
    }

    function installSettingsSection(ctx, ui) {
      loadModelCopy()
      // The settings services are up by now even when they were not at apply
      // time, so retry the official-form binding before choosing a seat. It is
      // idempotent.
      adoptSettingsForm(ctx)
      if (ui) {
        ui.settingsNav = {
          sync: syncSettingsNav,
          /** A pointer press anywhere: the nav's class changes are outside the
           * observer's attributeFilter, so no pass would fire for them. */
          onPointerDown: function () { syncSettingsNav() },
        }
        quickProviderApi = ui.quickProviders || null
      }
      if (typeof ctx.inject !== 'function') return function () {}
      var fiber = ctx.inject(['slots'], function (scope) {
        var slots = scope.get('slots')
        if (slots === void 0 || slots === null || typeof slots.inject !== 'function') return
        // 0.1.7 keeps a bundle's own configuration on the plugin's page: the
        // entry is keyed by the bundle's package name and rendered there —
        // `view: 'page'` for the form, `view: 'summary'` for the card's
        // one-liner. The slot is declared by that host's plugin manager, so this
        // registration is a no-op on an older host.
        scope.effect(function () {
          return slots.inject(BUNDLE_CONFIG_SLOT, function () {
            return slots.register(
              {
                name: BUNDLE_CONFIG_SLOT,
                key: PACKAGE_NAME,
                label: function () { return settingsCopy('title', 'Claude Style') },
              },
              ClaudeStyleBundleConfig,
            )
          })
        }, 'dsh-claude-style: plugin page')
        // The full-page section is the older host's seat. 0.1.7 still declares
        // the slot, but there the skin's settings live on its plugin page — and
        // a host that serves `configForms` is by definition the newer one, so
        // that check tells the two apart without a version probe. (The settings
        // shell cannot have declared this slot before `configForms` mounted: it
        // injects the service itself.)
        scope.effect(function () {
          return slots.inject(SETTINGS_SECTION_SLOT, function () {
            if (hostConfigForms(ctx) !== null) return function () {}
            return slots.register(
              {
                name: SETTINGS_SECTION_SLOT,
                id: 'claude-style',
                order: 22,
                // A function, so the navigation entry localizes once the copy
                // document has arrived; the literal is the pre-fetch fallback.
                label: function () { return settingsCopy('title', 'Claude Style') },
              },
              ClaudeStyleSettingsSection,
            )
          })
        }, 'dsh-claude-style: settings section')
      })
      return function () {
        if (ui && ui.settingsNav) {
          delete ui.settingsNav
        }
        quickProviderApi = null
        try {
          if (fiber && typeof fiber.dispose === 'function') fiber.dispose()
        } catch (error) {
          /* the fiber may already be gone during teardown */
        }
      }
    }
