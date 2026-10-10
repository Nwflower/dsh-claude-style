/**
 * The studio case needs the slot registry: the home panel is an entry in the
 * dock list seat (a list seat, so it carries an id), and the registration is the
 * whole wiring — the seat's own rendering is the host's. The component is kept
 * so the probe can render it the way the seat would. The settings case declares
 * the settings dialog's section slot and the plugin page's config slot instead,
 * so the probe can render the page. The peer case declares those two plus the
 * tool seat, so the probe can see both the page it greys out and the seat keys
 * the file rows must leave alone. The chunk-late case declares the settings
 * seats too: a settings section installed after its generation ended would
 * register there.
 */
(function () {
  var host = window.__dshSmokeHost
  var CASE = host.CASE

  var slotRegistry = CASE === 'studio' || CASE === 'settings' || CASE === 'chunk-late' || CASE === 'chat-files' || CASE === 'peer-chat-ux' || CASE === 'skin-center-handoff' || CASE === 'skin-center-arrival' ? {
    inject: function (key, callback) {
      var declared = CASE === 'studio'
        ? key === 'conversation.input.dock'
        : CASE === 'chat-files'
          ? key === 'tool.call.toolview'
          : CASE === 'skin-center-handoff' || CASE === 'skin-center-arrival'
            ? key === 'settings.section' || key === 'plugins.bundle.config'
          : CASE === 'peer-chat-ux'
            ? key === 'tool.call.toolview' || key === 'settings.section' || key === 'plugins.bundle.config'
            : key === 'settings.section' || key === 'plugins.bundle.config'
      return declared ? callback() : function () {}
    },
    register: function (spec, component) {
      window.__slots = window.__slots || []
      var entry = { key: spec.name, id: spec.id, seat: spec.key, priority: spec.priority, order: spec.order, component: typeof component }
      window.__slots.push(entry)
      window.__slotComponents = window.__slotComponents || {}
      window.__slotComponents[spec.id === undefined ? spec.key : spec.id] = component
      // The host hands back a disposer and the skin calls it when a feature
      // comes down: the list is live, so a case can tell "registered" from
      // "handed back".
      var live = true
      return function () {
        if (!live) return
        live = false
        var at = window.__slots.indexOf(entry)
        if (at >= 0) window.__slots.splice(at, 1)
      }
    },
    // The host lists a slot's entries in render order (ui-slots' registry),
    // each with the options it was registered under.
    entries: function (key) {
      var out = []
      var all = window.__slots || []
      for (var i = 0; i < all.length; i++) {
        if (all[i].key !== key) continue
        out.push({ options: { id: all[i].id, order: all[i].order } })
      }
      return out
    },
  } : undefined
  host.slotRegistry = slotRegistry
})()
