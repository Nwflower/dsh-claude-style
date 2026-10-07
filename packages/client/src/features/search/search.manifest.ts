import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'search',
  order: 160,
  contracts: [],
  pref: 'sidebarSearch',
  stylesheets: [{ file: 'search.css', rank: 130 }],
  switchRow: {
    tab: 'sidebar',
    rank: 20,
    title: { key: 'searchTitle', fallback: 'Sidebar search' },
    desc: { key: 'searchDesc', fallback: 'A search box in the sidebar\'s brand row that finds sessions, projects, plugins, Skills and shortcuts. Off restores the host\'s brand row.' },
  },
  cases: ['search', 'switches'],
  description: {
    zh: {
      title: '侧栏搜索',
      text: '侧栏品牌行里有一个搜索框，打开的面板能找会话（标题与内容）、项目、插件、Skill 与快捷键，用宿主自己的对话框与导航。',
    },
    en: {
      title: 'Sidebar search',
      text: 'A search box in the sidebar\'s brand row opens a palette that finds sessions (titles and content), projects, plugins, Skills and shortcuts, through the host\'s own dialog and navigation.',
    },
  },
} satisfies FeatureManifest
