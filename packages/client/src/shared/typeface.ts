import { writeBodyProperty } from '@dsh-claude-style/engine/body-properties'
import {
  FONT_PRESET_BASE,
  FONT_ROLE_CODE,
  FONT_ROLE_PROSE,
  FONT_ROLE_UI,
  formatFontFamilyList,
  normalizeFontFamily,
} from '@dsh-claude-style/contracts/typeface'
import type { FontRole } from '@dsh-claude-style/contracts/typeface'
import { TYPEFACE_HOST, TYPEFACE_SYSTEM } from '../constants'
import type { Prefs } from '../constants'

/** Body custom properties managed by custom font stacks. */
const FONT_PROSE_VAR = '--dsh-claude-font-prose'
const FONT_SERIF_VAR = '--dsh-claude-font-serif'
const FONT_UI_VAR = '--dsw-font-family'
const FONT_CODE_VAR = '--dsh-claude-font-code'

const ALL_FONT_VARS = [FONT_PROSE_VAR, FONT_SERIF_VAR, FONT_UI_VAR, FONT_CODE_VAR] as const

const HOST_FALLBACK_DEFAULT: Readonly<Record<FontRole, string>> = {
  [FONT_ROLE_PROSE]: 'ui-sans-serif, system-ui, sans-serif',
  [FONT_ROLE_UI]: 'ui-sans-serif, system-ui, sans-serif',
  [FONT_ROLE_CODE]: 'ui-monospace, monospace',
}

/**
 * Compose the final CSS `font-family` value for one role when the user supplies
 * a custom stack, prepending their ordered families before the active preset's
 * fallback stack. Returns null when no custom families are configured so static
 * token rules stay in control.
 */
export function composeCustomFontValue(
  role: FontRole,
  custom: readonly string[],
  typeface: Prefs['typeface'],
  hostFallback?: string,
): string | null {
  if (custom.length === 0) return null
  const head = formatFontFamilyList(custom)
  const tail = typeface === TYPEFACE_HOST
    ? (hostFallback !== undefined && hostFallback.trim() !== '' ? hostFallback.trim() : HOST_FALLBACK_DEFAULT[role])
    : typeface === TYPEFACE_SYSTEM
      ? FONT_PRESET_BASE.system[role]
      : FONT_PRESET_BASE.claude[role]
  return `${head}, ${tail}`
}

/** Read the host root's own font variables once so `host` overrides never self-reference. */
function readHostRootFont(role: FontRole): string {
  const rootStyle = getComputedStyle(document.documentElement)
  const token = role === FONT_ROLE_CODE ? '--ds-font-family-code' : '--dsw-font-family'
  return rootStyle.getPropertyValue(token).trim()
}

/** Project custom font stacks onto `<body>` custom properties; empty lists clear overrides. */
export function projectCustomTypefaces(prefs: Prefs) {
  const hostUi = prefs.typeface === TYPEFACE_HOST && (prefs.fontProse.length > 0 || prefs.fontUi.length > 0)
    ? readHostRootFont(FONT_ROLE_UI)
    : undefined
  const hostCode = prefs.typeface === TYPEFACE_HOST && prefs.fontCode.length > 0
    ? readHostRootFont(FONT_ROLE_CODE)
    : undefined
  const prose = composeCustomFontValue(FONT_ROLE_PROSE, prefs.fontProse, prefs.typeface, hostUi)
  const ui = composeCustomFontValue(FONT_ROLE_UI, prefs.fontUi, prefs.typeface, hostUi)
  const code = composeCustomFontValue(FONT_ROLE_CODE, prefs.fontCode, prefs.typeface, hostCode)
  writeBodyProperty(FONT_PROSE_VAR, prose)
  writeBodyProperty(FONT_SERIF_VAR, prose)
  writeBodyProperty(FONT_UI_VAR, ui)
  writeBodyProperty(FONT_CODE_VAR, code)
}

/** Remove every inline custom font property when the skin yields or tears down (D74). */
export function clearCustomTypefaces() {
  for (const name of ALL_FONT_VARS) writeBodyProperty(name, null)
}

/* ---------- local system font discovery ---------- */

/** Subset of the Local Font Access `FontData` shape this module reads. */
export interface LocalFontLike {
  readonly family?: unknown
}

interface FontAccessWindow {
  queryLocalFonts?: () => Promise<readonly LocalFontLike[]>
}

/** Deduplicate, validate and sort local font faces into usable CSS family names. */
export function collectSystemFamilies(fonts: readonly LocalFontLike[]): string[] {
  const unique = new Map<string, string>()
  for (const font of fonts) {
    const family = normalizeFontFamily(font?.family)
    if (family === '') continue
    const key = family.toLowerCase()
    if (!unique.has(key)) unique.set(key, family)
  }
  return [...unique.values()].sort((left, right) => left.localeCompare(right, 'zh'))
}

let cachedSystemFonts: Promise<readonly string[]> | null = null

/**
 * Query locally installed font families once per page session via Chromium's
 * Local Font Access API. Unsupported browsers or denied permission resolve to
 * an empty list so the picker degrades cleanly to curated recommendations and
 * manual entry.
 */
export function loadSystemFontFamilies(): Promise<readonly string[]> {
  if (cachedSystemFonts !== null) return cachedSystemFonts
  const scope = globalThis as { window?: FontAccessWindow }
  const query = scope.window?.queryLocalFonts
  if (typeof query !== 'function') {
    cachedSystemFonts = Promise.resolve([])
    return cachedSystemFonts
  }
  cachedSystemFonts = query.call(scope.window).then(
    fonts => collectSystemFamilies(fonts),
    // Permission denial or environment restriction is expected outside the desktop window; fall back to recommendations and typed input (D12).
    () => [],
  )
  return cachedSystemFonts
}
