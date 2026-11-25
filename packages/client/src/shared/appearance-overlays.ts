import { APPEARANCE_OVERLAY_ROUTE } from '../constants'
import { createHostResource, readHostJson } from '@dsh-claude-style/engine/resource'

const DEFAULT: AppearanceOverlay = Object.freeze({
  paletteSchemeOverrides: [], paletteSchemeDeleted: [], paletteColorsOverride: '',
  brandingPresetOverrides: [], brandingPresetDeleted: [], brandingPresetOverride: '',
})

interface AppearanceOverlay {
  paletteSchemeOverrides: string[]
  paletteSchemeDeleted: string[]
  paletteColorsOverride: string
  brandingPresetOverrides: string[]
  brandingPresetDeleted: string[]
  brandingPresetOverride: string
}
let current: AppearanceOverlay = DEFAULT
let saved = false
let writes: Promise<unknown> = Promise.resolve()

const resource = createHostResource(APPEARANCE_OVERLAY_ROUTE, data => {
  if (data?.ok !== true || data.value === null || typeof data.value !== 'object') throw new Error('appearance overlays did not answer successfully')
  if (!saved) current = { ...DEFAULT, ...data.value as AppearanceOverlay }
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

async function persist(patch: Record<string, unknown>) {
  const response = await readHostJson(APPEARANCE_OVERLAY_ROUTE, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (response?.ok !== true || response.value === null || typeof response.value !== 'object') throw new Error('appearance overlays could not be saved')
  saved = true
  current = { ...DEFAULT, ...response.value as AppearanceOverlay }
  return current
}

export function writeAppearanceOverlay(patch: Record<string, unknown>) {
  const result = writes.then(() => persist(patch))
  // Each caller receives its own failure; subsequent edits still reach the host (D12).
  writes = result.catch(() => undefined)
  return result
}
