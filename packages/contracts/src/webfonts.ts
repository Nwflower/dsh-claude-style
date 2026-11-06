/**
 * The optional webfonts both halves handle (D75): the faces the package does
 * not carry, the family each one is declared under, and the answer the route
 * that reports them sends.
 */

/** One face the reader may supply: the stylesheet family's name and the file the drop point holds. */
export interface OptionalWebfont {
  family: string
  file: string
}

/**
 * The Anthropic faces. They are not in the npm package (they remain Anthropic's
 * property), so the stylesheet declares no `@font-face` for them: one for a file
 * that is not there is fetched on every load and answers 404. The browser half
 * declares only the ones the drop point holds, and a copy installed on the
 * system still resolves, because no `@font-face` shadows its name.
 */
export const OPTIONAL_WEBFONTS: readonly OptionalWebfont[] = [
  { family: 'Anthropic Sans Web Text', file: 'AnthropicSansWebText.ttf' },
  { family: 'Anthropic Serif Web Text', file: 'AnthropicSerifWebText.ttf' },
  { family: 'Anthropic Mono Web', file: 'AnthropicMonoWeb.ttf' },
]

/** The status route's answer: the file names the drop point holds right now. */
export interface WebfontsAnswer {
  ok: true
  faces: string[]
}
