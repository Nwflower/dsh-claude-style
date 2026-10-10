/**
 * The host's locale namespaces, the ones the skin's own controls read: `chat`
 * for the pills, the session numbers and the turn navigation, and
 * `permission.access` for the tier names a Chinese interface shows. Served only
 * to the cases whose wording is asserted.
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
  /** The host's permission tier names, as its own dictionary carries them. */
  var permissionAccess = {
    'preset.readOnly': '仅可查看',
    'preset.workspaceWrite': '工作区内修改',
    'preset.fullAccess': '完全权限',
    'auto.label': 'Auto review',
  }
  /** The two cases that drive the skin's session-statistics block (detailed and compact rows). */
  var statsFixtureCase = CASE === 'context-stats' || CASE === 'stats-compact'
  /** The case that switches the interface language while the page runs. */
  var localeSwitchCase = CASE === 'permissions-locale'
  var localeServed = turnFixtureCase || statsFixtureCase || CASE === 'turn-nav' || localeSwitchCase
  /** The active locale id; the language cases start in the language they assert. */
  var active = localeSwitchCase ? 'zh' : 'en'
  var listeners = []
  // The switch a probe drives: the host emits on an active-locale change, which
  // is what the skin's scheduler rebuilds its copy-carrying rows from.
  host.setSmokeLocale = function (id) {
    active = id
    for (var i = 0; i < listeners.length; i++) listeners[i]()
  }
  var localeService = localeServed ? {
    getSnapshot: function () { return { active: active } },
    subscribe: function (listener) {
      listeners.push(listener)
      return function () {
        var at = listeners.indexOf(listener)
        if (at >= 0) listeners.splice(at, 1)
      }
    },
    bind: function (namespace) {
      if (namespace === 'permission.access') {
        return function (key) { return permissionAccess[key] === undefined ? key : permissionAccess[key] }
      }
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
  host.statsFixtureCase = statsFixtureCase
  host.localeService = localeService
})()
