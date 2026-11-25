/**
 * Font role contracts, stack normalization and CSS serialization shared across
 * preferences, runtime projection and the settings picker (D73).
 */

export const FONT_ROLE_PROSE = 'prose'
export const FONT_ROLE_UI = 'ui'
export const FONT_ROLE_CODE = 'code'
export const FONT_ROLES = [FONT_ROLE_PROSE, FONT_ROLE_UI, FONT_ROLE_CODE] as const
export type FontRole = typeof FONT_ROLES[number]

/** Maximum number of prioritized families kept per role. */
export const FONT_STACK_MAX = 12
/** Maximum character length for a single font family name. */
export const FONT_NAME_MAX = 64

/** Preference key backing each font role. */
export const FONT_PREF_KEYS = {
  [FONT_ROLE_PROSE]: 'fontProse',
  [FONT_ROLE_UI]: 'fontUi',
  [FONT_ROLE_CODE]: 'fontCode',
} as const satisfies Record<FontRole, string>

export type FontPrefKey = typeof FONT_PREF_KEYS[FontRole]

/** CSS generic font families that must stay unquoted in `font-family` declarations. */
export const GENERIC_FONT_FAMILIES: ReadonlySet<string> = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'emoji',
  'math',
  'fangsong',
])

/** Allowed characters for a single family name: letters, digits, spaces and `. _ -`. */
const FONT_NAME_RE = /^[\p{L}\p{N} ._-]+$/u

/**
 * Normalize one font family name. Commas, semicolons and parentheses are rejected
 * so hand-edited configuration cannot inject CSS declarations; quotes are stripped
 * and re-applied uniformly during serialization.
 */
export function normalizeFontFamily(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const collapsed = raw.replace(/["']/g, '').replace(/\s+/g, ' ').trim()
  if (collapsed.length === 0 || collapsed.length > FONT_NAME_MAX) return ''
  if (!FONT_NAME_RE.test(collapsed)) return ''
  const lower = collapsed.toLowerCase()
  return GENERIC_FONT_FAMILIES.has(lower) ? lower : collapsed
}

/**
 * Clean, deduplicate (case-insensitively) and cap an ordered font family list.
 */
export function clampFontStack(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (let i = 0; i < raw.length && out.length < FONT_STACK_MAX; i++) {
    const normalized = normalizeFontFamily(raw[i])
    if (normalized === '') continue
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(normalized)
  }
  return out
}

/** Format one normalized family name for a CSS `font-family` value. */
export function formatFontFamily(name: string): string {
  return GENERIC_FONT_FAMILIES.has(name.toLowerCase()) ? name.toLowerCase() : `'${name}'`
}

/** Serialize an ordered list of normalized font families into a CSS `font-family` list. */
export function formatFontFamilyList(families: readonly string[]): string {
  return families.map(formatFontFamily).join(', ')
}

/** Move an entry from `from` to `to`, returning a new ordered list. */
export function reorderFontStack(list: readonly string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return [...list]
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/** Toggle one family in an ordered list: remove if present, append if absent and within cap. */
export function toggleFontInStack(list: readonly string[], raw: string): string[] {
  const name = normalizeFontFamily(raw)
  if (name === '') return [...list]
  const key = name.toLowerCase()
  const at = list.findIndex(entry => entry.toLowerCase() === key)
  if (at !== -1) return list.filter((_, index) => index !== at)
  if (list.length >= FONT_STACK_MAX) return [...list]
  return [...list, name]
}

/**
 * Base fallback stacks matching `packages/client/src/theme/tokens.json` so user
 * overrides prepend cleanly without self-referential CSS variables and keep CJK
 * and symbol fallbacks intact.
 */
export const FONT_PRESET_BASE = {
  claude: {
    [FONT_ROLE_PROSE]: "'Anthropic Serif Web Text','Anthropic Serif','Claude Style Noto Serif','Claude Style Symbols','Noto Sans SC','Source Han Sans SC','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif",
    [FONT_ROLE_UI]: "'Anthropic Sans Web Text','Anthropic Sans','Claude Style Inter','Claude Style Symbols','Noto Sans SC','Source Han Sans SC',-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei','Helvetica Neue',Helvetica,Arial,sans-serif",
    [FONT_ROLE_CODE]: "'Anthropic Mono Web','Anthropic Mono Variable','Anthropic Mono','JetBrains Mono','Noto Sans SC','Source Han Sans SC','PingFang SC','Hiragino Sans GB','Microsoft YaHei',ui-monospace,'SF Mono','Fira Code',Consolas,'Liberation Mono',Menlo,Courier,monospace",
  },
  system: {
    [FONT_ROLE_PROSE]: 'ui-sans-serif,system-ui,sans-serif',
    [FONT_ROLE_UI]: 'ui-sans-serif,system-ui,sans-serif',
    [FONT_ROLE_CODE]: "'JetBrains Mono',ui-monospace,'SF Mono','Fira Code',Consolas,'Liberation Mono',Menlo,Courier,monospace,'Noto Sans SC','Source Han Sans SC','PingFang SC','Microsoft YaHei'",
  },
} as const

/** Concise primary family label displayed on a card when no custom stack is set. */
export const FONT_PRESET_PRIMARY_LABEL = {
  claude: {
    [FONT_ROLE_PROSE]: 'Anthropic Serif',
    [FONT_ROLE_UI]: 'Anthropic Sans',
    [FONT_ROLE_CODE]: 'Anthropic Mono',
  },
  system: {
    [FONT_ROLE_PROSE]: 'System UI',
    [FONT_ROLE_UI]: 'System UI',
    [FONT_ROLE_CODE]: 'JetBrains Mono',
  },
} as const

/** Curated role-ordered recommendations shown above installed system fonts. */
export const FONT_RECOMMENDATIONS: Readonly<Record<FontRole, readonly string[]>> = {
  [FONT_ROLE_PROSE]: [
    'Anthropic Serif',
    'Claude Style Noto Serif',
    'Anthropic Sans',
    'Claude Style Inter',
    'LXGW WenKai',
    'Noto Serif SC',
    'Source Han Serif SC',
    'Songti SC',
    'Noto Sans SC',
    'Source Han Sans SC',
    'PingFang SC',
    'Microsoft YaHei',
    'Georgia',
    'serif',
    'sans-serif',
  ],
  [FONT_ROLE_UI]: [
    'Anthropic Sans',
    'Claude Style Inter',
    'Anthropic Serif',
    'Claude Style Noto Serif',
    'PingFang SC',
    'Noto Sans SC',
    'Source Han Sans SC',
    'Microsoft YaHei',
    'SF Pro',
    'Segoe UI',
    'Inter',
    'system-ui',
    'ui-sans-serif',
    'sans-serif',
  ],
  [FONT_ROLE_CODE]: [
    'Anthropic Mono',
    'JetBrains Mono',
    'SF Mono',
    'Fira Code',
    'Cascadia Code',
    'Maple Mono',
    'Consolas',
    'Menlo',
    'Monaco',
    'ui-monospace',
    'monospace',
  ],
}
