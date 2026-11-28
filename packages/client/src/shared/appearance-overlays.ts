import { APPEARANCE_OVERLAY_DEFAULT } from '@dsh-claude-style/contracts/appearance-overlays'
import type { AppearanceOverlay } from '@dsh-claude-style/contracts/appearance-overlays'
import { APPEARANCE_OVERLAY_PATH } from '@dsh-claude-style/contracts/routes'
import { createHostResource, readHostJson } from '@dsh-claude-style/engine/resource'

let current: AppearanceOverlay = APPEARANCE_OVERLAY_DEFAULT
let saved = false
let writes: Promise<unknown> = Promise.resolve()

const resource = createHostResource(APPEARANCE_OVERLAY_PATH, data => {
  if (data?.ok !== true || data.value === null || typeof data.value !== 'object') throw new Error('appearance overlays did not answer successfully')
  if (!saved) current = { ...APPEARANCE_OVERLAY_DEFAULT, ...data.value as AppearanceOverlay }
  return current
})

export function readAppearanceOverlay() {
  return current
}

export function loadAppearanceOverlay() {
  resource.load()
}

export function onAppearanceOverlayLoaded(listener: () => void) {
  return resource.onLoaded(listener)
}

/** Reset cached overlay state and abort any pending read when a generation ends (D12). */
export function resetAppearanceOverlay() {
  resource.reset()
  current = APPEARANCE_OVERLAY_DEFAULT
  saved = false
  writes = Promise.resolve()
}

async function persist(patch: Record<string, unknown>) {
  const response = await readHostJson(APPEARANCE_OVERLAY_PATH, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (response?.ok !== true || response.value === null || typeof response.value !== 'object') throw new Error('appearance overlays could not be saved')
  saved = true
  current = { ...APPEARANCE_OVERLAY_DEFAULT, ...response.value as AppearanceOverlay }
  return current
}

export function writeAppearanceOverlay(patch: Record<string, unknown>) {
  const result = writes.then(() => persist(patch))
  // Each caller receives its own failure; subsequent edits still reach the host (D12).
  writes = result.catch(() => undefined)
  return result
}
