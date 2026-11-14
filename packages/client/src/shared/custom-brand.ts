import { BRAND_IMAGE_KINDS } from '@dsh-claude-style/contracts/brand'
import type { BrandAnswer, BrandImageKind, BrandImageState } from '@dsh-claude-style/contracts/brand'
import { brandingAsset, brandingSlot, findBrandingPreset, withBrandingAsset } from '@dsh-claude-style/contracts/branding-presets'
import type { BrandingAppearance, BrandingPreset, BrandingSlot } from '@dsh-claude-style/contracts/branding-presets'
import { BRAND_MARK_ROUTE, BRAND_ROUTE, BRAND_WORDMARK_ROUTE, BRANDING_ASSET_ROUTE, BRANDING_STATUS_ROUTE } from '../constants'
import { readPrefs, subscribePrefs } from '../core/prefs'
import { notifyAll } from '@dsh-claude-style/engine/notify'
import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { createHostRequest, readHostJson } from '@dsh-claude-style/engine/resource'
import { selectedBrandingPreset } from './branding-presets'

/** Painting and settings share this host-backed image state; URLs change with image bytes. */
export interface BrandImage {
  url: string
  ratio: number
}

export interface BrandImages extends Record<BrandImageKind, BrandImage | null> {
  problems: Partial<Record<BrandImageKind, string>>
}

interface PresetImageState extends BrandImageState {
  url: string
}

interface PresetAnswer extends BrandAnswer {
  problems?: { kind: BrandImageKind, message: string }[]
}

const ROUTES: Record<BrandImageKind, string> = { mark: BRAND_MARK_ROUTE, wordmark: BRAND_WORDMARK_ROUTE }
const empty = (): BrandImages => ({ mark: null, wordmark: null, problems: {} })
let images = empty()
let armed = false
let offPrefs: (() => void) | null = null
let offTheme: (() => void) | null = null
const listeners: ((images: BrandImages) => void)[] = []

interface Measured {
  image: BrandImage | null
  problem?: string
}

/** Read one image's proportions and keep a broken asset isolated from its partner. */
function measure(kind: BrandImageKind, state: BrandImageState | PresetImageState | null): Promise<Measured> {
  if (state === null) return Promise.resolve({ image: null })
  const url = 'url' in state ? state.url : ROUTES[kind] + '?v=' + encodeURIComponent(state.version)
  const image = new Image()
  return new Promise(settle => {
    image.onload = () => settle({ image: { url, ratio: image.naturalWidth > 0 && image.naturalHeight > 0 ? image.naturalWidth / image.naturalHeight : 1 } })
    image.onerror = () => settle({ image: null, problem: 'the image could not be loaded' })
    image.src = url
  })
}

async function adopt(data: unknown): Promise<BrandImages> {
  const answer = data as PresetAnswer
  if (answer.ok !== true) throw new Error('brand status did not answer successfully')
  const problems: BrandImages['problems'] = {}
  for (const problem of answer.problems ?? []) problems[problem.kind] = problem.message
  const [mark, wordmark] = await Promise.all(BRAND_IMAGE_KINDS.map(kind => measure(kind, answer[kind])))
  if (mark.problem !== undefined) problems.mark = mark.problem
  if (wordmark.problem !== undefined) problems.wordmark = wordmark.problem
  return { mark: mark.image, wordmark: wordmark.image, problems }
}

const request = createHostRequest(adopt, value => {
  images = value
  for (const [kind, problem] of Object.entries(images.problems)) console.warn('dsh-claude-style: the custom ' + kind + ' image is not shown: ' + problem)
  notifyAll(listeners, images)
})

function appearance(): BrandingAppearance {
  return document.body.hasAttribute('data-ds-dark-theme') ? 'dark' : 'light'
}

function statusRequest(preset: BrandingPreset, mode: BrandingAppearance): RequestInit {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...preset, appearance: mode }),
  }
}

/** Re-read the selected preset or the legacy images, whichever is active now. */
function reload() {
  request.reset()
  const preset = selectedBrandingPreset(readPrefs())
  if (preset === undefined) return request.load(BRAND_ROUTE, {}, error => { console.warn('dsh-claude-style: brand status could not be read: ' + String(error)) })
  return request.load(BRANDING_STATUS_ROUTE, statusRequest(preset, appearance()), error => { console.warn('dsh-claude-style: branding status could not be read: ' + String(error)) })
}

