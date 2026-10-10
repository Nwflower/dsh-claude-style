import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'chatFold',
  order: 200,
  contracts: ['chat.assistant-step-kind', 'chat.flow', 'chat.follow-threshold', 'chat.group-part', 'chat.group-part-reasoning', 'chat.phase', 'chat.reasoning-text', 'chat.scroller', 'chat.shimmer', 'chat.shimmer-attribute', 'chat.shimmer-legacy-attribute', 'chat.think-row', 'chat.think-running', 'chat.tool-call-kind', 'fold.disclosure', 'fold.expanded', 'fold.skipped', 'fold.toggle', 'process.activity', 'process.body', 'process.expanded-mode', 'process.group', 'process.header-label'],
  pref: 'chatAnimations',
  yieldsTo: 'dsh-chat-ux',
  stylesheets: [
    { file: 'fold.css', rank: 170 },
    { file: 'fold-motion.css', rank: 210 },
  ],
  cases: ['chat-fold', 'peer-chat-ux'],
  description: {
    zh: {
      title: '自动开合与卷帘门',
      text: '模型还在思考时思考行开着，思考停下就收回去；运行中的过程组自动展开，这一段结束再收起。读者自己按过的行或组在当时的阶段里不再被改动。开着的那段思考停在一个几行高的窗口里，上下边缘渐隐，文字每 0.84 秒往上走两行（0.5 秒滑过去），走到最新一行就停住——推理再长也不把整列对话推着往下走；推理一停，窗口撤下，读者打开这一行读到的是完整文本，「动画」为「减弱」时不设这个窗口。过程组的标题改写成这一组装了什么：「执行 2 次思考，调用 1 次工具」，没有的项不写，数字随内容增加逐位滚动，这一段还在进行时整行带着宿主那样的扫光；放不下整句时改用「思考×2 · 工具×1」，位置宽回来再换回整句，控件的可访问名字始终是整句。点开或收起一行（工具卡片、思考行、命令卡片）以及过程组时，高度逐帧变化，下方内容被真的推开或收回；门只走读者看得见的那一段，内容再长也是同一速度，多张卡片的展开体整扇门一起走。',
    },
    en: {
      title: 'Automatic folding and the rolling door',
      text: 'A thinking row opens while the model reasons and folds back when it stops; a running process group opens and folds back once that piece of work ends. A row or group the reader pressed himself keeps what he chose for that phase. The open reasoning stands in a window a few lines tall with a softened edge at each side: the text steps up two lines every 0.84 s (half a second of travel) and stops at the newest line, so a long reasoning never pushes the conversation down line by line; once the reasoning stops the window comes off and the reader who opens the row reads it whole, and with Animation set to Reduced the window is never set. A process group\'s header says what the group holds — "2 thoughts, 1 tool call", empty figures left out — each number rolling as the work grows, and the whole line sweeps the way the host\'s words do while that piece of work runs; a header without the room for the sentence falls back to `Thinking×2 · Tools×1` and takes the sentence back when the room returns, with the sentence as the control\'s name either way. Opening or closing a row (a tool card, a thinking row, a command card) or a process group moves the height frame by frame, really pushing the content below away or pulling it back. The door only rolls the stretch the reader can see, so any length moves at the same speed, and a body holding several cards rolls as one door.',
    },
  },
} satisfies FeatureManifest
