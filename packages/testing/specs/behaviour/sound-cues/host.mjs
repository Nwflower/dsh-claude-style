/**
 * Only the two host services the cues read are supplied here: the session list
 * and the live status, each with its subscribe seat. The skin is disposed and
 * applied again after the fixture hands them over, so the feature's first
 * reading is the fixture's baseline rather than the stand-in page's own.
 *
 * The private sound route is answered in Node: the capability read says the
 * host can play, and every POST is recorded. No process is started, so the
 * spec hears no system sound.
 */
export async function setup(t, { status, list }) {
  const posts = []
  await t.page.route('**/dsh-claude-style/sound', async (route) => {
    const request = route.request()
    if (request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, playback: 'system', sounds: ['pop', 'tink'] }) })
      return
    }
    posts.push(JSON.parse(request.postData() ?? 'null'))
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })

  await t.page.evaluate(({ initialStatus, initialList }) => {
    window.__dispose()
    const channels = { list: new Set(), status: new Set() }
    const subscribe = (key) => (listener) => { channels[key].add(listener); return () => channels[key].delete(listener) }
    const emit = (key) => { for (const listener of [...channels[key]]) listener() }
    let statusNow = new Map(Object.entries(initialStatus))
    let listNow = initialList
    const uiSession = {
      current: { value: { key: 'a' }, subscribe: () => () => {} },
      sessionStatus: { getSnapshot: () => statusNow, subscribe: subscribe('status') },
    }
    const sessions = {
      list: { getSnapshot: () => listNow, subscribe: subscribe('list') },
      binding: () => null,
      refresh: () => Promise.resolve(),
    }
    const services = { uiSession, sessions }
    const originalGet = window.__ctxOriginalGet ?? window.__ctx.get.bind(window.__ctx)
    window.__ctxOriginalGet = originalGet
    window.__ctx.get = (name) => Object.hasOwn(services, name) ? services[name] : originalGet(name)
    window.__ctx.inject = (_dependencies, callback) => {
      const disposers = []
      callback({
        get: window.__ctx.get,
        effect: (effect) => {
          const dispose = effect()
          if (typeof dispose === 'function') disposers.push(dispose)
          return dispose
        },
      })
      return { dispose: () => { for (const dispose of disposers.splice(0).reverse()) dispose() } }
    }
    window.__soundHost = {
      read: () => ({ status: [...statusNow], list: listNow }),
      setStatus(next) {
        statusNow = new Map(Object.entries(next))
        emit('status')
      },
      setList(next) {
        listNow = next
        emit('list')
      },
    }
    window.__skin.apply(window.__ctx)
    // The late-forms page starts without the settings namespace; it arrives
    // here the way a cold page sees the host's wire read answer.
    window.__serveNamespace()
  }, { initialStatus: status, initialList: list })

  await t.settle()
  return {
    posts,
    async status(next, waitMs = 450) {
      await t.page.evaluate((entries) => window.__soundHost.setStatus(entries), next)
      if (waitMs > 0) await t.page.waitForTimeout(waitMs)
    },
    async list(next, waitMs = 450) {
      await t.page.evaluate((entries) => window.__soundHost.setList(entries), next)
      if (waitMs > 0) await t.page.waitForTimeout(waitMs)
    },
    async wait(ms = 450) {
      await t.page.waitForTimeout(ms)
    },
  }
}

/** A list holding the named sessions, each row carrying the status's running flag. */
export function sessionList(status, { subagents = [] } = {}) {
  const ids = Object.keys(status).filter(id => !subagents.includes(id))
  return {
    phase: 'ready',
    ids,
    byId: Object.fromEntries(ids.map(id => [id, { id, displayTitle: id, updatedAt: 1, running: status[id].running === true }])),
    projectionsBySession: {},
  }
}
