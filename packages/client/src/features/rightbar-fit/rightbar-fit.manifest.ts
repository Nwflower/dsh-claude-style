import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'rightbarFit',
  order: 256,
  contracts: ['shell.rightbar-column', 'shell.rightbar-panel', 'shell.rightbar-handle'],
  ungated: '把宿主右栏的面板宽度与拖拽手柄换算回页面自己的像素；页面在 1 倍时不写任何东西',
  stylesheets: [],
  cases: [],
  scenarios: ['rightbar'],
} satisfies FeatureManifest