export function readBrandImages() {
  return images
}

export function subscribeBrandImages(listener: (images: BrandImages) => void) {
  listeners.push(listener)
  return () => {
    const index = listeners.indexOf(listener)
    if (index !== -1) listeners.splice(index, 1)
  }
}

/** Arm preference and appearance subscriptions once, then read the active images. */
export function loadBrandImages() {
  if (!armed) {
    armed = true
    offPrefs = subscribePrefs(() => { void reload() })
    offTheme = subscribeMutations(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] }, () => { void reload() })
  }
  return reload()
}

export function resetBrandImages() {
  offPrefs?.()
  offTheme?.()
  offPrefs = null
  offTheme = null
  armed = false
  request.reset()
  images = empty()
}

/** Read one preset independently of the page's shared state (the settings editor uses this for either appearance). */
export async function loadBrandingPresetImages(preset: BrandingPreset, mode: BrandingAppearance) {
  return adopt(await readHostJson(BRANDING_STATUS_ROUTE, statusRequest(preset, mode)))
}

function change(kind: BrandImageKind, init: RequestInit) {
  return reload().then(() => readHostJson(ROUTES[kind], init)).then(() => reload()).then(() => {})
}

export function uploadBrandImage(kind: BrandImageKind, file: File) {
  return change(kind, { method: 'PUT', headers: { 'content-type': file.type }, body: file })
}

export function removeBrandImage(kind: BrandImageKind) {
  return change(kind, { method: 'DELETE' })
}

function assetRoute(id: string, slot: BrandingSlot) {
  return BRANDING_ASSET_ROUTE + '?' + new URLSearchParams({ id, slot }).toString()
}

async function writeManagedAsset(id: string, slot: BrandingSlot, file: File) {
  const answer = await readHostJson(assetRoute(id, slot), { method: 'PUT', headers: { 'content-type': file.type }, body: file })
  if (answer?.ok !== true || typeof answer.ref !== 'string') throw new Error('the managed asset did not answer with its reference')
  return answer.ref
}

export async function uploadBrandingPresetAsset(id: string, slot: BrandingSlot, file: File) {
  const ref = await writeManagedAsset(id, slot, file)
  await reload()
  return ref
}

export async function removeBrandingPresetAsset(id: string, slot: BrandingSlot) {
  await readHostJson(assetRoute(id, slot), { method: 'DELETE' })
  await reload()
}

export async function deleteBrandingPresetAssets(id: string) {
  for (const slot of ['mark-light', 'mark-dark', 'wordmark-light', 'wordmark-dark'] as const) {
    await readHostJson(assetRoute(id, slot), { method: 'DELETE' })
  }
}

async function imageFile(image: BrandImage, kind: BrandImageKind) {
  const response = await fetch(image.url, { credentials: 'same-origin' })
  if (!response.ok) throw new Error('image read failed with HTTP ' + response.status)
  const bytes = await response.blob()
  return new File([bytes], kind, { type: bytes.type })
}

/** Copy the active images into a new managed preset; later replacement never changes the source preset. */
export async function cloneBrandImages(targetId: string, source: BrandingPreset | undefined) {
  let preset: BrandingPreset = { id: targetId, name: '' }
  if (source === undefined) {
    const current = readBrandImages()
    for (const kind of BRAND_IMAGE_KINDS) {
      const image = current[kind]
      if (image === null) continue
      const ref = await writeManagedAsset(targetId, brandingSlot(kind, 'light'), await imageFile(image, kind))
      preset = withBrandingAsset(preset, kind, 'light', ref)
    }
    return preset
  }
  for (const mode of ['light', 'dark'] as const) {
    const current = await loadBrandingPresetImages(source, mode)
    for (const kind of BRAND_IMAGE_KINDS) {
      const image = current[kind]
      const asset = preset[kind]
      const hasVariant = typeof asset === 'string' ? mode === 'light' : asset?.[mode] !== undefined
      if (image === null || hasVariant) continue
      const ref = await writeManagedAsset(targetId, brandingSlot(kind, mode), await imageFile(image, kind))
      preset = withBrandingAsset(preset, kind, mode, ref)
    }
  }
  return preset
}
