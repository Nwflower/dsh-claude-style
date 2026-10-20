import { CHAT_FLOW_SLOT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeMatches, subscribeMutations } from './bus'
import type { MatchList } from './bus'

/**
 * Keep the mark the sodium rewrite's gap rules fall back on (D78): on every
 * child of a chat column and of the flow slot.
 *
 * Those rules are bucketed on what the host writes on the flow's children when
 * it creates them; the mark is the branch that catches a child of any other
 * kind. A child that leaves keeps its mark, which every rule reading it ignores
 * outside the flow.
 *
 * Each container is watched on its own child list, so no other part of the page
 * reaches this keeper, and a batch marks the children it added: a container's
 * whole list is walked once, when the container is found.
 *
 * The bus hands the records over in the mutation observer's callback, after the
 * host's change and before the browser computes style for a frame: a child only
 * the mark catches has no gap in a layout the host reads in the task that
 * inserted it.
 *
 * @param columns - the host chat module's hashed class of a chat column, as its rules name it.
 * @param childMark - the attribute the rewritten rules read.
 * @returns stop: the watch ends, and the mark comes off every container's children.
 */
export function keepFlowChildMark(columns: readonly string[], childMark: string) {
  /** Each container the columns and the flow slot matched, with the watch on its own children. */
  const watched = new Map<Element, () => void>()
  /** The registries behind `watched`: a container arriving or leaving is told here, so the keeper never watches the page itself. */
  const lists: MatchList<Element>[] = []

  const mark = (child: Element) => {
    if (!child.hasAttribute(childMark)) child.setAttribute(childMark, '')
  }

  /** The children this batch added to `container`: the children of it that are not marked yet. */
  const markAdded = (container: Element, records: readonly MutationRecord[]) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element && node.parentNode === container) mark(node)
      }
    }
  }

  const watch = (container: Element) => {
    for (const child of container.children) mark(child)
    watched.set(container, subscribeMutations(container, { childList: true }, records => markAdded(container, records)))
  }

  /** Follow the containers the lists hold, on each change of either list. */
  function sync() {
    const live = new Set<Element>()
    for (const list of lists) for (const container of list.all()) live.add(container)
    for (const [container, stop] of watched) {
      if (live.has(container)) continue
      stop()
      watched.delete(container)
    }
    for (const container of live) if (!watched.has(container)) watch(container)
  }

  for (const selector of [CHAT_FLOW_SLOT_SELECTOR, ...columns.map((name) => `.${name}`)]) lists.push(observeMatches<Element>(selector, sync))
  sync()

  return () => {
    for (const stop of watched.values()) stop()
    watched.clear()
    for (const list of lists) {
      for (const container of list.all()) for (const child of container.children) child.removeAttribute(childMark)
      list.release()
    }
  }
}
