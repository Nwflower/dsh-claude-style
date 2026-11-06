import { OPTIONAL_WEBFONTS } from '@dsh-claude-style/contracts/webfonts'
import { FONT_FILES_ROUTE } from '../constants'

/**
 * The `@font-face` rules for the optional faces the reader put in place (D75).
 *
 * The three Anthropic faces are not in the npm package, so the stylesheet
 * declares no `@font-face` for them: one pointing at a file that is not there is
 * fetched on every load and answers 404. Only the faces the host half reports are
 * declared, and a copy installed on the system still resolves through the stacks,
 * because no `@font-face` shadows its name.
 */

/**
 * The rules for the faces in place.
 *
 * All three are static Regular cuts, so one 400 declaration covers each and the
 * browser synthesizes the heavier weights (the faces the package ships are
 * declared beside them in theme/typography.css).
 *
 * @param faces - the file names the host half reported.
 * @returns the rules, or an empty string when none is in place.
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
