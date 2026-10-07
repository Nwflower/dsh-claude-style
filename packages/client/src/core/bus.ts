import { QUIET_ATTR } from '../constants'

/**
 * The observation bus (D40): the page has one MutationObserver and one
 * ResizeObserver registry, and every feature subscribes through them.
 *
 * Mutations: each subscription names a target and the records it wants, in
 * MutationObserver's own terms. The one observer watches every subscribed
 * target with the union of their options, and each callback batch is routed
 * back: a subscription receives exactly the records its own options select,
 * in the order the subscriptions were made — the order separate observers
 * made in that order would have been called in. The observer is attached only
 * while a subscription exists, so the head is watched only while someone asks
 * (the other chat plugin's sheet, D33's foreign sheets).
 *
 * Sizes: one ResizeObserver for every element, and a second, `afterHost`,
 * made anew each time a subscription joins it. Resize callbacks run in the
 * order the observers were made, and the host makes its own when it mounts a
 * message column; a subscription made after the mount therefore runs after
 * the host's in the same frame (D32's follow takes the host's pin back
 * before it paints).
 */

export interface MutationOptions {
  childList?: boolean
  characterData?: boolean
  characterDataOldValue?: boolean
  /** Attribute changes; `attributeFilter` alone implies them, as MutationObserver has it. */
  attributes?: boolean
  attributeFilter?: string[]
  attributeOldValue?: boolean
  subtree?: boolean
  /** Leave out the skin's own quiet writes (QUIET_ATTR): they are no page change. */
  skipQuiet?: boolean
}

interface MutationSubscription {
  target: Node
  options: MutationOptions
  callback: (records: MutationRecord[]) => void
}

/** Every mutation subscription, in the order they were made. */
const mutationSubscriptions: MutationSubscription[] = []
let mutationObserver: MutationObserver | null = null

/**
 * Whether a record is one of the skin's own quiet writes: a change inside a
 * marked container, or only marked nodes added or removed.
 */
function isQuietRecord(record: MutationRecord) {
  // The target is the node the change happened on: an element for a child
  // list or an attribute, and the text node itself for a character change —
  // which is why the parent is asked as well.
  const target = record.target instanceof Element ? record.target : record.target.parentElement
  if (target !== null && target.closest('[' + QUIET_ATTR + ']') !== null) return true
  if (record.addedNodes.length === 0 && record.removedNodes.length === 0) return false
  for (const node of record.addedNodes) {
    if (!(node instanceof Element) || !node.hasAttribute(QUIET_ATTR)) return false
  }
  for (const node of record.removedNodes) {
    if (!(node instanceof Element) || !node.hasAttribute(QUIET_ATTR)) return false
  }
  return true
}

/** The page-wide targets: a node detached in the batch still reports to them, as it would to their own observer. */
function pageWide(target: Node) {
  return target === document || target === document.documentElement || target === document.body
}

/** Whether a subscription's own options select this record. */
function selects(subscription: MutationSubscription, record: MutationRecord) {
  const options = subscription.options
  if (record.type === 'childList' && options.childList !== true) return false
  if (record.type === 'characterData' && options.characterData !== true) return false
  if (record.type === 'attributes') {
    const filter = options.attributeFilter
    if (options.attributes !== true && filter === undefined) return false
    if (filter !== undefined && !filter.includes(record.attributeName ?? '')) return false
  }
  const target = subscription.target
  if (record.target !== target) {
    if (options.subtree !== true) return false
    if (!target.contains(record.target) && !(pageWide(target) && !record.target.isConnected)) return false
  }
  return options.skipQuiet !== true || !isQuietRecord(record)
}

function routeRecords(records: MutationRecord[]) {
  for (const subscription of mutationSubscriptions.slice()) {
    // A subscription an earlier callback in this batch removed hears nothing more.
    if (!mutationSubscriptions.includes(subscription)) continue
    const selected = records.filter(record => selects(subscription, record))
    if (selected.length === 0) continue
    // One subscriber's error must neither stop the others nor vanish (D12).
    try { subscription.callback(selected) } catch (error) { reportError(error) }
  }
}

