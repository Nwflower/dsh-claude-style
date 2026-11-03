import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'rowSkip',
  order: 257,
  contracts: ['chat.user-row', 'chat.process-answer'],
  ungated: '离屏的对话行只在按真实尺寸排过一次版之后才跳过排版，读者滚动时不会因估算高度跳位；它是长会话的性能基础，不交给读者开关',
  stylesheets: [{ file: 'row-skip.css', rank: 55 }],
  cases: [],
} satisfies FeatureManifest
