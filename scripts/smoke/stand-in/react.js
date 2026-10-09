/**
 * The host's React, as far as the skin uses it: elements are inert unless the
 * probe renders a registered component, ui-primitives are inert element
 * stand-ins, each react-dom root records what it was asked to do, and the module
 * loader hands the bundle all of them, the JSX runtime and the client store included.
 */
(function () {
  // Elements are inert unless the probe renders a registered component: then
  // function components run eagerly into a plain tree, and "states" stands in
  // for a click that moved a state off its initial value.
  var react = {
    rendering: false,
    states: null,
    createElement: function (type, props) {
      if (!react.rendering) return null
      // As React does, children passed as arguments replace props.children; with none passed, props.children stands.
      var children = arguments.length > 2 ? Array.prototype.slice.call(arguments, 2)
        : props && props.children !== undefined ? props.children : []
      var merged = Object.assign({}, props, { children: children })
      return typeof type === 'function' ? type(merged) : { type: type, props: merged }
    },
    // The elements above are what this page hands the skin, so this is the shape
    // to recognise: React's own test is the same idea against its element symbol.
    isValidElement: function (node) {
      return node !== null && typeof node === 'object' && 'type' in node && 'props' in node
    },
    useState: function (v) {
      var states = react.states
      return [states !== null && Object.prototype.hasOwnProperty.call(states, v) ? states[v] : v, function () {}]
    },
    useEffect: function () {},
    useMemo: function (fn) { return fn() },
    useCallback: function (fn) { return fn },
    useRef: function (v) { return { current: v } },
    useLayoutEffect: function () {},
    // The reading view's share: contexts, memo and class components exist at
    // module load; rendering them is the real host's (the end-to-end lane).
    createContext: function (value) { return { Provider: function () { return null }, defaultValue: value } },
    useContext: function (context) { return context.defaultValue },
    useId: function () { return 'id' },
    useSyncExternalStore: function (subscribe, getSnapshot) { return getSnapshot() },
    memo: function (component) { return component },
    Component: function Component() {},
    Fragment: 'Fragment',
  }
  window.__react = react
  // The automatic JSX runtime the TSX modules compile to: the same inert
  // elements, with the children already inside props.
  var jsxRuntime = {
    jsx: function (type, props) { return react.createElement(type, props) },
    jsxs: function (type, props) { return react.createElement(type, props) },
    Fragment: 'Fragment',
  }
  // The host's ui-primitives, as far as the skin uses them: the components its
  // own rows and notices render (inert here, like every element above).
  var primitive = function (type) { return function (props) { return { type: type, props: props } } }
  var primitives = {
    Tooltip: primitive('Tooltip'),
    Toast: primitive('Toast'),
    Modal: primitive('Modal'),
    IconUnarchiveOutlineRegular: primitive('IconUnarchiveOutlineRegular'),
    IconTrashOutlineRegular: primitive('IconTrashOutlineRegular'),
    IconWarningOutlineRegular: primitive('IconWarningOutlineRegular'),
    // The file-change row's own share (features/chat-files/): the disclosure row,
    // the shimmer, the diff card and its two icons are the host's primitives, and
    // the totals helper counts one added and one removed line per hunk.
    DisclosureRow: primitive('DisclosureRow'),
    TextShimmer: primitive('TextShimmer'),
    DiffBlock: primitive('DiffBlock'),
    IconEditOutlineRegular: primitive('IconEditOutlineRegular'),
    IconInspectOutlineRegular: primitive('IconInspectOutlineRegular'),
    diffTotals: function (hunks) {
      var added = 0
      var removed = 0
      for (var i = 0; i < hunks.length; i += 1) {
        var before = hunks[i].oldText === null ? '' : String(hunks[i].oldText)
        var after = String(hunks[i].newText)
        if (after !== '') added += after.split('\n').length
        if (before !== '') removed += before.split('\n').length
      }
      return { added: added, removed: removed }
    },
  }
  // The host's react-dom/client. Each root records the element it was created
  // on, how many times it was asked to render and whether it was unmounted, so
  // the probe can follow a root the skin mounts on a seat of its own.
  window.__roots = []
  var reactDom = {
    createRoot: function (element) {
      var root = {
        element: element,
        renders: 0,
        unmounted: false,
        render: function () { root.renders++ },
        unmount: function () { root.unmounted = true },
      }
      window.__roots.push(root)
      return root
    },
  }
  // The host's client store, as far as the reading view uses it: one observable value.
  var clientStore = {
    createSnapshotStore: function (value) {
      var current = value
      var listeners = []
      return {
        getSnapshot: function () { return current },
        subscribe: function (listener) {
          listeners.push(listener)
          return function () { listeners = listeners.filter(function (other) { return other !== listener }) }
        },
        set: function (next) {
          current = next
          listeners.slice().forEach(function (listener) { listener() })
        },
      }
    },
  }
  window.__ModuleLoader__ = {
    load: function (def) {
      window.__skin = def.factory(function (name) {
        if (name === 'react') return react
        if (name === 'react/jsx-runtime') return jsxRuntime
        if (name === 'react-dom/client') return reactDom
        if (name === '@deepseek-ai/dsh-client-ui-primitives') return primitives
        if (name === '@deepseek-ai/dsh-client-store') return clientStore
        throw new Error('no module ' + name)
      })
    },
  }
})()
