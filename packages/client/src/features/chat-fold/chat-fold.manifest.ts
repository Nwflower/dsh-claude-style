import { CHAT_ANIMATIONS_ENHANCED } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'chatFold',
  order: 200,
  contracts: ['chat.flow', 'chat.follow-threshold', 'chat.phase', 'chat.scroller', 'chat.shimmer', 'chat.shimmer-attribute', 'chat.shimmer-legacy-attribute', 'chat.think-row', 'chat.think-running', 'fold.disclosure', 'fold.expanded', 'fold.skipped', 'fold.toggle', 'process.activity', 'process.body', 'process.expanded-mode', 'process.group'],
  pref: 'chatAnimations',
  prefValues: [CHAT_ANIMATIONS_ENHANCED],
  yieldsTo: 'dsh-chat-ux',
  stylesheets: [
    { file: 'fold.css', rank: 170 },
    { file: 'fold-motion.css', rank: 210 },
  ],
  cases: ['chat-fold', 'peer-chat-ux'],
  description: {
    zh: {
      title: '自动开合与卷帘门',
      text: '模型还在思考时思考行开着，思考停下就收回去；运行中的过程组自动展开，这一段结束再收起。读者自己按过的行或组在当时的阶段里不再被改动。点开或收起一行（工具卡片、思考行、命令卡片）以及过程组时，高度逐帧变化，下方内容被真的推开或收回；门只走读者看得见的那一段，内容再长也是同一速度，多张卡片的展开体整扇门一起走。',
    },
    en: {
      title: 'Automatic folding and the rolling door',
      text: 'A thinking row opens while the model reasons and folds back when it stops; a running process group opens and folds back once that piece of work ends. A row or group the reader pressed himself keeps what he chose for that phase. Opening or closing a row (a tool card, a thinking row, a command card) or a process group moves the height frame by frame, really pushing the content below away or pulling it back. The door only rolls the stretch the reader can see, so any length moves at the same speed, and a body holding several cards rolls as one door.',
    },
  },
} satisfies FeatureManifest
