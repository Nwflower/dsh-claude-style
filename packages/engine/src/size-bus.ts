/** Shared size observation (D40): entries are routed by target, not scanned per subscription. */

interface SizeSubscription {
  /** Live elements held only for this subscription's lifetime. */
  targets: Set<Element>
  callback: (entries: ResizeObserverEntry[]) => void
}

interface SizeRegistry {
  observer: ResizeObserver | null
  subscriptions: SizeSubscription[]
  /** Live element routes; entries leave with their last subscription. */
  routes: Map<Element, Set<SizeSubscription>>
}

const early: SizeRegistry = { observer: null, subscriptions: [], routes: new Map() }
const afterHost: SizeRegistry = { observer: null, subscriptions: [], routes: new Map() }

/** Each subscription hears its own entries once per batch, in subscription order. */
function makeSizeObserver(registry: SizeRegistry) {
  return new ResizeObserver(entries => {
    const matched = new Map<SizeSubscription, ResizeObserverEntry[]>()
    for (const entry of entries) {
      const subscriptions = registry.routes.get(entry.target)
      if (subscriptions === undefined) continue
      for (const subscription of subscriptions) {
        const own = matched.get(subscription)
        if (own === undefined) matched.set(subscription, [entry])
        else own.push(entry)
      }
    }
    // The overwhelmingly common case needs no scan of the subscription list.
    if (matched.size === 1) {
      for (const [subscription, own] of matched) {
        if (!registry.subscriptions.includes(subscription)) continue
        try { subscription.callback(own) } catch (error) { reportError(error) }
      }
      return
    }
    for (const subscription of registry.subscriptions.slice()) {
      const own = matched.get(subscription)
      if (own === undefined || !registry.subscriptions.includes(subscription)) continue
      // A failing subscription must not keep the rest of the batch from hearing it (D12).
      try { subscription.callback(own) } catch (error) { reportError(error) }
    }
  })
}

function rebuildAfterHost(registry: SizeRegistry) {
  // A new observer is younger than every observer the host made before this call.
  registry.observer?.disconnect()
  registry.observer = makeSizeObserver(registry)
  for (const element of registry.routes.keys()) registry.observer.observe(element)
}

function addTarget(registry: SizeRegistry, subscription: SizeSubscription, target: Element) {
  let subscriptions = registry.routes.get(target)
  if (subscriptions === undefined) {
    subscriptions = new Set()
    registry.routes.set(target, subscriptions)
  }
  const watched = subscriptions.size > 0
  subscriptions.add(subscription)
  subscription.targets.add(target)
  if (registry === afterHost) return
  if (registry.observer === null) registry.observer = makeSizeObserver(registry)
  // Watched again so this subscription hears the current size first.
  if (watched) registry.observer.unobserve(target)
  registry.observer.observe(target)
}

function removeTarget(registry: SizeRegistry, subscription: SizeSubscription, target: Element) {
  const subscriptions = registry.routes.get(target)
  if (subscriptions === undefined) return
  subscriptions.delete(subscription)
  subscription.targets.delete(target)
  if (subscriptions.size > 0) return
  registry.routes.delete(target)
  registry.observer?.unobserve(target)
}

/** A dynamic set of elements sharing one size subscription. */
export interface SizeGroup {
  add(target: Element | readonly Element[]): void
  delete(target: Element): void
  has(target: Element): boolean
  stop(): void
}

/** Observe a changing element set without creating one subscription per element. */
export function observeSizeGroup(callback: (entries: ResizeObserverEntry[]) => void, options?: { afterHost?: boolean }): SizeGroup {
  const registry = options?.afterHost === true ? afterHost : early
  const subscription: SizeSubscription = { targets: new Set(), callback }
  registry.subscriptions.push(subscription)
  let stopped = false
  return {
    add(input) {
      if (stopped) return
      let changed = false
      for (const target of Array.isArray(input) ? input : [input]) {
        if (subscription.targets.has(target)) continue
        addTarget(registry, subscription, target)
        changed = true
      }
      if (changed && registry === afterHost) rebuildAfterHost(registry)
    },
    delete(target) {
      if (!stopped) removeTarget(registry, subscription, target)
    },
    has(target) {
      return !stopped && subscription.targets.has(target)
    },
    stop() {
      if (stopped) return
      stopped = true
      const at = registry.subscriptions.indexOf(subscription)
      if (at !== -1) registry.subscriptions.splice(at, 1)
      for (const target of [...subscription.targets]) removeTarget(registry, subscription, target)
      if (registry.subscriptions.length > 0) return
      registry.observer?.disconnect()
      registry.observer = null
    },
  }
}

/** Hear the sizes of targets, one call per resize batch with their entries. */
export function observeSize(targets: Element | Element[], callback: (entries: ResizeObserverEntry[]) => void, options?: { afterHost?: boolean }) {
  const group = observeSizeGroup(callback, options)
  group.add(Array.isArray(targets) ? targets : [targets])
  return () => group.stop()
}
