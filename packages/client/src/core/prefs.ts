import { AUTO_POPOVER_ALL, AUTO_POPOVER_OFF, AUTO_POPOVER_SCOPES, BRAND_ATTR, BRAND_CLAUDE, BRAND_DEEPSEEK, BRAND_DEEPSEEK_LEGACY, CHAT_ANIMATIONS_ENHANCED, CHAT_ANIMATIONS_MODES, CHAT_ANIMATIONS_OFF, COMPOSER_ATTR, DOCK_LOOK_ATTR, DOCK_LOOK_CARD, DOCK_LOOK_FLUSH, FOOTER_ATTR, MASCOT_ATTR, MASCOT_BRAND, MASCOT_CRAB, MASCOT_DEEPY, MOTION_ATTR, MOTION_FULL, MOTION_REDUCED, PACKAGE_NAME, PALETTE_ATTR, PREF_CHOICES, PREF_DEFAULTS, PROVIDER_ID_MAX, QUICK_PROVIDERS_MAX, SETTINGS_ENTRY_FALLBACK, TYPEFACE_ATTR, USERNAME_MAX } from '../constants'
import { MODEL_OFFICIAL_GROUP } from '../features/model/copy-fallbacks'
import type { Prefs } from '../constants'
import type { HostContext } from './host'
import type { HostConfigForm, HostConfigFormsService } from '@dsh-claude-style/contracts/services'
import { notifyAll } from '../shared/notify'
import { externalOwnerActive } from '../shared/visual-owner'

/**
 * Skin preferences: the host settings namespace is the store, and every
 * value is mirrored onto the document as an attribute so the stylesheet
 * decides what it means (D10, D11). Until the first read settles — and if
 * it fails — PREF_DEFAULTS holds.
 */
export let prefs = normalizePrefs({})
const prefsListeners: ((prefs: Prefs) => void)[] = []

/** The official settings form (the host's form controller, D10); null until the service serves the namespace. */
let prefsForm: HostConfigForm | null = null
/** Disposer for the bound form's own change subscription. */
let prefsFormUnsubscribe: (() => void) | null = null
/** Disposer for the served-namespace directory watch, while one is open. */
let prefsWatchOff: (() => void) | null = null
/** Whether the served-namespace directory is already being watched. */
let prefsBinding = false

/** Namespaces to try, best first: loader entry id, package name, inserted id. */
function settingsNamespaceCandidates(ctx: HostContext) {
  // The dynamic façade can hide the fiber; the other two candidates remain.
  const id = ctx?.fiber?.entry?.id
  const entryId = typeof id === 'string' && id !== '' ? id.slice(id.lastIndexOf(':') + 1) : null
  return [entryId, PACKAGE_NAME, SETTINGS_ENTRY_FALLBACK]
}

/**
 * The namespace the host actually serves, picked from the candidates.
 *
 * The loader mints a random id for each boot entry, so asking for our own
 * entry id hands back a controller for nobody's namespace: reads stay at the
 * defaults and every write is refused. The served list is the truth.
 */
function servedNamespace(forms: HostConfigFormsService, candidates: (string | null)[]) {
  const namespaces = forms.describe?.()?.getSnapshot?.()?.view?.namespaces
  if (!namespaces) return null
  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || candidate === '') continue
    if (namespaces.some((served) => served?.ns === candidate)) return candidate
  }
  return null
}

/** Whether the host serves namespaces to the browser. */
function hostConfigForms(ctx: HostContext | null): HostConfigFormsService | null {
  const forms = ctx?.get('configForms')
  return typeof forms?.get === 'function' ? forms : null
}

/** The form's current field values, or null while it is not ready. */
function readFormValue(): Record<string, unknown> | null {
  const snapshot = prefsForm?.getSnapshot()
  if (snapshot?.status !== 'ready') return null
  return snapshot.value && typeof snapshot.value === 'object' ? snapshot.value as Record<string, unknown> : null
}

