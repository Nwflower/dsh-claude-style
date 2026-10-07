import { QUIET_ATTR } from '../../constants'
import { chatSendScrub } from './send-snapshot'

/** The shape at one moment of the flight (chatSendSamples in send-morph.ts). */
export interface ShapeSample {
  /** The share of the flight's time, and the shape's progress at it. */
  u: number
  m: number
  width: number
  /** The part of the width that is drawn. */
  visible: number
  height: number
  radius: number
  left: number
  top: number
  /** The width the words have. */
  content: number
  lineHeight: number
}

/** One step of the words' layout (chatSendTextWindows). */
export interface TextWindow {
  key: string
  from: number
  until: number
  width: number
  lineHeight: number
}

/**
 * The send flight's shape: the curve the flight follows, and the text layers
 * the clone's words re-flow into along the way.
 *
 * Everything here is computed before take-off and handed to the compositor.
 * Submission is heavy on the main thread (a new session moving out of the hero
 * state, an idle session mounting its first message: tens to a hundred-odd
 * milliseconds), so anything left on the main thread stalls there.
 *
 * Shape, position and opacity can all go to the compositor — except
 * `clip-path`, which was measured out: it will not composite even in a
 * keyframe of its own, and readers on slow machines caught the displacement
 * running on while the clip froze on the main thread, flying a card that had
 * not narrowed yet out of the message column. So the shape is a
 * `transform: scale` on a shell, with a reciprocal `scale` inside putting the
 * content back to its exact visual size (see startMorph). The one thing that
 * cannot avoid layout — words re-flowing as the shape narrows — is done ahead
 * of time too: line breaks only change at a discrete series of widths, so each
 * width is laid out once and the breaks are grouped into steps.
 */
/** The whole flight's duration in milliseconds. Not a preference: this effect keeps one switch, and a second knob is not worth it. */
export const CHAT_FLIGHT_MS = 400

/**
 * How long the stand-in fades out over the real bubble once it has landed.
 * Long enough for the words to read as sharpening rather than switching,
 * short enough that two copies of the same bubble are never noticed.
 */
export const CHAT_LANDING_MS = 160

/**
 * The angular frequency the displacement and the shape share. One progress
 * `m` drives the horizontal position, the outer width, the content area and
 * the line height for the whole flight: the reader sees the bubble leave the
 * composer sideways first and then rise, the two separated in time.
 *
 * Displacement and shape must share one curve and one timeline, or the right
 * edge leaves the column: with two curves, a stall lets the displacement run
 * ahead of the shape and the card's right edge swings past the column. The
 * equation that holds when they are one is
 *
 *     right(u) = start.right + (end.right - start.right) × m(u)
 *
 * so the right edge is always some value on that curve, inside
 * `[start.right, end.right]`, whichever end freezes. That is what the two
 * `transform` keyframes and the shared duration guarantee today: shape and
 * displacement both run on the compositor and stall in the same place.
 *
 * Critically damped, no overshoot: the shape must not bounce.
 *
 * The vertical spring is deliberately under-damped: it overshoots the target
 * by about 2.84% (`exp(-πζ/√(1-ζ²))`, set by the damping ratio alone) with its
 * peak at 190 ms and settles back — that give is the landing.
 */
export const CHAT_ACROSS_OMEGA = 16

/** The vertical spring's damping ratio, 1 being critical. How much it gives on landing is this one number. */
export const CHAT_RISE_DAMPING = 0.75

/** The vertical spring's angular frequency, on the same clock as the whole flight: larger settles earlier and bounces earlier. */
export const CHAT_RISE_OMEGA = 7.5

/**
 * Where the shape finishes, as a share of the flight — and with it how much
 * faster the shape is than the displacement (see CHAT_ACROSS_OMEGA): the shape
 * runs the same spring, compressed into this stretch.
 *
 * Earlier it was pushed later because the shape was written per frame on the
 * main thread and had to finish early; it is back at 0.45 for a different
 * reason — the earlier the shape finishes, the earlier the width is in place
 * and the earlier the right edge retreats into the column. Half the shape is
 * gone in twenty milliseconds, 79% in fifty, 99% in a hundred, and it is set
 * by a hundred and thirty-five; what is left is the rise and the landing.
 */
export const CHAT_MORPH_END = 0.45

/**
 * The floor for the content's inverse scale (pixels). When the visible width
 * is clamped to 0 the reciprocal is Infinity, and those frames show nothing
 * anyway (the scale is 0); half a pixel just keeps the keyframe a finite
 * number.
 */
export const CHAT_MIN_REVERSE_DIVISOR = 0.5

