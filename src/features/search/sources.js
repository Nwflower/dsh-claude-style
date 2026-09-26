    /**
     * What the search palette lists, read from the host's own client services
     * and turned into rows: `{ kind, id, title, detail?, snippet?,
     * snippetMatch?, label?, keys?, icon?, image?, run }` — `snippetMatch` is
     * the `[start, end)` of the query within the excerpt, and `label` is the
     * second key a query matches (a path, a package name, a description,
     * aliases). Every row's `run` is
     * the host's own navigation for that thing — nothing here re-implements
     * what a host surface already does.
     *
     * - Sessions: the session list (titles, times) minus the archived set,
     *   subagent children and blank placeholders; a typed query also asks the
     *   host half's message-content search (host/search.js). Opening goes
     *   through `uiWorkspace.openSession`.
     * - Projects: the workspace list; picking one starts a session in it
     *   (`uiWorkspace.startSession`), the same as the host's group ＋.
     * - Plugins: the plugin manager's bundles; picking one opens its page
     *   (`pluginNavigation.openBundle`).
     * - Skills: the current session's skill catalog (`skills/list` answers per
     *   session, so there is none before a session is open); picking one puts
     *   `/name ` at the head of that session's draft.
     * - Shortcuts: the shortcut catalog; picking one opens the host's shortcut
     *   reference filtered to it (commands have no public way to run).
     * - Actions: new session, settings, plugins and the shortcut reference.
     *
     * @param ctx - client context.
     * @returns the source table the palette reads.
     */
    function createSearchSources(ctx) {
      /** Rows per section when the palette shows every kind at once, and the cap for one kind. */
      const SECTION_LIMIT = { session: 6, project: 3, plugin: 3, skill: 3, shortcut: 3 }
      const KIND_LIMIT = 60
      /** Recent sessions the empty palette lists. */
      const RECENT_LIMIT = 5

      /** Plugins and skills are read once per palette opening; `null` until they answer. */
      let plugins = null
      let skills = null
      let skillSessionId = null
      let generation = 0

      /**
       * A host service or remote namespace (`remote.skills`), read when the
       * palette needs it: the namespaces register as their packages load, and
       * the palette opens long after that.
       */
      function service(name) {
        return ctx.get(name)
      }

      /** The host's shortcut row for a command id, for the keycaps an action row shows. */
      function commandKeys(id) {
        const shortcuts = service('shortcuts')
        if (!shortcuts) return []
        const rows = shortcuts.catalog.getSnapshot()
        for (let i = 0; i < rows.length; i++) {
          if (rows[i].id === id) return rows[i].keys
        }
        return []
      }

      /** The store a host slot registration declares, e.g. the settings shell or the shortcut reference. */
      function slotStore(key, id) {
        const slots = service('slots')
        if (!slots) return null
        const entries = slots.entries(key)
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i]
          if (id !== undefined && entry.options.id !== id) continue
          if (entry.store) return entry.store.create()
        }
        return null
      }

      function openShortcutReference(query) {
        const reference = slotStore('shell.overlay', 'shortcuts')
        if (reference === null) throw new Error('search: the shortcut reference is not registered')
        reference.actions.open()
        if (query) reference.actions.search(query)
      }

      /** Workspace title by session id, from the workspace list's own accounting. */
      function workspaceTitles(snapshot) {
        const titles = {}
        for (let i = 0; i < snapshot.items.length; i++) {
          const workspace = snapshot.items[i]
          for (let s = 0; s < workspace.sessionIds.length; s++) {
            if (titles[workspace.sessionIds[s]] === undefined) titles[workspace.sessionIds[s]] = workspace.title
          }
        }
        return titles
      }

      /**
       * The sessions a person can open, newest first: the host's list minus
       * archived ones, subagent children and blank placeholders — the host
       * tree's own visibility rule with the archived filter off.
       */
      function openableSessions() {
        const sessions = service('sessions')
        const workspaces = service('workspaces')
        if (!sessions || !workspaces) return []
        const list = sessions.list.getSnapshot()
        const archive = workspaces.list.getSnapshot()
        const archived = new Set(archive.archivedSessionIds)
        const titles = workspaceTitles(archive)
        const rows = []
        for (let i = 0; i < list.ids.length; i++) {
          const summary = list.byId[list.ids[i]]
          if (summary === undefined || summary.blank || summary.origin === 'subagent' || archived.has(summary.id)) continue
          rows.push({ summary, workspace: titles[summary.id] || '' })
        }
        rows.sort((a, b) => b.summary.updatedAt - a.summary.updatedAt)
        return rows
      }

      /** A session row; `hit`, when given, is its content hit — the excerpt and the match within it. */
      function sessionRow(entry, hit) {
        const id = entry.summary.id
        return {
          kind: 'session',
          id: `session:${id}`,
          title: entry.summary.displayTitle,
          detail: entry.workspace,
          snippet: hit === undefined ? '' : hit.snippet,
          snippetMatch: hit === undefined ? null : hit.match,
          run() { service('uiWorkspace').openSession(id) },
        }
      }

      function recentSessions() {
        return openableSessions().slice(0, RECENT_LIMIT).map(entry => sessionRow(entry))
      }

      /**
       * Sessions whose title or workspace name holds the query, newest first,
       * then the sessions whose messages hold it, newest hit first, each once
       * — the same merge the host's sidebar search makes. A title match that
       * also has a content hit shows its excerpt too.
       */
      function matchSessions(query, contentHits) {
        const q = query.toLowerCase()
        const entries = openableSessions()
        const byId = {}
        const hits = {}
        for (let h = 0; h < contentHits.length; h++) hits[contentHits[h].sessionId] = contentHits[h]
        const rows = []
        const included = new Set()
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i]
          byId[entry.summary.id] = entry
          if (entry.summary.displayTitle.toLowerCase().includes(q) || entry.workspace.toLowerCase().includes(q)) {
            included.add(entry.summary.id)
            rows.push(sessionRow(entry, hits[entry.summary.id]))
          }
        }
        for (let c = 0; c < contentHits.length; c++) {
          const hit = contentHits[c]
          const entry = byId[hit.sessionId]
          if (entry === undefined || included.has(hit.sessionId)) continue
          included.add(hit.sessionId)
          rows.push(sessionRow(entry, hit))
        }
        return rows
      }

      /**
       * Ask the host half's message-content search (host/search.js): user and
       * assistant messages, matched as a literal case-insensitive substring,
       * so part of a Chinese sentence matches too. An empty query only brings
       * the host half's message cache up to date. Superseded requests are
       * aborted by the caller; a failure answers no hits, and the title
       * matches stand.
       * @returns the hits, newest first, `[{ sessionId, snippet, match }]`.
       */
      function searchContent(query, signal) {
        const url = query === '' ? SESSION_SEARCH_ROUTE : `${SESSION_SEARCH_ROUTE}?q=${encodeURIComponent(query)}`
        return fetch(url, { credentials: 'same-origin', headers: { accept: 'application/json' }, signal }).then(response => {
          return response.json().then(body => {
            if (!response.ok || !body.ok) throw new Error(`session search answered ${response.status}: ${body.error}`)
            return body.sessions
          })
        })
      }

      function projectRows() {
        const workspaces = service('workspaces')
        if (!workspaces) return []
        const items = workspaces.list.getSnapshot().items
        return items.map(workspace => ({
          kind: 'project',
          id: `project:${workspace.workspaceId}`,
          title: workspace.title,
          detail: workspace.path,
          label: workspace.path,
          run() { service('uiWorkspace').startSession(workspace.workspaceId) },
        }))
      }

      function pluginText(value) {
        const locale = service('locale')
        return value === undefined || !locale ? '' : locale.resolveText(value)
      }

      /** The part of a package name a person reads: `@scope/name` → `name`. */
      function shortPackageName(name) {
        const slash = name.lastIndexOf('/')
        return slash === -1 ? name : name.slice(slash + 1)
      }

      function pluginRows() {
        if (plugins === null) return []
        return plugins.map(bundle => {
          const title = (bundle.meta && pluginText(bundle.meta.title)) || shortPackageName(bundle.name)
          return {
            kind: 'plugin',
            id: `plugin:${bundle.name}`,
            title,
            detail: (bundle.meta && pluginText(bundle.meta.description)) || bundle.description || '',
            image: bundle.meta && typeof bundle.meta.icon === 'string' ? bundle.meta.icon : '',
            label: bundle.name,
            run() { service('pluginNavigation').openBundle(bundle.name) },
          }
        })
      }

      /**
       * The profile's bundles, when the host manages a profile. The plugin
       * page reads the inventory first for the same reason: the manager Remote
       * is mounted either way.
       * @returns a promise that settles once the list is in (or known absent).
       */
      function loadPlugins(owner) {
        const inventory = service('remote.pluginInventory')
        const manager = service('remote.pluginManager')
        if (!inventory || !manager || !service('pluginNavigation')) {
          plugins = []
          return Promise.resolve()
        }
        return inventory.list().then(answer => {
          if (!answer.ok) throw new Error(answer.error.message)
          if (answer.value.managementAvailable !== true) return []
          return manager.listBundles().then(bundles => {
            if (!bundles.ok) throw new Error(bundles.error.message)
            return bundles.value.filter(bundle => bundle.error === undefined)
          })
        }).then(list => {
          if (owner !== generation) return
          plugins = list.slice().sort((a, b) => shortPackageName(a.name).localeCompare(shortPackageName(b.name)))
        })
      }

      function currentOpenSession() {
        const sessions = service('sessions')
        if (!sessions) return null
        const id = currentSessionId(ctx, sessions)
        if (typeof id !== 'string') return null
        const binding = sessions.binding(id)
        if (!binding || !binding.session || binding.session.getSnapshot().openState !== 'open') return null
        return { id, binding }
      }

      /**
       * Put `/name ` at the head of the session's draft and hand the keyboard
       * back to the composer: a leading `/name` is how the host invokes a skill.
       */
      function insertSkill(binding, name) {
        const conversation = binding.ctx.get('conversation')
        if (!conversation) throw new Error('search: the conversation service is not available')
        const input = conversation.input.for(binding.ctx)
        const draft = input.state.getSnapshot().draft
        input.setDraft(`/${name} ${draft.replace(/^\s+/, '')}`)
        input.focus()
      }

      function skillRows() {
        if (skills === null || skillSessionId === null) return []
        const sessions = service('sessions')
        const binding = sessions ? sessions.binding(skillSessionId) : null
        if (!binding) return []
        return skills.map(skill => ({
          kind: 'skill',
          id: `skill:${skill.name}`,
          title: `/${skill.name}`,
          detail: skill.description || '',
          label: skill.description || '',
          run() { insertSkill(binding, skill.name) },
        }))
      }

      function loadSkills(owner) {
        const open = currentOpenSession()
        const catalog = service('remote.skills')
        if (open === null || !catalog) {
          skills = []
          skillSessionId = null
          return Promise.resolve()
        }
        return catalog.list({ sessionId: open.id }).then(result => {
          if (!result.ok) throw new Error(result.error.message)
          if (owner !== generation) return
          skills = result.value.skills
          skillSessionId = open.id
        })
      }

      function shortcutRows() {
        const shortcuts = service('shortcuts')
        if (!shortcuts) return []
        const rows = []
        const seen = new Set()
        const add = (entry) => {
          if (seen.has(entry.id) || !entry.label) return
          seen.add(entry.id)
          rows.push({
            kind: 'shortcut',
            id: `shortcut:${entry.id}`,
            title: entry.label,
            keys: entry.keys,
            label: (entry.aliases || []).join(' '),
            run() { openShortcutReference(entry.label) },
          })
        }
        shortcuts.catalog.getSnapshot().forEach(add)
        shortcuts.fixedCatalog.getSnapshot().forEach(add)
        return rows
      }

      function actionRows() {
        const rows = [{
          kind: 'action',
          id: 'action:new-session',
          icon: 'newSession',
          title: copyLabel('searchActionNewSession', 'New session'),
          keys: commandKeys('session.new'),
          run() { service('uiWorkspace').startSession() },
        }]
        if (service('pluginNavigation')) {
          rows.push({
            kind: 'action',
            id: 'action:plugins',
            icon: 'plugin',
            title: copyLabel('searchActionPlugins', 'Plugins'),
            run() { service('layout').selectPanel('plugins') },
          })
        }
        if (slotStore('sidebar.settings') !== null) {
          rows.push({
            kind: 'action',
            id: 'action:settings',
            icon: 'settings',
            title: copyLabel('searchActionSettings', 'Settings'),
            keys: commandKeys('settings.open'),
            run() { slotStore('sidebar.settings').actions.open() },
          })
        }
        if (slotStore('shell.overlay', 'shortcuts') !== null) {
          rows.push({
            kind: 'action',
            id: 'action:shortcuts',
            icon: 'shortcut',
            title: copyLabel('searchActionShortcuts', 'Keyboard shortcuts'),
            keys: commandKeys('shortcuts.open'),
            run() { openShortcutReference('') },
          })
        }
        return rows
      }

      /**
       * Rows of one kind that hold the query, best first. Matching is the host
       * sidebar search's own: a case-insensitive substring of the title or of
       * the row's second key (a path, a package name, a description, aliases).
       * A title that starts with the query leads, then one where a word starts
       * with it, then any title hit, then second-key hits; ties keep list order.
       */
      function ranked(rows, query) {
        if (query === '') return rows
        const q = query.toLowerCase()
        const scored = []
        for (let i = 0; i < rows.length; i++) {
          const title = rows[i].title.toLowerCase()
          const at = title.indexOf(q)
          let score = -1
          if (at === 0) score = 0
          else if (at > 0 && /[\s\-_/.:]/.test(title.charAt(at - 1))) score = 1
          else if (at > 0) score = 2
          else if (rows[i].label && rows[i].label.toLowerCase().includes(q)) score = 3
          if (score !== -1) scored.push({ row: rows[i], score, index: i })
        }
        scored.sort((a, b) => a.score - b.score || a.index - b.index)
        return scored.map(entry => entry.row)
      }

      /**
       * Start a palette opening: forget the last one's plugins and skills and
       * read them again, since either may have changed while it was closed.
       * @param onLoaded - called whenever one of the two lists lands.
       */
      function open(onLoaded) {
        generation++
        const owner = generation
        plugins = null
        skills = null
        skillSessionId = null
        const settle = () => { if (owner === generation) onLoaded() }
        // The host half reads every stored session once before its first
        // answer; starting that as the palette opens keeps the first query quick.
        searchContent('', undefined).then(() => {}, reason => {
          console.warn('dsh-claude-style: session content search could not prepare:', reason)
        })
        loadPlugins(owner).then(settle, reason => {
          console.warn('dsh-claude-style: search could not list plugins:', reason)
          if (owner === generation) plugins = []
          settle()
        })
        loadSkills(owner).then(settle, reason => {
          console.warn('dsh-claude-style: search could not list skills:', reason)
          if (owner === generation) skills = []
          settle()
        })
      }

      function close() {
        generation++
      }

      /**
       * The sections for one query and one filter, in display order:
       * `[{ kind, title, rows }]`. Empty sections are left out.
       * @param query - the trimmed query.
       * @param filter - `all` or one kind.
       * @param contentHits - the host's content hits for this query, if any.
       */
      function sections(query, filter, contentHits) {
        const out = []
        const push = (kind, title, rows) => {
          if (rows.length > 0) out.push({ kind, title, rows })
        }
        const limit = kind => filter === 'all' ? SECTION_LIMIT[kind] : KIND_LIMIT
        if (query === '' && filter === 'all') {
          push('session', copyLabel('searchRecents', 'Recents'), recentSessions())
          push('action', copyLabel('searchActions', 'Actions'), actionRows())
          return out
        }
        if (filter === 'all' || filter === 'session') {
          const rows = query === '' ? openableSessions().map(entry => sessionRow(entry)) : matchSessions(query, contentHits)
          push('session', copyLabel('searchSessions', 'Sessions'), rows.slice(0, limit('session')))
        }
        if (filter === 'all' || filter === 'project') push('project', copyLabel('searchProjects', 'Projects'), ranked(projectRows(), query).slice(0, limit('project')))
        if (filter === 'all' || filter === 'plugin') push('plugin', copyLabel('searchPlugins', 'Plugins'), ranked(pluginRows(), query).slice(0, limit('plugin')))
        if (filter === 'all' || filter === 'skill') push('skill', copyLabel('searchSkills', 'Skills'), ranked(skillRows(), query).slice(0, limit('skill')))
        if (filter === 'all' || filter === 'shortcut') push('shortcut', copyLabel('searchShortcuts', 'Shortcuts'), ranked(shortcutRows(), query).slice(0, limit('shortcut')))
        if (filter === 'all') push('action', copyLabel('searchActions', 'Actions'), ranked(actionRows(), query))
        return out
      }

      /** Whether a kind is still waiting on its list, so the palette can say so instead of "no results". */
      function pending(filter) {
        if (filter === 'plugin') return plugins === null
        if (filter === 'skill') return skills === null
        if (filter === 'all') return plugins === null || skills === null
        return false
      }

      return { open, close, sections, searchContent, pending }
    }