/** Bind one namespace the host already serves; the controller waits for its own snapshot. */
function bindServedForm(forms: HostConfigFormsService, ctx: HostContext) {
  const namespace = servedNamespace(forms, settingsNamespaceCandidates(ctx))
  if (namespace === null) return false
  const form = forms.get(namespace)
  if (typeof form?.getSnapshot !== 'function') return false
  prefsForm = form
  // A form without a subscribe face leaves the reads on demand.
  if (typeof form.subscribe === 'function') prefsFormUnsubscribe = form.subscribe(loadPrefs)
  return true
}

/**
 * Watch the served-namespace directory until this plugin's namespace lands:
 * on a cold page the directory can answer after this plugin has applied.
 */
function watchNamespace(forms: HostConfigFormsService, ctx: HostContext) {
  if (prefsBinding) return
  const mirror = forms.describe?.()
  if (!mirror) return
  prefsBinding = true
  const attempt = () => {
    if (prefsForm === null && !bindServedForm(forms, ctx)) return
    if (prefsWatchOff !== null) {
      prefsWatchOff()
      prefsWatchOff = null
    }
    loadPrefs()
  }
  if (typeof mirror.subscribe === 'function') prefsWatchOff = mirror.subscribe(attempt)
  if (typeof mirror.ensure === 'function') mirror.ensure()
  attempt()
}

/**
 * Bind the official form. Called once per install, before the first read, and
 * again when the settings page installs — the service may mount after this
 * plugin. A namespace the host does not serve yet leaves `prefsForm` null and
 * the defaults in place, so this never blocks or fails the skin.
 */
export function adoptSettingsForm(ctx: HostContext) {
  if (prefsForm === null) {
    const forms = hostConfigForms(ctx)
    if (forms === null) return false
    if (!bindServedForm(forms, ctx)) watchNamespace(forms, ctx)
  }
  if (prefsForm === null) return false
  loadPrefs()
  return true
}

/** Release the form and directory subscriptions this module opened. */
export function disposePrefsBinding() {
  if (prefsFormUnsubscribe !== null) {
    prefsFormUnsubscribe()
    prefsFormUnsubscribe = null
  }
  if (prefsWatchOff !== null) {
    prefsWatchOff()
    prefsWatchOff = null
  }
  prefsBinding = false
  prefsForm = null
}

/**
 * Runtime overrides that outrank the stored preferences: a feature retired
 * after failing hands its surface back to the host, because both of these
 * HIDE host controls and a takeover whose replacement is gone would leave
 * nothing in their place.
 */
let footerTakeoverRetired = false
export let composerRestyleRetired = false

/** Give the sidebar footer back to the host for the rest of this generation. */
export function retireFooterTakeover() {
  footerTakeoverRetired = true
  document.body.removeAttribute(FOOTER_ATTR)
}

/** Give the composer back to the host for the rest of this generation. */
export function retireComposerRestyle() {
  composerRestyleRetired = true
  document.body.removeAttribute(COMPOSER_ATTR)
}

/** The current preferences (live object; treat as read-only). */
export function readPrefs() {
  return prefs
}

/** Observe preference changes; returns the unsubscriber. */
export function subscribePrefs(listener: (prefs: Prefs) => void) {
  prefsListeners.push(listener)
  return () => {
    const index = prefsListeners.indexOf(listener)
    if (index !== -1) prefsListeners.splice(index, 1)
  }
}

/**
 * Adopt a preference set: mirror it onto the document, then notify. A page a
 * skin owns carries none of this theme's attributes (D49): the set is kept, and
 * taking the page back mirrors it (entry.ts). The form answers whenever it
 * answers, and the settings section installs whenever its chunk arrives (D39),
 * so a yielded page hears adoptions too.
 */
export function adoptPrefs(next: Prefs) {
  prefs = next
  if (!externalOwnerActive()) {
    document.body.setAttribute(BRAND_ATTR, next.brand)
    document.body.setAttribute(PALETTE_ATTR, next.palette)
    document.body.setAttribute(TYPEFACE_ATTR, next.typeface)
    document.body.setAttribute(MASCOT_ATTR, resolveMascot(next))
    document.body.setAttribute(DOCK_LOOK_ATTR, next.dockCards ? DOCK_LOOK_CARD : DOCK_LOOK_FLUSH)
    writeMotionAttribute(next.motion)
    document.body.toggleAttribute(FOOTER_ATTR, next.collapseFooter && !footerTakeoverRetired)
  }
  notifyAll(prefsListeners, next)
}

