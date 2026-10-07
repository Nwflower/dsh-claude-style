import * as React from 'react'
import { BUNDLE_CONFIG_SLOT, PACKAGE_NAME, SEGMENT_CLASS, SETTINGS_SCROLLER_ATTR, SETTINGS_SECTION_SLOT, USERNAME_MAX } from '../../constants'
import { settingsCopy } from '../../core/i18n'
import { loadModelCopy, onModelCopyLoaded } from '../../core/model-copy'
import { adoptSettingsForm, readPrefs, savePrefs, subscribePrefs } from '../../core/prefs'
import { ClaudeStyleSegmentGroup, createSettingsControls } from './settings-controls'
import { createSettingsAppearanceTab } from './settings-tab-appearance'
import { createSettingsComposerTab } from './settings-tab-composer'
import { createSettingsConversationTab } from './settings-tab-conversation'
import { createSettingsGeneralTab } from './settings-tab-general'
import { createSettingsSidebarTab } from './settings-tab-sidebar'
import type { Prefs } from '../../constants'
import type { HostContext, HostValue } from '../../core/host'
import type { Ui } from '../../core/scheduler'
import type { SettingsTab, SettingsView } from './settings-controls'
import type { QuickProvidersHandle } from './quick-providers'

/**
 * The skin's settings page, mounted by every seat this host declares.
 *
 * Two seats render it: the `plugins.bundle.config` entry on the plugin
 * page (0.1.7+, keyed by the package name) and the full-page
 * `settings.section` tab in the settings dialog. An older host declares
 * only the latter; a newer one gets both, and since both render the same
 * component against the same prefs store, two live instances stay in
 * step. Neither seat hands the component a store: it reads and writes the
 * skin preferences through src/core/prefs.ts, which owns the host round
 * trip, and follows changes the same way the rest of the skin does.
 *
 * Copy comes from the model copy document's `settings` block, so the page
 * follows the shell language like every other string the skin paints. The
 * English literals are the fallback for a failed fetch.
 *
 * The rows are grouped into tabs (src/features/settings/settings-tab-*.ts),
 * picked from a strip at the top that reuses the segmented control and its
 * sliding highlight. The open tab lives in the component: it survives a
 * preference change, not a remount.
 */
/**
 * The quick-provider popover (src/features/settings/quick-providers.ts). The settings
 * row is React-rendered while that card is imperative, so the row reaches the
 * popover through this handle.
 */
export let quickProviderApi: QuickProvidersHandle | null = null

/**
 * The host's slot registry, kept from the settings-section registration so
 * the nav cell can be found later. The nav entry carries no key of its own
 * on the host's markup; the registry's entry list is the only place the
 * section's position is stated.
 */
export let slotsApi: HostValue = null

/** The host's own id for the settings section this plugin registers. */
export const SETTINGS_SECTION_ID = 'claude-style'

/** The page's tabs, in strip order, and the controls their rows are built from. */
export const SETTINGS_TABS: SettingsTab[] = [
  createSettingsGeneralTab(),
  createSettingsAppearanceTab(),
  createSettingsComposerTab(),
  createSettingsSidebarTab(),
  createSettingsConversationTab(),
]
export const SETTINGS_CONTROLS = createSettingsControls()

/** The strip that picks the open tab: a segmented control with tab semantics. */
export function ClaudeStyleSettingsTabStrip(props: { active: string, onPick(id: string): void }) {
  const buttons = SETTINGS_TABS.map(tab => React.createElement(
    'button',
    {
      key: tab.id,
      type: 'button',
      role: 'tab',
      className: SEGMENT_CLASS,
      'data-active': tab.id === props.active ? '' : undefined,
      'aria-selected': tab.id === props.active ? 'true' : 'false',
      onClick() { if (tab.id !== props.active) props.onPick(tab.id) },
    },
    tab.label(),
  ))
  return React.createElement(ClaudeStyleSegmentGroup, { role: 'tablist', className: 'dsh-claude-settings-tabs' }, buttons)
}

