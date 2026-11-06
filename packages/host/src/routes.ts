/**
 * The plugin's host routes: everything the browser half cannot reach itself.
 *
 * These are the surfaces D75 describes — the model copy document, the webfonts,
 * the OS user, the HDSL account, the routed assets, session deletion, the
 * usage and search roll-ups, the peak rate catalog and the reader's brand
 * images (packages/host/src/brand.ts) — each registered on the
 * host's web server under this plugin's route prefix. Every route is
 * registered on its own: one path the web server refuses is reported, and the
 * other routes still register.
 *
 * The paths are the shared contract (`@dsh-claude-style/contracts/routes`, * D73): the browser half addresses the same names.
 */
import { PACKAGE_NAME } from '@dsh-claude-style/contracts/package'
import { HDSL_PATH, HDSL_SKIN_PATH, PEAKRATE_PATH, PRICES_PATH, ROUTE_PREFIX, SESSION_COST_PATH, SESSION_DELETE_PATH, SESSION_SEARCH_PATH, USAGE_PATH, USERNAME_PATH, WEBFONTS_PATH } from '@dsh-claude-style/contracts/routes'
import { OPTIONAL_WEBFONTS } from '@dsh-claude-style/contracts/webfonts'
import { existsSync, readFileSync, readdirSync, realpathSync, rmSync, statSync } from 'node:fs'
import { userInfo } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { brandRoutes } from './brand.js'
import type { DshContext, DshRequest, DshResponse, DshRoute, DshScope } from '@dsh-claude-style/engine/node/dsh'
import { harnessPath } from '@dsh-claude-style/engine/node/harness-home'
import { pluginPath } from './harness-home.js'
import { fenceRefused, methodRefused, readRequestBody, refusalOf, sendJson } from '@dsh-claude-style/engine/node/http'
import { createStaticFiles } from '@dsh-claude-style/engine/node/static-files'
import { createHdslAccount } from './hdsl.js'
import type { HdslReading } from './hdsl.js'
import { packageRoot } from './package-root.js'
import { createPeakRate } from './peakrate.js'
import { createPrices } from './prices.js'
import { QUERY_MAX, createSessionSearch } from './search.js'
import { billingRowsOf, createSessionCost } from './session-cost.js'
import { sessionDirectoryName } from './session-name.js'
import { createUsage } from './usage.js'

/** The copy document, built from `packages/client/data/model-descriptions.json` by scripts/build.mjs. */
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
 * Webfonts this plugin serves under `${ROUTE_PREFIX}/fonts/`, mapped to their
 * content type. The table is a whitelist: the filename is the whole request
 * contract, so no path outside the two directories below is reachable and no
 * path traversal is possible.
 *
 * A name is looked up in the user's own drop point first — the harness home's
 * `dsh-claude-style/fonts/` — and then in the package's `lib/fonts/` (D75). The
 * JetBrains Mono files and the two look-alike faces behind the Anthropic ones
 * (Inter, Noto Serif) ship in the npm package; the Anthropic faces do not
 * (copyright), so only a copy the user dropped in answers them. A name neither
 * directory holds is absent: sendFile's ENOENT becomes a 404, which the browser
 * half's font stacks fall back from — that side registers no `@font-face` for a
 * name the webfonts route does not report (packages/client/src/shared/webfonts.ts).
 */
const FONT_FILES = {
  'JetBrainsMonoVariable.ttf': 'font/ttf',
  'JetBrainsMonoItalicVariable.ttf': 'font/ttf',
  ...Object.fromEntries(OPTIONAL_WEBFONTS.map(face => [face.file, 'font/ttf'])),
  'InterVariable.woff2': 'font/woff2',
  'NotoSerifVariable.woff2': 'font/woff2',
}
/** The webfonts status route as the prefix handler sees it: its path without the registered prefix. */
const WEBFONTS_SUB = WEBFONTS_PATH.slice(ROUTE_PREFIX.length)
/**
 * The assets the build routed rather than inlined, served under
 * `${ROUTE_PREFIX}/assets/` from the build output in `lib/assets/`
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
/** Largest deletion request body read; a real one carries one id. */
const DELETE_BODY_MAX = 4096

