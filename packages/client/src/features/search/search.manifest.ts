import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'search',
  order: 160,
  load: 'deferred',
  contracts: ['shell.sidebar-search'],
  pref: 'sidebarSearch',
  stylesheets: [{ file: 'search.css', rank: 130 }],
  switchRow: {
    tab: 'sidebar',
    rank: 20,
    title: { key: 'searchTitle', fallback: 'Sidebar search' },
    desc: { key: 'searchDesc', fallback: 'A search box in the sidebar that finds sessions, projects, plugins, Skills and shortcuts. Off restores the host\'s brand row.' },
  },
  cases: ['search', 'switches'],
  description: {
    zh: {
      title: '侧栏搜索',
      text: '侧栏里有一个搜索框，打开的面板能找会话（标题与内容）、项目、插件、Skill 与快捷键，用宿主自己的对话框与导航；点开一条内容命中会落到那条消息所在的一轮，而不只是会话开头。「搜索框样式」选它的位置：覆盖品牌（默认）把它放在品牌行、指针移到侧栏时盖过品牌，独立在品牌行下方给它自己一行并一直显示，图标则保留宿主自己的搜索按钮、只把单击接管过来。',
    },
    en: {
      title: 'Sidebar search',
      text: 'A search box in the sidebar opens a palette that finds sessions (titles and content), projects, plugins, Skills and shortcuts, through the host\'s own dialog and navigation; picking a content hit lands on the turn holding that message rather than at the top of the session. Search box style places it: Cover the brand (the default) keeps it in the brand row, standing over the brand while the pointer is over the sidebar; Standalone gives it a row of its own under the brand row, shown always; Icon leaves the host\'s own search button in place and takes only its click over.',
    },
  },
} satisfies FeatureManifest