/**
 * The floor for the corner compensation (a ratio). Not the same thing as the
 * floor above: at its narrowest the shell's vertical scale is about 0.45, and
 * using 0.5 as the ratio floor would under-compensate and flatten the corners
 * — measured, the visual radius dropped from 20 to 17.96px and jumped back to
 * 20 on the frame it normalised. This only has to keep zero out.
 */
export const CHAT_MIN_CORNER_SCALE = 0.02

/** Sample count: the spring and the shape are continuous curves approached with a polyline, and five milliseconds a step shows no corners. */
export const CHAT_SHAPE_SAMPLES = 60

/** The toolbar is gone by this share of the shape (about fifty-five milliseconds): what is extra leaves first, and what is left is the bubble. */
export const CHAT_CHROME_GONE_AT = 0.8

/** How small the toolbar gets. Not to zero: it fades, and the scale only gives the feeling of retreating into the corner. */
export const CHAT_CHROME_MIN_SCALE = 0.55

/** The halo (the card's shadow and hairline) is gone by this share. A bubble has no shadow, so it leaves a little after the toolbar. */
export const CHAT_HALO_GONE_AT = 0.9

/** The draft clone lights until at latest this share, then the bubble's own setting takes over: quotes and skill chips are styled differently on the two sides. */
export const CHAT_DRAFT_HANDOFF_AT = 0.5

/** The granularity line heights are rounded to. With several lines the leading walks from 24 to 22, half a pixel a step. */
export const CHAT_LINE_HEIGHT_STEP = 0.5

/**
 * The most text layers. Line breaks change over a discrete series of widths
 * and a long passage can change dozens of times; each layer is a compositor
 * texture, so past this the shortest steps are folded into the one before —
 * fewer re-layouts, and nothing the reader can see.
 */
export const CHAT_MAX_TEXT_LAYERS = 14

/** What a text layer copies off the bubble: miss one and the breaks or the glyphs disagree with the real bubble. */
export const CHAT_TEXT_PROPERTIES = [
  'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-stretch', 'font-feature-settings',
  'font-variation-settings', 'font-kerning', 'letter-spacing', 'word-spacing', 'text-rendering',
  '-webkit-font-smoothing', 'direction', 'text-align', 'text-transform', 'text-indent', 'tab-size',
  'white-space', 'word-break', 'overflow-wrap', 'line-break', 'hyphens',
]

/**
 * The displacement response of a damped spring: from 0 to 1, `u` being the
 * share of the time already spent.
 *
 * It accelerates from nothing, is fastest in the middle and settles at the
 * end; below critical damping it goes a little past 1 and comes back — that is
 * the give on landing. The caller clamps `u` above 1.
 * @param u - the share of time, 0 to 1.
 * @param damping - the damping ratio; 1 is critical and overshoots nothing.
 * @param omega - the angular frequency on the same clock as `u`: larger settles earlier.
 * @returns the displacement; a ratio below 1 may come out slightly above 1.
 */
export function chatSendSpringProgress(u: number, damping: number, omega: number) {
  if (damping >= 1) return 1 - (1 + omega * u) * Math.exp(-omega * u)
  const damped = omega * Math.sqrt(1 - damping * damping)
  return 1 - Math.exp(-damping * omega * u)
    * (Math.cos(damped * u) + (damping * omega / damped) * Math.sin(damped * u))
}

/**
 * The vertical progress: the under-damped rise, with what it has not yet
 * settled at the end of the flight taken out by a cubic that is all but zero
 * early on. Uncorrected it ends 0.3% past the target (1.5px over a 500px
 * rise), and the landing would show the stand-in and the real bubble that
 * far apart.
 */
export function chatSendRiseProgress(u: number) {
  const residual = chatSendSpringProgress(1, CHAT_RISE_DAMPING, CHAT_RISE_OMEGA) - 1
  return chatSendSpringProgress(u, CHAT_RISE_DAMPING, CHAT_RISE_OMEGA) - residual * u * u * u
}

/**
 * The shape's progress: a critically damped spring compressed into the first
 * CHAT_MORPH_END of the flight. The spring is still a hair short at the end of
 * that window, so the whole curve is normalised by its end value: the target
 * is met exactly and nothing jumps in the middle.
 */
export function chatSendMorphProgress(u: number) {
  if (u >= CHAT_MORPH_END) return 1
  return chatSendSpringProgress(u / CHAT_MORPH_END, 1, CHAT_ACROSS_OMEGA) / chatSendSpringProgress(1, 1, CHAT_ACROSS_OMEGA)
}

