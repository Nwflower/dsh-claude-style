    /**
     * Search: a box in the sidebar's brand row that opens a palette over the
     * window, the way Claude's sidebar search does.
     *
     * The box sits in the host's logo row beside the brand and replaces it only
     * while the pointer is over the sidebar (search.css); it is placed only
     * where the row carries the wide brand, so the collapsed rail keeps its
     * expand toggle. The palette is the host's own `Modal` (ui-primitives):
     * the host's mask, focus return and modal layer, so while it is open the
     * host's shortcuts treat it as the foreground dialog, and Esc closes it.
     * The skin fills the modal's card with its own rows (sources.js).
     * docs/architecture.md D22.
     *
     * @param ctx - client context.
     * @param ui - shared handle table.
     * @returns teardown.
     */
    function installSearch(ctx, ui) {
      const primitives = require('@deepseek-ai/dsh-client-ui-primitives')
      const reactDom = require('react-dom/client')
      const sources = createSearchSources(ctx)
      const FILTERS = [
        { id: 'all', key: 'searchFilterAll', fallback: 'All' },
        { id: 'session', key: 'searchFilterSessions', fallback: 'Sessions' },
        { id: 'project', key: 'searchFilterProjects', fallback: 'Projects' },
        { id: 'plugin', key: 'searchFilterPlugins', fallback: 'Plugins' },
        { id: 'skill', key: 'searchFilterSkills', fallback: 'Skills' },
        { id: 'shortcut', key: 'searchFilterShortcuts', fallback: 'Shortcuts' }
      ]
      /** Pause between the latest keystroke and a content-index request, as the host's sidebar search waits. */
      const CONTENT_DEBOUNCE_MS = 250
      const SVG_OPEN = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      const ICONS = {
        search: `${SVG_OPEN}<circle cx="7" cy="7" r="4.5"/><path d="M10.4 10.4 13.5 13.5"/></svg>`,
        session: `${SVG_OPEN}<path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5M9.2 3 6.8 13"/></svg>`,
        project: `${SVG_OPEN}<path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.6l1.4 1.5h5A1.5 1.5 0 0 1 14 6v5.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5z"/></svg>`,
        plugin: `${SVG_OPEN}<rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="9" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="2.5" y="9" width="4.5" height="4.5" rx="1"/><rect x="9" y="9" width="4.5" height="4.5" rx="1"/></svg>`,
        skill: `${SVG_OPEN}<path d="M8 2.5 9.3 6.7 13.5 8 9.3 9.3 8 13.5 6.7 9.3 2.5 8 6.7 6.7z"/></svg>`,
        shortcut: `${SVG_OPEN}<rect x="1.5" y="4" width="13" height="8" rx="1.5"/><path d="M4.2 6.6h.1M6.7 6.6h.1M9.2 6.6h.1M11.7 6.6h.1M4.8 9.4h6.4"/></svg>`,
        newSession: `${SVG_OPEN}<circle cx="8" cy="8" r="6"/><path d="M8 5.5v5M5.5 8h5"/></svg>`,
        settings: `${SVG_OPEN}<path d="M2.5 5h6.2M11.8 5h1.7M2.5 11h1.7M7.3 11h6.2"/><circle cx="10.2" cy="5" r="1.5"/><circle cx="5.8" cy="11" r="1.5"/></svg>`,
        close: `${SVG_OPEN}<path d="M4 4l8 8M12 4l-8 8"/></svg>`,
        enter: `${SVG_OPEN}<path d="M13 3.5v4a2 2 0 0 1-2 2H3.5M6 7 3.5 9.5 6 12"/></svg>`
      }

      /** The sidebar box, and the logo row it was placed in. */
      let trigger = null
      const rowStamp = createStamp('data-dsh-claude-search-row')
      /** The React root the host's Modal renders from, and its container. */
      let modalRoot = null
      /**
       * `isOpen` while the palette takes input; `closing` while it fades out,
       * still mounted. The row picked on the way out runs once the modal is
       * gone, so its navigation gets the keyboard after the modal hands focus
       * back.
       */
      let isOpen = false
      let closing = false
      let closeTimer = 0
      let pendingRun = null
      /** The fade-out's length (search.css `dsh-claude-search-out`). */
      const CLOSE_MS = 140
      /** The modal's overlay root, marked while it fades out. */
      const closingStamp = createStamp('data-dsh-claude-search-closing')
      /** The host's own sidebar search, which the palette stands in for. */
      const HOST_SEARCH = '[data-slot="sidebar"] [class*="_searchSlot"]'
      /** The palette's own nodes while it is open; `card` is the div the modal hands over. */
      let card = null
      let input = null
      let filterBar = null
      let list = null
      const filterPill = createSlidingPill('[aria-checked="true"]')
      let query = ''
      let filter = 'all'
      /** Every selectable row on screen, in order, and the highlighted one's index. */
      let rows = []
      let active = 0
      /** The content index's hits for `contentQuery`; the request in flight and its timer. */
      let contentHits = []
      let contentQuery = ''
      let contentAbort = null
      let contentTimer = 0
      let disposed = false

      function buildTrigger() {
        const button = buildElement('button', 'dsh-claude-search-trigger')
        button.type = 'button'
        const icon = buildElement('span', 'dsh-claude-search-trigger-icon')
        icon.innerHTML = ICONS.search
        button.appendChild(icon)
        button.appendChild(buildElement('span', 'dsh-claude-search-trigger-label'))
        button.appendChild(buildElement('span', 'dsh-claude-search-keys'))
        button.addEventListener('click', event => {
          event.preventDefault()
          event.stopPropagation()
          openPalette()
        })
        return button
      }

      function syncTrigger() {
        const brand = document.querySelector('[data-slot="sidebar"] [class*="_logoRow"] > [class*="_brand"]')
        const row = brand === null ? null : brand.parentElement
        if (row === null) {
          if (trigger !== null && trigger.parentElement !== null) trigger.parentElement.removeChild(trigger)
          rowStamp.release()
          return
        }
        if (trigger === null) trigger = buildTrigger()
        if (trigger.parentElement !== row) row.insertBefore(trigger, brand.nextSibling)
        rowStamp.mark(row)
        const label = copyLabel('searchPlaceholder', 'Search')
        const text = trigger.children[1]
        if (text.textContent !== label) text.textContent = label
        if (trigger.getAttribute('aria-label') !== label) trigger.setAttribute('aria-label', label)
        syncTriggerKeys(trigger.children[2])
      }

      /**
       * The host's search shortcut on the box's right, as the palette's action
       * rows show theirs; it follows a rebinding, and a shortcut left unbound
       * shows no caps.
       */
      let triggerKeys = null
      function syncTriggerKeys(group) {
        const shortcuts = ctx.get('shortcuts')
        let keys = []
        if (shortcuts) {
          const rows = shortcuts.catalog.getSnapshot()
          for (let i = 0; i < rows.length; i++) {
            if (rows[i].id === 'session.search') keys = rows[i].keys.filter(key => key !== '+')
          }
        }
        const joined = keys.join('\n')
        if (joined === triggerKeys && group.childNodes.length === keys.length) return
        triggerKeys = joined
        while (group.firstChild) group.removeChild(group.firstChild)
        for (let k = 0; k < keys.length; k++) group.appendChild(buildElement('kbd', 'dsh-claude-search-key', keys[k]))
      }

      function sync() {
        syncTrigger()
      }

      /**
       * The host's search shortcut (Ctrl+K) and its rail button end in its own
       * sidebar search taking focus; search.css keeps that control out of
       * sight, and the palette opens in its place. The host's search is then
       * folded back through its own clear button, which exists once the
       * expanded state has rendered — a frame or two after the first focus.
       */
      function onFocusIn(target) {
        if (target.tagName !== 'INPUT' || target.closest(HOST_SEARCH) === null) return
        target.blur()
        if (isOpen) input.focus()
        else openPalette()
        foldHostSearch(3)
      }

      function foldHostSearch(tries) {
        requestAnimationFrame(() => {
          if (disposed) return
          const clear = document.querySelector(`${HOST_SEARCH} [class*="_clearButton"]`)
          if (clear !== null) {
            clear.click()
            return
          }
          if (tries > 1) foldHostSearch(tries - 1)
        })
      }

      // ---------- the palette ----------

      function renderModal() {
        if (modalRoot === null) modalRoot = reactDom.createRoot(document.createElement('div'))
        modalRoot.render(React.createElement(primitives.Modal, {
          open: isOpen || closing,
          onClose: closePalette,
          title: copyLabel('searchPlaceholder', 'Search'),
          headless: true,
          shortcutModal: 'dsh-claude-search',
          className: 'dsh-claude-search-dialog',
        }, React.createElement('div', { className: 'dsh-claude-search', ref: adoptCard })))
      }

      /**
       * The modal mounts its card on open and drops it on close; the skin's
       * nodes are built into it when it appears. React renders the div with no
       * children, so it never touches what the skin puts inside.
       */
      function adoptCard(element) {
        if (element === null) {
          filterPill.sync(null)
          card = null
          input = null
          filterBar = null
          list = null
          return
        }
        if (element === card) return
        card = element
        buildPalette()
        render()
        input.focus()
      }

      function buildPalette() {
        const head = buildElement('div', 'dsh-claude-search-head')
        input = buildElement('input', 'dsh-claude-search-input')
        input.type = 'text'
        input.spellcheck = false
        input.setAttribute('autocomplete', 'off')
        input.setAttribute('data-modal-autofocus', '')
        input.placeholder = copyLabel('searchPlaceholder', 'Search')
        input.value = query
        input.addEventListener('input', () => {
          if (!isOpen) return
          query = input.value
          active = 0
          scheduleContentSearch()
          render()
        })
        input.addEventListener('keydown', onKeyDown)
        head.appendChild(input)
        const close = buildElement('button', 'dsh-claude-search-close')
        close.type = 'button'
        close.setAttribute('aria-label', copyLabel('searchClose', 'Close'))
        close.innerHTML = ICONS.close
        close.addEventListener('click', closePalette)
        head.appendChild(close)
        card.appendChild(head)

        filterBar = buildElement('div', 'dsh-claude-search-filters')
        filterBar.setAttribute('role', 'radiogroup')
        for (let i = 0; i < FILTERS.length; i++) {
          const chip = buildElement('button', 'dsh-claude-search-filter', copyLabel(FILTERS[i].key, FILTERS[i].fallback))
          chip.type = 'button'
          chip.tabIndex = -1
          chip.setAttribute('role', 'radio')
          chip.setAttribute('data-filter', FILTERS[i].id)
          chip.addEventListener('click', () => {
            setFilter(FILTERS[i].id)
            input.focus()
          })
          filterBar.appendChild(chip)
        }
        card.appendChild(filterBar)

        list = buildElement('div', 'dsh-claude-search-list')
        list.setAttribute('role', 'listbox')
        card.appendChild(list)

        const foot = buildElement('div', 'dsh-claude-search-foot')
        foot.appendChild(footHint(copyLabel('searchClose', 'Close'), ['Esc']))
        foot.appendChild(footHint(copyLabel('searchFilterHint', 'Filters'), ['Tab']))
        foot.appendChild(footHint(copyLabel('searchOpenHint', 'Open'), ['↵']))
        card.appendChild(foot)
      }

      function footHint(text, keys) {
        const hint = buildElement('span', 'dsh-claude-search-hint', text)
        hint.appendChild(keycaps(keys))
        return hint
      }

      /** One cap per key; the host's key lists carry `+` between the keys of a chord, which the caps' spacing already says. */
      function keycaps(keys) {
        const group = buildElement('span', 'dsh-claude-search-keys')
        for (let i = 0; i < keys.length; i++) {
          if (keys[i] !== '+') group.appendChild(buildElement('kbd', 'dsh-claude-search-key', keys[i]))
        }
        return group
      }

      function setFilter(next) {
        if (next === filter) return
        filter = next
        active = 0
        scheduleContentSearch()
        render()
      }

      function stepFilter(delta) {
        let index = 0
        for (let i = 0; i < FILTERS.length; i++) {
          if (FILTERS[i].id === filter) index = i
        }
        setFilter(FILTERS[(index + delta + FILTERS.length) % FILTERS.length].id)
      }

      function onKeyDown(event) {
        if (!isOpen || event.isComposing || event.keyCode === 229) return
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          if (rows.length === 0) return
          active = (active + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length
          paintActive(true)
          return
        }
        if (event.key === 'Tab') {
          // Before the modal's own Tab trap, which leaves a handled key alone.
          event.preventDefault()
          stepFilter(event.shiftKey ? -1 : 1)
          return
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          if (!event.repeat && rows[active] !== undefined) pick(rows[active])
        }
      }

      /** The trimmed query the sources read. */
      function currentQuery() {
        return query.trim()
      }

      /**
       * Ask the content index once the typing pauses; only the sessions view
       * and the all view list its hits.
       */
      function scheduleContentSearch() {
        const q = currentQuery()
        const wanted = q !== '' && (filter === 'all' || filter === 'session')
        if (wanted && q === contentQuery) return
        window.clearTimeout(contentTimer)
        if (contentAbort !== null) contentAbort.abort()
        contentAbort = null
        contentHits = []
        contentQuery = ''
        if (!wanted) return
        contentTimer = window.setTimeout(() => {
          const controller = new AbortController()
          contentAbort = controller
          sources.searchContent(q, controller.signal).then(hits => {
            if (controller.signal.aborted) return
            contentHits = hits
            contentQuery = q
            render()
          }, reason => {
            if (controller.signal.aborted) return
            // A deployment can switch the index off; the title matches stand
            // alone, and the list stops saying it is still searching.
            console.warn('dsh-claude-style: session content search failed:', reason)
            contentHits = []
            contentQuery = q
            render()
          })
        }, CONTENT_DEBOUNCE_MS)
      }

      function buildRow(row, index) {
        const item = buildElement('div', 'dsh-claude-search-item')
        item.setAttribute('role', 'option')
        item.setAttribute('data-kind', row.kind)
        item.setAttribute('data-index', String(index))
        const icon = buildElement('span', 'dsh-claude-search-item-icon')
        if (row.image) {
          const image = buildElement('img', 'dsh-claude-search-item-image')
          image.alt = ''
          image.src = row.image
          icon.appendChild(image)
        } else {
          icon.innerHTML = ICONS[row.icon || row.kind]
        }
        item.appendChild(icon)
        const text = buildElement('span', 'dsh-claude-search-item-text')
        const line = buildElement('span', 'dsh-claude-search-item-line')
        line.appendChild(buildElement('span', 'dsh-claude-search-item-name', row.title))
        if (row.detail) line.appendChild(buildElement('span', 'dsh-claude-search-item-detail', row.detail))
        text.appendChild(line)
        if (row.snippet) text.appendChild(buildElement('span', 'dsh-claude-search-item-snippet', row.snippet))
        item.appendChild(text)
        if (row.keys && row.keys.length > 0) item.appendChild(keycaps(row.keys))
        const enter = buildElement('span', 'dsh-claude-search-item-enter')
        enter.innerHTML = ICONS.enter
        item.appendChild(enter)
        item.addEventListener('mousemove', () => {
          if (active === index) return
          active = index
          paintActive(false)
        })
        item.addEventListener('click', () => pick(row))
        return item
      }

      function paintActive(reveal) {
        if (list === null) return
        const items = list.querySelectorAll('.dsh-claude-search-item')
        for (let i = 0; i < items.length; i++) {
          const on = i === active
          if (items[i].hasAttribute('data-active') !== on) items[i].toggleAttribute('data-active', on)
          if (on && reveal) items[i].scrollIntoView({ block: 'nearest' })
        }
      }

      function render() {
        if (card === null) return
        for (let i = 0; i < filterBar.children.length; i++) {
          const chip = filterBar.children[i]
          const on = chip.getAttribute('data-filter') === filter
          if (chip.getAttribute('aria-checked') !== String(on)) chip.setAttribute('aria-checked', String(on))
        }
        filterPill.sync(filterBar)
        const q = currentQuery()
        const sections = sources.sections(q, filter, contentQuery === q ? contentHits : [])
        rows = []
        while (list.firstChild) list.removeChild(list.firstChild)
        for (let s = 0; s < sections.length; s++) {
          const section = sections[s]
          list.appendChild(buildElement('div', 'dsh-claude-search-section', section.title))
          for (let r = 0; r < section.rows.length; r++) {
            list.appendChild(buildRow(section.rows[r], rows.length))
            rows.push(section.rows[r])
          }
        }
        if (rows.length === 0) {
          const waiting = sources.pending(filter) || (q !== '' && contentQuery !== q && (filter === 'all' || filter === 'session'))
          list.appendChild(buildElement('div', 'dsh-claude-search-status', waiting ? copyLabel('searchLoading', 'Searching…') : copyLabel('searchEmpty', 'No results')))
        }
        if (active >= rows.length) active = Math.max(0, rows.length - 1)
        paintActive(true)
      }

      function pick(row) {
        closePalette(row.run)
      }

      function openPalette() {
        if (isOpen) return
        closeOtherPopovers('search')
        query = ''
        filter = 'all'
        active = 0
        contentHits = []
        contentQuery = ''
        sources.open(() => { if (isOpen) render() })
        isOpen = true
        if (closing) {
          // Reopened while fading out: the card is still mounted, so it is
          // reset in place instead of being built again. A row picked on the
          // way out still gets its navigation.
          const run = settleClose()
          closingStamp.release()
          if (run !== null) run()
          input.value = ''
          render()
          input.focus()
          return
        }
        renderModal()
      }

      /**
       * Fade the palette out, then unmount it.
       * @param then - a picked row's navigation, run once the modal is gone.
       */
      function closePalette(then) {
        if (!isOpen) return
        isOpen = false
        closing = true
        pendingRun = typeof then === 'function' ? then : null
        window.clearTimeout(contentTimer)
        if (contentAbort !== null) contentAbort.abort()
        contentAbort = null
        sources.close()
        closingStamp.mark(card === null || card.parentElement === null ? null : card.parentElement.parentElement)
        closeTimer = window.setTimeout(finishClose, CLOSE_MS)
      }

      /** End the fade and hand back the row still to run. */
      function settleClose() {
        window.clearTimeout(closeTimer)
        closing = false
        const run = pendingRun
        pendingRun = null
        return run
      }

      function finishClose() {
        const run = settleClose()
        renderModal()
        // After the modal has let go. The mark stays on until then: taken off
        // a mounted overlay, it would hand the card and the mask back their
        // entrance animations for the frame before the unmount. And the modal
        // hands focus back to where it came from as it unmounts, so the row's
        // own navigation (a composer, a page) takes the keyboard after that.
        requestAnimationFrame(() => {
          closingStamp.release()
          if (run !== null && !disposed) run()
        })
      }

      registerPopover('search', closePalette)

      ui.search = { sync, onFocusIn }

      return () => {
        disposed = true
        unregisterPopover('search')
        settleClose()
        closingStamp.release()
        window.clearTimeout(contentTimer)
        if (contentAbort !== null) contentAbort.abort()
        sources.close()
        filterPill.release()
        if (modalRoot !== null) {
          modalRoot.unmount()
          modalRoot = null
        }
        if (trigger !== null && trigger.parentElement !== null) trigger.parentElement.removeChild(trigger)
        trigger = null
        rowStamp.release()
        delete ui.search
      }
    }
