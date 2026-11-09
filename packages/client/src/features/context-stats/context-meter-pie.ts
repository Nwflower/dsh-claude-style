/**
 * Draw the meter as an inline-SVG pie (dsh-chat-ux): the host shapes radii, so a
 * border-radius circle cannot work. Keep the ring's cell so host layout remains.
 */

/** The mark on the meter while its ring has given way to the pie. */
export const METER_PIE_ATTR = 'data-dsh-claude-meter-pie'
/** The unoccupied plate's colour, declared with the tone band (features/composer/vars.css). */
const REST_VAR = '--dsh-claude-pie-rest'
/** The pie's box, and the icon cell it takes over. */
const PIE_SIZE = 16
const ICON_SIZE = 14
/** The seam between the two sectors, and the push the smaller share stands out by. */
const SLICE_GAP = 1.2
const SLICE_LIFT = 2.6
/** The box's radius, which the smaller share keeps, and the centre both sectors stand on. */
const RADIUS = PIE_SIZE / 2
const CENTER = PIE_SIZE / 2
/** The split the radii and the seam are measured against, and the stretch over which the push eases out. */
const EVEN_SPLIT = 50
const LIFT_SPREAD = 35
/** A whole turn, in radians. */
const FULL_TURN = Math.PI * 2
/** Path coordinates keep two decimals: more is noise at this size. */
const PATH_PRECISION = 100
/** The two masks, named inside the one image document that uses them. */
const GREY_MASK_ID = 'dsh-claude-pie-grey'
const COLOR_MASK_ID = 'dsh-claude-pie-color'

/** One reading's last painted state, per trigger, so an unchanged pass writes nothing. */
const painted = new WeakMap<HTMLElement, { percent: number, tone: string, rest: string }>()

/** Return one reading's pie as a `background-image` value. */
export function contextPieImage(percent: number, tone: string, rest: string) {
  // Both ends are a whole plate: at nothing taken there is no sector to cut,
  // and at everything taken a seam against the plate's own edge says nothing.
  if (percent >= 100) return inlineSvg(`<path d="${discPath(CENTER, CENTER, RADIUS)}" fill="${tone}"/>`)
  if (percent <= 0) return inlineSvg(`<path d="${discPath(CENTER, CENTER, RADIUS)}" fill="${rest}"/>`)
  return splitImage(percent, tone, rest)
}

/** The two colours a pie is drawn in, as the page computed them for one trigger. */
export interface PieColours {
  trigger: HTMLElement
  tone: string
  rest: string
}

/**
 * Read the colours the meter's pie takes, or null while the meter has no trigger
 * or reading. Reading a computed style settles the page's styles, so the caller
 * takes this in the pass's read phase (D40).
 *
 * @param meter - the host's meter root.
 */
export function readPieColours(meter: HTMLElement): PieColours | null {
  const trigger = meter.querySelector('button')
  const reading = trigger === null ? null : trigger.querySelector('span')
  if (!(trigger instanceof HTMLElement) || !(reading instanceof HTMLElement)) return null
  // The reading's own colour is the band's answer, mixed by the browser
  // (features/composer/inline-bar.css), so the two can never disagree.
  return {
    trigger,
    tone: getComputedStyle(reading).color,
    rest: getComputedStyle(trigger).getPropertyValue(REST_VAR).trim(),
  }
}

/**
 * Paint the meter's reading as a pie, or give the host's ring back.
 *
 * @param meter - the host's meter root.
 * @param percent - the occupancy the reader sees, or null when no reading can
 *   be taken (the ring then stands, in whatever colour the host gives it).
 * @param colours - the colours readPieColours took for the meter's current trigger.
 */
export function paintContextPie(meter: HTMLElement, percent: number | null, colours: PieColours | null) {
  if (percent === null || colours === null) {
    releaseContextPie(meter)
    return
  }
  const { trigger, tone, rest } = colours
  // No stylesheet, no pie: the ring the host drew is the honest fallback.
  if (tone === '' || rest === '') {
    releaseContextPie(meter)
    return
  }
  const last = painted.get(trigger)
  if (last === undefined || last.percent !== percent || last.tone !== tone || last.rest !== rest) {
    painted.set(trigger, { percent, tone, rest })
    // The image's place is the ring's cell, which only moves when the trigger is
    // a node this module has not painted yet.
    if (last === undefined) placeImage(trigger)
    trigger.style.backgroundImage = contextPieImage(percent, tone, rest)
  }
  meter.toggleAttribute(METER_PIE_ATTR, true)
}

/**
 * Give the host's ring back: take the mark and the image off, so the host's own
 * circle paints again.
 *
 * @param meter - the host's meter root.
 */
export function releaseContextPie(meter: HTMLElement) {
  if (!meter.hasAttribute(METER_PIE_ATTR)) return
  meter.removeAttribute(METER_PIE_ATTR)
  const trigger = meter.querySelector('button')
  if (!(trigger instanceof HTMLElement)) return
  painted.delete(trigger)
  trigger.style.removeProperty('background-image')
  trigger.style.removeProperty('background-repeat')
  trigger.style.removeProperty('background-size')
  trigger.style.removeProperty('background-origin')
  trigger.style.removeProperty('background-position')
}

/**
 * Put the image on the ring's cell: the icon's box is the first cell of the
 * trigger's content box, and the pie is 2px wider, starting half that to the
 * left, so the two stay concentric on the line.
 */
