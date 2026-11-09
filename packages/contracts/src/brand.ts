/** Custom brand image contract shared by both halves (D30). */

/** The two images a reader can put in place of the brand's own art. */
export type BrandImageKind = 'mark' | 'wordmark'

export const BRAND_IMAGE_KINDS: readonly BrandImageKind[] = ['mark', 'wordmark']

/** Accepted content types, each with the extension the stored file carries. */
export const BRAND_IMAGE_TYPES: Readonly<Record<string, string>> = {
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
}

/** Host upload limit. */
export const BRAND_IMAGE_MAX_BYTES = 2 * 1024 * 1024

/** One stored image: its content type, and a version that changes whenever its bytes do. */
export interface BrandImageState {
  type: string
  version: string
}

/** The status route's answer: each image, or null while the reader has none in place. */
export interface BrandAnswer {
  ok: true
  mark: BrandImageState | null
  wordmark: BrandImageState | null
}
