import { OPTIONAL_WEBFONTS } from '@dsh-claude-style/contracts/webfonts'
import { WEBFONTS_PLUGIN_CSS, WEBFONTS_ROUTE, WEBFONTS_STYLE_ID } from '../constants'
import { createHostResource } from '@dsh-claude-style/engine/resource'
import type { WebfontsAnswer } from '@dsh-claude-style/contracts/webfonts'
import { mountStylesheet } from '../core/stylesheet'
import { familyResolves } from './font-presence'
import { unavailableWebfonts, webfontRules } from './webfont-rules'

/** Register only optional faces reported by the host half (D75). */

/** The host half's answer, asked once per page; the faces it names are the ones the drop point holds. */
const fontsInPlace = createHostResource(WEBFONTS_ROUTE, (data) => {
  const answer = data as Partial<WebfontsAnswer> | null
  return Array.isArray(answer?.faces) ? answer.faces.filter((name): name is string => typeof name === 'string') : undefined
})

/** The faces the page cannot draw, or null before the page has measured them. */
let unavailable: readonly string[] | null = null

/** Everyone waiting to hear which faces the page cannot draw. */
const listeners: ((labels: readonly string[]) => void)[] = []

/**
 * The faces the page cannot draw, as a reader names them, or null before the
 * page has measured them. A face counts as drawn wherever it comes from — a copy
 * installed on the system or the drop point's file — so the settings page
 * reports a face only where neither path provides it (D75).
 */
export function webfontsUnavailable(): readonly string[] | null {
  return unavailable
}

/** Hear the measurement; a listener registered after it is called with it at once. The returned call removes it. */
export function subscribeWebfontPresence(listener: (labels: readonly string[]) => void) {
  listeners.push(listener)
  if (unavailable !== null) listener(unavailable)
  return () => {
    const index = listeners.indexOf(listener)
    if (index !== -1) listeners.splice(index, 1)
  }
}

/** Measure every face and tell the listeners; the page's own stacks are what decide. */
function publish() {
  unavailable = unavailableWebfonts(face => familyResolves(face.stack))
  for (const listener of [...listeners]) listener(unavailable)
}

/**
 * Measure again once the faces a sheet just declared have loaded. A declared
 * face loads on first use, so each one is asked for by name; the answer arrives
 * after the page's fonts settle.
 */
function remeasure(names: readonly string[]) {
  const loads = OPTIONAL_WEBFONTS
    .filter(face => names.includes(face.file))
    .map(face => document.fonts.load(`16px "${face.family}"`))
  if (loads.length === 0) return
  void Promise.all(loads).then(() => document.fonts.ready).then(() => publish())
}

/** The asynchronous answer uses `font-display: swap`; one page shares it across generations. */
export function installWebfonts() {
  let stopped = false
  let stopSheet: (() => void) | null = null
  /** Mount the rules once; with no face in place there is nothing to declare. */
  function register(names: readonly string[]) {
    if (stopped || stopSheet !== null) return
    const rules = webfontRules(names)
    if (rules === '') return
    stopSheet = mountStylesheet(WEBFONTS_STYLE_ID, rules, WEBFONTS_PLUGIN_CSS)
    // The sheet's faces are the ones that arrive late; the page's own copies are
    // already there, so the first measurement answers before this.
    remeasure(names)
  }
  const off = fontsInPlace.onLoaded(register)
  fontsInPlace.load()
  publish()
  return () => {
    stopped = true
    off()
    if (stopSheet !== null) stopSheet()
    stopSheet = null
  }
}
