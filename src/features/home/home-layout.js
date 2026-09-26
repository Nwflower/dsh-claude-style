    /**
     * The home page's second layout, and the usage panel that fills it.
     *
     * `classic` is the hero the skin has always drawn: brand mark and greeting
     * centred, composer under them, everything vertically centred in the scroll
     * body. `studio` is the dashboard form — the greeting moves to the top left,
     * the composer hugs the window's bottom edge, and the space between them
     * carries a usage panel. The two differ only in arrangement, so the switch
     * is one body attribute the stylesheet branches on; the host keeps owning the
     * hero's markup either way.
     *
     * The panel's own seat is `conversation.input.dock`, the host's list slot
     * rendered between the greeting and the composer card. It is the only seat in
     * the hero region that accepts a new entry (the brand mark, workspace and
     * preset seats are `single` and occupied), and it is scoped to a session, so
     * on the cold start screen — no session object yet — the host does not render
     * it at all. There the skin mounts the same panel itself: a React root on a
     * `display: contents` element of its own at the end of the hero stack, which
     * the stylesheet sorts into the dock's place. It goes away as soon as the
     * host renders the dock.
     *
     * This fragment is the shell: the seat registration, the head (the
     * Overview/Models tabs and the All/30d/7d range pills), the tab switch and
     * the teardown. The numbers behind it come from `features/home/data.js`,
     * and the two tabs render from `features/home/overview.js` and
     * `features/home/models.js`.
     *
     * @param ctx - client context.
     * @param ui - shared handle table.
     * @returns teardown.
     */
    function installHomeLayout(ctx, ui) {
      /** The host's list slot between the hero greeting and the composer card. */
      const DOCK_SLOT = 'conversation.input.dock'

      let layout = DEFAULT_HOME_LAYOUT
      /** Whether the last pass saw the new-conversation hero, as of that reading. */
      let lastHero = false
      /**
       * The yardstick book's draw. It is held here, not in the panel: the dock
       * seat keeps the panel mounted inside a conversation too, and the draw is
       * renewed each time the page comes back to the new-conversation hero.
       */
      let bookPick = Math.random()
      let slotsFiber = null
      const ReactDOM = require('react-dom/client')
      /** The cold start screen's panel: `{ stack, element, root }`, or null. */
      let coldSeat = null

      const usage = createHomeUsage(ctx)
      const overview = createHomeOverview()
      const models = createHomeModels()

      /**
       * Whether the page currently shows the new-conversation hero.
       *
       * The dock seat renders in both phases — the host puts it above the
       * composer inside a conversation too — so the layout alone is not enough:
       * the panel belongs to the home page, and only the hero phase is home. The
       * conversation root carries the phase (`data-phase="hero"`); the same
       * marker the composer feature reads, and the element test is qualified by
       * `_root` because the draft editor and the connection indicator carry a
       * `data-phase` of their own.
       */
      function heroPhase() {
        return document.querySelector('[class*="_root"][data-phase="hero"]') !== null
      }

      /**
       * Mark the document while the studio layout owns the page shown: the
       * studio rules key on this one attribute instead of each re-reading the
       * host's phase marker.
       */
      function writeHeroAttr(hero) {
        const studioHero = layout === HOME_LAYOUT_STUDIO && hero
        if (studioHero === document.body.hasAttribute(HOME_HERO_ATTR)) return
        if (studioHero) document.body.setAttribute(HOME_HERO_ATTR, '')
        else document.body.removeAttribute(HOME_HERO_ATTR)
      }

      /** Write the layout onto the document and start loading when it needs data. */
      function setLayout(next) {
        layout = next
        lastHero = heroPhase()
        if (next === HOME_LAYOUT_STUDIO) document.body.setAttribute(HOME_LAYOUT_ATTR, HOME_LAYOUT_STUDIO)
        else document.body.removeAttribute(HOME_LAYOUT_ATTR)
        writeHeroAttr(lastHero)
        if (next === HOME_LAYOUT_STUDIO) usage.load(false)
        usage.notify()
      }

      /** Re-render on every store change. */
      function useUsage() {
        const pair = React.useState(0)
        const bump = pair[1]
        React.useEffect(() => usage.subscribe(() => { bump(count => count + 1) }), [])
        return usage.state()
      }

      /**
       * The usage panel. It draws its frame — the head pills, the stat cells and
       * the empty heat grid — before any number arrives, and the frame's geometry
       * does not change when the numbers land, so the page never shifts under the
       * pointer.
       *
       * The head is Claude Code's own: an Overview/Models tab pair on the left,
       * the All/30d/7d range trio on the right. The range window filters the
       * tiles and the model list; the heat grid and the models chart keep their
       * own windows, the way Claude Code's do.
       */
      function HomeUsagePanel() {
        const state = useUsage()
        const tabState = React.useState('overview')
        const tab = tabState[0]
        const setTab = tabState[1]
        const rangeState = React.useState('all')
        const range = rangeState[0]
        const setRange = rangeState[1]
        if (layout !== HOME_LAYOUT_STUDIO || !heroPhase()) return null
        const data = homePanelData(state, usage.list(), range, bookPick)

        function tabButton(id, label) {
          return React.createElement('button', {
            key: id,
            type: 'button',
            className: 'dsh-claude-home-tab',
            'data-active': tab === id ? '' : undefined,
            'aria-pressed': tab === id,
            onClick() { setTab(id) },
          }, label)
        }

        return React.createElement(
          'section',
          {
            className: 'dsh-claude-home-panel',
            'data-dsh-claude-home-panel': '',
            'data-computing': state.computing ? '' : undefined,
            'aria-busy': state.computing || !data.known ? 'true' : 'false',
          },
          React.createElement(
            'div',
            { className: 'dsh-claude-home-panel-head' },
            React.createElement(
              'div',
              { className: 'dsh-claude-home-tabs' },
              tabButton('overview', copyLabel('homeTabOverview', 'Overview')),
              tabButton('models', copyLabel('homeTabModels', 'Models')),
            ),
            React.createElement(
              'div',
              { className: 'dsh-claude-home-panel-side' },
              React.createElement(
                'div',
                { className: 'dsh-claude-home-ranges' },
                HOME_RANGES.map(item => React.createElement('button', {
                  key: item.id,
                  type: 'button',
                  className: 'dsh-claude-home-range',
                  'data-active': range === item.id ? '' : undefined,
                  'aria-pressed': range === item.id,
                  onClick() { setRange(item.id) },
                }, copyLabel(item.labelKey, item.fallback))),
              ),
            ),
          ),
          tab === 'models'
            ? React.createElement(models.component, { data })
            : overview.view(data),
        )
      }

      /**
       * Register the panel. The seat is declared by the host's conversation
       * package, so the registration waits for the declaration the same way the
       * settings section does; a host that never declares it simply keeps the
       * classic layout's spacing.
       */
      function registerPanel() {
        if (typeof ctx.inject !== 'function') return
        slotsFiber = ctx.inject(['slots'], scope => {
          const slots = scope.get('slots')
          if (slots === undefined || slots === null || typeof slots.inject !== 'function') return
          scope.effect(() => slots.inject(DOCK_SLOT, () => // A list seat keys its entries by id; the dock also carries the
          // host's todo, queue and goal bars, so the id is what keeps this
          // panel's slot stable across their re-renders.
          slots.register({ name: DOCK_SLOT, id: 'claude-style-usage', order: 40 }, HomeUsagePanel)), 'dsh-claude-style: home usage panel')
        })
      }

      function unmountColdSeat() {
        if (coldSeat === null) return
        coldSeat.root.unmount()
        if (coldSeat.element.parentElement !== null) coldSeat.element.parentElement.removeChild(coldSeat.element)
        coldSeat = null
      }

      /**
       * Mount the panel on the cold start screen, and drop it once the host's
       * dock is there to carry it (or the page leaves the studio hero). The
       * element is appended to the host's stack and never moves a host node;
       * a re-render that replaces the stack leaves the old copy behind, so it
       * is re-mounted on the new stack.
       */
      function syncColdSeat() {
        const stack = document.body.hasAttribute(HOME_HERO_ATTR)
          ? document.querySelector('[class*="_composerStack"][class*="_composerHero"]')
          : null
        if (stack === null || stack.querySelector(`:scope > [data-slot="${DOCK_SLOT}"]`) !== null) {
          unmountColdSeat()
          return
        }
        if (coldSeat !== null && coldSeat.stack === stack && coldSeat.element.parentElement === stack) return
        unmountColdSeat()
        const element = buildElement('div', 'dsh-claude-home-seat')
        stack.appendChild(element)
        const root = ReactDOM.createRoot(element)
        root.render(React.createElement(HomeUsagePanel))
        coldSeat = { stack, element, root }
      }

      /** Each pass reads the preference and the phase; only a change re-renders. */
      function sync() {
        const next = readPrefs().homeLayout
        if (next !== layout) {
          setLayout(next)
          syncColdSeat()
          return
        }
        // The hero/active phase flips without any preference change (opening a
        // session, or the new-session row), and the panel's visibility follows
        // it — so the flip has to reach the component, and the stylesheet's
        // studio rules follow it through the document mark.
        const hero = heroPhase()
        writeHeroAttr(hero)
        if (hero !== lastHero) {
          lastHero = hero
          if (hero) bookPick = Math.random()
          usage.notify()
        }
        syncColdSeat()
        if (next === HOME_LAYOUT_STUDIO) {
          usage.load(false)
          usage.loadList()
        }
      }

      ui.homeLayout = { sync }

      registerPanel()
      setLayout(readPrefs().homeLayout)

      return () => {
        unmountColdSeat()
        usage.stop()
        document.body.removeAttribute(HOME_LAYOUT_ATTR)
        document.body.removeAttribute(HOME_HERO_ATTR)
        if (slotsFiber !== null) {
          if (typeof slotsFiber.dispose === 'function') slotsFiber.dispose()
          slotsFiber = null
        }
        delete ui.homeLayout
      }
    }
