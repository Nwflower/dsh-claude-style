import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'headerBand',
  order: 255,
  contracts: [
    'api.window-controls', 'shell.fullscreen', 'shell.platform', 'shell.top-clearance', 'shell.windows-titlebar', 'shell.windows-menu',
    'header.row', 'header.title', 'header.utilities', 'header.corner', 'header.element', 'header.view-tabs',
  ],
  pref: 'headerBand',
  stylesheets: [{ file: 'header-band.css', rank: 75 }],
  switchRow: {
    tab: 'conversation',
    rank: 60,
    title: { key: 'headerBandTitle', fallback: 'Header in the title bar' },
    desc: { key: 'headerBandDesc', fallback: 'Lift the conversation\'s title and its header controls into the desktop title bar when they fit, and let the rest of the title row close up to the left. Off leaves the header as the host draws it.' },
  },
  cases: ['header-band', 'switches'],
  description: {
    zh: {
      title: '会话标题进入顶栏',
      text: '桌面端把会话标题与顶栏一行的控件抬进系统标题栏：放得下时标题靠左、控件靠右，放不下的一侧留在原来的行里，标题行的其余内容顺势左移。',
    },
    en: {
      title: 'Header in the title bar',
      text: 'On the desktop the session title and the header\'s controls rise into the window\'s own caption row: whichever side fits is placed there — the title at the left, the controls at the right — and the rest of the title row closes up to the left.',
    },
  },
} satisfies FeatureManifest
