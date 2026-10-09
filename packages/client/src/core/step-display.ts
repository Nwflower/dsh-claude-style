import { PACKAGE_NAME } from '../constants'
import type { HostContext, HostValue } from './host'

/**
 * The host's work-details mode (D57): the reading view shapes a turn's process
 * by it — one summary row, one chain, a chain per intermediate output, or the
 * whole text. This plugin neither stores nor writes the setting; the host's own
 * row is the only control, so the value is read from the settings the host
 * serves and followed.
 */

/** On `<body>`: the mode the reading view is shaping turns by. */
export const STEP_DISPLAY_ATTR = 'data-dsh-claude-step-display'

/** The mode used until the host's value is known: the host's own default for a web client. */
export const STEP_DISPLAY_DEFAULT = 'detailed'

/** The four modes the host's row offers: one summary row per turn, one chain, a chain per output, the whole text. */
export const STEP_DISPLAY_MODES = ['compact', 'standard', 'detailed', 'verbose'] as const

export type StepDisplayMode = typeof STEP_DISPLAY_MODES[number]

/** The host's namespace, and the field inside it that carries the mode. */
const CHAT_NAMESPACE = 'ui-chat'
const TRANSCRIPT_VIEW_FIELD = 'transcriptView'
/** Values older hosts saved for `detailed`; they are read, never written. */
const LEGACY_MODES: Record<string, StepDisplayMode> = { normal: 'detailed', expanded: 'detailed' }

/**
 * The mode one stored value means. A value this plugin does not know reads as
 * the host's default: the field is the host schema's, and an unknown one would
 * otherwise leave the view with no shape at all.
 */
function normalizeMode(value: unknown): StepDisplayMode {
  if (typeof value !== 'string') return STEP_DISPLAY_DEFAULT
  if ((STEP_DISPLAY_MODES as readonly string[]).includes(value)) return value as StepDisplayMode
  return LEGACY_MODES[value] ?? STEP_DISPLAY_DEFAULT
}

/** One namespace as the settings service describes it: its name and its resolved value. */
interface SettingsDescriptor {
  ns?: unknown
  value?: unknown
}

/**
 * The host's work-details mode, out of a `describe()` answer. The service wraps
 * its payload in an `{ ok, value }` envelope and lists namespaces under
 * `value.namespaces`; a bare list or a keyed map is read too, so a change in
 * wrapping does not blind the reader. `null` means the answer carries no Chat
 * namespace at all, which leaves whatever mode is in force.
 */
function modeOf(described: unknown): unknown {
  const outer = described as HostValue
  const bare = Array.isArray(described)
  const value = (bare ? described : outer?.value ?? described) as HostValue
  const namespaces = bare ? described : value?.namespaces
  const list = Array.isArray(namespaces) ? namespaces
    : namespaces && typeof namespaces === 'object' ? Object.values(namespaces as Record<string, unknown>)
      : []
  for (const entry of list as SettingsDescriptor[]) {
    if (entry === null || typeof entry !== 'object' || entry.ns !== CHAT_NAMESPACE) continue
    const section = entry.value
    if (section === null || typeof section !== 'object') return undefined
    return (section as Record<string, unknown>)[TRANSCRIPT_VIEW_FIELD]
  }
  return null
}

let mode: StepDisplayMode = STEP_DISPLAY_DEFAULT
let context: HostContext | null = null
let bound = false
let reading: Promise<unknown> | null = null
const listeners = new Set<() => void>()

/** The mode in force (a live read; treat the result as read-only). */
export function readStepDisplayMode(): StepDisplayMode {
  return mode
}

/** Follow mode changes; returns the unsubscriber. */
export function subscribeStepDisplay(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Adopt a value: mirror it onto `<body>`, then tell the view. */
function adoptMode(value: unknown) {
  if (value === null) return
  const next = normalizeMode(value)
  if (next === mode) return
  mode = next
  document.body.setAttribute(STEP_DISPLAY_ATTR, mode)
  for (const listener of [...listeners]) listener()
}

/** The settings service the host mounted for this client, if it has one. */
function settingsService(): HostValue | null {
  const service = context?.get('remote.settings') as HostValue | null | undefined
  return service?.describe !== undefined ? service : null
}

/**
 * Read the host's answer and adopt it. The service takes no arguments and
 * answers with the namespaces it serves; a read already in flight is the one
 * this call waits for, and a service that mounts late is re-read by the view on
 * its next structural moment.
 */
export function refreshStepDisplay(): Promise<void> {
  if (reading === null) {
    const service = settingsService()
    if (service === null || typeof service.describe !== 'function') return Promise.resolve()
    reading = Promise.resolve(service.describe()).then(
      (described: unknown) => {
        reading = null
        adoptMode(modeOf(described))
      },
      // The settings service is optional to this plugin: one that cannot answer
      // leaves the current mode rather than failing the skin (D12).
      () => { reading = null },
    )
  }
  return reading.then(() => undefined)
}

/**
 * Write the host's work-details mode through the settings service: the field is
 * `ui-chat`'s own, so the write goes through the host and the mode is adopted
 * from its answer before this resolves. Used by the end-to-end lane to put the
 * host in each mode; a host without the service answers false.
 */
export async function setStepDisplayMode(next: StepDisplayMode): Promise<boolean> {
  const service = settingsService()
  if (service === null || typeof service.update !== 'function') return false
  await service.update(CHAT_NAMESPACE, { [TRANSCRIPT_VIEW_FIELD]: next }, undefined)
  reading = null
  await refreshStepDisplay()
  return true
}

/** The mode a `describe()` answer carries for the host's Chat namespace. */
export function stepDisplayModeOf(described: unknown): StepDisplayMode | undefined {
  const value = modeOf(described)
  return value === null ? undefined : normalizeMode(value)
}

/**
 * Follow the host's work-details mode. Called at install: the settings service
 * mounts as its package loads, so a read now can find nothing — the fiber waits
 * for `remote.settings` and reads when it arrives. A host without the service
 * leaves the default mode.
 */
export function bindStepDisplay(ctx: HostContext): boolean {
  context = ctx
  // The end-to-end lane puts the host in each work-details mode through the
  // settings service; the page half has no other handle on it (D45).
  __dshStepDisplay = { set: setStepDisplayMode, read: readStepDisplayMode }
  if (!bound && typeof ctx.inject === 'function') {
    bound = true
    ctx.inject(['remote.settings'], () => { refreshStepDisplay() })
  }
  if (settingsService() === null) return false
  refreshStepDisplay()
  return true
}

/** Release the mode's attribute: the page goes back to the host (entry.ts). */
export function clearStepDisplayAttribute() {
  document.body.removeAttribute(STEP_DISPLAY_ATTR)
}

/** Forget the binding this module holds. */
export function disposeStepDisplay() {
  context = null
  bound = false
  reading = null
  mode = STEP_DISPLAY_DEFAULT
}
