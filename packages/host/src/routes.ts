/**
 * The plugin's host routes: everything the browser half cannot reach itself.
 *
 * These are the surfaces D75 describes — the model copy document, the webfonts,
 * the OS user, the HDSL account, the routed assets, session deletion, the usage
 * and search roll-ups, the peak rate catalog and the reader's brand images — each
 * registered on the host's web server under this plugin's route prefix. Every
 * route is registered on its own: one path the web server refuses is reported,
 * and the other routes still register.
 *
 * The paths are the shared contract (`@dsh-claude-style/contracts/routes`, D73):
 * the browser half addresses the same names.
 */
import { PACKAGE_NAME } from '@dsh-claude-style/contracts/package'
import { HDSL_PATH, HDSL_SKIN_PATH, PEAKRATE_PATH, PRICES_PATH, ROUTE_PREFIX, SESSION_COST_PATH, SESSION_DELETE_PATH, SESSION_PANEL_PATH, SESSION_SEARCH_PATH, SOUND_PATH, USAGE_PATH, USERNAME_PATH, WEBFONTS_PATH } from '@dsh-claude-style/contracts/routes'
import { OPTIONAL_WEBFONTS } from '@dsh-claude-style/contracts/webfonts'
import { existsSync, readFileSync, readdirSync, realpathSync, rmSync, statSync } from 'node:fs'
import { userInfo } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { brandRoutes } from './brand.js'
import type { DshContext, DshRequest, DshResponse, DshRoute, DshScope } from '@dsh-claude-style/engine/node/dsh'
import { harnessPath } from '@dsh-claude-style/engine/node/harness-home'
import { pluginPath } from './harness-home.js'
import { fenceRefused, methodRefused, readRequestBody, refusalOf, sendJson } from '@dsh-claude-style/engine/node/http'
import { clampSoundVolume, isSoundName, playSystemSound, soundCapability } from './sound.js'
import { createStaticFiles } from '@dsh-claude-style/engine/node/static-files'
import { createHdslAccount } from './hdsl.js'
import type { HdslReading } from './hdsl.js'
import { packageRoot } from './package-root.js'
import { createPeakRate } from './peakrate.js'
import { createPrices } from './prices.js'
import { QUERY_MAX, createSessionSearch } from './search.js'
import { billingRowsOf, createSessionCost } from './session-cost.js'
import { createSessionPanel } from './session-panel.js'
import { sessionDirectoryName } from './session-name.js'
import { createUsage } from './usage.js'

/** The copy document, built from `packages/client/data/model-descriptions.json` by scripts/build/build.mjs. */
const COPY_FILE = 'model-descriptions.json'

/** The custom price rows one ask carries: one `b` query parameter per row, plus the currency they are written in. */
const BILLING_ROWS_MAX = 32
const BILLING_ROW_MAX = 256

function readBillingRows(query: URLSearchParams) {
  const currency = query.get('cur')
  const rows = query.getAll('b').slice(0, BILLING_ROWS_MAX).filter(row => row.length <= BILLING_ROW_MAX)
  return billingRowsOf(rows, currency === 'CNY' || currency === 'USD' ? currency : null)
}

/**
 * Read one play request and play its cue. The body is the request's own
 * boundary, so a malformed or oversized one is answered 400 or 413 rather than
 * thrown at the server; an unavailable system player is a 409 the browser half
 * reads as "use your own synthesis" (D89).
 */
