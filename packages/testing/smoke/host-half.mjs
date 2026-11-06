/**
 * The smoke's host half, in Node: lib/host/index.js applied to a fake cordis
 * context, and its private routes driven with the request shapes that matter
 * (D75).
 */
import fs from 'fs'
import http from 'http'
import path from 'path'
import { Readable } from 'stream'
import { pathToFileURL } from 'url'
import { brotliDecompressSync } from 'zlib'
import { ROOT, HOST, SKIN_FIXTURE, same, check } from './shared.mjs'
import { hostUsage } from './host-half-usage.mjs'

// ---------------------------------------------------------------------------
// Host half
// ---------------------------------------------------------------------------

/**
 * lib/host/index.js applied to a fake cordis context.
 *
 * @param mod - the host-half module.
 * @param options - `fenced` offers the host's own request check, `home` answers
 *   `dshHomePath` with a scratch harness home, and `live` names the sessions the
 *   fake `sessions` service reports as open, and `events` maps a session id to
 *   the durable events the fake `sessionQuery` answers for it. That service
 *   carries the host's three shapes: the per-id read, the point observation
 *   (each read is pushed onto `reads`, each lease release onto `releases`) and
 *   the batch reader (a corpus listing per call, its size pushed onto
 *   `listCalls`); `broken` maps a session id to the error code its read throws,
 *   and `onRead` runs for each read as it happens; `stored` is the snapshot list
 *   the fake `sessionPersistence` answers (each listing is pushed onto `lists`);
 *   `registry` is the fake `workspaceRegistry` service object itself, whose
 *   `unarchived` list records every call.
 */
function fakeHost(mod, options = {}) {
  const { fenced, home, live = [], events, launch, stored, reads, releases, lists, listCalls, registry, tails, queryShapes, broken, onRead } = options
  const shapes = queryShapes ?? ['readSession', 'observeSession', 'readTitleSnapshots']
  const routes = {}
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
        get: (id) => (live.includes(id) ? {} : undefined),
        list: () => live.map((id) => ({
          id,
          header: { id },
          // The host's own `Session.seq` is the next sequence number, not the
          // event count: this log's events are numbered from 1.
          seq: (events?.[id] ?? []).reduce((next, event) => Math.max(next, event.seq + 1), 0),
          // The host's own live Session: the events from one seq onward (D3).
          snapshotEvents: (fromSeq) => {
            if (tails !== undefined) tails.push([id, fromSeq])
            return (events?.[id] ?? []).filter((event) => event.seq >= fromSeq)
          },
        })),
      }
      if (name === 'launchEnvironment') return launchEnvironment
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
        // An id the real backend does not know is refused, and resolving one it
        // does know through `readSession` means listing the whole stored corpus
        // (every header opened). The host half is expected to avoid that walk
        // entirely, so `listCalls` records every id that would have cost it.
        const known = (id) => stored === undefined || live.includes(id) || stored.some((entry) => entry.header.id === id)
        const missing = (id) => Object.assign(new Error(`session "${id}" not found`), { code: 'SESSION_QUERY_SESSION_NOT_FOUND' })
        const listed = (id) => {
          if (listCalls !== undefined) listCalls.push(id)
          return stored?.find((entry) => entry.header.id === id)
        }
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
                [Symbol.dispose]() { if (releases !== undefined) releases.push(id) },
              }
            },
          } : {}),
          ...(shapes.includes('readSession') ? {
            // The fallback for a host publishing only this one: it resolves the
            // id through a corpus listing, so the fake charges it that walk.
            readSession: async (id) => {
              const snapshot = listed(id)
              if (!known(id)) throw missing(id)
              return { session: snapshot?.header ?? { id }, events: log(id) }
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
      return undefined
    },
    effect: (fn) => fn(),
    inject: (deps, cb) => cb({
      effect: (fn) => fn(),
      get: (name) => ctx.get(name),
      settings,
      webServer: { register(route) { routes[route.path] = route; return () => {} } },
    }),
  }
  mod.apply(ctx)
  return { routes }
}

/**
 * One request through a registered route; resolves with `{ status, body }`, and
 * with the answer's bytes as `raw` (the skin route answers with a picture).
 *
 * `peer` is the socket address the route sees. The local stand-in reads it, so a
 * request made from this machine carries this machine's address (D75) unless a
 * check asks for another.
 */
function request(host, route, method, body, headers, peer = '127.0.0.1') {
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
    Promise.resolve(host.routes[route.split('?')[0]].handler(req, res)).catch((error) => resolve({ status: -1, body: String(error), raw: null }))
  })
}

