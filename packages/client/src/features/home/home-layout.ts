import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import { PHASE_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { HOME_HERO_ATTR, HOME_LAYOUT_ATTR, HOME_LAYOUT_STUDIO, PREF_DEFAULTS } from '../../constants'
import type { Prefs } from '../../constants'
import { COMPOSER_STACK, cacheFirstMatch, registerSlotEntries } from '@dsh-claude-style/engine/host'
import { readPrefs } from '../../core/prefs'
import { pageHidden, subscribePageHidden } from '../../core/page-visibility'
import { motionMs } from '../../shared/motion'
import { HOME_RANGES, createHomeUsage, homePanelData } from './data'
import { createGreetingCopy } from './greeting-copy'
import { createHomeModels } from './models'
import { createHomeOverview } from './overview'
import { buildElement } from '@dsh-claude-style/engine/dom'
import type { HostContext, HostFiber } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './home-layout.manifest'
import { copy } from './copy'

/**
 * Draw the classic or studio home layout and its usage panel. The dock slot is
 * session-scoped, so the cold-start hero carries a skin-mounted copy until the
 * host renders its own.
 */
export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  const DOCK_SLOT = 'conversation.input.dock'
  /** On the usage panel while its numbers take over from its placeholders. */
  const HOME_REVEALING_ATTR = 'data-dsh-claude-revealing'
  /** The hero composer's stack, kept while it stays the first match (D40). */
  const heroStack = cacheFirstMatch<HTMLElement>(`${COMPOSER_STACK}[data-dsh-claude-part~="composer-hero"]`)
  /** The host root in the hero phase; other `data-phase` carriers need the part filter (D3). */
  const heroRoot = cacheFirstMatch<HTMLElement>(`[data-dsh-claude-part~="host-root"][${PHASE_ATTRIBUTE}="hero"]`)

  let layout = PREF_DEFAULTS.homeLayout
  /** Whether the last pass saw the new-conversation hero, as of that reading. */
  let lastHero = false
  /** The hero root carrying HOME_HERO_ATTR right now, or null. */
  let markedRoot: HTMLElement | null = null
  /** Keep the book draw with the shell and renew it on each return to the hero. */
  let bookPick = Math.random()
  /** The hero headline's greeting, renewed on every return to the hero page. */
  const greeting = createGreetingCopy()
  let slotsFiber: HostFiber | null = null
  /** The cold start screen's panel: `{ stack, element, root }`, or null. */
  let coldSeat: { stack: Element, element: HTMLElement, root: ReactDOM.Root } | null = null

  const usage = createHomeUsage(ctx)
  const overview = createHomeOverview()
  const models = createHomeModels()

  /** The dock renders inside conversations too; only the hero phase counts as home. */
  function heroPhase() {
    return heroRoot() !== null
  }

  /** Mark the hero root so studio rules read one attribute, scoped to its subtree (D9). */
  function syncRootMark() {
    const root = heroRoot()
    if (root !== markedRoot) {
      markedRoot?.removeAttribute(HOME_HERO_ATTR)
      markedRoot = root
    }
    markedRoot?.toggleAttribute(HOME_HERO_ATTR, layout === HOME_LAYOUT_STUDIO)
  }

  /** Apply a layout and load its data; removing the attribute restores the host home. */
  function setLayout(next: Prefs['homeLayout']) {
    layout = next
    document.body.setAttribute(HOME_LAYOUT_ATTR, next)
    syncRootMark()
    lastHero = heroPhase()
    if (next === HOME_LAYOUT_STUDIO) usage.load(false)
    usage.notify()
  }

  /** Re-render on every store change. */
  function useUsage() {
    const pair = React.useState(0)
    const bump = pair[1]
    React.useEffect(() => usage.subscribe(() => { bump(count => count + 1) }), [])
    return usage.state()
  }

  /**
   * Draw the panel frame before numbers arrive so its geometry never shifts.
   * The range filters tiles and models; heat and chart keep their own windows.
   */
  function HomeUsagePanel() {
    const state = useUsage()
    const tabState = React.useState('overview')
    const tab = tabState[0]
    const setTab = tabState[1]
    const rangeState = React.useState('all')
    const range = rangeState[0]
    const setRange = rangeState[1]
    // Mark the cross-fade from placeholders to known numbers.
    const revealState = React.useState<'placeholders' | 'revealing' | 'settled'>('settled')
    const reveal = revealState[0]
    const setReveal = revealState[1]
    React.useEffect(() => {
      if (reveal !== 'revealing') return undefined
      const timer = window.setTimeout(() => setReveal('settled'), motionMs('--dsh-claude-duration-fade'))
      return () => window.clearTimeout(timer)
    }, [reveal])
    if (layout !== HOME_LAYOUT_STUDIO || !heroPhase()) return null
    const data = homePanelData(state, usage.list(), range, bookPick)
    if (!data.known && reveal !== 'placeholders') setReveal('placeholders')
    if (data.known && reveal === 'placeholders') setReveal('revealing')

    function tabButton(id: string, label: string) {
      return React.createElement('button', {
        key: id,
        type: 'button',
        className: 'dsh-claude-home-tab',
        'data-active': tab === id ? '' : undefined,
        'aria-pressed': tab === id,
        onClick() { setTab(id) },
      }, label)
    }

    return React.createElement(
      'section',
      {
        className: 'dsh-claude-home-panel',
        'data-dsh-claude-home-panel': '',
        'data-computing': state.computing ? '' : undefined,
        [HOME_REVEALING_ATTR]: reveal === 'revealing' ? '' : undefined,
        'aria-busy': state.computing || !data.known ? 'true' : 'false',
      },
      React.createElement(
        'div',
        { className: 'dsh-claude-home-panel-head' },
        React.createElement(
          'div',
          { className: 'dsh-claude-home-tabs' },
          tabButton('overview', copy('homeTabOverview')),
          tabButton('models', copy('homeTabModels')),
        ),
        React.createElement(
          'div',
          { className: 'dsh-claude-home-panel-side' },
          React.createElement(
            'div',
            { className: 'dsh-claude-home-ranges' },
            HOME_RANGES.map(item => React.createElement('button', {
              key: item.id,
              type: 'button',
              className: 'dsh-claude-home-range',
              'data-active': range === item.id ? '' : undefined,
              'aria-pressed': range === item.id,
              onClick() { setRange(item.id) },
            }, copy(item.labelKey))),
          ),
        ),
      ),
      tab === 'models'
        ? React.createElement(models.component, { data })
        : overview.view(data),
    )
  }

  /** Register the dock entry when the host declares it. */
  function registerPanel() {
    // A stable id keeps this entry seated among the host's other dock bars.
    slotsFiber = registerSlotEntries(ctx, [{
      options: { name: DOCK_SLOT, id: 'claude-style-usage', order: 40 },
      component: HomeUsagePanel,
    }], 'dsh-claude-style: home usage panel')
  }

  function unmountColdSeat() {
    if (coldSeat === null) return
    coldSeat.root.unmount()
    if (coldSeat.element.parentElement !== null) coldSeat.element.parentElement.removeChild(coldSeat.element)
    coldSeat = null
  }

  /** Mount the cold-start copy, and remount it when the host replaces the stack. */
  function syncColdSeat() {
    const stack = markedRoot !== null && markedRoot.hasAttribute(HOME_HERO_ATTR) ? heroStack() : null
    if (stack === null || stack.querySelector(`:scope > [data-slot="${DOCK_SLOT}"]`) !== null) {
      unmountColdSeat()
      return
    }
    if (coldSeat !== null && coldSeat.stack === stack && coldSeat.element.parentElement === stack) return
    unmountColdSeat()
    const element = buildElement('div', 'dsh-claude-home-seat')
    stack.appendChild(element)
    const root = ReactDOM.createRoot(element)
    root.render(React.createElement(HomeUsagePanel))
    coldSeat = { stack, element, root }
  }

  /** Re-render on preference or phase changes, and use the period's pass to refresh stale figures. */
  function sync() {
    const next = readPrefs().homeLayout
    if (next !== layout) {
      setLayout(next)
      syncColdSeat()
      greeting.sync(lastHero)
      return
    }
    // Phase flips without a preference change also control panel visibility.
    syncRootMark()
    const hero = heroPhase()
    if (hero !== lastHero) {
      lastHero = hero
      if (hero) bookPick = Math.random()
      usage.notify()
    }
    greeting.sync(hero)
    syncColdSeat()
    if (next === HOME_LAYOUT_STUDIO) {
      usage.load(false)
      usage.loadList()
      // Refresh only the panel the reader can see.
      if (hero) usage.refresh('tick')
    }
  }

  /** Refresh the panel when a focused or visible page returns, not when it leaves. */
  function onWindowWake() {
    if (pageHidden()) return
    if (layout !== HOME_LAYOUT_STUDIO || !heroPhase()) return
    usage.refresh('wake')
  }
  // Focus covers shell and browser windows; visibility covers an obscured window.
  window.addEventListener('focus', onWindowWake)
  const stopWatchingVisibility = subscribePageHidden(hidden => { if (!hidden) onWindowWake() })

  ui.homeLayout = { sync }

  registerPanel()
  setLayout(readPrefs().homeLayout)

  return () => {
    window.removeEventListener('focus', onWindowWake)
    stopWatchingVisibility()
    unmountColdSeat()
    usage.stop()
    greeting.restore()
    document.body.removeAttribute(HOME_LAYOUT_ATTR)
    markedRoot?.removeAttribute(HOME_HERO_ATTR)
    markedRoot = null
    if (slotsFiber !== null) {
      if (typeof slotsFiber.dispose === 'function') slotsFiber.dispose()
      slotsFiber = null
    }
    delete ui.homeLayout
  }
}
