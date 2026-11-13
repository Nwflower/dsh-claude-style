/**
 * The sidebar plugin's pin list on the search page: the face its registration
 * injects (`hooks.entryPins` and `setPinned`), with the list in memory the way
 * the host keeps it. The stored preference starts with the search entry taken
 * off, so the skin has something to replay. A spec drives the list through
 * `window.__sidebarPins`: `setPinned` is the sidebar's own button, `reload`
 * is the sidebar plugin loading again with an empty list.
 */
(function () {
  var host = window.__dshSmokeHost
  if (host.CASE !== 'search') return
  var SEARCH = 'dsh-claude-style.search'
  host.formValue.sidebarHidden = [SEARCH]
  var unpinned = []
  var listeners = []
  var store = null
  function makeStore() {
    return {
      getSnapshot: function () { return unpinned },
      subscribe: function (listener) {
        listeners.push(listener)
        return function () { listeners = listeners.filter(function (entry) { return entry !== listener }) }
      },
    }
  }
  store = makeStore()
  function setPinned(id, pinned) {
    var next = pinned ? unpinned.filter(function (entry) { return entry !== id }) : unpinned.concat(unpinned.indexOf(id) < 0 ? [id] : [])
    if (next.length === unpinned.length) return
    unpinned = next
    var current = listeners.slice()
    for (var i = 0; i < current.length; i++) current[i]()
  }
  window.__sidebarPins = {
    searchId: SEARCH,
    /** What the skin asked the host to pin or unpin, as `[id, pinned]`. */
    calls: [],
    unpinned: function () { return unpinned.slice() },
    setPinned: setPinned,
    reload: function () {
      unpinned = []
      listeners = []
      store = makeStore()
      // The sidebar plugin drawing again is the page-wide pass the skin notices its new list on.
      var wake = document.createElement('i')
      document.body.appendChild(wake)
      wake.remove()
    },
  }
  host.sidebarEntry = {
    options: {},
    inject: function () {
      return {
        hooks: { entryPins: store },
        setPinned: function (id, pinned) {
          window.__sidebarPins.calls.push([id, pinned])
          setPinned(id, pinned)
        },
      }
    },
  }
})()
