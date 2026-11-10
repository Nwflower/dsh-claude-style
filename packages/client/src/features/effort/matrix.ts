import { motionReduced, subscribePrefs } from '../../core/prefs'
import { buildElement } from '@dsh-claude-style/engine/dom'
import { resolveColour } from '@dsh-claude-style/engine/colour'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { pageHidden, subscribePageHidden } from '../../core/page-visibility'
import { arrivalGlow, arrivalPhase, arrivalRise, composeBlockColour, flashAt, flowAt, solveField } from './matrix-field'
import type { Channels, FieldGrid } from './matrix-field'
import type { FrameTask } from '@dsh-claude-style/engine/frame'

/** The canvas the field is drawn on; the surface table names it by this class. */
const CANVAS_CLASS = 'dsh-claude-effort-matrix-canvas'
/** The two tones the field is painted with (theme/tokens.json). */
const ACCENT_TOKEN = '--dsh-claude-apex'
const FLASH_TOKEN = '--dsh-claude-apex-flash'
/** The canvas's device-pixel limit: the field is a groove's height tall, and a 3× backing store buys nothing on it. */
const DPR_LIMIT = 2

/**
 * The dot matrix the reasoning-effort slider (effort/slider.ts) shows on its top
 * rung, drawn on one canvas instead of as a grid of animated blocks.
 *
 * The field is five rows of square particles: each twinkles on its own
 * hash-scattered cycle, a stream of light travels right to left through
 * hash-scattered clusters, and a frontier glow rides the arrival as it reaches
 * them (matrix-field.ts solves all of it). The stylesheet's four animations per
 * block made 940 instances for a 235-block field: reaching the top rung started
 * them all in one frame, releasing the knob restarted them inside the pointer
 * handler, and the twinkle repainted every block on the main thread while the
 * card stayed open. The same choreography costs one canvas box and a few
 * hundred fills a frame, with no style recalculation at any of those boundaries.
 *
 * Frames run only while the rung is lit, the card is open and the page is on
 * screen; with reduced motion the field is drawn once, standing still.
 */
