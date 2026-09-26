    /**
     * The host's access-mode trigger: the button its permission slot renders.
     * Every slot render site carries a `[data-slot="<key>"]` wrapper — the
     * host renderer's anchor contract for outside styles (ui-renderer
     * scoped-slots) — so this reads the same in every shell language. The
     * permission control inserts its own buttons beside the host's inside
     * that wrapper, so the skin's are skipped.
     */
    function findAccessTrigger() {
      return document.querySelector('[data-slot="conversation.input.permission"] button:not([class*="dsh-claude"])')
    }

    /** The sidebar footer, where the account row and the plugin footer entries live. */
    function findFootArea() {
      return document.querySelector('[class*="footArea"]')
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
      const uiSession = ctx.get('uiSession')
      const value = uiSession?.current?.value
      if (typeof value?.key === 'string') return value.key
      return sessions.list.getSnapshot().current
    }

    function currentSession(ctx) {
      const sessions = ctx.get('sessions')
      if (sessions === void 0 || sessions === null) return null
      const id = currentSessionId(ctx, sessions)
      if (id === void 0 || id === null) return null
      const binding = sessions.binding(id)
      if (binding === void 0 || binding === null) return null
      return binding.session === void 0 ? null : binding.session
    }

    function currentPreset(session) {
      const snapshot = session.projections.faceOf('permissions').getSnapshot()
      if (snapshot === void 0 || snapshot === null) return null
      // dsh 0.2+ projection faces hand back the bare value (e.g. the preset
      // id string); older hosts wrapped it as `{ currentValue }`.
      if (typeof snapshot === 'object' && 'currentValue' in snapshot) return snapshot.currentValue
      return snapshot
    }

    /**
     * Who the skin shows: one nickname and one picture, each resolved down a
     * fixed order.
     *
     * Nickname: the custom nickname (settings), the signed-in account's name,
     * the HDSL launcher's account name, the cached OS-user probe, the fresh
     * probe, then `User`. Picture: the signed-in account's avatar, the HDSL
     * launcher's avatar, then the brand mark the stylesheet draws underneath.
     *
     * Only the probe is resolved here. The account profile
     * (features/account/profile.js) and the HDSL contract push their values in
     * through the setters below, so the greeting, the account row and the hold
     * screen all read this one place.
     */
    let accountName = ''
    let accountAvatar = ''

    /** The account profile's contribution; called when its read answers. */
    function setAccountIdentity(name, avatar) {
      accountName = typeof name === 'string' ? name.trim() : ''
      accountAvatar = typeof avatar === 'string' ? avatar : ''
    }

    /**
     * Host-resolved username.
     *
     * The host half owns the OS user (`os.userInfo().username`); this side
     * fetches it once and caches it, and mirrors the answer into local storage
     * so a reload shows the name from the first frame instead of `User`. No
     * workspace parsing, no polling.
     */
    let usernameFromHost = ''
    let usernameRequested = false
    const usernameListeners = []

    /** Last OS-user probe this browser saw; the cache that outlives the page. */
    const PROBED_USERNAME_KEY = 'dsh-claude-style.probed-username'
    let probedUsername = readStoredProbeUsername()

    function readStoredProbeUsername() {
      return localStorage.getItem(PROBED_USERNAME_KEY) || ''
    }

    function storeProbeUsername(value) {
      if (value) localStorage.setItem(PROBED_USERNAME_KEY, value)
    }

    function onUsernameLoaded(listener) {
      usernameListeners.push(listener)
      return () => {
        const index = usernameListeners.indexOf(listener)
        if (index !== -1) usernameListeners.splice(index, 1)
      }
    }

    function loadUsername() {
      if (usernameRequested) return
      usernameRequested = true
      fetch(USERNAME_ROUTE, { credentials: 'same-origin' })
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          return response.json()
        })
        .then(data => {
          if (!data || data.ok !== true || typeof data.username !== 'string') return
          usernameFromHost = data.username.trim().slice(0, USERNAME_MAX)
          if (usernameFromHost) {
            probedUsername = usernameFromHost
            storeProbeUsername(usernameFromHost)
          }
          notifyAll(usernameListeners, usernameFromHost)
        }, () => { /* the host half did not answer: the cached probe or 'User' stays */ })
    }

    /**
     * The HDSL launcher's account contract, when this instance was launched by
     * it. Read once: the contract is fixed for the process lifetime.
     */
    let hdslContract = false
    let hdslName = ''
    let hdslAvatar = false
    let hdslRequested = false
    const hdslListeners = []

    function onHdslLoaded(listener) {
      hdslListeners.push(listener)
      return () => {
        const index = hdslListeners.indexOf(listener)
        if (index !== -1) hdslListeners.splice(index, 1)
      }
    }

    function loadHdsl() {
      if (hdslRequested) return
      hdslRequested = true
      fetch(HDSL_ROUTE, { credentials: 'same-origin' })
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          return response.json()
        })
        .then(data => {
          if (!data || data.ok !== true || data.contract !== true) return
          hdslContract = true
          hdslName = typeof data.name === 'string' ? data.name.trim().slice(0, USERNAME_MAX) : ''
          hdslAvatar = data.hasSkinImage === true
          notifyAll(hdslListeners)
        }, () => { /* the host half did not answer: the chain skips the launcher */ })
    }

    /**
     * The nickname every skin surface shows, or '' when nothing resolved.
     * @returns the winning name, without the `User` default.
     */
    function resolveDisplayName() {
      const custom = readPrefs().username || readFallbackUsername()
      if (custom) return custom
      if (accountName) return accountName
      if (hdslName) return hdslName
      if (probedUsername) return probedUsername
      return usernameFromHost
    }

    function getUsername() {
      return resolveDisplayName() || 'User'
    }

    /**
     * The picture every skin surface shows, or '' to let the brand mark show.
     * @returns the winning avatar address.
     */
    function resolveAvatarUrl() {
      if (accountAvatar) return accountAvatar
      if (hdslContract && hdslAvatar) return HDSL_SKIN_ROUTE
      return ''
    }

    /**
     * Host context reference for services that need to read host state
     * (e.g. locale) outside of apply(ctx)'s direct call stack.
     */
    let hostCtx = null
    function setHostContext(ctx) {
      hostCtx = ctx
      // A new host context means a new OS user and a new launcher: the next
      // apply resolves once again rather than reusing the previous host's
      // answers. The probe cache survives on purpose — it is the same machine
      // until something says otherwise.
      usernameRequested = false
      usernameFromHost = ''
      hdslRequested = false
      hdslContract = false
      hdslName = ''
      hdslAvatar = false
      accountName = ''
      accountAvatar = ''
    }
