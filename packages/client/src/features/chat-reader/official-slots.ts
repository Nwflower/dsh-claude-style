import { createElement, memo, useMemo } from 'react'
import type { ComponentType, ReactNode } from 'react'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type { SlotEntryDef, SlotMap, SlotSpec, StoredEntry } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import type { HostValue } from '../../core/host'

/**
 * The host's own controls inside the reading view (D57), after dsh-better-
 * display's official-slots (MIT). A child slot has exactly one declarer, so
 * the view cannot render the host's slots as they are: each official family is
 * mirrored into a seat of this plugin's own, using only the public registry
 * operations, and the host's renderer runs every entry as it would in Chat.
 * The entries, their components and their declarations are never changed;
 * child slot names are translated in one thin wrapper.
 */

export const OFFICIAL_SLOTS = {
  actions: 'conversation.chat.assistant-actions',
  tools: 'tool.call.toolview',
  tail: 'conversation.chat.turnTail',
  nodes: 'conversation.chat.node',
  images: 'conversation.message.images',
} as const
export type OfficialFamily = keyof typeof OFFICIAL_SLOTS

export const OFFICIAL_SEATS = {
  actions: 'dsh-claude-reader.official.actions/conversation.chat.assistant-actions',
  tools: 'dsh-claude-reader.official.tools/tool.call.toolview',
  tail: 'dsh-claude-reader.official.tail/conversation.chat.turnTail',
  nodes: 'dsh-claude-reader.official.nodes/conversation.chat.node',
  images: 'dsh-claude-reader.official.images/conversation.message.images',
} as const
export type OfficialSeat = typeof OFFICIAL_SEATS[OfficialFamily]

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'dsh-claude-reader.official.actions/conversation.chat.assistant-actions': SlotMap['conversation.chat.assistant-actions']
    'dsh-claude-reader.official.tools/tool.call.toolview': SlotMap['tool.call.toolview']
    'dsh-claude-reader.official.tail/conversation.chat.turnTail': SlotMap['conversation.chat.turnTail']
    'dsh-claude-reader.official.nodes/conversation.chat.node': SlotMap['conversation.chat.node']
    'dsh-claude-reader.official.images/conversation.message.images': SlotMap['conversation.message.images']
  }
}

type Spec = SlotSpec<SlotEntryDef>
type Render = (key: string, owner: object, options?: object) => ReactNode
type Registration = StoredEntry['options'] & Omit<StoredEntry, 'options' | 'component'> & { name: string }

/** The public registry operations the mirror uses, type-erased: the seats are a runtime composition. */
export interface CompositionRegistry {
  spec(key: string): Spec | undefined
  /** Every registration in priority order, shadowed ones included. */
  entries(key: string): readonly StoredEntry[]
  /** The registration that renders in each cell. */
  entriesOfSlot(key: string): readonly StoredEntry[]
  subscribe(key: string, listener: () => void): () => void
  inject(key: string, effect: () => () => void): () => void
  register(options: Registration, component: unknown): () => void
}

/** The node kinds the view presents itself; every other kind, a future one included, reaches the host's renderer. */
const READER_NODES = new Set(['user', 'steering', 'assistant-step', 'tool-call', 'turn-tail', 'turn-process'])

/** The shape each family must keep; a change refuses the mirror rather than rendering into the wrong shape. */
const EXPECTED: Record<OfficialFamily, Spec> = {
  actions: { kind: 'list', scope: 'session' },
  tools: { kind: 'keyed', scope: 'session' },
  tail: { kind: 'list', scope: 'session' },
  nodes: { kind: 'keyed', scope: 'session' },
  images: { kind: 'single', scope: 'session' },
}

/** The seats the view declares, each with the shape of the family it mirrors. */
export function officialChildren(slots: Pick<CompositionRegistry, 'spec'>): { [K in OfficialSeat]: SlotSpec<SlotMap[K]> } {
  return Object.fromEntries(Object.entries(OFFICIAL_SLOTS).map(([name, source]) => {
    const family = name as OfficialFamily
    const spec = slots.spec(source)
    if (spec !== undefined && (spec.kind !== EXPECTED[family].kind || spec.scope !== EXPECTED[family].scope)) {
      throw new Error(`chat-reader: the host's ${source} slot changed shape (${spec.kind}/${spec.scope})`)
    }
    return [OFFICIAL_SEATS[family], spec ?? EXPECTED[family]]
  })) as { [K in OfficialSeat]: SlotSpec<SlotMap[K]> }
}

