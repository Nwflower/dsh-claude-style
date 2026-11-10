import { skin } from './skin'

/**
 * Shared mutation/size observation (D40). Small mutation batches dispatch before paint;
 * large batches use 8ms deferred slices except `beforePaint` subscribers.
 * Recreated `afterHost` ResizeObservers preserve host-before-skin callback order (D74).
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
  /** Run even in large batches when the callback writes state required by the same frame's paint. */
  beforePaint?: boolean
}

interface MutationSubscription {
  target: Node
  options: MutationOptions
  callback: (records: MutationRecord[]) => void
}

/** Every mutation subscription, in the order they were made. */
const mutationSubscriptions: MutationSubscription[] = []
/** Set form keeps liveness checks out of per-record array scans. */
const mutationSubscriptionSet = new Set<MutationSubscription>()
let mutationObserver: MutationObserver | null = null

/** Cache containment per record/target so shared batches avoid repeated ancestor walks. */
const containment = new WeakMap<MutationRecord, Map<Node, boolean>>()

/** Cache quiet classification per record, shared across subscriptions. */
const quietVerdicts = new WeakMap<MutationRecord, boolean>()

/** Quiet records occur inside marked containers or add/remove only marked nodes. */
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

/** Whether `record.target` sits inside `target`, answered once per record and target. */
function sitsInside(target: Node, record: MutationRecord) {
  let perTarget = containment.get(record)
  if (perTarget === undefined) {
    perTarget = new Map()
    containment.set(record, perTarget)
  }
  const known = perTarget.get(target)
  if (known !== undefined) return known
  const inside = target.contains(record.target)
  perTarget.set(target, inside)
  return inside
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
    if (!sitsInside(target, record) && !(pageWide(target) && !record.target.isConnected)) return false
  }
  if (options.skipQuiet !== true) return true
  const known = quietVerdicts.get(record)
  if (known !== undefined) return !known
  const quiet = isQuietRecord(record)
  quietVerdicts.set(record, quiet)
  return !quiet
}

/** Weight records plus bounded direct-child counts; large mounts defer without a deep subtree scan. */
const SYNC_BATCH_WEIGHT = 100
/** How long one deferred slice may run before the rest waits for the next task. */
const DISPATCH_BUDGET_MS = 8

/** One batch waiting for its deferred turn; `cursor` is the subscription it stopped before. */
interface DeferredBatch {
  records: MutationRecord[]
  audience: MutationSubscription[]
  cursor: number
}

const deferredBatches: DeferredBatch[] = []
let dispatchTimer: ReturnType<typeof setTimeout> | null = null

/** The cost a batch is read as (see SYNC_BATCH_WEIGHT). */
function batchWeight(records: MutationRecord[]) {
  let weight = 0
  for (const record of records) {
    weight += 1
    for (const node of record.addedNodes) {
      if (node instanceof Element) weight += 1 + Math.min(node.childElementCount, 128)
    }
  }
  return weight
}

/** Give the deferred batches their next slice, once the task that made them has painted. */
function scheduleDispatch() {
  if (dispatchTimer !== null || deferredBatches.length === 0) return
  dispatchTimer = setTimeout(dispatchSlices, 0)
}

/**
 * The records one subscription selects out of a batch. Every match registry
 * asks the same body child-list question of the same batch, so that answer is
 * one array: the additions derived from it are then gathered once, not once
 * per registry (a session switch mounts a whole conversation in one batch).
 */
const bodyChildListSelections = new WeakMap<MutationRecord[], MutationRecord[]>()

function bodyChildListOnly(subscription: MutationSubscription) {
  const options = subscription.options
  return subscription.target === document.body &&
    options.childList === true && options.subtree === true &&
    options.characterData !== true && options.characterDataOldValue !== true &&
    options.attributes !== true && options.attributeFilter === undefined &&
    options.attributeOldValue !== true && options.skipQuiet !== true && options.beforePaint !== true
}

function selectedRecords(subscription: MutationSubscription, records: MutationRecord[]) {
  if (!bodyChildListOnly(subscription)) {
    const selected = records.filter(record => selects(subscription, record))
    // One batch answers every subscriber with the same additions, so a feature
    // reading them (batchAdditions) does not walk the records a second time.
    additionsByBatch.set(selected, additionsOf(records))
    return selected
  }
  const known = bodyChildListSelections.get(records)
  if (known !== undefined) return known
  const selected = records.filter(record => selects(subscription, record))
  bodyChildListSelections.set(records, selected)
  additionsByBatch.set(selected, additionsOf(records))
  return selected
}

