/** Optional user-supplied webfont contract shared by both halves (D75). */

/** One face the reader may supply: the stylesheet family's name, the file the drop point holds, and the name the settings page reports it by. */
export interface OptionalWebfont {
  family: string
  file: string
  /** The face as a reader names it: the family without its web-specific suffix. */
  label: string
}

/**
 * Anthropic faces are not shipped. Declare only files present at the drop point;
 * omitting `@font-face` avoids repeated 404s and lets system-installed faces resolve.
 */
export const OPTIONAL_WEBFONTS: readonly OptionalWebfont[] = [
  { family: 'Anthropic Sans Web Text', file: 'AnthropicSansWebText.ttf', label: 'Anthropic Sans' },
  { family: 'Anthropic Serif Web Text', file: 'AnthropicSerifWebText.ttf', label: 'Anthropic Serif' },
  { family: 'Anthropic Mono Web', file: 'AnthropicMonoWeb.ttf', label: 'Anthropic Mono' },
]

/** The status route's answer: the file names the drop point holds right now. */
export interface WebfontsAnswer {
  ok: true
  faces: string[]
}
