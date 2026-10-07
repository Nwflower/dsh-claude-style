/**
 * The plugin's host routes: everything the browser half cannot reach itself.
 *
 * These are the surfaces D11 describes — the model copy document, the webfonts,
 * the OS user, the HDSL account, the routed assets, session deletion and the
 * usage and search roll-ups — each registered on the host's web server under
 * this plugin's route prefix. Every route is registered on its own: one path
 * the web server refuses is reported, and the other routes still register.
 */
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { userInfo } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { brotliDecompressSync } from 'node:zlib'
import { harnessPath } from './harness-home.js'
import { createHdslAccount } from './hdsl.js'
import { packageRoot } from './package-root.js'
import { QUERY_MAX, createSessionSearch } from './search.js'
import { createUsage } from './usage.js'

/** Route prefix this plugin owns; the browser half reads `${ROUTE_PREFIX}/${COPY_FILE}`. */
const ROUTE_PREFIX = '/dsh-claude-style'
/** The copy document, built from `src/model-descriptions.json` by scripts/build.mjs. */
const COPY_FILE = 'model-descriptions.json'
/**
 * Webfonts this plugin serves under `${ROUTE_PREFIX}/fonts/`, mapped to their
 * content type. The table is a whitelist: the filename is the whole request
 * contract, so nothing below the package's `fonts/` directory is reachable
 * and no path traversal is possible. The JetBrains Mono files and the two
 * look-alike faces behind the Anthropic ones (Inter, Noto Serif) ship in the
 * npm package; the Anthropic faces do not (copyright) — their entries exist so
 * a user-supplied copy in `fonts/` is served, and readFileSync's ENOENT turns
 * into a 404 the browser half's font stacks fall back from.
 */
const FONT_FILES = {
  'JetBrainsMonoVariable.ttf': 'font/ttf',
  'JetBrainsMonoItalicVariable.ttf': 'font/ttf',
  'AnthropicSansWebText.ttf': 'font/ttf',
  'AnthropicSerifWebText.ttf': 'font/ttf',
  'InterVariable.woff2': 'font/woff2',
  'NotoSerifVariable.woff2': 'font/woff2',
}
/**
 * The assets the build routed rather than inlined, served under
 * `${ROUTE_PREFIX}/assets/` from the build output in `lib/assets/` (D38).
 *
 * The request name is the whole contract: it must be a key of the build's
 * manifest, which is `<content hash>.<ext>` — no separator, no dot segment —
 * so nothing outside that directory is reachable and a name the build did not
 * produce is a 404. The name carries the content hash, so the answer may be
 * cached for good. A text asset is stored brotli-compressed beside its name:
 * a client that takes brotli receives it as it lies, and one that does not
 * gets it decompressed, so the package carries the sheets once, small.
 */
const ASSETS_PATH = `${ROUTE_PREFIX}/assets/`
/** The build's asset manifest: which names exist, their type and their storage. */
const ASSETS_MANIFEST = 'manifest.json'
/** One-shot host OS user route; the browser half caches the response. */
const USERNAME_PATH = `${ROUTE_PREFIX}/username`

/**
 * The HDSL launcher's account contract, as this half forwards it.
 *
 * HDSL publishes who the player is through `HDSL_`-prefixed variables (its
 * plugin guide lives in the launcher's own repository). The browser half cannot
 * read a process environment, and the player's avatar is a PNG that only exists
 * under the launcher's data directory, so both are served from here: this route
 * answers the metadata, the sibling route below answers the bytes.
 */
const HDSL_PATH = `${ROUTE_PREFIX}/hdsl`
/** The player's own avatar PNG, forwarded; the absolute path never leaves this half. */
const HDSL_SKIN_PATH = `${ROUTE_PREFIX}/hdsl-skin.png`

