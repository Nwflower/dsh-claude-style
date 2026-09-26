    /**
     * Turn status: while a turn is running, the host's turn-process control
     * leaves the top of the turn and becomes the status line at the end of the
     * work in progress, the way Claude Code shows it — the spark, the elapsed
     * time, the output tokens so far, and what the model is doing now.
     *
     * The host keeps the control and its data: the pass stamps the control's
     * flow item so the stylesheet moves it with flex `order` (the chat column
     * is a flex column), and writes the line's text into an attribute the
     * stylesheet renders, so React never sees its own DOM rewritten. Numbers
     * come from the host's chat snapshot (`uiConversation`, target `chat`):
     * the turn's start time, the usage its settled steps report, the output
     * of the step still streaming and the running tool calls. Durations use the host's
     * own chat wording. A finished turn keeps the host's control as it is.
     * docs/architecture.md D23.
     *
     * @param ctx - client context.
     * @param ui - shared handle table.
     * @returns teardown.
     */
    function installTurnStatus(ctx, ui) {
      /** On the live control's flow item: the stylesheet orders it after the turn's work. */
      const LIVE_ATTR = 'data-dsh-claude-turn-live'
      /** On column rows after the live turn (queued messages): they stay below the status line. */
      const TRAILING_ATTR = 'data-dsh-claude-turn-trailing'
      /** On the live control itself: the status line's text. */
      const STATUS_ATTR = 'data-dsh-claude-turn-status'
      const SEPARATOR = ' · '
      /** Element → attribute it carries, for every mark this feature wrote. */
      const marks = new Map()
      /**
       * Reasoning the pass has watched stream, per live turn: the step it
       * belongs to and when the pass first and last saw it as the newest
       * block. The snapshot carries no reasoning timestamps, so "thought for"
       * is measured from what this page observed.
       */
      const reasoning = new Map()

      function mark(next, element, attr, value) {
        next.set(element, attr)
        if (element.getAttribute(attr) !== value) element.setAttribute(attr, value)
      }

      /** Take every mark the last pass wrote that this pass did not write again. */
      function settle(next) {
        marks.forEach((attr, element) => {
          if (next.get(element) !== attr) element.removeAttribute(attr)
        })
        marks.clear()
        next.forEach((attr, element) => marks.set(element, attr))
      }

      function chatSnapshot(sessionId) {
        const conversation = ctx.get('uiConversation')
        const sessions = ctx.get('sessions')
        if (!conversation || !sessions || !sessions.binding(sessionId)) return null
        return conversation.binding(sessionId).target('chat').getSnapshot()
      }

      /** The host's live clock format: minutes and seconds unpadded below the hour. */
      function formatElapsed(ms, t) {
        const total = Math.max(0, Math.floor(ms / 1000))
        const hours = Math.floor(total / 3600)
        const minutes = Math.floor(total / 60) % 60
        const seconds = String(total % 60)
        if (hours > 0) return t('duration.hours', { hours, minutes: String(minutes).padStart(2, '0'), seconds })
        return minutes > 0 ? t('duration.minutes', { minutes, seconds }) : t('duration.seconds', { seconds })
      }

      function formatTokens(count) {
        if (count < 1000) return String(count)
        const scaled = count < 1000000 ? count / 1000 : count / 1000000
        return `${scaled.toFixed(1).replace(/\.0$/, '')}${count < 1000000 ? 'k' : 'M'}`
      }

      /** Output tokens the turn's settled steps report; the streaming step joins when it settles. */
      function outputTokens(turn) {
        let total = 0
        for (let i = 0; i < turn.steps.length; i++) {
          const assistant = turn.steps[i].data.get('assistant-step')
          const usage = assistant === undefined ? undefined : assistant.usage
          if (usage && typeof usage.outputTokens === 'number') total += usage.outputTokens
        }
        return total
      }

      /**
       * What the model is doing now, in the words of the status line: the
       * newest step's assistant output while it streams (its blocks grow in
       * place), else the turn's running tool calls, else a wait for the model.
       */
      function phaseText(key, snapshot, turn, now, t) {
        const step = turn.steps.length === 0 ? undefined : turn.steps[turn.steps.length - 1]
        const assistant = step === undefined ? undefined : step.data.get('assistant-step')
        if (assistant !== undefined && assistant.status === 'running') {
          let seen = reasoning.get(key)
          if (seen === undefined || seen.step !== assistant.step) {
            seen = { step: assistant.step, from: null, until: null }
            reasoning.set(key, seen)
          }
          const blocks = assistant.blocks
          const newest = blocks.length === 0 ? null : blocks[blocks.length - 1].kind
          if (newest === 'reasoning') {
            if (seen.from === null) seen.from = now
            seen.until = null
            return copyLabel('turnStatusThinking', 'Thinking…')
          }
          if (seen.from !== null && seen.until === null) seen.until = now
          if (newest === null) return copyLabel('turnStatusWaiting', 'Waiting for the model…')
          if (seen.from !== null) {
            return copyLabel('turnStatusThought', 'Thought for {duration}', {
              duration: formatElapsed(Math.max(1000, seen.until - seen.from), t),
            })
          }
          return newest === 'tool-call'
            ? copyLabel('turnStatusToolCall', 'Preparing a tool call…')
            : copyLabel('turnStatusWriting', 'Writing…')
        }
        const calls = snapshot.legacy.runningCalls
        for (let i = 0; i < calls.length; i++) {
          if (calls[i].turn === turn.turn) return copyLabel('turnStatusTools', 'Running tools…')
        }
        return copyLabel('turnStatusWaiting', 'Waiting for the model…')
      }

      function statusText(key, snapshot, turn, t) {
        const now = Date.now()
        const parts = []
        if (turn.start !== undefined) parts.push(formatElapsed(Math.max(1000, now - turn.start.time), t))
        const tokens = outputTokens(turn)
        if (tokens > 0) parts.push(copyLabel('turnStatusTokens', '{count} tokens', { count: formatTokens(tokens) }))
        parts.push(phaseText(key, snapshot, turn, now, t))
        return parts.join(SEPARATOR)
      }

      /**
       * One chat column: the control of its running turn moves after the
       * turn's last row, and the rows the host renders after the turn
       * (queued messages) keep their place below it.
       */
      function syncColumn(column, next, live, t) {
        const sessionHost = column.closest('[data-conversation-session]')
        const sessionId = sessionHost === null ? '' : sessionHost.getAttribute('data-conversation-session')
        if (!sessionId) return
        const rows = column.children
        let control = null
        for (let i = rows.length - 1; i >= 0; i--) {
          if (rows[i].getAttribute('data-chat-flow-kind') === 'turn-process') {
            control = rows[i]
            break
          }
        }
        if (control === null) return
        const button = control.querySelector('button[data-turn-process]')
        if (button === null) return
        const turnNumber = Number(control.getAttribute('data-chat-turn'))
        const snapshot = chatSnapshot(sessionId)
        const turn = snapshot === null ? undefined : snapshot.timeline.turns.get(turnNumber)
        if (turn === undefined || turn.status !== 'open') return
        const key = `${sessionId}:${turnNumber}`
        live.add(key)
        mark(next, control, LIVE_ATTR, '')
        mark(next, button, STATUS_ATTR, statusText(key, snapshot, turn, t))
        let turnEnd = -1
        for (let i = 0; i < rows.length; i++) {
          if (rows[i].getAttribute('data-chat-turn') === String(turnNumber)) turnEnd = i
        }
        for (let i = turnEnd + 1; i < rows.length; i++) {
          if (rows[i] !== control) mark(next, rows[i], TRAILING_ATTR, '')
        }
      }

      function sync() {
        const next = new Map()
        const live = new Set()
        const locale = ctx.get('locale')
        if (locale) {
          const t = locale.bind('chat')
          const columns = document.querySelectorAll('[data-chat-flow]')
          for (let i = 0; i < columns.length; i++) syncColumn(columns[i], next, live, t)
        }
        settle(next)
        reasoning.forEach((seen, key) => {
          if (!live.has(key)) reasoning.delete(key)
        })
      }

      ui.turnStatus = { sync }

      return () => {
        settle(new Map())
        reasoning.clear()
        delete ui.turnStatus
      }
    }
