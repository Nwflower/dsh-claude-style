import { host, surface } from '../../fixtures/behaviour.mjs'

const MENU_SLOT = 'sidebar.workspaces.session.menu.item'

/**
 * Only host boundaries are supplied here: official form writes, session stores,
 * slot ownership and the native button that dispatches a menu item's onSelect.
 * Every decision and mark is produced by the installed, built plugin.
 */
export async function setup(t, { marked = [], current = 'a', ready = true, openState = 'open', nativeMark = false } = {}) {
  await t.page.evaluate(({ marked, current, ready, openState, nativeMark, sidebarSelector, rowKey, part, phase, menuSlot }) => {
    window.__dispose()
    const host = window.__dshSmokeHost
    const channels = { form: new Set(), list: new Set(), current: new Set(), status: new Set() }
    const subscribe = (key) => (listener) => { channels[key].add(listener); return () => channels[key].delete(listener) }
    const emit = (key) => { for (const listener of [...channels[key]]) listener() }
    const value = { ...host.formValue, manualUnreadIds: marked.slice() }
    const pending = []
    const writes = []
    const entries = []
    const menuCloses = []
    const sessionStates = new Map(['a', 'b', 'opaque:tail/path with space'].map((id) => [id, openState]))
    const completionUnread = new Set(['b'])
    let selected = current
    let formReady = ready
    const form = {
      getSnapshot: () => ({ status: formReady ? 'ready' : 'loading', value }),
      subscribe: subscribe('form'),
      set(name, next) {
        writes.push({ name, value: structuredClone(next) })
        return new Promise((resolve, reject) => pending.push({ name, next, resolve, reject }))
      },
    }
    const forms = {
      get: () => form,
      describe: () => ({ getSnapshot: () => ({ view: { namespaces: [{ ns: 'ui-skin-claude-style' }] } }) }),
    }
    const byId = Object.fromEntries([...sessionStates.keys()].map((id) => [id, { id, displayTitle: `Conversation ${id}`, updatedAt: 1 }]))
    const sessions = {
      list: { getSnapshot: () => ({ current: selected, phase: 'ready', ids: [...sessionStates.keys()], byId, projectionsBySession: {} }), subscribe: subscribe('list') },
      binding: (id) => sessionStates.has(id) ? { session: { getSnapshot: () => ({ openState: sessionStates.get(id) }) }, ctx: { get: () => undefined } } : null,
      refresh: () => Promise.resolve(),
    }
    const statusService = {
      getSnapshot: () => new Map([['a', { running: true }], ['b', { pendingInteraction: { kind: 'permission' }, completionUnread: true }]]),
      subscribe: subscribe('status'),
      ...(nativeMark ? { mark: async () => {} } : {}),
    }
    const uiSession = {
      current: { get value() { return selected === null ? undefined : { key: selected } }, subscribe: subscribe('current') },
      completionUnread,
      ...(nativeMark ? {} : { sessionStatus: statusService }),
    }
    const slots = {
      inject: (key, callback) => key === menuSlot ? callback() : () => {},
      register(options, component) {
        const entry = { options, component }
        entries.push(entry)
        return () => { const index = entries.indexOf(entry); if (index !== -1) entries.splice(index, 1) }
      },
      entries: () => [],
      entriesOfSlot: () => [],
    }
    const originalGet = window.__ctx.get.bind(window.__ctx)
    const services = { configForms: forms, sessions, uiSession, slots, ...(nativeMark ? { 'uiSession.sessionStatus': statusService } : {}) }
    window.__ctx.get = (name) => Object.hasOwn(services, name) ? services[name] : originalGet(name)
    window.__ctx.inject = (_dependencies, callback) => {
      const disposers = []
      callback({ get: window.__ctx.get, effect: (effect) => { const dispose = effect(); if (typeof dispose === 'function') disposers.push(dispose); return dispose } })
      return { dispose: () => { for (const dispose of disposers.splice(0).reverse()) dispose() } }
    }
    const sidebar = document.querySelector(sidebarSelector)
    const tree = sidebar.querySelector('[role="tree"]')
    const template = tree.querySelector('[role="treeitem"]')
    const native = new Map()
    const rows = new Map()
    for (const id of sessionStates.keys()) {
      const row = template.cloneNode(true)
      row.setAttribute(rowKey, `session:${id}`)
      row.setAttribute('aria-selected', String(id === selected))
      row.setAttribute('aria-describedby', 'native-description')
      const title = row.querySelector('span:last-child')
      title.textContent = `Conversation ${id}`
      const status = document.createElement('span')
      status.setAttribute('role', 'status')
      status.setAttribute('aria-label', id === 'a' ? 'Running' : 'Waiting for permission')
      status.setAttribute(phase, id === 'a' ? 'ongoing' : 'pending')
      row.appendChild(status)
      const actions = document.createElement('div')
      actions.setAttribute(part, 'row-actions')
      const trigger = document.createElement('button')
      trigger.type = 'button'
      trigger.textContent = `Menu ${id}`
      actions.appendChild(trigger)
      row.appendChild(actions)
      row.addEventListener('click', () => fixture.navigate(id))
      actions.addEventListener('click', (event) => event.stopPropagation())
      trigger.addEventListener('click', () => fixture.renderMenu(id))
      rows.set(id, row)
      native.set(id, { title, status, trigger })
    }
    tree.replaceChildren(...rows.values())
    const description = document.createElement('span')
    description.id = 'native-description'
    description.textContent = 'Native session description'
    tree.before(description)
    const menu = document.createElement('div')
    menu.setAttribute('role', 'menu')
    document.body.appendChild(menu)
    const fixture = {
      rows, native, value, writes, pending, entries, channels, menuCloses, completionUnread,
      navigate(id, { row = true, binding = true, notify = true } = {}) {
        if (row) for (const [key, node] of rows) node.setAttribute('aria-selected', String(key === id))
        if (binding) selected = id
        if (notify) { emit('current'); emit('list') }
      },
      open(id, state) { sessionStates.set(id, state); emit('list') },
      ready() { formReady = true; emit('form') },
      push(ids) { value.manualUnreadIds = ids.slice(); emit('form') },
      configure(patch) { Object.assign(value, patch); emit('form') },
      respond(outcome = 'accept', ids) {
        const request = pending.shift()
        if (request === undefined) throw new Error('No official form write is pending')
        if (outcome === 'reject') request.reject(new Error('Host refused preference write'))
        else if (outcome === 'refuse') request.resolve(false)
        else {
          value[request.name] = ids === undefined ? request.next : ids
          request.resolve(true)
          emit('form')
        }
      },
      renderMenu(id, withOpenState = true) {
        const entry = entries.find(({ options }) => options.name === menuSlot)
        if (entry === undefined) throw new Error('The session menu slot has no unread action')
        const props = { sessionId: id }
        if (withOpenState) props.useMenuOpenState = () => [true, (open) => { menuCloses.push(open); if (!open) menu.replaceChildren() }]
        let element
        window.__react.rendering = true
        try { element = entry.component(props) } finally { window.__react.rendering = false }
        if (element === null) {
          menu.replaceChildren()
          return
        }
        if (element.props === undefined) throw new Error('The unread action returned an invalid menu item')
        const button = document.createElement('button')
        button.type = 'button'
        button.setAttribute('role', 'menuitem')
        button.textContent = Array.isArray(element.props.children) ? element.props.children.join('') : element.props.children
        button.disabled = element.props.disabled === true
        button.addEventListener('click', element.props.onSelect)
        menu.replaceChildren(button)
      },
      recycle(from, to) {
        const row = rows.get(from)
        rows.delete(from)
        rows.set(to, row)
        row.setAttribute(rowKey, `session:${to}`)
      },
    }
    window.__unreadHost = fixture
    window.__skin.apply(window.__ctx)
  }, {
    marked, current, ready, openState, nativeMark,
    sidebarSelector: host('shell.sidebar-slot'), rowKey: host('session.row-key'),
    phase: host('session.phase'), part: surface.attribute('skin.part'), menuSlot: MENU_SLOT,
  })
  await t.settle()
}

export async function menu(t, id, withOpenState = true) {
  await t.page.evaluate(({ id, withOpenState }) => window.__unreadHost.renderMenu(id, withOpenState), { id, withOpenState })
  return t.page.getByRole('menuitem')
}

export async function navigate(t, id, options) {
  await t.page.evaluate(({ id, options }) => window.__unreadHost.navigate(id, options), { id, options })
  await t.settle()
}

export async function respond(t, outcome = 'accept', ids) {
  await t.page.evaluate(({ outcome, ids }) => window.__unreadHost.respond(outcome, ids), { outcome, ids })
  await t.settle()
}

export async function marked(t, id) {
  return t.page.evaluate(({ id, selector }) => window.__unreadHost.rows.get(id).matches(selector), { id, selector: `[${surface.attribute('manual-unread.row')}]` })
}

export async function writes(t) {
  return t.page.evaluate(() => window.__unreadHost.writes)
}
