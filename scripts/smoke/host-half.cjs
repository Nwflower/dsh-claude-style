/**
 * The smoke's host half, in Node: host/index.js applied to a fake cordis
 * context, and its private routes driven with the request shapes that matter
 * (docs/architecture.md D11).
 */
'use strict'
const fs = require('fs')
const http = require('http')
const path = require('path')
const { Readable } = require('stream')
const { pathToFileURL } = require('url')
const { ROOT, HOST, SKIN_FIXTURE, same, check } = require('./shared.cjs')

// ---------------------------------------------------------------------------
// Host half
// ---------------------------------------------------------------------------

/**
 * host/index.js applied to a fake cordis context.
 *
 * @param mod - the host-half module.
 * @param options - `fenced` offers the host's own request check, `home` answers
 *   `dshHomePath` with a scratch harness home, and `live` names the sessions the
 *   fake `sessions` service reports as open, and `events` maps a session id to
 *   the durable events the fake `sessionQuery` reader answers for it.
 */
function fakeHost(mod, options = {}) {
  const { fenced, home, live = [], events, launch } = options
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
      if (name === 'sessions') return { get: (id) => (live.includes(id) ? {} : undefined) }
      if (name === 'launchEnvironment') return launchEnvironment
      if (name === 'sessionQuery' && events !== undefined) {
        return { readSession: async (id) => ({ events: events[id] ?? [] }) }
      }
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
    Promise.resolve(host.routes[route].handler(req, res)).catch((error) => resolve({ status: -1, body: String(error), raw: null }))
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
    check('an unknown session is not found', absent.status === 404, `HTTP ${absent.status}`)
    const liveHost = fakeHost(mod, { fenced, home: scratchHome, live: [scratchId] })
    const live = await request(liveHost, DELETE, 'POST', JSON.stringify({ sessionId: scratchId }), browser)
    check('a live session is refused', live.status === 409, `HTTP ${live.status}`)
    check('the refused session is still on disk', fs.existsSync(path.join(scratchCwd, scratchId)) === true)
    const done = await request(host, DELETE, 'POST', JSON.stringify({ sessionId: scratchId }), browser)
    check('a stored session is deleted', done.status === 200 && JSON.parse(done.body).ok === true, `HTTP ${done.status}`)
    check('the session directory is gone', fs.existsSync(path.join(scratchCwd, scratchId)) === false)
  }

  // The usage roll-up from a cost-meter ledger: its per-day `byProviderModel`
  // becomes the day's per-model map, one model served by two providers is one
  // cell, and a key without a provider prefix is the model itself. The ledger
  // has no hours, so the fold over the one stored log supplies them, per day.
  // The ledger covers today, the day the log was written, so it answers.
  console.log('\nhost half — usage roll-up from the cost-meter ledger')
  const USAGE = '/dsh-claude-style/usage'
  const now = new Date()
  const at = (dayOffset, hour) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, 10)
  const localDay = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const today = localDay(at(0, 15))
  const yesterday = localDay(at(-1, 9))
  fs.rmSync(scratchHome, { recursive: true, force: true })
  fs.mkdirSync(path.join(scratchHome, 'storages', 'cost-meter'), { recursive: true })
  const cell = (input, output) => ({ input, output, cacheRead: 0, cacheWrite: 0, calls: 1 })
  fs.writeFileSync(path.join(scratchHome, 'storages', 'cost-meter', 'ledger.json'), JSON.stringify({
    version: 1,
    days: {
      [today]: {
        input: 700, output: 70, cacheRead: 0, cacheWrite: 0, calls: 3,
        sessions: [{ id: 's1' }, { id: 's2' }],
        byProviderModel: { 'alpha:model-a': cell(300, 30), 'beta:model-a': cell(200, 20), 'model-b': cell(200, 20) },
      },
      [yesterday]: {
        input: 100, output: 10, cacheRead: 0, cacheWrite: 0, calls: 1,
        sessions: [{ id: 's1' }],
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
  check('the ledger answers the roll-up', value.source === 'cost-meter' && value.totals?.sessions === 2,
    JSON.stringify({ source: value.source, totals: value.totals }))
  check("each ledger day carries its per-model tokens, providers merged",
    days.length === 2 && days[1].date === today &&
      JSON.stringify(days[1].models) === JSON.stringify({ 'model-a': 550, 'model-b': 220 }) &&
      JSON.stringify(days[0].models) === JSON.stringify({ 'model-b': 110 }),
    JSON.stringify(days.map((day) => [day.date, day.models])))
  check('the ranked models carry the input/output split across days',
    Array.isArray(value.models) && value.models.length === 2 &&
      value.models[0].id === 'model-a' && value.models[0].input === 500 && value.models[0].output === 50 &&
      value.models[1].id === 'model-b' && value.models[1].tokens === 330,
    JSON.stringify(value.models))
  const hourOf = (hours) => (Array.isArray(hours) ? hours.indexOf(1) : null)
  check('behind the ledger, the fold supplies the hour histograms, whole and per day',
    Array.isArray(value.hours) && value.hours[9] === 1 && value.hours[15] === 1 &&
      hourOf(days[0]?.hours) === 9 && hourOf(days[1]?.hours) === 15 &&
      days.every((day) => day.hours.reduce((sum, count) => sum + count, 0) === 1),
    JSON.stringify({ hours: value.hours, days: days.map((day) => [day.date, day.hours]) }))
  fs.rmSync(scratchHome, { recursive: true, force: true })
}

module.exports = { hostHalf }
