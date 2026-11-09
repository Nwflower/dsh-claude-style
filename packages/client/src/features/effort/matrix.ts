import { motionReduced, subscribePrefs } from '../../core/prefs'
import { buildElement } from '@dsh-claude-style/engine/dom'
import { motionMs } from '../../shared/motion'

/** One flash of a particle, in seconds: the period token the stylesheet's own shorthand runs (D9). */
const FLASH_S = motionMs('--dsh-claude-period-flash') / 1000
/** One pass of the particle flow, in seconds: the period token the flow animation runs (D9). */
const FLOW_S = motionMs('--dsh-claude-period-flow') / 1000
/** The flow's clusters across the track, and how far a row or a block may fall out of step (shares of FLOW_S). */
const FLOW_CLUSTERS = 9
const FLOW_ROW_SHIFT = 0.03
const FLOW_JITTER = 0.05

/**
 * The dot matrix the reasoning-effort slider (effort/slider.ts) shows on its
 * top rung. The grid is solved in whole device pixels, and three layers ride
 * each block: its own hash-scattered flash, a stream of light travelling right
 * to left through hash-scattered clusters, and a one-pass glow as the entrance
 * sweep passes. The stream is the only ordered layer and the brightest, so the
 * direction the eye reads is the stream's. The factory builds the grid inside
 * `matrix` for the width of `track`; `ensure()` answers false while the track
 * has no layout, and `dispose()` drops the preference listener.
 */
