import * as React from 'react'
import * as reactDom from 'react-dom/client'
import { buildElement } from '@dsh-claude-style/engine/dom'
import { currentSessionId, hostLocale } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { HostSlotRegistration, HostSlotsService } from '@dsh-claude-style/contracts/services'
import { activeLocale } from '../../core/i18n'
import { createHostToast } from '../../shared/host-toast'
import { copy } from './copy'

/** The host's list slot under the model and effort rows of its own model menu. */
export const MODEL_OPTIONS_SLOT_KEY = 'conversation.input.model.options'

/** Entries of that slot the picker draws itself: the host's Agent Teams row is team-mode.ts. */
const DRAWN_BY_PICKER = new Set(['agent-team'])

/** One mounted entry: the node it stands in, the React root drawing it, and what its last draw read. */
interface MountedOption {
  node: HTMLElement
  root: reactDom.Root
  drawn: string
}

/**
 * Keeps one plugin's row from taking the others down. A row is drawn outside
 * the host's React tree, so a component that reads a session hook only the
 * host's menu provides throws here; the boundary is where that one failure
 * stops (D12), and the warning names the row it hid.
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

/**
 * The rows other plugins hand to the host's model menu
 * (`conversation.input.model.options`). The skin's picker replaces that menu,
 * so it draws the slot's entries itself, each in its own React root in the
 * picker's footer, with the props the host's menu composes for them: the menu
 * controls (`locked`, `dismiss`, `reportFailure`, `openPane`), the
 * registrant's business face for the shown session, and the `t` seat of the
 * entry's dictionary namespace.
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
}) {
  const { ctx } = options
  const toast = createHostToast()
  const mounted = new Map<string, MountedOption>()

  /** The entries to draw, in the order the host's menu draws them. */
  function entries(): Array<HostSlotRegistration & { options: { id: string } }> {
    const slots = options.slots()
    if (slots === null || currentSessionId(ctx) === null) return []
    const listed: Array<HostSlotRegistration & { options: { id: string } }> = []
    for (const entry of slots.entriesOfSlot(MODEL_OPTIONS_SLOT_KEY)) {
      const id = entry.options.id
      if (id === undefined || DRAWN_BY_PICKER.has(id) || entry.component === undefined) continue
      listed.push(entry as HostSlotRegistration & { options: { id: string } })
    }
    return listed
  }

  /** The props the host's menu composes for one entry. */
  function propsFor(entry: HostSlotRegistration, sessionId: string): Record<string, unknown> {
    const props: Record<string, unknown> = {
      ...entry.inject?.(sessionId),
      sessionId,
      locked: options.locked(),
      dismiss: options.dismiss,
      reportFailure(message: string) { toast.show({ text: message }) },
      openPane() { toast.show({ text: copy('pluginPaneUnsupported') }) },
    }
    const locale = hostLocale(ctx)
    if (entry.locale !== undefined && locale !== null) props.t = locale.bind(entry.locale)
    return props
  }

  /**
   * Draw one row when what it reads changed: the session, the menu's lock and
   * the language. A pass that finds them standing writes nothing (D40); the
   * row's own state re-renders it from inside.
   */
  function draw(entry: HostSlotRegistration & { options: { id: string } }, sessionId: string, row: MountedOption) {
    const drawn = `${sessionId}|${options.locked()}|${activeLocale()}`
    if (row.drawn === drawn) return
    row.drawn = drawn
    const component = entry.component as React.ComponentType<Record<string, unknown>>
    // The session keys the boundary, so a row that failed in one session is tried again in the next.
    row.root.render(React.createElement(
      OptionBoundary,
      { id: entry.options.id, key: sessionId },
      React.createElement(component, propsFor(entry, sessionId)),
    ))
  }

  function unmount(id: string) {
    const row = mounted.get(id)
    if (row === undefined) return
    row.root.unmount()
    row.node.remove()
    mounted.delete(id)
  }

  return {
    /** What the footer's layout depends on: the session and the entries drawn for it. */
    signature(): string {
      const sessionId = currentSessionId(ctx)
      const ids: string[] = []
      for (const entry of entries()) ids.push(entry.options.id)
      return `${sessionId ?? ''}:${ids.join(',')}`
    },
    /** The rows for the footer, drawn for the shown session; entries that left are unmounted. */
    rows(): HTMLElement[] {
      const sessionId = currentSessionId(ctx)
      const listed = entries()
      const kept = new Set<string>()
      const nodes: HTMLElement[] = []
      for (const entry of listed) {
        kept.add(entry.options.id)
        let row = mounted.get(entry.options.id)
        if (row === undefined) {
          const node = buildElement('div', 'dsh-claude-model-plugin-option')
          node.setAttribute('data-option-id', entry.options.id)
          row = { node, root: reactDom.createRoot(node), drawn: '' }
          mounted.set(entry.options.id, row)
        }
        if (sessionId !== null) draw(entry, sessionId, row)
        nodes.push(row.node)
      }
      for (const id of [...mounted.keys()]) if (!kept.has(id)) unmount(id)
      return nodes
    },
    /** Redraw the mounted rows with the current menu state (a selection in flight locks them). */
    refresh() {
      const sessionId = currentSessionId(ctx)
      if (sessionId === null) return
      for (const entry of entries()) {
        const row = mounted.get(entry.options.id)
        if (row !== undefined) draw(entry, sessionId, row)
      }
    },
    dispose() {
      for (const id of [...mounted.keys()]) unmount(id)
      toast.dispose()
    },
  }
}
