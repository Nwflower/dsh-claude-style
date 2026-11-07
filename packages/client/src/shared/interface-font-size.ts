import { INTERFACE_FONT_SIZE_ATTR, INTERFACE_FONT_SIZE_MAX, INTERFACE_FONT_SIZE_MIN, INTERFACE_FONT_SIZE_VAR } from '../constants'

/** The ordinary interface text's scale, clamped to the setting's range. */
export function interfaceFontSizeOf(stored: string) {
  const percent = Math.round(Number.parseFloat(stored))
  if (!Number.isFinite(percent) || percent <= 0) return 1
  return Math.min(INTERFACE_FONT_SIZE_MAX, Math.max(INTERFACE_FONT_SIZE_MIN, percent)) / 100
}

/** The stored percentage as the settings control shows it. */
export function interfaceFontSizePercent(stored: string) {
  return Math.round(interfaceFontSizeOf(stored) * 100)
}

/** Project the preference mirror into the custom property ordinary interface text reads. */
export function projectInterfaceFontSize() {
  const stored = document.body.getAttribute(INTERFACE_FONT_SIZE_ATTR)
  const factor = stored === null ? 1 : interfaceFontSizeOf(stored)
  if (factor === 1) document.body.style.removeProperty(INTERFACE_FONT_SIZE_VAR)
  else document.body.style.setProperty(INTERFACE_FONT_SIZE_VAR, String(factor))
}
