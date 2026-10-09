import { CHAT_ANIMATIONS_REDRAW } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'chatReader',
  order: 236,
  load: 'deferred',
  contracts: ['chat.flow', 'chat.flow-block', 'chat.running', 'chat.scroller', 'chat.turn-attribute', 'chat.user-row', 'composer.echo', 'header.view-tablist'],
  pref: 'chatAnimations',
  prefValues: [CHAT_ANIMATIONS_REDRAW],
  yieldsTo: 'dsh-chat-ux',
  stylesheets: [
    { file: 'reader-process.css', rank: 226 },
    { file: 'reader-tool.css', rank: 227 },
    { file: 'reader-thought.css', rank: 228 },
    { file: 'chat-reader.css', rank: 229 },
  ],
  cases: ['chat-reader'],
  description: {
    zh: {
      title: '阅读视图',
      text: '「重绘」档换上插件自己的会话视图，直接占据宿主「对话」视图的位置。轮次进行中，新出现的一段思考把同一条链上此前的思考、正文与工具收成一行（思考×N · 输出×M · 工具×K · 记录×J），数字随内容跳变，用户插话重新开一条链；收拢走一段设计好的时序（收缩、计数、停顿、展开）。轮次成功结束后过程与中间叙述收起、只留最终回答，失败、中断与等待批准的轮次保持展开；读者选中文字期间推迟折叠，历史轮次随时可以重新展开。思考在卡片里按阅读节奏滑动跟随，正文由宿主的 Markdown 渲染、新出现的词逐个淡入；工具行写出目标、改动行数与慢调用的计时，展开后是宿主自己的工具详情、输入与原始记录。轮次进行中的每一种状态都由最新一条消息下面同一行说出，模型还没开口时这一行计时等待。',
    },
    en: {
      title: 'Reading view',
      text: 'The redraw tier swaps in the plugin\'s own conversation view, in the place of the host\'s Chat view itself. While a turn runs, a new thought folds the thinking, output and tools before it in the same chain into one row (Thinking×N · Output×M · Tools×K · Records×J) whose figures roll as the work grows, and a message from the reader starts a new chain; each fold runs a designed sequence — shrink, count, pause, reveal. Once a turn completes, its process and interim narration fold away and the final answer stays; a failed, stopped or waiting turn stays open, a text selection holds the fold, and any past turn opens again. Thinking glides inside its card at reading pace, the answer is the host\'s own Markdown with each new word fading in, and a tool row names its target, the lines it changed and how long a slow call has run, opening onto the host\'s own tool view, its input and the raw record. Every live state of a running turn is said by one line under the newest message, which times the wait while the model has not answered yet.',
    },
  },
} satisfies FeatureManifest
