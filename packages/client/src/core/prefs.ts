import { BACKGROUND_OPACITY_ATTR, BACKGROUND_OPACITY_MAX, BACKGROUND_OPACITY_VAR, BRAND_ATTR, BRAND_DEEPSEEK, COMPOSER_ATTR, COMPOSER_GAP_ATTR, COMPOSER_GAP_THEME, CONTEXT_DISPLAY_ATTR, CONTEXT_NUMBERS_ATTR, DOCK_LOOK_ATTR, DOCK_LOOK_CARD, DOCK_LOOK_FLUSH, EFFORT_ACCENT_ATTR, FOOTER_ATTR, MASCOT_ATTR, MASCOT_BRAND, MASCOT_CRAB, MASCOT_DEEPY, MOTION_ATTR, MOTION_FULL, MOTION_REDUCED, ONGOING_INDICATOR_ATTR, PAGE_ZOOM_ATTR, PAGE_ZOOM_VAR, PACKAGE_NAME, PALETTE_ATTR, PALETTE_CARD_ATTR, PALETTE_COLORING_BRAND, PALETTE_COLORING_CUSTOM, PREF_DEFAULTS, SEARCH_STYLE_ATTR, SETTINGS_ENTRY_FALLBACK, SIDEBAR_LAYOUT_ATTR, STATS_POSITION_ATTR, STATUS_MOTION_ATTR, TYPEFACE_ATTR } from '../constants'
import { backgroundOpacityOf, projectBackgroundOpacity } from '../shared/background-opacity'
import { pageZoomOf, pageZoomText, projectPageZoomFactor } from '../shared/page-zoom'
import type { PrefKey, Prefs } from '../constants'
import type { HostContext } from '@dsh-claude-style/engine/host'
import { clampPrefs, PREFS } from '@dsh-claude-style/contracts/prefs'
import { notifyAll } from '@dsh-claude-style/engine/notify'
import { createSettingsBinding } from '@dsh-claude-style/engine/settings-binding'
import { pageOwner } from '../shared/visual-owner'

/**
 * Skin preferences: the host settings namespace is the store, and every
 * value is mirrored onto the document as an attribute so the stylesheet
 * decides what it means (D75). Until the first read settles — and if
 * it fails — the table's defaults hold. The clamp that turns a stored value
 * into one of these is the table's own (packages/contracts/src/prefs.ts, D73).
 */
export let prefs = clampPrefs({})
const prefsListeners: ((prefs: Prefs) => void)[] = []
/** Whether the preferences on hand came from the form: until then they are the table's defaults. */
let readFromForm = false

const binding = createSettingsBinding({
  namespaces: [PACKAGE_NAME, SETTINGS_ENTRY_FALLBACK],
  adoptForm(value) {
    readFromForm = true
    adoptPrefs(clampPrefs(value))
    moveLocalPrefs(value)
  },
})

/** Bind the official settings form (engine/src/settings-binding.ts); true once a form is bound. */
export function adoptSettingsForm(ctx: HostContext) {
  return binding.adopt(ctx)
}

/** Release the form and directory subscriptions the binding opened. */
export function disposePrefsBinding() {
  binding.dispose()
}

