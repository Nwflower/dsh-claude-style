/** English weekday names, indexed by Date#getDay() (0 = Sunday). */
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * The classic hero's welcomes, à la Claude Code's rotating greetings. Each
 * time-of-day slot has its own pool — the night slot runs past midnight,
 * so its hours count on from 24 — and a few lines fit any hour. `{name}`
 * is the user's name, `{weekday}` today's.
 */
export const HERO_GREETING_SLOTS = [
  { from: 5, to: 12, lines: [
    'Good morning, {name}!',
    'Happy {weekday}, {name}.',
    'What are you working on?',
    'Morning, {name}. What’s first?',
    'Fresh start, {name}?',
  ] },
  { from: 12, to: 14, lines: [
    'What’s on the agenda today?',
    'Good afternoon, {name}.',
    'Midday check-in, {name}?',
  ] },
  { from: 14, to: 18, lines: [
    'Coffee and Claude time?',
    'Good afternoon, {name}.',
    'How’s the day going, {name}?',
    'Afternoon, {name}. What’s next?',
  ] },
  { from: 18, to: 22, lines: [
    'Evening, how are things?',
    'Good evening, {name}.',
    'How was your day, {name}?',
    'Winding down, or just getting started?',
  ] },
  { from: 22, to: 29, lines: [
    'You are here!',
    'Hello, night owl.',
    'Burning the midnight oil, {name}?',
    'Still up, {name}?',
  ] },
]
export const HERO_GREETING_ANYTIME = [
  'Back at it, {name}?',
  'Welcome back, {name}.',
  'Hey there, {name}.',
  'What shall we build?',
]

/**
 * One classic hero welcome: the current slot's pool and the any-hour lines,
 * picked by `draw` in [0, 1). The caller holds the draw, so the line stays
 * put between passes and changes only when the draw or the slot does.
 */
export function pickHeroGreeting(username: string, draw: number) {
  const now = new Date()
  const hour = now.getHours()
  const clock = hour < 5 ? hour + 24 : hour
  let lines = HERO_GREETING_ANYTIME
  for (let s = 0; s < HERO_GREETING_SLOTS.length; s++) {
    const slot = HERO_GREETING_SLOTS[s]
    if (clock >= slot.from && clock < slot.to) lines = slot.lines.concat(HERO_GREETING_ANYTIME)
  }
  const line = lines[Math.min(lines.length - 1, Math.floor(draw * lines.length))]
  return line.replace('{name}', username || 'User').replace('{weekday}', WEEKDAY_NAMES[now.getDay()])
}

/**
 * The studio dashboard's greeting, à la Claude Code's desktop home: one
 * fixed line naming the signed-in user, no clock. The classic hero keeps
 * the rotating welcomes.
 */
export function pickStudioGreeting(username: string) {
  return `What's up next, ${username || 'User'}?`
}
