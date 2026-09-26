    /**
     * The panel's Overview tab: the six stat cells, the heat grid, and Claude
     * Code's yardstick line.
     *
     * The frame is drawn before any number arrives — the cells keep their
     * geometry and show a skeleton — so the page never shifts under the pointer
     * when the roll-up lands. A figure the source cannot answer is a dash, not a
     * zero and not a skeleton: the skeleton means "still loading", which a
     * missing figure is not.
     *
     * @returns `{ view(data) }`, where `data` is `homePanelData`'s answer.
     */
    function createHomeOverview() {
      function statCell(key, label, text, skeleton) {
        return React.createElement(
          'div',
          { key: key, className: 'dsh-claude-home-stat', 'data-stat': key, 'data-skeleton': skeleton ? '' : undefined },
          React.createElement('span', { className: 'dsh-claude-home-stat-label' }, label),
          React.createElement('span', { className: 'dsh-claude-home-stat-value', title: skeleton ? undefined : text }, skeleton ? '' : text),
        )
      }

      /** Columns at each end of the grid whose tip pill lines up with its cell's outer edge. */
      var HOME_TIP_EDGE = 3

      /**
       * A heat cell's tip, Claude Code's own: the day and its messages,
       * "Sep 9 — 15,955". The session list's fallback has no per-day message
       * count, so its cells name their tokens instead.
       */
      function heatTip(format, cell) {
        var date = homeShortDate(format, cell.date)
        if (cell.messages !== null) return date + ' — ' + formatHomeCount(cell.messages)
        return copyLabel('homeHeatTipTokens', '{date} — {tokens} tokens', { date: date, tokens: formatHomeTokens(cell.tokens) })
      }

      function view(data) {
        var skeleton = !data.known
        var format = homeShortDateFormat()
        var columns = Math.ceil(data.grid.cells.length / 7)
        return React.createElement(
          React.Fragment,
          null,
          React.createElement(
            'div',
            { className: 'dsh-claude-home-stats' },
            statCell('sessions', copyLabel('homeSessions', 'Sessions'), data.sessions === null ? '—' : formatHomeCount(data.sessions), skeleton),
            statCell('calls', copyLabel('homeCalls', 'Messages'), data.calls === null ? '—' : formatHomeCount(data.calls), skeleton),
            statCell('tokens', copyLabel('homeTokens', 'Total tokens'), formatHomeTokens(data.tokens), skeleton),
            statCell('days', copyLabel('homeActiveDays', 'Active days'), data.activeDays === null ? '—' : formatHomeCount(data.activeDays), skeleton),
            statCell('peak', copyLabel('homePeakHour', 'Peak hour'), data.peakHour === null ? '—' : data.peakHour, skeleton),
            statCell('model', copyLabel('homeTopModel', 'Favorite model'), data.model === null ? '—' : data.model, skeleton),
          ),
          React.createElement(
            'div',
            { className: 'dsh-claude-home-heat', 'data-skeleton': data.known ? undefined : '' },
            data.grid.cells.map(function (cell, index) {
              var tip = skeleton ? undefined : heatTip(format, cell)
              var column = Math.floor(index / 7)
              return React.createElement('span', {
                key: cell.date,
                className: 'dsh-claude-home-heat-cell',
                'data-level': cell.level,
                'data-tip': tip,
                'aria-label': tip,
                // The pill is centred on its cell, except near the grid's two
                // ends, where it lines up with the cell's outer edge and stays
                // inside the panel.
                'data-edge': column < HOME_TIP_EDGE ? 'start' : column >= columns - HOME_TIP_EDGE ? 'end' : undefined,
              })
            }),
          ),
          data.fun === null ? null : React.createElement('span', { className: 'dsh-claude-home-fun' }, data.fun),
        )
      }

      return { view: view }
    }
