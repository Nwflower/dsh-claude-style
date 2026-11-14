/**
 * The tokens a vision model charges for one picture, read from the grid the
 * model's patch size cuts the picture into.
 *
 * The price follows the picture's pixels rather than its bytes: a screenshot
 * and a photograph of the same size cost the same. A picture under the model's
 * minimum area is scaled up to that area first, because the model enlarges it
 * to read it, and one whose grid would pass the per-image cap is scaled down to
 * the largest grid that fits.
 */

/** The model's patch edge in pixels, and the downsampling its encoder applies to a patch grid. */
const PATCH = 14
const DOWNSAMPLE = 3
/** The pixels one grid cell covers on each side. */
const CELL = PATCH * DOWNSAMPLE
/** Most tokens one picture may cost. */
const MAX_TOKENS = 1024
/** The smallest picture area the model reads without enlarging it first. */
const MIN_PIXELS = 544 * 544
/** The rounds scaling may take before the grid it reaches is priced as it stands. */
const ROUNDS = 10

interface Grid {
  tokens: number
  /** The picture's size after the round's scaling, which the next round starts from. */
  width: number
  height: number
}

/** What a grid of `height` by `width` cells costs: every row carries the row's cells and its delimiter. */
const gridTokens = (height: number, width: number) => height * (width + 1) + 2

/** The cells one padded side holds, after the encoder downsamples whole patches. */
const gridCells = (padded: number) => Math.ceil(Math.floor(padded / PATCH) / DOWNSAMPLE)

/** The largest grid an aspect ratio can hold within the cap. */
function solvedGrid(height: number, width: number): Grid {
  const aspect = height / width
  const idealWidth = Math.sqrt((MAX_TOKENS - 2) / aspect + 0.25) - 0.5
  const idealHeight = idealWidth * aspect
  // A picture too narrow or too flat for any square grid keeps one cell on the
  // short side and takes the rest of the cap along its long side.
  if (idealWidth < 1 || idealHeight < 1) {
    const cellsWide = idealWidth < 1 ? 1 : MAX_TOKENS - 3
    const cellsHigh = idealWidth < 1 ? Math.floor((MAX_TOKENS - 2) / 2) : 1
    const solvedWidth = cellsWide * CELL
    const solvedHeight = cellsHigh * CELL
    return { tokens: gridTokens(gridCells(solvedHeight), gridCells(solvedWidth)), width: solvedWidth, height: solvedHeight }
  }
  const scale = Math.min(Math.trunc(idealWidth) * CELL / width, Math.trunc(idealHeight) * CELL / height)
  const bestWidth = Math.trunc(width * scale / PATCH) * PATCH
  const bestHeight = Math.trunc(height * scale / PATCH) * PATCH
  return { tokens: gridTokens(gridCells(bestHeight), gridCells(bestWidth)), width: bestWidth, height: bestHeight }
}

/** One round: enlarge a small picture to the minimum area, pad it to whole patches, then read the grid. */
function resizeOnce(width: number, height: number): Grid {
  let scaledWidth = width
  let scaledHeight = height
  const pixels = scaledWidth * scaledHeight
  if (pixels < MIN_PIXELS && pixels > 0) {
    const scale = Math.sqrt(MIN_PIXELS / pixels)
    scaledWidth = Math.trunc(scaledWidth * scale)
    scaledHeight = Math.trunc(scaledHeight * scale)
  }
  const paddedWidth = Math.ceil(scaledWidth / PATCH) * PATCH
  const paddedHeight = Math.ceil(scaledHeight / PATCH) * PATCH
  const direct = gridTokens(gridCells(paddedHeight), gridCells(paddedWidth))
  if (direct <= MAX_TOKENS) return { tokens: direct, width: paddedWidth, height: paddedHeight }
  return solvedGrid(scaledHeight, scaledWidth)
}

/**
 * What one picture costs.
 *
 * @param width - the picture's intrinsic width in pixels, above zero.
 * @param height - the picture's intrinsic height in pixels, above zero.
 * @returns the tokens the picture is billed at, at most {@link MAX_TOKENS}.
 */
export function imageTokens(width: number, height: number): number {
  let grid = resizeOnce(width, height)
  for (let round = 1; round < ROUNDS; round += 1) {
    const next = resizeOnce(grid.width, grid.height)
    if (next.width === grid.width && next.height === grid.height) return grid.tokens
    grid = next
  }
  return grid.tokens
}