export function createEffortMatrix(matrix: HTMLElement) {
  let canvas: HTMLCanvasElement | null = null
  let context: CanvasRenderingContext2D | null = null
  /** The grid standing on the canvas, `widthDev@dpr`; '' while none stands. */
  let gridSig = ''
  let grid: FieldGrid | null = null
  let accent: Channels | null = null
  let flash: Channels | null = null
  /** When the field was lit, in ms; 0 while it is not playing. */
  let enteredAt = 0
  let cancelFrame: (() => void) | null = null
  /** The motion choice the grid was drawn under, so a change of it is the only one that redraws. */
  let still = motionReduced()
  /** One block's colour, written in place so a frame allocates nothing. */
  const shade: Channels = [0, 0, 0]

  /**
   * One token as channels. A missing token or a value the canvas cannot paint
   * is a mistake in the token chain, which the field cannot invent its way out
   * of (D12); the caller's error boundary reports it once per entry.
   */
  function tone(style: CSSStyleDeclaration, token: string): Channels {
    const value = style.getPropertyValue(token).trim()
    const painted = value === '' ? null : resolveColour(value)
    if (painted === null) throw new Error(`effort/matrix: ${token} is "${value}", which the canvas cannot paint`)
    return [painted.red, painted.green, painted.blue]
  }

  /** Read the two tones off the matrix element: the tokens are the one source, and a theme switch moves them. */
  function readPalette() {
    const style = getComputedStyle(matrix)
    accent = tone(style, ACCENT_TOKEN)
    flash = tone(style, FLASH_TOKEN)
  }

  /** Whether the field should be playing: lit, open, on screen, and motion allowed. */
  function playing() {
    if (motionReduced() || pageHidden()) return false
    const card = matrix.closest<HTMLElement>('.dsh-claude-effort')
    if (card === null || !card.hasAttribute('data-apex')) return false
    const popover = matrix.closest<HTMLElement>('.dsh-claude-effort-popover')
    return popover !== null && popover.getAttribute('data-open') === 'true'
  }

  /** Paint one block at whole device-pixel edges, its corners the 1px radius the blocks carried. */
  function paintBlock(ctx: CanvasRenderingContext2D, block: { x: number; y: number; size: number }, dpr: number) {
    const radius = Math.min(Math.max(1, Math.round(dpr)), block.size / 2)
    ctx.beginPath()
    ctx.roundRect(block.x, block.y, block.size, block.size, radius)
    ctx.fill()
  }

  /** Draw one frame of the field; `now` in ms, the clock the stylesheet's animations ran on. */
  function draw(now: number) {
    if (context === null || grid === null || accent === null || flash === null) return
    const t = (now - enteredAt) / 1000
    context.clearRect(0, 0, grid.widthDev, grid.heightDev)
    for (const block of grid.blocks) {
      const phase = arrivalPhase(t, block.entrance)
      const rise = arrivalRise(phase)
      if (rise === 0) continue
      composeBlockColour(accent, flash, flashAt(block, t), arrivalGlow(phase), flowAt(block, t), shade)
      context.globalAlpha = block.fade * rise
      context.fillStyle = `rgb(${Math.round(shade[0])} ${Math.round(shade[1])} ${Math.round(shade[2])})`
      paintBlock(context, block, grid.dpr)
    }
    context.globalAlpha = 1
  }

  /** Draw the field standing still: the reduced-motion answer, and the frame a fresh grid starts from. */
  function drawStill() {
    if (context === null || grid === null || accent === null) return
    context.clearRect(0, 0, grid.widthDev, grid.heightDev)
    context.fillStyle = `rgb(${accent[0]} ${accent[1]} ${accent[2]})`
    for (const block of grid.blocks) {
      if (block.fade === 0) continue
      context.globalAlpha = block.fade
      paintBlock(context, block, grid.dpr)
    }
    context.globalAlpha = 1
  }

  /**
   * The frame loop. It stops on its own the moment the answer to `playing()` is
   * no: the picker closes the card without a pass to hear it, and a loop left
   * asking for frames would draw a field nobody sees.
   */
  const task: FrameTask = {
    write(now) {
      cancelFrame = null
      if (!playing()) {
        enteredAt = 0
        return
      }
      if (enteredAt === 0) enteredAt = now
      draw(now)
      schedule()
    },
  }

  function schedule() {
    if (cancelFrame !== null) return
    cancelFrame = requestFrame(task)
  }

  /**
   * Ask for the next frame. The answer to `playing()` is read here, so a call
   * made before the apex mark lands (see ensure) leaves the loop asleep; the
   * caller wakes it once the mark is written.
   */
  function wake() {
    if (!playing()) return
    schedule()
  }

  /**
   * (Re)build the field for the track box the read phase just took: the width
   * and nothing else, since a layout read inside the write phase is what made
   * the release expensive. False when the track has no layout yet (the picker is
   * hidden), and the caller keeps the apex treatment off.
   */
  function ensure(box: { width: number } | null) {
    const width = box === null ? 0 : box.width
    if (width === 0) return false
    const dpr = Math.min(window.devicePixelRatio > 0 ? window.devicePixelRatio : 1, DPR_LIMIT)
    const sig = `${Math.round(width * dpr)}@${dpr}`
    if (sig !== gridSig) {
      grid = solveField(Math.round(width * dpr), dpr)
      if (canvas === null) {
        canvas = buildElement('canvas', CANVAS_CLASS)
        context = canvas.getContext('2d')
        if (context === null) throw new Error('effort/matrix: the field canvas has no 2d context')
        matrix.appendChild(canvas)
      }
      canvas.width = grid.widthDev
      canvas.height = grid.heightDev
      canvas.style.width = `${grid.widthDev / dpr}px`
      canvas.style.height = `${grid.heightDev / dpr}px`
      gridSig = sig
      enteredAt = 0
    }
    readPalette()
    if (grid === null || context === null) throw new Error('effort/matrix: the field stands without a canvas')
    if (motionReduced()) {
      drawStill()
      return true
    }
    // The first tick lands next frame and starts the arrival clock there; until
    // then the box shows the bare track, which is where the stylesheet's own
    // animations began on a fresh grid.
    context.clearRect(0, 0, grid.widthDev, grid.heightDev)
    return true
  }

  const stopPrefs = subscribePrefs(() => {
    const next = motionReduced()
    if (next === still) return
    still = next
    if (cancelFrame !== null) {
      cancelFrame()
      cancelFrame = null
    }
    enteredAt = 0
    if (next) drawStill()
    else wake()
  })

  /** A page away from the screen holds the loop; coming back starts the field from now rather than replaying the absence. */
  const stopVisibility = subscribePageHidden((hidden) => {
    if (hidden) return
    enteredAt = 0
    wake()
  })

  return {
    ensure,
    wake,
    dispose() {
      if (cancelFrame !== null) {
        cancelFrame()
        cancelFrame = null
      }
      stopPrefs()
      stopVisibility()
      if (canvas !== null) canvas.remove()
      canvas = null
      context = null
      grid = null
      gridSig = ''
      enteredAt = 0
    },
  }
}
