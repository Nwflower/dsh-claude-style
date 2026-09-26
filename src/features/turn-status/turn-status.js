    /**
     * Turn status: the host's turn-process control of a running, stopped or
     * failed turn leaves the top of the turn and becomes the status line at
     * the end of the turn's work, the way Claude Code shows it — the spark,
     * the elapsed time, the output tokens, and what the model is doing now
     * (or that the turn stopped or failed). A turn that finished normally
     * keeps the host's control, which folds its work.
     *
     * The host keeps the control and its data: the pass writes flex `order`
     * values onto the chat column's rows (the column is a flex column), and
     * writes the line's text into an attribute the stylesheet renders, so
     * React never sees its own DOM rewritten. Numbers come from the host's
     * chat snapshot (`uiConversation`, target `chat`): the turn's start and
     * end, the usage its settled steps report, the output of the step still
     * streaming and the running tool calls. Durations and the stopped / failed
     * words are the host's own chat wording. docs/architecture.md D23.
     *
     * @param ctx - client context.
     * @param ui - shared handle table.
     * @returns teardown.
     */
    function installTurnStatus(ctx, ui) {
      /** On the moved control: `live`, `stopped` or `failed`. */
      const STATE_ATTR = 'data-dsh-claude-turn-state'
      /** On the moved control: the status line's text. */
      const STATUS_ATTR = 'data-dsh-claude-turn-status'
      /** Inline on the column's rows from the first moved control on: their flex order. */
      const ORDER_PROP = '--dsh-claude-turn-order'
      const SEPARATOR = ' · '
      /** Element → (attribute → value) this feature wrote. */
      let attrMarks = new Map()
      /** Row → order this feature wrote. */
      let orderMarks = new Map()
      /**
       * Reasoning the pass has watched stream, per live turn: the step it
       * belongs to and when the pass first and last saw it as the newest
       * block. The snapshot carries no reasoning timestamps, so "thought for"
       * is measured from what this page observed.
       */
      const reasoning = new Map()

      /** Write this pass's marks and take off every mark the last pass wrote that this one did not. */
      function settle(nextAttrs, nextOrders) {
        attrMarks.forEach((values, element) => {
          const kept = nextAttrs.get(element)
          values.forEach((value, attr) => {
            if (kept === undefined || !kept.has(attr)) element.removeAttribute(attr)
          })
        })
        nextAttrs.forEach((values, element) => {
          values.forEach((value, attr) => {
            if (element.getAttribute(attr) !== value) element.setAttribute(attr, value)
          })
        })
        orderMarks.forEach((order, element) => {
          if (nextOrders.has(element)) return
          element.style.removeProperty(ORDER_PROP)
          if (element.style.length === 0) element.removeAttribute('style')
        })
        nextOrders.forEach((order, element) => {
          const value = String(order)
          if (element.style.getPropertyValue(ORDER_PROP) !== value) element.style.setProperty(ORDER_PROP, value)
        })
        attrMarks = nextAttrs
        orderMarks = nextOrders
      }

      function chatSnapshot(sessionId) {
        const conversation = ctx.get('uiConversation')
        const sessions = ctx.get('sessions')
        if (!conversation || !sessions || !sessions.binding(sessionId)) return null
        return conversation.binding(sessionId).target('chat').getSnapshot()
      }

      /**
       * The host's clock formats: a running turn counts seconds unpadded, a
       * finished one pads seconds (and minutes under an hour mark) to two digits.
       */
      function formatDuration(ms, t, padded) {
        const total = Math.max(0, Math.floor(ms / 1000))
        const hours = Math.floor(total / 3600)
        const minutes = Math.floor(total / 60) % 60
        const seconds = total % 60
        const pad = (value) => String(value).padStart(2, '0')
        if (hours > 0) return t('duration.hours', { hours, minutes: pad(minutes), seconds: padded ? pad(seconds) : String(seconds) })
        if (minutes > 0) return t('duration.minutes', { minutes, seconds: padded ? pad(seconds) : String(seconds) })
        return t('duration.seconds', { seconds })
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

      /** `live`, `stopped`, `failed`, or null for a turn the host's control keeps. */
      function turnState(turn) {
        if (turn === undefined) return null
        if (turn.status === 'open') return 'live'
        const reason = turn.status === 'closed' && turn.end !== undefined ? turn.end.data.reason.kind : null
        if (reason === 'aborted') return 'stopped'
        if (reason === 'error') return 'failed'
        return null
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
              duration: formatDuration(Math.max(1000, seen.until - seen.from), t, false),
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

      /**
       * A running turn: elapsed · tokens · action. A stopped or failed one:
       * the host's word for it · how long it ran · tokens.
       */
      function statusText(key, snapshot, turn, state, t) {
        const parts = []
        const tokens = outputTokens(turn)
        const tokenText = tokens > 0 ? copyLabel('turnStatusTokens', '{count} tokens', { count: formatTokens(tokens) }) : null
        if (state === 'live') {
          const now = Date.now()
          if (turn.start !== undefined) parts.push(formatDuration(Math.max(1000, now - turn.start.time), t, false))
          if (tokenText !== null) parts.push(tokenText)
          parts.push(phaseText(key, snapshot, turn, now, t))
        } else {
          parts.push(t(state === 'stopped' ? 'message.stopped' : 'message.turnProcess.failed'))
          if (turn.start !== undefined) parts.push(formatDuration(Math.max(1000, turn.end.time - turn.start.time), t, true))
          if (tokenText !== null) parts.push(tokenText)
        }
        return parts.join(SEPARATOR)
      }

      /**
       * One chat column. Each moved control goes after its turn's last row
       * other than the turn's footer (`turn-tail`); every row from there on
       * steps up an order level, so later turns, the footer and queued
       * messages keep their places below it. Rows before the first moved
       * control keep order 0.
       */
      function syncColumn(column, nextAttrs, nextOrders, live, t) {
        const sessionHost = column.closest('[data-conversation-session]')
        const sessionId = sessionHost === null ? '' : sessionHost.getAttribute('data-conversation-session')
        if (!sessionId) return
        const rows = column.children
        let snapshot
        const after = new Map()
        for (let i = 0; i < rows.length; i++) {
          if (rows[i].getAttribute('data-chat-flow-kind') !== 'turn-process') continue
          const button = rows[i].querySelector('button[data-turn-process]')
          if (button === null) continue
          if (snapshot === undefined) snapshot = chatSnapshot(sessionId)
          if (snapshot === null) return
          const turnText = rows[i].getAttribute('data-chat-turn')
          const turn = snapshot.timeline.turns.get(Number(turnText))
          const state = turnState(turn)
          if (state === null) continue
          const key = `${sessionId}:${turnText}`
          if (state === 'live') live.add(key)
          nextAttrs.set(button, new Map([[STATE_ATTR, state], [STATUS_ATTR, statusText(key, snapshot, turn, state, t)]]))
          let last = -1
          for (let j = i + 1; j < rows.length; j++) {
            if (rows[j].getAttribute('data-chat-turn') === turnText && rows[j].getAttribute('data-chat-flow-kind') !== 'turn-tail') last = j
          }
          if (last !== -1) after.set(last, rows[i])
        }
        if (after.size === 0) return
        const moved = new Set(after.values())
        let level = 0
        for (let i = 0; i < rows.length; i++) {
          if (moved.has(rows[i])) continue
          if (level > 0) nextOrders.set(rows[i], 2 * level)
          const control = after.get(i)
          if (control === undefined) continue
          nextOrders.set(control, 2 * level + 1)
          level++
        }
      }

      function sync() {
        const nextAttrs = new Map()
        const nextOrders = new Map()
        const live = new Set()
        const locale = ctx.get('locale')
        if (locale) {
          const t = locale.bind('chat')
          const columns = document.querySelectorAll('[data-chat-flow]')
          for (let i = 0; i < columns.length; i++) syncColumn(columns[i], nextAttrs, nextOrders, live, t)
        }
        settle(nextAttrs, nextOrders)
        reasoning.forEach((seen, key) => {
          if (!live.has(key)) reasoning.delete(key)
        })
      }

      ui.turnStatus = { sync }

      return () => {
        settle(new Map(), new Map())
        reasoning.clear()
        delete ui.turnStatus
      }
    }
