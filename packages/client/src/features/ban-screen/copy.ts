import COPY from './ban-screen.copy.json'
import { copyIn } from '../../core/i18n'
import { readPrefs } from '../../core/prefs'
import type { CopyParams } from '../../core/i18n'

export type CopyKey = keyof typeof COPY

/** This reproduced Claude screen follows banLocale independently of the shell language. */
export function copy(key: CopyKey, params?: CopyParams) {
  return copyIn(COPY, key, readPrefs().banLocale, params)
}