/** Run deferred callbacks until the slice's budget is spent, then wait for the next task. */
function dispatchSlices() {
  dispatchTimer = null
  const started = performance.now()
  while (deferredBatches.length > 0) {
    const batch = deferredBatches[0]
    while (batch.cursor < batch.audience.length) {
      const subscription = batch.audience[batch.cursor++]
      // A subscription removed before its turn hears nothing more.
      if (!mutationSubscriptionSet.has(subscription)) continue
      const selected = selectedRecords(subscription, batch.records)
      if (selected.length === 0) continue
      // One subscriber's error must neither stop the others nor vanish (D12).
      try { subscription.callback(selected) } catch (error) { reportError(error) }
      if (performance.now() - started >= DISPATCH_BUDGET_MS) {
        scheduleDispatch()
        return
      }
    }
    deferredBatches.shift()
  }
}

/** Hand one subscription the records it selects, isolating its failure from the rest (D12). */
function deliver(subscription: MutationSubscription, records: MutationRecord[]) {
  const selected = selectedRecords(subscription, records)
  if (selected.length === 0) return
  try { subscription.callback(selected) } catch (error) { reportError(error) }
}

function routeRecords(records: MutationRecord[], audience: MutationSubscription[] = mutationSubscriptions.slice()) {
  // A batch a session switch mounts is scanned after the paint: its callbacks
  // are idempotent passes, and nothing the reader is looking at in that frame
  // is drawn by them. A subscription whose writes the paint reads asks for
  // `beforePaint` and runs now (D40's consequence names both timings).
  if (batchWeight(records) > SYNC_BATCH_WEIGHT) {
    const deferred: MutationSubscription[] = []
    for (const subscription of audience) {
      // A subscription an earlier callback in this batch removed hears nothing more.
      if (!mutationSubscriptionSet.has(subscription)) continue
      if (subscription.options.beforePaint === true) deliver(subscription, records)
      else deferred.push(subscription)
    }
    if (deferred.length > 0) {
      deferredBatches.push({ records, audience: deferred, cursor: 0 })
      scheduleDispatch()
    }
    return
  }
  for (const subscription of audience) {
    // A subscription an earlier callback in this batch removed hears nothing more.
    if (!mutationSubscriptionSet.has(subscription)) continue
    deliver(subscription, records)
  }
}

/** Attach the observer to every subscribed target with the union of their options. */
function refreshMutationObserver(joining?: MutationSubscription) {
  const pending = mutationObserver?.takeRecords() ?? []
  mutationObserver?.disconnect()
  if (mutationSubscriptions.length === 0) {
    mutationObserver = null
    // Nothing is left to hear the queued batches: drop them rather than scan a
    // page no feature is watching any more.
    deferredBatches.length = 0
    if (dispatchTimer !== null) {
      clearTimeout(dispatchTimer)
      dispatchTimer = null
    }
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

/** Subscribe to selected mutations; returned function unsubscribes. */
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

/** Reference-counted live selector registry; query on creation/arrival, not every pass (D40). */
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

/**
 * What every match registry derives from one batch: the additions gathered
 * once, the position each holds, and whether anything left. A session switch
 * mounts a whole conversation in one batch, and every registry asks the same
 * of it; the shapes below are computed once for all of them.
 */
interface BatchAdditions {
  added: Element[]
  addedAt: Map<Element, number>
  placedIn: Element | null
  removed: boolean
}

const additionsByBatch = new WeakMap<MutationRecord[], BatchAdditions>()

/** Gather the batch's element additions once; a carrier the batch also added is left to its carrier's walk. */
function additionsOf(records: MutationRecord[]): BatchAdditions {
  const known = additionsByBatch.get(records)
  if (known !== undefined) return known
  const batch = new Set<Element>()
  let removed = false
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (node instanceof Element) batch.add(node)
    }
    if (record.removedNodes.length > 0) removed = true
  }
  const added = [...batch]
  const addedAt = new Map<Element, number>(added.map((node, index): [Element, number] => [node, index]))
  // The element the addition went into, asked the same way as the node.
  let placedIn: Element | null = null
  for (const record of records) {
    if (record.addedNodes.length === 0 || !(record.target instanceof Element)) continue
    placedIn = record.target
  }
  const summary = { added, addedAt, placedIn, removed }
  additionsByBatch.set(records, summary)
  return summary
}

/**
 * The elements one batch added, its position and whether anything left (D40).
 * Every subscriber of the batch reads the same object: the additions are walked
 * once for the registries, and a feature asking here does not walk the records
 * again. Read it in the callback the records arrived in — the set describes that
 * batch alone.
 */