/**
 * How to write a corner radius on a non-uniformly scaled shell.
 *
 * The shell narrows by `sx` and shortens by `sy` (the width goes faster than
 * the height, see CHAT_MORPH_END), which would squash the corner into an
 * ellipse. CSS's `border-radius` takes one radius per axis, so dividing the
 * scale back out keeps it visually round.
 */
export function chatSendCornerRadius(radius: number, sx: number, sy: number) {
  return (radius / Math.max(sx, CHAT_MIN_CORNER_SCALE)) + 'px / ' + (radius / Math.max(sy, CHAT_MIN_CORNER_SCALE)) + 'px'
}

/**
 * How far a box-shadow reaches outwards: the largest blur plus spread among
 * its layers, with numbers inside colour functions taken out first.
 *
 * The halo uses it to pull the shadow's outer edge back inside the visible
 * right edge (see the halo's scale in startMorph).
 * @returns pixels; an unreadable shadow counts as 0 — a shadow a little small beats one drawn past the column.
 */
export function chatSendShadowSpread(shadow: string) {
  if (shadow === '' || shadow === 'none') return 0
  let spread = 0
  for (const part of shadow.split(/,(?![^()]*\))/)) {
    const clean = part.replace(/[a-z-]+\([^)]*\)/gi, ' ')
    const found = clean.match(/-?\d*\.?\d+px/g)
    if (found === null) continue
    const values = found.map(Number.parseFloat)
    spread = Math.max(spread, (values[2] ?? 0) + (values[3] ?? 0))
  }
  return spread
}

/**
 * An opacity that lights only in `[from, until)`; both ends are steps, which
 * the compositor switches.
 * @returns the keyframes; an offset appearing twice is the jump at that moment.
 */
export function chatSendStepOpacity(from: number, until: number) {
  const frames: Keyframe[] = []
  if (from > 0) frames.push({ offset: 0, opacity: '0' }, { offset: from, opacity: '0' })
  frames.push({ offset: from, opacity: '1' }, { offset: until, opacity: '1' })
  if (until < 1) frames.push({ offset: until, opacity: '0' }, { offset: 1, opacity: '0' })
  return frames
}

/**
 * One pre-laid-out layer of the words: the bubble's content cloned whole, with
 * its typesetting properties copied off the bubble.
 * @param bubble - the destination bubble.
 * @param style - its computed style.
 * @returns a text layer with no width set yet.
 */
export function chatSendTextLayer(bubble: Element, style: CSSStyleDeclaration) {
  const layer = document.createElement('div')
  layer.style.cssText = 'position:absolute;left:0;top:0;margin:0;padding:0;border:0;box-sizing:content-box;will-change:transform,opacity'
  for (const name of CHAT_TEXT_PROPERTIES) layer.style.setProperty(name, style.getPropertyValue(name))
  for (const node of bubble.childNodes) {
    const copy = node.cloneNode(true)
    if (copy instanceof Element) chatSendScrub(copy)
    layer.appendChild(copy)
  }
  return layer
}

/**
 * Lay the bubble's words out at every width along the way and group the equal
 * breaks (plus, with several lines, the equal line heights) into steps.
 *
 * What is laid out is the bubble's own content, measured from the line boxes.
 * The probe hangs outside the viewport in a layout area of its own, so
 * changing its width re-lays only itself. The first step is left to the
 * draft's clone but handed over by CHAT_DRAFT_HANDOFF_AT at the latest, and
 * the last step is the bubble itself. The heights of the steps the words push
 * taller are filled in on the way (the sample heights are rewritten).
 *
 * @param bottomPadding - the distance from the bubble's content to its bottom edge, used when the words push it taller.
 * @returns the steps in time order; the first step's content is the draft clone's job, so it only gets a time window here.
 */
