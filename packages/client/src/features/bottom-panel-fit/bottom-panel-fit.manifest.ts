import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'bottomPanelFit',
  order: 261,
  contracts: ['composer.seat', 'shell.rightbar-column', 'shell.bottom-panel'],
  ungated: '把 dsh-better-sidebar 的底部面板按左右栏与输入区座位的实测边距换算回页面自己的像素；拖拽侧栏时暂停写入，页面在 1 倍时不写任何东西',
  stylesheets: [],
  cases: [],
} satisfies FeatureManifest
