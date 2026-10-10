/**
 * The chat-files case: the two keyed seats claimed from the tool view slot, and
 * one row rendered from a call's own arguments — collapsed, expanded, failed, a
 * running write and one whose escalation pair is incomplete — then the switch
 * that hands the keys back and the other plugin arriving.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    // The ported file-change row (packages/client/src/features/chat-files/): the two keyed seats
    // are claimed from the tool view slot, and one row renders its collapsed tail
    // and its expanded card from the call's own arguments and metadata.
    await probe.onlyFor(['chat-files'], async function () {
      var slotEntries = (window.__slots || []).filter(function (entry) { return entry.key === 'tool.call.toolview' })
      var fileRow = (window.__slotComponents || {}).edit
      var t = function (key) { return 't:' + key }
      var walkTree = function (node, visit) {
        if (typeof node === 'string' || typeof node === 'number') { visit({ type: '#text', props: { children: String(node) } }); return }
        if (node === null || node === undefined || typeof node !== 'object') return
        if (Array.isArray(node)) { node.forEach(function (child) { walkTree(child, visit) }); return }
        visit(node)
        walkTree(node.props && node.props.children, visit)
        // The disclosure row hands its collapsed half to the primitive as a prop,
        // and the stand-in's primitive does not render it: the probe walks it here.
        walkTree(node.props && node.props.collapsedContent, visit)
      }
      var renderRow = function (toolName, block, options) {
        var state = { expanded: !!(options && options.expanded) }
        var react = window.__react
        react.rendering = true
        var tree
        try {
          tree = fileRow({
            t: t,
            toolName: toolName,
            block: block,
            cwd: 'C:\\work',
            home: 'C:\\Users\\dev',
            openFile: function () { window.__fileRowOpened = (window.__fileRowOpened || 0) + 1 },
            inspect: options && options.inspect ? function () {} : undefined,
            useDisclosure: function () { return { expanded: state.expanded, toggle: function () {} } },
          })
        } finally {
          react.rendering = false
        }
        var out = { classes: [], texts: [], root: null, diff: null, io: null, hidden: null, hiddenText: null }
        walkTree(tree, function (node) {
          var props = node.props || {}
          if (typeof props.className === 'string') {
            out.classes.push(props.className)
            if (props.className.indexOf('dsh-claude-file-root') >= 0) {
              out.root = { variant: props['data-variant'], tool: props['data-tool'], state: props['data-state'] }
            }
            if (props.className.indexOf('dsh-claude-file-summary') >= 0 || props.className.indexOf('dsh-claude-file-link') >= 0) out.summary = props.className
            if (props.className.indexOf('dsh-claude-file-diff') >= 0) out.diff = props
            if (props.className.indexOf('dsh-claude-file-io ') >= 0 || props.className === 'dsh-claude-file-io') out.io = props
            if (props.className.indexOf('dsh-claude-file-hidden') >= 0) {
              out.hidden = props
              out.hiddenText = Array.isArray(props.children) ? props.children[0] : props.children
            }
          }
          if (node.type === 'DisclosureRow') out.disclosure = props
          if (node.type === 'DiffBlock') out.diff = props
          if (node.type === '#text') out.texts.push(String(props.children))
        })
        return out
      }
      var argsRaw = JSON.stringify({ file_path: 'C:\\work\\app.js', old_string: 'const a = 1', new_string: 'const a = 2' })
      var settled = {
        kind: 'tool-result', callId: 'c1',
        call: { name: 'edit', argsRaw: argsRaw },
        content: [{ type: 'text', text: 'ok' }],
        isError: false,
        meta: { diffs: [{ path: 'C:\\work\\app.js', oldText: 'const a = 1', newText: 'const a = 2' }] },
      }
      r.files = { seats: slotEntries }
      r.files.collapsed = renderRow('edit', settled, {})
      r.files.expanded = renderRow('edit', settled, { expanded: true, inspect: true })
      // A failure: no diff, the summary holds the verdict, and the path link gives way.
      var failed = {
        kind: 'tool-result', callId: 'c2',
        call: { name: 'edit', argsRaw: argsRaw },
        content: [],
        isError: true,
        error: { name: 'ToolError', code: 'permission_denied' },
        meta: { diffs: [] },
      }
      r.files.failed = renderRow('edit', failed, { expanded: true })
      // A write whose escalation pair is incomplete: the host falls back to the IN/OUT card.
      var write = {
        phase: 'start', callId: 'c3', name: 'write',
        argsRaw: JSON.stringify({ file_path: 'C:\\work\\note.md', content: 'hello\nworld', sandbox_permissions: 'workspace-write', justification: 'x' }),
      }
      r.files.running = renderRow('write', write, { expanded: true })
      var escalated = {
        phase: 'start', callId: 'c4', name: 'write',
        argsRaw: JSON.stringify({ file_path: 'C:\\work\\note.md', content: 'hello', justification: 'why' }),
      }
      r.files.escalated = renderRow('write', escalated, { expanded: true })
      // The switch comes down whole: this feature takes the host's two seat keys
      // over, and a key cannot be handed back by reading a preference, so off
      // has to unregister them (D29/D32).
      window.__pushForm({ chatAnimations: false })
      await sleep(150)
      r.files.offSeats = (window.__slots || []).filter(function (entry) { return entry.key === 'tool.call.toolview' }).length
      window.__pushForm({ chatAnimations: true })
      await sleep(150)
      r.files.backSeats = (window.__slots || []).filter(function (entry) { return entry.key === 'tool.call.toolview' }).length
      // The other chat-behaviour plugin arriving and leaving while the page
      // runs: the presence watch re-takes the decision, so the chat-area features
      // stand down (here: the seat keys and the install-time marks) and come
      // back without a reload (packages/client/src/shared/peer-plugin.ts).
      var fileSeats = function () {
        return (window.__slots || []).filter(function (entry) { return entry.key === 'tool.call.toolview' }).length
      }
      var filePeerStyle = document.createElement('style')
      filePeerStyle.id = 'dsh-chat-ux-style'
      document.head.appendChild(filePeerStyle)
      await sleep(250)
      r.files.peerOn = {
        seats: fileSeats(),
        foldMark: document.body.hasAttribute('data-dsh-claude-chat-fold'),
        revealMark: document.body.hasAttribute('data-dsh-claude-chat-reveal'),
      }
      filePeerStyle.remove()
      await sleep(250)
      r.files.peerOff = { seats: fileSeats(), foldMark: document.body.hasAttribute('data-dsh-claude-chat-fold') }
    })
  })
})()
