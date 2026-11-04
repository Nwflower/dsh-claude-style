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
 *
 * The effort case declares the composer's model seat (a single seat, so its
 * entries carry no id): the model seat yield spec registers a third-party
 * winner there and hands it back, the way a plugin shadows the host's own
 * seat and later leaves it.
 *
 * The switch cases carry the registry as well: the workspace feature reads the
 * host's view store from the `sidebar.workspaces` declaration and registers the
 * archived row's delete action in `sidebar.workspaces.session.row.action`.
 * The search case declares the host's panel-list seat.
 */
(function () {
  var host = window.__dshSmokeHost
  var CASE = host.CASE
  var switchCase = CASE === 'switches' || CASE === 'switches-off'

  /**
   * The host's workspace view store: the filter and grouping its own view menu
   * writes, which the skin's segment control drives. One instance for the page,
   * as the host's browser renders from the one its `create` answered.
   */
  var viewState = { groupBy: 'workspace', archivedFilter: 'default' }
  var viewStore = switchCase ? {
    getSnapshot: function () { return viewState },
    actions: {
      setArchivedFilter: function (filter) { viewState.archivedFilter = filter },
      setGroupBy: function (mode) { viewState.groupBy = mode },
    },
  } : undefined

  var slotRegistry = CASE === 'search' || CASE === 'studio' || CASE === 'effort' || CASE === 'settings' || CASE === 'chunk-late' || CASE === 'chat-files' || CASE === 'peer-chat-ux' || CASE === 'skin-center-handoff' || CASE === 'skin-center-arrival' || switchCase ? {
    inject: function (key, callback) {
      var declared = CASE === 'search'
        ? key === 'sidebar.panellist'
        : switchCase
          ? key === 'sidebar.workspaces' || key === 'sidebar.workspaces.session.row.action' || key === 'sidebar.panellist'
          : CASE === 'studio'
            ? key === 'conversation.input.dock'
            : CASE === 'effort'
              ? key === 'conversation.input.model'
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
      // The host's slots/changed wake (packages/extensions/cordis-client-runner's
      // event catalog), for the model seat alone: a registration change asks
      // listeners for a page-wide pass, which the stand-in has no event channel
      // for — a probe node under <body> asks the same pass, the way any read
      // outside the conversation column does. Other keys keep the stand-in's
      // silent answer, the way every case that never read a wake expects.
      if (spec.name === 'conversation.input.model') {
        var probe = document.createElement('i')
        document.body.appendChild(probe)
        probe.remove()
      }
      window.__slots = window.__slots || []
      var entry = { key: spec.name, id: spec.id, seat: spec.key, priority: spec.priority, order: spec.order, label: typeof spec.label === 'function' ? spec.label() : spec.label, component: typeof component }
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
        if (entry.key === 'conversation.input.model') {
          var wake = document.createElement('i')
          document.body.appendChild(wake)
          wake.remove()
        }
      }
    },
    // The host lists a slot's entries in render order (ui-slots' registry),
    // each with the options it was registered under. The workspace browser
    // declares the store it renders from instead, which is what the skin reads.
    entries: function (key) {
      if (switchCase && key === 'sidebar.workspaces') {
        return [{ store: { create: function () { return viewStore } } }]
      }
      var out = []
      var all = window.__slots || []
      for (var i = 0; i < all.length; i++) {
        if (all[i].key !== key) continue
        out.push({ options: { id: all[i].id, order: all[i].order, priority: all[i].priority } })
      }
      return out
    },
    // The winners a slot renders (ui-slots' entriesOfSlot): one per occupied
    // cell — a single seat's whole ledger is one cell, a list seat's is one
    // per id — the lowest-priority live entry of each cell, ties keeping
    // registration order.
    entriesOfSlot: function (key) {
      var all = window.__slots || []
      var names = []
      var byCell = {}
      for (var i = 0; i < all.length; i++) {
        if (all[i].key !== key) continue
        var cell = all[i].seat !== undefined ? all[i].seat : all[i].id
        var name = cell === undefined ? '' : String(cell)
        if (byCell[name] === undefined) { byCell[name] = []; names.push(name) }
        byCell[name].push(all[i])
      }
      var out = []
      for (var c = 0; c < names.length; c++) {
        var cellEntries = byCell[names[c]].slice().sort(function (a, b) { return (a.priority || 0) - (b.priority || 0) })
        var winner = cellEntries[0]
        out.push({ options: { id: winner.id, order: winner.order, priority: winner.priority } })
      }
      return out
    },
  } : undefined
  if (viewStore !== undefined) host.workspaceViewStore = viewStore
  host.slotRegistry = slotRegistry
})()
