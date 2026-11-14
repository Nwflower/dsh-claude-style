/** UI-owned appearance overlays, stored beside the plugin rather than inside file-owned config. */

import { normalizePaletteSchemes } from '@dsh-claude-style/contracts/palette-schemes'
import { PALETTE_PRESETS } from '@dsh-claude-style/contracts/prefs'
import { normalizeBrandingPresets } from '@dsh-claude-style/contracts/branding-presets'
import { APPEARANCE_OVERLAY_PATH } from '@dsh-claude-style/contracts/routes'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { routeFailure, writeAtomicFile } from './brand-image-shared.js'
import { fenceRefused, methodRefused, readRequestBody, sendJson } from '@dsh-claude-style/engine/node/http'
import { pluginPath } from './harness-home.js'
import type { DshContext, DshPeerScope, DshRequest, DshResponse, DshRoute } from '@dsh-claude-style/engine/node/dsh'

const BODY_MAX = 64 * 1024
const DEFAULT: Overlay = Object.freeze({
  paletteSchemeOverrides: [], paletteSchemeDeleted: [], paletteColorsOverride: '',
  brandingPresetOverrides: [], brandingPresetDeleted: [], brandingPresetOverride: '',
})

interface Overlay {
  paletteSchemeOverrides: string[]
  paletteSchemeDeleted: string[]
  paletteColorsOverride: string
  brandingPresetOverrides: string[]
  brandingPresetDeleted: string[]
  brandingPresetOverride: string
}

function normalize(value: unknown): Overlay {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('the overlay is not an object')
  const record = value as Record<string, unknown>
  const palette = normalizePaletteSchemes(Array.isArray(record.paletteSchemeOverrides) ? record.paletteSchemeOverrides.filter(entry => typeof entry === 'string') : [], PALETTE_PRESETS)
  const branding = normalizeBrandingPresets(Array.isArray(record.brandingPresetOverrides) ? record.brandingPresetOverrides.filter(entry => typeof entry === 'string') : [])
  const ids = (input: unknown, max: number): string[] => Array.isArray(input) ? input.filter(entry => typeof entry === 'string' && entry.length > 0 && entry.length <= max) : []
  return {
    paletteSchemeOverrides: palette.entries,
    paletteSchemeDeleted: ids(record.paletteSchemeDeleted, 24),
    paletteColorsOverride: typeof record.paletteColorsOverride === 'string' ? record.paletteColorsOverride.slice(0, 24) : '',
    brandingPresetOverrides: branding.entries,
    brandingPresetDeleted: ids(record.brandingPresetDeleted, 40),
    brandingPresetOverride: typeof record.brandingPresetOverride === 'string' ? record.brandingPresetOverride.slice(0, 40) : '',
  }
}

function createOverlayStore(ctx: DshContext) {
  const file = () => join(pluginPath(ctx), 'appearance-overlays.json')
  const read = () => {
    if (statSync(file(), { throwIfNoEntry: false })?.isFile() !== true) return { ...DEFAULT }
    return normalize(JSON.parse(readFileSync(file(), 'utf8')))
  }
  const write = (value: unknown) => {
    const normalized = normalize(value)
    const target = file()
    writeAtomicFile(target, Buffer.from(JSON.stringify(normalized, null, 2) + '\n'), [])
    return normalized
  }
  return { read, write }
}

export function appearanceOverlayRoutes(ctx: DshContext): { label: string, route: DshRoute } {
  const store = createOverlayStore(ctx)
  return {
    label: 'appearance overlays',
    route: {
      kind: 'exact', path: APPEARANCE_OVERLAY_PATH,
      handler: (req: DshRequest, res: DshResponse, peer?: DshPeerScope) => {
        if (methodRefused(req, res, ['GET', 'PUT'])) return
        if (fenceRefused(ctx, req, res, peer)) return
        if (req.method === 'GET') {
          sendJson(res, 200, { ok: true, value: store.read() })
          return
        }
        void (async () => {
          const body = await readRequestBody(req, BODY_MAX)
          if (body === null) {
            res.once('finish', () => req.destroy())
            sendJson(res, 413, { ok: false, error: 'request body too large' })
            return
          }
          try {
            const value = store.write(JSON.parse(body.toString('utf8')))
            sendJson(res, 200, { ok: true, value })
          } catch (error) {
            sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
          }
        })().catch((error: unknown) => { routeFailure(res, error) })
      },
    },
  }
}
