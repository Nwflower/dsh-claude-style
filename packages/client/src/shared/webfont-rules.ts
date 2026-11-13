import { OPTIONAL_WEBFONTS } from '@dsh-claude-style/contracts/webfonts'
import { FONT_FILES_ROUTE } from '../constants'

/** Declare only host-reported files so absent Anthropic fonts cause no requests (D75).
 * These are static Regular cuts; the browser synthesizes other weights.
 */
export function webfontRules(faces: readonly string[]): string {
  return OPTIONAL_WEBFONTS
    .filter(face => faces.includes(face.file))
    .map(face => `@font-face {
  font-family: '${face.family}';
  src: url('${FONT_FILES_ROUTE}${face.file}') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}`)
    .join('\n\n')
}

/**
 * The faces the page cannot draw, as a reader names them, in the contract's
 * order: `present` answers whether one face resolves anywhere — the system's
 * own copy or the drop point's file (shared/font-presence.ts). The settings page
 * reports them under the typeface row (D75).
 */
export function unavailableWebfonts(present: (face: typeof OPTIONAL_WEBFONTS[number]) => boolean): string[] {
  return OPTIONAL_WEBFONTS.filter(face => !present(face)).map(face => face.label)
}
