import { COMBINE_SVGS, COMBINE_WORDS } from 'virtual:dsh-claude-style/generated'
import { BRANDING_VENDORS, brandingVendorOf } from '@dsh-claude-style/contracts/branding-presets'
import type { BrandingAppearance } from '@dsh-claude-style/contracts/branding-presets'
import type { BrandImages } from './custom-brand'

/**
 * The built-in brand presets drawn from the vendor lockups the skin carries
 * (packages/assets/src/icons/combine/, composed by
 * scripts/data/fetch-lobe-combines.py). A lockup is one drawing: the mark
 * layers, then the word. The brand area paints a mark and a word as two
 * images, so each lockup is split into those two here, cut to the ink each
 * layer covers.
 *
 * The layers follow the model picker's rule (model-picker.css): the colour
 * layer on the light canvas, the mono layer on the dark one. An image cannot
 * inherit the page's text colour, so the ink the lockup leaves as
 * `currentColor` is written in as the text colour of that canvas.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'

/** The ink a lockup's `currentColor` takes on each canvas: the light and dark text colours of the skin's own palette. */
const CANVAS_INK: Record<BrandingAppearance, string> = { light: '#141413', dark: '#faf9f5' }

/** The layer that carries the mark on each canvas; a hand-provided lockup's one layer carries both classes. */
const MARK_LAYER: Record<BrandingAppearance, string> = { light: '.dsh-combine-mark-color', dark: '.dsh-combine-mark-mono' }

for (const brand of BRANDING_VENDORS) {
  if (COMBINE_SVGS[brand] === undefined) throw new Error(`dsh-claude-style: the built-in brand preset "${brand}" has no vendor lockup`)
}

const split = new Map<string, BrandImages>()

/** One layer cut out as its own drawing, its box the ink the layer covers. */
function layerImage(defs: string, layer: SVGGraphicsElement, ink: string) {
  const box = layer.getBBox()
  if (box.width === 0 || box.height === 0) throw new Error('dsh-claude-style: a vendor lockup layer has no ink to cut out')
  const markup = new XMLSerializer().serializeToString(layer).replace(/currentColor/g, ink)
  const svg = `<svg xmlns="${SVG_NS}" fill="none" viewBox="${box.x} ${box.y} ${box.width} ${box.height}">${defs}${markup}</svg>`
  return { url: 'data:image/svg+xml,' + encodeURIComponent(svg), ratio: box.width / box.height }
}

/**
 * A lockup's mark and word for one canvas. Measuring needs the drawing laid
 * out, so it is placed off the page for the moment of the measure; the answer
 * is kept for the page's life.
 */
function cut(brand: string, mode: BrandingAppearance): BrandImages {
  const key = brand + ':' + mode
  const kept = split.get(key)
  if (kept !== undefined) return kept
  const parsed = new DOMParser().parseFromString(COMBINE_SVGS[brand], 'image/svg+xml')
  const svg = document.importNode(parsed.documentElement, true) as unknown as SVGSVGElement
  const holder = document.createElement('div')
  holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:400px;height:100px;visibility:hidden;pointer-events:none'
  holder.append(svg)
  document.body.append(holder)
  try {
    const mark = svg.querySelector<SVGGraphicsElement>(MARK_LAYER[mode])
    const word = svg.querySelector<SVGGraphicsElement>('.dsh-combine-text')
    if (mark === null || word === null) throw new Error(`dsh-claude-style: the vendor lockup "${brand}" has no separate mark and word layers`)
    const defs = [...svg.querySelectorAll('defs')].map(node => new XMLSerializer().serializeToString(node)).join('')
    const images: BrandImages = { mark: layerImage(defs, mark, CANVAS_INK[mode]), wordmark: layerImage(defs, word, CANVAS_INK[mode]), problems: {} }
    split.set(key, images)
    return images
  } finally {
    // The holder leaves whether or not the cut succeeded; a failure still reaches the caller.
    holder.remove()
  }
}

/** The images of the built-in preset `id` on one canvas, or undefined when the id names no built-in preset. */
export function vendorImages(id: string, mode: BrandingAppearance): BrandImages | undefined {
  const brand = brandingVendorOf(id)
  return brand === undefined ? undefined : cut(brand, mode)
}

/** The built-in preset's name: the vendor's own word its lockup draws. */
export function vendorName(id: string) {
  const brand = brandingVendorOf(id)
  if (brand === undefined) throw new Error(`dsh-claude-style: "${id}" names no built-in brand preset`)
  return COMBINE_WORDS[brand]
}
