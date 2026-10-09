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
      text: '「重绘」档换上插件自己的会话视图，直接占据宿主「对话」视图的位置。轮次进行中，新出现的一段思考把同一条链上此前的步骤收成一行（思考×N · 输出×M · 工具×K · 记录×J），数字随内容跳变，用户插话重新开一条链；这一行的收拢范围按宿主「工作步骤展示」的当前档位分岔：「简洁」收整条链，「标准」收最后一段思考之前的全部步骤，「详细」把结尾的中间输出留成自己的一行、收它之前的步骤，「完全展开」同「详细」并把折叠里的思考画成整张推理卡片（工具仍由读者自己按开）。收拢走一段设计好的时序（收缩、计数、停顿、展开）。轮次成功结束后过程与中间叙述收起、只留最终回答，失败、中断与等待批准的轮次保持展开；读者选中文字期间推迟折叠，历史轮次随时可以重新展开。思考在卡片里按阅读节奏滑动跟随，收进折叠的思考每段只占一行（「思考 · 内容」，带思考卡片的边框）、文字两态都可点（收起时点开、展开时点收），正文由宿主的 Markdown 渲染、新出现的词逐个淡入；工具行写出目标、改动行数与慢调用的计时，展开后是宿主自己的工具详情、输入与原始记录。轮次进行中的每一种状态都由最新一条消息下面同一行说出，模型还没开口时这一行计时等待。',
    },
    en: {
      title: 'Reading view',
      text: 'The redraw tier swaps in the plugin\'s own conversation view, in the place of the host\'s Chat view itself. While a turn runs, a new thought folds the steps before it in the same chain into one row (Thinking×N · Output×M · Tools×K · Records×J) whose figures roll as the work grows, and a message from the reader starts a new chain; what that row gathers follows the host\'s Work details setting — Compact takes the whole chain, Standard everything before the last thought, Detailed keeps the trailing intermediate output as its own row and gathers what came before, and Verbose matches Detailed while drawing a folded thought as its whole reasoning card (tools stay opened by the reader alone). Each fold runs a designed sequence — shrink, count, pause, reveal. Once a turn completes, its process and interim narration fold away and the final answer stays; a failed, stopped or waiting turn stays open, a text selection holds the fold, and any past turn opens again. Thinking glides inside its card at reading pace and a thought inside a fold takes one framed line ("Thinking · …") whose text toggles in both directions, the answer is the host\'s own Markdown with each new word fading in, and a tool row names its target, the lines it changed and how long a slow call has run, opening onto the host\'s own tool view, its input and the raw record. Every live state of a running turn is said by one line under the newest message, which times the wait while the model has not answered yet.',
    },
  },
} satisfies FeatureManifest