/**
 * Session deletion.
 *
 * The harness gives the browser half no deletion API of its own: the workspace
 * controller archives and unarchives, and the agent protocol's session delete is
 * the host delegating to an ACP agent that owns the storage. The archived row's
 * delete button therefore comes here, where the stored session directory under
 * the harness home is removed and the id is dropped from the workspace
 * registry's archive set — the stored-directory miss included, so an archive
 * entry whose storage is already gone leaves the set instead of pinning its
 * row to the list. The path is also spelled in
 * src/constants.ts (SESSION_DELETE_ROUTE) for the browser half; keep the two in
 * step.
 */
const SESSION_DELETE_PATH = `${ROUTE_PREFIX}/session-delete`
/**
 * Cross-session usage roll-up for the home dashboard.
 *
 * The browser half cannot reach the host's `sessionQuery` service and cannot
 * read the cost-meter ledger, so the day buckets are assembled here and handed
 * over as one small JSON document. The route answers immediately with whatever
 * is already known: a cold pass reports `computing` and the browser half keeps
 * its skeleton up while it polls.
 */
const USAGE_PATH = `${ROUTE_PREFIX}/usage`
/** How long a computed roll-up is served before a background refresh is kicked. */
const USAGE_TTL_MS = 5 * 60 * 1000
/**
 * Message-content search for the search palette (host/search.js). `?q=` is
 * the query; without one the route only brings its message cache up to date,
 * which the palette asks for as it opens so the first real query is quick.
 */
const SESSION_SEARCH_PATH = `${ROUTE_PREFIX}/session-search`
/** Session ids are the harness's own shape; anything else is refused before it reaches a path. */
const SESSION_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/
/** Largest deletion request body read; a real one carries one id. */
const DELETE_BODY_MAX = 4096

/**
 * Why a request to the username route must be refused, or undefined when it
 * may proceed.
 *
 * `webServer.register()` hands a plugin route raw requests: the host's own
 * `/api` sits behind a Host/Origin fence and the browser-session cookie, but
 * nothing puts a plugin route there, and this route reads the OS user. So it
 * borrows the host's own check, `connection.requestRejection()` — the fence and
 * authentication `/api` applies. The browser passes it with a same-origin
 * request that carries the session cookie; the desktop shell passes it because
 * it forwards to a loopback Host, drops the page's Origin and attaches the
 * cookie itself. A host without that service cannot authenticate anyone, so the
 * stand-in below serves loopback only: a loopback Host (which also defeats DNS
 * rebinding), no cross-site marker, and an Origin, when sent, naming that Host.
 *
 * @param ctx - host plugin context.
 * @param req - node request.
 * @returns 401 / 403, or undefined when the request may proceed.
 */
function refusalOf(ctx, req) {
  const connection = ctx.get('connection')
  if (typeof connection?.requestRejection === 'function') return connection.requestRejection(req)
  const host = req.headers.host
  if (host !== undefined) {
    // A Host header that is no host name at all is refused.
    if (!URL.canParse(`http://${host}`)) return 403
    const name = new URL(`http://${host}`).hostname
    if (name !== 'localhost' && name !== '[::1]' && !/^127\.\d+\.\d+\.\d+$/.test(name)) return 403
  }
  const site = req.headers['sec-fetch-site']
  if (site !== undefined && site !== 'same-origin' && site !== 'none') return 403
  const origin = req.headers.origin
  if (origin === undefined) return undefined
  if (!URL.canParse(origin)) return 403
  return new URL(origin).host === host ? undefined : 403
}

/** Send one JSON response. */
function sendJson(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload))
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(body.byteLength),
    'cache-control': 'no-store',
  })
  res.end(body)
}

/**
 * Whether the host holds this session open right now.
 *
 * A live session's log is open and being appended to, so its directory must not
 * be removed under the writer. A sessions service that offers no way to read
 * its live set answers "live": an unreadable set cannot authorize the
 * deletion. A read that throws fails the request (500), which refuses the
 * deletion as well.
 */
