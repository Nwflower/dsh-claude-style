import { colorAlpha, colorParts } from '@dsh-claude-style/engine/chat-dom'
import { COMPOSER_SCROLL_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { inPageBox } from '../../shared/page-zoom'

/** Capture geometry, styles and a clone before React clears the submitted draft. */
/** Marks the stand-in while it is on the page. A handle for looking things up; no rule hangs off it. */
export const CHAT_SEND_GHOST_ATTR = 'data-dsh-claude-send-ghost'
/** Marks each link of the stand-in's imitation ancestor chain; send-flight.css takes their pseudo-elements away. */
export const CHAT_SEND_LINK_ATTR = 'data-dsh-claude-send-link'
// The mark put on the real row while the stand-in flies is constants.ts's
// CHAT_FLYING_ATTR; the stylesheet hides it (send-flight.css). The composer
// card, its scroll area and the echo bubble are the host's own attributes,
// read from the one contract table (packages/engine/src/chat-dom.ts).

/** Drop an over-deep chain whole: truncating outer links would change descendant-selector matches. */
export const CHAT_MAX_ANCESTOR_LINKS = 24

/** Copy inherited typography lost with the ancestor chain; directly matched clone rules still win. */
export const CHAT_INHERITED_PROPERTIES = [
  'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-stretch', 'font-feature-settings',
  'font-variation-settings', 'font-kerning', 'line-height', 'letter-spacing', 'word-spacing', 'text-rendering',
  '-webkit-font-smoothing', 'direction',
]

/* Remove composer identity and focus hooks, but retain data-composer-* style hooks for host rules.
   The inert stand-in is appended after the real card; duplicate ids would still break global lookups. */
export const CHAT_IDENTITY_ATTRIBUTES = [
  'id', 'contenteditable', 'data-lexical-editor', 'data-dsh-claude-caret', 'tabindex', 'autofocus',
]

/**
 * Read a length. Anything unreadable counts as 0: a flight displaced by a
 * little is lighter than no flight at all.
 */
export function chatSendPixel(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/** Flatten translucent bubble fill over the canvas so it does not composite twice during landing. */
export function chatSendOpaque(color: string, behind: string) {
  const front = colorParts(color)
  if (front === null) return color
  const alpha = front[3] ?? 1
  if (alpha >= 1) return color
  const back = colorParts(behind)
  if (back === null) return color
  const backAlpha = back[3] ?? 1
  // The backdrop's own alpha counts: over nothing, a translucent backdrop is
  // still nothing, and the front colour keeps its own alpha. An opaque backdrop
  // takes the result to full opacity, which is the ordinary case (the canvas).
  const total = alpha + backAlpha * (1 - alpha)
  const mix = (index: number) => {
    if (total === 0) return 0
    const over = front[index] ?? 0
    const under = back[index] ?? 0
    return Math.round((over * alpha + under * backAlpha * (1 - alpha)) / total)
  }
  if (total >= 1) return 'rgb(' + mix(0) + ', ' + mix(1) + ', ' + mix(2) + ')'
  return 'rgba(' + mix(0) + ', ' + mix(1) + ', ' + mix(2) + ', ' + Math.round(total * 1000) / 1000 + ')'
}

/** Find the first filled descendant because card.css may paint the scroll box instead of the card. */
export function chatSendSurface(card: HTMLElement, cardStyle: CSSStyleDeclaration): { element: HTMLElement, path: number[] } {
  if (colorAlpha(cardStyle.backgroundColor) > 0) return { element: card, path: [] }
  const queue = Array.from(card.children)
  while (queue.length > 0) {
    const node = queue.shift()
    if (node === undefined) break
    if (!(node instanceof HTMLElement)) continue
    if (colorAlpha(window.getComputedStyle(node).backgroundColor) > 0) {
      const path: number[] = []
      for (let walk: HTMLElement = node; walk !== card && walk.parentElement !== null; walk = walk.parentElement) {
        path.unshift(Array.from(walk.parentElement.children).indexOf(walk))
      }
      return { element: node, path }
    }
    for (const child of node.children) queue.push(child)
  }
  return { element: card, path: [] }
}

/** Turn the border into a halo ring so hairline and shadow shrink together. */
export function chatSendSurfaceShadow(style: CSSStyleDeclaration) {
  const parts: string[] = []
  const shadow = style.boxShadow
  if (shadow !== '' && shadow !== 'none') parts.push(shadow)
  if (chatSendPixel(style.borderTopWidth) > 0 && colorAlpha(style.borderTopColor) > 0) {
    parts.push('0 0 0 ' + style.borderTopWidth + ' ' + style.borderTopColor)
  }
  return parts.join(', ')
}

/** The element a child-index path from the card names, inside the clone. */
export function chatSendElementAt(root: Element, path: number[]) {
  let element: Element | undefined = root
  for (const index of path) element = element?.children[index]
  return element instanceof HTMLElement ? element : null
}

/** Host and plugin !important rules still match retained hooks; inline !important keeps measured geometry. */
export function chatSendPin(element: HTMLElement, declarations: [string, string][]) {
  for (const [name, value] of declarations) element.style.setProperty(name, value, 'important')
}

/** Remove identity and focus hooks listed in CHAT_IDENTITY_ATTRIBUTES. */
export function chatSendScrub(root: Element) {
  const all = [root, ...root.querySelectorAll('*')]
  for (const element of all) {
    for (const name of CHAT_IDENTITY_ATTRIBUTES) element.removeAttribute(name)
  }
  for (const layer of root.querySelectorAll('[data-dsh-claude-caret-layer]')) layer.remove()
}

/** The mount point and custom-property baseline must stay coupled; startMorph also requires last-child order. */
export function chatSendGhostHost() {
  return document.body
}

/** Call during submission capture, while the laid-out draft still exists. */
export function snapshotComposer(input: HTMLElement, card: HTMLElement) {
  // Every box here is in the page's own pixels — the space the stand-in's
  // styles and animations are read in — while the computed styles already are
  // (shared/page-zoom.ts).
  const box = inPageBox(card.getBoundingClientRect())
  if (box.width === 0 || box.height === 0) return null
  const scroll = input.closest(COMPOSER_SCROLL_SELECTOR)
  if (scroll === null || scroll.parentElement !== card) return null
  const cardStyle = window.getComputedStyle(card)
  const inputStyle = window.getComputedStyle(input)
  const inputBox = inPageBox(input.getBoundingClientRect())
  const text = {
    left: inputBox.left - box.left + input.clientLeft + chatSendPixel(inputStyle.paddingLeft),
    top: inputBox.top - box.top + input.clientTop + chatSendPixel(inputStyle.paddingTop),
    right: box.right - (inputBox.right - chatSendPixel(inputStyle.borderRightWidth) - chatSendPixel(inputStyle.paddingRight)),
    lineHeight: chatSendPixel(inputStyle.lineHeight),
  }
  const surface = chatSendSurface(card, cardStyle)
  const surfaceStyle = surface.element === card ? cardStyle : window.getComputedStyle(surface.element)
  const surfaceBox = inPageBox(surface.element.getBoundingClientRect())
  const surfaceRect = {
    left: surfaceBox.left - box.left,
    top: surfaceBox.top - box.top,
    width: surfaceBox.width,
    height: surfaceBox.height,
    radius: chatSendPixel(surfaceStyle.borderTopLeftRadius),
  }

  // Which pieces of the card are taken away: anything with area that is not
  // the draft area. A piece spanning the whole card and split into several
  // groups is the toolbar, and it is split by group — the left and right
  // groups each drive into the corner nearest them. A `display: contents`
  // seat has no box of its own, so the walk goes through it.
  const paths: { path: number[], rect: number[] }[] = []
  const rectOf = (element: Element) => {
    const r = inPageBox(element.getBoundingClientRect())
    return [r.left - box.left, r.top - box.top, r.width, r.height]
  }
  const collect = (element: Element, path: number[]) => {
    const width = rectOf(element)[2]
    const height = rectOf(element)[3]
    if (width * height === 0) {
      if (window.getComputedStyle(element).display !== 'contents') return
      Array.from(element.children).forEach((child, index) => {
        collect(child, [...path, index])
      })
      return
    }
    const groups = Array.from(element.children).filter((child) => {
      const rect = rectOf(child)
      return rect[2] * rect[3] > 0
    })
    if (width >= box.width * 0.9 && groups.length >= 2) {
      Array.from(element.children).forEach((child, index) => {
        const rect = rectOf(child)
        if (rect[2] * rect[3] > 0) paths.push({ path: [...path, index], rect })
      })
      return
    }
    paths.push({ path, rect: rectOf(element) })
  }
  Array.from(card.children).forEach((child, index) => {
    if (child !== scroll) collect(child, [index])
  })

  // Copy only custom properties whose card values differ from the mount point; equal or mount-only
  // values already inherit, while intermediate-ancestor values must travel with the clone.
  const hostStyle = window.getComputedStyle(chatSendGhostHost())
  const context: [string, string][] = []
  for (let index = 0; index < cardStyle.length; index += 1) {
    const name = cardStyle[index]
    if (name === undefined || !name.startsWith('--')) continue
    const value = cardStyle.getPropertyValue(name)
    if (value !== hostStyle.getPropertyValue(name)) context.push([name, value])
  }
  for (const name of CHAT_INHERITED_PROPERTIES) context.push([name, cardStyle.getPropertyValue(name)])

  // The ancestor chain: once the clone leaves its parent chain, descendant
  // selectors like `.hero .input` match nothing on it, and the host's hero
  // state sets its minimum height exactly that way. So the chain is recorded
  // and put back at take-off (see startMorph). Tag and class only: what the
  // stand-in needs is selector matching, while `data-*` is somebody else's
  // state handle and would be read as a stale phase if copied, and `id` would
  // only make people pick the wrong node.
  // This runs on the reader's Enter frame, so it reads attributes only: that
  // does not touch layout and will not drag a style resolution into the frame.
  const ancestors: { tag: string, className: string }[] = []
  let interrupted = false
  for (let node = card.parentElement; node !== null && node !== document.body; node = node.parentElement) {
    // The stand-in's own parts must not join the chain. The real card never
    // has them among its ancestors; this defends against a second reading of
    // the origin before the last one settled. A chain broken here is dropped
    // whole: with a level missing, an outer selector would match an inner link.
    if (node.hasAttribute(CHAT_SEND_GHOST_ATTR)) {
      interrupted = true
      break
    }
    ancestors.push({
      tag: node.tagName.toLowerCase(),
      className: node.getAttribute('class') ?? '',
    })
  }
  ancestors.reverse()

  const clone = card.cloneNode(true) as HTMLElement
  chatSendScrub(clone)
  // These have to carry `!important`, not as a precaution: the clone keeps the
  // card's classes and data hooks — which is what lets the host's and other
  // plugins' rules match it (see CHAT_IDENTITY_ATTRIBUTES) — and some of those
  // rules are themselves `!important`. Plain inline styles lose to those: one
  // `position: fixed` centring rule would fly the clone to the middle of the
  // screen and drop it back, which reads as the composer jumping up and
  // flashing down. Inline plus `!important` pins the position and size to what
  // was measured at take-off.
  chatSendPin(clone, [
    ['position', 'absolute'],
    ['left', '0px'],
    ['top', '0px'],
    ['right', 'auto'],
    ['bottom', 'auto'],
    ['margin', '0px'],
    ['width', box.width + 'px'],
    ['max-width', 'none'],
    ['height', box.height + 'px'],
    ['box-sizing', 'border-box'],
    ['transform', 'none'],
    ['float', 'none'],
    ['background', 'transparent'],
    ['box-shadow', 'none'],
  ])
  // The clone has the card's shape, so the draft area sits at the same index.
  const draft = clone.children[Array.from(card.children).indexOf(scroll)] as HTMLElement
  // The draft area's height is pinned: the hero state's minimum height hangs
  // off `.hero .input`, so the clone would collapse once it leaves `.hero`
  // and the toolbar would ride up with it.
  const scrollBox = inPageBox(scroll.getBoundingClientRect())
  draft.style.height = scrollBox.height + 'px'
  draft.style.minHeight = '0px'
  draft.style.maxHeight = 'none'
  // The shape's plate is the shell's own background (send-morph.ts), so the
  // clone's copy of the surface must not paint: left as it is, it covers that
  // plate for the whole flight and the bubble's fill never shows. The card
  // element's own copy is already stripped by the pin above; this is the
  // descendant that really carries the surface (chatSendSurface).
  const clonedSurface = chatSendElementAt(clone, surface.path)
  if (clonedSurface !== null && clonedSurface !== clone) {
    clonedSurface.style.setProperty('background-color', 'transparent', 'important')
    clonedSurface.style.setProperty('border-color', 'transparent', 'important')
    clonedSurface.style.setProperty('box-shadow', 'none', 'important')
  }
  const chrome: { element: HTMLElement, rect: number[] }[] = []
  for (const { path, rect } of paths) {
    const element = chatSendElementAt(clone, path)
    if (element !== null) chrome.push({ element, rect })
  }
  return {
    box,
    surface: surfaceRect,
    radius: chatSendPixel(cardStyle.borderTopLeftRadius),
    shadow: chatSendSurfaceShadow(surfaceStyle),
    clone,
    draft,
    draftScrollTop: scroll.scrollTop,
    chrome,
    text,
    context,
    // Too deep, or broken midway, and the whole chain is void (see
    // CHAT_MAX_ANCESTOR_LINKS): null means "not imitated", not "this chain is empty".
    ancestors: interrupted || ancestors.length > CHAT_MAX_ANCESTOR_LINKS ? null : ancestors,
  }
}

/** One reading of the composer card (snapshotComposer). */
export type ComposerSnapshot = NonNullable<ReturnType<typeof snapshotComposer>>
