/**
 * The host's `chat` locale namespace, the one its own pills read: the skin's
 * context-popover block takes its labels and its duration / token templates from
 * here, so the fixture carries the same keys the host registers. Served only to
 * the cases whose wording is asserted.
 */
(function () {
  var host = window.__dshSmokeHost
  var CASE = host.CASE
  var turnFixtureCase = host.turnFixtureCase

  var chatTemplates = {
    'duration.compactSeconds': '{seconds}s',
    'duration.compactMinutes': '{minutes}m{seconds}s',
    'number.groupSeparator': ',',
    'message.tokensPerSecond': '{tps} tok/s',
    'message.turnUsage.count': '{count} tok',
    'message.turnUsage.cacheHit': 'Cache hit',
    'message.turnUsage.input': 'Uncached input',
    'message.turnUsage.cacheRead': 'Cached input',
    'message.turnUsage.cacheWrite': 'Cache write',
    'message.turnUsage.output': 'Output',
    'stats.dialog.title': 'Session statistics',
    'stats.dialog.usageTitle': 'Token usage',
    'stats.dialog.llmTime': 'LLM time',
    'stats.dialog.toolTime': 'Tool call time',
    'stats.dialog.ttft': 'Avg time to first token (TTFT)',
    'stats.dialog.speed': 'Tokens per second (TPS)',
    'chat.turnNavigation.jump': 'Jump to turn {turn}',
    'chat.turnNavigation.turn': 'Turn {turn}',
  }
  /** The two cases that drive the skin's session-statistics block (detailed and compact rows). */
  var statsFixtureCase = CASE === 'context-stats' || CASE === 'stats-compact'
  var localeFixture = turnFixtureCase || statsFixtureCase || CASE === 'turn-nav' ? {
    getSnapshot: function () { return { active: 'en' } },
    subscribe: function () { return function () {} },
    bind: function () {
      var templates = Object.assign({
        'duration.seconds': '{seconds}s',
        'duration.minutes': '{minutes}m {seconds}s',
        'duration.hours': '{hours}h {minutes}m {seconds}s',
        'message.stopped': 'Stopped',
        'message.turnProcess.failed': 'Failed',
      }, chatTemplates)
      return function (key, params) {
        var template = templates[key] || key
        if (params === undefined) return template
        return template.replace(/\{(\w+)\}/g, function (match, name) { return String(params[name]) })
      }
    },
  } : undefined
  var turnStatusLocale = localeFixture
  host.statsFixtureCase = statsFixtureCase
  host.turnStatusLocale = turnStatusLocale
})()
