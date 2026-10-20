import { skin } from './skin'

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
 * (the other chat plugin's sheet, D9's foreign sheets).
 *
 * Sizes: one ResizeObserver for every element, and a second, `afterHost`,
 * made anew each time a subscription joins it. Resize callbacks run in the
 * order the observers were made, and the host makes its own when it mounts a
 * message column; a subscription made after the mount therefore runs after
 * the host's in the same frame (D74's follow takes the host's pin back * before it paints).
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
  /** Leave out the skin's own quiet writes (skin().quiet): they are no page change. */
  skipQuiet?: boolean
}

interface MutationSubscription {
  target: Node
  options: MutationOptions
  callback: (records: MutationRecord[]) => void
}

/** Every mutation subscription, in the order they were made. */
const mutationSubscriptions: MutationSubscription[] = []
/**
 * The same subscriptions as a set, so a batch's "still subscribed?" test is a
 * lookup rather than a scan of the array once per subscription per record.
 */
const mutationSubscriptionSet = new Set<MutationSubscription>()
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
  if (target !== null && target.closest('[' + skin().quiet + ']') !== null) return true
  if (record.addedNodes.length === 0 && record.removedNodes.length === 0) return false
  for (const node of record.addedNodes) {
    if (!(node instanceof Element) || !node.hasAttribute(skin().quiet)) return false
  }
  for (const node of record.removedNodes) {
    if (!(node instanceof Element) || !node.hasAttribute(skin().quiet)) return false
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

function routeRecords(records: MutationRecord[], audience: MutationSubscription[] = mutationSubscriptions.slice()) {
  for (const subscription of audience) {
    // A subscription an earlier callback in this batch removed hears nothing more.
    if (!mutationSubscriptionSet.has(subscription)) continue
    const selected = records.filter(record => selects(subscription, record))
    if (selected.length === 0) continue
    // One subscriber's error must neither stop the others nor vanish (D12).
    try { subscription.callback(selected) } catch (error) { reportError(error) }
  }
}

/** Attach the observer to every subscribed target with the union of their options. */
function refreshMutationObserver(joining?: MutationSubscription) {
  const pending = mutationObserver?.takeRecords() ?? []
  mutationObserver?.disconnect()
  if (mutationSubscriptions.length === 0) {
    mutationObserver = null
  } else {
    if (mutationObserver === null) mutationObserver = new MutationObserver(records => routeRecords(records))
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
  // Records the old attachment had gathered still belong to their subscribers,
  // and only to those: a subscription made after the change hears none of it.
  if (pending.length > 0) {
    const audience = mutationSubscriptions.filter(subscription => subscription !== joining)
    queueMicrotask(() => routeRecords(pending, audience))
  }
}

/**
 * Hear the mutations under `target` that `options` select.
 * @returns unsubscribe.
 */
export function subscribeMutations(target: Node, options: MutationOptions, callback: (records: MutationRecord[]) => void) {
  const subscription = { target, options, callback }
  mutationSubscriptions.push(subscription)
  mutationSubscriptionSet.add(subscription)
  refreshMutationObserver(subscription)
  return () => {
    const at = mutationSubscriptions.indexOf(subscription)
    if (at === -1) return
    mutationSubscriptions.splice(at, 1)
    mutationSubscriptionSet.delete(subscription)
    refreshMutationObserver()
  }
}

/**
 * One selector's live matches (D40): a reader takes the list once and reads it
 * every pass, so the document is queried when the registry is taken and when a
 * matching node arrives — never per pass. Registries are shared per selector
 * and reference counted: two features reading one selector pay for a single
 * subscription, and the last release takes it down.
 */
export interface MatchList<T extends Element> {
  /**
   * The matches right now, in document order; the same array until a match
   * changes. An arrival is seen once the bus has delivered its record — every
   * reader here reads inside a frame pass or a resize callback, both of which
   * run after the batch — while a departure is settled on the read itself.
   */
  all(): T[]
  /** Drop this reader; the registry leaves with its last reader. */
  release(): void
}

interface MatchRegistry {
  items: Set<Element>
  /** The document-ordered array handed out, or null while the set has changed since the last read. */
  ordered: Element[] | null
  /** Readers told of a change in the batch's own callback, before the browser computes style. */
  listeners: Set<() => void>
  readers: number
  stop: () => void
}

const matchRegistries = new Map<string, MatchRegistry>()

/** Document order, so `all()[0]` is the first match in the page, as a query returns it. */
function byDocumentOrder(left: Element, right: Element) {
  return (left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 ? -1 : 1
}

function registryFor(selector: string): MatchRegistry {
  const kept = matchRegistries.get(selector)
  if (kept !== undefined) {
    kept.readers += 1
    return kept
  }
  const registry: MatchRegistry = {
    items: new Set(document.querySelectorAll(selector)),
    ordered: null,
    listeners: new Set(),
    readers: 1,
    // Only added nodes are examined, and an element that left the document is
    // dropped by the next read: a removal needs no walk of the whole set. The
    // skin's quiet writes are heard too — its own synthetic placeholder is a
    // match — and the check on them is one `matches` per topmost added node.
    stop: () => {},
  }
  registry.stop = subscribeMutations(document.body, { childList: true, subtree: true }, records => {
    let changed = false
    // The batch is one frame of the host's mounting, and a subtree usually
    // arrives with its own children in the same batch: the additions are
    // gathered here and each is asked once, so a node a carrier in this batch
    // already holds is reached by that carrier's own walk instead of being
    // matched and searched again. Work a stream pays for every token.
    const batch = new Set<Element>()
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) batch.add(node)
      }
      if (record.removedNodes.length > 0) changed = true
    }
    const added = [...batch]
    for (let at = 0; at < added.length; at += 1) {
      const node = added[at]
      // Only an addition the batch already walked carries this one; a carrier
      // that arrives later is walked after, and reaching this node twice costs
      // one set insert.
      if (added.some((other, index) => index < at && other.contains(node))) continue
      if (node.matches(selector)) {
        registry.items.add(node)
        changed = true
      }
      const found = node.querySelectorAll(selector)
      for (let index = 0; index < found.length; index += 1) {
        registry.items.add(found[index])
        changed = true
      }
    }
    if (changed) {
      registry.ordered = null
      // A listener that leaves or joins here changes the set for the next batch only.
      for (const listener of [...registry.listeners]) listener()
    }
  })
  matchRegistries.set(selector, registry)
  return registry
}

/**
 * Read one selector's matches through a shared registry (D40). The list is
 * resolved once and kept current by the bus's child list records, so a pass
 * reads it without walking the document.
 *
 * @param onChange - told of every batch that changed the set, in that batch's
 *        own callback: the task the host changed the page in still reads the
 *        page as it was, and the next frame reads it with the change.
 */
export function observeMatches<T extends Element>(selector: string, onChange?: () => void): MatchList<T> {
  const registry = registryFor(selector)
  if (onChange !== undefined) registry.listeners.add(onChange)
  let released = false
  return {
    all() {
      if (registry.ordered !== null && registry.ordered.every(item => item.isConnected)) return registry.ordered as T[]
      // An element that left the document is no match, whether or not this
      // reader's own task has been handed the removal record yet.
      registry.ordered = [...registry.items].filter(item => item.isConnected).sort(byDocumentOrder)
      registry.items = new Set(registry.ordered)
      return registry.ordered as T[]
    },
    release() {
      if (released) return
      released = true
      if (onChange !== undefined) registry.listeners.delete(onChange)
      registry.readers -= 1
      if (registry.readers > 0) return
      registry.stop()
      matchRegistries.delete(selector)
    },
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
