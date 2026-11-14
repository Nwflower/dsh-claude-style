/** The custom properties written on <body>, read by the rules gated on the attributes. */
export const MARK_PROPERTY = '--dsh-claude-custom-mark'
export const WORD_PROPERTY = '--dsh-claude-custom-word'
export const WORD_RATIO_PROPERTY = '--dsh-claude-custom-word-ratio'
export const NAME_PROPERTY = '--dsh-claude-custom-name'
export const ACCENT_PROPERTY = '--dsh-claude-custom-accent'
export const ACCENT_INK_PROPERTY = '--dsh-claude-custom-accent-ink'
export const CANVAS_LIGHT_PROPERTY = '--dsh-claude-custom-canvas-light'
export const CANVAS_DARK_PROPERTY = '--dsh-claude-custom-canvas-dark'
export const TEXT_LIGHT_PROPERTY = '--dsh-claude-custom-text-light'
export const TEXT_DARK_PROPERTY = '--dsh-claude-custom-text-dark'
export const CODE_LIGHT_PROPERTY = '--dsh-claude-custom-code-light'
export const CODE_DARK_PROPERTY = '--dsh-claude-custom-code-dark'
export const LINK_LIGHT_PROPERTY = '--dsh-claude-custom-link-light'
export const LINK_DARK_PROPERTY = '--dsh-claude-custom-link-dark'
export const SIDEBAR_LIGHT_PROPERTY = '--dsh-claude-custom-sidebar-light'
export const SIDEBAR_DARK_PROPERTY = '--dsh-claude-custom-sidebar-dark'
export const BUBBLE_LIGHT_PROPERTY = '--dsh-claude-custom-bubble-light'
export const BUBBLE_DARK_PROPERTY = '--dsh-claude-custom-bubble-dark'
/** The ink the brand's own art and the reader's pictures take while the image-colour choice names the accent or the text colour. */
export const LOGO_INK_PROPERTY = '--dsh-claude-logo-ink'
export const BRAND_PROPERTIES = [
  MARK_PROPERTY, WORD_PROPERTY, WORD_RATIO_PROPERTY, NAME_PROPERTY,
  ACCENT_PROPERTY, ACCENT_INK_PROPERTY, CANVAS_LIGHT_PROPERTY, CANVAS_DARK_PROPERTY, TEXT_LIGHT_PROPERTY, TEXT_DARK_PROPERTY, CODE_LIGHT_PROPERTY, CODE_DARK_PROPERTY, LINK_LIGHT_PROPERTY, LINK_DARK_PROPERTY,
  SIDEBAR_LIGHT_PROPERTY, SIDEBAR_DARK_PROPERTY, BUBBLE_LIGHT_PROPERTY, BUBBLE_DARK_PROPERTY, LOGO_INK_PROPERTY,
]

/** A CSS string literal holding the text, for `content: var(...)`; a line break reads as a space. */
export function cssString(text: string) {
  return `"${text.replace(/[\\"]/g, '\\$&').replace(/[\n\r\f]/g, ' ')}"`
}
