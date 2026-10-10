import { STATS_POSITION_CONTEXT, STATS_POSITION_INLINE } from '../../constants'
import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'contextStats',
  order: 70,
  load: 'deferred',
  contracts: ['composer.dialog-trigger', 'composer.meter-fill', 'composer.stat', 'composer.stats'],
  pref: 'statsPosition',
  // Both positions are this feature's: the line of its own is what the inline
  // one adds, since the panel the meter owns carries the rows either way.
  prefValues: [STATS_POSITION_INLINE, STATS_POSITION_CONTEXT],
  stylesheets: [],
  switchRow: {
    tab: 'conversation',
    rank: 35,
    title: { key: 'statsPositionTitle', fallback: 'Conversation statistics position' },
    desc: { key: 'statsPositionDesc', fallback: 'Choose where the conversation statistics show.' },
    choices: [
      { value: STATS_POSITION_INLINE, label: { key: 'statsPositionInline', fallback: 'On its own line' } },
      { value: STATS_POSITION_CONTEXT, label: { key: 'statsPositionContext', fallback: 'Inside the context popover' } },
    ],
  },
  cases: ['context-stats', 'stats-compact', 'stats-inline'],
  description: {
    zh: {
      title: '会话数字',
      text: '会话统计与 Token 用量随宿主的数据实时更新，在输入卡片下面单独占一行：轮数与步数、输出速度、读入与写回的 tokens、缓存命中率，末尾就是上下文圆环自己；这一行不只是读数——按一下它，圆环那张弹层就打开，里面照旧是宿主自己的上下文行加上这一段会话的数字明细，再按一下收起（悬停开合只归那个圆环）；也可以选「收进上下文」，把数字只留在那张弹层里。数字一有变化就逐个字符重新入场（末两位稍慢），各段之间没有分隔符号、只靠间距分开，缓存命中率与圆环占用按各自的无极色阶取色。',
    },
    en: {
      title: 'Session numbers',
      text: 'The session statistics and the token usage follow the host\'s data live, on a line of their own below the input card — turns and steps, the output speed, the tokens read in and written back, the cache-hit share, with the context ring itself at the end. The line is not only a reading: pressing it opens that ring\'s popover, which still holds the host\'s own context rows followed by this session\'s detail rows, and pressing it again puts them away (opening and closing on hover stays the ring\'s own path); Inside the context popover keeps the numbers there alone. A number that moves re-enters character by character (the last two a beat behind), no separator glyph stands between the groups — the line\'s own gap is what sets them apart — and the cache share and the ring\'s occupancy each take their own colour band.',
    },
  },
} satisfies FeatureManifest
