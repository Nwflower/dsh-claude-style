import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { notifyEnvironmentChange } from '../core/prefs'
import { parkForeignSheets } from '../core/stylesheet'
import { notifyAll } from '@dsh-claude-style/engine/notify'
import type { PeerPlugin } from '../core/feature'

/** dsh-chat-ux owns the same interactions, so yielding features must stand down while it is present (D74).
 * The fixed boot list covers startup; its live stylesheet covers later mounts and hot reloads.
 */
/** The other plugin's id, as its entry appears in the boot list. */
const PEER_ENTRY_ID = 'dsh-chat-ux'
/** The `<style>` its browser half mounts while it is live. */
const PEER_STYLE_ID = 'dsh-chat-ux-style'

/** The boot list's answer, and whether it has been read. */
let peerEntrySeen = false
let peerEntryRead = false
/** The answer the last announcement carried; null before the first one. */
let peerAnnounced: boolean | null = null
/** Who hears about the answer changing. */
const peerListeners: ((present: boolean) => void)[] = []
/** Stops the head watch; set while at least one listener is subscribed. */
let stopHeadWatch: (() => void) | null = null

/**
 * Whether dsh-chat-ux is installed on this page right now.
 * @returns true while the ported chat features must stand down.
 */
function dshChatUxPresent() {
  if (document.getElementById(PEER_STYLE_ID) !== null) return true
  if (peerEntryRead) return peerEntrySeen
  peerEntryRead = true
  const entries = window.__DSH_BOOT__?.entries
  peerEntrySeen = Array.isArray(entries)
    && entries.some(entry => typeof entry?.id === 'string' && entry.id.includes(PEER_ENTRY_ID))
  return peerEntrySeen
}

/** Whether a plugin a manifest yields to is on the page right now. */
export function peerPresent(plugin: PeerPlugin) {
  if (plugin === PEER_ENTRY_ID) return dshChatUxPresent()
  throw new Error(`peer-plugin: no presence check for ${plugin}`)
}

/** Park untagged sibling sheets in this mutation microtask, before host materialization can claim them (D9).
 * Notify only when peer presence, rather than unrelated head content, changes.
 */
export function checkPeerPresence() {
  parkForeignSheets()
  const present = dshChatUxPresent()
  if (present === peerAnnounced) return
  peerAnnounced = present
  notifyAll(peerListeners, present)
  // The features that stand down by reading a preference hear about it
  // through the stream they already subscribe to; the one that claims seat
  // keys registers again on its own subscription above.
  notifyEnvironmentChange()
}

/** The first subscriber starts the head watch and the last stops it. */
export function subscribePeerPresence(listener: (present: boolean) => void) {
  peerListeners.push(listener)
  if (stopHeadWatch === null) {
    stopHeadWatch = subscribeMutations(document.head, { childList: true }, checkPeerPresence)
    peerAnnounced = dshChatUxPresent()
  }
  return () => {
    const at = peerListeners.indexOf(listener)
    if (at >= 0) peerListeners.splice(at, 1)
    if (peerListeners.length > 0 || stopHeadWatch === null) return
    stopHeadWatch()
    stopHeadWatch = null
  }
}
