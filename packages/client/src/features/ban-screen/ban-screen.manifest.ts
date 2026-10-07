import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'ban',
  order: 130,
  contracts: ['api.window-controls', 'shell.fullscreen', 'shell.platform', 'shell.top-clearance', 'shell.windows-titlebar'],
  ungated: '彩蛋页只在点击账号行时出现',
  stylesheets: [{ file: 'ban-screen.css', rank: 250 }],
  cases: ['desktop'],
  description: {
    zh: {
      title: '封号彩蛋',
      text: '点账号弹层顶上的账号行，会打开一张仿 Claude「账号已暂停」的整页彩蛋；页上的每个按钮和 Esc 都把它关掉，什么都不会真的发生。语言在设置页「通用」里选。',
    },
    en: {
      title: 'Account-hold easter egg',
      text: 'The account row at the top of the account popover opens a full-page replica of Claude\'s account-hold page. Every control on it, and Esc, closes it, and nothing it names actually happens. Its language is chosen on the General tab.',
    },
  },
} satisfies FeatureManifest
