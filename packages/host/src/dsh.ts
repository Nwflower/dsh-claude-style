import type { IncomingMessage, ServerResponse } from 'node:http'

/**
 * What the host half reads off the DSH plugin context (D46).
 *
 * The half runs inside DSH's loader, which hands it a context object; DSH ships
 * no types for it, so this file declares the members the half actually touches,
 * with the meaning the half gives them. Reading by name (`get`) is lenient: a
 * host that does not provide a service answers `undefined`, and each reader
 * decides what that means (D12).
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

/** The host's settings domain, as the half configures it. */
export interface DshSettings {
  configure(options: { auto?: boolean }, fiber?: unknown): unknown
}

/** The host's web server service, as the half registers routes on it. */
export interface DshWebServer {
  register(options: { path: string, handler: (req: DshRequest, res: DshResponse) => void }): unknown
}

/** The request the host's web server hands a route handler: Node's own. */
export type DshRequest = IncomingMessage

/** The response the host's web server hands a route handler: Node's own. */
export type DshResponse = ServerResponse
