import { CLIENT_VERSION } from 'virtual:dsh-claude-style/generated'
import { hostRemoteAccount } from '@dsh-claude-style/engine/host'
import { activeLocale } from '../core/i18n'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { HostAccountClient, HostWallet } from '@dsh-claude-style/contracts/account'

/**
 * The identity every account call carries. The Remote requires it as the
 * method's own argument: the Host refuses a call whose argument fields do
 * not match its descriptor, so a call without it never reaches the
 * Platform. Each field is read at call time, so a language or a zone change
 * reaches the next read. The version is this bundle's own build version —
 * the DSH build the page runs is readable from no host service the browser
 * half can see.
 */
export function accountClient(ctx: HostContext): HostAccountClient {
  return {
    version: CLIENT_VERSION,
    locale: activeLocale(ctx),
    timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
  }
}

/**
 * What the balance read came to: the wallets, `none` when no credential is
 * stored (or the host serves no account), `failed` when the platform or the
 * call missed.
 */
export type AccountBalance =
  | { status: 'ready', wallets: readonly HostWallet[] }
  | { status: 'none' }
  | { status: 'failed' }

/** How long one answer stands before the next ask reads the platform again. */
const BALANCE_TTL_MS = 60 * 1000

let held: { at: number, balance: AccountBalance } | null = null
let asking: Promise<AccountBalance> | null = null

/**
 * The account's balance, read from `remote.account.getBalance` — the wallets
 * the host's own account settings show, the gifted ones apart. One answer is
 * kept for BALANCE_TTL_MS and an ask in flight is shared, so a reader passing
 * the pointer back and forth costs one platform request a minute.
 */
export function readAccountBalance(ctx: HostContext): Promise<AccountBalance> {
  if (held !== null && Date.now() - held.at < BALANCE_TTL_MS) return Promise.resolve(held.balance)
  if (asking !== null) return asking
  const account = hostRemoteAccount(ctx)
  if (account === null || typeof account.getBalance !== 'function') return Promise.resolve({ status: 'none' })
  const ask = account.getBalance(accountClient(ctx)).then((result): AccountBalance => {
    if (!result || result.ok !== true || result.value === undefined) return { status: 'failed' }
    if (result.value === null) return { status: 'none' }
    if (result.value.status !== 'ready') return { status: 'failed' }
    return { status: 'ready', wallets: result.value.value }
  }, (): AccountBalance => {
    // A rejected Remote call is a miss like a failed status: the bubble says
    // so, and the next ask reads again.
    return { status: 'failed' }
  }).then(balance => {
    // A miss is not kept, so the next hover asks again.
    held = balance.status === 'failed' ? null : { at: Date.now(), balance }
    asking = null
    return balance
  })
  asking = ask
  return ask
}

/** Forget the answer kept: the account it belongs to signed out or changed. */
export function forgetAccountBalance() {
  held = null
}
