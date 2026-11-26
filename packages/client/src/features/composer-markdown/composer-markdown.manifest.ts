import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'composerMarkdown',
  order: 22,
  // KaTeX and the Markdown parser ride this feature's own chunk: the draft is
  // plain text until it arrives (D76).
  load: 'deferred',
  contracts: ['composer.card', 'composer.input', 'composer.composing', 'composer.line-text', 'composer.text-ref', 'chat.math'],
  ungated: '输入框草稿的 Markdown 与公式在原位显示渲染结果，光标所在的块显示源码；草稿文本与宿主的编辑行为不变（D115）',
  stylesheets: [{ file: 'composer-markdown.css', rank: 103 }],
  cases: ['composer', 'late-forms'],
  scenarios: ['composerLive'],
} satisfies FeatureManifest