/** Read the preferences from the form, once it carries values. */
export function loadPrefs() {
  binding.read()
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

/**
 * Whether the preferences are the reader's own: a decision taken on the
 * reader's behalf (the sodium probe, D78) waits for this, since the defaults
 * that hold until then say nothing about what the reader chose.
 */
export function prefsFromForm() {
  return readFromForm
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
 * The document mirror: one entry per preference the stylesheet switches on,
 * with the attribute it rides and the resolver that turns the preference into
 * what the rules test (the resolved mascot, the dock's look, the footer's
 * presence). One list is the whole contract with the stylesheets: `adoptPrefs`
 * writes these and `clearPrefsAttributes` takes the same names back (entry.ts).
 * Its entries are literals so the build can hold every attribute a stylesheet
 * reads to a name written here (D9).
 */
interface PrefMirror {
  key: PrefKey
  attr: string
  /** The value to write; a `false` takes the attribute off. */
  value(prefs: Prefs): string | boolean
}

const MIRRORS = [
  { key: 'brand', attr: BRAND_ATTR, value: (prefs: Prefs) => prefs.brand },
  { key: 'palette', attr: PALETTE_ATTR, value: (prefs: Prefs) => prefs.palette },
  // Following the brand and the reader's four paint on top of the brand's card;
  // a picked card is the token layer of its own, whichever mark stands above it.
  {
    key: 'paletteColors',
    attr: PALETTE_CARD_ATTR,
    value: (prefs: Prefs) => prefs.paletteColors === PALETTE_COLORING_BRAND || prefs.paletteColors === PALETTE_COLORING_CUSTOM
      ? prefs.brand
      : prefs.paletteColors,
  },
  { key: 'typeface', attr: TYPEFACE_ATTR, value: (prefs: Prefs) => prefs.typeface },
  { key: 'mascot', attr: MASCOT_ATTR, value: resolveMascot },
  { key: 'dockCards', attr: DOCK_LOOK_ATTR, value: (prefs: Prefs) => prefs.dockCards ? DOCK_LOOK_CARD : DOCK_LOOK_FLUSH },
  { key: 'searchStyle', attr: SEARCH_STYLE_ATTR, value: (prefs: Prefs) => prefs.searchStyle },
  { key: 'sidebarLayout', attr: SIDEBAR_LAYOUT_ATTR, value: (prefs: Prefs) => prefs.sidebarLayout },
  { key: 'ongoingIndicator', attr: ONGOING_INDICATOR_ATTR, value: (prefs: Prefs) => prefs.ongoingIndicator },
  { key: 'statsPosition', attr: STATS_POSITION_ATTR, value: (prefs: Prefs) => prefs.statsPosition },
  { key: 'contextDisplay', attr: CONTEXT_DISPLAY_ATTR, value: (prefs: Prefs) => prefs.contextDisplay },
  { key: 'contextNumbers', attr: CONTEXT_NUMBERS_ATTR, value: (prefs: Prefs) => prefs.contextNumbers ? 'on' : 'off' },
  { key: 'composerBottomGap', attr: COMPOSER_GAP_ATTR, value: (prefs: Prefs) => prefs.composerBottomGap === COMPOSER_GAP_THEME ? false : prefs.composerBottomGap },
  { key: 'effortAccent', attr: EFFORT_ACCENT_ATTR, value: (prefs: Prefs) => prefs.effortAccent },
  { key: 'statusMotion', attr: STATUS_MOTION_ATTR, value: (prefs: Prefs) => prefs.statusMotion },
  // The page's scale is this attribute alone; the sheet's `zoom` reads it
  // through the property `projectPageZoomFactor` projects from it, written
  // right after the mirrors below. At 100% the attribute is taken off, and the
  // page keeps the size the system and the host give it.
  {
    key: 'pageZoom',
    attr: PAGE_ZOOM_ATTR,
    value: (prefs: Prefs) => {
      const factor = pageZoomOf(prefs.pageZoom)
      return factor === 1 ? false : pageZoomText(factor)
    },
  },
  // The background's opacity is this attribute alone; the canvas fills read it
  // through the property `projectBackgroundOpacity` projects from it, written
  // right after the mirrors below. At 100 the attribute is taken off, and the
  // fills keep the opaque canvas they have always painted.
  {
    key: 'backgroundOpacity',
    attr: BACKGROUND_OPACITY_ATTR,
    value: (prefs: Prefs) => {
      const percent = Math.round(backgroundOpacityOf(prefs.backgroundOpacity) * 100)
      return percent === BACKGROUND_OPACITY_MAX ? false : String(percent)
    },
  },
  { key: 'collapseFooter', attr: FOOTER_ATTR, value: (prefs: Prefs) => prefs.collapseFooter && !footerTakeoverRetired },
] as const satisfies readonly PrefMirror[]

/** Every attribute the mirror writes, plus the animation answer `writeMotionAttribute` resolves. */
const MIRROR_ATTRS: readonly string[] = [...MIRRORS.map(mirror => mirror.attr), MOTION_ATTR]

/**
 * Adopt a preference set: mirror it onto the document, then notify. A page a
 * skin or ds-bot owns carries none of this theme's attributes (D74): the set is
 * kept, and taking the page back mirrors it (entry.ts). The form answers
 * whenever it answers, and the settings section installs whenever its chunk
 * arrives (D72), so a yielded page hears adoptions too.
 */
export function adoptPrefs(next: Prefs) {
  prefs = next
  if (pageOwner() === null) {
    for (const mirror of MIRRORS) {
      const value = mirror.value(next)
      if (value === false) document.body.removeAttribute(mirror.attr)
      else document.body.setAttribute(mirror.attr, String(value))
    }
    // After the attribute, which is what it reads: the sheet's half of the page's
    // scale, written here rather than a frame later by the scale watcher.
    projectPageZoomFactor()
    // The canvas fills' opacity rides the same channel: the property is written
    // from the attribute here, like the scale above.
    projectBackgroundOpacity()
    writeMotionAttribute(next.motion)
  }
  notifyAll(prefsListeners, next)
}

/** Take back every attribute adoptPrefs mirrors onto the document: the page goes back to the host (entry.ts). */
export function clearPrefsAttributes() {
  for (const name of MIRROR_ATTRS) document.body.removeAttribute(name)
  document.body.style.removeProperty(PAGE_ZOOM_VAR)
  document.body.style.removeProperty(BACKGROUND_OPACITY_VAR)
}

/** Whether the operating system asks for reduced motion right now. */
export function systemPrefersReducedMotion() {
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
 * features act on that answer rather than reading it lazily (D40).
 */
export function refreshMotionAttribute() {
  const before = document.body.getAttribute(MOTION_ATTR)
  writeMotionAttribute(prefs.motion)
  if (document.body.getAttribute(MOTION_ATTR) !== before) notifyAll(prefsListeners, prefs)
}

/**
 * Re-run everything that asked to hear about the environment without the
 * stored preferences having changed: the other chat plugin appearing or
 * leaving (packages/client/src/shared/peer-plugin.ts, D74).
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

/** The mascot actually on the page: `brand` resolves through the brand. */
export function resolveMascot(current: Prefs) {
  if (current.mascot !== MASCOT_BRAND) return current.mascot
  return current.brand === BRAND_DEEPSEEK ? MASCOT_DEEPY : MASCOT_CRAB
}

/**
 * Values an earlier build kept in this browser's local storage, by preference:
 * the first time the form carries values, each field the form does not hold
 * yet is written through the form and the local copy dropped.
 */
const LOCAL_PREF_KEYS: Partial<Record<PrefKey, string>> = {
  username: 'dsh-claude-style.username',
  banLocale: 'dsh-claude-style.banLocale',
}
let localPrefsMoved = false

/** Whether a stored local value is one this build still accepts for that preference. */
function localValueUsable(key: PrefKey, stored: string) {
  const spec = PREFS[key]
  if (stored === '' || stored === spec.default) return false
  if (spec.type === 'choice') return spec.values.some((value: string) => value === stored)
  if (spec.type === 'text') return stored.trim().length <= spec.max
  return false
}

function moveLocalPrefs(formValue: Record<string, unknown>) {
  if (localPrefsMoved) return
  localPrefsMoved = true
  for (const [key, storageKey] of Object.entries(LOCAL_PREF_KEYS) as [PrefKey, string][]) {
    const stored = localStorage.getItem(storageKey)
    if (stored === null) continue
    const held = formValue[key] !== undefined && formValue[key] !== PREF_DEFAULTS[key]
    if (held || !localValueUsable(key, stored)) {
      localStorage.removeItem(storageKey)
      continue
    }
    // The value was held to the table just above, and each key here is one of
    // the two string-shaped preferences: the write carries its own type.
    savePrefs({ [key]: stored } as Partial<Prefs>).then(saved => {
      if (saved !== null && saved[key] === stored) localStorage.removeItem(storageKey)
    })
  }
}

/**
 * Write a partial preference change through the official form.
 *
 * @returns a promise for the resolved preferences, or null when the form does
 *          not carry values yet or refused the change.
 */
export function savePrefs(patch: Partial<Prefs>): Promise<Prefs | null> {
  return binding.save(patch).then(accepted => accepted === null || accepted === false ? null : prefs)
}
