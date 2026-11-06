#!/usr/bin/env node
/**
 * mock-platform.mjs — the scripted DeepSeek account platform for the
 * end-to-end lane (D87).
 *
 * The host's own account provider (`@deepseek-ai/dsh-deepseek-account-platform`)
 * reads a signed-in reader's profile and wallets from the platform origin its
 * config names, and accepts a loopback HTTP origin when `allowLoopbackHttp` is
 * set. A scenario that needs the account surfaces drawn — the account menu, the
 * avatar picture, the balance row — points that origin here and stores a grant
 * issued by it (`accountStore`), so the host walks its real sign-in state
 * against answers this file scripts: one reader, a picture, one wallet and no
 * bonuses. Every answer wears the platform's envelope, and an unknown path is a
 * 404 the host reports, so a request this script does not know fails loudly.
 *
 * Usage: node packages/testing/mock-platform.mjs [--port <n>]
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { argOf } from './cli-args.mjs'

/** The token the stored grant carries; the platform answers any request bearing it. */
const LANE_TOKEN = 'dsh-claude-style-lane'

/** The picture the profile names, served from this origin so the avatar's <img> loads. */
const PICTURE = path.join(import.meta.dirname, 'smoke', 'fixtures', 'skin-64.png')

/**
 * The scripted reader, in the platform's own shape. The name and contact are
 * neutral stand-ins, the kind the privacy sweep leaves alone.
 */
const reader = (origin) => ({
  id: 'lane-reader',
  email: 'reader@example.com',
  id_profile: { name: 'Lane Reader', picture: `${origin}/avatar.png` },
})

/** What each endpoint answers, by method and path. */
const ROUTES = {
  'GET /auth-api/v0/users/current': (origin) => reader(origin),
  'GET /api/v0/users/get_user_summary': () => ({ normal_wallets: [{ currency: 'CNY', balance: '12.34' }], bonus_wallets: [] }),
  'GET /api/v0/users/get_unnotified_bonuses': () => [],
  'POST /api/v0/users/ack_bonus_notified': () => ({}),
  'POST /auth-api/v0/users/logout': () => ({}),
}

/** One answer wrapped the way the platform wraps every answer. */
const envelope = (bizData) => JSON.stringify({ code: 0, msg: '', data: { biz_code: 0, biz_msg: '', biz_data: bizData } })

/**
 * Start the platform.
 *
 * @param options.port - the port; 0 lets the OS pick one.
 * @returns `{ url, requests, stop() }`: `url` is the origin to configure as
 *   `platformOrigin`, `requests` every request the host made, in order.
 */
async function startMockPlatform(options = {}) {
  const requests = []
  let origin = ''
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', origin)
    requests.push({ method: req.method, path: url.pathname })
    req.resume()
    req.on('end', () => {
      if (req.method === 'GET' && url.pathname === '/avatar.png') {
        res.writeHead(200, { 'content-type': 'image/png' })
        res.end(fs.readFileSync(PICTURE))
        return
      }
      const route = ROUTES[`${req.method} ${url.pathname}`]
      if (route === undefined) {
        res.writeHead(404, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ code: 404, msg: `mock-platform does not answer ${req.method} ${url.pathname}` }))
        return
      }
      if (req.headers['x-dsh-auth-token'] !== LANE_TOKEN && url.pathname !== '/auth-api/v0/users/logout') {
        res.writeHead(401, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ code: 40003, msg: 'the lane grant is the only one this platform knows' }))
        return
      }
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(envelope(route(origin)))
    })
  })
  const port = await new Promise((resolve) => server.listen(options.port ?? 0, '127.0.0.1', () => resolve(server.address().port)))
  origin = `http://127.0.0.1:${port}`
  return {
    url: origin,
    requests,
    stop: () => new Promise((resolve) => server.close(resolve)),
  }
}

/**
 * Write a credential store holding one grant this platform issued, for the
 * host's `credentials` entry to read through its `path` option. The document is
 * JSON, which the store's YAML reader takes as it is; the file is the owner's
 * alone, as the store requires on POSIX.
 *
 * @param file - where the store goes; it is rewritten whole on every boot.
 * @param origin - the platform's origin, which the grant names as its issuer.
 */
function accountStore(file, origin) {
  const store = {
    version: 1,
    records: {
      'deepseek-account-platform/default': { kind: 'grant', payload: { version: 1, token: LANE_TOKEN, issuer: origin } },
    },
  }
  fs.writeFileSync(file, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 })
  fs.chmodSync(file, 0o600)
}

export { startMockPlatform, accountStore }

if (import.meta.main) {
  startMockPlatform({ port: argOf('port') === undefined ? 0 : Number(argOf('port')) }).then((platform) => {
    console.log(`mock-platform: ${platform.url}`)
    process.on('SIGINT', () => {
      platform.stop().then(() => process.exit(0))
    })
  })
}
