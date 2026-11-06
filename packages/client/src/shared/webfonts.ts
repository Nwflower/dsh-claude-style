import { WEBFONTS_PLUGIN_CSS, WEBFONTS_ROUTE, WEBFONTS_STYLE_ID } from '../constants'
import { createHostResource } from '@dsh-claude-style/engine/resource'
import type { WebfontsAnswer } from '@dsh-claude-style/contracts/webfonts'
import { mountStylesheet } from '../core/stylesheet'
import { webfontRules } from './webfont-rules'

/**
 * Registering the optional webfonts the reader put in place (D75).
 *
 * The host half reports which of the three Anthropic faces the drop point holds
 * and the rules are written for those alone; the mechanisms behind the request
 * and the sheet are the host resource and the stylesheet mount
 * (packages/engine/src/resource.ts, packages/engine/src/stylesheet.ts).
 */

/** The host half's answer, asked once per page; the faces it names are the ones the drop point holds. */
const fontsInPlace = createHostResource(WEBFONTS_ROUTE, (data) => {
  const answer = data as Partial<WebfontsAnswer> | null
  return Array.isArray(answer?.faces) ? answer.faces.filter((name): name is string => typeof name === 'string') : undefined
})

/** The answer in hand, kept for a generation that takes the page after this one. */
let faces: string[] | null = null

/**
 * Register the faces the drop point holds.
 *
 * The answer arrives after the page has painted, which `font-display: swap`
 * covers: the stacks paint the look-alike faces meanwhile, and a face that
 * arrives swaps in. One answer serves every generation on the page; the next
 * page load asks again, so a file dropped in meanwhile is registered then.
 *
 * @returns this generation's stop function.
 */
export function installWebfonts() {
  let stopped = false
  let stopSheet: (() => void) | null = null
  /** Mount the rules once; with no face in place there is nothing to declare. */
  function register(names: string[]) {
    if (stopped || stopSheet !== null) return
    const rules = webfontRules(names)
    if (rules === '') return
    stopSheet = mountStylesheet(WEBFONTS_STYLE_ID, rules, WEBFONTS_PLUGIN_CSS)
  }
  const off = fontsInPlace.onLoaded((names) => {
    faces = names
    register(names)
  })
  fontsInPlace.load()
  if (faces !== null) register(faces)
  return () => {
    stopped = true
    off()
    if (stopSheet !== null) stopSheet()
    stopSheet = null
  }
}
