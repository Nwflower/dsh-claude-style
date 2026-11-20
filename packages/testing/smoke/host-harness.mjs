import path from 'node:path'
import { Readable } from 'node:stream'

function fakeHost(mod, options = {}) {
  const { fenced, home, live = [], events, launch, stored, reads, releases, lists, listCalls, registry, tails, queryShapes, broken, onRead, projections, jobs, agents, commands, directories = {}, filesystem, listen = false } = options
  const shapes = queryShapes ?? ['observeSession', 'readTitleSnapshots']
  const routes = {}
  const listeners = {}
  const liveSession = (id) => ({
    id,
    header: { id, ...(directories[id] === undefined ? {} : { cwd: directories[id] }) },
    seq: (events?.[id] ?? []).reduce((next, event) => Math.max(next, event.seq + 1), 0),
    snapshotEvents: (fromSeq) => {
      if (tails !== undefined) tails.push([id, fromSeq])
      return (events?.[id] ?? []).filter((event) => event.seq >= fromSeq)
    },
  })
  const settings = { configure: () => () => {} }
  // The harness's launch environment, as its own snapshot behaves: the canonical
  // order is process, project-env, user-env, and a layer left out of the asked
  // list stays unreachable.
  const launchEnvironment = launch === undefined ? undefined : {
    getFrom(name, sources) {
      for (const source of ['process', 'project-env', 'user-env']) {
        if (!sources.includes(source)) continue
        const values = launch[source]
        if (values !== undefined && Object.prototype.hasOwnProperty.call(values, name)) return { value: values[name], source }
      }
      return undefined
    },
  }
  // Modelled on the host's connection.requestRejection(): the Host/Origin fence
  // (loopback, no cross-site marker, Origin naming the Host), then the cookie.
  const connection = {
    requestRejection(req) {
      const h = req.headers
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(h.host ?? '')) return 403
      if (h['sec-fetch-site'] === 'cross-site') return 403
      if (h.origin !== undefined && new URL(h.origin).host !== h.host) return 403
      return /dsh-auth-/.test(h.cookie ?? '') ? undefined : 401
    },
  }
  const ctx = {
    fiber: { entry: { id: 'include:ui-skin-claude-style' } },
    logger: { warn() {} },
    get: (name) => {
      if (name === 'connection' && fenced) return connection
      if (name === 'dshHomePath' && home !== undefined) return (...segments) => path.join(home, ...segments)
      if (name === 'sessions') return {
        get: (id) => (live.includes(id) ? liveSession(id) : undefined),
        list: () => live.map(liveSession),
      }
      if (name === 'launchEnvironment') return launchEnvironment
      if (name === 'jobs' && jobs !== undefined) return jobs
      // The agent registry and the command registry, as the rail's compact control
      // reads them: the press runs the host's own `/compact` (D100).
      if (name === 'agents' && agents !== undefined) return agents
      if (name === 'commands' && commands !== undefined) return commands
      if (name === 'sessionPersistence' && stored !== undefined) {
        return { list: async () => { if (lists !== undefined) lists.push(stored.length); return stored } }
      }
      if (name === 'sessionQuery' && events !== undefined) {
        // The host reads one log per id; the fake records the id and answers the
        // same complete event array the real service hands back.
        const log = (id) => {
          if (reads !== undefined) reads.push(id)
          // A log the backend cannot hand back, as the real service fails one:
          // the code is the taxonomy the host half is expected to survive.
          const code = broken?.[id]
          if (code !== undefined) throw Object.assign(new Error(`failed to observe session "${id}"`), { code })
          if (onRead !== undefined) onRead(id)
          return events[id] ?? []
        }
        // An id the real backend does not know is refused. A batch title read
        // lists the whole stored corpus (every header opened); the host half is
        // expected to avoid that walk for events, so `listCalls` records every
        // id that would have cost it.
        const known = (id) => stored === undefined || live.includes(id) || stored.some((entry) => entry.header.id === id)
        const missing = (id) => Object.assign(new Error(`session "${id}" not found`), { code: 'SESSION_QUERY_SESSION_NOT_FOUND' })
        return {
          ...(shapes.includes('observeSession') ? {
            // The listing-free read: a `stat` by id and the restored log in a
            // disposable lease, released through `Symbol.dispose`.
            observeSession: async (id) => {
              if (!known(id)) throw missing(id)
              return {
                source: 'prepared',
                header: { id },
                events: log(id),
                cursor: -1,
                revision: 'r',
                ...(projections === undefined ? {} : { projections: { asOfSeq: -1, values: projections[id] ?? {} } }),
                [Symbol.dispose]() { if (releases !== undefined) releases.push(id) },
              }
            },
          } : {}),
          ...(shapes.includes('readTitleSnapshots') ? {
            // The service's REAL batch reader folds TITLES: its projector
            // consumes `source.events` and discards them, so the value carries no
            // events at all. A caller that expects a log from it is caught here
            // rather than silently folding nothing.
            readTitleSnapshots: async (sessionIds) => {
              if (listCalls !== undefined) listCalls.push(...sessionIds)
              return sessionIds.map((id) => {
                if (!known(id)) return { status: 'rejected', sessionId: id, reason: missing(id) }
                return { status: 'fulfilled', sessionId: id, value: { session: { id } } }
              })
            },
          } : {}),
        }
      }
      if (name === 'workspaceRegistry' && registry !== undefined) return registry
      if (name === 'fs' && filesystem !== undefined) return filesystem
      return undefined
    },
    effect: (fn) => fn(),
    ...(listen ? {
      on(name, listener) {
        const registered = listeners[name] ?? []
        listeners[name] = registered
        registered.push(listener)
        return () => { listeners[name] = listeners[name].filter(entry => entry !== listener) }
      },
    } : {}),
    inject: (deps, cb) => cb({
      effect: (fn) => fn(),
      get: (name) => ctx.get(name),
      settings,
      webServer: { register(route) { routes[route.path] = route; return () => {} } },
    }),
  }
  mod.apply(ctx)
  const emit = async (name, ...args) => {
    for (const listener of listeners[name] ?? []) await listener(...args)
  }
  return { routes, ctx, listeners, emit }
}

/**
 * One request through a registered route; resolves with `{ status, body }`, and
 * with the answer's bytes as `raw` (the skin route answers with a picture).
 *
 * `peer` is the socket address the route sees. The local stand-in reads it, so a
 * request made from this machine carries this machine's address (D75) unless a
 * check asks for another.
 */
function request(host, route, method, body, headers, peer = '127.0.0.1', scope = undefined) {
  const req = Readable.from(body ? [Buffer.from(body)] : [])
  Object.assign(req, { method, url: route, headers, socket: { remoteAddress: peer } })
  return new Promise((resolve) => {
    const res = {
      status: 0,
      writeHead(status) { this.status = status },
      end(chunk) {
        const raw = chunk === undefined ? null : (Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
        resolve({ status: this.status, body: raw === null ? '' : raw.toString(), raw })
      },
    }
    Promise.resolve(host.routes[route.split('?')[0]].handler(req, res, scope)).catch((error) => resolve({ status: -1, body: String(error), raw: null }))
  })
}
export { fakeHost, request }