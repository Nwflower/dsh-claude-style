import { DARK_THEME_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import { resolveContextRampStops } from '@dsh-claude-style/contracts/context-ramp'
import { setAttributeIfChanged } from '@dsh-claude-style/engine/dom'
import { INK_DARK, INK_LIGHT, contrastRatio } from '../../shared/contrast'
import { hexOfOklch, oklchOf } from '../../shared/oklch'
import { RAMP_ATTRIBUTE, RAMP_SPAN_ATTRIBUTE, RAMP_SPAN_HIGH, RAMP_SPAN_LOW } from './stats-ramp'
import type { ContextRampMode, ContextRampStop } from '@dsh-claude-style/contracts/context-ramp'

export const CONTEXT_GRAPHIC_VAR = '--dsh-claude-context-graphic'
export const CONTEXT_INK_VAR = '--dsh-claude-context-ink'

const ACHROMATIC_CHROMA = 0.005
const MIN_CONTEXT_INK_CONTRAST = 3.5

export interface ContextRampReading {
  readonly graphic: string
  readonly graphicRgb: string
  readonly ink: string
  readonly span: string
}

/** Whether the host page is currently in dark appearance. */
export function isContextDarkTheme(): boolean {
  return document.body.hasAttribute(DARK_THEME_ATTRIBUTE)
}

/** Format `#rrggbb` as `rgb(r, g, b)` to match `getComputedStyle` colour strings. */
export function hexToCssRgb(hex: string): string {
  const red = Number.parseInt(hex.slice(1, 3), 16)
  const green = Number.parseInt(hex.slice(3, 5), 16)
  const blue = Number.parseInt(hex.slice(5, 7), 16)
  return `rgb(${red}, ${green}, ${blue})`
}

/** Interpolate two `#rrggbb` colours in polar OKLCH along the shorter hue arc. */
export function interpolateOklchHex(firstHex: string, secondHex: string, ratio: number): string {
  if (ratio <= 0) return firstHex.toLowerCase()
  if (ratio >= 1) return secondHex.toLowerCase()
  const first = oklchOf(firstHex)
  const second = oklchOf(secondHex)
  let hue = 0
  if (first.c >= ACHROMATIC_CHROMA && second.c >= ACHROMATIC_CHROMA) {
    const delta = ((second.h - first.h + 540) % 360) - 180
    hue = (first.h + delta * ratio + 360) % 360
  } else if (first.c >= ACHROMATIC_CHROMA) {
    hue = first.h
  } else if (second.c >= ACHROMATIC_CHROMA) {
    hue = second.h
  }
  const lightness = first.l + (second.l - first.l) * ratio
  const chroma = first.c + (second.c - first.c) * ratio
  return hexOfOklch(lightness, chroma, hue)
}

/** Keep a custom stop's percentage text legible against the active canvas without shifting its hue. */
export function readableContextInk(hex: string, dark: boolean): string {
  const normalized = hex.toLowerCase()
  const canvas = dark ? INK_DARK : INK_LIGHT
  if (contrastRatio(normalized, canvas) >= MIN_CONTEXT_INK_CONTRAST) return normalized
  const { l, c, h } = oklchOf(normalized)
  let low = dark ? l : 0
  let high = dark ? 1 : l
  let best = dark ? '#ffffff' : '#000000'
  for (let step = 0; step < 14; step++) {
    const mid = (low + high) / 2
    const scaledChroma = dark ? c : c * (l > 0.01 ? mid / l : 1)
    const candidate = hexOfOklch(mid, scaledChroma, h)
    if (contrastRatio(candidate, canvas) >= MIN_CONTEXT_INK_CONTRAST) {
      best = candidate
      if (dark) high = mid
      else low = mid
    } else {
      if (dark) low = mid
      else high = mid
    }
  }
  return best
}

/** Evaluate an occupancy percentage against an ordered stop list. */
export function contextRampColorAt(percent: number, stops: readonly ContextRampStop[]): { graphic: string, span: string } {
  const first = stops[0]
  const last = stops[stops.length - 1]
  if (percent < first.at) return { graphic: first.color, span: RAMP_SPAN_LOW }
  if (percent >= last.at) return { graphic: last.color, span: RAMP_SPAN_HIGH }
  let segment = 0
  for (let index = 1; index < stops.length - 1; index++) {
    if (percent >= stops[index].at) segment = index
  }
  const from = stops[segment]
  const to = stops[segment + 1]
  const ratio = to.at <= from.at ? 1 : (percent - from.at) / (to.at - from.at)
  return {
    graphic: interpolateOklchHex(from.color, to.color, ratio),
    span: String(segment),
  }
}

/** Evaluate one occupancy reading into graphic colour, RGB paint and contrast-checked text ink. */
export function evaluateContextRamp(
  percent: number,
  mode: ContextRampMode,
  customRamp: string,
  dark: boolean,
): ContextRampReading {
  const stops = resolveContextRampStops(mode, customRamp, dark)
  const { graphic, span } = contextRampColorAt(percent, stops)
  const ink = readableContextInk(graphic, dark)
  return {
    graphic,
    graphicRgb: hexToCssRgb(graphic),
    ink,
    span,
  }
}

/** Build a `linear-gradient` CSS value matching `contextRampColorAt` across 0–100 %. */
export function contextRampGradientCss(stops: readonly ContextRampStop[]): string {
  const pieces: string[] = [`${stops[0].color} 0%`]
  for (let i = 0; i < stops.length; i++) {
    const current = stops[i]
    pieces.push(`${current.color} ${current.at}%`)
    const next = stops[i + 1]
    if (next !== undefined && next.at - current.at >= 4) {
      for (let step = 1; step <= 3; step++) {
        const ratio = step / 4
        const at = Math.round((current.at + (next.at - current.at) * ratio) * 10) / 10
        pieces.push(`${interpolateOklchHex(current.color, next.color, ratio)} ${at}%`)
      }
    }
  }
  pieces.push(`${stops[stops.length - 1].color} 100%`)
  return `linear-gradient(90deg, ${pieces.join(', ')})`
}

/** Write the evaluated context ramp onto a meter or ring element, or clear it when `percent` is null. */
export function writeContextRamp(
  element: HTMLElement,
  percent: number | null,
  mode: ContextRampMode,
  customRamp: string,
  dark: boolean,
): string | null {
  if (percent === null) {
    if (element.hasAttribute(RAMP_ATTRIBUTE)) element.removeAttribute(RAMP_ATTRIBUTE)
    if (element.hasAttribute(RAMP_SPAN_ATTRIBUTE)) element.removeAttribute(RAMP_SPAN_ATTRIBUTE)
    if (element.style.getPropertyValue(CONTEXT_GRAPHIC_VAR) !== '') element.style.removeProperty(CONTEXT_GRAPHIC_VAR)
    if (element.style.getPropertyValue(CONTEXT_INK_VAR) !== '') element.style.removeProperty(CONTEXT_INK_VAR)
    return null
  }
  const reading = evaluateContextRamp(percent, mode, customRamp, dark)
  setAttributeIfChanged(element, RAMP_ATTRIBUTE, 'context')
  setAttributeIfChanged(element, RAMP_SPAN_ATTRIBUTE, reading.span)
  if (element.style.getPropertyValue(CONTEXT_GRAPHIC_VAR) !== reading.graphicRgb) {
    element.style.setProperty(CONTEXT_GRAPHIC_VAR, reading.graphicRgb)
  }
  if (element.style.getPropertyValue(CONTEXT_INK_VAR) !== reading.ink) {
    element.style.setProperty(CONTEXT_INK_VAR, reading.ink)
  }
  return reading.graphicRgb
}
