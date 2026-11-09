import { DS_BOT_SURFACE_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { SKIN_STAMP_ATTR } from '../constants'
import { subscribeMutations } from '@dsh-claude-style/engine/bus'

/**
 * Skin and ds-bot marks define page ownership (D74).
 * Until ds-bot's browser registry arrives, its saved mode prevents a Bot page flashing this theme.
 *

 *


 */
export type PageOwner = 'skin' | 'ds-bot'

/** ds-bot's id in the host's boot entry list. */
const DS_BOT_ENTRY_ID = 'ds-bot'
/** The local storage key ds-bot keeps its mode under: `agent`, or the Bot surface otherwise. */
const DS_BOT_MODE_KEY = 'ds-bot:surface'
const DS_BOT_AGENT_MODE = 'agent'

/** The boot list's answer, read once: the list is fixed at load. */
let dsBotEntry: boolean | null = null

/** Whether ds-bot is one of this page's client entries. */
export function dsBotInstalled() {
  if (dsBotEntry === null) {
    const entries = window.__DSH_BOOT__?.entries
    dsBotEntry = Array.isArray(entries) && entries.some(entry => entry?.id === DS_BOT_ENTRY_ID)
  }
  return dsBotEntry
}

/** Whether ds-bot's Bot surface has the page, or will have it once ds-bot's browser half runs. */
export function dsBotSurfaceActive() {
  if (!dsBotInstalled()) return false
  if (document.body.hasAttribute(DS_BOT_SURFACE_ATTRIBUTE)) return true
  if (window.dshBot !== undefined) return false
  return localStorage.getItem(DS_BOT_MODE_KEY) !== DS_BOT_AGENT_MODE
}

/** The page's owner right now; null while the theme has it. */
export function pageOwner(): PageOwner | null {
  if (document.documentElement.hasAttribute(SKIN_STAMP_ATTR)) return 'skin'
  if (dsBotSurfaceActive()) return 'ds-bot'
  return null
}

/**
 * Watch both owners' marks, and hear when the page's owner changes.
 *
 * The attributes are read; nothing is written. The callback fires only on a
 * real change: the caller reads `pageOwner()` itself at boot.
 *
 * @param listener - called with the new owner.
 * @returns unsubscribe.
 */
export function subscribePageOwner(listener: (owner: PageOwner | null) => void) {
  let last = pageOwner()
  const check = () => {
    const next = pageOwner()
    if (next === last) return
    last = next
    listener(next)
  }
  const offSkin = subscribeMutations(document.documentElement, { attributeFilter: [SKIN_STAMP_ATTR] }, check)
  const offBot = subscribeMutations(document.body, { attributeFilter: [DS_BOT_SURFACE_ATTRIBUTE] }, check)
  return () => {
    offSkin()
    offBot()
  }
}
