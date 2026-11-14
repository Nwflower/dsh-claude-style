/** Named brand-preset assets: managed uploads and portable YAML references. */

import { BRAND_IMAGE_MAX_BYTES, BRAND_IMAGE_TYPES } from '@dsh-claude-style/contracts/brand'
import type { BrandImageState } from '@dsh-claude-style/contracts/brand'
import { BRANDING_PRESET_ID_MAX, BRANDING_SLOTS, brandingAsset, brandingSlot, parseBrandingPreset } from '@dsh-claude-style/contracts/branding-presets'
import type { BrandingAppearance, BrandingPreset, BrandingSlot } from '@dsh-claude-style/contracts/branding-presets'
import { BRANDING_ASSET_PATH, BRANDING_STATUS_PATH } from '@dsh-claude-style/contracts/routes'
import { readFileSync, realpathSync, rmSync, statSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { IMAGE_HEADERS, imageBytesValid, readImageUpload, routeFailure, writeAtomicFile } from './brand-image-shared.js'
import { fenceRefused, methodRefused, readRequestBody, sendJson } from '@dsh-claude-style/engine/node/http'
import { pluginPath } from './harness-home.js'
import type { DshContext, DshPeerScope, DshRequest, DshResponse, DshRoute } from '@dsh-claude-style/engine/node/dsh'

interface StoredImage {
  path: string
  type: string
  state: BrandImageState
}

const ID = /^[a-z0-9][a-z0-9-]*$/
const STATUS_BODY_MAX = 4096

function validId(id: string) {
  return id.length > 0 && id.length <= BRANDING_PRESET_ID_MAX && ID.test(id)
}

function createBrandingStore(ctx: DshContext) {
  const home = () => pluginPath(ctx)
  const managed = (id: string, slot: BrandingSlot, extension: string) => join(home(), 'branding', 'presets', id, slot + '.' + extension)

  const inspect = (path: string, type: string): StoredImage => {
    const stat = statSync(path, { throwIfNoEntry: false })
    if (stat?.isFile() !== true) throw new Error('image file is missing')
    if (stat.size > BRAND_IMAGE_MAX_BYTES) throw new Error('image exceeds the 2 MB limit')
    if (!imageBytesValid(type, readFileSync(path))) throw new Error('image bytes do not match their declared type')
    const root = realpathSync(home())
    const target = realpathSync(path)
    if (target !== root && !target.startsWith(root + sep)) throw new Error('image reference leaves the plugin directory')
    return { path, type, state: { type, version: Math.round(stat.mtimeMs) + '-' + stat.size } }
  }

  const findManaged = (id: string, slot: BrandingSlot) => {
    for (const [type, extension] of Object.entries(BRAND_IMAGE_TYPES)) {
      const path = managed(id, slot, extension)
      if (statSync(path, { throwIfNoEntry: false })?.isFile() !== true) continue
      return inspect(path, type)
    }
    throw new Error('managed image is missing')
  }

  const read = (id: string, slot: BrandingSlot, ref: string) => {
    if (ref.startsWith('@managed/')) {
      if (ref !== '@managed/' + slot) throw new Error('managed reference does not match its slot')
      return findManaged(id, slot)
    }
    const relative = ref.startsWith('./') ? ref.slice(2) : ref
    const type = Object.entries(BRAND_IMAGE_TYPES).find(([, extension]) => relative.endsWith('.' + extension))?.[0]
    if (type === undefined) throw new Error('image reference has an unsupported extension')
    return inspect(resolve(home(), relative), type)
  }

  const status = (preset: BrandingPreset, appearance: BrandingAppearance) => {
    const problems: { kind: string, message: string }[] = []
    const one = (kind: 'mark' | 'wordmark') => {
      const ref = brandingAsset(preset, kind, appearance)
      if (ref === undefined) return null
      const slot = brandingSlot(kind, appearance)
      try {
        const sourceSlot = ref.startsWith('@managed/') ? ref.slice('@managed/'.length) as BrandingSlot : slot
        const found = read(preset.id, sourceSlot, ref)
        const query = new URLSearchParams({ id: preset.id, slot: sourceSlot, ref, v: found.state.version })
        return { ...found.state, url: BRANDING_ASSET_PATH + '?' + query.toString() }
      } catch (error) {
        problems.push({ kind, message: error instanceof Error ? error.message : String(error) })
        return null
      }
    }
    return { ok: true as const, mark: one('mark'), wordmark: one('wordmark'), problems }
  }

  const write = (id: string, slot: BrandingSlot, type: string, bytes: Buffer) => {
    const extension = BRAND_IMAGE_TYPES[type]
    const target = managed(id, slot, extension)
    writeAtomicFile(target, bytes, Object.values(BRAND_IMAGE_TYPES).filter(other => other !== extension).map(other => managed(id, slot, other)))
    return inspect(target, type).state
  }

  const remove = (id: string, slot: BrandingSlot) => {
    for (const extension of Object.values(BRAND_IMAGE_TYPES)) rmSync(managed(id, slot, extension), { force: true })
  }

  return { read, status, write, remove }
}

async function readStatus(store: ReturnType<typeof createBrandingStore>, req: DshRequest, res: DshResponse) {
  const body = await readRequestBody(req, STATUS_BODY_MAX)
  if (body === null) {
    sendJson(res, 413, { ok: false, error: 'request body too large' })
    return
  }
  try {
    const raw = JSON.parse(body.toString('utf8')) as { appearance?: unknown }
    const preset = parseBrandingPreset(JSON.stringify(raw))
    if (raw.appearance !== 'light' && raw.appearance !== 'dark') {
      sendJson(res, 400, { ok: false, error: 'unknown appearance' })
      return
    }
    sendJson(res, 200, store.status(preset, raw.appearance))
  } catch (error) {
    // A malformed request is the caller's 400; valid records and their files stay untouched.
    sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
  }
}

export function brandingPresetRoutes(ctx: DshContext): { label: string, route: DshRoute }[] {
  const store = createBrandingStore(ctx)
  return [
    {
      label: 'branding status',
      route: {
        kind: 'exact', path: BRANDING_STATUS_PATH,
        handler: (req: DshRequest, res: DshResponse, peer?: DshPeerScope) => {
          if (methodRefused(req, res, ['POST'])) return
          if (fenceRefused(ctx, req, res, peer)) return
          void readStatus(store, req, res).catch((error: unknown) => {
            if (res.headersSent) res.destroy()
            else sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
          })
        },
      },
    },
    {
      label: 'branding asset',
      route: {
        kind: 'exact', path: BRANDING_ASSET_PATH,
        handler: (req: DshRequest, res: DshResponse, peer?: DshPeerScope) => {
          if (methodRefused(req, res, ['GET', 'HEAD', 'PUT', 'DELETE'])) return
          if (fenceRefused(ctx, req, res, peer)) return
          const params = new URL(req.url ?? '/', 'http://local').searchParams
          const id = params.get('id') ?? ''
          const slot = params.get('slot') as BrandingSlot
          if (!validId(id) || !BRANDING_SLOTS.includes(slot)) {
            sendJson(res, 400, { ok: false, error: 'invalid preset id or slot' })
            return
          }
          if (req.method === 'PUT') {
            void (async () => {
              const upload = await readImageUpload(req, res)
              if (upload === null) return
              const state = store.write(id, slot, upload.type, upload.bytes)
              sendJson(res, 200, { ok: true, ref: '@managed/' + slot, state })
            })().catch((error: unknown) => { routeFailure(res, error) })
            return
          }
          if (req.method === 'DELETE') {
            store.remove(id, slot)
            sendJson(res, 200, { ok: true })
            return
          }
          try {
            const found = store.read(id, slot, params.get('ref') ?? '')
            const body = readFileSync(found.path)
            res.writeHead(200, { ...IMAGE_HEADERS, 'content-type': found.type, 'content-length': String(body.byteLength) })
            res.end(req.method === 'HEAD' ? undefined : body)
          } catch {
            res.writeHead(404, { 'cache-control': 'no-store' })
            res.end()
          }
        },
      },
    },
  ]
}
