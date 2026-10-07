import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'permissions',
  order: 60,
  contracts: ['composer.access-trigger'],
  pref: 'permissionsControl',
  stylesheets: [{ file: 'permissions.css', rank: 230 }],
  switchRow: {
    tab: 'composer',
    rank: 50,
    title: { key: 'permissionsTitle', fallback: 'Redraw the permission control' },
    desc: { key: 'permissionsDesc', fallback: 'Replace the composer\'s permission menu with a segmented control and move the session numbers into the context popover. Off restores the host\'s permission menu and statistics dialogs.' },
  },
  cases: ['permissions', 'automode', 'automode-current', 'automode-hero', 'automode-roundtrip', 'no-auto-review', 'sync-fault', 'switches'],
  description: {
    zh: {
      title: '权限控件',
      text: '输入区的权限菜单换成一排分段按钮，档位以宿主的目录为准，别的插件加的档位也在里面；新会话页上显示新会话会用的那一档。',
    },
    en: {
      title: 'Permission control',
      text: 'The composer\'s permission menu becomes a row of segments. The presets are the host\'s own catalog, a plugin\'s preset included; the new-conversation page shows the one a new session will start in.',
    },
  },
} satisfies FeatureManifest
