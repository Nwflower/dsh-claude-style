/**
 * The smoke's host half, in Node: lib/host/index.js applied to a fake cordis
 * context, and its private routes driven with the request shapes that matter
 * (docs/decisions D11).
 */
'use strict'
const fs = require('fs')
const http = require('http')
const path = require('path')
const { Readable } = require('stream')
const { pathToFileURL } = require('url')
const { brotliDecompressSync } = require('zlib')
const { ROOT, HOST, SKIN_FIXTURE, same, check } = require('./shared.cjs')

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
 *   the durable events the fake `sessionQuery` reader answers for it (each read
 *   is pushed onto `reads`, when given); `stored` is the snapshot list the fake
 *   `sessionPersistence` answers; `registry` is the fake `workspaceRegistry`
 *   service object itself, whose `unarchived` list records every call.
 */
function fakeHost(mod, options = {}) {
  const { fenced, home, live = [], events, launch, stored, reads, registry } = options
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
      if (name === 'sessions') return { get: (id) => (live.includes(id) ? {} : undefined), list: () => live.map((id) => ({ id, header: { id }, seq: (events?.[id] ?? []).length })) }
      if (name === 'launchEnvironment') return launchEnvironment
      if (name === 'sessionPersistence' && stored !== undefined) return { list: async () => stored }
      if (name === 'sessionQuery' && events !== undefined) {
        return { readSession: async (id) => { if (reads !== undefined) reads.push(id); return { events: events[id] ?? [] } } }
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
 */
function request(host, route, method, body, headers) {
  const req = Readable.from(body ? [Buffer.from(body)] : [])
  Object.assign(req, { method, url: route, headers })
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
    check('the preferences route is gone', host.routes[PREFS] === undefined)
    check('the session delete route is registered', host.routes[DELETE] !== undefined)
    for (const [label, headers] of [['cross-site page', crossSite], ['LAN peer', lanPeer], ['DNS-rebound page', rebound]]) {
      const r = await request(host, USER, 'GET', '', headers)
      check(`${label}: username read refused`, r.status === 401 || r.status === 403, `HTTP ${r.status}`)
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

  // The usage roll-up from a cost-meter ledger that stopped writing yesterday,
  // merged with the fold over the one stored log by date (D53): its per-day
  // `byProviderModel` becomes the day's per-model map, one model served by two
  // providers is one cell, and a key without a provider prefix is the model
  // itself. A day the ledger knows stays the ledger's (the log's settlement on
  // it is not added); today, past the ledger's newest day, is the fold's whole
  // day, with its model split, its session and its hours.
  console.log('\nhost half — usage roll-up from the cost-meter ledger and the fold')
  const USAGE = '/dsh-claude-style/usage'
  const now = new Date()
  const at = (dayOffset, hour) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, 10)
  const localDay = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const today = localDay(at(0, 15))
  const yesterday = localDay(at(-1, 9))
  const dayBefore = localDay(at(-2, 9))
  fs.rmSync(scratchHome, { recursive: true, force: true })
  fs.mkdirSync(path.join(scratchHome, 'storages', 'cost-meter'), { recursive: true })
  const cell = (input, output) => ({ input, output, cacheRead: 0, cacheWrite: 0, calls: 1 })
  fs.writeFileSync(path.join(scratchHome, 'storages', 'cost-meter', 'ledger.json'), JSON.stringify({
    version: 1,
    days: {
      [yesterday]: {
        input: 700, output: 70, cacheRead: 0, cacheWrite: 0, calls: 3,
        sessions: [{ id: 'ledger-1' }, { id: 'ledger-2' }],
        byProviderModel: { 'alpha:model-a': cell(300, 30), 'beta:model-a': cell(200, 20), 'model-b': cell(200, 20) },
      },
      [dayBefore]: {
        input: 100, output: 10, cacheRead: 0, cacheWrite: 0, calls: 1,
        sessions: [{ id: 'ledger-1' }],
        byProviderModel: { 'alpha:model-b': cell(100, 10) },
      },
    },
  }))
  fs.mkdirSync(path.join(scratchCwd, 's1'), { recursive: true })
  fs.writeFileSync(path.join(scratchCwd, 's1', 'session.v4.jsonl.zstd'), 'x')
  const settlement = (date, turn) => ({
    type: 'assistant/message',
    time: date.getTime(),
    data: { turn, step: 0, usage: { inputTokens: 10, outputTokens: 1 }, message: { source: { model: 'model-b' } } },
  })
  const usageHost = fakeHost(mod, {
    fenced: true,
    home: scratchHome,
    events: { s1: [settlement(at(-1, 9), 1), settlement(at(0, 15), 2)] },
  })
  let usage = null
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const answer = await request(usageHost, USAGE, 'GET', '', browser)
    usage = answer.status === 200 ? JSON.parse(answer.body) : { status: answer.status }
    if (usage.value !== undefined && usage.value !== null && usage.computing !== true) break
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  const value = usage?.value ?? {}
  const days = Array.isArray(value.days) ? value.days : []
  check('the ledger and the fold merge by date, the sessions are their union',
    value.source === 'cost-meter+local' && value.totals?.sessions === 3 && value.totals?.activeDays === 3 &&
      value.totals?.input === 810 && value.totals?.output === 81,
    JSON.stringify({ source: value.source, totals: value.totals }))
  check("each ledger day carries its per-model tokens, providers merged, the fold's settlement not added",
    days.length === 3 && days[0].date === dayBefore && days[1].date === yesterday &&
      JSON.stringify(days[0].models) === JSON.stringify({ 'model-b': 110 }) &&
      JSON.stringify(days[1].models) === JSON.stringify({ 'model-a': 550, 'model-b': 220 }),
    JSON.stringify(days.map((day) => [day.date, day.models])))
  check("the day past the ledger is the fold's, with its model split and its session",
    days[2]?.date === today && JSON.stringify(days[2].models) === JSON.stringify({ 'model-b': 11 }) &&
      JSON.stringify(days[2].sessionIds) === JSON.stringify(['s1']) && days[2].sessions === 1,
    JSON.stringify(days[2]))
  check('the ranked models carry the input/output split across days',
    Array.isArray(value.models) && value.models.length === 2 &&
      value.models[0].id === 'model-a' && value.models[0].input === 500 && value.models[0].output === 50 &&
      value.models[1].id === 'model-b' && value.models[1].tokens === 341,
    JSON.stringify(value.models))
  const hourOf = (hours) => (Array.isArray(hours) ? hours.indexOf(1) : null)
  const sum = (hours) => hours.reduce((total, count) => total + count, 0)
  check('only the folded day has an hour histogram, and the whole one is its own',
    Array.isArray(value.hours) && value.hours[15] === 1 && sum(value.hours) === 1 &&
      days[0]?.hours === undefined && days[1]?.hours === undefined &&
      hourOf(days[2]?.hours) === 15 && sum(days[2].hours) === 1,
    JSON.stringify({ hours: value.hours, days: days.map((day) => [day.date, day.hours]) }))
  fs.rmSync(scratchHome, { recursive: true, force: true })

  // Message-content search over the query service's raw logs: a phrase inside
  // a Chinese sentence matches, case and runs of whitespace do not matter,
  // tool-call arguments and subagent children stay out, and a session is read
  // again only when its persistence revision moves.
  console.log('\nhost half — message content search')
  const SEARCH = '/dsh-claude-style/session-search'
  const said = (seq, time, text) => ({ seq, time, type: 'user/message', data: { content: [{ type: 'text', text }] } })
  const answered = (seq, time, content) => ({ seq, time, type: 'assistant/message', data: { message: { content } } })
  const searchEvents = {
    'session-a': [said(1, 1000, '我们能获得一个这样的搜索框吗？'), answered(2, 2000, [{ type: 'text', text: 'Yes.' }])],
    'session-b': [said(1, 3000, 'Open the SEARCH\n   box, please'),
      answered(2, 4000, [{ type: 'text', text: 'Done.' }, { type: 'tool-call', name: 'edit', arguments: '{"text":"搜索框"}' }])],
    'session-child': [said(1, 5000, '搜索框')],
  }
  const stored = [
    { header: { id: 'session-a' }, revision: 'a1' },
    { header: { id: 'session-b' }, revision: 'b1' },
    { header: { id: 'session-child', origin: 'subagent' }, revision: 'c1' },
  ]
  const reads = []
  const searchHost = fakeHost(mod, { fenced: true, events: searchEvents, stored, reads })
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
  check('case and runs of whitespace do not matter; tool-call arguments and subagent children stay out',
    english.status === 200 && english.body.sessions.length === 1 && english.body.sessions[0].sessionId === 'session-b' &&
      english.body.sessions[0].snippet === 'Open the SEARCH box, please',
    JSON.stringify(english))
  check('each stored top-level session is read once while its revision holds',
    same(reads.slice().sort(), ['session-a', 'session-b']), JSON.stringify(reads))
  stored[1] = { header: { id: 'session-b' }, revision: 'b2' }
  await ask('search box')
  check('a moved revision reads that session again, and only it',
    same(reads.slice().sort(), ['session-a', 'session-b', 'session-b']), JSON.stringify(reads))
  // An open session is read again only when its log grows.
  const liveReads = []
  const liveEvents = { ...searchEvents, 'session-a': searchEvents['session-a'].slice() }
  const liveSearch = fakeHost(mod, { fenced: true, events: liveEvents, stored, reads: liveReads, live: ['session-a'] })
  const liveAsk = () => request(liveSearch, `${SEARCH}?q=${encodeURIComponent('搜索框')}`, 'GET', '', browser)
  await liveAsk()
  await liveAsk()
  const liveHeld = liveReads.filter((id) => id === 'session-a').length
  liveEvents['session-a'].push(said(3, 6000, '再看一次搜索框'))
  const grown = JSON.parse((await liveAsk()).body)
  check('an open session is read again only when its log grows, and its new message is found',
    liveHeld === 1 && liveReads.filter((id) => id === 'session-a').length === 2 &&
      grown.sessions[0]?.seq === 3 && grown.sessions[0]?.snippet === '再看一次搜索框',
    JSON.stringify({ liveReads, grown }))

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

  // The routed assets, on the public prefix route (D38): the manifest the
  // build wrote decides what exists, a text asset is stored brotli-compressed,
  // and nothing else answers however the name is spelled.
  console.log('\nhost half — public assets')
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib', 'assets', 'manifest.json'), 'utf8')).assets
  const [assetName, asset] = Object.entries(manifest)[0] ?? []
  if (assetName === undefined) throw new Error('no routed assets in lib/assets/manifest.json; run npm run build')
  // Every name the manifest carries has its file: the manifest is what the
  // route answers from, so an entry an earlier build's cleanup removed (D39)
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
  for (const url of ['/dsh-claude-style/assets/missing.svg', '/dsh-claude-style/assets/..%2fclient.js',
    '/dsh-claude-style/assets/../../package.json', '/dsh-claude-style/assets/', `/dsh-claude-style/assets/${assetName}/x`]) {
    const answer = await requestAsset(assets, url)
    check(`nothing but a name the build wrote answers under the assets route: ${url}`, answer.status === 404, `HTTP ${answer.status}`)
  }

  // The debug retention (D39): a linked checkout rebuilds while a page runs the
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
  // The user's own drop point is `$DSH_HOME/dsh-claude-style/fonts/` (D11): a
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
  fs.mkdirSync(droppedDir, { recursive: true })
  fs.writeFileSync(path.join(droppedDir, 'AnthropicSansWebText.ttf'), Buffer.from('dropped-anthropic'))
  fs.writeFileSync(path.join(droppedDir, 'JetBrainsMonoVariable.ttf'), Buffer.from('dropped-mono'))
  const dropped = await requestAsset(fontHost, '/dsh-claude-style/fonts/AnthropicSansWebText.ttf')
  check('a face dropped under the harness home is served from there',
    dropped.status === 200 && dropped.headers['content-type'] === 'font/ttf' &&
      dropped.raw !== null && dropped.raw.toString('utf8') === 'dropped-anthropic',
    `HTTP ${dropped.status} ${JSON.stringify(dropped.headers)}`)
  const overridden = await requestAsset(fontHost, '/dsh-claude-style/fonts/JetBrainsMonoVariable.ttf')
  check("the user's own copy wins over the bundled face of the same name",
    overridden.status === 200 && overridden.raw !== null && overridden.raw.toString('utf8') === 'dropped-mono',
    `HTTP ${overridden.status} ${JSON.stringify(overridden.headers)}`)
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
    host.routes['/dsh-claude-style'].handler({ method: 'GET', url, headers }, res)
  })
}

module.exports = { hostHalf }
