import * as React from 'react'

const h = React.createElement

/**
 * The details rail's marks (D106): one set, drawn by the rail itself so every row
 * leads with the same ink and weight.
 *
 * Every mark stands on a 16-unit grid drawn at 16px, so one unit is one pixel and
 * the stroke is 1.25px wherever a mark appears; the figure fills 1.5–14.5 of the
 * box, the optical size Claude's rail gives its marks. Caps and joins are round.
 * The chevron is the one smaller mark and keeps the same pixel stroke on its own
 * 12-unit grid. A meaning has one figure: a branch is not a change request, and
 * a preset is not a subagent.
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

/** A working directory: a closed folder with its tab. */
export function FolderMark() {
  return draw([['path', { d: 'M1.5 4A1.5 1.5 0 0 1 3 2.5h3L7.5 4H13a1.5 1.5 0 0 1 1.5 1.5V12a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 12z' }]])
}

/** A checkout's branch: a trunk between two commits and the branch joining it. */
export function BranchMark() {
  return draw([
    ['circle', { cx: 4.5, cy: 3.5, r: 1.5 }], ['circle', { cx: 4.5, cy: 12.5, r: 1.5 }], ['circle', { cx: 11.5, cy: 3.5, r: 1.5 }],
    ['path', { d: 'M4.5 5v6M11.5 5v1.5A2.5 2.5 0 0 1 9 9H7a2.5 2.5 0 0 0-2.5 2.5' }],
  ])
}

/** A change request: the source branch, and the target it merges back into. */
export function PullRequestMark() {
  return draw([
    ['circle', { cx: 4.5, cy: 3.5, r: 1.5 }], ['circle', { cx: 4.5, cy: 12.5, r: 1.5 }], ['circle', { cx: 11.5, cy: 12.5, r: 1.5 }],
    ['path', { d: 'M4.5 5v6M11.5 11V6.5a2 2 0 0 0-2-2h-2M9 2.5l-2 2 2 2' }],
  ])
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

/** A command: a terminal's window and its prompt. */
export function CommandMark() {
  return draw([['rect', { x: 1.5, y: 2, width: 13, height: 12, rx: 2 }], ['path', { d: 'M4.5 6l2 2-2 2M8.5 10.5h3' }]])
}

/** A task: ticked lines of a list. */
export function ChecklistMark() {
  return draw([['path', { d: 'M1.5 4l1.25 1.25L5 3M1.5 10.5l1.25 1.25L5 9.5M7.5 4.25h7M7.5 11h7' }]])
}

/** A subagent: a diamond, and the one standing behind it. */
export function AgentMark() {
  return draw([
    ['path', { d: 'M6.5 2 11.5 8 6.5 14 1.5 8z' }],
    ['path', { d: 'M9.5 2 14.5 8 9.5 14' }],
  ])
}

/** A team: a figure with another behind it. */
export function TeamMark() {
  return draw([
    ['circle', { cx: 6, cy: 5, r: 2.5 }],
    ['path', { d: 'M1 14a5 5 0 0 1 10 0M10.5 2.7a2.5 2.5 0 0 1 0 4.6M12.5 9.3A5 5 0 0 1 15 14' }],
  ])
}

/** The settled records' disclosure: two chevrons. */
export function FinishedMark() {
  return draw([['path', { d: 'M2.5 3.5 7 8l-4.5 4.5M8.5 3.5 13 8l-4.5 4.5' }]])
}

/** The stop control's square: the set's one filled mark. */
export function StopMark() {
  return h('svg', { width: MARK_SIZE, height: MARK_SIZE, viewBox: `0 0 ${MARK_SIZE} ${MARK_SIZE}`, 'aria-hidden': true, focusable: false },
    h('rect', { x: 3.5, y: 3.5, width: 9, height: 9, rx: 2, fill: 'currentColor' }))
}

/** A section heading's disclosure chevron, on its own 12-unit grid. */
export function ChevronMark() {
  return draw([['path', { d: 'M4.5 2.5 8 6 4.5 9.5' }]], 12)
}
