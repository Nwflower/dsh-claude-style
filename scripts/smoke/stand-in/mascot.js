/**
 * The deepy and crab-states cases: the session the mascot follows, as the host's
 * services describe it — the session status (uiSession), the session list with
 * its subagent catalog, the chat snapshot's open turn and the session's event
 * feed. The probe drives all four through __deepy.
 */
(function () {
  var host = window.__dshSmokeHost
  var CASE = host.CASE

  var deepy = CASE === 'deepy' || CASE === 'crab-states' ? (function () {
    var statusListeners = []
    var feedListeners = []
    var status = new Map()
    var chatListeners = []
    var list = { ids: ['smoke-deepy'], byId: { 'smoke-deepy': { id: 'smoke-deepy', running: false } }, projectionsBySession: {} }
    // The feed's window, as the host's MutableSessionEventSource publishes it:
    // every entry so far, a revision per change, and the change itself.
    var feedEntries = []
    var feed = { entries: feedEntries, revision: 0, change: { kind: 'replace', entries: feedEntries } }
    function publishFeed(change) {
      feed = { entries: feedEntries, revision: feed.revision + 1, change: change }
      notify(feedListeners)
    }
    var snapshot = { timeline: { turnOrder: [], turns: new Map() }, legacy: { runningCalls: [] } }
    function notify(listeners) { listeners.slice().forEach(function (listener) { listener() }) }
    function subscribe(listeners) {
      return function (listener) {
        listeners.push(listener)
        return function () {
          var at = listeners.indexOf(listener)
          if (at !== -1) listeners.splice(at, 1)
        }
      }
    }
    window.__deepy = {
      /** One session's status entry; the whole map is replaced, as the host's is. */
      setStatus: function (id, entry) {
        status = new Map(status)
        status.set(id, Object.assign({ running: false, pendingInteraction: undefined, completionUnread: false }, entry))
        notify(statusListeners)
      },
      /** The open turn: `newest` is its streaming step's newest block kind, or null for a closed turn. */
      setTurn: function (newest) {
        var steps = newest === undefined ? [] : [{ step: 1, data: { get: function (kind) {
          return kind === 'assistant-step' ? { status: 'running', step: 1, blocks: newest === 'none' ? [] : [{ kind: newest }] } : undefined
        } } }]
        var turn = { turn: 1, status: newest === null ? 'closed' : 'open', steps: newest === null ? [] : steps }
        snapshot = { timeline: { turnOrder: [1], turns: new Map([[1, turn]]) }, legacy: { runningCalls: [] } }
        notify(chatListeners)
      },
      /** Whether anything subscribed to the chat target, the subscription that activates it on the host. */
      chatFollowed: function () { return chatListeners.length > 0 },
      /** More top-level sessions, for the working tiers. */
      addSessions: function (ids) {
        list = { ids: list.ids.concat(ids), byId: Object.assign({}, list.byId), projectionsBySession: list.projectionsBySession }
        ids.forEach(function (id) { list.byId[id] = { id: id, running: false } })
      },
      setSubagents: function (children) {
        list = {
          ids: list.ids,
          byId: Object.assign({}, list.byId),
          projectionsBySession: { 'smoke-deepy': { values: { subagentCatalog: children.map(function (id) { return { id: id } }) } } },
        }
        children.forEach(function (id) { list.byId[id] = { id: id, origin: 'subagent', running: false } })
      },
      /** Append one live event to the session's feed. */
      emit: function (event) {
        var entries = [{ type: 'event', event: event }]
        feedEntries = feedEntries.concat(entries)
        publishFeed({ kind: 'append', entries: entries })
      },
      /**
       * A reconnect: the feed sends its window again whole, with `events` the
       * connection missed at its end.
       */
      resend: function (events) {
        feedEntries = feedEntries.concat(events.map(function (event) { return { type: 'event', event: event } }))
        publishFeed({ kind: 'replace', entries: feedEntries })
      },
    }
    var eventSource = { getSnapshot: function () { return feed }, subscribe: subscribe(feedListeners) }
    var chatTarget = { getSnapshot: function () { return snapshot }, subscribe: subscribe(chatListeners) }
    return {
      sessions: {
        list: { getSnapshot: function () { return list } },
        binding: function (id) { return id === 'smoke-deepy' ? { sessionId: id, eventSource: eventSource } : undefined },
      },
      uiSession: { sessionStatus: { getSnapshot: function () { return status }, subscribe: subscribe(statusListeners) } },
      conversation: {
        binding: function () { return { target: function () { return chatTarget } } },
      },
    }
  })() : undefined
  host.deepy = deepy
})()
