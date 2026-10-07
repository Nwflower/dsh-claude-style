/**
 * The served-namespace directory. The late-forms case starts empty and gains the
 * namespace after apply, the way a cold page sees the host's wire read answer
 * after this plugin has already installed.
 */
(function () {
  var host = window.__dshSmokeHost
  var CASE = host.CASE
  var form = host.form

  var formsView = { namespaces: CASE === 'late-forms' ? [] : [{ ns: 'ui-skin-claude-style' }] }
  var formsListeners = []
  var forms = {
    get: function () { return form },
    describe: function () {
      return {
        getSnapshot: function () { return { view: formsView } },
        subscribe: function (listener) {
          formsListeners.push(listener)
          return function () {
            var at = formsListeners.indexOf(listener)
            if (at !== -1) formsListeners.splice(at, 1)
          }
        },
        ensure: function () { return Promise.resolve() },
      }
    },
  }
  window.__serveNamespace = function () {
    formsView = { namespaces: [{ ns: 'ui-skin-claude-style' }] }
    for (var fi = 0; fi < formsListeners.length; fi++) formsListeners[fi]()
  }
  host.forms = forms
})()
