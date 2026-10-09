/**
 * The redraw tier's reading view (packages/client/src/features/chat-reader/):
 * what it registers with the host's slots and what it hands back. The view
 * itself renders on the real host (the end-to-end lane's reader scenario);
 * here the stand-in registry shows the view shadowing Chat, the official
 * seats it mirrors, the host's own Chat tab marked in a strip of the host's
 * shape, the yield to dsh-better-display's reader and the teardown when the
 * tier leaves.
 */
(function () {
  var probe = window.__dshSmokeProbe
  var sleep = probe.sleep
  var r = probe.report

  probe.step(async function () {
    await probe.onlyFor(['chat-reader'], async function () {
      var slots = window.__readerSlots
      var READER_PRIORITY = -1
      var viewEntry = function () {
        return slots.entries('conversation.view').filter(function (entry) { return entry.options.id === 'chat' && entry.options.priority === READER_PRIORITY })[0]
      }
      var keysOf = function (seat) {
        return slots.entriesOfSlot(seat).map(function (entry) { return entry.options.key })
      }
      var ours = function () {
        return (viewEntry() === undefined ? 0 : 1) + keysOf('dsh-claude-reader.official.tools/tool.call.toolview').length
      }
      /** A strip of the host's shape, one tab per label; the marks the view wrote on it after a pass. */
      var strip = null
      var showStrip = async function (labels) {
        if (strip !== null) strip.remove()
        strip = document.createElement('div')
        strip.setAttribute('role', 'tablist')
        strip.setAttribute('data-conversation-tabs', '')
        labels.forEach(function (label) {
          var tab = document.createElement('button')
          tab.setAttribute('role', 'tab')
          tab.textContent = label
          strip.appendChild(tab)
        })
        document.body.appendChild(strip)
        await sleep(120)
        return {
          hidden: Array.prototype.map.call(strip.children, function (tab, index) { return tab.hasAttribute('data-dsh-claude-reader-shadowed-tab') ? index : -1 }).filter(function (index) { return index >= 0 }),
          lone: strip.hasAttribute('data-dsh-claude-reader-lone-tab'),
        }
      }
      // The reader asked for the redraw tier; the view installs with its chunk.
      window.__pushForm({ chatAnimations: 'redraw' })
      await sleep(700)
      var entry = viewEntry()
      var rendering = slots.entriesOfSlot('conversation.view').filter(function (item) { return item.options.id === 'chat' })[0]
      r.reader = {
        expectedSeats: [
          'dsh-claude-reader.official.actions/conversation.chat.assistant-actions',
          'dsh-claude-reader.official.tools/tool.call.toolview',
          'dsh-claude-reader.official.tail/conversation.chat.turnTail',
          'dsh-claude-reader.official.nodes/conversation.chat.node',
          'dsh-claude-reader.official.images/conversation.message.images',
        ],
        view: entry === undefined ? null : {
          order: entry.options.order,
          locale: entry.locale,
          label: entry.options.label,
          children: Object.keys(entry.children || {}),
        },
        renders: rendering !== undefined && rendering === entry,
      }
      if (entry !== undefined) {
        var injected = entry.inject('session-1')
        var chat = window.__readerChatInjected
        r.reader.reused = injected.openFile === chat.openFile && injected.forkAt === chat.forkAt
          && injected.loadOlder === chat.loadOlder && injected.loadImage === chat.loadImage
          && injected.fileMentions === chat.fileMentions && injected.openSkill === chat.openSkill
      }
      r.reader.mirrored = {
        tools: keysOf('dsh-claude-reader.official.tools/tool.call.toolview'),
        nodes: keysOf('dsh-claude-reader.official.nodes/conversation.chat.node'),
      }
      // The host lists both Chat registrations; with the trajectory view registered, the developer tools decide whether it is listed.
      r.reader.tabs = { chatOnly: await showStrip(['Chat', 'Chat']) }
      var stopTrajectory = slots.register({ name: 'conversation.view', id: 'trajectory', order: 10, label: 'Trajectory' }, function TrajectoryView() {})
      r.reader.tabs.developer = await showStrip(['Chat', 'Chat', 'Trajectory'])
      r.reader.tabs.developerOff = await showStrip(['Chat', 'Chat'])
      stopTrajectory()
      // At boot Chat can register after the reader's feature: the view waits for it.
      window.__readerStopChat()
      await sleep(50)
      r.reader.withoutChat = viewEntry() === undefined ? 0 : 1
      r.reader.tabs.withoutChat = await showStrip(['Chat'])
      window.__readerStopChat = window.__readerRegisterChat()
      await sleep(50)
      r.reader.withChat = viewEntry() === undefined ? 0 : 1
      // dsh-better-display's reader arrives in the same list, then leaves.
      var stopPeer = slots.register({ name: 'conversation.view', id: 'reader', order: -5 }, function PeerReader() {})
      await sleep(50)
      r.reader.peerYield = ours()
      stopPeer()
      await sleep(50)
      r.reader.peerBack = viewEntry() === undefined ? 0 : 1
      await showStrip(['Chat', 'Chat'])
      // Leaving the tier takes everything down, the tab marks included.
      window.__pushForm({ chatAnimations: 'enhanced' })
      await sleep(400)
      r.reader.offEntries = ours()
      r.reader.offMarks = document.querySelectorAll('[data-dsh-claude-reader-shadowed-tab], [data-dsh-claude-reader-lone-tab]').length
      strip.remove()
    })
  })
})()