export function createEffortMatrix(track: HTMLElement, matrix: HTMLElement) {
  /**
   * The grid the matrix is built for, `widthDev@dpr`; '' while unbuilt. The
   * picker's width is fixed, so a built grid lasts the mount; a device-pixel
   * ratio change forces one rebuild on the next apex entry.
   */
  let matrixSig = ''
  /** Whether the grid standing in the document was built under the reduced answer. */
  let builtReduced = motionReduced()

  /**
   * Scatter one cell's phase. A linear rule such as `(7r + 13c) % 29` maps
   * neighbours onto a regular lattice the eye reads as diagonal bands;
   * avalanching both coordinates first scatters them, and the result stays
   * continuous so no two cells flip in the same instant every round.
   */
  function cellUnit(r: number, c: number, seed: number) {
    let h = Math.imul(r + 1, 0x9e3779b1) ^ Math.imul(c + 1, 0x85ebca6b) ^ Math.imul(seed + 1, 0x27d4eb2f)
    h = Math.imul(h ^ (h >>> 15), 0x2545f491)
    h ^= h >>> 13
    return (h >>> 0) / 4294967296
  }

  /** A value eased between two edges, the way the stylesheets' own curves read. */
  function smoothstep(edge0: number, edge1: number, value: number) {
    const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)
  }

  /**
   * The share of the flow band one block carries. The band alone lights every
   * block in a column, which reads as one sweeping stripe; a coarse hash groups
   * neighbours into clusters and a sparse threshold lets only some carry it, so
   * it travels as scattered particles. The floor keeps the rest from going
   * black where the band crosses.
   */
  function flowStrength(r: number, c: number, fx: number) {
    const cluster = Math.min(FLOW_CLUSTERS - 1, Math.floor(fx * FLOW_CLUSTERS))
    const coarse = cellUnit(cluster, r, 6)
    const fine = cellUnit(r, c, 7)
    const gate = coarse * 0.4 + fine * 0.6
    return 0.04 + smoothstep(0.46, 0.58, gate) * 0.92
  }

  /**
   * The matrix's left-to-right mask: solid at the right end, dissolving back
   * into the bare track at the left, so the grid reads as a gradient.
   */
  function cellFade(fx: number) {
    if (fx <= 0.05) return 0
    if (fx >= 0.75) return 1
    const t = (fx - 0.05) / 0.7
    return t * t * (3 - 2 * t)
  }

  /**
   * Solve the grid in whole device pixels: a fractional pitch rasterizes as
   * alternating gaps, and a centred fractional remainder leaves one edge with a
   * different gap. The vertical rest goes into the top/bottom padding, so the
   * blocks stay square and centred in the groove at any device ratio.
   */
  function solveMatrix(wDev: number, dpr: number) {
    /* Five rows of ~4px blocks on the 26px groove: chunky enough for the grid
       to read as PIXELS; six rows solved to 3px blocks and blurred. */
    const ROWS = 5
    const gap = Math.max(1, Math.round(1 * dpr))
    const margin = Math.max(1, Math.round(0.5 * dpr))
    const hDev = Math.round(26 * dpr)
    const block = Math.max(3, Math.floor((hDev - 2 * margin - (ROWS - 1) * gap) / ROWS))
    const cols = Math.max(1, Math.floor((wDev + gap) / (block + gap)))
    const restX = wDev - (cols * block + (cols - 1) * gap)
    const restY = hDev - (ROWS * block + (ROWS - 1) * gap)
    return {
      cols,
      rows: ROWS,
      sq: block / dpr,
      gap: gap / dpr,
      padTop: Math.floor(restY / 2) / dpr,
      padBottom: (restY - Math.floor(restY / 2)) / dpr,
      padLeft: Math.floor(restX / 2) / dpr,
      padRight: (restX - Math.floor(restX / 2)) / dpr,
    }
  }
  /**
   * Give one particle its twinkle: a hash-scattered phase, CYCLE LENGTH and
   * peak. Nothing here is ordered — the phases spread so no two neighbours fire
   * together, and the per-block durations drift them apart. The stream stays the
   * field's only ordered layer.
   */
  function paintParticle(sq: HTMLElement, r: number, c: number) {
    /* The flash peak, held below the flow's own tone: the band must stay the
       brightest thing on the block, or the eye follows the flash instead and
       reads no direction. */
    sq.style.setProperty('--dsh-flash-mix', `${(62 - cellUnit(r, c, 1) * 22).toFixed(1)}%`)
    // Standing still, the cycle and the phase are not written: an inline
    // `!important` duration outranks the reduced-motion rule, and a plume that
    // flashes once per block after a scattered delay is motion like any other
    // (D40). Without them the stylesheet's own duration answers the rule.
    if (motionReduced()) {
      sq.style.removeProperty('animation-delay')
      sq.style.removeProperty('animation-duration')
      return
    }
    sq.style.setProperty('animation-delay', `${(cellUnit(r, c, 2) * FLASH_S * 0.95 + FLASH_S * 0.21).toFixed(3)}s`, 'important')
    sq.style.setProperty('animation-duration', `${(FLASH_S * (0.92 + cellUnit(r, c, 3) * 0.16)).toFixed(3)}s`, 'important')
  }


  /**
   * (Re)build the matrix for the track's current device-pixel size. False when
   * the track has no layout yet (the picker is hidden): the caller keeps the
   * apex treatment off and the next paintValue retries, so the attribute never
   * marks a grid that is not there.
   */
  function ensureMatrix() {
    const w = track.clientWidth
    if (!w) return false
    const dpr = window.devicePixelRatio > 0 ? window.devicePixelRatio : 1
    const sig = `${Math.round(w * dpr)}@${dpr}${motionReduced() ? '@still' : ''}`
    if (sig === matrixSig) return true
    const lay = solveMatrix(Math.round(w * dpr), dpr)
    while (matrix.firstChild) matrix.removeChild(matrix.firstChild)
    matrix.style.gap = `${lay.gap}px`
    matrix.style.padding = `${lay.padTop}px ${lay.padRight}px ${lay.padBottom}px ${lay.padLeft}px`
    matrix.style.gridTemplateColumns = `repeat(${lay.cols}, ${lay.sq}px)`
    matrix.style.gridAutoRows = `${lay.sq}px`
    for (let r = 0; r < lay.rows; r++) {
      for (let c = 0; c < lay.cols; c++) {
        const fx = lay.cols > 1 ? c / (lay.cols - 1) : 1
        const cell = buildElement('div', 'dsh-claude-effort-matrix-cell')
        const sq = buildElement('div', 'dsh-claude-effort-matrix-sq')
        /* The plume shape is a STATIC per-block opacity: every layer on the
           block rides through it, so the layers never fight. */
        sq.style.opacity = cellFade(fx).toFixed(3)
        if (!motionReduced()) {
          /* The entrance sweeps in from the right — the end the knob reached
             for — with a whisper of scatter so it does not read as a wipe.
             !important inline: the stylesheet's animation shorthand resets
             delay/duration, so a plain assignment would silently lose.
             Standing still both are left off, for the same reason
             paintParticle leaves the cycle off (D40). */
          const entrance = (1 - fx) * FLASH_S * 0.31 + cellUnit(r, c, 4) * FLASH_S * 0.055
          cell.style.setProperty('animation-delay', `${entrance.toFixed(3)}s`, 'important')
          sq.style.setProperty('--dsh-front-delay', `${entrance.toFixed(3)}s`)
          /* The flow starts at the right end and travels left: a negative delay
             that grows with the block's place along the track. The row shift and
             the hash jitter keep the stream from reading as a straight edge. */
          const flow = fx * FLOW_S + r * FLOW_S * FLOW_ROW_SHIFT + cellUnit(r, c, 5) * FLOW_S * FLOW_JITTER
          sq.style.setProperty('--dsh-flow-delay', `-${flow.toFixed(3)}s`)
          sq.style.setProperty('--dsh-flow-strength', flowStrength(r, c, fx).toFixed(3))
        }
        paintParticle(sq, r, c)
        cell.appendChild(sq)
        matrix.appendChild(cell)
      }
    }
    matrixSig = sig
    builtReduced = motionReduced()
    return true
  }

  /**
   * A change of the animation choice rebuilds the grid: the per-block cycles are
   * inline with `!important`, so a grid built while motion played would keep
   * pulsing. The rebuild writes no cycles under the reduced answer.
   */
  const stopPrefs = subscribePrefs(() => {
    if (motionReduced() === builtReduced) return
    matrixSig = ''
    ensureMatrix()
  })

  return { ensure: ensureMatrix, dispose: stopPrefs }
}
