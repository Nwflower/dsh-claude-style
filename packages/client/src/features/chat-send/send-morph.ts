import { CHAT_CHROME_GONE_AT, CHAT_CHROME_MIN_SCALE, CHAT_FLIGHT_MS, CHAT_HALO_GONE_AT, CHAT_MIN_REVERSE_DIVISOR, CHAT_MORPH_END, CHAT_SHAPE_SAMPLES, chatSendCornerRadius, chatSendMorphProgress, chatSendRiseProgress, chatSendShadowSpread, chatSendStepOpacity, chatSendTextLayer, chatSendTextWindows } from './send-shape'
import type { ShapeSample } from './send-shape'
import { CHAT_SEND_GHOST_ATTR, CHAT_SEND_LINK_ATTR, chatSendGhostHost, chatSendOpaque, chatSendPixel } from './send-snapshot'
import type { ComposerSnapshot } from './send-snapshot'
import { inPagePixels } from '../../shared/page-zoom'

/** Where the words sit inside a box: its left, top and right insets and its line height. */
interface TextInsets {
  left: number
  top: number
  right: number
  lineHeight: number
}

/** Precompute one compositor timeline because the host replaces the echo before the real row arrives. */
export function chatSendSamples(start: DOMRect, end: DOMRect, from: TextInsets, to: TextInsets, W0: number, H0: number, W1: number, H1: number, R0: number, R1: number, dx: number) {
  // Clamp the right edge to the destination if shape and displacement ever disagree.
  const reach = end.right - start.left
  const samples: ShapeSample[] = []
  for (let step = 0; step <= CHAT_SHAPE_SAMPLES; step += 1) {
    const u = step / CHAT_SHAPE_SAMPLES
    const m = chatSendMorphProgress(u)
    const width = W0 + (W1 - W0) * m
    const left = from.left + (to.left - from.left) * m
    const right = from.right + (to.right - from.right) * m
    samples.push({
      u,
      m,
      width,
      // When the displacement pushes the frame past the ceiling, the extra is
      // not drawn. Displacement and shape run the same `m`, so the curve
      // already holds the right edge inside `[start.right, end.right]` and
      // this is only insurance.
      visible: Math.max(0, Math.min(width, reach - dx * m)),
      height: H0 + (H1 - H0) * m,
      radius: R0 + (R1 - R0) * m,
      left,
      top: from.top + (to.top - from.top) * m,
      content: Math.max(1, width - left - right),
      lineHeight: from.lineHeight + (to.lineHeight - from.lineHeight) * m,
    })
  }
  return samples
}

