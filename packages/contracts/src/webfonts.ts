/** Optional user-supplied webfont contract shared by both halves (D75). */

/**
 * One face the reader may supply: the stylesheet family's name, the file the
 * drop point holds, the names the settings page reports it by, and every family
 * name the stylesheet stacks name for it — a system copy of Anthropic's face
 * registers under a name of its own (`Anthropic Mono Variable`, where the
 * dropped file declares `Anthropic Mono Web`), so a stack names each of them.
 */
export interface OptionalWebfont {
  family: string
  file: string
  /** The face as a reader names it: the family without its web-specific suffix. */
  label: string
  /** The names the stacks name, the dropped file's family first. */
  stack: readonly string[]
}

/**
 * Anthropic faces are not shipped. Declare only files present at the drop point;
 * omitting `@font-face` avoids repeated 404s and lets system-installed faces resolve.
 */
export const OPTIONAL_WEBFONTS: readonly OptionalWebfont[] = [
  { family: 'Anthropic Sans Web Text', file: 'AnthropicSansWebText.ttf', label: 'Anthropic Sans', stack: ['Anthropic Sans Web Text', 'Anthropic Sans'] },
  { family: 'Anthropic Serif Web Text', file: 'AnthropicSerifWebText.ttf', label: 'Anthropic Serif', stack: ['Anthropic Serif Web Text', 'Anthropic Serif'] },
  { family: 'Anthropic Mono Web', file: 'AnthropicMonoWeb.ttf', label: 'Anthropic Mono', stack: ['Anthropic Mono Web', 'Anthropic Mono Variable', 'Anthropic Mono'] },
]

/** The status route's answer: the file names the drop point holds right now. */
export interface WebfontsAnswer {
  ok: true
  faces: string[]
}