/** Attach the observer to every subscribed target with the union of their options. */
function refreshMutationObserver() {
  const pending = mutationObserver?.takeRecords() ?? []
  mutationObserver?.disconnect()
  if (mutationSubscriptions.length === 0) {
    mutationObserver = null
  } else {
    if (mutationObserver === null) mutationObserver = new MutationObserver(routeRecords)
    const merged = new Map<Node, MutationObserverInit>()
    for (const { target, options } of mutationSubscriptions) {
      const into = merged.get(target) ?? {}
      if (options.childList === true) into.childList = true
      if (options.characterData === true) into.characterData = true
      if (options.characterDataOldValue === true) into.characterDataOldValue = true
      if (options.subtree === true) into.subtree = true
      if (options.attributeOldValue === true) into.attributeOldValue = true
      if (options.attributes === true && options.attributeFilter === undefined) {
        into.attributes = true
        into.attributeFilter = undefined
        merged.set(target, into)
        continue
      }
      if (options.attributeFilter !== undefined && !(into.attributes === true && into.attributeFilter === undefined)) {
        into.attributeFilter = [...new Set([...(into.attributeFilter ?? []), ...options.attributeFilter])]
      }
      merged.set(target, into)
    }
    for (const [target, init] of merged) {
      if (init.attributeFilter === undefined) delete init.attributeFilter
      mutationObserver.observe(target, init)
    }
  }
  // Records the old attachment had gathered still belong to their subscribers.
  if (pending.length > 0) queueMicrotask(() => routeRecords(pending))
}

/**
 * Hear the mutations under `target` that `options` select.
 * @returns unsubscribe.
 */
export function subscribeMutations(target: Node, options: MutationOptions, callback: (records: MutationRecord[]) => void) {
  const subscription = { target, options, callback }
  mutationSubscriptions.push(subscription)
  refreshMutationObserver()
  return () => {
    const at = mutationSubscriptions.indexOf(subscription)
    if (at === -1) return
    mutationSubscriptions.splice(at, 1)
    refreshMutationObserver()
  }
}

/** A size subscription: the elements it watches and what hears their entries. */
interface SizeSubscription {
  targets: Element[]
  callback: (entries: ResizeObserverEntry[]) => void
}

/** One resize observer, its subscriptions in the order they were made, and how many watch each element. */
interface SizeRegistry {
  observer: ResizeObserver | null
  subscriptions: SizeSubscription[]
  watchers: Map<Element, number>
}

const early: SizeRegistry = { observer: null, subscriptions: [], watchers: new Map() }
const afterHost: SizeRegistry = { observer: null, subscriptions: [], watchers: new Map() }

/** Each subscription hears its own elements' entries of a batch, once per batch, in subscription order. */
function makeSizeObserver(registry: SizeRegistry) {
  return new ResizeObserver(entries => {
    for (const subscription of registry.subscriptions.slice()) {
      if (!registry.subscriptions.includes(subscription)) continue
      const own = entries.filter(entry => subscription.targets.includes(entry.target))
      if (own.length === 0) continue
      // A failing subscription must not keep the rest of the batch from hearing it (D12); reportError still surfaces the failure.
      try { subscription.callback(own) } catch (error) { reportError(error) }
    }
  })
}

/**
 * Hear the sizes of `targets`, one call per resize batch with their entries.
 * Like a ResizeObserver of its own, the subscription first hears the sizes as
 * they are now. `afterHost` places it after every resize observer the host
 * made before this call.
 * @returns unsubscribe.
 */
export function observeSize(targets: Element | Element[], callback: (entries: ResizeObserverEntry[]) => void, options?: { afterHost?: boolean }) {
  const registry = options?.afterHost === true ? afterHost : early
  const subscription = { targets: Array.isArray(targets) ? [...targets] : [targets], callback }
  registry.subscriptions.push(subscription)
  for (const target of subscription.targets) registry.watchers.set(target, (registry.watchers.get(target) ?? 0) + 1)
  if (registry === afterHost) {
    // Made anew, so it is younger than the host's; every element is watched
    // again and reports its size once more, which a size callback takes as no change.
    registry.observer?.disconnect()
    registry.observer = makeSizeObserver(registry)
    for (const element of registry.watchers.keys()) registry.observer.observe(element)
  } else {
    if (registry.observer === null) registry.observer = makeSizeObserver(registry)
    for (const target of subscription.targets) {
      // Watched again, so the new subscription hears the current size first.
      if (registry.watchers.get(target)! > 1) registry.observer.unobserve(target)
      registry.observer.observe(target)
    }
  }
  return () => {
    const at = registry.subscriptions.indexOf(subscription)
    if (at === -1) return
    registry.subscriptions.splice(at, 1)
    for (const target of subscription.targets) {
      const count = registry.watchers.get(target)! - 1
      if (count > 0) {
        registry.watchers.set(target, count)
        continue
      }
      registry.watchers.delete(target)
      registry.observer?.unobserve(target)
    }
    if (registry.subscriptions.length > 0) return
    registry.observer?.disconnect()
    registry.observer = null
  }
}