function sessionIsLive(ctx, sessionId) {
  const sessions = ctx.get('sessions')
  // A host with no sessions service holds nothing open.
  if (sessions === null || sessions === undefined) return false
  if (typeof sessions.get === 'function') {
    const found = sessions.get(sessionId)
    return found !== undefined && found !== null
  }
  if (typeof sessions.list === 'function') {
    const listed = sessions.list()
    if (Array.isArray(listed)) {
      return listed.some((item) => (typeof item === 'string' ? item : item?.id ?? item?.sessionId) === sessionId)
    }
  }
  return true
}

/** One bounded request body, or null when it is oversized or unreadable. */
function readRequestBody(req, limit) {
  return new Promise((settle) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        settle(null)
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => settle(Buffer.concat(chunks).toString('utf8')))
    req.on('error', () => settle(null))
  })
}

/**
 * Drop one id from the workspace registry's archive set, durably.
 *
 * The registry is read at request time: it mounts with the workspace domain and
 * can complete after this plugin. A host without one has no archive set to
 * update — and no archived list to delete from — while a failing unarchive
 * propagates: the route answers 500, the row stays, and the next delete
 * retries through the miss branch.
 */
async function unarchiveSession(ctx, sessionId) {
  const registry = ctx.get('workspaceRegistry')
  if (typeof registry?.unarchiveSession !== 'function') return
  await registry.unarchiveSession(sessionId)
}

/**
 * Delete one stored session: the directory named by the id under one of the
 * sessions root's working-directory directories, and the id's entry in the
 * workspace registry's archive set.
 *
 * The id never reaches a path unchecked — it must match the harness's own
 * shape, the lookup is by exact name, and the resolved directory must stay
 * inside the sessions root.
 *
 * The archive set can name a session whose stored directory is already gone —
 * an earlier removal took the directory while the registry entry stayed, and
 * the stale session summary keeps its row on the archived list. The miss
 * answers success too: the registry's unarchive runs no existence check and
 * resolves without writing for an id that is not archived, so the entry leaves
 * the set either way and the row is gone for good instead of coming back on
 * the next reload.
 */
async function deleteSession(ctx, req, res) {
  const refused = refusalOf(ctx, req)
  if (refused !== undefined) {
    sendJson(res, refused, { ok: false, error: refused === 401 ? 'unauthorized' : 'forbidden' })
    return
  }
  const raw = await readRequestBody(req, DELETE_BODY_MAX)
  let request = null
  try {
    request = raw === null ? null : JSON.parse(raw)
  } catch {
    // A body that is not JSON is the client's error: the id check below answers 400.
    request = null
  }
  const sessionId = request !== null && typeof request.sessionId === 'string' ? request.sessionId : ''
  if (!SESSION_ID_RE.test(sessionId)) {
    sendJson(res, 400, { ok: false, error: 'invalid session id' })
    return
  }
  if (sessionIsLive(ctx, sessionId)) {
    sendJson(res, 409, { ok: false, error: 'session is open' })
    return
  }
  const root = resolve(harnessPath(ctx, 'sessions'))
  let dir = null
  // The root listing is the storage's own answer, so a failure there is a
  // fault and propagates to the route's 500 answer; a candidate that does not
  // exist is "not under this entry", and the scan moves past it.
  for (const entry of readdirSync(root)) {
    const candidate = join(root, entry, sessionId)
    if (statSync(candidate, { throwIfNoEntry: false })?.isDirectory() === true) {
      dir = candidate
      break
    }
  }
  if (dir === null) {
    await unarchiveSession(ctx, sessionId)
    sendJson(res, 200, { ok: true, ghost: true })
    return
  }
  if (!resolve(dir).startsWith(root + sep)) {
    sendJson(res, 403, { ok: false, error: 'session directory outside the sessions root' })
    return
  }
  // A storage fault propagates to the route's 500 answer, carrying the OS error.
  rmSync(dir, { recursive: true, force: true })
  await unarchiveSession(ctx, sessionId)
  sendJson(res, 200, { ok: true, ghost: false })
}

