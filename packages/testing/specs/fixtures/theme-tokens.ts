import source from '../../../client/src/theme/tokens.json?raw'

interface LiteralTokens {
  palette: { tokens: { token: string; literal?: { light: string; dark: string } }[] }
  motion: { token: string; value: string }[]
  apex: { token: string; light: string; dark: string }[]
}
const tokens: LiteralTokens = JSON.parse(source)

/** Literal palette and motion declarations from the shipped source of truth, for stylesheet mechanisms. */
export function literalThemeSheet(scope: string, darkAttribute: string) {
  const literals = tokens.palette.tokens.filter(item => item.literal !== undefined)
  const colors = (['light', 'dark'] as const).map(scheme => {
    const selector = scheme === 'dark' ? `[${darkAttribute}]` : `:not([${darkAttribute}])`
    const values = literals.map(item => `${item.token}:${item.literal?.[scheme]};`).join('')
      + tokens.apex.map(item => `${item.token}:${item[scheme]};`).join('')
    return `${scope}${selector}{${values}}`
  }).join('')
  return colors + `${scope}{${tokens.motion.map(item => `${item.token}:${item.value};`).join('')}}`
}
