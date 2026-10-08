import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'turnNav',
  order: 180,
  load: 'deferred',
  contracts: ['boot.peer-sheet', 'chat.scroller', 'chat.turn-attribute', 'conversation.session', 'conversation.session-attribute', 'shell.foreground', 'turn.rail', 'turn.rail-current', 'turn.rail-inset', 'turn.rail-mark', 'turn.rail-pitch', 'turn.rail-scroller'],
  pref: 'turnNav',
  stylesheets: [{ file: 'turn-nav.css', rank: 150 }],
  switchRow: {
    tab: 'conversation',
    rank: 20,
    title: { key: 'turnNavTitle', fallback: 'Conversation navigator' },
    desc: { key: 'turnNavDesc', fallback: 'Rest the pointer on the turn marks at the conversation\'s right edge and they open into a list of every turn, one line each with the message that started it; the wheel scrolls the list and a click jumps to that turn. Alt+↑ and Alt+↓ jump to the previous or the next turn, and the turn you land on is marked with a short line. Off restores the host\'s turn marks.' },
  },
  cases: ['turn-nav'],
  description: {
    zh: {
      title: '对话导航',
      text: '对话区右侧那列短横线每一轮一条，跟着你读到的位置走。鼠标碰到它，它就展开成一张列表：每一行写着开启这一轮的那条消息，正好落在它那条短横线原来的位置上——你正在读的那一轮还在原处，鼠标下面还是刚才那一轮；滚轮上下翻，点一行页面滑到那一轮，还没加载的早期对话先加载再跳；指针停在列表上时，对话区顶部的对话 / 轨迹标签照常显示。Alt+↑ / Alt+↓ 跳到上一轮或下一轮，连按会一轮一轮接着走；输入框里有草稿时这两个键留给输入框。跳到的那一轮开头会闪一条短横线。同时装着 [dsh-plugin-msg-nav](https://github.com/SherUnlocked-4869/dsh-plugin-msg-nav) 时，Alt+↑ / Alt+↓ 留给它。',
    },
    en: {
      title: 'Conversation navigator',
      text: 'The column of short marks at the conversation\'s right edge holds one per turn and follows where you are reading. Reach it with the pointer and it opens into a list: each row carries the message that started its turn and sits exactly where that turn\'s mark was — the turn you are reading stays in place, and the turn under the pointer is still under it. The wheel scrolls the list and a click glides the page to the turn, loading earlier history first when it is not loaded yet; the Chat / Trajectory tabs at the top of the conversation stay up while the pointer is on the list. Alt+↑ / Alt+↓ jump to the previous or the next turn, and held or repeated they keep stepping; while the composer holds a draft the keys stay with it. The turn you land on flashes a short line over its start. With [dsh-plugin-msg-nav](https://github.com/SherUnlocked-4869/dsh-plugin-msg-nav) installed too, Alt+↑ / Alt+↓ stay with that plugin.',
    },
  },
} satisfies FeatureManifest