/**
 * Register the plugin's host routes.
 *
 * @param ctx - host plugin context.
 * @param scope - the inject scope that carries the `webServer` declaration, or
 *     `ctx` itself on a host whose context injects nothing.
 */
export function registerRoutes(ctx, scope) {
  // The built output and the fonts hang off the plugin package's own directory.
  const root = packageRoot()
  // The copy document is build output beside the client bundle in lib/.
  const file = join(root, 'lib', COPY_FILE)
  const fontsDir = join(root, 'fonts')
  const assetsDir = join(root, 'lib', 'assets')
  /** The decompressed payload of each brotli-stored asset served to a client that cannot take it. */
  const unpressed = new Map()

  /**
   * Answer one request under the route prefix with a static file.
   * @param res - node response.
   * @param method - request method; HEAD sends headers only.
   * @param path - absolute file to read.
   * @param headers - content-type / cache-control pair for the payload.
   * @param body - the payload, when the caller already holds it.
   */
  const sendFile = (res, method, path, headers, body = null) => {
    // An optional font the user never dropped in, or a name no build shipped,
    // is absent: 404.
    if (body === null && !existsSync(path)) {
      res.writeHead(404)
      res.end()
      return
    }
    // Read per request: the files are small, and an in-place edit then shows
    // up on reload without restarting the host.
    const payload = body ?? readFileSync(path)
    res.writeHead(200, {
      ...headers,
      'content-length': String(payload.byteLength),
    })
    res.end(method === 'HEAD' ? undefined : payload)
  }

  /**
   * Answer one request for a routed asset (D38).
   *
   * The manifest is read per request, like every other file here: the build
   * decides what exists, and a rebuild then shows up without restarting the
   * host. A name the manifest does not carry is a 404 — that is also what
   * keeps the directory unreachable by any other spelling.
   *
   * @param req - node request (its accept-encoding decides the payload).
   * @param res - node response.
   * @param name - the file name from the request path.
   * @returns whether the request was answered.
   */
  const sendAsset = (req, res, name) => {
    const manifest = readManifest()
    const asset = manifest?.[name]
    if (asset === undefined) return false
    const stored = join(assetsDir, asset.encoding === 'br' ? `${name}.br` : name)
    const headers = {
      'content-type': asset.type,
      'cache-control': 'public, max-age=31536000, immutable',
    }
    if (asset.encoding === 'br') {
      if (/\bbr\b/.test(req.headers['accept-encoding'] ?? '')) {
        sendFile(res, req.method, stored, { ...headers, 'content-encoding': 'br' })
        return true
      }
      // A client that does not take brotli: the sheet is decompressed, so it
      // is served rather than missing. Cached: the same few sheets are asked
      // for again on every reload of a page that never got them compressed.
      const cached = unpressed.get(name)
      if (cached !== undefined) {
        sendFile(res, req.method, stored, headers, cached)
        return true
      }
      if (!existsSync(stored)) {
        res.writeHead(404)
        res.end()
        return true
      }
      const body = brotliDecompressSync(readFileSync(stored))
      unpressed.set(name, body)
      sendFile(res, req.method, stored, headers, body)
      return true
    }
    sendFile(res, req.method, stored, headers)
    return true
  }

  /** The build's asset manifest, or undefined when the build has not run. */
  const readManifest = () => {
    const path = join(assetsDir, ASSETS_MANIFEST)
    if (!existsSync(path)) return undefined
    try {
      return JSON.parse(readFileSync(path, 'utf8')).assets
    } catch (error) {
      // A manifest that cannot be read is a build that did not finish; say so
      // once per request and answer 404 rather than failing the route (D12).
      ctx.logger?.warn?.(`dsh-claude-style: lib/assets/${ASSETS_MANIFEST} is unreadable: ${error?.message ?? error}`)
      return undefined
    }
  }

  /**
   * Answer 405 for a request whose method the route does not take.
   * @returns whether the request was turned away.
   */
  const methodRefused = (req, res, methods) => {
    if (methods.includes(req.method)) return false
    res.writeHead(405, { allow: methods.join(', ') })
    res.end()
    return true
  }

  /**
   * The fence every route that reads the user's own data runs first: the
   * host's own check where that service exists, the loopback stand-in
   * otherwise (see refusalOf).
   * @returns whether the request was turned away.
   */
  const fenceRefused = (req, res) => {
    const refused = refusalOf(ctx, req)
    if (refused === undefined) return false
    sendJson(res, refused, { ok: false, error: refused === 401 ? 'unauthorized' : 'forbidden' })
    return true
  }

  scope.effect(() => {
    const disposers = []
    const report = (message, error) => ctx.logger?.warn?.(`dsh-claude-style: ${message}: ${error?.message ?? error}`)
    const usage = createUsage(ctx)
    const hdsl = createHdslAccount(ctx)
    const sessionSearch = createSessionSearch(ctx)

    /**
     * Register one route. The web server refuses a path another plugin already
     * holds by throwing; that refusal is reported and the other routes still
     * register, because a throw here would fail this fiber and drop the client
     * bundle — the whole skin — with it (docs/decisions D12).
     */
    const register = (label, route) => {
      try {
        disposers.push(scope.webServer.register(route))
      } catch (error) {
        report(`${label} route unavailable`, error)
      }
    }

    register('model copy', {
      kind: 'prefix',
      path: ROUTE_PREFIX,
      handler: (req, res) => {
        if (methodRefused(req, res, ['GET', 'HEAD'])) return
        /* v8 ignore next -- node:http always sets url on server requests. */
        const sub = new URL(req.url ?? '/', 'http://x').pathname.slice(ROUTE_PREFIX.length)
        if (sub === `/${COPY_FILE}`) {
          sendFile(res, req.method, file, {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-cache',
          })
          return
        }
        const font = sub.startsWith('/fonts/') ? FONT_FILES[sub.slice('/fonts/'.length)] : undefined
        if (font !== undefined) {
          // The filename changes with the package, so a long cache is safe
          // and keeps the code face off the network after first paint.
          sendFile(res, req.method, join(fontsDir, sub.slice('/fonts/'.length)), {
            'content-type': font,
            'cache-control': 'public, max-age=86400',
          })
          return
        }
        const sheet = sub.startsWith('/assets/') ? sub.slice('/assets/'.length) : ''
        if (sheet !== '' && !sheet.includes('/')) {
          if (!sendAsset(req, res, sheet)) {
            res.writeHead(404)
            res.end()
          }
          return
        }
        res.writeHead(404)
        res.end()
      },
    })

    register('username', {
      kind: 'exact',
      path: USERNAME_PATH,
      handler: (req, res) => {
        // One-shot OS user resolution for the browser half; it caches the
        // response and never polls. The exact route wins over the prefix above.
        if (methodRefused(req, res, ['GET', 'HEAD'])) return
        if (fenceRefused(req, res)) return
        const username = userInfo().username || ''
        const body = Buffer.from(JSON.stringify({ ok: true, username }))
        res.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'content-length': String(body.byteLength),
          'cache-control': 'no-cache',
        })
        res.end(req.method === 'HEAD' ? undefined : body)
      },
    })

    register('HDSL account', {
      kind: 'exact',
      path: HDSL_PATH,
      handler: (req, res) => {
        // Read-only and same-origin only; the player's avatar path is dropped
        // here: the browser half needs a picture, not the home directory it
        // lives in.
        if (methodRefused(req, res, ['GET', 'HEAD'])) return
        if (fenceRefused(req, res)) return
        hdsl.read().then((profile) => {
          const { skinFile, ...account } = profile
          sendJson(res, 200, { ok: true, ...account })
        }, (error) => {
          sendJson(res, 500, { ok: false, error: String(error?.message ?? error) })
        })
      },
    })

    register('HDSL skin', {
      kind: 'exact',
      path: HDSL_SKIN_PATH,
      handler: (req, res) => {
        // The player's own avatar. The path comes from the environment and
        // never from the request, so this route cannot be pointed anywhere; a
        // missing file is a 404 and the browser half falls back to the brand
        // mark.
        if (methodRefused(req, res, ['GET', 'HEAD'])) return
        if (fenceRefused(req, res)) return
        // A failed read propagates to the web server, which logs it and answers.
        return hdsl.read().then((profile) => {
          // A file removed under the launcher is a 404 like no file at all.
          if (typeof profile.skinFile !== 'string' || !existsSync(profile.skinFile)) {
            res.writeHead(404, { 'cache-control': 'no-store' })
            res.end()
            return
          }
          const body = readFileSync(profile.skinFile)
          res.writeHead(200, {
            'content-type': 'image/png',
            'content-length': String(body.byteLength),
            'cache-control': 'no-cache',
          })
          res.end(req.method === 'HEAD' ? undefined : body)
        })
      },
    })

    register('session delete', {
      kind: 'exact',
      path: SESSION_DELETE_PATH,
      handler: (req, res) => {
        // POST only: the browser half sends one id, and a GET must never
        // reach the filesystem.
        if (methodRefused(req, res, ['POST'])) return
        // A fault anywhere in the deletion answers 500 with its message.
        void deleteSession(ctx, req, res).catch((error) => {
          if (res.headersSent) res.destroy()
          else sendJson(res, 500, { ok: false, error: String(error?.message ?? error) })
        })
      },
    })

    register('usage', {
      kind: 'exact',
      path: USAGE_PATH,
      handler: (req, res) => {
        // Read-only and same-origin only: the answer is the plugin's own
        // aggregate over the user's session history, which is why it runs the
        // same fence as the username route.
        if (methodRefused(req, res, ['GET', 'HEAD'])) return
        if (fenceRefused(req, res)) return
        let snapshot = usage.snapshot()
        const stale = snapshot.value === null
          || snapshot.computing === true
          || Date.now() - (snapshot.value?.computedAt ?? 0) > USAGE_TTL_MS
        if (stale) {
          void usage.refresh()
          snapshot = usage.snapshot()
        }
        sendJson(res, 200, {
          ok: true,
          value: snapshot.value,
          computing: snapshot.computing === true,
          ...(snapshot.error === undefined ? {} : { error: snapshot.error }),
        })
      },
    })

    register('session search', {
      kind: 'exact',
      path: SESSION_SEARCH_PATH,
      handler: (req, res) => {
        // Read-only, behind the same fence as the usage route: the answer
        // quotes the user's own conversations.
        if (methodRefused(req, res, ['GET'])) return
        if (fenceRefused(req, res)) return
        const query = (new URL(req.url ?? '/', 'http://local').searchParams.get('q') ?? '').trim().slice(0, QUERY_MAX)
        const answer = query === ''
          ? sessionSearch.warm().then(() => ({ sessions: [] }))
          : sessionSearch.search(query)
        void answer.then((value) => {
          sendJson(res, 200, { ok: true, ...value })
        }, (error) => {
          sendJson(res, 500, { ok: false, error: String(error?.message ?? error) })
        })
      },
    })

    return () => {
      usage.dispose()
      // One route's disposer failing must not keep the others registered
      // (docs/decisions D12); the failure is reported.
      for (const dispose of disposers) {
        try {
          dispose()
        } catch (error) {
          report('route disposal failed', error)
        }
      }
    }
  }, 'dsh-claude-style: host routes')
}
