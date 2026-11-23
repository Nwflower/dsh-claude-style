import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { REWIND_PEER_SHEET_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { REWIND_PEER_PACKAGE } from '@dsh-claude-style/contracts/session-rewind'
import { notifyEnvironmentChange } from '../core/prefs'
import { parkForeignSheets } from '../core/stylesheet'
import { notifyAll } from '@dsh-claude-style/engine/notify'
import type { PeerPlugin } from '../core/feature'

/**
 * Other plugins that own behaviour this skin also carries. dsh-chat-ux owns the
 * ported chat interactions (D74); dsh-rewind owns the rewind write actions and
 * their checkpoints (D111). The fixed boot list covers startup; each plugin's
 * live stylesheet covers later mounts and hot reloads.
 */
interface PeerMarks {
  /** The plugin's id, as its entry appears in the boot list. */
  entry: string
  /** Whether its browser half has its stylesheet mounted right now. */
  live(): boolean
}

const PEERS: Readonly<Record<PeerPlugin, PeerMarks>> = {
  'dsh-chat-ux': { entry: 'dsh-chat-ux', live: () => document.getElementById('dsh-chat-ux-style') !== null },
  'dsh-rewind': { entry: REWIND_PEER_PACKAGE, live: () => document.head.querySelector(REWIND_PEER_SHEET_SELECTOR) !== null },
}
const PEER_PLUGINS = Object.keys(PEERS) as PeerPlugin[]

/** The boot list's answer for each plugin, read once: the list is fixed for the page's life. */
const entrySeen = new Map<PeerPlugin, boolean>()
/** The answers the last announcement carried; empty before the first one. */
const announced = new Map<PeerPlugin, boolean>()
/** Who hears about any answer changing. */
const peerListeners: (() => void)[] = []
/** Stops the head watch; set while at least one listener is subscribed. */
let stopHeadWatch: (() => void) | null = null

/** Whether the boot list names this plugin's entry. */
function bootListNames(plugin: PeerPlugin) {
  const seen = entrySeen.get(plugin)
  if (seen !== undefined) return seen
  const entries = window.__DSH_BOOT__?.entries
  const named = Array.isArray(entries)
    && entries.some(entry => typeof entry?.id === 'string' && entry.id.includes(PEERS[plugin].entry))
  entrySeen.set(plugin, named)
  return named
}

/** Whether a plugin that owns behaviour this skin also carries is on the page right now. */
export function peerPresent(plugin: PeerPlugin) {
  return PEERS[plugin].live() || bootListNames(plugin)
}

/** Every plugin's answer, written into `announced`; true when any of them changed. */
function announce() {
  let changed = false
  for (const plugin of PEER_PLUGINS) {
    const present = peerPresent(plugin)
    if (announced.get(plugin) === present) continue
    announced.set(plugin, present)
    changed = true
  }
  return changed
}

/** Park untagged sibling sheets in this mutation microtask, before host materialization can claim them (D9).
 * Notify only when a plugin's presence, rather than unrelated head content, changes.
 */
export function checkPeerPresence() {
  parkForeignSheets()
  if (!announce()) return
  notifyAll(peerListeners)
  // The features that stand down by reading a preference hear about it
  // through the stream they already subscribe to; the one that claims seat
  // keys registers again on its own subscription above.
  notifyEnvironmentChange()
}

/** The first subscriber starts the head watch and the last stops it. A listener reads `peerPresent` for the plugin it cares about. */
export function subscribePeerPresence(listener: () => void) {
  peerListeners.push(listener)
  if (stopHeadWatch === null) {
    stopHeadWatch = subscribeMutations(document.head, { childList: true }, checkPeerPresence)
    announce()
  }
  return () => {
    const at = peerListeners.indexOf(listener)
    if (at >= 0) peerListeners.splice(at, 1)
    if (peerListeners.length > 0 || stopHeadWatch === null) return
    stopHeadWatch()
    stopHeadWatch = null
  }
}
