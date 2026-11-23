import * as React from 'react'

const h = React.createElement

/**
 * The marks the skin's panel rows lead with (D110): one set, drawn by the skin so
 * every one of its rows carries the same ink and weight in the host panel's 16px
 * icon column.
 *
 * Every mark stands on a 16-unit grid drawn at 16px, so one unit is one pixel and
 * the stroke is 1.25px wherever a mark appears; the figure fills 1.5–14.5 of the
 * box, the optical size Claude's rail gives its marks. Caps and joins are round.
 * A meaning has one figure: a preset is not a file, and a picture is not a sheet.
 */
const MARK_SIZE = 16
const STROKE = 1.25

type Shape = ['path', { d: string }] | ['circle', { cx: number, cy: number, r: number }] | ['rect', { x: number, y: number, width: number, height: number, rx: number }]

function draw(shapes: readonly Shape[], size = MARK_SIZE) {
  return h('svg', {
    width: size, height: size, viewBox: `0 0 ${size} ${size}`, fill: 'none',
    stroke: 'currentColor', strokeWidth: STROKE, strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': true, focusable: false,
  }, shapes.map(([tag, props], index) => h(tag, { key: index, ...props })))
}

/** The machine the session runs on: a screen over its base. */
export function ComputerMark() {
  return draw([['rect', { x: 2.5, y: 2.5, width: 11, height: 8, rx: 1.5 }], ['path', { d: 'M1 13.5h14' }]])
}

/** The session's preset: two sliders, the settings it runs with. */
export function PresetMark() {
  return draw([['path', { d: 'M1.5 4.5h7M12 4.5h2.5M10.25 2.5v4M1.5 11.5H4M7.5 11.5h7M5.75 9.5v4' }]])
}

/** A file's sheet with its folded corner. */
export function SheetMark() {
  return draw([['path', { d: 'M9.5 1.5H4A1.5 1.5 0 0 0 2.5 3v10A1.5 1.5 0 0 0 4 14.5h8a1.5 1.5 0 0 0 1.5-1.5V5.5zM9.5 1.5v4h4' }]])
}

/** An image: a frame, a sun and the ground it holds. */
export function PictureMark() {
  return draw([
    ['rect', { x: 1.5, y: 2.5, width: 13, height: 11, rx: 1.5 }], ['circle', { cx: 5.5, cy: 6, r: 1.25 }],
    ['path', { d: 'M2 12l3.5-3.5 3 3 2-2 3.5 3.5' }],
  ])
}
