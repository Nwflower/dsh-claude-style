import { motionEaseAt, motionMs } from '../../shared/motion'

/**
 * The field the reasoning-effort slider's top rung draws (effort/matrix.ts), as
 * numbers: the grid solved in device pixels, and the three layers' phases and
 * envelopes. The renderer owns the canvas; everything here answers what one
 * block looks like at one instant, so a spec can walk the choreography with no
 * page at all.
 */

/** The groove the field fills, in CSS pixels, and the block rows solved into it. */
export const BAND_H = 26
export const FIELD_ROWS = 5
/** One flash of a block, one pass of the stream and one arrival, in seconds (D9 tokens). */
export const FLASH_S = motionMs('--dsh-claude-period-flash') / 1000
export const FLOW_S = motionMs('--dsh-claude-period-flow') / 1000
export const SURFACE_S = motionMs('--dsh-claude-duration-surface') / 1000
/** The stream's clusters across the track, and how far a row or a block may fall out of step (shares of FLOW_S). */
const FLOW_CLUSTERS = 9
const FLOW_ROW_SHIFT = 0.03
const FLOW_JITTER = 0.05
/** The flash peak's apex share (the stylesheet's `color-mix` 62%→40%), so the lighter tone takes the rest. */
const PEAK_APEX_SHARE = 62
const PEAK_SHARE_SPREAD = 22
/** The frontier glow's reach, held below the stream's tone so the eye follows the stream's direction. */
const GLOW_PEAK = 0.9
/** The stream's peak share of the strength its cluster gate allows. */
const FLOW_PEAK = 0.95

/** One block's constants: everything about it that holds while the field plays. */
export interface FieldBlock {
  /** Left and top edge, side length, all in device pixels. */
  x: number
  y: number
  size: number
  /** The lighter tone's share at the flash peak: the mix the stylesheet used to run as a 62%→40% apex share. */
  peak: number
  /** The flash cycle's offset and length, in seconds. */
  flashDelay: number
  flashDur: number
  /** The arrival's offset, in seconds: the frontier glow rides the same instant. */
  entrance: number
  /** The stream's offset (seconds, advancing its phase) and the share of light the block carries. */
  flowOffset: number
  flowStrength: number
  /** The plume: blocks at the bare end of the track dissolve into it. */
  fade: number
}

/** The grid solved for one width: the canvas box and every block's constants. */
export interface FieldGrid {
  widthDev: number
  heightDev: number
  dpr: number
  blocks: FieldBlock[]
}

/** A colour as three 0–255 channels. */
export type Channels = [number, number, number]

/**
 * Scatter one cell's phase. A linear rule such as `(7r + 13c) % 29` maps
 * neighbours onto a regular lattice the eye reads as diagonal bands;
 * avalanching both coordinates first scatters them, and the result stays
 * continuous so no two cells flip in the same instant every round.
 */
export function cellUnit(r: number, c: number, seed: number) {
  let h = Math.imul(r + 1, 0x9e3779b1) ^ Math.imul(c + 1, 0x85ebca6b) ^ Math.imul(seed + 1, 0x27d4eb2f)
  h = Math.imul(h ^ (h >>> 15), 0x2545f491)
  h ^= h >>> 13
  return (h >>> 0) / 4294967296
}

/** A value eased between two edges, the way the spatial curves of the plume read. */
function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * The share of the stream one block carries. The band alone lights every block
 * in a column, which reads as one sweeping stripe; a coarse hash groups
 * neighbours into clusters and a sparse threshold lets only some carry it, so
 * it travels as scattered particles. The floor keeps the rest from going black
 * where the band crosses.
 */
export function flowStrength(r: number, c: number, fx: number) {
  const cluster = Math.min(FLOW_CLUSTERS - 1, Math.floor(fx * FLOW_CLUSTERS))
  const coarse = cellUnit(cluster, r, 6)
  const fine = cellUnit(r, c, 7)
  const gate = coarse * 0.4 + fine * 0.6
  return 0.04 + smoothstep(0.46, 0.58, gate) * 0.92
}

/**
 * The field's left-to-right mask: solid at the nozzle end, dissolving back into
 * the bare track at the far left, so the field reads as a gradient.
 */
export function cellFade(fx: number) {
  if (fx <= 0.05) return 0
  if (fx >= 0.75) return 1
  const t = (fx - 0.05) / 0.7
  return t * t * (3 - 2 * t)
}

/**
 * Solve the grid in whole device pixels: a fractional pitch rasterizes as
 * alternating gaps, and a centred fractional remainder leaves one edge with a
 * different gap. The vertical rest goes into the top margin, so the blocks stay
 * square and centred in the groove at any device ratio.
 */