/** Take back every attribute adoptPrefs mirrors onto the document: the page goes back to the host (entry.ts). */
export function clearPrefsAttributes() {
  for (const name of [BRAND_ATTR, PALETTE_ATTR, TYPEFACE_ATTR, MASCOT_ATTR, DOCK_LOOK_ATTR, MOTION_ATTR, FOOTER_ATTR]) document.body.removeAttribute(name)
}

/** Whether the operating system asks for reduced motion right now. */
function systemPrefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Resolve the animation choice onto the document. Only the two answers the
 * rest of the plugin acts on reach the attribute: a stylesheet cannot rewrite
 * its own media queries, so "always play" has to be a value the rules test.
 */
function writeMotionAttribute(mode: string) {
  const reduced = mode === MOTION_REDUCED || (mode !== MOTION_FULL && systemPrefersReducedMotion())
  document.body.setAttribute(MOTION_ATTR, reduced ? MOTION_REDUCED : MOTION_FULL)
}

/**
 * Re-resolve the current choice when the system's own setting flips. The
 * listeners hear about it only when the resolved answer really moved, because
 * features act on that answer rather than reading it lazily (D26).
 */
export function refreshMotionAttribute() {
  const before = document.body.getAttribute(MOTION_ATTR)
  writeMotionAttribute(prefs.motion)
  if (document.body.getAttribute(MOTION_ATTR) !== before) notifyAll(prefsListeners, prefs)
}

/**
 * Re-run everything that asked to hear about the environment without the
 * stored preferences having changed: the other chat plugin appearing or
 * leaving (packages/client/src/shared/peer-plugin.ts, D32).
 */
export function notifyEnvironmentChange() {
  notifyAll(prefsListeners, prefs)
}

/**
 * Whether the skin must hold its animations still, right now. The mascots ask
 * this instead of the media query, which cannot express "always play".
 */
export function motionReduced() {
  const resolved = document.body.getAttribute(MOTION_ATTR)
  if (resolved === MOTION_REDUCED) return true
  if (resolved === MOTION_FULL) return false
  return systemPrefersReducedMotion()
}

/**
 * Read the preferences from the form, once it carries values. The form's
 * subscription calls this on every host change; the binding calls it for
 * values that were ready before the subscription settled.
 */
export function loadPrefs() {
  const value = readFormValue()
  if (value === null) return
  adoptPrefs(normalizePrefs(value))
  moveLocalPrefs(value)
}

/** Clamp the hover-open preference; the earlier boolean shape still lands. */
function normalizeAutoPopover(value: unknown) {
  if (value === true) return AUTO_POPOVER_ALL
  if (value === false) return AUTO_POPOVER_OFF
  return typeof value === 'string' && AUTO_POPOVER_SCOPES.includes(value) ? value : PREF_DEFAULTS.autoPopover
}

/**
 * The provider ids the picker's first level carries: ids rather than names, so
 * a catalog rename does not lose the stored selection. The official service is
 * the picker's default rather than a choice, so a stored id for it is dropped.
 */
function normalizeQuickProviders(value: unknown) {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (let i = 0; i < value.length && out.length < QUICK_PROVIDERS_MAX; i++) {
    const id = value[i]
    if (typeof id !== 'string' || id === '' || id.length > PROVIDER_ID_MAX) continue
    if (id === MODEL_OFFICIAL_GROUP || out.includes(id)) continue
    out.push(id)
  }
  return out
}

/** Clamp the brand; values stored by earlier builds under older names land on their choice. */
function normalizeBrand(value: unknown) {
  if (value === BRAND_DEEPSEEK) return value
  return value === BRAND_DEEPSEEK_LEGACY ? BRAND_DEEPSEEK : BRAND_CLAUDE
}

/** The mascot actually on the page: `brand` resolves through the brand. */
export function resolveMascot(current: Prefs) {
  if (current.mascot !== MASCOT_BRAND) return current.mascot
  return current.brand === BRAND_DEEPSEEK ? MASCOT_DEEPY : MASCOT_CRAB
}

