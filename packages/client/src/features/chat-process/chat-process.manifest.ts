import { CHAT_ANIMATIONS_REDRAW } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'chatProcess',
  order: 235,
  load: 'deferred',
  contracts: ['chat.call', 'chat.compaction-kind', 'chat.compaction-manual-kind', 'chat.flow', 'chat.flow-block', 'chat.follow-threshold', 'chat.group-part', 'chat.group-part-response', 'chat.phase', 'chat.running', 'chat.scroller', 'chat.think-row', 'chat.turn-attribute', 'fold.disclosure', 'fold.expanded', 'process.activity', 'process.body', 'process.content', 'process.group', 'process.member', 'turn.process'],
  pref: 'chatAnimations',
  prefValues: [CHAT_ANIMATIONS_REDRAW],
  yieldsTo: 'dsh-chat-ux',
  stylesheets: [{ file: 'process-lane.css', rank: 225 }],
  cases: ['chat-process'],
  description: {
    zh: {
      title: '过程按段折叠',
      text: '一轮里的思考、工具调用与过程记录按正式输出分段：模型每写完一段正式输出，这段输出之前的过程就收进它自己的摘要行，行上带着这一段的数量（思考×N · 工具×M · 记录×K），数字随内容增长跳变；摘要行停在对话顶部，读者滚动时它自己让位。还在写的那一段保持展开，思维行随文字流入自动滑动跟随，上下还有文字时两端渐隐；正文按到达节奏逐块淡入；这一档的跟随用指数逼近把读者带到新内容。轮次结束后整轮按读者选的工作步骤展示收进「已完成，用时」这一行，再点开可以整列重读。收拢和展开都走一段设计好的时序（收缩、计数、停顿、展开），读者自己按过的分组与他打开过的段保持他选的样子。',
    },
    en: {
      title: 'Process folds by segment',
      text: 'A turn\'s thinking, tool calls and process records fold by formal output: each time the model finishes one formal output, the process before it folds into its own summary row carrying that segment\'s figures (N thoughts · M tools · K records), the numbers jumping as the work grows, and the row rides the top of the conversation so the way back in stays in view. The segment still being written stays open: a thinking row glides after its text as it streams with the text on either side fading at the edges, the answer fades in block by block at the pace it arrives, and this tier\'s own follow walks the reader to new content instead of jumping. When the turn ends the whole process folds into the "worked for" row according to the reader\'s own work-details setting, and opens again to read whole. Folding and unfolding run a designed sequence — shrink, count, pause, reveal — and a group the reader pressed himself, or a segment he opened, keeps what he chose.',
    },
  },
} satisfies FeatureManifest
