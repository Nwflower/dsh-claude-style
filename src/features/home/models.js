    /**
     * The panel's Models tab: Claude Code's own shape — a per-day stacked chart
     * over a ranked list of the models that spent those tokens.
     *
     * The chart stacks each day's per-model totals (the ledger's per-provider
     * split, or the fold's route attribution when the event names one), so a model's
     * colour is its rank in the list below: the biggest spender is the darkest
     * blue, the ramp walks down to grey, and the list's swatches repeat it. A day
     * whose samples are all unattributed draws no stack.
     *
     * The list is a rank, a name, the input and output sides of its tokens, and
     * its share of the models shown; past HOME_MODEL_ROWS rows it folds behind
     * one "show more" row, the way Claude Code's does, and the open list ends in
     * a "show less" row that folds it back. The chart keeps its own
     * HOME_CHART_DAYS window while the list follows the range pills, which is the
     * same split the Overview tab's heat grid already uses.
     *
     * @returns `{ component }`, a React component taking `{ data }`.
     */
    function createHomeModels() {
      /** One decimal of a percentage, as Claude Code writes it: "43.0%". */
      function share(part, whole) {
        return whole > 0 ? (Math.round(part / whole * 1000) / 10).toFixed(1) + '%' : '—'
      }

      /** The axis top: the peak rounded up to one significant step. */
      function axisMax(peak) {
        if (!(peak > 0)) return 0
        var magnitude = Math.pow(10, Math.floor(Math.log(peak) / Math.LN10))
        var scaled = peak / magnitude
        var step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10
        return step * magnitude
      }

      /**
       * One token count the way Claude Code's chart and list write it: one
       * decimal at most, a whole number without its ".0", and a lowercase k —
       * "109M", "4.4M", "963.6k". The unit is picked on the rounded value, so a
       * count just under a million reads "1M", never "1000k".
       */
      function compactTokens(count) {
        var value = Number(count) || 0
        var units = [[1e9, 'B'], [1e6, 'M'], [1e3, 'k']]
        for (var u = 0; u < units.length; u++) {
          var scaled = Math.round(value / units[u][0] * 10) / 10
          if (scaled >= 1) return String(scaled) + units[u][1]
        }
        return String(Math.round(value))
      }

      /** The four buckets' two sides, as the list writes them. */
      function sides(entry) {
        return {
          input: (entry.input || 0) + (entry.cacheRead || 0) + (entry.cacheWrite || 0),
          output: entry.output || 0,
        }
      }

      /** Whether the source carried the four buckets, or only one total. */
      function hasSplit(entry) {
        return entry.input !== undefined || entry.output !== undefined
          || entry.cacheRead !== undefined || entry.cacheWrite !== undefined
      }

      /** The palette's last step, for a model the ranked list does not carry. */
      var RANK_LAST = 7

      function chart(columns, rankOf, skeleton) {
        var peak = 0
        var list = columns === null ? [] : columns
        for (var c = 0; c < list.length; c++) {
          var total = 0
          var models = list[c].models
          for (var id in models) total += models[id]
          if (total > peak) peak = total
        }
        var top = axisMax(peak)
        var format = homeShortDateFormat()
        // Four gridlines plus the baseline, Claude Code's own ladder.
        var ticks = [1, 0.75, 0.5, 0.25, 0]
        return React.createElement(
          'div',
          { className: 'dsh-claude-home-chart', 'data-skeleton': skeleton ? '' : undefined },
          React.createElement(
            'div',
            { className: 'dsh-claude-home-chart-plot' },
            ticks.map(function (at) {
              return React.createElement(
                'span',
                { key: at, className: 'dsh-claude-home-chart-tick', style: { bottom: (at * 100) + '%' } },
                skeleton || top === 0 ? '' : compactTokens(top * at),
              )
            }),
            React.createElement(
              'div',
              { className: 'dsh-claude-home-chart-bars' },
              list.map(function (column) {
                var dayTotal = 0
                var stack = []
                var models = column.models
                for (var id in models) {
                  dayTotal += models[id]
                  var rank = rankOf[id]
                  stack.push({ id: id, tokens: models[id], rank: rank === undefined ? Number.MAX_VALUE : rank })
                }
                // Biggest first, so the darkest slice sits on the axis.
                stack.sort(function (left, right) { return left.rank - right.rank })
                // The column is the day's whole stack, sized against the axis top,
                // and each slice is its share of the day: both percentages then
                // resolve against a definite height, and the column's rounding
                // lands on the top of the stack.
                return React.createElement(
                  'span',
                  {
                    key: column.date,
                    className: 'dsh-claude-home-chart-col',
                    title: homeShortDate(format, column.date) + ' · ' + compactTokens(dayTotal),
                    style: { height: (top > 0 ? dayTotal / top * 100 : 0) + '%' },
                  },
                  stack.map(function (slice) {
                    return React.createElement('span', {
                      key: slice.id,
                      className: 'dsh-claude-home-chart-seg',
                      'data-rank': Math.min(slice.rank, RANK_LAST),
                      style: { height: (dayTotal > 0 ? slice.tokens / dayTotal * 100 : 0) + '%' },
                    })
                  }),
                )
              }),
            ),
          ),
          React.createElement(
            'div',
            { className: 'dsh-claude-home-chart-axis' },
            list.map(function (column, index) {
              // Every third column from the first, Claude Code's own cadence.
              var labelled = index % 3 === 0
              return React.createElement('span', { key: column.date, className: 'dsh-claude-home-chart-label' }, labelled ? homeShortDate(format, column.date) : '')
            }),
          ),
        )
      }

      function ModelsView(props) {
        var data = props.data
        var more = React.useState(false)
        var expanded = more[0]
        var setExpanded = more[1]
        var models = data.models
        var columns = data.modelDays
        var skeleton = !data.known
        if (models === null || models.length === 0) {
          if (data.listed !== null || !skeleton) {
            return React.createElement('div', { className: 'dsh-claude-home-models-empty' }, copyLabel('homeModelsEmpty', 'No model data yet'))
          }
          return React.createElement(
            React.Fragment,
            null,
            // The frame comes first, so the chart's height is reserved from the
            // first paint and the list does not jump when the numbers land.
            chart(null, {}, true),
            React.createElement(
              'div',
              { className: 'dsh-claude-home-models', 'data-skeleton': '' },
              [0, 1, 2].map(function (index) {
                return React.createElement(
                  'div',
                  { key: index, className: 'dsh-claude-home-model' },
                  React.createElement('span', { className: 'dsh-claude-home-model-swatch' }),
                  React.createElement('span', { className: 'dsh-claude-home-model-name' }, ''),
                  React.createElement('span', { className: 'dsh-claude-home-model-split' }, ''),
                  React.createElement('span', { className: 'dsh-claude-home-model-share' }, ''),
                )
              }),
            ),
          )
        }
        var total = 0
        var rankOf = {}
        for (var i = 0; i < models.length; i++) {
          total += models[i].tokens
          rankOf[models[i].id] = i
        }
        var shown = expanded ? models : models.slice(0, HOME_MODEL_ROWS)
        var hidden = models.length - shown.length
        return React.createElement(
          React.Fragment,
          null,
          columns === null && !skeleton ? null : chart(columns, rankOf, skeleton),
          React.createElement(
            'div',
            { className: 'dsh-claude-home-models' },
            shown.map(function (entry, rank) {
              var parts = sides(entry)
              return React.createElement(
                'div',
                {
                  key: entry.id,
                  className: 'dsh-claude-home-model',
                  title: entry.sessions === undefined
                    ? entry.id
                    : entry.id + ' · ' + copyLabel('homeModelSessions', '{count} sessions', { count: formatHomeCount(entry.sessions) }),
                },
                React.createElement('span', { className: 'dsh-claude-home-model-swatch', 'data-rank': Math.min(rank, RANK_LAST) }),
                React.createElement('span', { className: 'dsh-claude-home-model-name' }, entry.id),
                React.createElement(
                  'span',
                  { className: 'dsh-claude-home-model-split' },
                  hasSplit(entry)
                    ? compactTokens(parts.input) + ' in · ' + compactTokens(parts.output) + ' out'
                    : compactTokens(entry.tokens),
                ),
                React.createElement('span', { className: 'dsh-claude-home-model-share' }, share(entry.tokens, total)),
              )
            }),
            // The fold row turns into its own undo once the list is open.
            models.length <= HOME_MODEL_ROWS ? null : React.createElement(
              'button',
              {
                type: 'button',
                className: 'dsh-claude-home-models-more',
                'aria-expanded': expanded,
                onClick: function () { setExpanded(!expanded) },
              },
              expanded
                ? copyLabel('homeModelsLess', 'Show less')
                : copyLabel('homeModelsMore', 'Show {count} more', { count: hidden }),
            ),
          ),
        )
      }

      return { component: ModelsView }
    }
