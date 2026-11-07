/**
 * The host's account service as the skin reads it (`remote.account`): the
 * identity each call carries, the profile read and the state stream. Read off the host build the way packages/contracts/src/services.ts is (D3).
 */

/**
 * The identity one account call carries, which the Host forwards to the
 * Platform as its client headers. The Remote takes it as the method's own
 * argument and the Host refuses a call whose argument fields do not match its
 * descriptor, so a call without it never reaches the Platform.
 */
export interface HostAccountClient {
  /** The calling client build's version. */
  version: string
  /** The UI language in effect when the call was made. */
  locale: string
  /** Seconds east of UTC, as `-new Date().getTimezoneOffset() * 60`. */
  timezoneOffsetSeconds: number
}

/** The account service (`remote.account`): the profile read, and the state stream. */
export interface HostAccountService {
  getProfile(client: HostAccountClient): Promise<HostAccountAnswer>
  watch(signal: AbortSignal): AsyncIterable<HostAccountFrame>
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
