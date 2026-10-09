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
  host.slotRegistry = CASE === 'chat-reader' ? readerRegistry() : slotRegistry

  /**
   * The reader case's registry: the conversation view list with the host's own
   * Chat entry (its injected callbacks are markers the probe compares), the
   * official families with an entry each the mirror must copy or leave out,
   * and the public faces the view composes with — a slot's spec, its entries in
   * priority order, the entry that renders in each cell and a subscription.
   * As in ui-slots, the lowest priority in a cell renders and shadows the rest.
   */
  function readerRegistry() {
    var entries = []
    var listeners = {}
    var specs = {
      'conversation.view': { kind: 'list', scope: 'session' },
      'conversation.chat.assistant-actions': { kind: 'list', scope: 'session' },
      'tool.call.toolview': { kind: 'keyed', scope: 'session' },
      'conversation.chat.turnTail': { kind: 'list', scope: 'session' },
      'conversation.chat.node': { kind: 'keyed', scope: 'session' },
      'conversation.message.images': { kind: 'single', scope: 'session' },
    }
    var notify = function (key) {
      var list = (listeners[key] || []).slice()
      for (var i = 0; i < list.length; i++) list[i]()
    }
    var chatInjected = {
      openFile: function () {},
      openSkill: function () {},
      loadOlder: function () {},
      loadImage: function () {},
      forkAt: function () {},
      fileMentions: function () {},
    }
    window.__readerChatInjected = chatInjected
    var priorityOf = function (entry) { return entry.options.priority === undefined ? 0 : entry.options.priority }
    var orderOf = function (entry) { return entry.options.order === undefined ? 0 : entry.options.order }
    var registry = {
      spec: function (key) {
        if (specs[key] !== undefined) return specs[key]
        // A child seat is declared by the entry that lists it in its children.
        for (var i = 0; i < entries.length; i++) {
          var children = entries[i].children
          if (children !== undefined && children[key] !== undefined) return children[key]
        }
        return undefined
      },
      entries: function (key) {
        return entries.filter(function (entry) { return entry.name === key }).sort(function (a, b) {
          return priorityOf(a) - priorityOf(b) || orderOf(a) - orderOf(b)
        })
      },
      entriesOfSlot: function (key) {
        var kind = registry.spec(key) === undefined ? undefined : registry.spec(key).kind
        var seen = []
        return registry.entries(key).filter(function (entry) {
          var cell = kind === 'keyed' ? entry.options.key : kind === 'list' ? entry.options.id : ''
          if (seen.indexOf(cell) >= 0) return false
          seen.push(cell)
          return true
        })
      },
      subscribe: function (key, listener) {
        listeners[key] = (listeners[key] || []).concat([listener])
        return function () { listeners[key] = (listeners[key] || []).filter(function (other) { return other !== listener }) }
      },
      inject: function (key, callback) {
        return registry.spec(key) === undefined ? function () {} : callback()
      },
      register: function (spec, component) {
        var entry = {
          name: spec.name,
          options: { key: spec.key, id: spec.id, order: spec.order, label: spec.label, priority: spec.priority },
          inject: spec.inject,
          children: spec.children,
          store: spec.store,
          locale: spec.locale,
          registrant: spec.registrant,
          component: component,
        }
        entries.push(entry)
        notify(spec.name)
        var live = true
        return function () {
          if (!live) return
          live = false
          var at = entries.indexOf(entry)
          if (at >= 0) entries.splice(at, 1)
          notify(spec.name)
        }
      },
    }
    window.__readerRegisterChat = function () {
      return registry.register({ name: 'conversation.view', id: 'chat', order: 0, label: 'Chat', inject: function () { return chatInjected } }, function ChatView() {})
    }
    window.__readerStopChat = window.__readerRegisterChat()
    registry.register({ name: 'tool.call.toolview', key: 'bash' }, function BashView() {})
    registry.register({ name: 'conversation.chat.node', key: 'user' }, function UserRow() {})
    registry.register({ name: 'conversation.chat.node', key: 'context' }, function ContextRow() {})
    window.__readerSlots = registry
    return registry
  }
})()