/** An entry's component with its declared child slot names translated to the mirrored seats. */
function translatedComponent(entry: StoredEntry, names: ReadonlyMap<string, string>) {
  if (names.size === 0) return entry.component
  const Original = entry.component as ComponentType<Record<string, unknown>>
  return memo(function OfficialSlotChildren(props: { renderSlot: Render, renderSlotChain?: Render } & Record<string, unknown>) {
    const renders = useMemo(() => {
      const translate = (render: Render | undefined): Render => (key, owner, options) => {
        const seat = names.get(key)
        if (seat === undefined || render === undefined) throw new Error(`chat-reader: an official entry rendered the undeclared child slot ${key}`)
        return render(seat, owner, options)
      }
      return { renderSlot: translate(props.renderSlot), ...(props.renderSlotChain === undefined ? {} : { renderSlotChain: translate(props.renderSlotChain) }) }
    }, [props.renderSlot, props.renderSlotChain])
    return createElement(Original, { ...props, ...renders })
  })
}

/**
 * Mirror one family's entries into a seat, incrementally: an unrelated arrival
 * does not remount the ones already mirrored, and an entry that leaves (an
 * unload, a hot reload) is disposed before its replacement.
 */
function mirrorOfficialSlot(slots: CompositionRegistry, source: string, target: string, namespace: string, accept: (entry: StoredEntry) => boolean = () => true): () => void {
  const mounted = new Map<StoredEntry, () => void>()
  let stopped = false
  const reconcile = () => {
    if (stopped) return
    const entries = slots.entriesOfSlot(source).filter(accept)
    const wanted = new Set(entries)
    for (const [entry, dispose] of mounted) {
      if (wanted.has(entry)) continue
      dispose()
      mounted.delete(entry)
    }
    for (const entry of entries) {
      if (mounted.has(entry)) continue
      const names = new Map(Object.keys(entry.children ?? {}).map(key => [key, `${namespace}/${key}`]))
      const children = Object.fromEntries([...names].map(([key, seat]) => [seat, entry.children![key]]))
      const disposers: (() => void)[] = []
      const { component: _component, options, children: _children, ...metadata } = entry
      disposers.push(slots.register({
        ...options,
        ...metadata,
        name: target,
        ...(names.size > 0 ? { children } : {}),
        registrant: `dsh-claude-style → ${entry.registrant ?? source}`,
      }, translatedComponent(entry, names)))
      for (const [key, seat] of names) disposers.push(mirrorOfficialSlot(slots, key, seat, namespace))
      mounted.set(entry, () => {
        for (const stop of disposers.splice(0).reverse()) stop()
      })
    }
  }
  const unsubscribe = slots.subscribe(source, reconcile)
  reconcile()
  return () => {
    stopped = true
    unsubscribe()
    for (const stop of [...mounted.values()].reverse()) stop()
    mounted.clear()
  }
}

/** Mirror every official family into the view's seats once the host declares it; returns the teardown. */
export function installOfficialSlots(slots: HostValue): () => void {
  const registry = slots as CompositionRegistry
  const disposers: (() => void)[] = []
  for (const [name, source] of Object.entries(OFFICIAL_SLOTS)) {
    const family = name as OfficialFamily
    disposers.push(registry.inject(source, () => {
      const spec = registry.spec(source)!
      const target = OFFICIAL_SEATS[family]
      const declared = registry.spec(target)
      if (spec.kind !== declared?.kind || spec.scope !== declared.scope) throw new Error(`chat-reader: the host's ${source} slot changed shape`)
      return mirrorOfficialSlot(registry, source, target, `dsh-claude-reader.official.${family}`,
        family === 'nodes' ? entry => !READER_NODES.has(entry.options.key ?? '') : undefined)
    }))
  }
  return () => {
    for (const stop of disposers.splice(0).reverse()) stop()
  }
}
