import { BRAND_IMAGE_KINDS } from '@dsh-claude-style/contracts/brand'
import type { BrandAnswer, BrandImageKind, BrandImageState } from '@dsh-claude-style/contracts/brand'
import { BRAND_INK_ORIGINAL, brandingSlot, withBrandingAsset } from '@dsh-claude-style/contracts/branding-presets'
import type { BrandingAppearance, BrandingPreset, BrandingSlot } from '@dsh-claude-style/contracts/branding-presets'
import { DARK_THEME_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { BRAND_MARK_ROUTE, BRAND_ROUTE, BRAND_WORDMARK_ROUTE, BRANDING_ASSET_ROUTE, BRANDING_STATUS_ROUTE } from '../constants'
import type { Prefs } from '../constants'
import { prefsFromForm, readPrefs, savePrefs, subscribePrefs } from '../core/prefs'
import { notifyAll } from '@dsh-claude-style/engine/notify'
import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { createHostRequest, readHostJson } from '@dsh-claude-style/engine/resource'
import { brandingInkOf, brandingRecord, newBrandingPresetId, storeBrandingPresetPatch } from './branding-presets'
import { vendorImages } from './vendor-brands'

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
let offMove: (() => void) | null = null
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

function deliver(value: BrandImages) {
  images = value
  for (const [kind, problem] of Object.entries(images.problems)) console.warn('dsh-claude-style: the custom ' + kind + ' image is not shown: ' + problem)
  notifyAll(listeners, images)
}

const request = createHostRequest(adopt, deliver)

/** The appearance the page shows now, which picks a preset's variant. */
export function pageAppearance(): BrandingAppearance {
  return document.body.hasAttribute(DARK_THEME_ATTRIBUTE) ? 'dark' : 'light'
}

function statusRequest(preset: BrandingPreset, mode: BrandingAppearance): RequestInit {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...preset, appearance: mode }),
  }
}

/**
 * The images of the set `id` on one canvas as far as the page holds them:
 * none for the theme style's own art, the built-in preset's cut lockup, or the
 * reader's preset record, whose images the host half answers for.
 */
function heldImages(prefs: Prefs, id: string, mode: BrandingAppearance): BrandImages | BrandingPreset {
  if (id === '') return empty()
  const vendor = vendorImages(id, mode)
  if (vendor !== undefined) return vendor
  // A selection whose record is gone paints the theme style's art; the preferences contract reports it (carryBrandingPresets).
  return brandingRecord(prefs, id) ?? empty()
}

const isImages = (value: BrandImages | BrandingPreset): value is BrandImages => 'problems' in value

/** Re-read the images of the set the page paints now. */
function reload() {
  request.reset()
  const mode = pageAppearance()
  const held = heldImages(readPrefs(), readPrefs().brandingPreset, mode)
  if (!isImages(held)) return request.load(BRANDING_STATUS_ROUTE, statusRequest(held, mode), error => { console.warn('dsh-claude-style: branding status could not be read: ' + String(error)) })
  deliver(held)
  return Promise.resolve()
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

/**
 * Images uploaded before presets existed sit outside any preset (BRAND_ROUTE).
 * They move once into a preset of their own, inked as they were, which the
 * page selects while it paints the theme style's art; the originals leave the
 * host after the copy is stored. The move waits for the stored preferences
 * (prefsFromForm): the defaults that hold until then carry none of the
 * reader's presets, so a new id taken from them would overwrite one. The name
 * is read as the record is stored, once the host's locale is up. The move and
 * the legacy brand routes retire at v0.23.0, after every reader's first load
 * of a carrying build has taken the originals across.
 */
async function moveLegacyImages(name: () => string) {
  const held = await adopt(await readHostJson(BRAND_ROUTE, {}))
  if (held.mark === null && held.wordmark === null) return
  const prefs = readPrefs()
  const preset = await cloneImages(newBrandingPresetId(prefs), held, null)
  preset.name = name()
  const ink = brandingInkOf(prefs, '')
  if (ink !== BRAND_INK_ORIGINAL) preset.ink = ink
  const now = readPrefs()
  await savePrefs(storeBrandingPresetPatch(now, preset, now.brandingPreset === ''))
  for (const kind of BRAND_IMAGE_KINDS) {
    if (held[kind] !== null) await readHostJson(ROUTES[kind], { method: 'DELETE' })
  }
}

/** Arm preference and appearance subscriptions once, move any images kept outside a preset into one named by `legacyName`, then read the active images. */
export function loadBrandImages(legacyName: () => string) {
  if (!armed) {
    armed = true
    offPrefs = subscribePrefs(() => { void reload() })
    offTheme = subscribeMutations(document.body, { attributes: true, attributeFilter: [DARK_THEME_ATTRIBUTE] }, () => { void reload() })
    const move = () => {
      offMove?.()
      offMove = null
      // A failed move leaves the images where they were and the page on what it paints; it is said, and the next load tries again.
      void moveLegacyImages(legacyName).catch((error: unknown) => { console.warn('dsh-claude-style: the images kept outside any preset could not be moved into one: ' + String(error)) })
    }
    if (prefsFromForm()) move()
    else offMove = subscribePrefs(() => { if (prefsFromForm()) move() })
  }
  return reload()
}

export function resetBrandImages() {
  offPrefs?.()
  offTheme?.()
  offMove?.()
  offPrefs = null
  offTheme = null
  offMove = null
  armed = false
  request.reset()
  images = empty()
}

/** Read the set `id` on one canvas independently of the page's shared state (the settings page reads any set in either appearance). */
export async function loadBrandingImages(prefs: Prefs, id: string, mode: BrandingAppearance) {
  const held = heldImages(prefs, id, mode)
  return isImages(held) ? held : adopt(await readHostJson(BRANDING_STATUS_ROUTE, statusRequest(held, mode)))
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

/** Write a set's images into the managed preset `targetId`: the light ones, and the dark ones where they differ (`dark` null: one variant covers both). */
async function cloneImages(targetId: string, light: BrandImages, dark: BrandImages | null) {
  let preset: BrandingPreset = { id: targetId, name: '' }
  for (const [mode, held] of [['light', light], ['dark', dark]] as const) {
    if (held === null) continue
    for (const kind of BRAND_IMAGE_KINDS) {
      const image = held[kind]
      if (image === null || (mode === 'dark' && light[kind]?.url === image.url)) continue
      const ref = await writeManagedAsset(targetId, brandingSlot(kind, mode), await imageFile(image, kind))
      preset = withBrandingAsset(preset, kind, mode, ref)
    }
  }
  return preset
}

/** Copy the set `sourceId`'s images and ink into a new managed preset; later replacement never changes the source. */
export async function cloneBrandImages(prefs: Prefs, targetId: string, sourceId: string) {
  const preset = await cloneImages(targetId, await loadBrandingImages(prefs, sourceId, 'light'), await loadBrandingImages(prefs, sourceId, 'dark'))
  const ink = brandingInkOf(prefs, sourceId)
  if (ink !== BRAND_INK_ORIGINAL) preset.ink = ink
  return preset
}
