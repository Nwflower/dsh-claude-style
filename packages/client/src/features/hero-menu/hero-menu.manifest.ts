import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'heroMenu',
  order: 100,
  reads: ['composer'],
  contracts: ['shell.menu'],
  ungated: '跟随输入框改造的首页范围',
  stylesheets: [{ file: 'hero-menu.css', rank: 280, gate: true }],
  cases: ['popovers'],
  description: {
    zh: {
      title: '新会话页的目录与预设菜单',
      text: '新会话页上目录与智能体预设的两个菜单画成皮肤的弹层卡片，停在各自的按钮上方，一次只开一张。',
    },
    en: {
      title: 'Home page directory and preset menus',
      text: 'The directory and agent-preset menus on the new-conversation page are drawn as the skin\'s popover cards, parked over their own buttons, one open at a time.',
    },
  },
} satisfies FeatureManifest
