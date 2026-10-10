import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'chatWait',
  order: 205,
  contracts: ['chat.running', 'chat.running-text', 'conversation.session', 'conversation.session-attribute'],
  pref: 'chatAnimations',
  yieldsTo: 'dsh-chat-ux',
  stylesheets: [{ file: 'chat-wait.css', rank: 175 }],
  cases: ['chat-wait'],
  description: {
    zh: {
      title: '模型正在做什么的那一行',
      text: '轮次进行中，对话末尾那一行不再是固定的「深度求索中，用时 N 秒 ···」，而是写出这一轮此刻在做的事：「正在思考」「正在准备工具调用」「正在调用工具」「正在写回答」，后面跟着这一轮已用的时间（用宿主自己的单位）。说法换掉时旧的向上淡出、新的从下方升起（约 0.15 秒，来自 transitions.dev 的「Text states swap」）；读不出状态时（模型还没写出任何内容、也没有工具在跑）回到宿主自己的「深度求索中」；模型连续 10 秒没有开口时，计时后面多一枚「暂未响应」。这一行带扫光，宿主的小鲸鱼与读屏播报照旧；「动画」设为「减弱」时说法直接换掉，不做上面那三段。',
    },
    en: {
      title: 'The line saying what the model is doing',
      text: 'While a turn runs, the line at the end of the conversation is no longer a fixed "Deep diving for N s ···": it names what that turn is doing now — "Thinking…", "Preparing a tool call…", "Running tools…", "Writing…" — with the time the turn has taken beside it in the host\'s own units. A wording that changes runs transitions.dev\'s "Text states swap": the old one blurs and fades upward, the new one rises from below (about 0.15 s). Where no state can be read (the model has written nothing and no tool is running) it falls back to the host\'s own "Deep diving", and once the model has been silent for ten seconds "No response yet" appears beside the clock. The line sweeps, and the host\'s whale and its screen-reader announcement stay; with Animation set to Reduced the wording is written at once, with none of those three phases.',
    },
  },
} satisfies FeatureManifest
