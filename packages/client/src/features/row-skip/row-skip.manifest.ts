import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'rowSkip',
  order: 257,
  contracts: ['chat.user-row', 'chat.process-answer', 'chat.node-key', 'chat.group-part', 'chat.streaming'],
  ungated: '离屏的对话行按它上一次真实排版的高度跳过排版，切换回同一个会话时不会因估算高度跳位；它是长会话的性能基础，不交给读者开关',
  stylesheets: [{ file: 'row-skip.css', rank: 55 }],
  cases: [],
} satisfies FeatureManifest
