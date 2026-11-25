/**
 * Model menu third-party option rows: a zero-layout portal bridge in
 * `conversation.input.overlay` forwards the host's full `SessionStandardProps`
 * and `GlobalStandardProps` kit (such as `useProjection` and host React
 * context) into each `conversation.input.model.options` entry mounted in the
 * picker footer, isolates per-row failures, deduplicates duplicate session
 * mounts, reacts to dynamic slot changes and tears down cleanly when the last
 * picker leaves.
 *
 * @capability model-picker
 * @features model
 * @risk Third-party model menu rows calling `useProjection` or other standard session hooks crash and disappear behind the skin's model picker, duplicate across mounts, or leak slot registrations on teardown.
 */
import { React, reactDomClient } from '../../fixtures/react'
import { afterEach, expect, test, vi } from 'vitest'
import {
  createPluginOptions,
  MODEL_OPTIONS_BRIDGE_SLOT_KEY,
  MODEL_OPTIONS_SLOT_KEY,
} from '@dsh-claude-style/client/mechanisms'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { HostSlotRegistration, HostSlotsService, HostSnapshotSource } from '@dsh-claude-style/contracts/services'
import { MODEL_PLUGIN_OPTION_ID_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'

const HostThemeContext = React.createContext('default')

const cleanups: Array<() => void> = []

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!()
  document.body.innerHTML = ''
})

/** Flush pending React renders and effects in the browser environment. */
async function settle(): Promise<void> {
  await new Promise<void>(resolve => setTimeout(resolve, 0))
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
}

/** Minimal observable snapshot source matching DSH's HostSnapshotSource contract. */
function createSource<T>(initial: T): HostSnapshotSource<T> & { set(next: T): void } {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => value,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    set(next) {
      value = next
      for (const listener of [...listeners]) listener()
    },
  }
}

/** In-memory host harness: slots registry, active session id, locale and bridge mount helper. */
function createHostHarness(initialSessionId: string | null) {
  let sessionId = initialSessionId
  const optionEntries: HostSlotRegistration[] = []
  const optionListeners = new Set<() => void>()
  const bridgeRegistrations: Array<{ id: string, component: React.ComponentType<Record<string, unknown>> }> = []
  const projections = new Map<string, ReturnType<typeof createSource<unknown>>>()

  function projectionSource(key: string) {
    let source = projections.get(key)
    if (source === undefined) {
      source = createSource<unknown>(undefined)
      projections.set(key, source)
    }
    return source
  }

  function useProjection(key: string) {
    const source = projectionSource(key)
    return React.useSyncExternalStore(source.subscribe, source.getSnapshot)
  }

  const slots: HostSlotsService = {
    entries(key) {
      return key === MODEL_OPTIONS_SLOT_KEY ? [...optionEntries] : []
    },
    entriesOfSlot(key) {
      return key === MODEL_OPTIONS_SLOT_KEY ? [...optionEntries] : []
    },
    inject(key, callback) {
      if (key !== MODEL_OPTIONS_BRIDGE_SLOT_KEY) return () => {}
      const dispose = callback()
      return typeof dispose === 'function' ? dispose : () => {}
    },
    register(options, component) {
      const record = { id: options.id ?? '', component: component as React.ComponentType<Record<string, unknown>> }
      if (options.name === MODEL_OPTIONS_BRIDGE_SLOT_KEY) {
        if (bridgeRegistrations.some(item => item.id === record.id)) {
          throw new Error(`duplicate bridge registration: ${record.id}`)
        }
        bridgeRegistrations.push(record)
      }
      return () => {
        const index = bridgeRegistrations.indexOf(record)
        if (index >= 0) bridgeRegistrations.splice(index, 1)
      }
    },
    subscribe(key, listener) {
      if (key !== MODEL_OPTIONS_SLOT_KEY) return () => {}
      optionListeners.add(listener)
      return () => { optionListeners.delete(listener) }
    },
  }

  const locale = {
    bind(namespace: string) {
      return (key: string) => `${namespace}:${key}`
    },
  }

  const uiSession = {
    // The engine's currentSessionId reads uiSession.current.value.key (D3).
    current: { get value() { return { key: sessionId } } },
    getSnapshot: () => ({ currentSessionId: sessionId }),
    subscribe: () => () => {},
  }

  const ctx = {
    get(name: string) {
      if (name === 'slots') return slots
      if (name === 'locale') return locale
      if (name === 'uiSession') return uiSession
      return undefined
    },
    inject(names: string[], callback: (scope: HostContext) => void) {
      const effects: Array<() => void> = []
      const scope = {
        get: (name: string) => ctx.get(name),
        effect(fn: () => (() => void) | void) {
          const stop = fn()
          if (typeof stop === 'function') effects.push(stop)
          return () => { if (typeof stop === 'function') stop() }
        },
      } as unknown as HostContext
      if (names.includes('slots')) callback(scope)
      return {
        dispose() {
          for (const stop of effects.splice(0).reverse()) stop()
        },
      }
    },
  } as unknown as HostContext

  function mountBridge(forSessionId: string, theme = 'host-theme') {
    expect(bridgeRegistrations.length).toBe(1)
    const Bridge = bridgeRegistrations[0].component
    const hostContainer = document.createElement('div')
    document.body.appendChild(hostContainer)
    const root = reactDomClient.createRoot(hostContainer)
    const renderBridge = (nextSessionId: string) => {
      root.render(
        React.createElement(
          HostThemeContext.Provider,
          { value: theme },
          React.createElement(Bridge, {
            sessionId: nextSessionId,
            useProjection,
            useWorkspaces: () => 'workspace-main',
          }),
        ),
      )
    }
    renderBridge(forSessionId)
    const unmount = () => {
      root.unmount()
      hostContainer.remove()
    }
    cleanups.push(unmount)
    return {
      hostContainer,
      rerender: renderBridge,
      unmount,
    }
  }

  function addOption(entry: HostSlotRegistration) {
    optionEntries.push(entry)
    for (const listener of [...optionListeners]) listener()
  }

  function clearOptions() {
    optionEntries.splice(0)
    for (const listener of [...optionListeners]) listener()
  }

  return {
    ctx,
    slots,
    bridgeRegistrations,
    projectionSource,
    mountBridge,
    addOption,
    clearOptions,
    setSessionId(next: string | null) { sessionId = next },
  }
}