/**
 * An id the deletion route takes: the characters a plugin-generated id carries
 * (`:`, `@`), and none that could name a place of its own.
 *
 * The stored name below escapes `/`, `\` and `~` as well, so an id carrying one
 * is refused here rather than silently resolved through the escape: a client
 * naming a path segment is not naming a session.
 */
const SESSION_ID_RE = /^[A-Za-z0-9._\-:@]{1,200}$/

/**
 * Whether the host holds this session open right now.
 *
 * A live session's log is open and being appended to, so its directory must not
 * be removed under the writer. A sessions service that offers no way to read
 * its live set answers "live": an unreadable set cannot authorize the
 * deletion. A read that throws fails the request (500), which refuses the
 * deletion as well.
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
 * The registry is read at request time: it mounts with the workspace domain and
 * can complete after this plugin. A host without one has no archive set to
 * update — and no archived list to delete from — while a failing unarchive
 * propagates: the route answers 500, the row stays, and the next delete
 * retries through the miss branch.
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
 * The id reaches the filesystem as the name the harness stores it under, never
 * as its own spelling, and only after the id check: the lookup is by exact name
 * and the resolved directory must stay inside the sessions root.
 *
 * The archive set can name a session whose stored directory is already gone —
 * an earlier removal took the directory while the registry entry stayed, and
 * the stale session summary keeps its row on the archived list. The miss
 * answers success too: the registry's unarchive runs no existence check and
 * resolves without writing for an id that is not archived, so the entry leaves
 * the set either way and the row is gone for good instead of coming back on
 * the next reload.
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
     * bundle — the whole skin — with it (D12).
     *
     * A host that serves no web server at all registers nothing: that is said
     * once here, and nothing below is built, so the teardown is left with the
     * real disposers alone.
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
    // The listener is what makes a total O(1) after the first read; the
    // snapshot loads on the first ask, so a reader who never opens the figures
    // never reaches the repository.
    sessionCost.ensure()

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
        void deleteSession(ctx, req, res).catch((error: unknown) => {
          if (res.headersSent) res.destroy()
          else sendJson(res, 500, { ok: false, error: String((error as { message?: string } | null)?.message ?? String(error)) })
        })
      },
    })

    register('usage', {
      kind: 'exact',
      path: USAGE_PATH,
      handler: (req: DshRequest, res: DshResponse) => {
        // Read-only and same-origin only: the answer is the plugin's own
        // aggregate over the user's session history, which is why it runs the
        // same fence as the username route. It answers with whatever is already
        // known: a cold pass reports `computing` and the browser half keeps its
        // skeleton up while it polls. The service owns when a pass is due, so
        // asking faster than its period starts nothing.
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
        // Read-only, behind the same fence as the usage route: the answer
        // quotes the user's own conversations. Without `?q=` it only brings the
        // message cache up to date, which the palette asks for as it opens so
        // the first real query is quick (packages/host/src/search.ts).
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
        // The catalog is public data, and the browser half is the only client:
        // the route runs the same fence as the rest of the plugin's routes so
        // that only this page can make the host reach the source. `POST` is the
        // browser half asking for a fresh copy, because it cannot name the
        // source itself.
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
        // Read-only apart from the refresh ask; the table is public data, and
        // the fence keeps the same rule as the other routes: only this page
        // makes the host reach the repository.
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
        if (methodRefused(req, res, ['GET'])) return
        if (fenceRefused(ctx, req, res)) return
        const query = new URL(req.url ?? '/', 'http://local').searchParams
        const sessionId = (query.get('id') ?? '').trim()
        if (!SESSION_ID_RE.test(sessionId)) {
          sendJson(res, 400, { ok: false, error: 'invalid session id' })
          return
        }
        // The reader's own rows travel with the ask (billing-table.ts): the host
        // prices with them, so a session is priced the same on a restart as in
        // the page that holds the settings.
        const billing = readBillingRows(query)
        sendPayload(res, sessionCost.get(sessionId, billing).then(value => ({ value })))
      },
    })

    for (const { label, route } of brandRoutes(ctx)) register(label, route)

    return () => {
      usage.dispose()
      peakrate.dispose()
      prices.dispose()
      sessionCost.dispose()
      sessionSearch.dispose()
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
