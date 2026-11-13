import { BRAND_IMAGE_KINDS } from '@dsh-claude-style/contracts/brand'
import type { BrandAnswer, BrandImageKind, BrandImageState } from '@dsh-claude-style/contracts/brand'
import { BRAND_MARK_ROUTE, BRAND_ROUTE, BRAND_WORDMARK_ROUTE } from '../constants'
import { notifyAll } from '@dsh-claude-style/engine/notify'
import { createHostRequest } from '@dsh-claude-style/engine/resource'

/** Painting and settings share this host-backed image state; URLs change with image bytes (D96). */

/** One custom image: its address, and its width over its height. */
export interface BrandImage {
  url: string
  ratio: number
}

export type BrandImages = Record<BrandImageKind, BrandImage | null>

const ROUTES: Record<BrandImageKind, string> = { mark: BRAND_MARK_ROUTE, wordmark: BRAND_WORDMARK_ROUTE }

let images: BrandImages = { mark: null, wordmark: null }
let requested = false
const listeners: ((images: BrandImages) => void)[] = []
// Per generation: reset releases the status request and pending image adoption (D12).
const request = createHostRequest(async data => {
  const answer = data as unknown as BrandAnswer
  if (answer.ok !== true) throw new Error('brand status did not answer successfully')
  const [mark, wordmark] = await Promise.all(BRAND_IMAGE_KINDS.map(kind => measure(kind, answer[kind])))
  return { mark, wordmark }
}, value => {
  images = value
  notifyAll(listeners, images)
})

/** The images in hand (live object; treat as read-only). */
export function readBrandImages() {
  return images
}

/** Observe the images; returns the unsubscriber. */
export function subscribeBrandImages(listener: (images: BrandImages) => void) {
  listeners.push(listener)
  return () => {
    const index = listeners.indexOf(listener)
    if (index !== -1) listeners.splice(index, 1)
  }
}

/** Read the host half's status once per arming; a host half that does not answer leaves no custom image. */
export function loadBrandImages() {
  if (requested) return
  requested = true
  // The host's unavailable status leaves the brand's own artwork in place (D12).
  void request.load(BRAND_ROUTE, {}, () => {})
}

/** Re-arm: the next load() reads again (a new host context). */
export function resetBrandImages() {
  requested = false
  request.reset()
  images = { mark: null, wordmark: null }
}

/**
 * Load one image and read its proportions; an SVG with only a viewBox reports
 * them through its natural size. The load event carries the size: `decode()`
 * waits for the page to render, which a window in the background never does.
 * A broken image is isolated from its partner and reported with a warning (D12).
 */
function measure(kind: BrandImageKind, state: BrandImageState | null): Promise<BrandImage | null> {
  if (state === null) return Promise.resolve(null)
  const url = `${ROUTES[kind]}?v=${encodeURIComponent(state.version)}`
  const image = new Image()
  return new Promise(settle => {
    image.onload = () => settle({ url, ratio: image.naturalWidth > 0 && image.naturalHeight > 0 ? image.naturalWidth / image.naturalHeight : 1 })
    image.onerror = () => {
      console.warn(`dsh-claude-style: the custom ${kind} image could not be loaded and is not shown: ${url}`)
      settle(null)
    }
    image.src = url
  })
}

/**
 * Send one request that changes an image and adopt the status it answers with.
 * A refusal rejects with the reason the host half gave.
 */
function change(kind: BrandImageKind, init: RequestInit) {
  request.reset()
  return request.load(ROUTES[kind], init).then(() => {})
}

/** Replace one image with a file the reader picked; the content type names its format. */
export function uploadBrandImage(kind: BrandImageKind, file: File) {
  return change(kind, { method: 'PUT', headers: { 'content-type': file.type }, body: file })
}

/** Remove one image: the brand's own art comes back in its place. */
export function removeBrandImage(kind: BrandImageKind) {
  return change(kind, { method: 'DELETE' })
}
