/** Localized weekday names, indexed by Date#getDay() (0 = Sunday). */
export const WEEKDAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const WEEKDAY_NAMES_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

interface GreetingSlot {
  from: number
  to: number
  en: readonly string[]
  zh: readonly string[]
}

/**
 * Rotating welcomes for the Chat home layout. Each time-of-day slot has its own
 * pool (night runs past midnight as 22..29), combined with any-hour lines.
 * `{name}` is the user's display name, `{weekday}` today's weekday, `{brand}`
 * the active brand name (`Claude` or `DeepSeek`).
 */
export const HERO_GREETING_SLOTS: readonly GreetingSlot[] = [
  {
    from: 5,
    to: 12,
    en: [
      'Good morning, {name}!',
      'Happy {weekday}, {name}.',
      'What are you working on?',
      'Morning, {name}. What’s first?',
      'Fresh start, {name}?',
    ],
    zh: [
      '早上好，{name}！',
      '{weekday}愉快，{name}。',
      '今天准备做点什么？',
      '早安，{name}，先从哪里开始？',
      '新的一天，{name}。',
    ],
  },
  {
    from: 12,
    to: 14,
    en: [
      'What’s on the agenda today?',
      'Good afternoon, {name}.',
      'Midday check-in, {name}?',
    ],
    zh: [
      '今天有什么计划？',
      '中午好，{name}。',
      '午间进展顺利吗，{name}？',
    ],
  },
  {
    from: 14,
    to: 18,
    en: [
      'Coffee and {brand} time?',
      'Good afternoon, {name}.',
      'How’s the day going, {name}?',
      'Afternoon, {name}. What’s next?',
    ],
    zh: [
      '来杯咖啡，和 {brand} 聊聊？',
      '下午好，{name}。',
      '今天进展如何，{name}？',
      '下午好，{name}，接下来做什么？',
    ],
  },
  {
    from: 18,
    to: 22,
    en: [
      'Evening, how are things?',
      'Good evening, {name}.',
      'How was your day, {name}?',
      'Winding down, or just getting started?',
    ],
    zh: [
      '晚上好，今天过得怎么样？',
      '晚上好，{name}。',
      '今天收获如何，{name}？',
      '准备收尾，还是刚刚开始？',
    ],
  },
  {
    from: 22,
    to: 29,
    en: [
      'You are here!',
      'Hello, night owl.',
      'Burning the midnight oil, {name}?',
      'Still up, {name}?',
    ],
    zh: [
      '这么晚还在！',
      '夜深了，注意休息。',
      '还在挑灯夜战吗，{name}？',
      '还没睡吗，{name}？',
    ],
  },
]

export const HERO_GREETING_ANYTIME_EN = [
  'Back at it, {name}?',
  'Welcome back, {name}.',
  'Hey there, {name}.',
  'What shall we build?',
]

export const HERO_GREETING_ANYTIME_ZH = [
  '继续推进吗，{name}？',
  '欢迎回来，{name}。',
  '你好，{name}。',
  '今天想构建什么？',
]

function isChineseLocale(locale: string): boolean {
  return locale === 'zh' || locale.startsWith('zh-') || locale.startsWith('zh_')
}

/**
 * Pick one Chat-layout welcome from the current time slot and `draw` in [0, 1).
 */
export function pickHeroGreeting(username: string, draw: number, locale = 'en', brand = 'claude') {
  const zh = isChineseLocale(locale)
  const now = new Date()
  const hour = now.getHours()
  const clock = hour < 5 ? hour + 24 : hour
  const anytime = zh ? HERO_GREETING_ANYTIME_ZH : HERO_GREETING_ANYTIME_EN
  let lines: readonly string[] = anytime
  for (let s = 0; s < HERO_GREETING_SLOTS.length; s++) {
    const slot = HERO_GREETING_SLOTS[s]
    if (clock >= slot.from && clock < slot.to) {
      lines = (zh ? slot.zh : slot.en).concat(anytime)
    }
  }
  const line = lines[Math.min(lines.length - 1, Math.floor(draw * lines.length))]
  const fallbackName = zh ? '你好' : 'there'
  const brandLabel = brand === 'deepseek' ? 'DeepSeek' : 'Claude'
  const weekdays = zh ? WEEKDAY_NAMES_ZH : WEEKDAY_NAMES_EN
  return line
    .replace('{name}', username || fallbackName)
    .replace('{weekday}', weekdays[now.getDay()])
    .replace('{brand}', brandLabel)
}

/**
 * Fixed greeting for the Code home layout, localized to the active shell language.
 */
export function pickStudioGreeting(username: string, locale = 'en') {
  if (isChineseLocale(locale)) {
    return username ? `接下来做什么，${username}？` : '接下来做什么？'
  }
  return username ? `What's up next, ${username}?` : "What's up next?"
}
