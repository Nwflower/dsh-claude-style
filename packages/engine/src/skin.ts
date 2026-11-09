/**
 * Skin-provided vocabulary and policy for the engine (D73), handed over before installation.
 * Early access throws: defaults could silently watch the wrong nodes.
 */

/** What the engine needs from the skin it serves. */
export interface SkinSeam {
  /** The package the skin ships as: what a console line names it by. */
  packageName: string
  /** Skin bookkeeping attribute whose mutations must not wake page subscribers. */
  quiet: string
  /** Marks reader-owned scrolling until the reader returns to the tail. */
  readerHold: string
  /** Whether the skin must hold its animations still right now. */
  motionReduced(): boolean
}

let current: SkinSeam | null = null

/** Install or replace the seam; entry must call this before any engine part. */
export function adoptSkin(seam: SkinSeam) {
  current = seam
}

/** The seam, or a refusal: an engine part running before the hand-over is a wiring mistake. */
export function skin(): SkinSeam {
  if (current === null) throw new Error('dsh-claude-style engine: the skin handed its vocabulary over after an engine part asked for it')
  return current
}
