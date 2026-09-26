    /**
     * The signed-in account, when the desktop has one: `remote.account.getProfile()`
     * resolves to a profile whose `status` is 'ready' and whose value carries the
     * nickname and the avatar URL. Read leniently by NAME (the same way the archive
     * registry is read), so a host without the account plugin simply keeps the
     * hand-drawn mark and the stored username.
     *
     * The profile is a platform request on the host, so it is read only when the
     * account can have changed: once the account service is up for this
     * generation (a cold start or a hot reload) and when the account stream
     * reports a sign-in or a sign-out (followAccount). A read that comes back without an answer — the platform
     * timed out, or the credential changed under it and the host aborted it, as
     * happens during a sign-in — is retried a few times, then left to the next
     * change; the row keeps what it shows meanwhile.
     */
    function createAccountProfile(ctx, onChange) {
      var accountName = null
      var accountAvatar = null
      var ACCOUNT_RETRY_MS = [2000, 10000, 30000]
      var accountRead = 0
      var accountRetry = null
      var accountRetries = 0

      function accountService() {
        var account = null
        try { account = ctx.get('remote.account') } catch (error) { account = null }
        return account === undefined ? null : account
      }

      function showAccount(name, avatar) {
        if (name === accountName && avatar === accountAvatar) return
        accountName = name
        accountAvatar = avatar
        // The greeting, the account rows and the hold screen read one identity
        // store (src/core/host.js); this feature supplies its account half.
        setAccountIdentity(name, avatar)
        // Nothing in the DOM changed, so no mutation will schedule the pass that
        // paints the new name and picture: ask for one. (A body attribute used to
        // stand in for this, but the observer's attributeFilter never sees it.)
        onChange()
      }

      /** Drop the read in flight (its answer is ignored) and any retry waiting. */
      function dropAccountRead() {
        accountRead++
        if (accountRetry !== null) {
          clearTimeout(accountRetry)
          accountRetry = null
        }
      }

      function retryAccount() {
        if (accountRetries >= ACCOUNT_RETRY_MS.length) return
        accountRetry = setTimeout(function () {
          accountRetry = null
          loadAccount()
        }, ACCOUNT_RETRY_MS[accountRetries++])
      }

      function loadAccount() {
        var account = accountService()
        if (account === null || typeof account.getProfile !== 'function') return
        dropAccountRead()
        var read = accountRead
        account.getProfile().then(function (result) {
          if (read !== accountRead) return
          if (!result || result.ok !== true) { retryAccount(); return }
          if (!result.value) {
            // `null` is the host's "no credential" — unless the stream says one
            // is stored, and then it changed while this read was out.
            if (accountState !== null && accountState !== 'signed-out') retryAccount()
            else showAccount(null, null)
            return
          }
          var profile = result.value.profile || result.value
          // A 'failed' profile is a platform miss, not a sign-out.
          if (!profile || profile.status !== 'ready' || !profile.value) { retryAccount(); return }
          accountRetries = 0
          showAccount(profile.value.name || profile.value.contact || null, profile.value.avatarUrl || profile.avatarUrl || null)
        }, function () {
          if (read === accountRead) retryAccount()
        })
      }

      /**
       * One frame of the host's account state (`remote.account.watch`). A read
       * follows only the frames after which the row can owe a different
       * profile: the first one (this generation starting), a flip between signed
       * out and a stored credential, and a sign-in that stores a new credential
       * over a stored one. The rest — a sign-in still waiting on the browser, a
       * failed attempt, the same state again after a reconnect — read nothing.
       */
      var accountState = null
      var accountSignIn = null
      function onAccountState(view) {
        if (view === null || typeof view !== 'object') return
        var signedIn = view.status === 'credential-stored'
        var attempt = view.attempt
        if (!signedIn) accountSignIn = null
        else if (attempt && (attempt.phase === 'committing' || attempt.phase === 'succeeded')) accountSignIn = attempt.id
        var state = signedIn ? 'signed-in:' + (accountSignIn || '') : 'signed-out'
        if (state === accountState) return
        accountState = state
        accountRetries = 0
        if (signedIn) {
          loadAccount()
        } else {
          dropAccountRead()
          showAccount(null, null)
        }
      }

      var accountStream = null

      /** Close this generation's account stream and drop its reads. */
      function stopFollowingAccount() {
        dropAccountRead()
        if (accountStream === null) return
        var stream = accountStream
        accountStream = null
        if (document.body.__dshAccountStream === stream) document.body.__dshAccountStream = null
        try { stream.dispose() } catch (error) { /* already closed */ }
      }

      /**
       * Follow the account stream the host's own account UI reads, through
       * `remote.$stream`, which reopens it across reconnects. It is an async
       * iterable; this half is ES5, so it is stepped by hand.
       *
       * Client HMR drops the old generation's disposals, so its stream would stay
       * open and read again on every sign-in. The newest generation marks the
       * page with its stream; an older one that finds another mark closes its
       * own instead of reading.
       * @returns whether there is a stream to follow.
       */
      function followAccount() {
        var account = accountService()
        var remote = null
        try { remote = ctx.get('remote') } catch (error) { remote = null }
        if (account === null || typeof account.watch !== 'function' || !remote || typeof remote.$stream !== 'function' ||
            typeof Symbol !== 'function' || !Symbol.asyncIterator) return false
        var stream = remote.$stream({
          name: 'dsh-claude-style account',
          open: function (signal) { return account.watch(signal) },
          ended: function () { return new Error('account stream ended') }
        })
        var frames = stream[Symbol.asyncIterator]()
        accountStream = stream
        document.body.__dshAccountStream = stream
        function next() {
          frames.next().then(function (step) {
            if (accountStream !== stream || step.done) return
            if (document.body.__dshAccountStream !== stream) { stopFollowingAccount(); return }
            onAccountState(step.value.value)
            if (typeof step.value.accept === 'function') step.value.accept()
            next()
          }, function () {
            // Closed for good. Before a first frame that would leave the row
            // with no read at all.
            if (accountStream === stream && accountState === null) loadAccount()
          })
        }
        next()
        return true
      }

      /**
       * The account service mounts after this plugin does (the host registers
       * each remote namespace as its package loads), so reading it at install
       * found nothing on the desktop: the name only ever arrived with the old
       * poll's first tick, a minute in. Wait for it the way the settings section
       * waits for `slots`. With the stream, its first frame makes the first
       * read; a host without `ctx.inject` gets one read now.
       */
      var accountFiber = null
      if (typeof ctx.inject === 'function') {
        accountFiber = ctx.inject(['remote.account'], function (scope) {
          scope.effect(function () {
            if (!followAccount()) loadAccount()
            return stopFollowingAccount
          }, 'dsh-claude-style: account')
        })
      } else if (!followAccount()) {
        loadAccount()
      }
      return {
        name: function () { return accountName },
        avatar: function () { return accountAvatar },
        state: function () { return accountState },
        service: accountService,
        apply: onAccountState,
        stop: function () {
          if (accountFiber !== null && typeof accountFiber.dispose === 'function') {
            try { accountFiber.dispose() } catch (error) { /* the fiber may already be gone */ }
          }
          stopFollowingAccount()
        }
      }
    }
