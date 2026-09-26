    /**
     * The sidebar's workspace section, re-cut as a two-state view.
     *
     * 进行中 needs no filtering of its own: the host's tree already leaves
     * archived sessions out (measured on 0.1.7-alpha.1 — 10 rows, 6 archived, zero
     * overlap). 已归档 is the skin's own flat list of archived conversations, a
     * live projection of the host's two client lists — the workspace
     * controller's archive set (ids) and the session list (titles and times) —
     * with an unarchive and a delete button on every row.
     *
     * The host DOES ship this filter, but its state lives in the viewing store
     * the ui-workspace plugin creates privately (`createWorkspaceViewStore`) and
     * is not reachable as a client service — the only way to use it is to click its options menu, which flashes
     * a popover in the user's face and still leaves the archived rows buried in
     * collapsed workspace groups. Listing them here is quieter and flat.
     *
     * @param ctx - client context.
     * @param ui - shared handle table.
     * @returns teardown.
     */
    function installWorkspaceView(ctx, ui) {
      /**
       * The host's own Tooltip, Toast and icons, reached through the plugin
       * loader's `require` — the same packages its UI uses, so these row actions
       * and the notice look and behave like the host's.
       */
      const primitives = require('@deepseek-ai/dsh-client-ui-primitives')
      const reactDom = require('react-dom/client')
      /** React roots holding the row actions, unmounted when the list is rebuilt. */
      let actionRoots = []
      /** React root holding the archived-row notice, and the show count that keys it. */
      let noticeRoot = null
      let noticeSeq = 0
      /** The section's view (active / archived), its heading and the host's tree, marked for workspace.css. */
      const viewStamp = createStamp('data-dsh-claude-ws-view')
      const labelStamp = createStamp('data-dsh-claude-ws-label')
      const treeStamp = createStamp('data-dsh-claude-ws-tree')
      const SEGMENTS = [
        { id: 'active', key: 'archiveActive', fallback: 'Active' },
        { id: 'archived', key: 'archiveArchived', fallback: 'Archived' }
      ]
      const LABEL_TEXTS = ['工作区', 'Workspace']
      let view = 'active'
      let control = null
      /** The control's sliding highlight (src/shared/sliding-pill.js). */
      const segmentPill = createSlidingPill('[aria-checked="true"]')
      let listHost = null
      /** `null` until both host lists have arrived; then `[{ id, title, at }]`. */
      let items = null
      /** Ids, titles and times of the rows on screen, joined; a list tick that changes none of them leaves the rows alone. */
      let renderedKey
      /** Rows deleted through the host half: the archive set keeps their ids until the host forgets them. */
      const deletedIds = {}
      /**
       * The host's workspace and session services, once both are reachable;
       * until then the section keeps its plain label. `unwatch` drops the two
       * list subscriptions.
       */
      let workspaces = null
      let sessions = null
      let unwatch = null
      let disposed = false

      function service(name) {
        return ctx.get(name)
      }

      function findSection() {
        const labels = document.querySelectorAll('[class*="sectionLabel"]')
        let first = null
        for (let i = 0; i < labels.length; i++) {
          const text = (labels[i].textContent || '').trim()
          if (first === null) first = labels[i]
          for (let t = 0; t < LABEL_TEXTS.length; t++) {
            if (text === LABEL_TEXTS[t]) return labels[i]
          }
        }
        return first
      }

      /**
       * The tree's rows. `data-row-key` is what the host stamps on them; the row
       * CLASSES are the stable fallback, and the skin's own stylesheet already
       * keys off them.
       */
      const TREE_ROW_SELECTOR = '[data-row-key], [class*="sessionRow"], [class*="projectRow"]'

      function findTree(label) {
        let region = label.parentElement
        while (region !== null && region !== document.body) {
          const tree = region.querySelector('[role="tree"], [class*="_list"]')
          if (tree !== null && tree.querySelector(TREE_ROW_SELECTOR) !== null) return tree
          region = region.parentElement
        }
        return null
      }

      function relativeTime(at) {
        if (typeof at !== 'number' || !isFinite(at)) return ''
        const minutes = Math.floor((Date.now() - at) / 60000)
        if (minutes < 1) return copyLabel('archiveJustNow', 'Just now')
        if (minutes < 60) return copyLabel('archiveMinutes', '{count} min', { count: minutes })
        const hours = Math.floor(minutes / 60)
        if (hours < 24) return copyLabel('archiveHours', '{count} h', { count: hours })
        return copyLabel('archiveDays', '{count} d', { count: Math.floor(hours / 24) })
      }

      /**
       * Follow the host's two client lists: `workspaces.list` carries the
       * registry-global archive set, `sessions.list` every session's title,
       * time and origin. Both arrive after the skin installs — the archive set
       * reads `[]` while the workspace list is still `pending` — so the rows are
       * recomputed on every tick of either list, never read once.
       * @returns whether both lists are being followed.
       */
      function watch() {
        if (unwatch !== null) return true
        const nextWorkspaces = service('workspaces')
        const nextSessions = service('sessions')
        if (nextWorkspaces === undefined || nextWorkspaces === null || nextWorkspaces.list === undefined) return false
        if (nextSessions === undefined || nextSessions === null || nextSessions.list === undefined) return false
        workspaces = nextWorkspaces
        sessions = nextSessions
        const stopArchive = workspaces.list.subscribe(refreshItems)
        const stopSessions = sessions.list.subscribe(refreshItems)
        unwatch = () => {
          stopArchive()
          stopSessions()
        }
        refreshItems()
        return true
      }

      /**
       * The archived rows, by the host's own archived-only rule (ui-workspace
       * `sessionVisible`): an archived id whose session summary has landed,
       * neither a subagent child nor a blank placeholder. Newest first.
       */
      function refreshItems() {
        if (disposed) return
        const archive = workspaces.list.getSnapshot()
        const list = sessions.list.getSnapshot()
        if (archive.phase !== 'ready' || list.phase !== 'ready') {
          items = null
        } else {
          items = []
          for (let i = 0; i < archive.archivedSessionIds.length; i++) {
            const id = archive.archivedSessionIds[i]
            const summary = list.byId[id]
            if (summary === undefined || summary.origin === 'subagent' || summary.blank || deletedIds[id] === true) continue
            items.push({ id, title: summary.displayTitle, at: summary.updatedAt })
          }
          items.sort((a, b) => b.at - a.at)
        }
        const key = items === null ? null : items.map(item => `${item.id}\n${item.title}\n${item.at}`).join('\n')
        if (key === renderedKey) return
        renderedKey = key
        renderList()
      }

      /**
       * The host's notice for a clicked archived row: the same Toast, warning
       * glyph and copy (`workspace` namespace, `toast.archivedNotOpenable`) its
       * own tree raises. The host's notice channel is private to ui-workspace,
       * so the skin renders the same component itself; the Toast portals to
       * the body, and a new key restarts it the way the host re-shows it.
       */
      function notifyArchivedNotOpenable() {
        const t = ctx.get('locale').bind('workspace')
        if (noticeRoot === null) noticeRoot = reactDom.createRoot(document.createElement('div'))
        noticeSeq++
        noticeRoot.render(React.createElement(primitives.Toast, {
          key: `toast-${noticeSeq}`,
          text: t('toast.archivedNotOpenable'),
          icon: React.createElement(primitives.IconWarningOutlineRegular),
          onDone() { if (noticeRoot !== null) noticeRoot.render(null) },
        }))
      }

      /**
       * Delete one stored session through the host half's own route.
       *
       * The harness gives the browser half no deletion API of its own (the
       * workspace controller archives and unarchives; the agent protocol's
       * session delete is the host delegating to an ACP agent that owns the
       * storage), so the skin's host half removes the session's stored directory
       * and answers here. The row stays on a refusal — the host refuses a live
       * session — and the refusal is logged the way an unarchive refusal is.
       */
      function removeArchived(id) {
        fetch(SESSION_DELETE_ROUTE, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId: id }),
        }).then(response => response.json()).then(result => {
          if (result.ok !== true) throw new Error(result.error || 'refused')
          deletedIds[id] = true
          refreshItems()
        }).catch(reason => {
          console.warn('dsh-claude-style: session delete rejected:', reason)
        })
      }

      /**
       * Put a conversation back among the live ones. The row leaves this list
       * on the archive set's next tick; a refusal leaves it in place.
       */
      function restoreArchived(id) {
        workspaces.unarchiveSession(id).catch(reason => {
          console.warn('dsh-claude-style: session unarchive rejected:', reason)
        })
      }

      /** One row action: the host's icon inside the host's tooltip. */
      function actionButton(kind, label, onClick) {
        const wrapper = buildElement('span', 'dsh-claude-archive-action')
        const className = kind === 'restore' ? 'dsh-claude-archive-restore' : 'dsh-claude-archive-delete'
        const Icon = kind === 'restore' ? primitives.IconUnarchiveOutlineRegular : primitives.IconTrashOutlineRegular
        const root = reactDom.createRoot(wrapper)
        actionRoots.push(root)
        root.render(React.createElement(primitives.Tooltip, { label, side: 'top', delayMs: 500 },
          React.createElement('button', { type: 'button', className, 'aria-label': label, title: label, onClick },
            React.createElement(Icon, { size: 14 }))))
        return wrapper
      }

      function buildArchivedRow(item) {
        const row = buildElement('div', 'dsh-claude-archive-row')
        row.setAttribute('role', 'button')
        row.setAttribute('tabindex', '0')
        row.setAttribute('data-session-id', item.id)
        row.appendChild(buildElement('span', 'dsh-claude-archive-title', item.title))
        row.appendChild(buildElement('span', 'dsh-claude-archive-time', relativeTime(item.at)))
        // The host's archived rows offer an unarchive action; the skin's list
        // carries the same pair, so leaving the archived view is not the only way
        // back to a conversation.
        row.appendChild(actionButton('restore', copyLabel('archiveRestore', 'Unarchive conversation'), event => {
          event.stopPropagation()
          restoreArchived(item.id)
        }))
        row.appendChild(actionButton('delete', copyLabel('archiveDelete', 'Delete conversation'), event => {
          event.stopPropagation()
          removeArchived(item.id)
        }))
        row.addEventListener('click', notifyArchivedNotOpenable)
        return row
      }

      function renderList() {
        if (listHost === null) return
        // The actions live in React roots; drop them before the rows go, or every
        // rebuild would leave a tree behind.
        for (let r = 0; r < actionRoots.length; r++) {
          actionRoots[r].unmount()
        }
        actionRoots = []
        while (listHost.firstChild) listHost.removeChild(listHost.firstChild)
        if (items === null) {
          listHost.appendChild(buildElement('div', 'dsh-claude-archive-status', copyLabel('archiveLoading', 'Loading…')))
          return
        }
        if (items.length === 0) {
          listHost.appendChild(buildElement('div', 'dsh-claude-archive-status', copyLabel('archiveEmpty', 'No archived conversations')))
          return
        }
        for (let i = 0; i < items.length; i++) listHost.appendChild(buildArchivedRow(items[i]))
      }

      function buildControl() {
        const group = buildElement('div', 'dsh-claude-ws-segments')
        group.setAttribute('role', 'radiogroup')
        for (let i = 0; i < SEGMENTS.length; i++) {
          const item = buildElement('button', 'dsh-claude-ws-segment', '')
          item.type = 'button'
          item.setAttribute('role', 'radio')
          item.setAttribute('data-view', SEGMENTS[i].id)
          group.appendChild(item)
        }
        group.addEventListener('click', event => {
          const target = event.target
          const item = target !== null && typeof target.closest === 'function' ? target.closest('.dsh-claude-ws-segment') : null
          if (item === null) return
          event.stopPropagation()
          event.preventDefault()
          setView(item.getAttribute('data-view'))
        })
        return group
      }

      function setView(next) {
        if (next !== 'active' && next !== 'archived') return
        if (next === view) return
        view = next
        sync()
      }

      function sync() {
        const label = findSection()
        if (label === null || label.parentElement === null) return
        const header = label.parentElement
        // Until the host's workspace and session services are both reachable
        // the section keeps its plain label.
        if (!watch()) return
        labelStamp.mark(label)
        if (control === null || control.parentElement !== header) {
          if (control !== null && control.parentElement !== null) control.parentElement.removeChild(control)
          control = buildControl()
          header.insertBefore(control, header.firstChild)
        }
        for (let i = 0; i < control.children.length; i++) {
          const item = control.children[i]
          const id = item.getAttribute('data-view')
          for (let s = 0; s < SEGMENTS.length; s++) {
            if (SEGMENTS[s].id !== id) continue
            const text = copyLabel(SEGMENTS[s].key, SEGMENTS[s].fallback)
            if (item.textContent !== text) item.textContent = text
          }
          const on = id === view
          if (item.getAttribute('aria-checked') !== (on ? 'true' : 'false')) item.setAttribute('aria-checked', on ? 'true' : 'false')
        }
        segmentPill.sync(control)
        const tree = findTree(label)
        if (tree === null) return
        treeStamp.mark(tree)
        const host = tree.parentElement
        if (host === null) return
        if (listHost === null || listHost.parentElement !== host) {
          if (listHost !== null && listHost.parentElement !== null) listHost.parentElement.removeChild(listHost)
          listHost = buildElement('div', 'dsh-claude-archive-list')
          host.insertBefore(listHost, tree.nextSibling)
          renderList()
        }
        // The sidebar re-renders its own way: when React replaces the container
        // that held the list, the old copy can stay in the document while a new
        // one is built elsewhere. Sweep every copy but the live one, the same way
        // the stats popover sweeps its strays.
        removeStrayNodes(document, '.dsh-claude-archive-list', [listHost])
        viewStamp.mark(host, view)
      }

      ui.workspace = { sync }

      return () => {
        disposed = true
        for (let r = 0; r < actionRoots.length; r++) {
          actionRoots[r].unmount()
        }
        actionRoots = []
        if (noticeRoot !== null) {
          noticeRoot.unmount()
          noticeRoot = null
        }
        if (unwatch !== null) {
          unwatch()
          unwatch = null
        }
        segmentPill.release()
        if (control !== null && control.parentElement !== null) control.parentElement.removeChild(control)
        if (listHost !== null && listHost.parentElement !== null) listHost.parentElement.removeChild(listHost)
        labelStamp.release()
        treeStamp.release()
        viewStamp.release()
        control = null
        listHost = null
        delete ui.workspace
      }
    }
