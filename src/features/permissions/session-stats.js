    /**
     * Session-stats card: the composer's merged time/usage sentence and the
     * combined popover it opens.
     *
     * Split out of installPermissions (src/features/permissions/permissions.js); this
     * fragment is the stats half of that feature. It takes no options: the card
     * reads no cross-feature handle — its only external reads are module-level
     * (readPrefs, AUTO_POPOVER_ALL, POPOVER_CLOSE_DELAY, removeStrayNodes).
     *
     * @returns { sync, close, teardown }.
     */
    function createSessionStats() {
        var statsPopover = null
        var statsHideTimer = null
        /** Identity of the stats bindings THIS generation installed (see bindStatsHover). */
        var statsBindingToken = {}
        /**
         * The stats row's host mode, stamped by syncStatsSummary. The host keeps
         * the performanceUsage preference in its React state and never puts it
         * on the DOM, so the stylesheet and the hover binding read this marker.
         */
        var STATS_MODE_ATTR = 'data-dsh-claude-stats-mode'

        /** The host's stats root, or null when this conversation has no row. */
        function statsRoot() {
          return document.querySelector('[data-composer-stats]')
        }

        /**
         * Merge the host's time and usage pills into one compact sentence and
         * write it into CSS variables. The host keeps ownership of the data and
         * the two click targets; CSS hides its icons/labels and renders the
         * combined text, so React never sees its own DOM rewritten.
         */
        function statsEscape(value) {
          return String(value === void 0 || value === null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
        }

        function statsRowsFrom(panel) {
          var rows = []
          if (panel === null) return rows
          var dts = panel.querySelectorAll('dt')
          for (var i = 0; i < dts.length; i++) {
            var dd = dts[i].nextElementSibling
            rows.push({
              label: (dts[i].textContent || '').trim(),
              value: dd === null ? '' : (dd.textContent || '').trim(),
            })
          }
          return rows
        }

        /** How long one pill's panel may take to mount (the host commits on its own schedule). */
        var STATS_PANEL_POLL_MS = 25
        var STATS_PANEL_ATTEMPTS = 32
        /** When a click is repeated inside that window, and how often. */
        var STATS_PANEL_REPRESS_AT = 12
        var STATS_PANEL_REPRESS_MAX = 2
        /** How often a read that could not open a panel is retried, and after what delay. */
        var STATS_READ_RETRIES = 1
        var STATS_RETRY_MS = 120
        /** How long after a short card the one late re-read runs. */
        var STATS_FILL_MS = 700

        /** The stats panel that is open right now, with the kind its own marker names. */
        function openStatsPanel() {
          var details = document.querySelector('[data-session-stats-details]')
          if (details !== null) {
            var detailsDialog = details.closest('[role="dialog"]')
            if (detailsDialog !== null) return { kind: 'details', panel: detailsDialog }
          }
          var usage = document.querySelector('[data-session-stats-usage]')
          if (usage !== null) {
            var usageDialog = usage.closest('[role="dialog"]')
            if (usageDialog !== null) return { kind: 'usage', panel: usageDialog }
          }
          return null
        }

        /** The row's pill buttons as they are right now (the host replaces them on re-render). */
        function statsPillAt(index) {
          var root = statsRoot()
          if (root === null) return null
          var buttons = root.querySelectorAll('button')
          return index < buttons.length ? buttons[index] : null
        }

        /**
         * Open one pill, read whichever stats panel it shows, and close it again.
         *
         * The read is kind-agnostic on purpose: which panel appears is the host's
         * own answer, so a pill is never mislabelled by its label text (the timing
         * pill's label carries a tok/s reading as well, and the timing pill is a
         * plain span — no trigger at all — while the session has no timing yet).
         * The panel counts only while that pill reports itself expanded, so a
         * sibling's panel that has not unmounted yet is never read as this one's.
         * The pill is re-resolved from the DOM at every step and pressed again
         * while the window lasts: the host re-renders the row on its own schedule,
         * and a click on a node it has since replaced goes nowhere. `null` means
         * the row has no such pill; a pill that shows no panel inside the window
         * reports a failure, which is not an absent section.
         */
        function readStatsPill(index, done) {
          var presses = 0
          function press() {
            var pill = statsPillAt(index)
            if (pill === null) return false
            if (pill.getAttribute('aria-expanded') !== 'true') pill.click()
            return true
          }
          if (!press()) { done(null); return }
          var attempts = 0
          function read() {
            var pill = statsPillAt(index)
            if (pill === null) { done({ failed: true, rows: [] }); return }
            var open = pill.getAttribute('aria-expanded') === 'true' ? openStatsPanel() : null
            if (open === null && attempts < STATS_PANEL_ATTEMPTS) {
              attempts += 1
              if (attempts === STATS_PANEL_REPRESS_AT && presses < STATS_PANEL_REPRESS_MAX) {
                presses += 1
                press()
              }
              setTimeout(read, STATS_PANEL_POLL_MS)
              return
            }
            if (pill.getAttribute('aria-expanded') === 'true') pill.click()
            if (open === null) { done({ failed: true, rows: [] }); return }
            done({ kind: open.kind, title: open.panel.getAttribute('aria-label') || '', rows: statsRowsFrom(open.panel) })
          }
          setTimeout(read, STATS_PANEL_POLL_MS)
        }

        /**
         * Read both of the host's pills.
         *
         * `done(sections, incomplete)`: the sections in the host's own order
         * (session statistics, then token usage), and `incomplete` true when a
         * pill the row carries could not be read — the caller must not mistake
         * that for a section the host does not have.
         */
        function collectStatsData(done) {
          if (statsRoot() === null) { done([], false); return }
          readStatsPill(0, function (first) {
            readStatsPill(1, function (second) {
              var reads = [first, second]
              var sections = []
              var incomplete = false
              for (var i = 0; i < reads.length; i++) {
                var read = reads[i]
                if (read === null) continue
                if (read.failed === true || read.rows.length === 0) {
                  incomplete = true
                  continue
                }
                sections.push(read)
              }
              sections.sort(function (a, b) {
                return (a.kind === 'details' ? 0 : 1) - (b.kind === 'details' ? 0 : 1)
              })
              done(sections, incomplete)
            })
          })
        }

        function ensureStatsPopover() {
          if (statsPopover !== null) return statsPopover
          statsPopover = document.createElement('div')
          statsPopover.className = 'dsh-claude-stats-popover'
          statsPopover.setAttribute('data-open', 'false')
          statsPopover.addEventListener('mouseenter', function () {
            if (statsHideTimer) {
              clearTimeout(statsHideTimer)
              statsHideTimer = null
            }
          })
          statsPopover.addEventListener('mouseleave', scheduleHideStatsPopover)
          document.body.appendChild(statsPopover)
          return statsPopover
        }

        function hideStatsPopover() {
          if (statsPopover !== null) statsPopover.setAttribute('data-open', 'false')
        }

        /**
         * Drop stats cards left behind by a previous client generation.
         *
         * Client HMR drops the old fiber's disposals, so the teardown never runs:
         * the previous generation's card stays in <body> holding its last content
         * and `data-open="true"` — a second, frozen popover sitting beside the
         * live one (which is why the two read differently: the stale card shows
         * whatever sections it was last rendered with). The model picker and the
         * account footer sweep their own strays the same way; the stats card was
         * the one that did not.
         */
        function sweepStrayStatsPopovers() {
          removeStrayNodes(document, 'body > .dsh-claude-stats-popover', [statsPopover])
        }

        function scheduleHideStatsPopover() {
          if (statsHideTimer) clearTimeout(statsHideTimer)
          statsHideTimer = setTimeout(function () {
            statsHideTimer = null
            hideStatsPopover()
          }, POPOVER_CLOSE_DELAY)
        }

        function renderStatsPopover(sections) {
          var pop = ensureStatsPopover()
          var html = '<div class="dsh-claude-stats-popover-body">'
          for (var sIndex = 0; sIndex < sections.length; sIndex++) {
            var section = sections[sIndex]
            if (section.rows.length === 0) continue
            if (section.title) html += '<div class="dsh-claude-stats-popover-section">' + statsEscape(section.title) + '</div>'
            html += '<div class="dsh-claude-stats-popover-grid">'
            for (var r = 0; r < section.rows.length; r++) {
              html += '<div class="dsh-claude-stats-popover-item">'
                + '<div class="dsh-claude-stats-popover-label">' + statsEscape(section.rows[r].label) + '</div>'
                + '<div class="dsh-claude-stats-popover-value">' + statsEscape(section.rows[r].value) + '</div>'
                + '</div>'
            }
            html += '</div>'
          }
          html += '</div>'
          pop.innerHTML = html
        }

        /** Whether the card is up, so a failed re-read can leave its content alone. */
        function isStatsPopoverOpen() {
          return statsPopover !== null && statsPopover.getAttribute('data-open') === 'true'
        }

        /** How many sections the card currently shows. */
        var renderedSections = 0

        /** Place the card above the stats row, clamped to the viewport. */
        function placeStatsPopover(anchor) {
          var pop = ensureStatsPopover()
          var live = statsRoot() || anchor
          if (live === null) return
          var rect = live.getBoundingClientRect()
          var width = pop.offsetWidth
          var height = pop.offsetHeight
          var left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8))
          var top = Math.max(8, rect.top - height - 8)
          pop.style.left = left + 'px'
          pop.style.top = top + 'px'
        }

        function showStatsSections(anchor, sections) {
          renderStatsPopover(sections)
          renderedSections = sections.length
          // One card at a time, and this is the moment the card is really up: the
          // read above can come back short or late, and the other popover must not
          // fold for a card that never appears.
          closeOtherPopovers('stats')
          ensureStatsPopover().setAttribute('data-open', 'true')
          placeStatsPopover(anchor)
        }

        function showStatsPopover(anchor) {
          // The card reads the host's two dialogs, which only the detailed row
          // renders. A compact row has no trigger and no panel, so a hover or a
          // click there must not start a read.
          var modeRoot = statsRoot() || anchor
          if (modeRoot === null || modeRoot.getAttribute(STATS_MODE_ATTR) !== 'detailed') return
          if (statsHideTimer) {
            clearTimeout(statsHideTimer)
            statsHideTimer = null
          }
          readStatsCard(anchor, 0)
        }

        /**
         * Collect the host's panels and render the card.
         *
         * A read that could not open one of the panels is retried, and one that
         * still comes back short while the card is already up leaves the card as
         * it is: the host's panels mount on its own commit, so a read that lost
         * the race must never read as a section the host does not have — that was
         * the 'click and it drops to Token usage only' card. A card that did come
         * up short schedules one late re-read, which fills it in and never
         * shrinks it.
         */
        function readStatsCard(anchor, attempt) {
          collectStatsData(function (sections, incomplete) {
            if (sections.length === 0) return
            if (incomplete && attempt < STATS_READ_RETRIES) {
              setTimeout(function () { readStatsCard(anchor, attempt + 1) }, STATS_RETRY_MS)
              return
            }
            if (incomplete && isStatsPopoverOpen()) return
            showStatsSections(anchor, sections)
            if (incomplete) setTimeout(function () { fillStatsCard(anchor) }, STATS_FILL_MS)
          })
        }

        /** One late re-read for a card that came up short; it only ever adds. */
        function fillStatsCard(anchor) {
          collectStatsData(function (sections, incomplete) {
            if (incomplete || sections.length === 0) return
            if (!isStatsPopoverOpen()) return
            if (sections.length <= renderedSections) return
            showStatsSections(anchor, sections)
          })
        }

        function bindStatsHover(root) {
          // Generation-scoped, not a plain boolean: the host owns the stats node
          // and reuses it across a client HMR reload, so a boolean left by the
          // previous generation made this one skip binding entirely — the OLD
          // closure kept serving the card (its content, its stale node) while this
          // generation's listeners never existed.
          if (root.__dshStatsHoverToken === statsBindingToken) return
          root.__dshStatsHoverToken = statsBindingToken
          var openTimer = null
          function cancelOpen() {
            if (openTimer) {
              clearTimeout(openTimer)
              openTimer = null
            }
          }
          // Hover still opens the card under "All" — the setting promises exactly
          // that — but only after a deliberate dwell: the stats sentence sits in
          // the MIDDLE of the composer row, so a pointer on its way from the
          // permission selector to the model trigger used to unfold the card on
          // the way past. A passing pointer never stays the dwell out; a pointer
          // the user actually parked there does.
          root.addEventListener('mouseenter', function () {
            cancelOpen()
            if (readPrefs().autoPopover !== AUTO_POPOVER_ALL) return
            openTimer = setTimeout(function () {
              openTimer = null
              showStatsPopover(root)
            }, 300)
          })
          root.addEventListener('mouseleave', function () {
            cancelOpen()
            // Unconditional, unlike the open side: a card opened by CLICK has to
            // close when the pointer leaves, whatever the hover switch says.
            scheduleHideStatsPopover()
          })
          // The host's own stats dialogs are hidden by the stylesheet, so a click
          // has to land somewhere: it opens this card — the only stats surface
          // left when the hover switch is off or scoped to the account rail.
          //
          // Only a REAL click counts. Collecting the card's content means clicking
          // the host's two pills to open their dialogs, and those synthetic clicks
          // bubble back up to this listener: re-entering the collection from
          // inside itself made two reads race, which is why sections went missing
          // (the card kept flipping between "会话统计 + Token 用量" and "Token 用量"
          // alone) and why the card stopped closing — every re-entry cancelled the
          // pending hide.
          root.addEventListener('click', function (event) {
            if (event && event.isTrusted === false) return
            cancelOpen()
            showStatsPopover(root)
          })
        }

        /**
         * Whether the host rendered its DETAILED statistics row.
         *
         * The host keeps the performanceUsage mode in React state and puts no
         * marker on the DOM, so the two structures have to be told apart by
         * shape. Detailed wraps each pill in an anchor span and, when a pill
         * has dialog rows, makes it a button[aria-haspopup="dialog"]; its open
         * dialogs carry the data-session-stats-* markers. Compact renders bare
         * span pills (icon + reading) directly under the root, with no trigger
         * and no panel. The wrapper check catches the detailed pill whose
         * dialog has no rows yet — a static span, not a button — so the two
         * modes never collapse onto one another.
         */
        function hostStatsDetailed(root) {
          if (root.querySelector('button[aria-haspopup="dialog"]') !== null) return true
          if (document.querySelector('[data-session-stats-details], [data-session-stats-usage]') !== null) return true
          var children = root.children
          for (var i = 0; i < children.length; i++) {
            if (children[i].querySelector('button, span') !== null) return true
          }
          return false
        }

        function syncStatsSummary() {
          var root = statsRoot()
          if (root === null) return
          var mode = hostStatsDetailed(root) ? 'detailed' : 'compact'
          if (root.getAttribute(STATS_MODE_ATTR) !== mode) root.setAttribute(STATS_MODE_ATTR, mode)
          if (mode === 'compact') {
            // The host draws its own icon readings with its own spacing, and
            // there is no trigger to open and no panel data to read: leave the
            // row alone and close any card a detailed session left up.
            hideStatsPopover()
            return
          }
          var buttons = root.querySelectorAll('button')
          var timeText = ''
          var usageText = ''
          for (var i = 0; i < buttons.length; i++) {
            var button = buttons[i]
            var aria = button.getAttribute('aria-label') || ''
            var parts = aria.split(' · ')
            var isTime = /轮|步|turns?|steps?/i.test(aria)
            if (isTime) {
              var counts = (parts[0] || '').match(/\d[\d,]*/g) || []
              var turns = counts[0] || '0'
              var steps = counts[1] || '0'
              var tps = (parts[1] || '').match(/([\d.,]+[KMB]?)\s*tok\/s/i)
              timeText = turns + '轮' + steps + '步' + (tps ? ' · ' + tps[1] + 'tok/s' : '')
            } else {
              var total = (parts[0] || '').match(/([\d.,]+[KMB]?)\s*tok/i)
              var cache = (parts[1] || '').match(/([\d.]+)\s*%/)
              usageText = (total ? total[1] + ' tok' : (parts[0] || '')) + (cache ? ' · ' + cache[1] + '% Cache' : '')
            }
          }
          if (buttons.length === 1) {
            var only = timeText || usageText
            timeText = only
            usageText = only
          }
          // content: var(...) needs a quoted <string>; an unquoted token stream
          // is invalid and computes to `none`.
          root.style.setProperty('--dsh-stats-time', JSON.stringify(timeText))
          root.style.setProperty('--dsh-stats-usage', JSON.stringify(usageText))
          bindStatsHover(root)
        }

        registerPopover('stats', hideStatsPopover)

        return {
            /** Re-sweep strays left by a previous generation, then refresh the sentence. */
            sync: function () {
                sweepStrayStatsPopovers()
                syncStatsSummary()
            },
            /** Close the card (composer focus). */
            close: hideStatsPopover,
            /** Remove the card and its hide timer. */
            teardown: function () {
                unregisterPopover('stats')
                if (statsHideTimer) {
                    clearTimeout(statsHideTimer)
                    statsHideTimer = null
                }
                if (statsPopover !== null && statsPopover.parentElement !== null) statsPopover.parentElement.removeChild(statsPopover)
                statsPopover = null
                // Hand the host node back unmarked: the mode attribute and the
                // sentence variables are ours.
                var root = statsRoot()
                if (root !== null) {
                    root.removeAttribute(STATS_MODE_ATTR)
                    root.style.removeProperty('--dsh-stats-time')
                    root.style.removeProperty('--dsh-stats-usage')
                }
            }
        }
    }