/** A picker's option rows on the harness; the menu's own controls stay idle unless a test hands in its own. */
function createPicker(host: ReturnType<typeof createHostHarness>, controls: { locked?: () => boolean, schedule?: () => void } = {}) {
  return createPluginOptions({
    ctx: host.ctx,
    slots: () => host.slots,
    locked: controls.locked ?? (() => false),
    dismiss: () => {},
    notice: () => {},
    schedule: controls.schedule,
  })
}

test('forwards host SessionStandardProps (useProjection), host context, inject hooks and stable callbacks into option rows', async () => {
  const host = createHostHarness('sess-1')
  host.projectionSource('potetoMode').set({ enabled: true })
  const counter = createSource(42)
  const injectCalls = vi.fn()
  const receivedReadModes: Array<unknown> = []
  let locked = false

  function PotetoRow(props: Record<string, unknown>) {
    const useProjection = props.useProjection as (key: string) => { enabled: boolean } | undefined
    const useWorkspaces = props.useWorkspaces as () => string
    const useCounter = props.useCounter as () => number
    const t = props.t as (key: string) => string
    const projected = useProjection('potetoMode')
    const workspace = useWorkspaces()
    const count = useCounter()
    const theme = React.useContext(HostThemeContext)
    receivedReadModes.push(props.readMode)
    return React.createElement(
      'div',
      { className: 'poteto-row' },
      `${t('label')}|${projected?.enabled ? 'on' : 'off'}|${workspace}|${count}|${theme}|${props.locked ? 'locked' : 'open'}`,
    )
  }

  host.addOption({ options: { id: 'agent-team' }, component: () => React.createElement('div', null, 'host-team') })
  host.addOption({
    options: { id: 'pstack-poteto-mode' },
    locale: 'pstack.poteto',
    inject(sessionId) {
      injectCalls(sessionId)
      return {
        readMode: () => Promise.resolve(true),
        hooks: { counter },
      }
    },
    component: PotetoRow,
  })

  const pluginOptions = createPicker(host, { locked: () => locked })
  cleanups.push(() => pluginOptions.dispose())

  const bridge = host.mountBridge('sess-1')
  const footer = document.createElement('div')
  document.body.appendChild(footer)
  const rows = pluginOptions.rows()
  expect(rows.map(node => node.getAttribute(MODEL_PLUGIN_OPTION_ID_ATTRIBUTE))).toEqual(['pstack-poteto-mode'])
  for (const row of rows) footer.appendChild(row)
  await settle()

  // Bridge renders no DOM inside the overlay slot itself.
  expect(bridge.hostContainer.childNodes.length).toBe(0)
  expect(footer.textContent).toBe('pstack.poteto:label|on|workspace-main|42|host-theme|open')

  // Live projection and inject-hook updates re-render in place.
  host.projectionSource('potetoMode').set({ enabled: false })
  counter.set(99)
  await settle()
  expect(footer.textContent).toBe('pstack.poteto:label|off|workspace-main|99|host-theme|open')

  // Refreshing locked state keeps the cached inject callback identity intact.
  locked = true
  pluginOptions.refresh()
  await settle()
  expect(footer.textContent).toBe('pstack.poteto:label|off|workspace-main|99|host-theme|locked')
  expect(injectCalls).toHaveBeenCalledTimes(1)
  expect(new Set(receivedReadModes).size).toBe(1)
})