/** Clamp the chat-area animation choice; the earlier boolean switch still lands. */
function normalizeChatAnimations(value: unknown) {
  if (value === true) return CHAT_ANIMATIONS_ENHANCED
  if (value === false) return CHAT_ANIMATIONS_OFF
  return typeof value === 'string' && CHAT_ANIMATIONS_MODES.includes(value) ? value : PREF_DEFAULTS.chatAnimations
}

/**
 * Clamp one host value into the preference shape, field by field off
 * PREF_DEFAULTS: a boolean stays on unless stored as `false`, a choice outside
 * its set reads as its default, and the five fields with a shape of their own
 * have their own clamps.
 */
export function normalizePrefs(value: unknown): Prefs {
  const section: Record<string, unknown> = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(PREF_DEFAULTS) as (keyof Prefs)[]) {
    const fallback = PREF_DEFAULTS[key]
    const choices = PREF_CHOICES[key]
    if (typeof fallback === 'boolean') out[key] = section[key] !== false
    else if (choices !== undefined) out[key] = typeof section[key] === 'string' && choices.includes(section[key]) ? section[key] : fallback
  }
  out.brand = normalizeBrand(section.brand)
  out.autoPopover = normalizeAutoPopover(section.autoPopover)
  out.chatAnimations = normalizeChatAnimations(section.chatAnimations)
  out.quickProviders = normalizeQuickProviders(section.quickProviders)
  out.username = typeof section.username === 'string' ? section.username.trim().slice(0, USERNAME_MAX) : ''
  // Every key of PREF_DEFAULTS is set above: the booleans and the choices in
  // the loop, the five shaped fields after it.
  return out as unknown as Prefs
}

/**
 * Values an earlier build kept in this browser's local storage, by preference:
 * the first time the form carries values, each field the form does not hold
 * yet is written through the form and the local copy dropped.
 */
const LOCAL_PREF_KEYS: Partial<Record<keyof Prefs, string>> = {
  username: 'dsh-claude-style.username',
  banLocale: 'dsh-claude-style.banLocale',
}
let localPrefsMoved = false

function moveLocalPrefs(formValue: Record<string, unknown>) {
  if (localPrefsMoved) return
  localPrefsMoved = true
  for (const [key, storageKey] of Object.entries(LOCAL_PREF_KEYS) as [keyof Prefs, string][]) {
    const stored = localStorage.getItem(storageKey)
    if (stored === null) continue
    const held = formValue[key] !== undefined && formValue[key] !== PREF_DEFAULTS[key]
    const choices = PREF_CHOICES[key]
    const unusable = stored === '' || stored === PREF_DEFAULTS[key] || (choices !== undefined && !choices.includes(stored))
    if (held || unusable) {
      localStorage.removeItem(storageKey)
      continue
    }
    savePrefs({ [key]: stored }).then(saved => {
      if (saved !== null && saved[key] === stored) localStorage.removeItem(storageKey)
    })
  }
}

/**
 * Write a partial preference change through the official form: one `set()` per
 * field, chained, because the controller owns the write queue and takes its
 * revision fence from the last settlement.
 *
 * @returns a promise for the resolved preferences, or null when the form does
 *          not carry values yet or refused the change.
 */
export function savePrefs(patch: Partial<Prefs>): Promise<Prefs | null> {
  const form = prefsForm
  if (readFormValue() === null || form === null) return Promise.resolve(null)
  const step = (name: keyof Prefs) => (accepted: boolean): boolean | Promise<boolean> => {
    if (accepted === false) return false
    let pending
    try {
      pending = form.set(name, patch[name])
    } catch (error) {
      // set() refuses a field path this Config does not carry by throwing
      // before anything crosses the wire: a refusal, answered with a re-read
      // (D12).
      return false
    }
    if (typeof pending === 'boolean' || pending === undefined) return typeof pending === 'boolean' ? pending : true
    return pending.then((ok: unknown) => ok === true)
  }
  let run = Promise.resolve(true)
  for (const key of Object.keys(patch) as (keyof Prefs)[]) run = run.then(step(key))
  return run.then(accepted => {
    // Refused (a stale revision, or a field this Config does not carry):
    // re-read rather than guess.
    loadPrefs()
    return accepted === false ? null : prefs
  })
}
