import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * Minimal DSH loader context types (D73); the host ships no types for them.
 * `get` returns undefined for missing services and callers handle that boundary (D12).
 */

/** One host plugin context, as the half reads it. */
export interface DshContext {
  /** A service by name; `undefined` when the host does not provide it. */
  get(name: string): any
  /** Wait for services and hand back a scope that declares them. */
  inject?(deps: string[], run: (scope: DshScope) => void): void
  /** The host's logger, when it has one. */
  logger?: { warn?(message: string): void, info?(message: string): void, error?(message: string): void }
  /** Run a function and drop its disposals with this generation. */
  effect?(run: () => void): void
  /** Listen for one host event; the listener drops with this generation. */
  on?(name: string, listener: (...args: any[]) => void): unknown
  /** The loader fiber, which carries the entry that mounted this half. */
  fiber?: { entry?: { id?: unknown, options?: unknown } }
}

/** The scope `inject` hands back: the base context plus the declared services. */
export interface DshScope extends DshContext {
  webServer?: DshWebServer
  settings?: DshSettings
  /** Run a function and drop it with this generation, naming it in the host's log. */
  effect(run: () => void, name?: string): void
}

/**
 * Observation leases pin prepared logs until disposal; always release them.
 * `events` is the host's frozen array and must not be mutated.
 */
export interface DshSessionObservation {
  readonly events: readonly unknown[]
  /** Release the lease (`Symbol.dispose`). */
  dispose(): void
}

/** The host's settings domain, as the half configures it. */
interface DshSettings {
  configure(options: { auto?: boolean }, fiber?: unknown): unknown
}

/** The host's web server service, as the half registers routes on it. */
interface DshWebServer {
  /** Register one route; a path another plugin holds is refused by throwing, and the answer disposes it. */
  register(options: DshRoute): unknown
}

/** Authenticated peer scope handed to route handlers by hosts that fence routes in `webServer`. */
export interface DshPeerScope {
  readonly principal?: { readonly kind?: string }
  readonly signal?: AbortSignal
}

/** One route registration: the path it answers, how paths match, and its handler. */
export interface DshRoute {
  path: string
  /** `prefix` matches every path under `path`; a route without it matches the path alone. */
  kind?: string
  handler: (req: DshRequest, res: DshResponse, peer?: DshPeerScope) => void | Promise<void>
}

/** The request the host's web server hands a route handler: Node's own. */
export type DshRequest = IncomingMessage

/** The response the host's web server hands a route handler: Node's own. */
export type DshResponse = ServerResponse