export function batchAdditions(records: MutationRecord[]): BatchAdditions {
  return additionsOf(records)
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
    // A batch may bring in an element before the page has attached it, and that
    // element is kept as a match: a pass that follows reads the registry, and the
    // hint drawn into a card being rebuilt has to stand by then. The element the
    // addition went into answers as the node does: that card is there already.
    stop: () => {},
  }
  registry.stop = subscribeMutations(document.body, { childList: true, subtree: true }, records => {
    const summary = additionsOf(records)
    let changed = summary.removed
    // A subtree the batch removed leaves the registry now, not at a later read:
    // a selector no pass reads again would otherwise hold the whole transcript
    // of a switched-away session for the rest of the page's life. The pruning
    // runs before this batch's additions, so a node the page moved stays.
    if (summary.removed) {
      const removedRoots: Element[] = []
      for (const record of records) {
        for (const node of record.removedNodes) {
          if (node instanceof Element) removedRoots.push(node)
        }
      }
      if (removedRoots.length > 0) {
        for (const item of registry.items) {
          for (const root of removedRoots) {
            if (root === item || root.contains(item)) {
              registry.items.delete(item)
              break
            }
          }
        }
      }
    }
    // A node the page has not attached yet is still asked of itself: it may
    // already be the card it will stand in (see this registry's note above).
    const added = summary.added
    const addedAt = summary.addedAt
    const placedIn = summary.placedIn
    for (let at = 0; at < added.length; at += 1) {
      const node = added[at]
      let carried = false
      for (let parent = node.parentElement; parent !== null; parent = parent.parentElement) {
        const earlier = addedAt.get(parent)
        if (earlier !== undefined && earlier < at) {
          carried = true
          break
        }
      }
      if (carried) continue
      // A node the page has not attached yet is asked of itself: it may already
      // be the card it will stand in.
      if (!node.isConnected && (node.matches(selector) || placedIn?.matches(selector) === true)) {
        registry.items.add(node)
        changed = true
        continue
      }
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

/**
 * The attribute names a selector's matching turns on, so the marker's
 * subscription watches those and nothing else. A marker with neither an
 * attribute nor a class has no arrival to hear and is refused here.
 */
function markerAttributes(selector: string): string[] {
  const names = new Set<string>()
  for (const match of selector.matchAll(/\[\s*([\w-]+)/g)) names.add(match[1])
  if (/(^|[\s,>+~])\./.test(selector)) names.add('class')
  if (names.size === 0) throw new Error(`observeMarker: "${selector}" names no attribute or class, so no arrival can be watched`)
  return [...names]
}

/** The elements a marker sits on, kept current as the marker arrives and leaves (D40). */
export interface MarkerList<T extends Element> {
  all(): readonly T[]
  release(): void
}

/**
 * Read the elements carrying one marker — an attribute or a class the host adds
 * to nodes already standing (D40). The shared match registry follows child
 * lists alone, so a marker that arrives by attribute is missed there; this
 * subscription watches the attribute names the selector reads and answers with
 * the elements carrying it, sorted by nothing the caller may depend on.
 */
export function observeMarker<T extends Element>(selector: string): MarkerList<T> {
  const matches = new Set<Element>(document.querySelectorAll(selector))
  const stop = subscribeMutations(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: markerAttributes(selector),
  }, records => {
    for (const record of records) {
      if (record.type === 'attributes') {
        const target = record.target
        if (!(target instanceof Element)) continue
        if (target.matches(selector)) matches.add(target)
        else matches.delete(target)
        continue
      }
      // A removal drops the node now; what stood under it is dropped by the read
      // below, which keeps a subtree taken away from holding the transcript.
      for (const node of record.removedNodes) if (node instanceof Element) matches.delete(node)
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue
        if (node.matches(selector)) matches.add(node)
        for (const found of node.querySelectorAll(selector)) matches.add(found)
      }
    }
  })
  return {
    all() {
      for (const element of matches) if (!element.isConnected) matches.delete(element)
      return [...matches] as T[]
    },
    release() {
      stop()
      matches.clear()
    },
  }
}

/** A size subscription: the elements it watches and what hears their entries. */
interface SizeSubscription {
  targets: Element[]
  /** The same elements as a set: one batch can carry thousands of entries, and `includes()` would scan them per entry. */
  lookup: Set<Element>
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
      const own = entries.filter(entry => subscription.lookup.has(entry.target))
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
  const list = Array.isArray(targets) ? [...targets] : [targets]
  const subscription = { targets: list, lookup: new Set(list), callback }
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
