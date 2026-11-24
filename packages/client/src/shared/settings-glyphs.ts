import * as React from 'react'

/** Shared 16px stroke glyphs drawn across settings cards, lockups and modal managers. */
const GLYPHS = {
  check: 'M3.5 8.5l3 3 6-7',
  close: 'M4 4l8 8M12 4l-8 8',
  pencil: 'M11.1 2.9l2 2-7.4 7.4-2.6.6.6-2.6 7.4-7.4Z',
  plus: 'M8 3.5v9M3.5 8h9',
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