/** shell is the visible shape measured by send-flight's landing gate; capped messages use bubble text layout immediately. */
export function startMorph(snapshot: ComposerSnapshot, bubble: HTMLElement, end: DOMRect, capped = false) {
  if (end.width === 0 || end.height === 0) return null
  const start = snapshot.box
  const style = window.getComputedStyle(bubble)
  const W0 = start.width
  const H0 = start.height
  const W1 = end.width
  // Reread the growing row so the stand-in covers its full final height.
  const H1 = Math.max(end.height, inPagePixels(bubble.getBoundingClientRect().height))
  const R0 = snapshot.radius
  const R1 = chatSendPixel(style.borderTopLeftRadius)
  const to = {
    left: bubble.clientLeft + chatSendPixel(style.paddingLeft),
    top: bubble.clientTop + chatSendPixel(style.paddingTop),
    right: chatSendPixel(style.borderRightWidth) + chatSendPixel(style.paddingRight),
    lineHeight: chatSendPixel(style.lineHeight),
  }
  // A message the fold holds carries its own words from the first frame, at the place
  // the row will hold them: the composer's draft, with its own inset and its own scroll,
  // belongs to the flight that takes off as the card.
  const from = capped ? to : snapshot.text
  const boxWidth = Math.max(W0, W1)
  const boxHeight = Math.max(H0, H1)
  const dx = end.left - start.left
  const dy = end.top - start.top
  const samples = chatSendSamples(start, end, from, to, W0, H0, W1, H1, R0, R1, dx)

  const wrapper = document.createElement('div')
  wrapper.setAttribute(CHAT_SEND_GHOST_ATTR, '')
  wrapper.setAttribute('aria-hidden', 'true')
  wrapper.inert = true
  wrapper.style.cssText = 'position:fixed;margin:0;width:0;height:0;pointer-events:none'
  wrapper.style.left = start.left + 'px'
  wrapper.style.top = start.top + 'px'
  const mover = document.createElement('div')
  mover.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;will-change:transform'
  // Place the halo on the actual painted surface, which may sit inside the card frame.
  const surface = snapshot.surface
  const halo = document.createElement('div')
  halo.style.cssText = 'position:absolute;transform-origin:0 0;background:transparent;will-change:transform,opacity'
  halo.style.left = surface.left + 'px'
  halo.style.top = surface.top + 'px'
  halo.style.width = surface.width + 'px'
  halo.style.height = surface.height + 'px'
  halo.style.borderRadius = surface.radius + 'px'
  halo.style.boxShadow = snapshot.shadow
  const shell = document.createElement('div')
  shell.style.cssText = 'position:absolute;left:0;top:0;overflow:hidden;transform-origin:0 0;will-change:transform'
  shell.style.width = boxWidth + 'px'
  shell.style.height = boxHeight + 'px'
  // Keep an opaque destination fill on the visible shell from the first frame; an animated inner
  // fill could lag the shape and translucent fill would composite twice during landing.
  shell.style.backgroundColor = chatSendOpaque(style.backgroundColor, window.getComputedStyle(chatSendGhostHost()).backgroundColor)
  // The shape carries the destination's own edge as well: a bubble the fold holds
  // softens its bottom with a mask, and the stand-in is that bubble until it lands. A
  // bubble nothing holds computes to `none`, which writes nothing.
  shell.style.setProperty('mask-image', style.maskImage)
  shell.style.setProperty('-webkit-mask-image', style.maskImage)
  for (const [name, value] of snapshot.context) shell.style.setProperty(name, value)
  // Shell scales and clips; scaler applies the reciprocal so content stays visually unchanged.
  // Both share the displacement's compositor timeline and therefore stall together.
  const scaler = document.createElement('div')
  scaler.style.cssText = 'position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform'
  scaler.style.width = boxWidth + 'px'
  scaler.style.height = boxHeight + 'px'
  // The corner is written once explicitly: the frame or two while the
  // animation is still pending paint at offset 0, and without this a slow
  // machine shows a square box first. The radius compensation is below.
  shell.style.borderRadius = chatSendCornerRadius(R0, W0 / boxWidth, H0 / boxHeight)
  shell.appendChild(scaler)
  // Recreate ancestor selector matching with display:contents links around the clone only.
  // These links create no boxes or containing blocks; null ancestors leave the clone on the shell.
  let cloneHost: HTMLElement = scaler
  for (const mark of snapshot.ancestors ?? []) {
    const link = document.createElement(mark.tag)
    // Ancestor-class rules may be !important; a boxed link would become the clone's containing block.
    link.style.setProperty('display', 'contents', 'important')
    link.setAttribute('aria-hidden', 'true')
    // `display: contents` takes away the link's own box but not its
    // pseudo-elements: an ancestor's `::before` (the Windows title bar strip on
    // the layout frame) would paint across the top of the stand-in, so the
    // link carries the skin's mark that send-flight.css hangs their removal on.
    link.setAttribute(CHAT_SEND_LINK_ATTR, '')
    // Classes only from the ancestor: none of its `data-*` is copied, for the
    // reasons and the measurements in send-snapshot.ts's ancestor note.
    if (mark.className !== '') link.className = mark.className
    cloneHost.appendChild(link)
    cloneHost = link
  }
  cloneHost.appendChild(snapshot.clone)

  // The words: laid out at every width along the way first, then grouped into
  // steps by equal breaks and one line-height notch. The first step is the
  // draft inside the cloned card itself; every other is a layer of its own.
  const bottomPadding = chatSendPixel(style.paddingBottom) + chatSendPixel(style.borderBottomWidth)
  const windows = chatSendTextWindows(bubble, style, samples, to.lineHeight, bottomPadding, H0, H1, capped)
  const draftWindow = windows[0]
  const layers = windows.slice(1).map((window) => {
    const layer = chatSendTextLayer(bubble, style)
    layer.style.width = window.width + 'px'
    layer.style.lineHeight = window.lineHeight + 'px'
    scaler.appendChild(layer)
    return { layer, window }
  })

  mover.appendChild(halo)
  mover.appendChild(shell)
  wrapper.appendChild(mover)
  // The stand-in always lands last in the document: document.querySelector
  // takes the first in document order, so anything looking for the card or
  // the input — both of which are ahead of it — keeps finding the real ones.
  chatSendGhostHost().appendChild(wrapper)
  // The clone can only be scrolled to its old place once it is in the document.
  if (snapshot.draftScrollTop > 0) snapshot.draft.scrollTop = snapshot.draftScrollTop

  const timing: KeyframeAnimationOptions = { duration: CHAT_FLIGHT_MS, easing: 'linear', fill: 'forwards' }
  const animations: Animation[] = []
  const run = (element: Element, frames: Keyframe[]) => {
    const animation = element.animate(frames, timing)
    animations.push(animation)
    return animation
  }
  // Sample only the active window and pin both ends; keyframes outside it add setup cost only.
  const between = (windowFrom: number, windowUntil: number, frame: (sample: ShapeSample) => Keyframe, stride?: number) => {
    const step = stride ?? 1
    const inside = samples.filter(sample => sample.u >= windowFrom && sample.u <= windowUntil)
    const frames: Keyframe[] = []
    inside.forEach((sample, index) => {
      // Shape and content require identical samples to remain reciprocal; decorative runs may stride.
      if (index % step !== 0) return
      frames.push({ ...frame(sample), offset: sample.u })
    })
    // The last sample always goes in: it is the settled value, and without it
    // the animation stops on the one before.
    const final = inside.at(-1)
    if (final !== undefined && (frames.at(-1)?.offset ?? -1) !== final.u) {
      frames.push({ ...frame(final), offset: final.u })
    }
    const first = frames[0]
    const last = frames.at(-1)
    if (first !== undefined && (first.offset ?? 0) > 0) frames.unshift({ ...first, offset: 0 })
    if (last !== undefined && (last.offset ?? 1) < 1) frames.push({ ...last, offset: 1 })
    return frames
  }

  // Share duration and offsets with shape so displacement and width stall together.
  const travel = run(mover, samples.map(sample => ({
    offset: sample.u,
    transform: 'translate(' + dx * sample.m + 'px, '
      + dy * chatSendRiseProgress(sample.u) + 'px)',
  })))
  // The shape: the shell scales to the stretch that can really be drawn right
  // now. `sample.visible` is the right-edge clamp, and `sample.m` is the
  // same one the displacement uses, so the right-edge equation holds.
  const shape = run(shell, between(0, CHAT_MORPH_END, sample => ({
    transform: 'scale(' + sample.visible / boxWidth + ', ' + sample.height / boxHeight + ')',
  })))
  // The content's inverse scale, the reciprocal of the shell's step by step.
  // The floor stops the division by zero when `visible` is clamped to 0 —
  // those frames show nothing anyway.
  const inverse = run(scaler, between(0, CHAT_MORPH_END, sample => ({
    transform: 'scale(' + boxWidth / Math.max(sample.visible, CHAT_MIN_REVERSE_DIVISOR) + ', '
      + boxHeight / Math.max(sample.height, CHAT_MIN_REVERSE_DIVISOR) + ')',
  })))
  // The corner has to live on the shell rather than a layer inside it: the
  // visible right edge is the shell's own clip, so a corner on the inner layer
  // would round the left and leave the right square, which a reader spots at
  // once. It does not composite, so it is a separate run on the main thread —
  // apart from the geometry, which keeps the shell's `transform` on the
  // compositor. Stalled, the radius holds its old value and the corner stays
  // round.
  // The shell scales non-uniformly (the width goes faster than the height), so
  // the radius is divided back out per step or the corner becomes an ellipse.
  const corners = run(shell, between(0, CHAT_MORPH_END, sample => ({
    borderRadius: chatSendCornerRadius(sample.radius, sample.visible / boxWidth, sample.height / boxHeight),
  }), 2))

  /**
   * The progress right now (0 to 1), taken from the displacement animation's
   * own `currentTime`.
   *
   * Displacement and shape share one timeline and cannot lead each other, and
   * reading the animation's own clock rather than the wall clock is for the
   * first frame or two: the WAAPI animation is still pending then (no
   * `startTime`) and paints at offset 0 — the whole composer card — while the
   * wall clock has already run a dozen milliseconds. A captured screen frame:
   * the stand-in's left edge was still at the card's 317 while its right edge
   * had already stretched from 1030 to the viewport's 1073. Reading the
   * animation's own clock keeps both on the same step; pending, it reads 0 and
   * the stand-in holds at the take-off step.
   * @returns the progress; 0 when the animation has no readable time (holding still beats flying off).
   */
  const progress = () => {
    const raw = travel.currentTime
    if (typeof raw !== 'number') return 0
    const u = raw / CHAT_FLIGHT_MS
    if (!(u > 0)) return 0
    return u > 1 ? 1 : u
  }

  let normalized = false
  /** The halo's run: the seal in `compact` cancels exactly this. */
  const sealed: Animation[] = []
  /**
   * Once the shape's stretch is over, normalise the shell: the layout size
   * becomes the visible size of that moment and both scales return to 1.
   *
   * Without it the content would stay on the "grown, then scaled back" path
   * (the inverse scale ends at 5.9x) and rasterise at the grown size, leaving
   * the words soft. On the normalising frame "the width goes from boxWidth to
   * visible" and "the scale returns from visible / boxWidth to 1" are
   * equivalent (boxWidth × visible / boxWidth = visible), so nothing visibly
   * jumps.
   *
   * Both animations have to be cancelled: they fill forwards and would keep
   * writing `transform` from their last frame, which the two inline
   * declarations returning to 1 cannot beat. Cancelling drops the properties
   * back to the inline values, which are the normalised ones.
   *
   * It takes the shape's end sample, not the last sample of all: past the end
   * of the shape the width stops moving, but the words can still make the frame
   * taller, and comparing against the very last sample would jump on the
   * normalising frame.
   *
   * The halo is sealed with it: it is an animation of its own, and this snap is
   * written on the main thread while the halo may still be behind. Writing its
   * end state here, in the same task as the snap, is what makes the stand-in's
   * look a fact of the layout rather than of any animation's clock.
   * @param u - the progress right now; nothing happens before the shape's stretch is over.
   */
  const compact = (u: number) => {
    if (normalized || u < CHAT_MORPH_END) return
    const final = samples.find(sample => sample.u >= CHAT_MORPH_END) ?? samples.at(-1)
    if (final === undefined) return
    normalized = true
    shape.cancel()
    inverse.cancel()
    corners.cancel()
    shell.style.width = final.visible + 'px'
    shell.style.height = final.height + 'px'
    shell.style.transform = 'none'
    shell.style.borderRadius = final.radius + 'px'
    scaler.style.transform = 'none'
    halo.style.opacity = '0'
    for (const animation of sealed) animation.cancel()
  }
  // The halo hangs outside the shell so the shell's `overflow: hidden` cannot
  // clip it — its shadow would otherwise paint past the visible right edge. Its
  // scale accounts for the
  // surface plus the shadow's spread, putting the shadow's outer edge right on
  // the visible right edge.
  const shadow = chatSendShadowSpread(snapshot.shadow)
  sealed.push(run(halo, between(0, CHAT_MORPH_END, sample => ({
    transform: 'scale(' + sample.visible / (surface.left + surface.width + shadow) + ', '
      + sample.height / (surface.top + surface.height + shadow) + ')',
    opacity: String(Math.max(0, 1 - sample.m / CHAT_HALO_GONE_AT)),
  }), 2)))
  for (const piece of snapshot.chrome) {
    const x = piece.rect[0]
    const y = piece.rect[1]
    const width = piece.rect[2]
    const height = piece.rect[3]
    // It drives into the nearest corner: the right half follows the right side
    // and the lower half the bottom, and the scale takes that corner as its
    // origin.
    const anchorRight = x + width / 2 > W0 / 2
    const anchorBottom = y + height / 2 > H0 / 2
    piece.element.style.transformOrigin = (anchorRight ? '100%' : '0%') + ' ' + (anchorBottom ? '100%' : '0%')
    run(piece.element, between(0, CHAT_MORPH_END, (sample) => {
      const gone = Math.min(1, sample.m / CHAT_CHROME_GONE_AT)
      const shiftX = anchorRight ? sample.visible - W0 : 0
      const shiftY = anchorBottom ? sample.height - H0 : 0
      return {
        transform: 'translate(' + shiftX + 'px, ' + shiftY + 'px) scale(' + (1 - (1 - CHAT_CHROME_MIN_SCALE) * gone) + ')',
        opacity: String(1 - gone),
      }
    }, 2))
  }

  // The first step of the words is the draft inside the composer: it stays in
  // place in the cloned card and follows the content area's origin.
  const draftUntil = draftWindow === undefined ? 1 : draftWindow.until
  run(snapshot.draft, between(0, draftUntil, sample => ({
    transform: 'translate(' + (sample.left - from.left) + 'px, '
      + (sample.top - from.top + (sample.lineHeight - from.lineHeight) / 2) + 'px)',
  })))
  run(snapshot.draft, chatSendStepOpacity(0, draftUntil))
  for (const { layer, window } of layers) {
    run(layer, between(window.from, window.until, sample => ({
      transform: 'translate(' + sample.left + 'px, ' + (sample.top + (sample.lineHeight - window.lineHeight) / 2) + 'px)',
    })))
    run(layer, chatSendStepOpacity(window.from, window.until))
  }
  return { wrapper, shell, compact, progress, animations }
}
