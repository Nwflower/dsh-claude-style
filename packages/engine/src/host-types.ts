/**
 * The shapes the host access surface shares: the client context `apply` receives,
 * the values read off services the contract does not type, and the fibers `inject`
 * returns (D3). They live here so the seats, chat readings and service accessors
 * import one module without reaching back through the barrel.
 */

/** The host's client context (cordis), handed to `apply` and to every feature; service shapes are the host's own until the contract module types them (D3). */
export interface HostContext {
  /** The loader's fiber; its boot entry id names this plugin's settings namespace (D75). */
  readonly fiber?: { entry?: { id?: unknown } }
  /** A service by name, or undefined when the host carries none (D12). */
  get(name: string): HostValue
  /** Listen to a context event (`connection/reset`); the function it returns stops listening. */
  on?(name: string, listener: () => void): () => void
  /** Run `effect` now; the function it returns runs when the context is disposed. */
  effect(effect: () => () => void, label?: string): void
  /** Run `callback` in a scope once every named service exists; a host without it has no late services. */
  inject?(names: string[], callback: (scope: HostContext) => void): HostFiber
}

/**
 * A value read off a host service or snapshot; the contract module types the ones the skin reads by name (D3, `packages/contracts/src/services.ts`).
 *
 * hostRemote, hostRemoteSession, hostRemotePermissionPresets, hostPluginNavigation, hostLayout and hostRemoteSkills stay this wide: the contract carries only their answers (`HostRemoteListAnswer`, `HostPermissionCatalogAnswer`, `HostSkillListAnswer`), and a guessed service shape would narrow what a host may serve — callers already check each method before calling it (D12).
 */
export type HostValue = any

/** A host locale namespace's translate seat (`locale.bind(namespace)`): a key and its parameters to text. */
export type { HostText } from '@dsh-claude-style/contracts/services'

/** The scope `inject` opened: disposing it runs the effects registered in it. */
export interface HostFiber {
  dispose(): void
}
