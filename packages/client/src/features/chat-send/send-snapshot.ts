import { COMPOSER_SCROLL_SELECTOR } from '@dsh-claude-style/contracts/dom'

/**
 * The send flight's capture, ported from dsh-chat-ux: everything taken off the
 * composer card before React clears the draft — its geometry, its looks, and a
 * whole clone of it.
 *
 * The flight hands the clone to the compositor; send-morph.ts builds it and
 * send-shape.ts holds the curve. Nothing here touches the page: it reads
 * layout the browser has already resolved, plus one cloneNode.
 */
/** Marks the stand-in while it is on the page. A handle for looking things up; no rule hangs off it. */
export const CHAT_SEND_GHOST_ATTR = 'data-dsh-claude-send-ghost'
// The mark put on the real row while the stand-in flies is constants.ts's
// CHAT_FLYING_ATTR; the stylesheet hides it (send-flight.css). The composer
// card, its scroll area and the echo bubble are the host's own attributes,
// read from the one contract table (packages/client/src/shared/chat-dom.ts).

/**
 * How many ancestors the stand-in's imitation chain may carry.
 *
 * Past this the chain is dropped whole rather than cut short: the chain is
 * counted outwards from the card, so the outer links are what a rule like
 * `.hero .input` matches, and half a chain matches the wrong elements.
 *
 * Measured, not guessed: the composer card sits fifteen levels below body,
 * seven of them wordless `div`s and `[data-slot]` seats. 24 leaves room for
 * a few more containers while still refusing a pathological depth — at that
 * scale some plugin has wrapped the whole tree, and copying that chain would
 * drag its own layout in.
 */
export const CHAT_MAX_ANCESTOR_LINKS = 24

/**
 * The ordinary properties the clone has to carry over from the card's
 * ancestors.
 *
 * font-size and line-height have to be in: the host sets the composer's type
 * on an ancestor selector, and a clone that leaves that chain drops straight
 * to body's 16px — measured, 26 of 37 compared elements disagreed on type
 * size, on every single flight.
 *
 * Writing them on the shell does not steal any type a clone sets for itself:
 * a rule that matches directly beats inheritance, so only the elements that
 * expect to inherit are caught, which is the point.
 */
export const CHAT_INHERITED_PROPERTIES = [
  'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-stretch', 'font-feature-settings',
  'font-variation-settings', 'font-kerning', 'line-height', 'letter-spacing', 'word-spacing', 'text-rendering',
  '-webkit-font-smoothing', 'direction',
]

/**
 * The marks scrubbed out of a clone: the ones the host and this skin use to
 * find a composer. The stand-in must not be found as one, and it must not be
 * focusable.
 *
 * The style hooks stay: attribute selectors match an exact name, so a rule
 * like `[data-composer-card]` either finds the attribute or does not. What
 * keeping them costs is measured — document.querySelector takes the first in
 * document order and the stand-in is always appended last, and the host's own
 * card lookups walk up with closest; the stand-in lives 400 ms and carries
 * `inert`, so nothing inside it can be focused or read out. What it buys is
 * that the host's and other plugins' rules written on those attributes still
 * match the clone. So the three style hooks — `data-composer-card`,
 * `data-composer-input`, `data-input-scroll` — are not in this list. `id` is,
 * because a second node with the same id breaks getElementById, label[for] and
 * in-page anchors for everyone.
 */
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

/** Split the numbers out of an `rgb()` / `rgba()` colour; null when it does not read as one. */
export function chatSendColorParts(color: string) {
  const match = /^rgba?\(([^)]+)\)$/.exec(color.trim())
  if (match === null) return null
  const raw = match[1]
  if (raw === undefined) return null
  const parts = raw.split(',').map(part => Number.parseFloat(part))
  if (parts.length < 3 || parts.some(part => !Number.isFinite(part))) return null
  return parts
}

/** How opaque a computed colour is. An unreadable one counts as 0: skipping the flight beats painting an unknown colour. */
export function chatSendAlpha(color: string) {
  const parts = chatSendColorParts(color)
  if (parts === null) return 0
  return parts[3] ?? 1
}

/**
 * The element inside the composer card that really paints the card's surface.
 *
 * The card element is not always the one that carries the fill, the hairline
 * and the shadow. This skin's card.css paints all three on the draft area's
 * scroll box and leaves the card itself with no background at all, so a flight
 * that read them off the card would cross-fade an empty fill and shrink an
 * empty shadow while the clone's own surface painted itself for the whole
 * flight.
 *
 * The walk is shallow on purpose — the first descendant that paints a fill, in
 * breadth-first order — and it costs nothing on a card that paints itself,
 * which is the ordinary case.
 *
 * @param card - the composer card.
 * @param cardStyle - its computed style.
 * @returns the surface element and its child-index path from the card (empty
 *          when the card is the surface).
 */