export function ClaudeStyleSettingsSection(props: { embed?: boolean }) {
  const state = React.useState(readPrefs())
  const prefs = state[0]
  const setPrefs = state[1]
  const errorState = React.useState<string | null>(null)
  const error = errorState[0]
  const setError = errorState[1]
  const usernameState = React.useState(prefs.username)
  const username = usernameState[0]
  const setUsername = usernameState[1]
  const tabState = React.useState(SETTINGS_TABS[0].id)
  const activeTab = tabState[0]
  const setActiveTab = tabState[1]
  const usernameTimer = React.useRef<number | null>(null)
  const quickTrigger = React.useRef<HTMLButtonElement>(null)
  const pageRef = React.useRef<HTMLDivElement>(null)

  // The host scrolls the page in a container of its own (the settings
  // dialog's options column, the plugin page). Mark the nearest scrolling
  // ancestor while the page is mounted so the stylesheet keeps the
  // scrollbar's room there: switching to a tab short enough to need no
  // scrollbar then leaves the layout where it was.
  React.useLayoutEffect(() => {
    let scroller = pageRef.current === null ? null : pageRef.current.parentElement
    while (scroller !== null && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement
    if (scroller === null) return undefined
    scroller.setAttribute(SETTINGS_SCROLLER_ATTR, '')
    return () => { scroller.removeAttribute(SETTINGS_SCROLLER_ATTR) }
  }, [])

  // The skin's own apply-side writes land here too (a reload, a conflict
  // re-read), so the page never drifts from what the document says.
  React.useEffect(() => {
    syncSettingsNav()
    let alive = true
    const unsubscribe = subscribePrefs(next => {
      if (alive) {
        setPrefs(next)
        setUsername(next.username)
      }
    })
    const unsubscribeCopy = onModelCopyLoaded(() => {
      if (alive) setPrefs(p => Object.assign({}, p))
    })
    return () => {
      alive = false
      unsubscribe()
      if (unsubscribeCopy) unsubscribeCopy()
      if (usernameTimer.current) clearTimeout(usernameTimer.current)
    }
  }, [])

  /**
   * Apply one change. The control flips immediately and the host write
   * follows; a refusal re-reads the authoritative value and says so.
   */
  const write = (patch: Partial<Prefs>) => {
    setError(null)
    setPrefs(Object.assign({}, prefs, patch))
    savePrefs(patch).then(result => {
      if (result === null) setError(settingsCopy('unavailable', 'The settings store is unavailable, so changes will not be saved.'))
    })
  }

  const saveUsernameNow = (value: string) => {
    const next = value.trim().slice(0, USERNAME_MAX)
    if (next === readPrefs().username) return
    setError(null)
    setPrefs(Object.assign({}, readPrefs(), { username: next }))
    savePrefs({ username: next }).then(result => {
      if (result === null) setError(settingsCopy('unavailable', 'The settings store is unavailable, so changes will not be saved.'))
    })
  }

  const queueUsernameSave = (value: string) => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current)
    usernameTimer.current = setTimeout(() => {
      usernameTimer.current = null
      saveUsernameNow(value)
    }, 600)
  }

  const commitUsername = () => {
    if (usernameTimer.current) {
      clearTimeout(usernameTimer.current)
      usernameTimer.current = null
    }
    saveUsernameNow(username)
  }

  const view: SettingsView = {
    prefs,
    write,
    controls: SETTINGS_CONTROLS,
    quickTrigger,
    quickProviderApi: () => quickProviderApi,
    username: {
      value: username,
      onChange(e) {
        setUsername(e.target.value)
        queueUsernameSave(e.target.value)
      },
      onBlur: commitUsername,
      onKeyDown(e) {
        if (e.key === 'Enter') {
          e.preventDefault()
          commitUsername()
          if (e.currentTarget && e.currentTarget.blur) e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          setUsername(prefs.username)
          if (e.currentTarget && e.currentTarget.blur) e.currentTarget.blur()
        }
      },
    },
  }
  // activeTab only ever holds an id from SETTINGS_TABS.
  const tab = SETTINGS_TABS.find(item => item.id === activeTab)!

  // The plugin page already heads the form with the bundle's own title and
  // description, so the embedded rendering drops the skin's title rather
  // than printing it twice.
  const embedded = !!(props && props.embed)
  return React.createElement(
    'div',
    { ref: pageRef, className: embedded ? 'dsh-claude-settings dsh-claude-settings-embedded' : 'dsh-claude-settings' },
    embedded ? null : React.createElement('div', { className: 'dsh-claude-settings-title' }, settingsCopy('title', 'Claude Style')),
    React.createElement(ClaudeStyleSettingsTabStrip, { active: activeTab, onPick: setActiveTab }),
    React.createElement('div', { className: 'dsh-claude-settings-rows', role: 'tabpanel', key: tab.id }, tab.rows(view)),
    error === null ? null : React.createElement('div', { className: 'dsh-claude-settings-error' }, error),
  )
}

/**
 * The plugin page's configuration entry (0.1.7+).
 *
 * A `plugins.bundle.config` entry is asked for two views: `summary` is the
 * one-liner on the bundle's card, `page` is the form itself. The host does
 * not hand this seat a form — the entry is keyed to the package, not to a
 * namespace — so the rows read and write through src/core/prefs.ts like
 * every other surface in the skin, which is where the official form is
 * bound.
 */
