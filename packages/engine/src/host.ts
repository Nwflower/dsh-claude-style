/**
 * The engine's host access surface, kept as one import path for every feature:
 * element seats (./host-seats), chat readings (./host-chat) and service
 * accessors (./host-services), with the shared shapes in ./host-types (D3).
 */
export type { HostContext, HostFiber, HostText } from './host-types'
export * from './host-seats'
export * from './host-chat'
export * from './host-services'