export function chatSendSurface(card: HTMLElement, cardStyle: CSSStyleDeclaration): { element: HTMLElement, path: number[] } {
  if (chatSendAlpha(cardStyle.backgroundColor) > 0) return { element: card, path: [] }
  const queue = Array.from(card.children)
  while (queue.length > 0) {
    const node = queue.shift()
    if (node === undefined) break
    if (!(node instanceof HTMLElement)) continue
    if (chatSendAlpha(window.getComputedStyle(node).backgroundColor) > 0) {
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

/**
 * The shadow the stand-in's halo draws: the surface's own box-shadow plus its
 * border as one more ring, so the hairline shrinks and fades with the shadow
 * (send-morph.ts's halo run) instead of staying on the clone.
 */
export function chatSendSurfaceShadow(style: CSSStyleDeclaration) {
  const parts: string[] = []
  const shadow = style.boxShadow
  if (shadow !== '' && shadow !== 'none') parts.push(shadow)
  if (chatSendPixel(style.borderTopWidth) > 0 && chatSendAlpha(style.borderTopColor) > 0) {
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

/**
 * Pin declarations inline with `!important`.
 *
 * Two things inside the stand-in are matched by other people's rules: the
 * clone (which keeps the card's classes and data hooks on purpose) and the
 * imitation ancestor chain around it. Those rules may carry `!important` —
 * measured, a colour plugin on the same page uses it against
 * `[data-composer-card]` — and a plain inline style loses to that: one
 * centring rule is enough to fly the clone to the middle of the screen and
 * drop it back. Inline plus `!important` is the top of the style order (only
 * animations beat it), pinning the position and size to what was measured at
 * take-off.
 */
export function chatSendPin(element: HTMLElement, declarations: [string, string][]) {
  for (const [name, value] of declarations) element.style.setProperty(name, value, 'important')
}

/**
 * Strip every identity mark out of a cloned tree: the stand-in must not be
 * found as a composer and must not take focus. Which marks and why the style
 * hooks stay: see CHAT_IDENTITY_ATTRIBUTES.
 */
export function chatSendScrub(root: Element) {
  const all = [root, ...root.querySelectorAll('*')]
  for (const element of all) {
    for (const name of CHAT_IDENTITY_ATTRIBUTES) element.removeAttribute(name)
  }
  for (const layer of root.querySelectorAll('[data-dsh-claude-caret-layer]')) layer.remove()
}

/**
 * Where the stand-in hangs, and what it inherits from.
 *
 * One place with two uses on purpose: snapshotComposer takes it as the
 * baseline for custom properties (what the stand-in inherits), startMorph as
 * the mount point. Writing `document.body` in both would leave the coupling
 * alive only in a comment — the day the mount point moves (into a portal
 * container, say) and the baseline is missed, the symptom is a few variables
 * quietly carrying the wrong value, which is nearly impossible to trace back
 * to a mount point.
 *
 * The mount point also has to be the document's last child: see startMorph.
 */
export function chatSendGhostHost() {
  return document.body
}

/**
 * Take one reading of the composer card: geometry, looks, and the whole clone.
 *
 * Call this in the capture phase of a submission, while the draft is still
 * there. Everything read is already laid out and the clone is one
 * cloneNode, so the reader's Enter press does not wait on it.
 *
 * @param input - the draft's editable surface.
 * @param card - the composer card.
 * @returns the snapshot, or null when the card has no box or the draft area is not in the card.
 */
export function snapshotComposer(input: HTMLElement, card: HTMLElement) {
  const box = card.getBoundingClientRect()
  if (box.width === 0 || box.height === 0) return null
  const scroll = input.closest(COMPOSER_SCROLL_SELECTOR)
  if (scroll === null || scroll.parentElement !== card) return null
  const cardStyle = window.getComputedStyle(card)
  const inputStyle = window.getComputedStyle(input)
  const inputBox = input.getBoundingClientRect()
  const text = {
    left: inputBox.left - box.left + input.clientLeft + chatSendPixel(inputStyle.paddingLeft),
    top: inputBox.top - box.top + input.clientTop + chatSendPixel(inputStyle.paddingTop),
    right: box.right - (inputBox.right - chatSendPixel(inputStyle.borderRightWidth) - chatSendPixel(inputStyle.paddingRight)),
    lineHeight: chatSendPixel(inputStyle.lineHeight),
  }
  const surface = chatSendSurface(card, cardStyle)
  const surfaceStyle = surface.element === card ? cardStyle : window.getComputedStyle(surface.element)
  const surfaceBox = surface.element.getBoundingClientRect()
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
    const r = element.getBoundingClientRect()
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

  // The inherited environment: custom properties are taken only where they
  // differ from the mount point (the stand-in hangs there, so an equal value
  // already reaches it).
  //
  // The baseline is the mount point, checked against all three cases:
  //   a variable defined only on an ancestor in between (not on the mount
  //     point) reads as an empty string there, the two differ, and it is
  //     copied; without that the stand-in would not have the variable at all
  //     and `var(--x)` would fall into its fallback while the real card has it.
  //   the mount point and the card agree → not copied; the stand-in inherits
  //     the same value.
  //   an ancestor overrides the mount point's value and the card follows —
  //     the two differ, and what is copied is the ancestor's, which is also
  //     what the card reads right now, so the stand-in agrees with the card.
  // The one edge is a variable defined only on the mount point: the stand-in
  // inherits it anyway, and not copying is still right.
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
  const scrollBox = scroll.getBoundingClientRect()
  draft.style.height = scrollBox.height + 'px'
  draft.style.minHeight = '0px'
  draft.style.maxHeight = 'none'
  // The stand-in's surface is its own two fill layers (send-morph.ts), so the
  // clone's copy of the surface must not paint: left as it is, it covers those
  // layers for the whole flight and the cross-fade to the bubble's fill never
  // shows. The card element's own copy is already stripped by the pin above;
  // this is the descendant that really carries the surface (chatSendSurface).
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
    background: surfaceStyle.backgroundColor,
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