async function playSoundRequest(req: DshRequest, res: DshResponse) {
  const body = await readRequestBody(req, SOUND_BODY_MAX)
  if (body === null) {
    sendJson(res, 413, { ok: false, error: 'request body too large' })
    return
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(body.toString('utf8'))
  } catch {
    // A body this route cannot read is the request's own error, answered 400;
    // nothing on the host needs the parse to succeed.
    sendJson(res, 400, { ok: false, error: 'request body is not JSON' })
    return
  }
  const request = parsed !== null && typeof parsed === 'object' ? parsed as { name?: unknown, volume?: unknown } : null
  if (request === null || !isSoundName(request.name)) {
    sendJson(res, 400, { ok: false, error: 'unknown sound' })
    return
  }
  if (soundCapability().playback !== 'system') {
    sendJson(res, 409, { ok: false, error: 'system playback unavailable' })
    return
  }
  await playSystemSound(request.name, clampSoundVolume(request.volume))
  sendJson(res, 200, { ok: true })
}
/**
 * Webfonts this plugin serves under `${ROUTE_PREFIX}/fonts/`, mapped to their
 * content type. The table is a whitelist: the filename is the whole request
 * contract, so no path outside the two directories below is reachable.
 *
 * A name is looked up in the user's own drop point first — the harness home's
 * `dsh-claude-style/fonts/` — and then in the package's `lib/fonts/` (D75). The
 * Anthropic faces are not in the npm package (copyright), so only a copy the user
 * dropped in answers them; a name neither directory holds is absent, and the
 * browser half registers no `@font-face` for a name this route does not report.
 */
const FONT_FILES = {
  'JetBrainsMonoVariable.ttf': 'font/ttf',
  'JetBrainsMonoItalicVariable.ttf': 'font/ttf',
  ...Object.fromEntries(OPTIONAL_WEBFONTS.map(face => [face.file, 'font/ttf'])),
  'InterVariable.woff2': 'font/woff2',
  'NotoSerifVariable.woff2': 'font/woff2',
  'ClaudeStylePixel.woff2': 'font/woff2',
}
/** The webfonts status route as the prefix handler sees it: its path without the registered prefix. */
const WEBFONTS_SUB = WEBFONTS_PATH.slice(ROUTE_PREFIX.length)
/**
 * The assets the build routed rather than inlined, served under
 * `${ROUTE_PREFIX}/assets/` from the build output in `lib/assets/`.
 *
 * The request name is the whole contract: it must be a key of the build's
 * manifest, which is `<content hash>.<ext>`, so nothing outside that directory is
 * reachable and a name the build did not produce is a 404. The name carries the
 * content hash, so the answer may be cached for good. A text asset is stored
 * brotli-compressed beside its name: a client that takes brotli receives it as it
 * lies, and one that does not gets it decompressed.
 */
const ASSETS_PATH = `${ROUTE_PREFIX}/assets/`
/** Largest deletion request body read; a real one carries one id. */
const DELETE_BODY_MAX = 4096
/** Largest play request body read; a real one carries a cue name and a gain. */
const SOUND_BODY_MAX = 1024

/**
 * An id the deletion route takes: the characters a plugin-generated id carries
 * (`:`, `@`), and none that could name a place of its own. The stored name
 * escapes `/`, `\` and `~`, so an id carrying one is refused here rather than
 * silently resolved through the escape.
 */
const SESSION_ID_RE = /^[A-Za-z0-9._\-:@]{1,200}$/

/** A background job id the panel may read output for: the registry's own `<kind>-<hex>` shape. */
const JOB_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{1,80}$/

/**
 * Whether the host holds this session open right now.
 *
 * A live session's log is being appended to, so its directory must not be removed
 * under the writer. A sessions service that offers no way to read its live set
 * answers "live": an unreadable set cannot authorize the deletion.
 */
