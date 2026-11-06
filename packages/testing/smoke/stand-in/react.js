/**
 * The host's React, as far as the skin uses it: elements are inert unless the
 * probe renders a registered component, ui-primitives are inert element
 * stand-ins, each react-dom root records what it was asked to do, and the module
 * loader hands the bundle all three.
 */
(function () {
  // Elements are inert unless the probe renders a registered component: then
  // function components run eagerly into a plain tree, and "states" stands in
  // for a click that moved a state off its initial value.
  var react = {
    rendering: false,
    states: null,
    createElement: function (type, props) {
      // As React does, children passed as arguments replace props.children; with none passed, props.children stands.
      var children = arguments.length > 2 ? Array.prototype.slice.call(arguments, 2)
        : props && props.children !== undefined ? props.children : []
      var merged = Object.assign({}, props, { children: children })
      // A component runs while the probe renders one; outside that the element
      // stands as the tree a root is asked to mount (the skin's tooltip
      // anchors), which render lays out without running the component.
      if (typeof type === 'function' && react.rendering === false) return { type: type, props: merged }
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
    // The file-change row reads its file's other rows through a registry the
    // probe never fills: one read of the snapshot is what a page that does not
    // re-render would do, so the row draws its own call alone.
    useSyncExternalStore: function (subscribe, getSnapshot) { return getSnapshot() },
  }
  window.__react = react
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
    // The file row's own share (features/chat-files/): the disclosure row, the
    // shimmer, the diff card, the read card and the icons are the host's
    // primitives, and the totals helper counts one added and one removed line per
    // hunk.
    DisclosureRow: primitive('DisclosureRow'),
    TextShimmer: primitive('TextShimmer'),
    DiffBlock: primitive('DiffBlock'),
    ReadBlock: primitive('ReadBlock'),
    IconEditOutlineRegular: primitive('IconEditOutlineRegular'),
    IconBrowseOutlineRegular: primitive('IconBrowseOutlineRegular'),
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
  // the probe can follow a root the skin mounts on a seat of its own. A tree
  // the skin hands a root that stands in the page — a tooltip's anchor, the
  // way shared/host-tooltip.ts wears one — is laid into the mount the way the
  // host's own React lays it: the host components of the tree stand as
  // elements and take their refs, and the components the stand-in does not run
  // stand as the wrappers they are, their children laid where the host puts
  // them. The lay waits for the task to end, because the skin seats the mount
  // in the page after handing the root its first tree; a mount the skin keeps
  // to itself (a portal's own box) is left as it stands.
  window.__roots = []
  /** One piece of a tree the skin handed a root, laid into `into`. */
  function lay(into, tree) {
    if (tree === null || tree === undefined) return
    if (typeof tree === 'string' || typeof tree === 'number') {
      into.appendChild(document.createTextNode(String(tree)))
      return
    }
    if (typeof tree !== 'object') return
    if (Array.isArray(tree)) {
      for (var at = 0; at < tree.length; at += 1) lay(into, tree[at])
      return
    }
    var props = tree.props || {}
    if (typeof tree.type !== 'string') {
      // A host primitive: the stand-in does not run it, and its own children
      // are what the page shows.
      lay(into, props.children)
      return
    }
    var node = document.createElement(tree.type)
    if (typeof props.className === 'string') node.className = props.className
    if (props.style !== null && typeof props.style === 'object') Object.assign(node.style, props.style)
    into.appendChild(node)
    lay(node, props.children)
    if (typeof props.ref === 'function') props.ref(node)
  }
  var reactDom = {
    createRoot: function (element) {
      var root = {
        element: element,
        renders: 0,
        unmounted: false,
        tree: null,
        render: function (tree) {
          root.renders += 1
          root.tree = tree
          queueMicrotask(function () {
            if (root.element.isConnected === false) return
            while (root.element.firstChild !== null) root.element.removeChild(root.element.firstChild)
            lay(root.element, root.tree)
          })
        },
        unmount: function () { root.unmounted = true },
      }
      window.__roots.push(root)
      return root
    },
  }
  window.__ModuleLoader__ = {
    load: function (def) {
      window.__skin = def.factory(function (name) {
        if (name === 'react') return react
        if (name === 'react-dom/client') return reactDom
        if (name === '@deepseek-ai/dsh-client-ui-primitives') return primitives
        throw new Error('no module ' + name)
      })
    },
  }
})()