async function hostHalf() {
  const mod = await import(pathToFileURL(HOST).href)
  const PREFS = '/dsh-claude-style/prefs'
  const USER = '/dsh-claude-style/username'
  const browser = { host: '127.0.0.1:43120', origin: 'http://127.0.0.1:43120', 'sec-fetch-site': 'same-origin', cookie: 'dsh-auth-x=1' }
  const crossSite = { host: '127.0.0.1:43120', origin: 'https://attacker.example', 'sec-fetch-site': 'cross-site' }
  const lanPeer = { host: '192.168.1.23:43120' }
  const rebound = { host: 'attacker.example:43120', origin: 'http://attacker.example:43120', 'sec-fetch-site': 'same-origin' }

  // Session deletion: the route removes one stored session directory. The root
  // is a scratch harness home under .debug/, never the user's own.
  const DELETE = '/dsh-claude-style/session-delete'
  const scratchHome = path.join(ROOT, '.debug', 'smoke-home')
  const scratchCwd = path.join(scratchHome, 'sessions', '--D-smoke--')
  const scratchId = 'session-smoke-delete-0001'

  for (const fenced of [true, false]) {
    console.log(`\nhost half — ${fenced ? "through the host's connection.requestRejection()" : 'through the local stand-in (no connection service)'}`)
    const host = fakeHost(mod, { fenced, home: scratchHome })
    if (fenced) {
      // A profile entry the Config refuses keeps the host from starting the
      // whole package (D75): the values earlier builds stored still pass. A
      // `.volatile()` field resolves to an accessor, read through its `get()`.
      const resolved = (config) => {
        const [[key, stored]] = Object.entries(config)
        try {
          const field = mod.Config(config)[key]
          const value = typeof field?.get === 'function' ? field.get() : field
          return { ok: value === stored, detail: `resolved to ${JSON.stringify(value)}` }
        } catch (error) {
          return { ok: false, detail: `refused: ${error.message}` }
        }
      }
      for (const config of [{ chatAnimations: 'enhanced' }, { chatAnimations: 'redraw' }, { chatAnimations: 'off' }, { chatAnimations: false }, { autoPopover: false }, { autoPopover: 'all' }]) {
        const { ok, detail } = resolved(config)
        check(`the Config takes a stored ${JSON.stringify(config)}`, typeof mod.Config === 'function' && ok, detail)
      }
    }
    check('the preferences route is gone', host.routes[PREFS] === undefined)
    check('the session delete route is registered', host.routes[DELETE] !== undefined)
    for (const [label, headers] of [['cross-site page', crossSite], ['LAN peer', lanPeer], ['DNS-rebound page', rebound]]) {
      const r = await request(host, USER, 'GET', '', headers)
      check(`${label}: username read refused`, r.status === 401 || r.status === 403, `HTTP ${r.status}`)
    }
    if (!fenced) {
      // The stand-in's own fence on the request the Host header cannot decide:
      // the headers claim a loopback page, the connection comes from the LAN.
      const spoofed = await request(host, USER, 'GET', '', browser, '192.168.1.23')
      check('LAN connection claiming a loopback Host: username read refused', spoofed.status === 403, `HTTP ${spoofed.status}`)
    }
    const r = await request(host, USER, 'GET', '', browser)
    check('browser username read answered', r.status === 200 && JSON.parse(r.body).ok === true, `HTTP ${r.status}`)

    // The launcher's account contract. Its two layers are the only ones allowed
    // to say who the player is, and the picture's absolute path stays here.
    const HDSL = '/dsh-claude-style/hdsl'
    const SKIN = '/dsh-claude-style/hdsl-skin.png'
    const contract = {
      HDSL_ACCOUNT_CONTRACT: '1',
      HDSL_ACCOUNT_NAME: 'HDSLPlayer',
      HDSL_ACCOUNT_VENDOR: 'deepseek',
      HDSL_ACCOUNT_KIND: 'official',
      HDSL_ACCOUNT_SKIN: 'local',
      HDSL_ACCOUNT_SKIN_MODEL: 'default',
      HDSL_ACCOUNT_SKIN_FILE: SKIN_FIXTURE,
    }
    const withContract = (patch) => fakeHost(mod, {
      fenced, home: scratchHome, launch: { process: Object.assign({}, contract, patch) },
    })
    const who = JSON.parse((await request(withContract(), HDSL, 'GET', '', browser)).body)
    check('the launcher contract reached the browser half',
      who.ok === true && who.contract === true && who.name === 'HDSLPlayer' && who.vendor === 'deepseek' &&
        who.kind === 'official' && who.hasSkinImage === true,
      JSON.stringify(who))
    check('the skin path never reaches the browser', JSON.stringify(who).indexOf(SKIN_FIXTURE) === -1)
    const skin = await request(withContract(), SKIN, 'GET', '', browser)
    check("the skin route serves the launcher's atlas",
      skin.status === 200 && Buffer.compare(skin.raw, fs.readFileSync(SKIN_FIXTURE)) === 0, `HTTP ${skin.status}`)
    for (const [label, headers] of [['cross-site page', crossSite], ['LAN peer', lanPeer], ['DNS-rebound page', rebound]]) {
      const refused = await request(withContract(), SKIN, 'GET', '', headers)
      check(`${label}: skin read refused`, refused.status === 401 || refused.status === 403, `HTTP ${refused.status}`)
      const meta = await request(withContract(), HDSL, 'GET', '', headers)
      check(`${label}: account read refused`, meta.status === 401 || meta.status === 403, `HTTP ${meta.status}`)
    }
    // An offline account still has a name and, on the launcher's own patch, a
    // vendor of `offline`: the kind is what says it has no provider.
    const offline = JSON.parse((await request(withContract({ HDSL_ACCOUNT_KIND: 'offline', HDSL_ACCOUNT_VENDOR: 'offline' }), HDSL, 'GET', '', browser)).body)
    check('an offline account still names the instance and reports its kind',
      offline.name === 'HDSLPlayer' && offline.kind === 'offline', JSON.stringify(offline))
    // The project directory's `.env` travels with a cloned repository: it may
    // not name the player, nor point the picture route at a file of its choosing.
    const spoofed = fakeHost(mod, {
      fenced,
      home: scratchHome,
      launch: {
        process: { HDSL_ACCOUNT_CONTRACT: '1' },
        'project-env': { HDSL_ACCOUNT_NAME: 'Mallory', HDSL_ACCOUNT_SKIN: 'local', HDSL_ACCOUNT_SKIN_FILE: SKIN_FIXTURE },
      },
    })
    const spoofedWho = JSON.parse((await request(spoofed, HDSL, 'GET', '', browser)).body)
    check('the project directory cannot name the player', spoofedWho.name === null, JSON.stringify(spoofedWho))
    check('the project directory cannot supply a picture',
      spoofedWho.hasSkinImage === false && (await request(spoofed, SKIN, 'GET', '', browser)).status === 404)
    check('without a contract the route says so',
      (await request(fakeHost(mod, { fenced, home: scratchHome }), HDSL, 'GET', '', browser)).body.indexOf('"contract":false') !== -1)
    // A picture the launcher points at but can no longer read. The contract
    // advertises that the player chose one (the declaration is what the
    // launcher wrote); the route is the truth, and it is what the browser half
    // falls back from (the `hdsl-broken` case).
    const gone = withContract({ HDSL_ACCOUNT_SKIN_FILE: path.join(scratchHome, 'deleted.png') })
    check('a picture that is gone answers 404 although the contract names one',
      (await request(gone, SKIN, 'GET', '', browser)).status === 404 &&
        JSON.parse((await request(gone, HDSL, 'GET', '', browser)).body).hasSkinImage === true)

    fs.rmSync(scratchHome, { recursive: true, force: true })
    fs.mkdirSync(path.join(scratchCwd, scratchId), { recursive: true })
    fs.writeFileSync(path.join(scratchCwd, scratchId, 'session.v4.jsonl.zstd'), 'x')
    for (const [label, headers] of [['cross-site page', crossSite], ['LAN peer', lanPeer], ['DNS-rebound page', rebound]]) {
      const refused = await request(host, DELETE, 'POST', JSON.stringify({ sessionId: scratchId }), headers)
      check(`${label}: session delete refused`, refused.status === 401 || refused.status === 403, `HTTP ${refused.status}`)
    }
    const read = await request(host, DELETE, 'GET', '', browser)
    check('session delete answers 405 to a read', read.status === 405, `HTTP ${read.status}`)
    const traversal = await request(host, DELETE, 'POST', JSON.stringify({ sessionId: '../escape' }), browser)
    check('a path-shaped id is refused', traversal.status === 400, `HTTP ${traversal.status}`)
    // A plugin-generated id carries `:` and `@`, which the harness escapes into
    // the directory name it stores the session under; the delete has to reach
    // that name (issue #85).
    const namespacedId = 'im:feishu:dm:ou_9f2:token-7@open.feishu.cn'
    const namespacedDir = path.join(scratchCwd, 'im~003Afeishu~003Adm~003Aou_9f2~003Atoken-7~0040open.feishu.cn')
    fs.mkdirSync(namespacedDir, { recursive: true })
    fs.writeFileSync(path.join(namespacedDir, 'session.v4.jsonl.zstd'), 'x')
    const namespaced = await request(host, DELETE, 'POST', JSON.stringify({ sessionId: namespacedId }), browser)
    check('a namespaced id is deleted under the name the harness stored it under',
      namespaced.status === 200 && JSON.parse(namespaced.body).ghost === false && fs.existsSync(namespacedDir) === false,
      `HTTP ${namespaced.status} ${namespaced.body}`)
    // An id carrying the escape itself names no session: the storage writes `~`
    // as `~007E`, so resolving this one through its own spelling would delete
    // whichever session owns the name it spells out.
    const escapedId = 'im:feishu~002Edm'
    const escapedDir = path.join(scratchCwd, 'im~003Afeishu~002E~002Edm')
    fs.mkdirSync(escapedDir, { recursive: true })
    const escaped = await request(host, DELETE, 'POST', JSON.stringify({ sessionId: escapedId }), browser)
    check('an id carrying the escape is refused',
      escaped.status === 400 && fs.existsSync(escapedDir) === true, `HTTP ${escaped.status}`)
    fs.rmSync(escapedDir, { recursive: true, force: true })
    const absent = await request(host, DELETE, 'POST', JSON.stringify({ sessionId: 'session-smoke-absent' }), browser)
    check('a stored-directory miss answers as a deleted ghost',
      absent.status === 200 && JSON.parse(absent.body).ok === true && JSON.parse(absent.body).ghost === true, `HTTP ${absent.status}`)
    const liveHost = fakeHost(mod, { fenced, home: scratchHome, live: [scratchId] })
    const live = await request(liveHost, DELETE, 'POST', JSON.stringify({ sessionId: scratchId }), browser)
    check('a live session is refused', live.status === 409, `HTTP ${live.status}`)
    check('the refused session is still on disk', fs.existsSync(path.join(scratchCwd, scratchId)) === true)
    const done = await request(host, DELETE, 'POST', JSON.stringify({ sessionId: scratchId }), browser)
    check('a stored session is deleted', done.status === 200 && JSON.parse(done.body).ok === true, `HTTP ${done.status}`)
    check('the session directory is gone', fs.existsSync(path.join(scratchCwd, scratchId)) === false)
    // With a workspace registry the delete also forgets the id: a ghost — an
    // archive entry whose stored directory is already gone — leaves the set
    // through the miss branch, and the stored session's entry goes once the
    // directory itself is gone.
    const trackRegistry = () => ({
      archived: [],
      unarchived: [],
      unarchiveSession(id) {
        this.unarchived.push({ id, dirGone: fs.existsSync(path.join(scratchCwd, id)) === false })
        this.archived = this.archived.filter((known) => known !== id)
        return Promise.resolve()
      },
    })
    const ghostRegistry = trackRegistry()
    ghostRegistry.archived = ['session-smoke-ghost-0001']
    const ghostHost = fakeHost(mod, { fenced, home: scratchHome, registry: ghostRegistry })
    const ghost = await request(ghostHost, DELETE, 'POST', JSON.stringify({ sessionId: 'session-smoke-ghost-0001' }), browser)
    check('a ghost archive entry is deleted and leaves the archive set',
      ghost.status === 200 && JSON.parse(ghost.body).ghost === true && ghostRegistry.archived.length === 0 &&
        same(ghostRegistry.unarchived, [{ id: 'session-smoke-ghost-0001', dirGone: true }]),
      JSON.stringify({ status: ghost.status, body: ghost.body, registry: ghostRegistry }))
    fs.mkdirSync(path.join(scratchCwd, scratchId), { recursive: true })
    fs.writeFileSync(path.join(scratchCwd, scratchId, 'session.v4.jsonl.zstd'), 'x')
    const realRegistry = trackRegistry()
    realRegistry.archived = [scratchId]
    const registryHost = fakeHost(mod, { fenced, home: scratchHome, registry: realRegistry })
    const settled = await request(registryHost, DELETE, 'POST', JSON.stringify({ sessionId: scratchId }), browser)
    check('a stored delete unarchives the id after the directory is gone',
      settled.status === 200 && JSON.parse(settled.body).ghost === false && realRegistry.archived.length === 0 &&
        same(realRegistry.unarchived, [{ id: scratchId, dirGone: true }]),
      JSON.stringify({ status: settled.status, body: settled.body, registry: realRegistry }))
  }

  await hostUsage({ mod, fakeHost, request, browser, scratchHome, scratchCwd })

  // Message-content search over the query service's raw logs: a phrase inside
  // a Chinese sentence matches, case and runs of whitespace do not matter,
  // injected context, tool-call arguments and subagent children stay out, and a
  // stored session is read again only when the palette's prewarm re-lists a
  // moved revision.
  console.log('\nhost half — message content search')
  const SEARCH = '/dsh-claude-style/session-search'
  // The stored listing's own throttle (packages/host/src/search.ts LIST_INTERVAL_MS).
  const STORE_LIST_WAIT_MS = 2100
  const said = (seq, time, text, kind = 'user') => ({
    seq, time, type: 'user/message', data: { content: [{ type: 'text', text }], source: { kind } },
  })
  const answered = (seq, time, content) => ({ seq, time, type: 'assistant/message', data: { message: { content } } })
  const searchEvents = {
    'session-a': [said(1, 1000, '我们能获得一个这样的搜索框吗？'), answered(2, 2000, [{ type: 'text', text: 'Yes.' }])],
    'session-b': [said(1, 3000, 'Open the SEARCH\n   box, please'),
      answered(2, 4000, [{ type: 'text', text: 'Done.' }, { type: 'tool-call', name: 'edit', arguments: '{"text":"搜索框"}' }]),
      // Injected context is a `user/message` too: its words are not the
      // reader's, so it must not become a hit (nor push the real one aside).
      said(3, 4500, 'injected: the SEARCH box lives in the sidebar', 'runtime-context')],
    'session-child': [said(1, 5000, '搜索框')],
  }
  const stored = [
    { header: { id: 'session-a' }, revision: 'a1' },
    { header: { id: 'session-b' }, revision: 'b1' },
    { header: { id: 'session-child', origin: 'subagent' }, revision: 'c1' },
  ]
  const reads = []
  const lists = []
  const listings = []
  const releases = []
  // The corpus cache lives under the harness home, so the fake host gets the
  // scratch one: a real home would take this lane's sessions and leave files in it.
  const searchHost = fakeHost(mod, { fenced: true, home: scratchHome, events: searchEvents, stored, reads, lists, listCalls: listings, releases })
  const ask = async (query, headers = browser) => {
    const answer = await request(searchHost, `${SEARCH}?q=${encodeURIComponent(query)}`, 'GET', '', headers)
    return { status: answer.status, body: answer.status === 200 ? JSON.parse(answer.body) : null }
  }
  const refusedSearch = await ask('搜索框', crossSite)
  check('cross-site page: content search refused', refusedSearch.status === 401 || refusedSearch.status === 403, `HTTP ${refusedSearch.status}`)
  const chinese = await ask('搜索框')
  const hit = chinese.body?.sessions?.[0] ?? {}
  check('a phrase inside a Chinese sentence matches, and the excerpt marks it',
    chinese.status === 200 && chinese.body.sessions.length === 1 && hit.sessionId === 'session-a' && hit.role === 'user' &&
      hit.snippet.slice(hit.match[0], hit.match[1]) === '搜索框',
    JSON.stringify(chinese))
  const english = await ask('search box')
  check('case and runs of whitespace do not matter; injected context, tool-call arguments and subagent children stay out',
    english.status === 200 && english.body.sessions.length === 1 && english.body.sessions[0].sessionId === 'session-b' &&
      english.body.sessions[0].snippet === 'Open the SEARCH box, please',
    JSON.stringify(english))
  check('each stored top-level session is read once while its revision holds',
    same(reads.slice().sort(), ['session-a', 'session-b']), JSON.stringify(reads))
  stored[1] = { header: { id: 'session-b' }, revision: 'b2' }
  // The listing is throttled and the palette's own prewarm is what pays it; a
  // content query reads the corpus as it stands.
  await new Promise((resolve) => setTimeout(resolve, STORE_LIST_WAIT_MS))
  await ask('')
  await ask('search box')
  check('a moved revision is read again by the prewarm, and only it',
    same(reads.slice().sort(), ['session-a', 'session-b', 'session-b']), JSON.stringify(reads))
  // Each stale session is read by id, without walking the stored corpus. The
  // panel's own revision listing is a separate, throttled pass and is not
  // counted here.
  check('the catch-up folds its stale sessions without a stored-corpus listing',
    same(listings, []), JSON.stringify(listings))
  check('every log the corpus search reads releases its observation',
    same(releases.slice().sort(), reads.slice().sort()), JSON.stringify({ reads, releases }))
  check('folding the corpus never preflights a session with a store listing',
    same(lists, [3, 3]), JSON.stringify(lists))
  // An open session is read again only when its log grows.
  const liveReads = []
  const liveLists = []
  // An open session contributes its growth through the live log's own tail. Its
  // own home, so the corpus is built here rather than read back from the pass above.
  const liveHome = path.join(ROOT, '.debug', 'smoke-home-live')
  fs.rmSync(liveHome, { recursive: true, force: true })
  const liveTails = []
  const liveEvents = { ...searchEvents, 'session-a': searchEvents['session-a'].slice() }
  const liveSearch = fakeHost(mod, { fenced: true, home: liveHome, events: liveEvents, stored, reads: liveReads, lists: liveLists, live: ['session-a'], tails: liveTails })
  const liveAsk = () => request(liveSearch, `${SEARCH}?q=${encodeURIComponent('搜索框')}`, 'GET', '', browser)
  await liveAsk()
  await liveAsk()
  const liveHeld = liveReads.filter((id) => id === 'session-a').length
  liveEvents['session-a'].push(said(3, 6000, '再看一次搜索框'))
  const grown = JSON.parse((await liveAsk()).body)
  check('an open session is read in full once, and its growth arrives through the live tail',
    liveHeld === 1 && liveReads.filter((id) => id === 'session-a').length === 1 &&
      liveTails.length === 1 && liveTails[0][0] === 'session-a' && liveTails[0][1] === 3 &&
      grown.sessions[0]?.seq === 3 && grown.sessions[0]?.snippet === '再看一次搜索框',
    JSON.stringify({ liveReads, liveTails, grown }))
  check("reading an open session's log costs the store one listing, the prewarm's own",
    same(liveLists, [3]), JSON.stringify(liveLists))
  fs.rmSync(liveHome, { recursive: true, force: true })

  // The peak rate catalog: the route answers the copy the package ships with
  // its profiles already parsed, and the fence keeps every other page off the
  // host's own reach for the source. The harness home is a scratch one, so the
  // answer is the shipped copy rather than whatever this machine has cached.
  console.log('\nhost half — the peak rate catalog')
  const rate = fakeHost(mod, { fenced: true, home: scratchHome })
  const refusedRate = await request(rate, '/dsh-claude-style/peakrate', 'GET', '', crossSite)
  check('cross-site page: the rate catalog is refused',
    refusedRate.status === 401 || refusedRate.status === 403, `HTTP ${refusedRate.status}`)
  const rateAnswer = await request(rate, '/dsh-claude-style/peakrate', 'GET', '', browser)
  const rateBody = rateAnswer.status === 200 ? JSON.parse(rateAnswer.body) : null
  check('the rate catalog answers the copy the package ships, with its profiles already parsed',
    rateBody !== null && rateBody.ok === true && rateBody.origin === 'bundled' &&
      Array.isArray(rateBody.profiles) && rateBody.profiles.some((profile) => profile.id === 'deepseek-v4') &&
      rateBody.profiles.every((profile) => typeof profile.schedule?.timeZone === 'string'),
    JSON.stringify({ status: rateAnswer.status, origin: rateBody?.origin ?? null, profiles: rateBody?.profiles?.length ?? null }))
  const wrongMethod = await request(rate, '/dsh-claude-style/peakrate', 'DELETE', '', browser)
  check('a method the rate route does not take is turned away', wrongMethod.status === 405, `HTTP ${wrongMethod.status}`)

  // The price snapshot and the session cost, on the same terms: the snapshot is
  // the copy the package ships, the cost is priced from the session's own log,
  // and both routes run the fence and refuse a session id that names a path.
  // The log is a scratch one whose single settlement names its route and its
  // instant: 1,000 uncached input and 800 output tokens on Flash, off-peak.
  console.log('\nhost half — the price snapshot and the session cost')
  const costHost = fakeHost(mod, {
    fenced: true,
    home: scratchHome,
    events: {
      'session-priced': [
        said(1, Date.parse('2026-10-17T02:00:00Z'), '一张价目表'),
        {
          seq: 2,
          time: Date.parse('2026-10-17T02:00:00Z'),
          type: 'assistant/message',
          turn: 1,
          step: 1,
          data: {
            usage: { inputTokens: 1000, outputTokens: 800, cacheReadTokens: 0, cacheWriteTokens: 0 },
            message: { content: [{ type: 'text', text: 'Yes.' }], source: { model: 'deepseek-flash' } },
          },
        },
      ],
      // A route only the public catalogue prices: the picker's own id for Kimi
      // K3, one million output tokens, no clock of its own.
      'session-catalog': [
        {
          seq: 1,
          time: Date.parse('2026-10-17T02:00:00Z'),
          type: 'assistant/message',
          turn: 1,
          step: 1,
          data: {
            usage: { inputTokens: 0, outputTokens: 1_000_000, cacheReadTokens: 0, cacheWriteTokens: 0 },
            message: { source: { model: 'k3-256k' } },
          },
        },
      ],
    },
    stored: [{ header: { id: 'session-priced' }, revision: 'p1' }, { header: { id: 'session-catalog' }, revision: 'c1' }],
  })
  const refusedPrices = await request(costHost, '/dsh-claude-style/prices', 'GET', '', crossSite)
  check('cross-site page: the price snapshot is refused',
    refusedPrices.status === 401 || refusedPrices.status === 403, `HTTP ${refusedPrices.status}`)
  const pricesAnswer = await request(costHost, '/dsh-claude-style/prices', 'GET', '', browser)
  const pricesBody = pricesAnswer.status === 200 ? JSON.parse(pricesAnswer.body) : null
  check('the price snapshot answers both official tables for the shipped models',
    pricesBody !== null && pricesBody.ok === true && pricesBody.origin === 'bundled' &&
      pricesBody.document?.models?.['deepseek-flash']?.CNY?.peak?.output === 8 &&
      pricesBody.document?.models?.['deepseek-flash']?.USD?.offPeak?.output === 0.6 &&
      typeof pricesBody.document?.schedule?.holidays?.length === 'number',
    JSON.stringify({ status: pricesAnswer.status, models: Object.keys(pricesBody?.document?.models ?? {}) }))
  const refusedCost = await request(costHost, '/dsh-claude-style/session-cost?id=session-priced', 'GET', '', crossSite)
  check('cross-site page: the session cost is refused',
    refusedCost.status === 401 || refusedCost.status === 403, `HTTP ${refusedCost.status}`)
  const shapedCost = await request(costHost, '/dsh-claude-style/session-cost?id=..%2Fetc', 'GET', '', browser)
  check('a session id that names a path is refused', shapedCost.status === 400, `HTTP ${shapedCost.status}`)
  const costAnswer = await request(costHost, '/dsh-claude-style/session-cost?id=session-priced', 'GET', '', browser)
  const costBody = costAnswer.status === 200 ? JSON.parse(costAnswer.body) : null
  // Flash's off-peak table: 1,000 uncached input at ¥1/M and 800 output at ¥4/M
  // give 1,000 + 3,200 micro-yuan; the same call in USD gives 150 + 480.
  check('a session the host can read is priced from its own settlements, in both currencies',
    costBody !== null && costBody.ok === true && costBody.value !== null &&
      costBody.value.cny === 4_200 && costBody.value.usd === 630 && costBody.value.partial === false,
    JSON.stringify(costBody?.value ?? costBody))
  const missing = await request(costHost, '/dsh-claude-style/session-cost?id=no-such-session', 'GET', '', browser)
  check('a session the host cannot read answers no figure rather than zero',
    missing.status === 200 && JSON.parse(missing.body).value === null, JSON.stringify(missing))
  // The catalogue's USD list price for kimi-k3 is 3/3/15 per million tokens,
  // and its vendor publishes a CNY line of 20/2/100: one million output tokens
  // is 15 USD and 100 CNY, with the published line answering as it stands.
  const catalogAnswer = await request(costHost, '/dsh-claude-style/session-cost?id=session-catalog', 'GET', '', browser)
  const catalogBody = catalogAnswer.status === 200 ? JSON.parse(catalogAnswer.body) : null
  check('a model only the public catalogue prices answers at its list price, in both currencies',
    catalogBody !== null && catalogBody.ok === true && catalogBody.value !== null &&
      catalogBody.value.usd === 15_000_000 && catalogBody.value.cny === 100_000_000 &&
      catalogBody.value.partial === false,
    JSON.stringify(catalogBody?.value ?? catalogBody))

  // The routed assets, on the public prefix route: the manifest the
  // build wrote decides what exists, a text asset is stored brotli-compressed,
  // and nothing else answers however the name is spelled.
  console.log('\nhost half — public assets')
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib', 'assets', 'manifest.json'), 'utf8')).assets
  const entries = Object.entries(manifest)
  // A text asset is the one stored brotli-compressed; a mascot sheet is stored
  // as its own bytes. The compression checks below read a text asset, and the
  // binary one is read beside them.
  const [assetName, asset] = entries.find(([, entry]) => entry.encoding === 'br') ?? entries[0] ?? []
  if (assetName === undefined) throw new Error('no routed assets in lib/assets/manifest.json; run npm run build')
  // Every name the manifest carries has its file: the manifest is what the
  // route answers from, so an entry an earlier build's cleanup removed (D72)
  // would have the route refuse a name the manifest promises.
  const dangling = Object.entries(manifest)
    .filter(([name, entry]) => !fs.existsSync(path.join(ROOT, 'lib', 'assets', entry.encoding === 'br' ? `${name}.br` : name)))
    .map(([name]) => name)
  check('every asset the manifest names is on disk', dangling.length === 0, dangling.join(', '))
  const storedPath = path.join(ROOT, 'lib', 'assets', asset.encoding === 'br' ? `${assetName}.br` : assetName)
  const assets = fakeHost(mod, {})
  const compressed = await requestAsset(assets, `/dsh-claude-style/assets/${assetName}`, { 'accept-encoding': 'gzip, br' })
  check('a routed asset is served as it is stored, under its content hash and its own type, cached for good',
    compressed.status === 200 && compressed.headers['content-type'] === asset.type && /immutable/.test(compressed.headers['cache-control']) &&
      compressed.headers['content-encoding'] === 'br' && compressed.raw !== null &&
      Buffer.compare(compressed.raw, fs.readFileSync(storedPath)) === 0,
    `HTTP ${compressed.status} ${JSON.stringify(compressed.headers)}`)
  const plain = await requestAsset(assets, `/dsh-claude-style/assets/${assetName}`)
  check('a client that does not take brotli gets the same asset decompressed, so nothing is missing',
    plain.status === 200 && plain.headers['content-encoding'] === undefined &&
      plain.raw !== null && plain.raw.toString('utf8') === brotliDecompressSync(fs.readFileSync(storedPath)).toString('utf8'),
    `HTTP ${plain.status} ${JSON.stringify(plain.headers)}`)
  // A mascot sheet is routed as the PNG the build wrote: binary, so it is stored
  // as its bytes and served with no content encoding.
  const binary = entries.find(([, entry]) => entry.encoding === null && entry.type === 'image/png')
  if (binary !== undefined) {
    const [binaryName] = binary
    const raw = await requestAsset(assets, `/dsh-claude-style/assets/${binaryName}`, { 'accept-encoding': 'gzip, br' })
    check('a binary routed asset (a mascot sheet) is served as it is stored, with no content encoding',
      raw.status === 200 && raw.headers['content-encoding'] === undefined && raw.raw !== null &&
        Buffer.compare(raw.raw, fs.readFileSync(path.join(ROOT, 'lib', 'assets', binaryName))) === 0,
      `HTTP ${raw.status} ${JSON.stringify(raw.headers)}`)
  }
  for (const url of ['/dsh-claude-style/assets/missing.svg', '/dsh-claude-style/assets/..%2fclient.js',
    '/dsh-claude-style/assets/../../package.json', '/dsh-claude-style/assets/', `/dsh-claude-style/assets/${assetName}/x`]) {
    const answer = await requestAsset(assets, url)
    check(`nothing but a name the build wrote answers under the assets route: ${url}`, answer.status === 404, `HTTP ${answer.status}`)
  }

  // The debug retention (D72): a linked checkout rebuilds while a page runs the
  // previous bundle, which asks for that build's chunk names. The flag keeps
  // those names and their files in the manifest; a build without it ships
  // exactly its own set.
  console.log('\nbuild — the debug asset retention')
  const { writeAssets } = await import(pathToFileURL(path.join(ROOT, 'packages', 'assets', 'assets.mjs')).href)
  const retainDir = path.join(ROOT, '.debug', 'smoke-assets-retention')
  fs.rmSync(retainDir, { recursive: true, force: true })
  const assetPlan = (...names) => ({
    routed: names.map((name) => ({
      file: name, bytes: Buffer.from(name), text: name, type: 'text/javascript; charset=utf-8',
      hash: name.split('.')[0], name, url: `/dsh-claude-style/assets/${name}`, inline: false,
    })),
  })
  const readRetained = () => JSON.parse(fs.readFileSync(path.join(retainDir, 'assets', 'manifest.json'), 'utf8')).assets
  writeAssets(retainDir, assetPlan('aaaa1111.js'))
  const retained = writeAssets(retainDir, assetPlan('bbbb2222.js'), { retain: true })
  check('the debug build keeps what the earlier build shipped, so a page running it still finds its chunks',
    retained.kept === 1 && readRetained()['aaaa1111.js'] !== undefined &&
      fs.existsSync(path.join(retainDir, 'assets', 'aaaa1111.js.br')),
    `kept ${retained.kept} ${JSON.stringify(Object.keys(readRetained()))}`)
  const exact = writeAssets(retainDir, assetPlan('bbbb2222.js'))
  check('a build without the debug flag ships only its own assets',
    exact.kept === 0 && readRetained()['aaaa1111.js'] === undefined &&
      !fs.existsSync(path.join(retainDir, 'assets', 'aaaa1111.js.br')),
    `kept ${exact.kept} ${JSON.stringify(Object.keys(readRetained()))}`)

  // The faces the package ships: the build copies each into lib/fonts/, which
  // package.json carries, and the route answers it byte for byte under its own
  // content type.
  //
  // The user's own drop point is `$DSH_HOME/dsh-claude-style/fonts/` (D75): a
  // copy there answers a name the package does not carry, and wins over a
  // bundled face of the same name. Both halves run against a scratch harness
  // home, so the answer says nothing about what the machine running this has
  // installed.
  console.log('\nhost half — the fonts route and the drop point')
  const fontHome = path.join(ROOT, '.debug', 'smoke-font-home')
  const droppedDir = path.join(fontHome, 'dsh-claude-style', 'fonts')
  fs.rmSync(fontHome, { recursive: true, force: true })
  const fontHost = fakeHost(mod, { home: fontHome })
  const packaged = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).files
  const fontSource = path.join(ROOT, 'packages', 'assets', 'src', 'fonts')
  for (const [name, type] of [['JetBrainsMonoVariable.ttf', 'font/ttf'], ['InterVariable.woff2', 'font/woff2'], ['NotoSerifVariable.woff2', 'font/woff2']]) {
    const face = await requestAsset(fontHost, `/dsh-claude-style/fonts/${name}`)
    check(`the packaged face ${name} ships in the package and is served as ${type}`,
      packaged.includes('lib') && face.status === 200 && face.headers['content-type'] === type &&
        face.raw !== null && Buffer.compare(face.raw, fs.readFileSync(path.join(fontSource, name))) === 0,
      `HTTP ${face.status} ${JSON.stringify(face.headers)}`)
  }
  const absent = await requestAsset(fontHost, '/dsh-claude-style/fonts/AnthropicSansWebText.ttf')
  check('a face the package does not carry is a 404 until the user drops one in',
    absent.status === 404, `HTTP ${absent.status}`)
  // The browser half declares a @font-face only for a face this route names, so
  // an install without the files sends no font request at all (issue #259).
  const none = await requestAsset(fontHost, '/dsh-claude-style/webfonts')
  check('an empty drop point reports no optional face, so the page registers none and asks for no font',
    none.status === 200 && none.raw !== null && JSON.parse(none.raw.toString('utf8')).faces.length === 0,
    `HTTP ${none.status} ${none.raw === null ? '' : none.raw.toString('utf8')}`)
  fs.mkdirSync(droppedDir, { recursive: true })
  fs.writeFileSync(path.join(droppedDir, 'JetBrainsMonoVariable.ttf'), Buffer.from('dropped-mono'))
  // The three faces the package does not carry: the drop point answers each of
  // their names, so a name missing from the route's whitelist shows up here.
  for (const name of ['AnthropicSansWebText.ttf', 'AnthropicSerifWebText.ttf', 'AnthropicMonoWeb.ttf']) {
    const payload = `dropped-${name}`
    fs.writeFileSync(path.join(droppedDir, name), Buffer.from(payload))
    const dropped = await requestAsset(fontHost, `/dsh-claude-style/fonts/${name}`)
    check(`the face ${name} the package does not carry is served from the drop point`,
      dropped.status === 200 && dropped.headers['content-type'] === 'font/ttf' &&
        dropped.raw !== null && dropped.raw.toString('utf8') === payload,
      `HTTP ${dropped.status} ${JSON.stringify(dropped.headers)}`)
  }
  const overridden = await requestAsset(fontHost, '/dsh-claude-style/fonts/JetBrainsMonoVariable.ttf')
  check("the user's own copy wins over the bundled face of the same name",
    overridden.status === 200 && overridden.raw !== null && overridden.raw.toString('utf8') === 'dropped-mono',
    `HTTP ${overridden.status} ${JSON.stringify(overridden.headers)}`)
  const dropped = await requestAsset(fontHost, '/dsh-claude-style/webfonts')
  const droppedFaces = dropped.raw === null ? [] : JSON.parse(dropped.raw.toString('utf8')).faces
  check('the faces dropped in are the ones the page registers, so each of them answers and no other is asked for',
    dropped.status === 200 &&
      ['AnthropicSansWebText.ttf', 'AnthropicSerifWebText.ttf', 'AnthropicMonoWeb.ttf'].every((name) => droppedFaces.includes(name)) &&
      droppedFaces.length === 3,
    `HTTP ${dropped.status} ${JSON.stringify(droppedFaces)}`)
  fs.rmSync(fontHome, { recursive: true, force: true })
}

/**
 * One GET through the plugin's public prefix route (the model copy, the fonts,
 * the routed assets); resolves with the status, the headers the route wrote and
 * the bytes.
 *
 * @param host - the fake host (fakeHost).
 * @param url - the request path.
 * @param headers - request headers; the assets route reads accept-encoding.
 */
function requestAsset(host, url, headers = {}) {
  return new Promise((resolve) => {
    const res = {
      status: 0,
      headers: {},
      writeHead(status, headers) {
        this.status = status
        this.headers = headers || {}
      },
      end(chunk) { resolve({ status: this.status, headers: this.headers, raw: chunk === undefined ? null : chunk }) },
    }
    // The fence in front of that route reads the peer address and the Host
    // header, which a browser sends with a same-origin subresource.
    host.routes['/dsh-claude-style'].handler({
      method: 'GET',
      url,
      headers: { host: '127.0.0.1:3080', ...headers },
      socket: { remoteAddress: '127.0.0.1' },
    }, res)
  })
}

export { hostHalf }