function sessionIsLive(ctx: DshContext, sessionId: string): boolean {
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

/**
 * Drop one id from the workspace registry's archive set, durably.
 *
 * The registry is read at request time because it mounts with the workspace domain
 * and can complete after this plugin. A host without one has no archive set to
 * update, while a failing unarchive propagates: the route answers 500, the row
 * stays, and the next delete retries.
 */
async function unarchiveSession(ctx: DshContext, sessionId: string) {
  const registry = ctx.get('workspaceRegistry')
  if (typeof registry?.unarchiveSession !== 'function') return
  await registry.unarchiveSession(sessionId)
}

/**
 * Delete one stored session: the directory named by the id under one of the
 * sessions root's working-directory directories, and the id's entry in the
 * workspace registry's archive set.
 *
 * The id reaches the filesystem as the name the harness stores it under, never as
 * its own spelling, and only after the id check: the lookup is by exact name and
 * the resolved directory must stay inside the sessions root.
 *
 * The archive set can name a session whose directory is already gone. The miss
 * answers success too: the unarchive resolves without writing for an id it does
 * not hold, so the entry leaves the set and the row does not come back on the
 * next reload.
 */
async function deleteSession(ctx: DshContext, req: DshRequest, res: DshResponse) {
  const refused = refusalOf(ctx, req)
  if (refused !== undefined) {
    sendJson(res, refused, { ok: false, error: refused === 401 ? 'unauthorized' : 'forbidden' })
    return
  }
  const raw = await readRequestBody(req, DELETE_BODY_MAX)
  if (raw === null) {
    // An oversized body leaves its remainder unread: the socket is ended once
    // this request's answer is out, never before it.
    res.once('finish', () => req.destroy())
  }
  let request = null
  try {
    request = raw === null ? null : JSON.parse(raw.toString('utf8'))
  } catch {
    // A body that is not JSON is the client's error: the id check below answers 400.
    request = null
  }
  const sessionId = request !== null && typeof request.sessionId === 'string' ? request.sessionId : ''
  if (!SESSION_ID_RE.test(sessionId)) {
    sendJson(res, 400, { ok: false, error: 'invalid session id' })
    return
  }
  // The id is looked up under the name the storage holds it under, never under
  // its own spelling: `:` and `@` in a plugin-generated id are escaped there.
  const storedName = sessionDirectoryName(sessionId)
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
    const candidate = join(root, entry, storedName)
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
  // The comparison has to be between resolved paths: an entry inside the root
  // that is itself a symlink carries a recursive removal out of it, and
  // `resolve` only normalizes the spelling (D75).
  const realRoot = realpathSync(root)
  if (!realpathSync(dir).startsWith(realRoot + sep)) {
    sendJson(res, 403, { ok: false, error: 'session directory outside the sessions root' })
    return
  }
  // A session opened while the scan above ran is live by now, and the first
  // check could not see it: asking again leaves only the gap between this check
  // and the removal.
  if (sessionIsLive(ctx, sessionId)) {
    sendJson(res, 409, { ok: false, error: 'session is open' })
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
export function registerRoutes(ctx: DshContext, scope: DshScope) {
  // The built output and the bundled fonts hang off the plugin package's own
  // directory; the fonts a user drops in live under the harness home.
  const root = packageRoot()
  // The copy document is build output beside the client bundle in lib/.
  const file = join(root, 'lib', COPY_FILE)
  const fontsDir = join(root, 'lib', 'fonts')
  /** Where a user's own faces live; resolved per request, so a file added while the host runs is served. */
  const userFontsDir = () => pluginPath(ctx, 'fonts')
  const assetsDir = join(root, 'lib', 'assets')
  const { sendFile, sendAsset } = createStaticFiles(ctx, PACKAGE_NAME, assetsDir)

  scope.effect(() => {
    const disposers: (() => void)[] = []
    const report = (message: string, error: unknown) => ctx.logger?.warn?.(`${PACKAGE_NAME}: ${message}: ${(error as { message?: string } | null)?.message ?? String(error)}`)

    /**
     * Register one route. The web server refuses a path another plugin already
     * holds by throwing; that refusal is reported and the other routes still
     * register, because a throw here would fail this fiber and drop the client
     * bundle — the whole skin — with it (D12). A host without a web server
     * registers nothing, and nothing below is built for it.
     */
    const server = scope.webServer
    if (server === undefined || server === null) {
      report('web server unavailable', new Error('the host carries no webServer service, so no route of this plugin is registered'))
      return
    }
    const usage = createUsage(ctx)
    const hdsl = createHdslAccount(ctx)
    const sessionSearch = createSessionSearch(ctx)
    const peakrate = createPeakRate(ctx)
    const prices = createPrices(ctx)
    const sessionCost = createSessionCost(ctx, prices)
    const sessionPanel = createSessionPanel(ctx, sessionCost)
    // The listener is what makes a total O(1) after the first read; the
    // snapshot loads on the first ask, so a reader who never opens the figures
    // never reaches the repository.
    sessionCost.ensure()
    // The panel's answers are folded on demand; the watch only marks a fold
    // stale, so a reader who never opens the panel never builds one.
    sessionPanel.ensure()

    const register = (label: string, route: DshRoute) => {
      try {
        const dispose = server.register(route)
        // A register that answers nothing has nothing to dispose; a rejection
        // is what the catch below reports.
        if (typeof dispose === 'function') disposers.push(dispose as () => void)
      } catch (error) {
        report(`${label} route unavailable`, error)
      }
    }

    /** Answer with a promise's payload spread under `ok: true`; a rejection is a 500 carrying its message. */
    const sendPayload = (res: DshResponse, answer: Promise<object>) => {
      void answer.then((value: object) => {
        sendJson(res, 200, { ok: true, ...value })
      }, (error: unknown) => {
        sendJson(res, 500, { ok: false, error: String((error as { message?: string } | null)?.message ?? String(error)) })
      })
    }

    /**
     * Answer a route's rejected promise: a 500 carrying its message, or a
     * closed socket when the headers already went out.
     */
    const fail = (res: DshResponse, error: unknown) => {
      if (res.headersSent) res.destroy()
      else sendJson(res, 500, { ok: false, error: String((error as { message?: string } | null)?.message ?? String(error)) })
    }

    /**
     * The session id one read route serves, after the two checks every read of
     * the user's own session runs — the method, then the host's peer fence
     * (D75) — and the shape the id must keep: it names a stored session, so it
     * never reaches the host as a path. Null means the answer already went out.
     */
    const guardedSessionId = (req: DshRequest, res: DshResponse): string | null => {
      if (methodRefused(req, res, ['GET'])) return null
      if (fenceRefused(ctx, req, res)) return null
      const sessionId = (new URL(req.url ?? '/', 'http://local').searchParams.get('id') ?? '').trim()
      if (SESSION_ID_RE.test(sessionId)) return sessionId
      sendJson(res, 400, { ok: false, error: 'invalid session id' })
      return null
    }

    register('model copy', {
      kind: 'prefix',
      path: ROUTE_PREFIX,
      handler: (req: DshRequest, res: DshResponse) => {
        if (methodRefused(req, res, ['GET', 'HEAD'])) return
        // The page's own reading material, behind the same fence as every other
        // route: a same-origin subresource sends no Origin and a `same-origin`
        // `Sec-Fetch-Site`, both of which the fence allows (D75).
        if (fenceRefused(ctx, req, res)) return
        /* v8 ignore next -- node:http always sets url on server requests. */
        const sub = new URL(req.url ?? '/', 'http://x').pathname.slice(ROUTE_PREFIX.length)
        if (sub === `/${COPY_FILE}`) {
          sendFile(res, req.method ?? 'GET', file, {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-cache',
          })
          return
        }
        if (sub === WEBFONTS_SUB) {
          // The optional faces in place: the browser half declares a @font-face
          // for these alone, so an install without the files sends no font
          // request at all. Read per request, so a file dropped in while the
          // host runs is reported on the page's next load.
          const faces = OPTIONAL_WEBFONTS.filter(face => existsSync(join(userFontsDir(), face.file))).map(face => face.file)
          sendJson(res, 200, { ok: true, faces })
          return
        }
        const font = sub.startsWith('/fonts/') ? (FONT_FILES as Record<string, string | undefined>)[sub.slice('/fonts/'.length)] : undefined
        if (font !== undefined) {
          // The whitelisted name is the whole contract; the user's own copy
          // wins over the bundled face of the same name.
          const name = sub.slice('/fonts/'.length)
          const dropped = join(userFontsDir(), name)
          // The filename changes with the package, so a long cache is safe
          // and keeps the code face off the network after first paint.
          sendFile(res, req.method ?? 'GET', existsSync(dropped) ? dropped : join(fontsDir, name), {
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
      handler: (req: DshRequest, res: DshResponse) => {
        // One-shot OS user resolution for the browser half; it caches the
        // response and never polls. The exact route wins over the prefix above.
        if (methodRefused(req, res, ['GET', 'HEAD'])) return
        if (fenceRefused(ctx, req, res)) return
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

    register('sound', {
      kind: 'exact',
      path: SOUND_PATH,
      handler: (req: DshRequest, res: DshResponse) => {
        // GET answers whether this machine can play the cues; POST plays one.
        // Both sit behind the same fence as every other route, and a failure to
        // start the player answers 500 so the browser half can fall back (D89).
        if (methodRefused(req, res, ['GET', 'POST'])) return
        if (fenceRefused(ctx, req, res)) return
        if (req.method !== 'POST') {
          sendJson(res, 200, soundCapability())
          return
        }
        void playSoundRequest(req, res).catch((error: unknown) => fail(res, error))
      },
    })

    register('HDSL account', {
      kind: 'exact',
      path: HDSL_PATH,
      handler: (req: DshRequest, res: DshResponse) => {
        // Read-only and same-origin only; the player's avatar path is dropped
        // here: the browser half needs a picture, not the home directory it
        // lives in.
        if (methodRefused(req, res, ['GET', 'HEAD'])) return
        if (fenceRefused(ctx, req, res)) return
        sendPayload(res, hdsl.read().then((profile: HdslReading) => {
          const { skinFile, ...account } = profile
          return account
        }))
      },
    })

    register('HDSL skin', {
      kind: 'exact',
      path: HDSL_SKIN_PATH,
      handler: (req: DshRequest, res: DshResponse) => {
        // The player's own avatar. The path comes from the environment and
        // never from the request, so this route cannot be pointed anywhere; a
        // missing file is a 404 and the browser half falls back to the brand
        // mark.
        if (methodRefused(req, res, ['GET', 'HEAD'])) return
        if (fenceRefused(ctx, req, res)) return
        // A failed read propagates to the web server, which logs it and answers.
        return hdsl.read().then((profile: HdslReading) => {
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
      handler: (req: DshRequest, res: DshResponse) => {
        // POST only: the browser half sends one id, and a GET must never
        // reach the filesystem.
        if (methodRefused(req, res, ['POST'])) return
        // A fault anywhere in the deletion answers 500 with its message.
        void deleteSession(ctx, req, res).catch((error: unknown) => fail(res, error))
      },
    })

    register('usage', {
      kind: 'exact',
      path: USAGE_PATH,
      handler: (req: DshRequest, res: DshResponse) => {
        // Read-only and same-origin only: the answer is the plugin's own
        // aggregate over the user's session history. A cold pass reports
        // `computing` and the browser half keeps its skeleton up; the service
        // owns when a pass is due, so asking faster than its period starts
        // nothing.
        if (methodRefused(req, res, ['GET', 'HEAD'])) return
        if (fenceRefused(ctx, req, res)) return
        void usage.refresh()
        const snapshot = usage.snapshot()
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
      handler: (req: DshRequest, res: DshResponse) => {
        // Read-only, behind the same fence as the usage route: the answer quotes
        // the user's own conversations. Without `?q=` it only brings the message
        // cache up to date, which the palette asks for as it opens.
        if (methodRefused(req, res, ['GET'])) return
        if (fenceRefused(ctx, req, res)) return
        const query = (new URL(req.url ?? '/', 'http://local').searchParams.get('q') ?? '').trim().slice(0, QUERY_MAX)
        const answer = query === ''
          ? sessionSearch.warm().then(() => ({ sessions: [] }))
          : sessionSearch.search(query)
        sendPayload(res, answer)
      },
    })

    register('peak rate', {
      kind: 'exact',
      path: PEAKRATE_PATH,
      handler: (req: DshRequest, res: DshResponse) => {
        // The catalog is public data and the browser half is the only client, so
        // the fence keeps every other page from making the host reach the source.
        // `POST` is the browser half asking for a fresh copy, because it cannot
        // name the source itself.
        if (methodRefused(req, res, ['GET', 'POST'])) return
        if (fenceRefused(ctx, req, res)) return
        peakrate.ensure()
        const answer = req.method === 'POST' ? peakrate.refresh().then(() => peakrate.payload()) : Promise.resolve(peakrate.payload())
        sendPayload(res, answer)
      },
    })

    register('prices', {
      kind: 'exact',
      path: PRICES_PATH,
      handler: (req: DshRequest, res: DshResponse) => {
        // Read-only apart from the refresh ask; the table is public data, and the
        // fence keeps every other page from making the host reach the repository.
        if (methodRefused(req, res, ['GET', 'POST'])) return
        if (fenceRefused(ctx, req, res)) return
        prices.ensure()
        const answer = req.method === 'POST' ? prices.refresh().then(() => prices.payload()) : Promise.resolve(prices.payload())
        sendPayload(res, answer)
      },
    })

    register('session cost', {
      kind: 'exact',
      path: SESSION_COST_PATH,
      handler: (req: DshRequest, res: DshResponse) => {
        // The answer is the user's own conversation priced, so it runs the same
        // fence as the usage roll-up and never accepts a path outside one id.
        const sessionId = guardedSessionId(req, res)
        if (sessionId === null) return
        // The reader's own rows travel with the ask (billing-table.ts): the host
        // prices with them, so a session is priced the same on a restart as in
        // the page that holds the settings.
        const billing = readBillingRows(new URL(req.url ?? '/', 'http://local').searchParams)
        sendPayload(res, sessionCost.get(sessionId, billing).then(value => ({ value })))
      },
    })

    register('session panel', {
      kind: 'exact',
      path: SESSION_PANEL_PATH,
      handler: (req: DshRequest, res: DshResponse) => {
        // The answer describes the user's own session, so it runs the same
        // fence as the figures and never accepts a path outside one id.
        const sessionId = guardedSessionId(req, res)
        if (sessionId === null) return
        // `?job=` asks for one job's retained output instead of the fold: the
        // panel expands a row on demand and never carries output it is not showing.
        const params = new URL(req.url ?? '/', 'http://local').searchParams
        const jobId = (params.get('job') ?? '').trim()
        if (jobId !== '') {
          if (!JOB_ID_RE.test(jobId)) {
            sendJson(res, 400, { ok: false, error: 'invalid job id' })
            return
          }
          sendPayload(res, Promise.resolve({ value: sessionPanel.jobOutput(sessionId, jobId) }))
          return
        }
        // `?live=1` asks past the kept answer: the page wakes the rail on every
        // figure the host lands, and a cache hit would hand it the numbers the
        // wake was meant to replace (D94).
        sendPayload(res, sessionPanel.get(sessionId, readBillingRows(params), params.get('live') === '1').then(value => ({ value })))
      },
    })

    for (const { label, route } of brandRoutes(ctx)) register(label, route)

    return () => {
      usage.dispose()
      peakrate.dispose()
      prices.dispose()
      sessionCost.dispose()
      sessionSearch.dispose()
      sessionPanel.dispose()
      // One route's disposer failing must not keep the others registered
      // (D12); the failure is reported.
      for (const dispose of disposers) {
        try {
          dispose()
        } catch (error) {
          report('route disposal failed', error)
        }
      }
    }
  }, `${PACKAGE_NAME}: host routes`)
}
