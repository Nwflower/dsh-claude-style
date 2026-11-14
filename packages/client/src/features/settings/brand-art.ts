import * as React from 'react'
import { DARK_THEME_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import type { BrandingAppearance, BrandingPreset } from '@dsh-claude-style/contracts/branding-presets'
import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { BRAND_CLAUDE, BRAND_INK_ORIGINAL } from '../../constants'
import { loadBrandingImages, pageAppearance, subscribeBrandImages } from '../../shared/custom-brand'
import type { BrandImage, BrandImages } from '../../shared/custom-brand'
import type { Prefs } from '../../constants'
import { copy } from './copy'

/**
 * How a set of brand images is drawn on the settings page (D30): the brand's
 * own art where the reader supplied no picture, and the reader's picture
 * where they did, in the seats the sidebar paints them into. The brand cards
 * (brand-cards.ts), the manager's list (brand-manager.ts) and the editor's
 * lockup (settings-brand-lockup.ts) draw from here. A set is a preset's or the
 * images kept outside any preset (`undefined`).
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

/** The name a set goes by: a preset's own name, or the images kept outside any preset. */
export function brandingLabel(preset: BrandingPreset | undefined) {
  if (preset === undefined) return copy('brandingPresetLegacy')
  return preset.name || preset.id
}

/** The appearance the page shows, following the host's flips while the reader looks. */
export function usePageAppearance() {
  const [appearance, setAppearance] = React.useState<BrandingAppearance>(pageAppearance)
  React.useEffect(() => subscribeMutations(document.body, { attributes: true, attributeFilter: [DARK_THEME_ATTRIBUTE] }, () => setAppearance(pageAppearance())), [])
  return appearance
}

/**
 * One set's images in one appearance, read on their own. An upload or a
 * removal anywhere reaches the page's shared images first, so every reader
 * reads its own set again when those change; a preset's record changing reads
 * it again as well.
 */
export function useBrandImages(preset: BrandingPreset | undefined, mode: BrandingAppearance) {
  const [images, setImages] = React.useState<BrandImages>(blankImages)
  const signature = JSON.stringify(preset ?? null)
  React.useEffect(() => {
    let live = true
    const read = () => { void loadBrandingImages(preset, mode).then(value => { if (live) setImages(value) }) }
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
 * would show a colour the sidebar never puts there. The reader's picture in its
 * own colours is a picture too, and wears that ink once the choice names one.
 */
export function SeatArt(props: { kind: 'mark' | 'word', image: BrandImage | null, prefs: Prefs }) {
  const art = BRAND_ART[props.prefs.brand === BRAND_CLAUDE ? 'claude' : 'deepseek']
  const own = props.image
  const image = own === null ? (props.kind === 'mark' ? art.mark : art.word) : `url("${own.url}")`
  const ratio = own === null ? (props.kind === 'mark' ? art.markRatio : art.wordRatio) : own.ratio
  const height = own === null && props.kind === 'word' ? art.wordHeight : 1
  const shape = own === null || props.prefs.brandInk !== BRAND_INK_ORIGINAL ? 'mask' : 'picture'
  return React.createElement('span', {
    className: `dsh-claude-brand-art dsh-claude-brand-art-${props.kind}`,
    'data-shape': shape,
    style: {
      '--dsh-claude-brand-art': image,
      '--dsh-claude-brand-ratio': String(ratio),
      '--dsh-claude-brand-height': String(height),
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
export function WordArt(props: { images: BrandImages, prefs: Prefs }) {
  return wordModeOf(props.images, props.prefs) === 'name'
    ? React.createElement('span', { className: 'dsh-claude-brand-typed' }, props.prefs.brandName)
    : React.createElement(SeatArt, { kind: 'word', image: props.images.wordmark, prefs: props.prefs })
}