export function solveField(wDev: number, dpr: number): FieldGrid {
  /* Five rows of ~4px blocks on the 26px groove: chunky enough for the grid to
     read as PIXELS; six rows solved to 3px blocks and blurred. */
  const gap = Math.max(1, Math.round(1 * dpr))
  const margin = Math.max(1, Math.round(0.5 * dpr))
  const heightDev = Math.round(BAND_H * dpr)
  const size = Math.max(3, Math.floor((heightDev - 2 * margin - (FIELD_ROWS - 1) * gap) / FIELD_ROWS))
  const cols = Math.max(1, Math.floor((wDev + gap) / (size + gap)))
  const restX = wDev - (cols * size + (cols - 1) * gap)
  const restY = heightDev - (FIELD_ROWS * size + (FIELD_ROWS - 1) * gap)
  const left = Math.floor(restX / 2)
  const top = Math.floor(restY / 2)
  const blocks: FieldBlock[] = []
  for (let r = 0; r < FIELD_ROWS; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const fx = cols > 1 ? c / (cols - 1) : 1
      blocks.push({
        x: left + c * (size + gap),
        y: top + r * (size + gap),
        size,
        peak: (100 - (PEAK_APEX_SHARE - cellUnit(r, c, 1) * PEAK_SHARE_SPREAD)) / 100,
        flashDelay: cellUnit(r, c, 2) * FLASH_S * 0.95 + FLASH_S * 0.21,
        flashDur: FLASH_S * (0.92 + cellUnit(r, c, 3) * 0.16),
        entrance: (1 - fx) * FLASH_S * 0.31 + cellUnit(r, c, 4) * FLASH_S * 0.055,
        flowOffset: fx * FLOW_S + r * FLOW_S * FLOW_ROW_SHIFT + cellUnit(r, c, 5) * FLOW_S * FLOW_JITTER,
        flowStrength: flowStrength(r, c, fx),
        fade: cellFade(fx),
      })
    }
  }
  return { widthDev: wDev, heightDev, dpr, blocks }
}

/**
 * The flash's envelope at a share of its cycle: the block holds the accent,
 * jumps to its peak for a short window and eases back over the rest of the
 * period, on the 0/14/20/34/100 stops the stylesheet kept (D9).
 */
export function flashEnvelope(p: number) {
  if (p < 0.14) return 0
  if (p < 0.2) return motionEaseAt('--dsh-claude-ease-in-out', (p - 0.14) / 0.06)
  if (p <= 0.34) return 1
  if (p >= 1) return 0
  return 1 - motionEaseAt('--dsh-claude-ease-in-out', (p - 0.34) / 0.66)
}

/** How far a block's arrival has come: below 0 before it starts, 1 once it has landed. */
export function arrivalPhase(t: number, entrance: number) {
  return (t - entrance) / SURFACE_S
}

/** The block's fade-in along its arrival: the stylesheet's `dsh-claude-fade-in` on the surface curve (D9). */
export function arrivalRise(phase: number) {
  if (phase <= 0) return 0
  if (phase >= 1) return 1
  return motionEaseAt('--dsh-claude-ease-standard', phase)
}

/** The frontier glow along the arrival: it reaches past the peak and goes out as the block lands. */
export function arrivalGlow(phase: number) {
  if (phase <= 0 || phase >= 1) return 0
  if (phase < 0.3) return GLOW_PEAK * motionEaseAt('--dsh-claude-ease-standard', phase / 0.3)
  return GLOW_PEAK * (1 - motionEaseAt('--dsh-claude-ease-standard', (phase - 0.3) / 0.7))
}

/** The stream's envelope at a share of its period: a short flare as the band crosses the block. */
export function flowEnvelope(p: number, strength: number) {
  const peak = strength * FLOW_PEAK
  if (p < 0.03) return peak * (p / 0.03)
  if (p < 0.06) return peak * (1 - (p - 0.03) / 0.03)
  return 0
}

/** One block's flash at an instant: its own phase, peak and cycle length, so neighbours never fire together. */
export function flashAt(block: FieldBlock, t: number) {
  let p = ((t - block.flashDelay) / block.flashDur) % 1
  if (p < 0) p += 1
  return block.peak * flashEnvelope(p)
}

/** One block's share of the stream at an instant: its offset advances the phase, so the band reads right to left. */
export function flowAt(block: FieldBlock, t: number) {
  let p = ((t + block.flowOffset) / FLOW_S) % 1
  if (p < 0) p += 1
  return flowEnvelope(p, block.flowStrength)
}

/**
 * One block's colour: the flash lifts the accent towards the lighter tone, then
 * the glow and the stream lay that tone over it. Both overlays carry the same
 * tone, so the second one only has to cover what the first left uncovered.
 */
export function composeBlockColour(accent: Channels, flash: Channels, flashShare: number, glow: number, flow: number, out: Channels) {
  const over = glow + flow - glow * flow
  for (let channel = 0; channel < 3; channel += 1) {
    const lit = accent[channel] + (flash[channel] - accent[channel]) * flashShare
    out[channel] = lit + (flash[channel] - lit) * over
  }
  return out
}
