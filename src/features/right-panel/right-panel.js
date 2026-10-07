    /**
     * The right column's landing cards (D52).
     *
     * The guide an empty right column renders takes the session's own numbers as
     * cards, above the entry capsules. Every number is DATA from the host's
     * session projections (`sessionStats`, `tokenUsage`), read through the same
     * key-addressed faces the context popover reads; the words are the host's own
     * `chat` namespace, the one its statistic pills use. A card whose input is
     * absent is left out rather than filled with a zero, and the stack leaves the
     * document with the guide, the session or the projections.
     */
    function installRightPanel(ctx, ui) {
      /** The stack's mark; the stylesheet hangs every rule on it. */
      const CARDS_ATTR = 'data-dsh-claude-panel-cards'
      /** One card: `data-dsh-claude-panel-card="<title key>"`. */
      const CARD_ATTR = 'data-dsh-claude-panel-card'
      /** The trail a card may carry: one circle per turn. */
      const TRAIL_ATTR = 'data-dsh-claude-panel-trail'
      /** One row inside a card: `data-dsh-claude-panel-row="<label key>"`. */
      const ROW_ATTR = 'data-dsh-claude-panel-row'
      /** The projections the cards read, in the order their cards appear. */
      const STATS_KEYS = ['sessionStats', 'tokenUsage']
      /** The guide's host: the slot the empty right column fills. */
      const GUIDE_SELECTOR = '[data-slot="sidebar.right.tab.guide"]'
      /** The mounted stack, or null; `host` is the guide it went into. */
      let stack = null
      /** The projections this page is following, and how to stop. */
      let watch = null
      /** The rendered content, so an unchanged pass writes nothing. */
      let signature = ''

      /**
       * The host's key-addressed read faces for one session, or null while the
       * session or its projections cannot be reached.
       */
      function facesFor(sessionId) {
        const sessions = ctx.get('sessions')
        const binding = typeof sessions?.binding === 'function' ? sessions.binding(sessionId) : undefined
        const projections = binding?.session?.projections
        if (typeof projections?.faceOf !== 'function') return null
        const faces = {}
        for (let i = 0; i < STATS_KEYS.length; i++) faces[STATS_KEYS[i]] = projections.faceOf(STATS_KEYS[i])
        return faces
      }

      /** The shown conversation's host session id. */
      function shownSessionId() {
        const id = conversationSessionId(findConversationSession())
        return id === null ? '' : id
      }

      /** One projection's current whole value, or undefined while it is absent. */
      function value(key) {
        const face = watch === null ? undefined : watch.faces[key]
        return typeof face?.getSnapshot === 'function' ? face.getSnapshot() : undefined
      }

      /** The host's `chat` namespace translate seat, or null when it is absent. */
      function chatText() {
        const locale = ctx.get('locale')
        return typeof locale?.bind === 'function' ? locale.bind('chat') : null
      }

      /** Stop following the projections. */
      function releaseWatch() {
        if (watch === null) return
        for (let i = 0; i < watch.off.length; i++) watch.off[i]()
        watch = null
      }

      /** Follow the shown conversation's projections; a switch rebinds them. */
      function syncWatch() {
        const sessionId = shownSessionId()
        if (watch !== null && watch.sessionId === sessionId) return
        releaseWatch()
        signature = ''
        if (sessionId === '') return
        const faces = facesFor(sessionId)
        if (faces === null) return
        const off = []
        for (let i = 0; i < STATS_KEYS.length; i++) {
          const face = faces[STATS_KEYS[i]]
          if (typeof face?.subscribe === 'function') off.push(face.subscribe(() => { signature = '' }))
        }
        watch = { sessionId, faces, off }
      }

      /** A duration in the host's own short form (mirrors ui-chat's formatDuration). */
      function duration(ms) {
        if (!(ms > 0)) return ''
        if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
        const whole = Math.round(ms / 1000)
        const minutes = Math.floor(whole / 60)
        const seconds = whole % 60
        return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`
      }

      /** A token count in the host's own short form (mirrors ui-chat's formatExactTokens). */
      function tokens(count) {
        if (!(count > 0)) return ''
        if (count < 1000) return String(count)
        if (count < 1_000_000) return `${(count / 1000).toFixed(count < 10_000 ? 1 : 0)}k`
        return `${(count / 1_000_000).toFixed(1)}M`
      }

      /** The cards this session's numbers make, in the order they appear. */
      function cards(chat) {
        const made = []
        const stats = value('sessionStats')
        if (stats !== undefined && stats !== null) {
          const totalMs = (stats.llmMs > 0 ? stats.llmMs : 0) + (stats.toolMs > 0 ? stats.toolMs : 0)
          const rows = []
          if (totalMs > 0) rows.push([copyLabel('contextTotalTime', 'Total time'), duration(totalMs)])
          if (stats.llmMs > 0) rows.push([chat('stats.dialog.llmTime'), duration(stats.llmMs)])
          if (stats.toolMs > 0) rows.push([chat('stats.dialog.toolTime'), duration(stats.toolMs)])
          if (rows.length > 0) {
            // The reference card trails one circle per turn, the last one current.
            const total = stats.turns > 0 ? Math.min(stats.turns, 6) : 0
            made.push({ title: chat('stats.dialog.title'), rows, trail: total > 0 ? { done: Math.max(0, total - 1), total } : null })
          }
        }
        const usage = value('tokenUsage')
        if (usage !== undefined && usage !== null) {
          const billed = usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
          const rows = []
          if (billed > 0) rows.push([chat('message.turnUsage.input'), tokens(billed)])
          if (usage.outputTokens > 0) rows.push([chat('message.turnUsage.output'), tokens(usage.outputTokens)])
          if (billed > 0 && usage.cacheReadTokens > 0) rows.push([chat('message.turnUsage.cacheHit'), `${Math.round((usage.cacheReadTokens / billed) * 100)}%`])
          if (rows.length > 0) made.push({ title: chat('stats.dialog.usageTitle'), rows })
        }
        return made
      }

      /** Take the stack out of the document. */
      function unmount() {
        if (stack === null) return
        if (stack.root.parentElement !== null) stack.root.remove()
        stack = null
        signature = ''
      }

      /** Write one card. */
      function drawCard(card) {
        const section = document.createElement('section')
        section.setAttribute(CARD_ATTR, '')
        const head = document.createElement('div')
        head.className = 'dsh-claude-panel-card-head'
        const title = document.createElement('span')
        title.className = 'dsh-claude-panel-card-title'
        title.textContent = card.title
        head.appendChild(title)
        const chevron = document.createElement('span')
        chevron.className = 'dsh-claude-panel-card-chevron'
        chevron.setAttribute('aria-hidden', 'true')
        head.appendChild(chevron)
        section.appendChild(head)
        if (card.trail !== null && card.trail !== undefined) {
          const trail = document.createElement('div')
          trail.className = 'dsh-claude-panel-card-trail'
          trail.setAttribute(TRAIL_ATTR, '')
          for (let i = 0; i < card.trail.total; i++) {
            if (i > 0) {
              const link = document.createElement('span')
              link.className = 'dsh-claude-panel-card-link'
              trail.appendChild(link)
            }
            const dot = document.createElement('span')
            const state = i < card.trail.done ? 'done' : i === card.trail.done ? 'current' : 'pending'
            dot.className = 'dsh-claude-panel-card-dot'
            dot.setAttribute('data-dsh-claude-panel-dot', state)
            trail.appendChild(dot)
          }
          section.appendChild(trail)
        }
        for (let i = 0; i < card.rows.length; i++) {
          const row = document.createElement('div')
          row.className = 'dsh-claude-panel-card-row'
          row.setAttribute(ROW_ATTR, '')
          const label = document.createElement('span')
          label.className = 'dsh-claude-panel-card-label'
          label.textContent = card.rows[i][0]
          const shown = document.createElement('span')
          shown.className = 'dsh-claude-panel-card-value'
          shown.textContent = card.rows[i][1]
          row.appendChild(label)
          row.appendChild(shown)
          section.appendChild(row)
        }
        return section
      }

      /** Mount into the guide, replacing whatever the last pass drew. */
      function draw(host, made) {
        if (stack === null || stack.host !== host) {
          unmount()
          const root = document.createElement('div')
          root.setAttribute(CARDS_ATTR, '')
          host.insertBefore(root, host.firstChild)
          stack = { root, host }
        }
        stack.root.textContent = ''
        for (let i = 0; i < made.length; i++) stack.root.appendChild(drawCard(made[i]))
      }

      /** One pass: follow the session, then draw what its numbers make. */
      function sync() {
        // Without the right column's guide there is nothing to draw and nothing
        // to follow: the pass leaves the projections alone.
        const host = document.querySelector(GUIDE_SELECTOR)
        if (host === null) {
          releaseWatch()
          unmount()
          return
        }
        syncWatch()
        const chat = chatText()
        if (chat === null) {
          unmount()
          return
        }
        const made = cards(chat)
        if (made.length === 0) {
          unmount()
          return
        }
        const next = JSON.stringify(made)
        if (next === signature && stack !== null && stack.host === host) return
        draw(host, made)
        signature = next
      }

      ui.rightPanel = { sync }

      return () => {
        releaseWatch()
        unmount()
        delete ui.rightPanel
      }
    }
