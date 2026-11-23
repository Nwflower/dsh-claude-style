/**
 * The panel sections' way back into the host (D112): the projections their
 * readings follow, and the host's own preview a produced file opens in.
 *
 * The install hands its host context over for the lifetime of its slot
 * registrations. Sections read the host through this one place; teardown
 * releases it.
 */
import { openHostFile } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'

/** The host context this generation runs on, for the seats behind the panel's rows. */
let host: HostContext | null = null

/** Hand the host context over for this generation; its teardown gives it back. */
export function setPanelContext(ctx: HostContext | null) {
  host = ctx
  return ctx
}

/** Give the host context back only when it is still the one this generation handed over. */
export function clearPanelContext(ctx: HostContext | null) {
  if (host === ctx) host = null
}

/** The host context this generation runs on, or null before the install handed it over. */
export function panelHost(): HostContext | null {
  return host
}

/** Open one produced file in the host's own preview page. */
export function openPanelFile(sessionId: string, directory: string | undefined, path: string) {
  if (host === null) throw new Error('the session panel sections are not installed')
  openHostFile(host, sessionId, directory, path)
}
