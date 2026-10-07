import { CLIENT_VERSION } from 'virtual:dsh-claude-style/generated'
import { setAccountIdentity } from '../../core/host'
import { activeLocale } from '../../core/i18n'
import type { HostContext, HostFiber } from '../../core/host'
import type { HostAccountAnswer, HostAccountClient, HostAccountFrame, HostAccountService, HostStream, HostStreamStep } from '@dsh-claude-style/contracts/services'

/**
 * The signed-in account, when the desktop has one: `remote.account.getProfile(client)`
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
export function createAccountProfile(ctx: HostContext, onChange: () => void) {
  let accountName: string | null = null
  let accountAvatar: string | null = null
  const ACCOUNT_RETRY_MS = [2000, 10000, 30000]
  let accountRead = 0
  let accountRetry: ReturnType<typeof setTimeout> | null = null
  let accountRetries = 0

  function accountService(): HostAccountService | null {
    return ctx.get('remote.account') ?? null
  }

  /**
   * The identity every account call carries. The Remote requires it as the
   * method's own argument: the Host refuses a call whose argument fields do
   * not match its descriptor, so a call without it never reaches the
   * Platform. Each field is read at call time, so a language or a zone change
   * reaches the next read. The version is this bundle's own build version —
   * the DSH build the page runs is readable from no host service the browser
   * half can see.
   */
  function accountClient(): HostAccountClient {
    return {
      version: CLIENT_VERSION,
      locale: activeLocale(ctx),
      timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
    }
  }

  function showAccount(name: string | null, avatar: string | null) {
    if (name === accountName && avatar === accountAvatar) return
    accountName = name
    accountAvatar = avatar
    // The greeting, the account rows and the hold screen read one identity
    // store (packages/client/src/core/host.ts); this feature supplies its account half.
    setAccountIdentity(name, avatar)
    // Nothing in the DOM changed, so no mutation will schedule the pass that
    // paints the new name and picture: ask for one.
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
    accountRetry = setTimeout(() => {
      accountRetry = null
      loadAccount()
    }, ACCOUNT_RETRY_MS[accountRetries++])
  }

  function loadAccount() {
    const account = accountService()
    if (account === null || typeof account.getProfile !== 'function') return
    dropAccountRead()
    const read = accountRead
    account.getProfile(accountClient()).then((result: HostAccountAnswer) => {
      if (read !== accountRead) return
      if (!result || result.ok !== true) { retryAccount(); return }
      if (!result.value) {
        // `null` is the host's "no credential" — unless the stream says one
        // is stored, and then it changed while this read was out.
        if (accountState !== null && accountState !== 'signed-out') retryAccount()
        else showAccount(null, null)
        return
      }
      const profile = result.value.profile || result.value
      // A 'failed' profile is a platform miss, not a sign-out.
      if (!profile || profile.status !== 'ready' || !profile.value) { retryAccount(); return }
      accountRetries = 0
      showAccount(profile.value.name || profile.value.contact || null, profile.value.avatarUrl || profile.avatarUrl || null)
    }, () => {
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
  let accountState: string | null = null
  let accountSignIn: string | null = null
  function onAccountState(view: HostAccountFrame) {
    if (view === null || typeof view !== 'object') return
    const signedIn = view.status === 'credential-stored'
    const attempt = view.attempt
    if (!signedIn) accountSignIn = null
    else if (attempt && (attempt.phase === 'committing' || attempt.phase === 'succeeded')) accountSignIn = attempt.id ?? null
    const state = signedIn ? `signed-in:${accountSignIn || ''}` : 'signed-out'
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

  let accountStream: HostStream<HostAccountFrame> | null = null

  /** Close this generation's account stream and drop its reads. */
  function stopFollowingAccount() {
    dropAccountRead()
    if (accountStream === null) return
    const stream = accountStream
    accountStream = null
    if (document.body.__dshAccountStream === stream) document.body.__dshAccountStream = null
    stream.dispose()
  }

  /**
   * Follow the account stream the host's own account UI reads, through
   * `remote.$stream`, which reopens it across reconnects. It is an async
   * iterable, stepped by hand: leaving a `for await` would call the
   * iterator's return() and close the stream, whose disposal belongs to
   * stopFollowingAccount().
   *
   * Client HMR drops the old generation's disposals, so its stream would stay
   * open and read again on every sign-in. The newest generation marks the
   * page with its stream; an older one that finds another mark closes its
   * own instead of reading.
   * @returns whether there is a stream to follow.
   */
  function followAccount() {
    const account = accountService()
    const remote = ctx.get('remote')
    if (account === null || typeof account.watch !== 'function' || typeof remote?.$stream !== 'function') return false
    const stream = remote.$stream({
      name: 'dsh-claude-style account',
      open(signal: AbortSignal) { return account.watch(signal) },
      ended() { return new Error('account stream ended') }
    })
    const frames = stream[Symbol.asyncIterator]()
    accountStream = stream
    document.body.__dshAccountStream = stream
    function next() {
      frames.next().then((step: HostStreamStep<HostAccountFrame>) => {
        if (accountStream !== stream || step.done) return
        if (document.body.__dshAccountStream !== stream) { stopFollowingAccount(); return }
        onAccountState(step.value.value)
        if (typeof step.value.accept === 'function') step.value.accept()
        next()
      }, () => {
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
  let accountFiber: HostFiber | null = null
  if (typeof ctx.inject === 'function') {
    accountFiber = ctx.inject(['remote.account'], scope => {
      scope.effect(() => {
        if (!followAccount()) loadAccount()
        return stopFollowingAccount
      }, 'dsh-claude-style: account')
    })
  } else if (!followAccount()) {
    loadAccount()
  }
  // The profile's only outward job is its own lifetime: the identity it
  // reads lands in the shared store (setAccountIdentity), which every
  // reader — the greeting, the rows, the hold screen — already follows.
  return {
    stop() {
      if (accountFiber !== null && typeof accountFiber.dispose === 'function') {
        accountFiber.dispose()
      }
      stopFollowingAccount()
    }
  }
}
