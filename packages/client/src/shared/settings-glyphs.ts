import * as React from 'react'

/** Shared 16px stroke glyphs drawn across settings cards, lockups and modal managers. */
const GLYPHS = {
  arrowDown: 'M8 4.5v7M5 8.5 8 11.5l3-3',
  arrowUp: 'M8 11.5v-7M5 7.5 8 4.5l3 3',
  check: 'M3.5 8.5l3 3 6-7',
  chevronDown: 'M4.5 6.5 8 10l3.5-3.5',
  close: 'M4 4l8 8M12 4l-8 8',
  grip: 'M6 4.5h.01M10 4.5h.01M6 8h.01M10 8h.01M6 11.5h.01M10 11.5h.01',
  pencil: 'M11.1 2.9l2 2-7.4 7.4-2.6.6.6-2.6 7.4-7.4Z',
  plus: 'M8 3.5v9M3.5 8h9',
  refresh: 'M3 8a5 5 0 1 0 1.46-3.54L3 6M3 3.2V6h2.8',
  search: 'M7.2 3a4.2 4.2 0 1 0 0 8.4 4.2 4.2 0 0 0 0-8.4ZM10.3 10.3l2.7 2.7',
  undo: 'M6 3.5L3.5 6 6 8.5M3.5 6h5.75a3.25 3.25 0 010 6.5H7',
  upload: 'M8 10.6V3.4M5.1 6.3 8 3.4l2.9 2.9M3.3 10.4v1.4c0 .5.4.9.9.9h7.6c.5 0 .9-.4.9-.9v-1.4',
} as const

export type SettingsGlyphName = keyof typeof GLYPHS

export function Glyph(props: { name: SettingsGlyphName }) {
  return React.createElement(
    'svg',
    { className: 'dsh-claude-scheme-glyph', width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
    React.createElement('path', { d: GLYPHS[props.name], stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
  )
}
