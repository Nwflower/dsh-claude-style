import { MODEL_COPY_FALLBACK_LOCALE } from '../features/model/copy-fallbacks'
import { hostCtx } from './host'
import type { HostContext } from './host'
import { modelCopy } from './model-copy'
import { readPrefs } from './prefs'

/** Values for a copy string's `{name}` slots. */
export type CopyParams = Record<string, string | number>

/** The shell's active locale id, or the document fallback when it cannot be read. */
export function activeLocale(ctx?: HostContext | null): string {
  const active = (ctx || hostCtx)?.get('locale')?.getSnapshot().active
  if (typeof active === 'string' && active) return active
  return modelCopy === null ? MODEL_COPY_FALLBACK_LOCALE : modelCopy.fallback
}

/** Fill a copy string's `{name}` slots from `params`; a slot with no value stays as written. */
function fillTemplate(text: string, params?: CopyParams) {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) => Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match)
}

/** One localized string out of a `{ locale: text }` pair, fallback locale last. */
export function localized(pair: Record<string, unknown> | null | undefined, ctx?: HostContext | null) {
  if (!pair || typeof pair !== 'object') return ''
  const loc = activeLocale(ctx)
  const text = pair[loc]
  if (typeof text === 'string' && text) return text
  const prefix = typeof loc === 'string' && loc.includes('-') ? loc.split('-')[0] : (typeof loc === 'string' && loc.includes('_') ? loc.split('_')[0] : '')
  const prefixed = pair[prefix]
  if (prefix && typeof prefixed === 'string' && prefixed) return prefixed
  const fallback = modelCopy === null ? MODEL_COPY_FALLBACK_LOCALE : modelCopy.fallback
  const backstop = pair[fallback]
  if (typeof backstop === 'string' && backstop) return backstop
  const fallbackPrefix = typeof fallback === 'string' && fallback.includes('-') ? fallback.split('-')[0] : ''
  const fallbackPrefixed = pair[fallbackPrefix]
  if (fallbackPrefix && typeof fallbackPrefixed === 'string' && fallbackPrefixed) return fallbackPrefixed
  return ''
}

/**
 * One picker label: the document's localized string, else the neutral
 * English constant the bundle carries. `{name}` placeholders are filled
 * from `params`, so a label with a slot stays translatable.
 */
export function copyLabel(key: string, fallback: string, params?: CopyParams) {
  const text = modelCopy === null || !modelCopy.ui ? '' : localized(modelCopy.ui[key])
  return fillTemplate(text || fallback, params)
}

/**
 * One settings-page string. The settings copy rides the same document as
 * the picker copy, so the page follows the shell language too — and the
 * English constants stay as the fallback for a failed fetch.
 */
export function settingsCopy(key: string, fallback: string, params?: CopyParams) {
  const text = modelCopy === null || !modelCopy.settings ? '' : localized(modelCopy.settings[key])
  return fillTemplate(text || fallback, params)
}

/**
 * One reading-view string (D57): the view follows the shell language like the
 * settings page, with the English constant as the fallback for a failed fetch.
 */
export function readerCopy(key: string, fallback: string, params?: CopyParams) {
  const text = modelCopy === null ? '' : localized(modelCopy.reader[key])
  return fillTemplate(text || fallback, params)
}

/**
 * One account-hold easter-egg string, in the language the `banLocale`
 * preference names — NOT the shell's language. The page reproduces a real
 * Claude screen, so it is read in the language Claude wrote it in whatever
 * the rest of the UI is set to; `localized` is bypassed on purpose rather
 * than fed a fake locale, so a missing translation still falls through the
 * document's own fallback locale.
 */
export function banCopy(key: string, fallback: string, params?: CopyParams) {
  const pair = modelCopy === null || !modelCopy.ban ? null : modelCopy.ban[key]
  const want = readPrefs().banLocale
  const wanted = pair && typeof pair === 'object' ? pair[want] : undefined
  let text = typeof wanted === 'string' ? wanted : ''
  if (!text) text = localized(pair)
  return fillTemplate(text || fallback, params)
}
