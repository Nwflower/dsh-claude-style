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
