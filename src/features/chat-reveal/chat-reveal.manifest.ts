import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'chatReveal',
  order: 210,
  pref: 'chatAnimations',
  yieldsTo: 'dsh-chat-ux',
  stylesheets: [{ file: 'reveal-rules.css', rank: 180 }],
  cases: ['chat-reveal'],
  description: {
    zh: {
      title: '新文字淡入',
      text: '流式回答里新出现的字符先淡后实（约 0.12 秒），并按到达次序略作错开；整段一次到达的内容、几千字的突发与刚被折叠重排过的文字保持本色。',
    },
    en: {
      title: 'New text fades in',
      text: 'Characters arriving in a streaming answer start faint and settle over about 0.12 s, staggered slightly by arrival order; a block arriving whole, a burst of thousands of characters and text that just reflowed from a fold stay solid.',
    },
  },
} satisfies FeatureManifest