test('deduplicates multiple bridge mounts for the same session and hands over on unmount', async () => {
  const host = createHostHarness('sess-dup')
  let mounts = 0
  function TrackedRow() {
    React.useEffect(() => {
      mounts += 1
      return () => { mounts -= 1 }
    }, [])
    return React.createElement('span', null, 'single-row')
  }
  host.addOption({ options: { id: 'tracked' }, component: TrackedRow })

  const pluginOptions = createPicker(host)
  cleanups.push(() => pluginOptions.dispose())

  const footer = document.createElement('div')
  document.body.appendChild(footer)
  for (const row of pluginOptions.rows()) footer.appendChild(row)

  const first = host.mountBridge('sess-dup')
  const second = host.mountBridge('sess-dup')
  await settle()
  expect(footer.textContent).toBe('single-row')
  expect(mounts).toBe(1)

  first.unmount()
  await settle()
  expect(footer.textContent).toBe('single-row')
  expect(mounts).toBe(1)

  second.unmount()
  await settle()
  expect(mounts).toBe(0)
})

test('isolates failing rows and dynamic slot updates, and ref-counts bridge teardown across pickers', async () => {
  const host = createHostHarness('sess-err')
  // cost: D92 — the isolation check reads the warning's call count; silencing it keeps the run's output clean.
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  cleanups.push(() => warn.mockRestore())

  const wake = vi.fn()
  const firstPicker = createPicker(host, { schedule: wake })
  const secondPicker = createPicker(host)
  cleanups.push(() => firstPicker.dispose())
  cleanups.push(() => secondPicker.dispose())

  // Both pickers share one overlay bridge registration without colliding.
  expect(host.bridgeRegistrations.length).toBe(1)

  const beforeSig = firstPicker.signature()
  host.addOption({
    options: { id: 'broken-inject' },
    inject() { throw new Error('inject boom') },
    component: () => React.createElement('span', null, 'never'),
  })
  host.addOption({
    options: { id: 'healthy' },
    component: () => React.createElement('span', null, 'still-here'),
  })
  expect(wake).toHaveBeenCalledTimes(2)
  expect(firstPicker.signature()).not.toBe(beforeSig)

  const footer = document.createElement('div')
  document.body.appendChild(footer)
  for (const row of firstPicker.rows()) footer.appendChild(row)
  host.mountBridge('sess-err')
  await settle()

  expect(footer.querySelector(`[${MODEL_PLUGIN_OPTION_ID_ATTRIBUTE}="broken-inject"]`)?.childNodes.length).toBe(0)
  expect(footer.querySelector(`[${MODEL_PLUGIN_OPTION_ID_ATTRIBUTE}="healthy"]`)?.textContent).toBe('still-here')
  expect(warn).toHaveBeenCalled()

  // Disposing one picker keeps the shared bridge alive; disposing the last removes it.
  firstPicker.dispose()
  expect(host.bridgeRegistrations.length).toBe(1)
  secondPicker.dispose()
  expect(host.bridgeRegistrations.length).toBe(0)
})
