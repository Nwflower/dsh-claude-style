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
      /** Trash can for one archived row. */
      var DELETE_SVG = '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.6 4.2h10.8"/><path d="M6.4 4.2V3a.8.8 0 0 1 .8-.8h1.6a.8.8 0 0 1 .8.8v1.2"/><path d="M4.2 4.2l.6 8.3a1 1 0 0 0 1 .9h4.4a1 1 0 0 0 1-.9l.6-8.3"/><path d="M6.7 6.8v4M9.3 6.8v4"/></svg>'
      /** Tray with an up arrow: put this conversation back among the live ones. */
      var RESTORE_SVG = '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.6 9.2v3.4a1 1 0 0 0 1 1h8.8a1 1 0 0 0 1-1V9.2"/><path d="M8 10.4V2.6"/><path d="M5.2 5.4L8 2.6l2.8 2.8"/></svg>'
      /**
       * The host's own Tooltip and icons, reached through the plugin loader's
       * `require` — the same packages its UI uses, so these row actions look and
       * behave like the host's. `@deepseek-ai/dsh-client-ui-primitives` exports
       * `Tooltip`, `IconUnarchiveOutlineRegular` and `IconTrashOutlineRegular`.
       * Guarded: a loader that hands over nothing leaves the skin's own SVG and a
       * native title in place.
       */
      var primitives = null
      var react = null
      var reactDom = null
      try { primitives = require('@deepseek-ai/dsh-client-ui-primitives') } catch (error) { primitives = null }
      try { react = require('react') } catch (error) { react = null }
      try { reactDom = require('react-dom/client') } catch (error) { reactDom = null }
      /** React roots holding the row actions, unmounted when the list is rebuilt. */
      var actionRoots = []
      /** React root holding the archived-row notice, and the show count that keys it. */
      var noticeRoot = null
      var noticeSeq = 0
      var VIEW_ATTR = 'data-dsh-claude-ws-view'
      var LABEL_ATTR = 'data-dsh-claude-ws-label'
      var TREE_ATTR = 'data-dsh-claude-ws-tree'
      var SEGMENTS = [
        { id: 'active', key: 'archiveActive', fallback: 'Active' },
        { id: 'archived', key: 'archiveArchived', fallback: 'Archived' }
      ]
      var LABEL_TEXTS = ['工作区', 'Workspace']
      var view = 'active'
      var control = null
      /** The control's sliding highlight (src/shared/sliding-pill.js). */
      var segmentPill = createSlidingPill('[aria-checked="true"]')
      var listHost = null
      var markedLabel = null
      var markedTree = null
      /** `null` until both host lists have arrived; then `[{ id, title, at }]`. */
      var items = null
      /** Ids, titles and times of the rows on screen, joined; a list tick that changes none of them leaves the rows alone. */
      var renderedKey
      /** Rows deleted through the host half: the archive set keeps their ids until the host forgets them. */
      var deletedIds = {}
      /**
       * The host's workspace and session services, once both are reachable;
       * until then the section keeps its plain label. `unwatch` drops the two
       * list subscriptions.
       */
      var workspaces = null
      var sessions = null
      var unwatch = null
      var disposed = false

      function service(name) {
        try { return ctx.get(name) } catch (error) { return undefined }
      }

      function findSection() {
        var labels = document.querySelectorAll('[class*="sectionLabel"]')
        var first = null
        for (var i = 0; i < labels.length; i++) {
          var text = (labels[i].textContent || '').trim()
          if (first === null) first = labels[i]
          for (var t = 0; t < LABEL_TEXTS.length; t++) {
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
      var TREE_ROW_SELECTOR = '[data-row-key], [class*="sessionRow"], [class*="projectRow"]'

      function findTree(label) {
        var region = label.parentElement
        while (region !== null && region !== document.body) {
          var tree = region.querySelector('[role="tree"], [class*="list"]')
          if (tree !== null && tree.querySelector(TREE_ROW_SELECTOR) !== null) return tree
          region = region.parentElement
        }
        return null
      }

      function relativeTime(at) {
        if (typeof at !== 'number' || !isFinite(at)) return ''
        var minutes = Math.floor((Date.now() - at) / 60000)
        if (minutes < 1) return copyLabel('archiveJustNow', 'Just now')
        if (minutes < 60) return copyLabel('archiveMinutes', '{count} min', { count: minutes })
        var hours = Math.floor(minutes / 60)
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
        var nextWorkspaces = service('workspaces')
        var nextSessions = service('sessions')
        if (nextWorkspaces === undefined || nextWorkspaces === null || nextWorkspaces.list === undefined) return false
        if (nextSessions === undefined || nextSessions === null || nextSessions.list === undefined) return false
        workspaces = nextWorkspaces
        sessions = nextSessions
        var stopArchive = workspaces.list.subscribe(refreshItems)
        var stopSessions = sessions.list.subscribe(refreshItems)
        unwatch = function () {
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
        var archive = workspaces.list.getSnapshot()
        var list = sessions.list.getSnapshot()
        if (archive.phase !== 'ready' || list.phase !== 'ready') {
          items = null
        } else {
          items = []
          for (var i = 0; i < archive.archivedSessionIds.length; i++) {
            var id = archive.archivedSessionIds[i]
            var summary = list.byId[id]
            if (summary === undefined || summary.origin === 'subagent' || summary.blank || deletedIds[id] === true) continue
            items.push({ id: id, title: summary.displayTitle, at: summary.updatedAt })
          }
          items.sort(function (a, b) { return b.at - a.at })
        }
        var key = items === null ? null : items.map(function (item) { return item.id + '\n' + item.title + '\n' + item.at }).join('\n')
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
        if (react === null || reactDom === null || primitives === null || !primitives.Toast || !primitives.IconWarningOutlineRegular) {
          throw new Error('dsh-claude-style: the host Toast is not reachable through the plugin loader')
        }
        var t = ctx.get('locale').bind('workspace')
        if (noticeRoot === null) noticeRoot = reactDom.createRoot(document.createElement('div'))
        noticeSeq++
        noticeRoot.render(react.createElement(primitives.Toast, {
          key: 'toast-' + noticeSeq,
          text: t('toast.archivedNotOpenable'),
          icon: react.createElement(primitives.IconWarningOutlineRegular),
          onDone: function () { if (noticeRoot !== null) noticeRoot.render(null) },
        }))
      }

      /**
       * Delete one stored session through the host half's own route.
       *
       * The harness gives the browser half no deletion API of its own (the
       * workspace controller archives and unarchives; the agent protocol's
       * session delete is the host delegating to an ACP agent that owns the
       * storage), so the skin's host half removes the session's stored directory
       * and answers here. The row stays on any refusal — the host refuses a live
       * session, and the next read tells the truth.
       */
      function removeArchived(id) {
        fetch(SESSION_DELETE_ROUTE, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId: id }),
        }).then(function (response) {
          return response.ok ? response.json() : null
        }).then(function (result) {
          if (result === null || result.ok !== true) return
          deletedIds[id] = true
          refreshItems()
        }).catch(function () { /* the row stays; the next read tells the truth */ })
      }

      /**
       * Put a conversation back among the live ones. The row leaves this list
       * on the archive set's next tick; a refusal leaves it in place.
       */
      function restoreArchived(id) {
        workspaces.unarchiveSession(id).catch(function (reason) {
          console.warn('dsh-claude-style: session unarchive rejected:', reason)
        })
      }

      /**
       * One row action: the host's icon inside the host's tooltip when the loader
       * gives us both, and the skin's own SVG plus a native title when it does not.
       */
      function actionButton(kind, label, fallbackSvg, onClick) {
        var wrapper = modelEl('span', 'dsh-claude-archive-action')
        var className = kind === 'restore' ? 'dsh-claude-archive-restore' : 'dsh-claude-archive-delete'
        var Icon = primitives === null ? null : (kind === 'restore' ? primitives.IconUnarchiveOutlineRegular : primitives.IconTrashOutlineRegular)
        if (react !== null && reactDom !== null && primitives !== null && primitives.Tooltip && Icon) {
          var root = reactDom.createRoot(wrapper)
          actionRoots.push(root)
          root.render(react.createElement(primitives.Tooltip, { label: label, side: 'top', delayMs: 500 },
            react.createElement('button', { type: 'button', className: className, 'aria-label': label, title: label, onClick: onClick },
              react.createElement(Icon, { size: 14 }))))
          return wrapper
        }
        var button = modelEl('button', className)
        button.type = 'button'
        button.setAttribute('aria-label', label)
        button.setAttribute('title', label)
        button.innerHTML = fallbackSvg
        button.addEventListener('click', onClick)
        wrapper.appendChild(button)
        return wrapper
      }

      function buildArchivedRow(item) {
        var row = modelEl('div', 'dsh-claude-archive-row')
        row.setAttribute('role', 'button')
        row.setAttribute('tabindex', '0')
        row.setAttribute('data-session-id', item.id)
        row.appendChild(modelEl('span', 'dsh-claude-archive-title', item.title))
        row.appendChild(modelEl('span', 'dsh-claude-archive-time', relativeTime(item.at)))
        // The host's archived rows offer an unarchive action; the skin's list
        // carries the same pair, so leaving the archived view is not the only way
        // back to a conversation.
        row.appendChild(actionButton('restore', copyLabel('archiveRestore', 'Unarchive conversation'), RESTORE_SVG, function (event) {
          event.stopPropagation()
          restoreArchived(item.id)
        }))
        row.appendChild(actionButton('delete', copyLabel('archiveDelete', 'Delete conversation'), DELETE_SVG, function (event) {
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
        for (var r = 0; r < actionRoots.length; r++) {
          try { actionRoots[r].unmount() } catch (error) { /* already gone */ }
        }
        actionRoots = []
        while (listHost.firstChild) listHost.removeChild(listHost.firstChild)
        if (items === null) {
          listHost.appendChild(modelEl('div', 'dsh-claude-archive-status', copyLabel('archiveLoading', 'Loading…')))
          return
        }
        if (items.length === 0) {
          listHost.appendChild(modelEl('div', 'dsh-claude-archive-status', copyLabel('archiveEmpty', 'No archived conversations')))
          return
        }
        for (var i = 0; i < items.length; i++) listHost.appendChild(buildArchivedRow(items[i]))
      }

      function buildControl() {
        var group = modelEl('div', 'dsh-claude-ws-segments')
        group.setAttribute('role', 'radiogroup')
        for (var i = 0; i < SEGMENTS.length; i++) {
          var item = modelEl('button', 'dsh-claude-ws-segment', '')
          item.type = 'button'
          item.setAttribute('role', 'radio')
          item.setAttribute('data-view', SEGMENTS[i].id)
          group.appendChild(item)
        }
        group.addEventListener('click', function (event) {
          var target = event.target
          var item = target !== null && typeof target.closest === 'function' ? target.closest('.dsh-claude-ws-segment') : null
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
        var label = findSection()
        if (label === null || label.parentElement === null) return
        var header = label.parentElement
        // Until the host's workspace and session services are both reachable
        // the section keeps its plain label.
        if (!watch()) return
        if (markedLabel !== label) {
          if (markedLabel !== null) markedLabel.removeAttribute(LABEL_ATTR)
          markedLabel = label
          label.setAttribute(LABEL_ATTR, '')
        }
        if (control === null || control.parentElement !== header) {
          if (control !== null && control.parentElement !== null) control.parentElement.removeChild(control)
          control = buildControl()
          header.insertBefore(control, header.firstChild)
        }
        for (var i = 0; i < control.children.length; i++) {
          var item = control.children[i]
          var id = item.getAttribute('data-view')
          for (var s = 0; s < SEGMENTS.length; s++) {
            if (SEGMENTS[s].id !== id) continue
            var text = copyLabel(SEGMENTS[s].key, SEGMENTS[s].fallback)
            if (item.textContent !== text) item.textContent = text
          }
          var on = id === view
          if (item.getAttribute('aria-checked') !== (on ? 'true' : 'false')) item.setAttribute('aria-checked', on ? 'true' : 'false')
        }
        segmentPill.sync(control)
        var tree = findTree(label)
        if (tree === null) return
        if (markedTree !== tree) {
          if (markedTree !== null) markedTree.removeAttribute(TREE_ATTR)
          markedTree = tree
          tree.setAttribute(TREE_ATTR, '')
        }
        var host = tree.parentElement
        if (host === null) return
        if (listHost === null || listHost.parentElement !== host) {
          if (listHost !== null && listHost.parentElement !== null) listHost.parentElement.removeChild(listHost)
          listHost = modelEl('div', 'dsh-claude-archive-list')
          host.insertBefore(listHost, tree.nextSibling)
          renderList()
        }
        // The sidebar re-renders its own way: when React replaces the container
        // that held the list, the old copy can stay in the document while a new
        // one is built elsewhere. Sweep every copy but the live one, the same way
        // the stats popover sweeps its strays.
        removeStrayNodes(document, '.dsh-claude-archive-list', [listHost])
        if (host.getAttribute(VIEW_ATTR) !== view) host.setAttribute(VIEW_ATTR, view)
      }

      ui.workspace = { sync: sync }

      return function () {
        disposed = true
        for (var r = 0; r < actionRoots.length; r++) {
          try { actionRoots[r].unmount() } catch (error) { /* already gone */ }
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
        if (markedLabel !== null) markedLabel.removeAttribute(LABEL_ATTR)
        if (markedTree !== null) markedTree.removeAttribute(TREE_ATTR)
        control = null
        listHost = null
        markedLabel = null
        markedTree = null
        delete ui.workspace
      }
    }
