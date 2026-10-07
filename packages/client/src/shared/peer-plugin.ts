import { subscribeMutations } from '../core/bus'
import { notifyEnvironmentChange } from '../core/prefs'
import { parkForeignSheets } from '../core/stylesheet'
import { notifyAll } from './notify'
import type { PeerPlugin } from '../core/feature'

/**
 * The other chat-behaviour plugin, when this page runs it.
 *
 * dsh-chat-ux implements the same chat-area interactions this skin ports
 * (docs/decisions D32): the same fold doors over the same clicks, the
 * same two seat keys at the same priority, the same token fade, the same
 * drawn caret. Two implementations of one behaviour on one page do not
 * merge — the fold doors both intercept the click and replay it at each
 * other, and the second seat registration at one priority throws. So while
 * that plugin is on the page the ported features stand down whole, and the
 * settings page says who took them over.
 *
 * Two signals, either one is enough:
 *
 *   boot    the host's own entry list (`window.__DSH_BOOT__.entries`), which
 *           names every installed client entry before any of them runs, so
 *           the answer holds from the first frame whichever plugin's bundle
 *           the loader evaluates first.
 *   style   the stylesheet that plugin keeps in the head while its browser
 *           half is live. Its own half mounts and removes it, so a plugin
 *           hot reload in either direction shows up here — which the boot
 *           list, fixed at load, cannot report.
 *
 * The boot list is read once, since it does not change after load. The
 * stylesheet is asked on every call, and while anybody is subscribed its
 * arrival or departure is noticed: a subscription to the head's child list
 * (the element is mounted there; the observation bus, D40) re-asks the
 * question and, when the answer changed, re-runs the environment — the
 * entry installs or tears down the features whose manifests yield to that
 * plugin (D42). The head is watched only while something is subscribed.
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

/**
 * Ask the question again and, when the answer moved, say so.
 *
 * What is compared is the answer last announced, not a snapshot of the head:
 * the head changes for many reasons (a stylesheet of anybody's), and only
 * this plugin's own presence is news.
 *
 * The same child list carries the stylesheets that arrive with no owner: a
 * sibling that mounts its sheet from `apply()` leaves it untagged, and the
 * next package to materialize would take it into that package's bookkeeping
 * and delete it at that package's next reload. This callback runs before
 * such a materialization — a mutation callback is a microtask, a
 * materialization is a later task — so the sheet is parked here (D33) while
 * it is still nobody's. This is the only hook the skin has for a sheet that
 * arrives after its own factory ran: `parkForeignSheets()` at module scope
 * covers the sheets already in the document, and nothing of the skin runs
 * between a sibling's append and that sibling's own materialization.
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

/**
 * Hear about dsh-chat-ux arriving on or leaving the page.
 *
 * @param listener - called with the new answer, only when it changes.
 * @returns unsubscribe.
 */
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
