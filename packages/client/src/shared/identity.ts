import { HDSL_ROUTE, HDSL_SKIN_ROUTE, USERNAME_MAX, USERNAME_ROUTE } from '../constants'
import { readPrefs } from '../core/prefs'
import { createHostResource } from '@dsh-claude-style/engine/resource'

/** Identity precedence is custom name, account, launcher, cached OS probe, fresh probe; missing avatar shows the brand (D75). */
export let accountName = ''
export let accountAvatar = ''

/** The account profile's contribution; called when its read answers. */
export function setAccountIdentity(name: unknown, avatar: unknown) {
  accountName = typeof name === 'string' ? name.trim() : ''
  accountAvatar = typeof avatar === 'string' ? avatar : ''
}

/**
 * The host half owns the OS user (`os.userInfo().username`); this side fetches
 * it once, caches it and mirrors the answer into local storage so a reload
 * shows the name from the first frame. No workspace parsing, no polling.
 */
let usernameFromHost = ''

/** Last OS-user probe this browser saw; the cache that outlives the page. */
const PROBED_USERNAME_KEY = 'dsh-claude-style.probed-username'
let probedUsername = readStoredProbeUsername()

function readStoredProbeUsername() {
  return localStorage.getItem(PROBED_USERNAME_KEY) || ''
}

function storeProbeUsername(value: string) {
  if (value) localStorage.setItem(PROBED_USERNAME_KEY, value)
}

/** The host half's OS user; an answer the contract does not carry is not adopted. */
const usernameResource = createHostResource(USERNAME_ROUTE, (data) => {
  if (!data || data.ok !== true || typeof data.username !== 'string') return undefined
  usernameFromHost = data.username.trim().slice(0, USERNAME_MAX)
  if (usernameFromHost) {
    probedUsername = usernameFromHost
    storeProbeUsername(usernameFromHost)
  }
  return usernameFromHost
})

export function onUsernameLoaded(listener: (username: string) => void) {
  return usernameResource.onLoaded(listener)
}

export function loadUsername() {
  usernameResource.load()
}

let hdslContract = false
let hdslName = ''
let hdslAvatar = false

/**
 * The HDSL launcher's account contract, when this instance was launched by it.
 * An answer that is no contract is not adopted, so the chain skips the
 * launcher (D75).
 */
const hdslResource = createHostResource(HDSL_ROUTE, (data) => {
  if (!data || data.ok !== true || data.contract !== true) return undefined
  hdslContract = true
  hdslName = typeof data.name === 'string' ? data.name.trim().slice(0, USERNAME_MAX) : ''
  hdslAvatar = data.hasSkinImage === true
  return true
})

export function onHdslLoaded(listener: (adopted: true) => void) {
  return hdslResource.onLoaded(listener)
}

export function loadHdsl() {
  hdslResource.load()
}

/** The nickname every skin surface shows, or '' when nothing resolved. */
export function resolveDisplayName() {
  const custom = readPrefs().username
  if (custom) return custom
  if (accountName) return accountName
  if (hdslName) return hdslName
  if (probedUsername) return probedUsername
  return usernameFromHost
}

export function getUsername() {
  return resolveDisplayName() || 'User'
}

/** The picture every skin surface shows, or '' to let the brand mark show. */
export function resolveAvatarUrl() {
  if (accountAvatar) return accountAvatar
  if (hdslContract && hdslAvatar) return HDSL_SKIN_ROUTE
  return ''
}

/**
 * A new host context means a new OS user and a new launcher, so the next apply
 * resolves again. The probe cache survives on purpose: same machine.
 */
export function resetIdentity() {
  usernameResource.reset()
  usernameFromHost = ''
  hdslResource.reset()
  hdslContract = false
  hdslName = ''
  hdslAvatar = false
  accountName = ''
  accountAvatar = ''
}
