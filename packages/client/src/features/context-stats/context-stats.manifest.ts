import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'contextStats',
  order: 70,
  contracts: ['composer.dialog-trigger', 'composer.stat', 'composer.stats'],
  pref: 'permissionsControl',
  stylesheets: [],
  cases: ['context-stats', 'stats-compact'],
  description: {
    zh: {
      title: '会话数字',
      text: '会话统计与 Token 用量收进输入区上下文圆环的弹层里，随宿主的数据实时更新；它与权限控件共用一个开关，两者都接管输入区的底边。',
    },
    en: {
      title: 'Session numbers',
      text: 'The session statistics and the token usage move into the popover of the composer\'s context ring and follow the host\'s data live. It shares the permission control\'s switch: both take over the composer\'s bottom line.',
    },
  },
} satisfies FeatureManifest
