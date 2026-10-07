import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'mascot',
  order: 40,
  contracts: ['chat.think-running', 'composer.fallback-panel', 'composer.seat', 'composer.stack', 'conversation.session', 'conversation.session-attribute'],
  pref: 'mascot',
  stylesheets: [
    { file: 'crab.css', rank: 350 },
    { file: 'whale.css', rank: 360 },
  ],
  cases: ['crab-states', 'deepy', 'hero', 'studio'],
  description: {
    zh: {
      title: '吉祥物',
      text: '输入框上沿站着一只像素小伙伴，随智能体的工作状态换动画（思考、写回答与调用工具、多个会话同时工作、子代理、等你操作、压缩上下文、完成、失败、睡着）。「跟随品牌」在 Claude 品牌下是像素螃蟹，在 DeepSeek 品牌下是小鲸鱼 Deepy，也可以固定选一个或者关闭；「出现位置」决定它只在新会话页出现，还是新会话页和对话页都出现。',
    },
    en: {
      title: 'Mascot',
      text: 'A pixel companion stands on the composer\'s top edge and changes its animation with what the agent is doing (thinking, writing and calling tools, several sessions at work, subagents, waiting on you, compacting the context, finished, failed, asleep). Follow the brand shows the pixel crab under Claude and Deepy the whale under DeepSeek; either can be picked for good, or none. Where it appears keeps it to the new-conversation page, or puts it in conversations as well.',
    },
  },
} satisfies FeatureManifest
