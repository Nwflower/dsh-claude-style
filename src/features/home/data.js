    /**
     * The usage panel's data: the host half's roll-up route, the session list's
     * own projections, and the small vocabulary the two views share.
     *
     * The route (`USAGE_ROUTE`) is the panel's first source: it folds the local
     * session logs (or reads the cost-meter ledger) and answers immediately with
     * whatever it already knows. A cold answer carries `computing`, and the panel
     * keeps its skeleton up and polls until the value lands — so the first paint
     * never waits on the aggregation, and a value that has not arrived yet is
     * never drawn as a zero.
     *
     * The session list is the second source. Every listed session carries the
     * host's token-usage and model-selection projections, so it answers even when
     * the route cannot (an older host half, or a failed fold). It is coarser —
     * one total per session, bucketed onto that session's last-activity day — so
     * the panel names the source it drew from.
     *
     * `homePanelData` is the one derivation both views read: the range window and
     * the figures it sums, the heat grid's cells, the ranked model list, and the
     * per-day per-model totals the models chart stacks.
     */
    /** Where the roll-up lands while the host half is still folding. */
    const HOME_POLL_MS = 800
    /** Polls per load; a cold fold over a large history takes a few seconds. */
    const HOME_POLL_MAX = 15
    /** Heat-grid columns: twenty-six weeks of days, Sunday first — Claude Code's span. */
    const HOME_HEAT_WEEKS = 26
    /** A day's heat is bucketed into four steps against the busiest day shown. */
    const HOME_HEAT_STEPS = 4
    /**
     * The yardstick line's books, shortest first: each title's copy key, its
     * English fallback, and its length in tokens (its word count at the same
     * 1.3 tokens a word The Hobbit's 123k comes from).
     */
    const HOME_BOOKS = [
      { key: 'homeBookAnimalFarm', title: 'Animal Farm', tokens: 39000 },
      { key: 'homeBookGatsby', title: 'The Great Gatsby', tokens: 61000 },
      { key: 'homeBookPhilosophersStone', title: "Harry Potter and the Philosopher's Stone", tokens: 100000 },
      { key: 'homeBook1984', title: 'Nineteen Eighty-Four', tokens: 116000 },
      { key: 'homeBookHobbit', title: 'The Hobbit', tokens: 123000 },
      { key: 'homeBookPride', title: 'Pride and Prejudice', tokens: 159000 },
      { key: 'homeBookMobyDick', title: 'Moby-Dick', tokens: 268000 },
      { key: 'homeBookLordOfTheRings', title: 'The Lord of the Rings', tokens: 625000 },
      { key: 'homeBookWarAndPeace', title: 'War and Peace', tokens: 763000 },
      { key: 'homeBookHarryPotter', title: 'the whole Harry Potter series', tokens: 1409000 },
      { key: 'homeBookLostTime', title: 'In Search of Lost Time', tokens: 1647000 },
    ]
    /** The models chart's own window, in days: Claude Code's chart spans a month. */
    const HOME_CHART_DAYS = 30
    /** Models the ranked list shows before its "show more" row. */
    const HOME_MODEL_ROWS = 6
    /** The range pills: all time, or the last 30/7 calendar days including today. */
    const HOME_RANGES = [
      { id: 'all', labelKey: 'homeRangeAll', fallback: 'All', days: 0 },
      { id: '30d', labelKey: 'homeRange30d', fallback: '30d', days: 30 },
      { id: '7d', labelKey: 'homeRange7d', fallback: '7d', days: 7 },
    ]

    /** A local calendar day, matching the host half's day keys. */
    function homeDayKey(date) {
      const pad = value => value < 10 ? `0${value}` : String(value)
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    }

    /** The short day-label formatter, in the shell's language: "Aug 26", "8月26日". */
    function homeShortDateFormat() {
      return new Intl.DateTimeFormat(activeLocale(), { month: 'short', day: 'numeric' })
    }

    /** One day key as a short label, through `homeShortDateFormat()`'s formatter. */
    function homeShortDate(format, day) {
      const parts = day.split('-')
      return format.format(new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])))
    }

    /** The first day key of a range window; all time has none. */
    function homeRangeStart(windowDays) {
      if (!windowDays) return null
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      start.setDate(start.getDate() - (windowDays - 1))
      return homeDayKey(start)
    }

    /** One token count, short enough for a stat cell or an axis label. */
    function formatHomeTokens(count) {
      const value = Number(count) || 0
      if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
      if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`
      if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`
      return String(Math.round(value))
    }

    function formatHomeCount(count) {
      const value = Math.round(Number(count) || 0)
      return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    }

    /** A settlement hour as Claude Code writes it: "5 AM" / "下午 3 点". */
    function formatHomeHour(hour) {
      const h12 = hour % 12 === 0 ? 12 : hour % 12
      return copyLabel(hour < 12 ? 'homeHourAm' : 'homeHourPm', hour < 12 ? '{hour} AM' : '{hour} PM', { hour: h12 })
    }

    /**
     * The tokens one day entry stands for. The host half's fold carries the four
     * buckets; the session list's roll-up can only carry one total per day, so it
     * is read when present.
     */
    function homeDayTokens(day) {
      if (day === null || day === undefined) return 0
      if (day.total !== undefined) return Number(day.total) || 0
      return (day.input || 0) + (day.output || 0) + (day.cacheRead || 0) + (day.cacheWrite || 0)
    }

    /** One model's bucket sum, for the ranked list's input and output columns. */
    function homeModelTokens(entry) {
      if (entry.tokens !== undefined) return Number(entry.tokens) || 0
      return (entry.input || 0) + (entry.output || 0) + (entry.cacheRead || 0) + (entry.cacheWrite || 0)
    }

    /**
     * The roll-up store: the route's answer, the list's answer, and the polling
     * that fills the first one in.
     *
     * @param ctx - client context.
     * @returns accessors, the loads, and a stop that ends polling and listeners.
     */
    function createHomeUsage(ctx) {
      /** What the panel draws: the last answer, whether more is coming, and why not. */
      const usage = { value: null, computing: false, error: null, loading: false, polls: 0 }
      let listSummary = null
      let listLoading = false
      const listeners = []
      let pollTimer = null
      let disposed = false

      function emit() {
        notifyAll(listeners)
      }

      function subscribe(listener) {
        listeners.push(listener)
        return () => {
          const index = listeners.indexOf(listener)
          if (index !== -1) listeners.splice(index, 1)
        }
      }

      function stopPolling() {
        if (pollTimer !== null) {
          clearTimeout(pollTimer)
          pollTimer = null
        }
      }

      /**
       * One read of the roll-up. `computing` schedules the next poll, so the
       * panel fills in as soon as the host half has the numbers.
       */
      function loadUsage(force) {
        if (disposed || usage.loading) return
        if (!force && usage.value !== null && !usage.computing) return
        usage.loading = true
        const request = fetch(USAGE_ROUTE, { credentials: 'same-origin', headers: { accept: 'application/json' } })
        request.then(response => response !== null && response.ok === true ? response.json() : null).then(body => {
          usage.loading = false
          if (disposed) return
          if (body === null || body.ok !== true) {
            usage.error = 'unavailable'
            emit()
            return
          }
          usage.value = body.value === undefined ? null : body.value
          usage.computing = body.computing === true
          usage.error = body.error === undefined ? null : body.error
          emit()
          if (usage.computing) {
            if (usage.polls >= HOME_POLL_MAX) return
            usage.polls += 1
            stopPolling()
            pollTimer = setTimeout(() => {
              pollTimer = null
              loadUsage(true)
            }, HOME_POLL_MS)
          }
        }).catch(() => {
          usage.loading = false
          if (disposed) return
          usage.error = 'unavailable'
          emit()
        })
      }

      /**
       * The session list's roll-up.
       *
       * The host's list rows carry their own projection block
       * (`projections.values`): `tokenUsage` with its four disjoint buckets,
       * `modelSelection` with the route the session last used, and
       * `sessionListMetadata` with the blank flag and the last prompt time.
       * Summing them gives the panel a second, cheaper source — and the model
       * list's fallback when the roll-up route cannot answer.
       *
       * A session's whole total is bucketed onto its own last-activity day: the
       * list has no per-day split, so this is coarser than the host half's fold,
       * which is exactly why the panel names the source it drew from.
       */
      function summarizeSessionList(rows) {
        let tokens = 0
        const dayCount = {}
        const byDay = {}
        const byModel = {}
        const entries = []
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          const values = row !== null && row !== undefined && row.projections !== undefined && row.projections !== null
            ? row.projections.values
            : null
          if (values === null || values === undefined) continue
          const meta = values.sessionListMetadata
          if (meta !== null && meta !== undefined && meta.blank === true) continue
          const bucket = values.tokenUsage
          const total = bucket === null || bucket === undefined ? 0
            : (bucket.uncachedInputTokens || 0) + (bucket.outputTokens || 0)
              + (bucket.cacheReadTokens || 0) + (bucket.cacheWriteTokens || 0)
          tokens += total
          const at = meta !== null && meta !== undefined && typeof meta.lastPromptAt === 'number'
            ? meta.lastPromptAt
            : row.updatedAt
          const selection = values.modelSelection
          const picked = selection !== null && selection !== undefined ? (selection.next || selection.lastUsed) : null
          const id = picked !== null && picked !== undefined && typeof picked.model === 'string' ? picked.model : null
          entries.push({ at: typeof at === 'number' ? at : 0, tokens: total, model: id })
          if (typeof at === 'number') {
            const day = homeDayKey(new Date(at))
            dayCount[day] = true
            byDay[day] = (byDay[day] || 0) + total
          }
          if (id !== null) {
            let cell = byModel[id]
            if (cell === undefined) {
              cell = { tokens: 0, sessions: 0, lastAt: 0 }
              byModel[id] = cell
            }
            cell.tokens += total
            cell.sessions += 1
            if (typeof at === 'number' && at > cell.lastAt) cell.lastAt = at
          }
        }
        let favorite = null
        let best = 0
        const models = []
        for (const name in byModel) {
          models.push({ id: name, tokens: byModel[name].tokens, sessions: byModel[name].sessions, lastAt: byModel[name].lastAt })
          if (byModel[name].sessions > best) {
            best = byModel[name].sessions
            favorite = name
          }
        }
        models.sort((left, right) => right.tokens - left.tokens)
        const days = []
        for (const date in byDay) days.push({ date, total: byDay[date] })
        return { tokens, sessions: entries.length, activeDays: Object.keys(dayCount).length, model: favorite, models, days, entries }
      }

      /** Read the session list once; a host without the remote service keeps the route's answer. */
      function loadSessionSummary() {
        if (disposed || listLoading || listSummary !== null) return
        const sessions = ctx.get('remote.session')
        if (sessions === undefined || sessions === null || typeof sessions.list !== 'function') return
        listLoading = true
        sessions.list({}).then(result => {
          listLoading = false
          if (disposed) return
          const items = result !== null && result !== undefined && result.ok === true
            && result.value !== null && result.value !== undefined && Array.isArray(result.value.items)
            ? result.value.items
            : null
          if (items === null) return
          listSummary = summarizeSessionList(items)
          emit()
        }).catch(() => {
          listLoading = false
        })
      }

      return {
        state() { return usage },
        list() { return listSummary },
        listLoading() { return listLoading },
        subscribe,
        /** Ask every view to re-render; a state change outside the store uses it. */
        notify: emit,
        load: loadUsage,
        loadList: loadSessionSummary,
        stop() {
          disposed = true
          stopPolling()
          listeners.length = 0
        },
      }
    }

    /**
     * The heat grid: one cell per day, weeks as columns, Sunday first, running
     * back HOME_HEAT_WEEKS weeks from today. Days the roll-up does not cover are
     * cells with no heat, which is exactly what an empty cell means.
     */
    function homeHeatGrid(days) {
      const byDate = {}
      const callsByDate = {}
      const list = days === null || days === undefined ? [] : days
      // A day's messages are its settled calls; the session list's fallback has
      // no per-day count, so its cells carry none.
      let counted = true
      for (let i = 0; i < list.length; i++) {
        byDate[list[i].date] = homeDayTokens(list[i])
        if (typeof list[i].calls === 'number') callsByDate[list[i].date] = list[i].calls
        else counted = false
      }
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const start = new Date(today)
      start.setDate(start.getDate() - (HOME_HEAT_WEEKS * 7 - 1))
      start.setDate(start.getDate() - start.getDay())
      const cells = []
      let peak = 0
      for (const cursor = new Date(start); cursor <= today; cursor.setDate(cursor.getDate() + 1)) {
        const key = homeDayKey(cursor)
        const tokens = byDate[key] || 0
        if (tokens > peak) peak = tokens
        cells.push({ date: key, tokens, messages: counted ? callsByDate[key] || 0 : null, level: 0 })
      }
      for (let c = 0; c < cells.length; c++) {
        if (cells[c].tokens === 0 || peak === 0) continue
        cells[c].level = Math.max(1, Math.min(HOME_HEAT_STEPS, Math.ceil(cells[c].tokens / peak * HOME_HEAT_STEPS)))
      }
      return { cells, peak }
    }

    /**
     * The ranked model list, from whichever source can answer.
     *
     * The host half's fold attributes every usage sample it can to its route, so
     * its answer carries each model's four buckets; the session list carries one
     * total per model and no split. Both are sorted by tokens.
     */
    function homeModelList(value, listed) {
      if (value !== null && Array.isArray(value.models) && value.models.length > 0) {
        return value.models.map(entry => ({
          id: entry.id,
          input: entry.input || 0,
          output: entry.output || 0,
          cacheRead: entry.cacheRead || 0,
          cacheWrite: entry.cacheWrite || 0,
          tokens: homeModelTokens(entry),
          sessions: entry.sessions,
          lastAt: entry.lastAt
        }))
      }
      if (listed === null) return null
      return listed.models.map(entry => ({
        id: entry.id,
        tokens: entry.tokens,
        sessions: entry.sessions,
        lastAt: entry.lastAt
      }))
    }

    /**
     * The models chart's columns: the last HOME_CHART_DAYS days of the roll-up's
     * own per-day per-model totals, in calendar order.
     *
     * The fold attributes a sample only when the event names its route, so a day
     * whose samples are all unattributed carries no models and draws no stack —
     * its share of the day simply stays out of the chart.
     */
    function homeModelDays(value, windowDays) {
      if (value === null || !Array.isArray(value.days)) return null
      const span = windowDays > 0 && windowDays < HOME_CHART_DAYS ? windowDays : HOME_CHART_DAYS
      const start = homeRangeStart(span)
      const columns = []
      for (let i = 0; i < value.days.length; i++) {
        const day = value.days[i]
        if (day.date < start || day.models === undefined || day.models === null) continue
        columns.push({ date: day.date, models: day.models })
      }
      if (columns.length === 0) return null
      columns.sort((left, right) => left.date < right.date ? -1 : 1)
      return columns
    }

    /**
     * Every figure the panel draws, from the two sources and the picked range.
     *
     * @param state - the roll-up store's snapshot.
     * @param listed - the session list's roll-up, or null.
     * @param range - the picked range id ('all' / '30d' / '7d').
     * @param bookPick - the panel's draw in [0, 1), which picks the yardstick book.
     * @returns the figures both views read.
     */
    function homePanelData(state, listed, range, bookPick) {
      const value = state.value
      const ready = value !== null && value.totals !== undefined
      const totals = ready ? value.totals : null
      const known = ready || listed !== null
      let windowDays = 0
      for (let r = 0; r < HOME_RANGES.length; r++) {
        if (HOME_RANGES[r].id === range) windowDays = HOME_RANGES[r].days
      }
      const start = homeRangeStart(windowDays)
      const startMs = start === null ? null : new Date(`${start}T00:00:00`).getTime()
      const inRange = date => start === null || date >= start
      let tokens = 0
      let calls = null
      let sessions = null
      let activeDays = null
      if (ready && start === null) {
        // All time reads the fold's own totals; its session count is already the
        // distinct union over every day.
        tokens = homeDayTokens(totals)
        calls = totals.calls
        sessions = totals.sessions
        activeDays = totals.activeDays
      } else if (ready) {
        // A window sums the per-day buckets. Sessions union the per-day id lists
        // when the host half carries them on every day; an older host half has
        // none, and the per-day counts then sum to an upper bound rather than
        // reading zero.
        const ids = {}
        let everyDayHasIds = true
        let daySessions = 0
        calls = 0
        sessions = 0
        activeDays = 0
        for (let d = 0; d < value.days.length; d++) {
          const day = value.days[d]
          if (!inRange(day.date)) continue
          tokens += homeDayTokens(day)
          calls += day.calls || 0
          activeDays += 1
          if (Array.isArray(day.sessionIds)) {
            for (let s = 0; s < day.sessionIds.length; s++) ids[day.sessionIds[s]] = true
          } else {
            everyDayHasIds = false
          }
          daySessions += day.sessions || 0
        }
        sessions = everyDayHasIds ? Object.keys(ids).length : daySessions
      } else if (listed !== null) {
        // The list's fall-back: a session's whole total rides its last-activity
        // day, so the window keeps the sessions whose last prompt falls inside.
        sessions = 0
        activeDays = 0
        for (let e = 0; e < listed.entries.length; e++) {
          const item = listed.entries[e]
          if (startMs !== null && item.at < startMs) continue
          tokens += item.tokens
          sessions += 1
        }
        for (let ld = 0; ld < listed.days.length; ld++) {
          if (inRange(listed.days[ld].date)) activeDays += 1
        }
      }
      // The hour histogram is the fold's own (behind a cost-meter answer it
      // lands a moment later). All time reads the whole histogram; a window sums
      // its own days' histograms, so the peak hour follows the range pills.
      let hourCounts = null
      if (ready && start === null && Array.isArray(value.hours)) hourCounts = value.hours
      else if (ready && start !== null && Array.isArray(value.days)) {
        for (let hd = 0; hd < value.days.length; hd++) {
          const hourDay = value.days[hd]
          if (!inRange(hourDay.date) || !Array.isArray(hourDay.hours)) continue
          if (hourCounts === null) hourCounts = new Array(24).fill(0)
          for (let dh = 0; dh < 24; dh++) hourCounts[dh] += Number(hourDay.hours[dh]) || 0
        }
      }
      let peakHour = null
      if (hourCounts !== null) {
        let bestHour = 0
        let hourSum = 0
        for (let h = 0; h < 24; h++) {
          const hourCount = Number(hourCounts[h]) || 0
          hourSum += hourCount
          if (hourCount > (Number(hourCounts[bestHour]) || 0)) bestHour = h
        }
        if (hourSum > 0) peakHour = formatHomeHour(bestHour)
      }
      let model = null
      if (listed !== null) {
        if (start === null) model = listed.model
        else {
          let bestSessions = 0
          for (let m = 0; m < listed.models.length; m++) {
            const windowed = listed.models[m]
            if (windowed.lastAt < startMs || windowed.sessions <= bestSessions) continue
            bestSessions = windowed.sessions
            model = windowed.id
          }
        }
      }
      if (model === null && ready && typeof value.model === 'string') model = value.model
      // The yardstick line reads the window's own total, like the tiles above it.
      // The panel draws its book once; a window that has not passed that book
      // yet steps down to the longest book it has passed, so switching ranges
      // keeps the same book whenever the totals allow.
      let fun = null
      let bookIndex = Math.min(HOME_BOOKS.length - 1, Math.floor(bookPick * HOME_BOOKS.length))
      while (bookIndex >= 0 && tokens < HOME_BOOKS[bookIndex].tokens) bookIndex -= 1
      if (bookIndex >= 0) {
        const book = HOME_BOOKS[bookIndex]
        fun = copyLabel('homeFunBook', "You've used ~{count}× more tokens than {book}.", {
          count: formatHomeCount(Math.round(tokens / book.tokens)),
          book: copyLabel(book.key, book.title),
        })
      }
      const models = homeModelList(value, listed)
      return {
        ready,
        value,
        listed,
        known,
        windowDays,
        start,
        startMs,
        inRange,
        tokens,
        calls,
        sessions,
        activeDays,
        peakHour,
        model,
        grid: homeHeatGrid(ready ? value.days : (listed === null ? null : listed.days)),
        fun,
        models,
        modelDays: homeModelDays(value, windowDays),
      }
    }
