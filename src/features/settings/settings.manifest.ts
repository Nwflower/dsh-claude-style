import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'settings',
  handle: 'settingsNav',
  order: 260,
  ungated: '设置页本身',
  stylesheets: [{ file: 'settings.css', rank: 310 }],
  cases: ['settings', 'late-forms'],
  description: {
    zh: {
      title: '设置页',
      text: '设置页同时出现在设置对话框（「Claude Style」标签页）与插件页，分为通用、外观、输入区、侧栏、对话五个分页；每一项接管宿主界面的功能都有自己的开关，关闭后宿主原来的界面原样回来，不需要刷新页面。',
    },
    en: {
      title: 'Settings page',
      text: 'The settings page appears both in the settings dialog (the "Claude Style" tab) and on the plugin page, in five tabs: General, Appearance, Composer, Sidebar and Conversation. Every feature that takes over part of the host\'s interface has its own switch; turning it off brings the host\'s original back at once, without a reload.',
    },
  },
} satisfies FeatureManifest
