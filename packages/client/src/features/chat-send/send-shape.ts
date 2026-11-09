import { QUIET_ATTR } from '../../constants'
import { chatSendScrub } from './send-snapshot'
import { motionMs } from '../../shared/motion'

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

/* Precompute compositor frames before submission work blocks the main thread. Use reciprocal
   scales instead of non-composited clip-path; precompute discrete text layouts for reflow. */
/** The effect has one switch; duration comes from the token table (D9). */
export const CHAT_FLIGHT_MS = motionMs('--dsh-claude-duration-flight')

/** Crossfade the stand-in into the real bubble without leaving two visible copies. */
export const CHAT_LANDING_MS = motionMs('--dsh-claude-duration-surface')

/* Displacement and shape must share one compositor curve and timeline so a stall cannot move the
   right edge outside the column. Shape is critically damped; the under-damped rise supplies landing give. */
export const CHAT_ACROSS_OMEGA = 16

/** The vertical spring's damping ratio, 1 being critical. How much it gives on landing is this one number; a ratio near critical leaves a give too small to read as a landing. */
export const CHAT_RISE_DAMPING = 0.75

/** The vertical spring's angular frequency, on the same clock as the whole flight: larger settles earlier and bounces earlier. */
export const CHAT_RISE_OMEGA = 7.5

/** Finish shape early so the right edge returns inside the column before the rise lands. */
export const CHAT_MORPH_END = 0.45

/** Keep inverse scale finite when visible width reaches zero. */
export const CHAT_MIN_REVERSE_DIVISOR = 0.5

/** Only prevent division by zero; a larger floor under-compensates corner radii. */
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

/** Bound compositor textures by merging the shortest text-layout steps. */
export const CHAT_MAX_TEXT_LAYERS = 14

/** What a text layer copies off the bubble: miss one and the breaks or the glyphs disagree with the real bubble. */
export const CHAT_TEXT_PROPERTIES = [
  'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-stretch', 'font-feature-settings',
  'font-variation-settings', 'font-kerning', 'letter-spacing', 'word-spacing', 'text-rendering',
  '-webkit-font-smoothing', 'direction', 'text-align', 'text-transform', 'text-indent', 'tab-size',
  'white-space', 'word-break', 'overflow-wrap', 'line-break', 'hyphens',
]

/** Damped-spring response; the caller clamps u above 1 and under-damped values may overshoot. */
export function chatSendSpringProgress(u: number, damping: number, omega: number) {
  if (damping >= 1) return 1 - (1 + omega * u) * Math.exp(-omega * u)
  const damped = omega * Math.sqrt(1 - damping * damping)
  return 1 - Math.exp(-damping * omega * u)
    * (Math.cos(damped * u) + (damping * omega / damped) * Math.sin(damped * u))
}

/** Subtract the spring's residual with a late cubic so stand-in and bubble meet exactly at landing. */
export function chatSendRiseProgress(u: number) {
  const residual = chatSendSpringProgress(1, CHAT_RISE_DAMPING, CHAT_RISE_OMEGA) - 1
  return chatSendSpringProgress(u, CHAT_RISE_DAMPING, CHAT_RISE_OMEGA) - residual * u * u * u
}

/** Normalize the compressed spring by its endpoint so shape reaches the target without a jump. */
export function chatSendMorphProgress(u: number) {
  if (u >= CHAT_MORPH_END) return 1
  return chatSendSpringProgress(u / CHAT_MORPH_END, 1, CHAT_ACROSS_OMEGA) / chatSendSpringProgress(1, 1, CHAT_ACROSS_OMEGA)
}

/** Divide each axis by its scale so non-uniform shell scaling does not flatten corners. */
export function chatSendCornerRadius(radius: number, sx: number, sy: number) {
  return (radius / Math.max(sx, CHAT_MIN_CORNER_SCALE)) + 'px / ' + (radius / Math.max(sy, CHAT_MIN_CORNER_SCALE)) + 'px'
}

/** Ignore numbers inside colour functions; unreadable shadows contribute zero rather than extend past the column. */
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

/** Duplicate offsets create compositor-switch steps at both ends. */
export function chatSendStepOpacity(from: number, until: number) {
  const frames: Keyframe[] = []
  if (from > 0) frames.push({ offset: 0, opacity: '0' }, { offset: from, opacity: '0' })
  frames.push({ offset: from, opacity: '1' }, { offset: until, opacity: '1' })
  if (until < 1) frames.push({ offset: until, opacity: '0' }, { offset: 1, opacity: '0' })
  return frames
}

/** Clone content with all typesetting properties so line breaks and glyphs match the real bubble. */
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

/* Group equal line-box layouts into steps using an isolated probe. Keep each height on the
   composer-to-row floor; reread destinationHeight because early samples may catch a growing row.
   For folded messages, preserve the capped box and clip excess words throughout. */
export function chatSendTextWindows(bubble: Element, style: CSSStyleDeclaration, samples: ShapeSample[], finalLineHeight: number, bottomPadding: number, fromHeight: number, destinationHeight: number, held = false) {
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

  // Use each step's narrowest width so words cannot outgrow the shrinking shell;
  // the first step retains the draft's own line breaking.
  const widths = samples.map((sample, index) => {
    const next = samples[index + 1]
    return index === 0 || next === undefined ? sample.content : Math.min(sample.content, next.content)
  })
  // Greedy line breaking is monotonic: equal layouts at both ends imply equal layouts between them.
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
    // Match self-sizing bubbles, but never drop below the interpolated destination edge.
    const floor = fromHeight + (destinationHeight - fromHeight) * sample.m
    if (!held) {
      const needed = sample.top + layout.lines * sample.lineHeight + bottomPadding
      if (needed > sample.height) sample.height = needed
    }
    if (sample.height < floor) sample.height = floor
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
  // Folded messages use the bubble layout from the first step; other flights hand the draft over
  // by CHAT_DRAFT_HANDOFF_AT so quote and chip styling changes with ownership.
  const handoff = held ? 0 : samples.find(sample => sample.m >= CHAT_DRAFT_HANDOFF_AT)?.u ?? 1
  const first = windows[0]
  if (first !== undefined && first.until > handoff) {
    windows.splice(1, 0, { key: first.key, from: handoff, until: first.until, width: first.width, lineHeight: first.lineHeight })
    first.until = handoff
  }
  // Merge into the following, narrower step so words never retain a wider layout after shrinking.
  // Preserve the initial draft and handover steps.
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
