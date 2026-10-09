import { CHAT_ANIMATIONS_ENHANCED, CHAT_ANIMATIONS_OFF, CHAT_ANIMATIONS_REDRAW } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'chatFollow',
  order: 190,
  reads: ['chatFold'],
  contracts: ['chat.call', 'chat.flow', 'chat.flow-block', 'chat.following-tail', 'chat.following-tail-attribute', 'chat.phase', 'chat.scroller', 'chat.shimmer', 'chat.streaming', 'chat.think-row', 'chat.think-running', 'composer.seat', 'process.body', 'process.content', 'process.expanded-mode'],
  pref: 'chatAnimations',
  prefValues: [CHAT_ANIMATIONS_ENHANCED],
  yieldsTo: 'dsh-chat-ux',
  stylesheets: [{ file: 'chat-follow.css', rank: 160 }],
  switchRow: {
    tab: 'conversation',
    rank: 30,
    title: { key: 'chatAnimationsTitle', fallback: 'Chat-area animations' },
    desc: { key: 'chatAnimationsDesc', fallback: 'The conversation area\'s motion, chosen here: the follow, the automatic folding with its rolling door, the text fade, the file change rows and the send flight. Off leaves the conversation to the host\'s own behaviour; Enhanced plays this plugin\'s set; Redraw hands the area to a second set — the send flight and the process fold, which gathers a turn\'s thinking, tool calls and process records into one summary row per formal output, each row carrying that segment\'s figures and jumping as the work grows. With Animation set to Reduced every set stands still.' },
    choices: [
      { value: CHAT_ANIMATIONS_OFF, label: { key: 'chatAnimationsOff', fallback: 'Off' } },
      { value: CHAT_ANIMATIONS_ENHANCED, label: { key: 'chatAnimationsEnhanced', fallback: 'Enhanced' } },
      { value: CHAT_ANIMATIONS_REDRAW, label: { key: 'chatAnimationsRedraw', fallback: 'Redraw' } },
    ],
  },
  cases: ['chat-follow'],
  description: {
    zh: {
      title: '聊天区跟随',
      text: '思考行收起、工具调用行出现这些结构时刻，贴着底部的读者被交还给系统自己的跟随，内容成片到达时不再停在离底部几十像素的地方；「标准」与「简洁」档里封顶的过程组（思考与工具输出收在一个带滚动条的组体里）同样补到底部。补到底部走的是曲线：零散到达的字收得住尾巴，成片涌进的文字以一段稳速滑过去，再落到末尾。流式输出期间主滚动条的新内容也沿这条曲线推进，不再一帧写到底；输出很快时最新几行会短暂拖在屏幕下缘之外，流一停就滑到位。你自己发出的消息不走这条曲线：宿主把它滚进视野的那一下照旧一步到位。读者自己滚动离开底部之后，插件不再插手，直到他自己回到底部。',
    },
    en: {
      title: 'Chat-area follow',
      text: 'At the structural moments — a thinking row folding, a tool call row arriving — a reader sitting at the bottom is handed back to the host\'s own follow, instead of being left tens of pixels short by the burst of content; a process group capped in the Standard and Compact tiers (thinking and tool output kept in one scrolling body) is caught up the same way. Catching up runs on a curve: a trickle of characters settles softly and a burst glides at one steady speed before landing. While content streams, the main scroller\'s own follow is walked along that curve too rather than written to the end in a single frame — with a fast stream the newest lines trail just below the fold and slide into place once it stops. A message you send does not go through it: the host\'s scroll to bring it into view lands at once. Once the reader scrolls away from the bottom himself, the plugin stays out of it until he returns.',
    },
  },
} satisfies FeatureManifest
