/** Host `remote.account` contract, read from the host build (D3). */

/** The Host forwards this identity as Platform client headers and rejects calls whose fields miss the descriptor. */
export interface HostAccountClient {
  /** The calling client build's version. */
  version: string
  /** The UI language in effect when the call was made. */
  locale: string
  /** Seconds east of UTC, as `-new Date().getTimezoneOffset() * 60`. */
  timezoneOffsetSeconds: number
}

/** `remote.account` profile, balance and state-stream surface. */
export interface HostAccountService {
  getProfile(client: HostAccountClient): Promise<HostAccountAnswer>
  getBalance(client: HostAccountClient): Promise<HostBalanceAnswer>
  watch(signal: AbortSignal): AsyncIterable<HostAccountFrame>
}

/** Null means no credential; `failed` means the Platform missed; gifted wallets stay separate. */
export interface HostBalanceAnswer {
  ok?: boolean
  value?: { status: 'ready', value: HostWallet[], bonusWallets: HostWallet[] } | { status: 'failed' } | null
}

/** One wallet: its currency and its amount as the platform's decimal string. */
export interface HostWallet {
  currency: 'CNY' | 'USD'
  balance: string
}

/** The profile read's answer: the profile, or nothing when no credential is stored. */
export interface HostAccountAnswer {
  ok?: boolean
  value?: HostAccountProfile
}

/** One account profile: `ready` once its platform answered, with the name, contact and picture. */
interface HostAccountProfile {
  status?: string
  value?: { name?: string, contact?: string, avatarUrl?: string }
  avatarUrl?: string
  /** The host some platforms answer with: the profile nested under its own key. */
  profile?: HostAccountProfile
}

/** One frame of the account state stream: whether a credential is stored, and how a sign-in is doing. */
export interface HostAccountFrame {
  status?: string
  attempt?: { phase?: string, id?: string }
}
