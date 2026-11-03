import * as React from 'react'
import type { SettingsTabId } from '../../core/feature'

/**
 * One mark per settings tab, drawn on the same 24-grid as the rest of the
 * skin's glyphs: line drawings that take the tab's own colour through
 * `currentColor`, so the open tab's mark follows its label into the ink colour
 * while the others stay secondary.
 *
 * The vocabulary is this strip's own — a slider bank, a contrast disc, a
 * window, a panel and a wave — one per tab, reused by no other page.
 */
function shape(tag: 'path' | 'rect' | 'circle', props: Record<string, string | number>): React.ReactElement {
  return React.createElement(tag, { key: `${tag}-${String(props.d ?? props.r ?? props.x)}`, ...props })
}

const GLYPHS: Record<SettingsTabId, React.ReactElement[]> = {
  // 通用: two sliders, each with its knob.
  general: [
    shape('path', { d: 'M4 8h6M14 8h6M12 5.4v5.2M4 16h16M8 13.4v5.2' }),
  ],
  // 外观: a disc whose left half is drawn out — the page's colours, picked.
  appearance: [
    shape('circle', { cx: 12, cy: 12, r: 7.4 }),
    shape('path', { d: 'M12 4.6a7.4 7.4 0 0 1 0 14.8' }),
  ],
  // 主窗口: a window with its bar.
  'main-window': [
    shape('rect', { x: 3.2, y: 4.8, width: 17.6, height: 14.4, rx: 3 }),
    shape('path', { d: 'M3.2 9.4h17.6M6.6 7.1h.01M9.4 7.1h.01' }),
  ],
  // 侧栏: a panel with its divider.
  sidebar: [
    shape('rect', { x: 3.2, y: 4.8, width: 17.6, height: 14.4, rx: 3 }),
    shape('path', { d: 'M9.8 4.8v14.4' }),
  ],
  // 动效: one wave, the strip's own motion mark.
  motion: [
    shape('path', { d: 'M3.4 13.4c2.1-5 3.5-5 5.7 0s3.6 5 5.7 0 3.6-5 5.8 0' }),
  ],
}

/**
 * The mark one tab wears in the strip: an SVG that inherits the button's
 * colour and sits on its text line (settings.css sets the size).
 */
export function settingsTabIcon(id: SettingsTabId): React.ReactElement {
  return React.createElement(
    'svg',
    {
      className: 'dsh-claude-settings-tab-icon',
      viewBox: '0 0 24 24',
      'aria-hidden': true,
      focusable: false,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.9,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
    GLYPHS[id],
  )
}