function placeImage(trigger: HTMLElement) {
  trigger.style.backgroundRepeat = 'no-repeat'
  trigger.style.backgroundSize = `${PIE_SIZE}px ${PIE_SIZE}px`
  trigger.style.backgroundOrigin = 'content-box'
  trigger.style.backgroundPosition = `${-(PIE_SIZE - ICON_SIZE) / 2}px center`
}

/**
 * The two sectors of a part-way reading: the occupied one runs clockwise from
 * twelve, the rest of the plate fills the other side. The smaller share keeps the
 * box's radius and the larger steps in by half the lift at a lopsided split; the
 * pushed-out part is painted last, grey above the even split and the reading's
 * colour below it. The seam's width is shared by the split, so the edges move
 * with the reading instead of jumping as it crosses the middle.
 *
 * @param percent - the occupancy the reader sees.
 * @param tone - the occupied sector's colour.
 * @param rest - the plate's colour.
 * @returns a `background-image` value.
 */
function splitImage(percent: number, tone: string, rest: string) {
  const occupied = percent / 100 * 360
  const pull = SLICE_LIFT / 2 * Math.min(1, Math.abs(percent - EVEN_SPLIT) / LIFT_SPREAD)
  const occupiedRadius = percent <= EVEN_SPLIT ? RADIUS : RADIUS - pull
  const greyRadius = percent <= EVEN_SPLIT ? RADIUS - pull : RADIUS
  const occupiedPath = sectorPath(CENTER, CENTER, occupiedRadius, 0, occupied)
  const greyPath = sectorPath(CENTER, CENTER, greyRadius, occupied, 360)
  // The seam is one width, given up by each part in the share it holds: at
  // nothing occupied the grey gives all of it, and none of it at everything.
  const greyGap = SLICE_GAP * (100 - percent) / 100
  const occupiedGap = SLICE_GAP - greyGap
  const masks = strokeMask(GREY_MASK_ID, occupiedPath, greyGap)
    + strokeMask(COLOR_MASK_ID, greyPath, occupiedGap)
  const grey = `<path d="${greyPath}" fill="${rest}" mask="url(#${GREY_MASK_ID})"/>`
  const occupiedSurface = `<path d="${occupiedPath}" fill="${tone}" mask="url(#${COLOR_MASK_ID})"/>`
  return inlineSvg(masks + (percent <= EVEN_SPLIT ? grey + occupiedSurface : occupiedSurface + grey))
}

/**
 * The hole's mask: the plate painted white, then the sector's path stroked black,
 * which leaves it transparent. A stroke reaches half its width to either side, so
 * `2 × reach` puts a seam `reach` wide around the whole path; round joins keep it
 * one width at the apex.
 *
 * @param id - the mask's name inside the document.
 * @param path - the sector's path.
 * @param reach - how far the stroke cuts into the plate.
 * @returns the mask element as text.
 */
function strokeMask(id: string, path: string, reach: number) {
  return `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${PIE_SIZE}" height="${PIE_SIZE}">`
    + `<rect x="0" y="0" width="${PIE_SIZE}" height="${PIE_SIZE}" fill="#ffffff"/>`
    + `<path d="${path}" fill="none" stroke="#000000" stroke-width="${round2(reach * 2)}" stroke-linejoin="round"/>`
    + '</mask>'
}

/**
 * A whole disc, as two half arcs: an arc whose start and end are the same point
 * is drawn as nothing at all.
 *
 * @param cx - centre x.
 * @param cy - centre y.
 * @param radius - the disc's radius.
 * @returns a path's `d`.
 */
function discPath(cx: number, cy: number, radius: number) {
  const x = round2(cx)
  const top = round2(cy - radius)
  const bottom = round2(cy + radius)
  return `M ${x} ${top} A ${radius} ${radius} 0 1 1 ${x} ${bottom} A ${radius} ${radius} 0 1 1 ${x} ${top} Z`
}

/**
 * One sector: from its apex out to the start angle, then clockwise to the end
 * angle. Degrees run clockwise from twelve, where the host's ring starts too.
 *
 * @param cx - the apex's x.
 * @param cy - the apex's y.
 * @param radius - the sector's radius.
 * @param from - start angle, degrees.
 * @param to - end angle, degrees.
 * @returns a path's `d`.
 */
function sectorPath(cx: number, cy: number, radius: number, from: number, to: number) {
  const x = round2(cx)
  const y = round2(cy)
  const x0 = round2(cx + radius * Math.sin(rad(from)))
  const y0 = round2(cy - radius * Math.cos(rad(from)))
  const x1 = round2(cx + radius * Math.sin(rad(to)))
  const y1 = round2(cy - radius * Math.cos(rad(to)))
  // Past half a turn the arc has to take the long way round, or the renderer
  // picks the short one and the sector turns inside out.
  const largeArc = to - from > 180 ? 1 : 0
  return `M ${x} ${y} L ${x0} ${y0} A ${radius} ${radius} 0 ${largeArc} 1 ${x1} ${y1} Z`
}

/** Degrees to radians, clockwise from twelve. */
function rad(degrees: number) {
  return degrees / 360 * FULL_TURN
}

/**
 * One image document, ready to use as a `background-image`.
 *
 * @param body - the drawing's elements.
 * @returns a `url(...)` value.
 */
function inlineSvg(body: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PIE_SIZE} ${PIE_SIZE}">${body}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

/** Two decimals, for path coordinates and stroke widths. */
function round2(value: number) {
  return Math.round(value * PATH_PRECISION) / PATH_PRECISION
}
