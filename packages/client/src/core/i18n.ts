import { hostCtx } from './host-context'
import type { HostContext, HostText } from '@dsh-claude-style/engine/host'

/** Values for a copy string's `{name}` slots. */
export type CopyParams = Record<string, string | number>

/** One copy line: the text in each language it ships in. */
export type CopyPair = Readonly<Record<string, string>>

/** A feature's own copy, by key (its `<功能>.copy.json`). */
export type CopyEntries = Readonly<Record<string, CopyPair>>

/** Every feature copy entry must include this fallback locale. */
export const COPY_FALLBACK_LOCALE = 'en'

/** Missing host locale services or snapshots use the bundled fallback (D12). */
export function activeLocale(ctx?: HostContext | null): string {
  const locale = (ctx || hostCtx)?.get('locale')
  const snapshot = typeof locale?.getSnapshot === 'function' ? locale.getSnapshot() : undefined
  const active = snapshot?.active
  if (typeof active === 'string' && active) return active
  return COPY_FALLBACK_LOCALE
}

export function hostChatSeat(ctx?: HostContext | null): HostText | null {
  const locale = (ctx || hostCtx)?.get('locale')
  return typeof locale?.bind === 'function' ? locale.bind('chat') : null
}

/** A missing translation or an unchanged key uses `fallback`. */
export function hostChatCopy(key: string, fallback: string, ctx?: HostContext | null) {
  const text = hostChatSeat(ctx)?.(key)
  return typeof text === 'string' && text !== '' && text !== key ? text : fallback
}

function fillTemplate(text: string, params?: CopyParams) {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) => Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match)
}

/** Try the active locale and its language prefix before the requested fallback. */
export function localized(pair: Record<string, unknown> | null | undefined, ctx?: HostContext | null, fallback: string = COPY_FALLBACK_LOCALE) {
  if (!pair || typeof pair !== 'object') return ''
  const loc = activeLocale(ctx)
  const text = pair[loc]
  if (typeof text === 'string' && text) return text
  const prefix = typeof loc === 'string' && loc.includes('-') ? loc.split('-')[0] : (typeof loc === 'string' && loc.includes('_') ? loc.split('_')[0] : '')
  const prefixed = pair[prefix]
  if (prefix && typeof prefixed === 'string' && prefixed) return prefixed
  const backstop = pair[fallback]
  if (typeof backstop === 'string' && backstop) return backstop
  const fallbackPrefix = typeof fallback === 'string' && fallback.includes('-') ? fallback.split('-')[0] : ''
  const fallbackPrefixed = pair[fallbackPrefix]
  if (fallbackPrefix && typeof fallbackPrefixed === 'string' && fallbackPrefixed) return fallbackPrefixed
  return ''
}

/** Missing copy keys are build failures; returning the key is only a runtime diagnostic. */
export function featureCopy(entries: CopyEntries, key: string, params?: CopyParams) {
  const pair = entries[key]
  return fillTemplate(pair === undefined ? key : localized(pair), params)
}

export function createCopy<C extends CopyEntries>(entries: C) {
  return (key: keyof C & string, params?: CopyParams) => featureCopy(entries, key, params)
}

/** The account-hold reproduction follows its own locale preference, independently of the shell. */
export function copyIn(entries: CopyEntries, key: string, locale: string, params?: CopyParams) {
  const pair = entries[key]
  const text = pair === undefined ? '' : (pair[locale] || pair[COPY_FALLBACK_LOCALE] || '')
  return fillTemplate(text === '' ? key : text, params)
}
