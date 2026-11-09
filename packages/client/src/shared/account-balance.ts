import { CLIENT_VERSION } from 'virtual:dsh-claude-style/generated'
import { hostRemoteAccount } from '@dsh-claude-style/engine/host'
import { activeLocale } from '../core/i18n'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { HostAccountClient, HostWallet } from '@dsh-claude-style/contracts/account'

/** Host Remote validates this descriptor on every call; locale and zone must be read at call time.
 * CLIENT_VERSION is the bundle version because the host build version is unavailable here.
 */
export function accountClient(ctx: HostContext): HostAccountClient {
  return {
    version: CLIENT_VERSION,
    locale: activeLocale(ctx),
    timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
  }
}

/** One currency's whole balance, topped-up and gifted together, in micro units as the price figures are. */
export interface BalanceTotal {
  currency: HostWallet['currency']
  micro: number
}

/**
 * What the balance read came to: one total per currency, `none` when no
 * credential is stored (or the host serves no account), `failed` when the
 * platform or the call missed.
 */
export type AccountBalance =
  | { status: 'ready', totals: readonly BalanceTotal[] }
  | { status: 'none' }
  | { status: 'failed' }

/**
 * The wallets summed per currency, in the order their currencies first
 * appear. The platform writes each amount as a decimal string with up to
 * sixteen places; micro units are where formatMoneyMicro reads amounts.
 */
function totalsOf(wallets: readonly HostWallet[]): BalanceTotal[] {
  const totals = new Map<HostWallet['currency'], number>()
  for (const wallet of wallets) {
    const micro = Math.round(Number(wallet.balance) * 1_000_000)
    if (!Number.isFinite(micro)) throw new Error(`dsh-claude-style: the account balance "${wallet.balance}" is not a number`)
    totals.set(wallet.currency, (totals.get(wallet.currency) ?? 0) + micro)
  }
  return [...totals].map(([currency, micro]) => ({ currency, micro }))
}

/** How long one answer stands before the next ask reads the platform again. */
const BALANCE_TTL_MS = 60 * 1000

let held: { at: number, balance: AccountBalance } | null = null
let asking: Promise<AccountBalance> | null = null

/**
 * The account's balance, read from `remote.account.getBalance`: the wallets
 * the host's own account settings show, with the gifted ones added in. One answer is
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
    return { status: 'ready', totals: totalsOf([...result.value.value, ...result.value.bonusWallets]) }
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
