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
import { HDSL_PATH, HDSL_SKIN_PATH, PEAKRATE_PATH, ROUTE_PREFIX, SESSION_DELETE_PATH, SESSION_SEARCH_PATH, USAGE_PATH, USERNAME_PATH } from '@dsh-claude-style/contracts/routes'
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
import { QUERY_MAX, createSessionSearch } from './search.js'
import { createUsage } from './usage.js'

/** The copy document, built from `packages/client/data/model-descriptions.json` by scripts/build.mjs. */
const COPY_FILE = 'model-descriptions.json'
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
 * half's font stacks fall back from.
 */
const FONT_FILES = {
  'JetBrainsMonoVariable.ttf': 'font/ttf',
  'JetBrainsMonoItalicVariable.ttf': 'font/ttf',
  'AnthropicSansWebText.ttf': 'font/ttf',
  'AnthropicSerifWebText.ttf': 'font/ttf',
  'AnthropicMonoWeb.ttf': 'font/ttf',
  'InterVariable.woff2': 'font/woff2',
  'NotoSerifVariable.woff2': 'font/woff2',
}
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
/**
 * How long a computed roll-up is served before a background refresh is kicked.
 *
 * The pass reads only the logs whose size or modification time changed
 * (usage.ts), so a refresh on an idle home walks the session root and stats each
 * log while folding nothing. The window is short because the panel draws the
 * numbers it reads here: a reader who has just sent a message should not wait
 * out a cache window to see it.
 */
const USAGE_TTL_MS = 30 * 1000
/** Largest deletion request body read; a real one carries one id. */
const DELETE_BODY_MAX = 4096

/**
 * The single directory name the harness stores one session id under: a code
 * unit outside `A-Za-z0-9._-` becomes `~XXXX`, `.` and `..` included, so the
 * mapping is injective over every id and a plugin-generated id
 * (`im:<channel>:dm:<user>:<token>@<domain>`) has a name of its own.
 *
 * This restates `encodeSegment` in the host's session persistence
 * (`@deepseek-ai/dsh-session-persistence-jsonl`), which no shared module hands
 * to the host half, so the storage layout lives beside the one route that reads
 * it.
 */
function sessionDirectoryName(id: string): string {
  if (id === '.') return '~002E'
  if (id === '..') return '~002E~002E'
  let name = ''
  for (let index = 0; index < id.length; index += 1) {
    const unit = id.charAt(index)
    name += unit !== '~' && /^[A-Za-z0-9._-]$/.test(unit)
      ? unit
      : `~${id.charCodeAt(index).toString(16).toUpperCase().padStart(4, '0')}`
  }
  return name
}

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
        /* v8 ignore next -- node:http always sets url on server requests. */
        const sub = new URL(req.url ?? '/', 'http://x').pathname.slice(ROUTE_PREFIX.length)
        if (sub === `/${COPY_FILE}`) {
          sendFile(res, req.method ?? 'GET', file, {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-cache',
          })
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
        // skeleton up while it polls.
        if (methodRefused(req, res, ['GET', 'HEAD'])) return
        if (fenceRefused(ctx, req, res)) return
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

    for (const { label, route } of brandRoutes(ctx)) register(label, route)

    return () => {
      usage.dispose()
      peakrate.dispose()
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
