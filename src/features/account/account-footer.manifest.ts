import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'footer',
  order: 120,
  pref: 'collapseFooter',
  stylesheets: [
    { file: 'account-footer.css', rank: 240 },
    { file: 'footer-takeover.css', rank: 290 },
  ],
  switchRow: {
    tab: 'sidebar',
    rank: 10,
    title: { key: 'collapseTitle', fallback: 'Collapse the sidebar settings area' },
    desc: { key: 'collapseDesc', fallback: 'Fold the sidebar footer\'s settings entry into the account popover. Off restores the host\'s footer.' },
  },
  cases: ['account', 'desktop', 'markup', 'install-fault'],
  description: {
    zh: {
      title: '侧栏账号区',
      text: '侧栏底部的设置入口收进账号弹层：弹层里是账号头部、其他插件的页脚条目与设置行；桌面端直接用宿主自己的账号菜单。',
    },
    en: {
      title: 'Sidebar account area',
      text: 'The sidebar footer\'s settings entry folds into the account popover, which carries the account header, other plugins\' footer entries and the settings row; on the desktop the host\'s own account menu is used.',
    },
  },
} satisfies FeatureManifest