export function ClaudeStyleBundleConfig(props: { view?: string }) {
  if (props && props.view === 'summary') {
    return React.createElement('span', null, settingsCopy('title', 'Claude Style'))
  }
  return React.createElement(ClaudeStyleSettingsSection, { embed: true })
}

/**
 * Stamped onto the Claude Style nav button in the settings dialog so CSS
 * can replace the host's default settings gear with the black Claude mark.
 */
export function syncSettingsNav() {
  const navList = document.querySelector(':is([class*="settingsArea"], [class*="_overlay"], [class*="SettingsRoot"]) [class*="_navList"]')
  if (!navList) return
  if (navList.querySelector(`[data-dsh-section="${SETTINGS_SECTION_ID}"]`) !== null) return
  // The section's position among the slot's entries is the nav cell's
  // position in the list: one cell per registered section, in the same
  // order. No label text is read, so a host renaming the entry or a copy
  // document that has not arrived leaves the mark where it belongs.
  const index = settingsSectionIndex()
  if (index < 0) return
  const buttons = navList.querySelectorAll('button')
  if (index >= buttons.length) return
  buttons[index].setAttribute('data-dsh-section', SETTINGS_SECTION_ID)
}

/** This plugin's entry position in the settings slot, or -1 while unknown. */
export function settingsSectionIndex() {
  if (slotsApi === null || typeof slotsApi.entries !== 'function') return -1
  const entries = slotsApi.entries(SETTINGS_SECTION_SLOT)
  for (let i = 0; i < entries.length; i++) {
    const options = entries[i] === null || entries[i] === undefined ? null : entries[i].options
    if (options !== null && options !== undefined && options.id === SETTINGS_SECTION_ID) return i
  }
  return -1
}

/**
 * Register the settings section.
 *
 * Two waits are needed, and both are declarative rather than polling:
 *
 *   1. `ctx.inject(['slots'], …)` waits for the slot registry service. The
 *      renderer provides it, so reading `ctx.get('slots')` directly during
 *      `apply` could see nothing and silently drop the section.
 *   2. `slots.inject('settings.section', …)` waits for the slot *declaration*,
 *      which `dsh-client-ui-settings-general` publishes later. Registering
 *      eagerly instead would throw and fail the boot.
 */
export function installSettingsSection(ctx: HostContext, ui: Ui) {
  loadModelCopy()
  // The settings services are up by now even when they were not at apply
  // time, so retry the official-form binding before choosing a seat. It is
  // idempotent.
  adoptSettingsForm(ctx)
  if (ui) {
    ui.settingsNav = {
      sync: syncSettingsNav,
      /** A pointer press anywhere: the nav's class changes are outside the
       * observer's attributeFilter, so no pass would fire for them. */
      onPointerDown() { syncSettingsNav() },
    }
    quickProviderApi = ui.quickProviders || null
  }
  if (typeof ctx.inject !== 'function') return () => {}
  const fiber = ctx.inject(['slots'], scope => {
    const slots = scope.get('slots')
    if (slots === undefined || slots === null || typeof slots.inject !== 'function') return
    slotsApi = slots
    // 0.1.7 keeps a bundle's own configuration on the plugin's page: the
    // entry is keyed by the bundle's package name and rendered there —
    // `view: 'page'` for the form, `view: 'summary'` for the card's
    // one-liner. The slot is declared by that host's plugin manager, so this
    // registration is a no-op on an older host.
    scope.effect(() => slots.inject(BUNDLE_CONFIG_SLOT, () => slots.register(
      {
        name: BUNDLE_CONFIG_SLOT,
        key: PACKAGE_NAME,
        label() { return settingsCopy('title', 'Claude Style') },
      },
      ClaudeStyleBundleConfig,
    )), 'dsh-claude-style: plugin page')
    // The full-page section registers on every host that declares the
    // slot. On an older host it is the only seat; on 0.1.7+ the same page
    // also renders on the plugin page, and this tab keeps a route to it
    // inside the settings dialog. Two live instances share the prefs
    // store, so a change in one shows in the other.
    scope.effect(() => slots.inject(SETTINGS_SECTION_SLOT, () => slots.register(
      {
        name: SETTINGS_SECTION_SLOT,
        id: SETTINGS_SECTION_ID,
        order: 22,
        // A function, so the navigation entry localizes once the copy
        // document has arrived; the literal is the pre-fetch fallback.
        label() { return settingsCopy('title', 'Claude Style') },
      },
      ClaudeStyleSettingsSection,
    )), 'dsh-claude-style: settings section')
  })
  return () => {
    if (ui && ui.settingsNav) {
      delete ui.settingsNav
    }
    quickProviderApi = null
    slotsApi = null
    if (fiber && typeof fiber.dispose === 'function') fiber.dispose()
  }
}
