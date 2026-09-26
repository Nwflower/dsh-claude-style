    /**
     * Skin preferences.
     *
     * The authoritative store is the host settings namespace, reached through
     * `ctx.configForms`: it serves every registered namespace to the browser,
     * and its per-entry controller carries the values, the write queue and the
     * revision fence. The namespace is this plugin's profile entry id and its
     * schema is the Config `host/index.js` exports.
     *
     * Every value is mirrored onto the document as an attribute, so the
     * stylesheet — not this module — decides what a preference means visually.
     * Until the first read settles (and if it fails) the defaults below hold,
     * which is exactly the shipped behaviour.
     */
    /**
     * Browser-local fallback for the account-hold page's language.
     *
     * Same contract as the username fallback below, and needed for the same
     * reason: this bundle reloads with the page, but the host half is imported
     * once when the app boots, so a running host half can predate the field.
     * Without the fallback the choice SILENTLY REVERTS — the old host half has
     * no `banLocale` in its accepted-key list, drops the unknown key, and
     * answers the write with its unchanged value, so the segment flips back
     * with nothing to explain it.
     */
    const BAN_LOCALE_STORAGE_KEY = 'dsh-claude-style.banLocale'
    let fallbackBanLocale = readStoredBanLocale()

    function readStoredBanLocale() {
      const stored = localStorage.getItem(BAN_LOCALE_STORAGE_KEY) || ''
      return !BAN_LOCALES.includes(stored) ? '' : stored
    }

    /** Persist (or clear) the local language choice; anything else is refused. */
    function setFallbackBanLocale(value) {
      fallbackBanLocale = !BAN_LOCALES.includes(value) ? '' : value
      if (fallbackBanLocale) localStorage.setItem(BAN_LOCALE_STORAGE_KEY, fallbackBanLocale)
      else localStorage.removeItem(BAN_LOCALE_STORAGE_KEY)
    }

    /**
     * The language the account-hold page is written in.
     *
     * The local fallback outranks the host value while it exists: it is only
     * ever set when the host refused the write, and `savePrefs` clears it the
     * moment the host confirms the same value — so a stale host half cannot
     * revert the choice, and a reloaded one takes over on its own.
     */
    function resolveBanLocale(hostValue) {
      if (fallbackBanLocale) return fallbackBanLocale
      return !BAN_LOCALES.includes(hostValue) ? DEFAULT_BAN_LOCALE : hostValue
    }

    let prefs = {
      brand: DEFAULT_BRAND,
      collapseFooter: true,
      autoPopover: DEFAULT_AUTO_POPOVER,
      composerScope: 'all',
      modelPicker: true,
      quickProviders: [],
      username: '',
      banLocale: fallbackBanLocale || DEFAULT_BAN_LOCALE,
      homeLayout: DEFAULT_HOME_LAYOUT,
    }
    let prefsAvailable = false
    const prefsListeners = []

    /**
     * The official settings form.
     *
     * `ctx.configForms.get(entryId)` hands back a controller carrying the
     * values, a write queue and a revision fence, and the namespace is this
     * plugin's profile entry id. It stays null until the service serves that
     * namespace; until then the defaults hold.
     */
    let prefsForm = null
    /** Disposer for the bound form's own change subscription. */
    let prefsFormUnsubscribe = null
    /** Disposer for the served-namespace directory watch, while one is open. */
    let prefsWatchOff = null
    /** Whether the served-namespace directory is already being watched. */
    let prefsBinding = false

    /**
     * Candidate namespaces, best first: the running loader entry id (host
     * halves report "<kind>:<id>", so the kind prefix is stripped), the package
     * name (the `plugins.bundle.config` key), and the id `cordis.patch.yml`
     * inserts — which is what the host half actually registers the namespace
     * as.
     */
    function settingsNamespaceCandidates(ctx) {
      // The dynamic façade can hide the fiber; the other two candidates remain.
      const id = ctx?.fiber?.entry?.id
      const entryId = typeof id === 'string' && id !== '' ? id.slice(id.lastIndexOf(':') + 1) : null
      return [entryId, PACKAGE_NAME, SETTINGS_ENTRY_FALLBACK]
    }

    /**
     * The namespace the host actually serves, picked from the candidates.
     *
     * The browser cannot trust its own loader entry id: `dsh-client-modules`
     * creates each boot entry with only `name`, so the loader mints a RANDOM
     * id. Asking `configForms.get()` for that id hands back a controller for a
     * namespace no one owns — reads stay at the defaults and every write is
     * refused ("No configurable plugin entry"). The served list is the truth.
     *
     * @param forms - the `configForms` service.
     * @param candidates - namespace ids, best first.
     * @returns the first served candidate, or null when none is served yet.
     */
    function servedNamespace(forms, candidates) {
      const namespaces = forms.describe?.()?.getSnapshot?.()?.view?.namespaces
      if (!namespaces) return null
      for (const candidate of candidates) {
        if (typeof candidate !== 'string' || candidate === '') continue
        if (namespaces.some(served => served?.ns === candidate)) return candidate
      }
      return null
    }

    /** Whether the host serves namespaces to the browser. */
    function hostConfigForms(ctx) {
      const forms = ctx?.get('configForms')
      return typeof forms?.get === 'function' ? forms : null
    }

    /** The form's current field values, or null while it is not ready. */
    function readFormValue() {
      const snapshot = prefsForm?.getSnapshot()
      if (snapshot?.status !== 'ready') return null
      return snapshot.value && typeof snapshot.value === 'object' ? snapshot.value : null
    }

    /**
     * Bind one namespace the host already serves.
     *
     * The controller waits for its own snapshot, so binding is the only step
     * here; the value is read once the controller carries it.
     *
     * @param forms - the `configForms` service.
     * @param ctx - the owning context, for the namespace candidates.
     * @returns whether the form was bound.
     */
    function bindServedForm(forms, ctx) {
      // Only bind a namespace the host actually serves; a generated loader id
      // would yield a controller for nobody's namespace (reads stuck at the
      // defaults, every write refused).
      const namespace = servedNamespace(forms, settingsNamespaceCandidates(ctx))
      if (namespace === null) return false
      const form = forms.get(namespace)
      if (typeof form?.getSnapshot !== 'function') return false
      prefsForm = form
      // A form without a subscribe face leaves the reads on demand.
      if (typeof form.subscribe === 'function') {
        prefsFormUnsubscribe = form.subscribe(() => {
          const value = readFormValue()
          if (value === null) return
          prefsAvailable = true
          adoptPrefs(normalizePrefs(value))
          replayPendingBanLocale(value)
        })
      }
      return true
    }

    /**
     * Watch the served-namespace directory until this plugin's namespace lands.
     *
     * The directory is a wire read: on a cold page it can answer after this
     * plugin has applied. A one-shot decision at apply time then left the store
     * unbound for the rest of the session, and the settings page reported the
     * store unavailable on the first change. The mirror is subscribed and asked
     * for its first read, so the form binds whenever the answer arrives.
     *
     * @param forms - the `configForms` service.
     * @param ctx - the owning context, for the namespace candidates.
     */
    function watchNamespace(forms, ctx) {
      if (prefsBinding) return
      const mirror = forms.describe?.()
      if (!mirror) return
      prefsBinding = true
      const attempt = () => {
        if (prefsForm === null && !bindServedForm(forms, ctx)) return
        if (prefsWatchOff !== null) {
          prefsWatchOff()
          prefsWatchOff = null
        }
        loadPrefs()
      }
      if (typeof mirror.subscribe === 'function') prefsWatchOff = mirror.subscribe(attempt)
      if (typeof mirror.ensure === 'function') mirror.ensure()
      attempt()
    }

    /**
     * Bind the official form.
     *
     * Called once per install, before the first read, and again when the
     * settings page installs — the service may mount after this plugin. A
     * namespace the host does not serve yet leaves `prefsForm` null and the
     * defaults in place, so this never blocks or fails the skin.
     */
    function adoptSettingsForm(ctx) {
      if (prefsForm === null) {
        const forms = hostConfigForms(ctx)
        if (forms === null) return false
        if (!bindServedForm(forms, ctx)) watchNamespace(forms, ctx)
      }
      if (prefsForm === null) return false
      loadPrefs()
      return true
    }

    /** Release the form and directory subscriptions this module opened. */
    function disposePrefsBinding() {
      if (prefsFormUnsubscribe !== null) {
        prefsFormUnsubscribe()
        prefsFormUnsubscribe = null
      }
      if (prefsWatchOff !== null) {
        prefsWatchOff()
        prefsWatchOff = null
      }
      prefsBinding = false
      prefsForm = null
    }

    /**
     * Browser-local fallback for the custom username.
     *
     * The host settings namespace is the authoritative store, but a running
     * host half may predate the `username` field. Persisting the value here
     * keeps the setting usable until the host is reloaded, and the host value
     * always wins once it carries a non-empty username.
     */
    const USERNAME_STORAGE_KEY = 'dsh-claude-style.username'
    let fallbackUsername = localStorage.getItem(USERNAME_STORAGE_KEY) || ''

    function readFallbackUsername() {
      return fallbackUsername
    }

    function setFallbackUsername(value) {
      fallbackUsername = value
      if (value) localStorage.setItem(USERNAME_STORAGE_KEY, value)
      else localStorage.removeItem(USERNAME_STORAGE_KEY)
    }

    /**
     * Runtime overrides that outrank the stored preferences. A feature that is
     * switched off after failing (src/entry.js) hands its surface back to the
     * host whatever the preference says: the footer takeover and the composer
     * restyle both HIDE host controls, and a takeover whose replacement is gone
     * would leave nothing in their place.
     */
    let footerTakeoverRetired = false
    let composerRestyleRetired = false

    /** Give the sidebar footer back to the host for the rest of this generation. */
    function retireFooterTakeover() {
      footerTakeoverRetired = true
      document.body.removeAttribute(FOOTER_ATTR)
    }

    /** Give the composer back to the host for the rest of this generation. */
    function retireComposerRestyle() {
      composerRestyleRetired = true
      document.body.removeAttribute(COMPOSER_ATTR)
    }

    /** The current preferences (live object; treat as read-only). */
    function readPrefs() {
      return prefs
    }

    /** Observe preference changes; returns the unsubscriber. */
    function subscribePrefs(listener) {
      prefsListeners.push(listener)
      return () => {
        const index = prefsListeners.indexOf(listener)
        if (index !== -1) prefsListeners.splice(index, 1)
      }
    }

    /**
     * Adopt a preference set: mirror it onto the document, then notify.
     * @param next - resolved preferences from the host.
     */
    function adoptPrefs(next) {
      prefs = next
      // The brand is one attribute write; the other preferences gate rules the
      // stylesheet and the scheduler read directly.
      document.body.setAttribute(BRAND_ATTR, next.brand)
      if (next.collapseFooter && !footerTakeoverRetired) document.body.setAttribute(FOOTER_ATTR, '')
      else document.body.removeAttribute(FOOTER_ATTR)
      notifyAll(prefsListeners, next)
    }

    /**
     * Read the preferences once. A failure keeps the defaults and leaves the
     * settings page to report that the store is unavailable.
     *
     * The form's subscription re-reads on every host change, so this call only
     * covers the case where the values are ready before the subscription
     * settles.
     */
    function loadPrefs() {
      if (prefsForm === null) return
      const formValue = readFormValue()
      if (formValue === null) return
      prefsAvailable = true
      const formName = typeof formValue.username === 'string' ? formValue.username.trim() : ''
      if (formName) setFallbackUsername('')
      adoptPrefs(normalizePrefs(formValue))
      replayPendingBanLocale(formValue)
    }

    /**
     * Clamp the hover-open preference. It used to be a boolean, and a value
     * stored in that shape still has to land on a scope: `true` meant every
     * popover, `false` meant click-only.
     */
    function normalizeAutoPopover(value) {
      if (value === true) return AUTO_POPOVER_ALL
      if (value === false) return AUTO_POPOVER_OFF
      return !AUTO_POPOVER_SCOPES.includes(value) ? DEFAULT_AUTO_POPOVER : value
    }

    /**
     * The provider ids the picker's first level carries. Ids rather than names:
     * a provider can be renamed by the catalog at any time, and the stored
     * selection has to survive that. Order is the caller's, duplicates dropped.
     * The official service is the picker's default, not a choice, so a stored
     * id for it is dropped: the first level shows it whenever nothing else is
     * picked, which is what "default" means.
     */
    function normalizeQuickProviders(value) {
      if (!Array.isArray(value)) return []
      const out = []
      for (let i = 0; i < value.length && out.length < QUICK_PROVIDERS_MAX; i++) {
        const id = value[i]
        if (typeof id !== 'string' || id === '' || id.length > PROVIDER_ID_MAX) continue
        if (id === MODEL_OFFICIAL_GROUP || out.includes(id)) continue
        out.push(id)
      }
      return out
    }

    /** Clamp one host value into the preference shape (the host already did this). */
    function normalizePrefs(value) {
      const section = value && typeof value === 'object' ? value : {}
      return {
        brand: section.brand === BRAND_ANTHROPIC || section.brand === BRAND_OFF ? section.brand : BRAND_CLAUDE,
        collapseFooter: section.collapseFooter !== false,
        autoPopover: normalizeAutoPopover(section.autoPopover),
        composerScope: !COMPOSER_SCOPES.includes(section.composerScope) ? 'all' : section.composerScope,
        modelPicker: section.modelPicker !== false,
        quickProviders: normalizeQuickProviders(section.quickProviders),
        username: (typeof section.username === 'string' ? section.username.trim().slice(0, USERNAME_MAX) : '') || fallbackUsername,
        banLocale: resolveBanLocale(section.banLocale),
        homeLayout: !HOME_LAYOUTS.includes(section.homeLayout) ? DEFAULT_HOME_LAYOUT : section.homeLayout,
      }
    }

    /**
     * Replay a language that was chosen while the running host half did not know
     * the field yet.
     *
     * Once per load, and only while a local fallback exists: on a host half that
     * still predates `banLocale` the write is dropped again (the fallback keeps
     * the choice), and on a reloaded one it lands, `savePrefs` sees the host echo
     * the value back and drops the fallback — so the setting migrates itself
     * instead of having to be picked again after the app restarts.
     */
    let banLocaleReplayed = false
    function replayPendingBanLocale(hostValue) {
      if (banLocaleReplayed || !fallbackBanLocale) return
      const hostLocale = hostValue && typeof hostValue.banLocale === 'string' ? hostValue.banLocale : ''
      if (hostLocale === fallbackBanLocale) return
      banLocaleReplayed = true
      savePrefs({ banLocale: fallbackBanLocale })
    }

    /**
     * Write a partial change through the official form.
     *
     * One `set()` per field, chained: the controller owns the write queue and
     * takes its revision fence from the last settlement, so a burst of toggles
     * cannot interleave or lose a field. `set()` also validates the field path
     * against the entry's Config before anything crosses the wire, which is why
     * an unknown key is dropped here rather than sent.
     *
     * @param patch - preference keys to change.
     * @returns a promise for the resolved preferences, or null when refused.
     */
    function savePrefsViaForm(patch) {
      const keys = []
      for (const key in patch) {
        if (Object.prototype.hasOwnProperty.call(patch, key)) keys.push(key)
      }
      const step = name => accepted => {
        if (accepted === false) return false
        let pending
        try {
          pending = prefsForm.set(name, patch[name])
        } catch (error) {
          // set() refuses a field path the entry's Config does not carry by
          // throwing before anything crosses the wire: that is a refusal, which
          // the caller answers with a re-read and the page's notice.
          return false
        }
        return pending && typeof pending.then === 'function'
          ? pending.then(ok => ok === true)
          : true
      }
      let run = Promise.resolve(true)
      for (let i = 0; i < keys.length; i++) run = run.then(step(keys[i]))
      return run.then(accepted => {
        if (accepted === false) {
          // Refused (a stale revision, or a field this Config does not carry):
          // re-read rather than guess.
          loadPrefs()
          return null
        }
        const value = readFormValue()
        if (value !== null) {
          prefsAvailable = true
          if (typeof patch.username === 'string') {
            const hostName = typeof value.username === 'string' ? value.username.trim() : ''
            setFallbackUsername(hostName ? '' : patch.username)
          }
          // The host echoing the value back is the only proof it knows the
          // field; anything else means the write did not land and the local
          // fallback has to keep it.
          if (typeof patch.banLocale === 'string') {
            const hostLocale = typeof value.banLocale === 'string' ? value.banLocale : ''
            setFallbackBanLocale(hostLocale === patch.banLocale ? '' : patch.banLocale)
          }
          adoptPrefs(normalizePrefs(value))
        }
        return prefs
      })
    }

    /**
     * Write a partial preference change.
     *
     * @param patch - preference keys to change.
     * @returns a promise for the resolved preferences, or null while the form
     *          does not carry values yet.
     */
    function savePrefs(patch) {
      if (prefsForm === null || readFormValue() === null) return Promise.resolve(null)
      return savePrefsViaForm(patch)
    }