export function chatSendTextWindows(bubble: Element, style: CSSStyleDeclaration, samples: ShapeSample[], finalLineHeight: number, bottomPadding: number) {
  const probeHost = document.createElement('div')
  // Marked quiet: the probe is built, measured and removed inside this call,
  // and the shared scheduler must not read that as a change worth a pass
  // (QUIET_ATTR, D40).
  probeHost.setAttribute(QUIET_ATTR, '')
  probeHost.style.cssText = 'position:fixed;left:-100000px;top:0;visibility:hidden;contain:layout style;pointer-events:none'
  const probe = chatSendTextLayer(bubble, style)
  probe.style.position = 'static'
  probeHost.appendChild(probe)
  document.body.appendChild(probeHost)
  const layouts = new Map<number, { signature: string, lines: number }>()
  const layoutAt = (width: number) => {
    // The width goes in as it is, unrounded: a bubble shrinks to the width of
    // its words, its content area being the longest line, and rounding even a
    // fraction of a pixel down pushes that last line onto the next one.
    const key = width
    const known = layouts.get(key)
    if (known !== undefined) return known
    probe.style.width = key + 'px'
    const range = document.createRange()
    range.selectNodeContents(probe)
    const tops = new Set<number>()
    const parts: string[] = []
    for (const rect of range.getClientRects()) {
      tops.add(Math.round(rect.top))
      parts.push(Math.round(rect.top) + ':' + Math.round(rect.right))
    }
    const layout = { signature: parts.join(','), lines: tops.size }
    layouts.set(key, layout)
    return layout
  }

  // Each step is laid out at the narrowest width in it: the shell is still
  // narrowing across those five milliseconds, and laying out at the step's
  // start would push the words into the right padding and even out of the
  // shell in the second half — measured, the fastest stretch narrows a step by
  // a dozen pixels. The first step uses the card's own width, since that is
  // the draft's own line breaking and the spring has barely moved there.
  const widths = samples.map((sample, index) => {
    const next = samples[index + 1]
    return index === 0 || next === undefined ? sample.content : Math.min(sample.content, next.content)
  })
  // Not every step needs laying out: the default line breaking is greedy, so
  // two widths that lay out the same leave every width between them the same
  // too (what a line fits is at least what the narrower side fits and at most
  // what the wider one does, and if those agree it can only be that). So the
  // search only halves where the two ends differ, taking a long passage from
  // forty-odd layouts to about a dozen.
  const perSample: ({ signature: string, lines: number } | undefined)[] = new Array(widths.length)
  const fill = (from: number, to: number) => {
    if (to - from <= 1) return
    const left = perSample[from]
    const right = perSample[to]
    if (left !== undefined && right !== undefined && left.signature === right.signature) {
      for (let index = from + 1; index < to; index += 1) perSample[index] = left
      return
    }
    const middle = (from + to) >> 1
    perSample[middle] = layoutAt(widths[middle] ?? 0)
    fill(from, middle)
    fill(middle, to)
  }
  const lastIndex = widths.length - 1
  perSample[0] = layoutAt(widths[0] ?? 0)
  perSample[lastIndex] = layoutAt(widths[lastIndex] ?? 0)
  fill(0, lastIndex)

  const windows: TextWindow[] = []
  samples.forEach((sample, index) => {
    const width = widths[index] ?? sample.content
    const layout = perSample[index] ?? layoutAt(width)
    // Narrower means more lines, and words taller than the shell make it grow:
    // a self-sizing bubble does the same.
    const needed = sample.top + layout.lines * sample.lineHeight + bottomPadding
    if (needed > sample.height) sample.height = needed
    // With one line the line height does not move the glyphs (the difference is
    // made up by the translation), so it needs no layer of its own.
    const lineHeight = layout.lines > 1
      ? Math.round(sample.lineHeight / CHAT_LINE_HEIGHT_STEP) * CHAT_LINE_HEIGHT_STEP
      : finalLineHeight
    const key = layout.signature + '|' + lineHeight
    const last = windows.at(-1)
    if (last !== undefined) last.until = sample.u
    if (last !== undefined && last.key === key) return
    windows.push({ key, from: sample.u, until: sample.u, width, lineHeight })
  })
  probeHost.remove()
  const lastWindow = windows.at(-1)
  if (lastWindow !== undefined) lastWindow.until = 1
  // The first step is the draft clone's job, but it is handed over by
  // CHAT_DRAFT_HANDOFF_AT at the latest: past that the same breaks use the
  // bubble's own setting.
  const handoff = samples.find(sample => sample.m >= CHAT_DRAFT_HANDOFF_AT)?.u ?? 1
  const first = windows[0]
  if (first !== undefined && first.until > handoff) {
    windows.splice(1, 0, { key: first.key, from: handoff, until: first.until, width: first.width, lineHeight: first.lineHeight })
    first.until = handoff
  }
  // Too many steps, and the shortest are folded into the step *after*: that one
  // is laid out narrower, so lighting it early only breaks a line earlier,
  // while folding into the one before would keep the wider layout lit after the
  // shell has narrowed and the words would stick out. The first two steps (the
  // draft and its handover) take no part in it.
  while (windows.length > CHAT_MAX_TEXT_LAYERS) {
    let shortest = 2
    for (let index = 3; index < windows.length - 1; index += 1) {
      const window = windows[index]
      const best = windows[shortest]
      if (window === undefined || best === undefined) continue
      if (window.until - window.from < best.until - best.from) shortest = index
    }
    const removed = windows[shortest]
    const following = windows[shortest + 1]
    if (removed === undefined || following === undefined) break
    following.from = removed.from
    windows.splice(shortest, 1)
  }
  return windows
}
