import * as React from 'react'
import * as reactDom from 'react-dom'
import { buildElement } from '@dsh-claude-style/engine/dom'
import { MODEL_PLUGIN_OPTION_ID_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { currentSessionId, hostLocale, withSlots } from '@dsh-claude-style/engine/host'
import type { HostContext, HostFiber } from '@dsh-claude-style/engine/host'
import type {
  HostLocaleService,
  HostSlotRegistration,
  HostSlotsService,
  HostSnapshotSource,
} from '@dsh-claude-style/contracts/services'
import { activeLocale } from '../../core/i18n'
import { createHostToast } from '../../shared/host-toast'
import { copy } from './copy'

/** The host's list slot under the model and effort rows of its own model menu. */
export const MODEL_OPTIONS_SLOT_KEY = 'conversation.input.model.options'

/**
 * The session-scoped list slot rendered beside every composer seat (`InputBar`).
 * Hosting a zero-layout portal bridge here lets the host's own `ui-renderer`
 * assemble and forward the full `SessionStandardProps` and `GlobalStandardProps`
 * kit (including `useProjection`, `useSession`, `useConversation`, `useInput`,
 * `inputActions` and `useWorkspaces`) into each third-party model option row.
 */
export const MODEL_OPTIONS_BRIDGE_SLOT_KEY = 'conversation.input.overlay'

const MODEL_OPTIONS_BRIDGE_ID = 'dsh-claude-style-model-options'

/** Entries of that slot the picker draws itself: the host's Agent Teams row is team-mode.ts. */
const DRAWN_BY_PICKER = new Set(['agent-team'])

type OptionEntry = HostSlotRegistration & { options: { id: string } }
type TranslateFn = ReturnType<HostLocaleService['bind']>
type SnapshotHook = <S = unknown>(selector?: (snapshot: unknown) => S, equal?: (left: S, right: S) => boolean) => S
type KeyedSourceResolver = (key: string, member?: string) => HostSnapshotSource<unknown> | undefined
type KeyedSnapshotHook = (
  key: string,
  memberOrSelector?: string | ((value: unknown) => unknown),
  equal?: (left: unknown, right: unknown) => boolean,
) => unknown

interface PortalRow {
  id: string
  entry: OptionEntry
  node: HTMLElement
}

interface PortalTarget {
  id: number
  sessionId: string | null
  rows: readonly PortalRow[]
  locked: boolean
  locale: string
  dismiss(): void
  reportFailure(message: string): void
  openPane(): void
}

interface BridgeHub {
  ctx: HostContext
  refs: number
  version: number
  slotRevision: number
  targets: Map<number, PortalTarget>
  schedules: Set<() => void>
  sessionMounts: Map<string, number[]>
  listeners: Set<() => void>
  slotsFiber: HostFiber | null
  subscribe(listener: () => void): () => void
  getVersion(): number
  notify(): void
  attachMount(sessionId: string, mountId: number): void
  detachMount(sessionId: string, mountId: number): void
  ownsSession(sessionId: string, mountId: number): boolean
}

const bridgeHubs = new WeakMap<HostContext, BridgeHub>()
const observableHookCache = new WeakMap<HostSnapshotSource<unknown>, SnapshotHook>()
const keyedHookCache = new WeakMap<KeyedSourceResolver, KeyedSnapshotHook>()
const injectCache = new WeakMap<HostSlotRegistration, Map<string, Record<string, unknown>>>()
const localeSeatCache = new WeakMap<HostLocaleService, Map<string, { locale: string, t: TranslateFn }>>()

const absentSource: HostSnapshotSource<unknown> = {
  getSnapshot: () => undefined,
  subscribe: () => () => {},
}

let nextTargetId = 0
let nextMountId = 0

/** Match ui-slots' `standardHookPropName`: turn an inject source name into `use<Name>`. */
function standardHookPropName(name: string): string {
  return `use${name[0]?.toUpperCase() ?? ''}${name.slice(1)}`
}

/** Bind a bare HostSnapshotSource into a stable React selector hook. */
function bindObservableHook(source: HostSnapshotSource<unknown>): SnapshotHook {
  let hook = observableHookCache.get(source)
  if (hook !== undefined) return hook
  const subscribe = (listener: () => void) => source.subscribe(listener)
  const getSnapshot = () => source.getSnapshot()
  hook = function useObservableSnapshot<S = unknown>(
    selector?: (snapshot: unknown) => S,
    equal: (left: S, right: S) => boolean = Object.is,
  ): S {
    const cache = React.useRef<{ has: boolean, value: S }>({ has: false, value: undefined as S })
    const read = () => {
      const raw = getSnapshot()
      const next = selector === undefined ? raw as S : selector(raw)
      if (cache.current.has && equal(cache.current.value, next)) return cache.current.value
      cache.current.has = true
      cache.current.value = next
      return next
    }
    return React.useSyncExternalStore(subscribe, read)
  }
  observableHookCache.set(source, hook)
  return hook
}

/** Bind a keyed source resolver into a stable `useName(key, member | selector?, equal?)` hook. */
function bindKeyedObservableHook(resolver: KeyedSourceResolver): KeyedSnapshotHook {
  let hook = keyedHookCache.get(resolver)
  if (hook !== undefined) return hook
  hook = (key, second, equal) => {
    const resolved = typeof second === 'string' ? resolver(key, second) : resolver(key)
    const useValue = bindObservableHook(resolved ?? absentSource)
    return typeof second === 'function' ? useValue(second, equal) : useValue()
  }
  keyedHookCache.set(resolver, hook)
  return hook
}

/** Mirror ui-renderer's `bindInjectSources`: turn `hooks` / `keyedHooks` entries into `use<Name>` props. */
function bindInjectFace(face: Record<string, unknown>): Record<string, unknown> {
  const sources = face.hooks
  const keyedSources = face.keyedHooks
  if (sources === undefined && keyedSources === undefined) return face
  const { hooks: _hooks, keyedHooks: _keyedHooks, ...rest } = face
  const bound: Record<string, unknown> = rest
  if (sources !== null && typeof sources === 'object') {
    for (const [name, source] of Object.entries(sources as Record<string, HostSnapshotSource<unknown>>)) {
      bound[standardHookPropName(name)] = bindObservableHook(source)
    }
  }
  if (keyedSources !== null && typeof keyedSources === 'object') {
    for (const [name, source] of Object.entries(keyedSources as Record<string, KeyedSourceResolver>)) {
      bound[standardHookPropName(name)] = bindKeyedObservableHook(source)
    }
  }
  return bound
}

/** Cache `entry.inject(sessionId)` per (entry, sessionId) so callback props keep stable identity across re-renders. */
function cachedInjectProps(entry: HostSlotRegistration, sessionId: string): Record<string, unknown> | undefined {
  if (typeof entry.inject !== 'function') return undefined
  let perSession = injectCache.get(entry)
  if (perSession === undefined) {
    perSession = new Map()
    injectCache.set(entry, perSession)
  }
  let cached = perSession.get(sessionId)
  if (cached === undefined) {
    const face = entry.inject(sessionId)
    cached = face !== null && typeof face === 'object' ? bindInjectFace(face) : {}
    perSession.set(sessionId, cached)
  }
  return cached
}

/**
 * Bind a namespace's `t` prop per (locale service, namespace, active language):
 * stable identity within one language, fresh reference on language change so
 * memoized option components re-render naturally.
 */
function localeSeat(ctx: HostContext, namespace: string, language: string): TranslateFn | undefined {
  const locale = hostLocale(ctx)
  if (locale === null) return undefined
  let perNamespace = localeSeatCache.get(locale)
  if (perNamespace === undefined) {
    perNamespace = new Map()
    localeSeatCache.set(locale, perNamespace)
  }
  const existing = perNamespace.get(namespace)
  if (existing !== undefined && existing.locale === language) return existing.t
  const bound = locale.bind(namespace)
  const fresh: TranslateFn = (key, params) => bound(key, params)
  perNamespace.set(namespace, { locale: language, t: fresh })
  return fresh
}

/**
 * Keeps one plugin's row from taking the others down. A broken option component
 * or throwing `inject(sessionId)` stops at this boundary (D12), and the warning
 * names the row it hid.
 */
class OptionBoundary extends React.Component<{ id: string, children?: React.ReactNode }, { failed: boolean }> {
  override state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  override componentDidCatch(error: unknown) {
    console.warn(`dsh-claude-style: the model menu row "${this.props.id}" is hidden, it failed to render:`, error)
  }
  override render() {
    return this.state.failed ? null : this.props.children
  }
}

/** Render one option entry inside its OptionBoundary so an `inject(sessionId)` error is isolated too. */
function OptionEntryHost(props: {
  ctx: HostContext
  standardProps: Record<string, unknown>
  entry: OptionEntry
  sessionId: string
  target: PortalTarget
}): React.ReactElement {
  const { ctx, standardProps, entry, sessionId, target } = props
  const component = entry.component as React.ComponentType<Record<string, unknown>>
  const merged: Record<string, unknown> = {
    ...standardProps,
    ...cachedInjectProps(entry, sessionId),
    sessionId,
    locked: target.locked,
    dismiss: target.dismiss,
    reportFailure: target.reportFailure,
    openPane: target.openPane,
  }
  if (entry.locale !== undefined) {
    const t = localeSeat(ctx, entry.locale, target.locale)
    if (t !== undefined) merged.t = t
  }
  return React.createElement(component, merged)
}

/** Acquire or create the ref-counted overlay bridge hub for one host context. */
function acquireBridgeHub(ctx: HostContext, schedule: () => void): BridgeHub {
  const existing = bridgeHubs.get(ctx)
  if (existing !== undefined) {
    existing.refs += 1
    existing.schedules.add(schedule)
    return existing
  }
  const hub: BridgeHub = {
    ctx,
    refs: 1,
    version: 0,
    slotRevision: 0,
    targets: new Map(),
    schedules: new Set([schedule]),
    sessionMounts: new Map(),
    listeners: new Set(),
    slotsFiber: null,
    subscribe(listener) {
      hub.listeners.add(listener)
      return () => { hub.listeners.delete(listener) }
    },
    getVersion() { return hub.version },
    notify() {
      hub.version += 1
      for (const listener of [...hub.listeners]) listener()
    },
    attachMount(sessionId, mountId) {
      let stack = hub.sessionMounts.get(sessionId)
      if (stack === undefined) {
        stack = []
        hub.sessionMounts.set(sessionId, stack)
      }
      if (!stack.includes(mountId)) stack.push(mountId)
      if (stack[0] === mountId) hub.notify()
    },
    detachMount(sessionId, mountId) {
      const stack = hub.sessionMounts.get(sessionId)
      if (stack === undefined) return
      const index = stack.indexOf(mountId)
      if (index === -1) return
      stack.splice(index, 1)
      if (stack.length === 0) hub.sessionMounts.delete(sessionId)
      if (index === 0) hub.notify()
    },
    ownsSession(sessionId, mountId) {
      const stack = hub.sessionMounts.get(sessionId)
      return stack !== undefined && stack[0] === mountId
    },
  }

  function BridgeHost(standardProps: Record<string, unknown>): React.ReactNode {
    const sessionId = typeof standardProps.sessionId === 'string' ? standardProps.sessionId : null
    const mountIdRef = React.useRef<number>(0)
    if (mountIdRef.current === 0) mountIdRef.current = ++nextMountId
    const mountId = mountIdRef.current

    React.useLayoutEffect(() => {
      if (sessionId === null) return
      hub.attachMount(sessionId, mountId)
      return () => { hub.detachMount(sessionId, mountId) }
    }, [sessionId, mountId])

    React.useSyncExternalStore(hub.subscribe, hub.getVersion)

    if (sessionId === null || !hub.ownsSession(sessionId, mountId)) return null

    const portals: React.ReactNode[] = []
    for (const target of hub.targets.values()) {
      if (target.sessionId !== sessionId || target.rows.length === 0) continue
      for (const row of target.rows) {
        portals.push(reactDom.createPortal(
          React.createElement(
            OptionBoundary,
            { id: row.id, key: `${sessionId}:${row.id}` },
            React.createElement(OptionEntryHost, {
              ctx,
              standardProps,
              entry: row.entry,
              sessionId,
              target,
            }),
          ),
          row.node,
          `${target.id}:${row.id}`,
        ))
      }
    }
    return portals.length === 0 ? null : React.createElement(React.Fragment, null, portals)
  }

  hub.slotsFiber = withSlots(ctx, (slots, scope) => {
    scope.effect(
      () => slots.inject(MODEL_OPTIONS_BRIDGE_SLOT_KEY, () => slots.register(
        { name: MODEL_OPTIONS_BRIDGE_SLOT_KEY, id: MODEL_OPTIONS_BRIDGE_ID },
        BridgeHost,
      )),
      'dsh-claude-style: model options bridge',
    )
    if (typeof slots.subscribe === 'function') {
      scope.effect(
        () => slots.subscribe!(MODEL_OPTIONS_SLOT_KEY, () => {
          hub.slotRevision += 1
          for (const wake of hub.schedules) wake()
        }),
        'dsh-claude-style: model options watch',
      )
    }
  })

  bridgeHubs.set(ctx, hub)
  return hub
}

function releaseBridgeHub(hub: BridgeHub, schedule: () => void, targetId: number): void {
  const removed = hub.targets.delete(targetId)
  if (removed) hub.notify()
  hub.schedules.delete(schedule)
  hub.refs -= 1
  if (hub.refs <= 0) {
    if (hub.slotsFiber !== null) hub.slotsFiber.dispose()
    hub.slotsFiber = null
    hub.targets.clear()
    hub.sessionMounts.clear()
    hub.listeners.clear()
    bridgeHubs.delete(hub.ctx)
  }
}

/** Whether two row lists carry the exact same entry instances in the same order and containers. */
function sameRows(left: readonly PortalRow[], right: readonly PortalRow[]): boolean {
  if (left.length !== right.length) return false
  for (let i = 0; i < left.length; i++) {
    if (left[i].id !== right[i].id || left[i].entry !== right[i].entry || left[i].node !== right[i].node) return false
  }
  return true
}

/**
 * The rows other plugins hand to the host's model menu
 * (`conversation.input.model.options`). The skin's picker replaces that menu,
 * so a zero-layout bridge registered into `conversation.input.overlay` portals
 * each entry from inside the host's own `ui-renderer` session scope into the
 * picker's footer, preserving the full `SessionStandardProps` and
 * `GlobalStandardProps` kit alongside the menu's own controls (`locked`,
 * `dismiss`, `reportFailure`, `openPane`), `entry.inject(sessionId)` and `t`.
 *
 * The picker has no detail pane, so an entry that asks for one gets a notice
 * saying so.
 */
export function createPluginOptions(options: {
  ctx: HostContext
  /** The slot registry from the scope that injected it (D75), or null while the host serves none. */
  slots(): HostSlotsService | null
  /** Whether the seat refuses changes right now (a model selection is in flight). */
  locked(): boolean
  /** Close the picker's cards. */
  dismiss(): void
  /** The scheduler wake-up asked for when registrations change. */
  schedule?: () => void
}) {
  const { ctx } = options
  const toast = createHostToast()
  const nodes = new Map<string, HTMLElement>()
  const schedule = options.schedule ?? (() => {})
  const hub = acquireBridgeHub(ctx, schedule)
  const target: PortalTarget = {
    id: ++nextTargetId,
    sessionId: null,
    rows: [],
    locked: false,
    locale: activeLocale(),
    dismiss: options.dismiss,
    reportFailure(message: string) { toast.show({ text: message }) },
    openPane() { toast.show({ text: copy('pluginPaneUnsupported') }) },
  }
  hub.targets.set(target.id, target)

  /** The entries to draw, in the order the host's menu draws them. */
  function entries(): OptionEntry[] {
    const slots = options.slots()
    if (slots === null || currentSessionId(ctx) === null) return []
    const listed: OptionEntry[] = []
    for (const entry of slots.entriesOfSlot(MODEL_OPTIONS_SLOT_KEY)) {
      const id = entry.options.id
      if (id === undefined || DRAWN_BY_PICKER.has(id) || entry.component === undefined) continue
      listed.push(entry as OptionEntry)
    }
    return listed
  }

  /** Publish changes to the bridge only when the session, state or row set actually moved (D40). */
  function publish(sessionId: string | null, nextRows?: readonly PortalRow[]) {
    const locked = options.locked()
    const locale = activeLocale()
    const rowsChanged = nextRows !== undefined && !sameRows(target.rows, nextRows)
    if (target.sessionId === sessionId && target.locked === locked && target.locale === locale && !rowsChanged) return
    target.sessionId = sessionId
    target.locked = locked
    target.locale = locale
    if (nextRows !== undefined) target.rows = nextRows
    hub.notify()
  }

  return {
    /** What the footer's layout depends on: the session, slot revision and the entries drawn for it. */
    signature(): string {
      const sessionId = currentSessionId(ctx)
      const ids: string[] = []
      for (const entry of entries()) ids.push(entry.options.id)
      return `${sessionId ?? ''}:${hub.slotRevision}:${ids.join(',')}`
    },
    /** The row containers for the footer; entries that left are detached and unmounted. */
    rows(): HTMLElement[] {
      const sessionId = currentSessionId(ctx)
      const listed = entries()
      const kept = new Set<string>()
      const nextRows: PortalRow[] = []
      const elements: HTMLElement[] = []
      for (const entry of listed) {
        const id = entry.options.id
        kept.add(id)
        let node = nodes.get(id)
        if (node === undefined) {
          node = buildElement('div', 'dsh-claude-model-plugin-option')
          node.setAttribute(MODEL_PLUGIN_OPTION_ID_ATTRIBUTE, id)
          nodes.set(id, node)
        }
        nextRows.push({ id, entry, node })
        elements.push(node)
      }
      for (const id of [...nodes.keys()]) {
        if (kept.has(id)) continue
        nodes.get(id)?.remove()
        nodes.delete(id)
      }
      publish(sessionId, nextRows)
      return elements
    },
    /** Refresh the mounted rows with the current menu state (a selection in flight locks them). */
    refresh() {
      publish(currentSessionId(ctx))
    },
    dispose() {
      releaseBridgeHub(hub, schedule, target.id)
      for (const node of nodes.values()) node.remove()
      nodes.clear()
      toast.dispose()
    },
  }
}
