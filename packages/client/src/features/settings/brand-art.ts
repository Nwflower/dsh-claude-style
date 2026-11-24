import * as React from 'react'
import { brandingVendorOf } from '@dsh-claude-style/contracts/branding-presets'
import type { BrandingAppearance, BrandInk } from '@dsh-claude-style/contracts/branding-presets'
import { BRAND_CLAUDE, BRAND_INK_ORIGINAL } from '../../constants'
import { brandingRecord, brandInkColour } from '../../shared/branding-presets'
import { loadBrandingImages, subscribeBrandImages } from '../../shared/custom-brand'
import type { BrandImage, BrandImages } from '../../shared/custom-brand'
import { usePageAppearance } from '../../shared/page-state'
import { vendorName } from '../../shared/vendor-brands'
import type { Prefs } from '../../constants'
import { readPrefs } from '../../core/prefs'
import { copy } from './copy'
export { usePageAppearance }

/**
 * How a brand set is drawn on the settings page (D97): the brand's own art
 * where the set holds no picture, and the set's picture where it does, in the
 * seats the sidebar paints them into and in the set's own ink. The brand card
 * (brand-cards.ts), the manager's list (brand-manager.ts) and the editor's
 * lockup (settings-brand-lockup.ts) draw from here. A set is named by its id:
 * empty for the theme style's own art, a built-in preset's, or a reader's
 * preset's (shared/branding-presets.ts).
 */

/**
 * The art each brand draws when the reader supplied no picture, and the
 * proportions of the brand's own word. Each word is an asset whose box is the
 * drawing's own, so `wordRatio` is that box's width over its height and
 * `wordHeight` is how tall the box stands against the cap height: Claude's
 * wordmark is drawn at the cap height itself, while the host draws DeepSeek's
 * word in a 24-unit box beside an 18px whale (theme/sidebar.css).
 */
const BRAND_ART = {
  claude: {
    mark: 'var(--dsh-claude-image-claude-mark)',
    word: 'var(--dsh-claude-image-claude-word)',
    markRatio: 1,
    wordRatio: 512.22 / 121.54,
    wordHeight: 1,
  },
  deepseek: {
    mark: 'var(--dsh-claude-image-deepseek-mark)',
    word: 'var(--dsh-claude-image-deepseek-word)',
    markRatio: 23.16 / 17.04,
    wordRatio: 96 / 24,
    wordHeight: 24 / 18,
  },
}

const blankImages = (): BrandImages => ({ mark: null, wordmark: null, problems: {} })

/** The name a set goes by: the theme style's, a built-in preset's vendor word, or a reader's preset's own name. */
export function brandingLabel(prefs: Prefs, id: string) {
  if (id === '') return copy('brandingPresetTheme')
  if (brandingVendorOf(id) !== undefined) return vendorName(id)
  return brandingRecord(prefs, id)?.name || id
}

/**
 * One set's images in one appearance, read on their own. An upload or a
 * removal anywhere reaches the page's shared images first, so every reader
 * reads its own set again when those change; the set's record changing reads
 * it again as well.
 */
export function useBrandImages(prefs: Prefs, id: string, mode: BrandingAppearance) {
  const [images, setImages] = React.useState<BrandImages>(blankImages)
  const signature = id + '\n' + JSON.stringify(brandingRecord(prefs, id) ?? null)
  React.useEffect(() => {
    let live = true
    const read = () => { void loadBrandingImages(readPrefs(), id, mode).then(value => { if (live) setImages(value) }) }
    read()
    const off = subscribeBrandImages(read)
    return () => {
      live = false
      off()
    }
  }, [signature, mode])
  return images
}

/**
 * One seat's art: the reader's picture when there is one, the brand's own art
 * otherwise. A shape is a mask over the brand's ink, which is how the sidebar
 * paints every seat — DeepSeek's whale and word alike take the ink the
 * image-colour choice names (theme/sidebar.css), so a whale drawn as a picture
 * would show a colour the sidebar never puts there. The set's picture in its
 * own colours is a picture too, and wears the set's ink once that names one.
 * The ink is written on the art itself, since the page's ink is the selected
 * set's and the art may draw another; the art's own ink is the brand's token
 * that no selection overrides. A set that carries no mark of its own (`absent`
 * 'none') draws nothing in that seat: the brand's art is not its stand-in.
 */
export function SeatArt(props: { kind: 'mark' | 'word', image: BrandImage | null, prefs: Prefs, ink: BrandInk, absent?: 'brand' | 'none' }) {
  if (props.image === null && props.absent === 'none') return null
  const art = BRAND_ART[props.prefs.brand === BRAND_CLAUDE ? 'claude' : 'deepseek']
  const own = props.image
  const image = own === null ? (props.kind === 'mark' ? art.mark : art.word) : `url("${own.url}")`
  const ratio = own === null ? (props.kind === 'mark' ? art.markRatio : art.wordRatio) : own.ratio
  const height = own === null && props.kind === 'word' ? art.wordHeight : 1
  const shape = own === null || props.ink !== BRAND_INK_ORIGINAL ? 'mask' : 'picture'
  return React.createElement('span', {
    className: `dsh-claude-brand-art dsh-claude-brand-art-${props.kind}`,
    'data-shape': shape,
    style: {
      '--dsh-claude-brand-art': image,
      '--dsh-claude-brand-ratio': String(ratio),
      '--dsh-claude-brand-height': String(height),
      '--dsh-claude-logo-ink': brandInkColour(props.ink) ?? 'var(--dsh-claude-logo-ink-own)',
    } as React.CSSProperties,
  })
}

/**
 * What the word seat holds: the reader's wordmark image first, then the name
 * they typed, then the brand's own word where an empty name would be — the
 * precedence the shell paints (features/brand/brand.ts).
 */
export function wordModeOf(images: BrandImages, prefs: Prefs) {
  return images.wordmark !== null ? 'image' : prefs.brandName === '' ? 'brand' : 'name'
}

/** The word seat's art in its own mode. */
export function WordArt(props: { images: BrandImages, prefs: Prefs, ink: BrandInk }) {
  return wordModeOf(props.images, props.prefs) === 'name'
    ? React.createElement('span', { className: 'dsh-claude-brand-typed' }, props.prefs.brandName)
    : React.createElement(SeatArt, { kind: 'word', image: props.images.wordmark, prefs: props.prefs, ink: props.ink })
}
