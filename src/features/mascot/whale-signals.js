    /**
     * What Deepy reads off the host (src/features/mascot/whale.js): the state
     * a session — or, on the home page, the whole workspace — is in right now,
     * and the moments that end a piece of work.
     *
     * The state is read on demand from the host's own client state: the
     * session status (`uiSession.sessionStatus`: whether a session runs, and
     * the one interaction it waits on — an approval, a question, a plan
     * review), the session list (which sessions are top level, and the
     * subagents each one has started) and the chat snapshot (`uiConversation`,
     * target `chat`, subscribed while the session is followed: the open turn,
     * the step streaming in it and the tool calls still running). The moments
     * come from the followed session's event feed
     * (`sessions.binding(id).eventSource`), whose appended events arrive live
     * and in order: a turn ending, a tool result that failed, a compaction
     * starting and ending. The chat target shows an automatic compaction only
     * once it has finished, so the feed is the one place a running one shows:
     * the feed's whole window tells which compactions run when it is loaded or
     * sent again, its appended events in between. On the home page, a session
     * that finishes out of view (the host's `completionUnread`, the sidebar's
     * green dot) is the moment.
     *
     * The names follow the Clawd on Desk theme Deepy was drawn for: a state
     * picks an animation, and its priority decides which of two states shows.
     *
     * @param ctx - client context.
     * @param onMoment - `onMoment(moment)` with 'error' or 'attention'.
     * @param onChange - the state may have changed with no DOM change to wake a
     *     pass: the session status moved, the chat target published, or a
     *     compaction started or ended.
     * @returns `{ follow, read, dispose }`.
     */
    function createMascotWhaleSignals(ctx, onMoment, onChange) {
      const IDLE = { state: 'idle', animation: 'idle', priority: 1 }
      const THINKING = { state: 'thinking', animation: 'thinking', priority: 2 }
      const NOTIFICATION = { state: 'notification', animation: 'notification', priority: 7 }
      const SWEEPING = { state: 'sweeping', animation: 'compacting', priority: 6 }

      /** The session whose feed is followed; null on the home page, undefined before the first follow. */
      let followed
      let stopFeed = null
      /** The followed session's chat target (`uiConversation`, target `chat`), subscribed while followed. */
      let chat = null
      let stopChat = null
      /** Compactions of the followed session that started and have not ended. */
      const compactions = new Set()
      /** Sessions finished out of view at the last status read; null before the first. */
      let unread = null

      const statusSource = ctx.get('uiSession')?.sessionStatus
      const stopStatus = typeof statusSource?.subscribe === 'function' ? statusSource.subscribe(onStatus) : null

      function statusOf() {
        return typeof statusSource?.getSnapshot === 'function' ? statusSource.getSnapshot() : null
      }

      function listOf() {
        const list = ctx.get('sessions')?.list
        return typeof list?.getSnapshot === 'function' ? list.getSnapshot() : null
      }

      /** The host's own reading of "running": the live status first, the list's summary behind it. */
      function isRunning(id, status, list) {
        const live = status === null ? undefined : status.get(id)?.running
        return (live ?? list?.byId[id]?.running) === true
      }

      /** Top-level sessions running right now, across the workspace. */
      function busySessions(status, list) {
        if (list === null) return 0
        let busy = 0
        for (let i = 0; i < list.ids.length; i++) {
          const id = list.ids[i]
          if (list.byId[id]?.origin !== 'subagent' && isRunning(id, status, list)) busy++
        }
        return busy
      }

      /** The subagents a session started, as the host's session list catalogues them. */
      function subagentsOf(id, list) {
        const catalog = list?.projectionsBySession[id]?.values?.subagentCatalog
        return Array.isArray(catalog) ? catalog : []
      }

      /** One working animation per crowd size, as Clawd's working tiers pick them. */
      function working(busy) {
        return { state: 'working', animation: busy >= 3 ? 'building' : busy === 2 ? 'music' : 'typing', priority: 3 }
      }

      function chatSnapshot() {
        return chat === null ? null : chat.getSnapshot() ?? null
      }

      /**
       * What the open turn is doing: `thinking` while the model reasons or has
       * not answered yet, `working` while it writes an answer or a tool call
       * and while its tool calls run; null when no turn is open.
       */
      function turnPhase(snapshot) {
        const order = snapshot.timeline.turnOrder
        const turn = order.length === 0 ? undefined : snapshot.timeline.turns.get(order[order.length - 1])
        if (turn === undefined || turn.status !== 'open') return null
        const activity = readTurnActivity(snapshot, turn)
        if (activity === null) return 'thinking'
        if (activity.kind === 'tools') return 'working'
        return activity.newest === null || activity.newest === 'reasoning' ? 'thinking' : 'working'
      }

      /**
       * The state to show: for one session on its conversation page, or for
       * the whole workspace on the home page (`sessionId` null).
       *
       * @returns `{ state, animation, priority }`.
       */
      function read(sessionId) {
        const status = statusOf()
        const list = listOf()
        const busy = busySessions(status, list)
        if (sessionId === null) {
          if (status !== null) {
            for (const entry of status.values()) {
              if (entry.pendingInteraction !== undefined) return NOTIFICATION
            }
          }
          return busy > 0 ? working(busy) : IDLE
        }
        const subagents = subagentsOf(sessionId, list)
        if (status !== null) {
          if (status.get(sessionId)?.pendingInteraction !== undefined) return NOTIFICATION
          // A subagent waiting on the reader holds its parent's work up too.
          for (let i = 0; i < subagents.length; i++) {
            if (status.get(subagents[i].id)?.pendingInteraction !== undefined) return NOTIFICATION
          }
        }
        if (compactions.size > 0) return SWEEPING
        let juggling = 0
        for (let i = 0; i < subagents.length; i++) {
          if (isRunning(subagents[i].id, status, list)) juggling++
        }
        if (juggling > 0) return { state: 'juggling', animation: juggling >= 2 ? 'conducting' : 'music', priority: 4 }
        const snapshot = chatSnapshot()
        const phase = snapshot === null ? null : turnPhase(snapshot)
        if (phase === 'working') return working(Math.max(1, busy))
        if (phase === 'thinking' || isRunning(sessionId, status, list)) return THINKING
        return IDLE
      }

      /** One live event of the followed session. */
      function take(event) {
        const data = event.data
        if (event.type === 'turn/end') {
          const kind = data.reason.kind
          if (kind === 'completed' || kind === 'max-tokens') onMoment('attention')
          else if (kind === 'error' || kind === 'blocked') onMoment('error')
        } else if (event.type === 'tool/result') {
          // A call cut short by a stop is not a failure the whale reacts to.
          if (data.message.isError === true && data.error?.name !== 'AbortError') onMoment('error')
        } else if (event.type === 'compaction/start') {
          compactions.add(data.compactionId)
          onChange()
        } else if (event.type === 'compaction/end') {
          compactions.delete(data.compactionId)
          onChange()
          onMoment(data.error === undefined ? 'attention' : 'error')
        }
      }

      /**
       * Take the running compactions from a whole event window: the ones it
       * starts and does not end. A window the feed loads or sends again whole
       * (a reconnect does) settles the set; appended events keep it current
       * in between.
       */
      function adoptCompactions(entries) {
        compactions.clear()
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i]
          if (entry.type !== 'event') continue
          if (entry.event.type === 'compaction/start') compactions.add(entry.event.data.compactionId)
          else if (entry.event.type === 'compaction/end') compactions.delete(entry.event.data.compactionId)
        }
      }

      /**
       * Follow one session's feed (null: the home page, no feed). Only events
       * appended from here on are moments — the history a feed loads or
       * replaces is the past, and only tells which compactions still run. A
       * session whose binding is not up yet is followed on a later call.
       */
      function follow(sessionId) {
        if (sessionId === followed) return
        unfollow()
        followed = sessionId
        if (sessionId === null) return
        const feed = ctx.get('sessions')?.binding(sessionId)?.eventSource
        if (typeof feed?.subscribe !== 'function') {
          followed = undefined
          return
        }
        const conversation = ctx.get('uiConversation')
        if (conversation) {
          // The host builds the chat target only for a subscriber (or while the
          // shell shows the chat view), and its publications are the ones that
          // tell a streaming step's progress; a bare read would see nothing on
          // the trajectory view.
          chat = conversation.binding(sessionId).target('chat')
          stopChat = chat.subscribe(onChange)
        }
        adoptCompactions(feed.getSnapshot().entries)
        stopFeed = feed.subscribe(() => {
          const latest = feed.getSnapshot()
          const change = latest.change
          if (change.kind === 'replace') {
            adoptCompactions(latest.entries)
            onChange()
            return
          }
          if (change.kind !== 'append') return
          for (let i = 0; i < change.entries.length; i++) {
            if (change.entries[i].type === 'event') take(change.entries[i].event)
          }
        })
      }

      /** The status moved: on the home page a session newly finished out of view is a moment. */
      function onStatus() {
        const status = statusOf()
        if (status === null) return
        const next = new Set()
        for (const [id, entry] of status) {
          if (entry.completionUnread === true) next.add(id)
        }
        if (unread !== null && followed === null) {
          for (const id of next) {
            if (unread.has(id)) continue
            onMoment('attention')
            break
          }
        }
        unread = next
        onChange()
      }

      /** Stop following the session followed so far. */
      function unfollow() {
        if (stopFeed !== null) stopFeed()
        stopFeed = null
        if (stopChat !== null) stopChat()
        stopChat = null
        chat = null
        compactions.clear()
        followed = undefined
      }

      function dispose() {
        unfollow()
        if (stopStatus !== null) stopStatus()
      }

      onStatus()
      return { follow, read, dispose }
    }
