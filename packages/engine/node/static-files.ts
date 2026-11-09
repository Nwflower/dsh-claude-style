/**
 * Serving the files a plugin ships beside its code: one static file per request,
 * and the content-hashed assets a build routed rather than inlined.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { brotliDecompressSync } from 'node:zlib'
import type { DshContext, DshRequest, DshResponse } from './dsh'

/** The build's asset manifest inside the assets directory: which names exist, their type and their storage. */
const ASSETS_MANIFEST = 'manifest.json'

/** Create file and manifest-backed asset responders. */
export function createStaticFiles(ctx: DshContext, packageName: string, assetsDir: string) {
  /** The decompressed payload of each brotli-stored asset served to a client that cannot take it. */
  const unpressed = new Map<string, Buffer>()

  /** Send a file, or an already held body; HEAD omits the payload. */
  function sendFile(res: DshResponse, method: string, path: string, headers: Record<string, string>, body: Buffer | null = null) {
    // An optional file the user never dropped in, or a name no build shipped,
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

  /** The build's asset manifest, or undefined when the build has not run. */
  function readManifest() {
    const path = join(assetsDir, ASSETS_MANIFEST)
    if (!existsSync(path)) return undefined
    try {
      return JSON.parse(readFileSync(path, 'utf8')).assets
    } catch (error) {
      // A manifest that cannot be read is a build that did not finish; say so
      // once per request and answer 404 rather than failing the route (D12).
      ctx.logger?.warn?.(`${packageName}: lib/assets/${ASSETS_MANIFEST} is unreadable: ${(error as { message?: string } | null)?.message ?? String(error)}`)
      return undefined
    }
  }

  /**
   * Read the manifest per request so rebuilds appear without restart.
   * Only manifest names are reachable; other paths return false.
   */
  function sendAsset(req: DshRequest, res: DshResponse, name: string) {
    const asset = readManifest()?.[name]
    if (asset === undefined) return false
    const stored = join(assetsDir, asset.encoding === 'br' ? `${name}.br` : name)
    const headers = {
      'content-type': asset.type,
      'cache-control': 'public, max-age=31536000, immutable',
    }
    const method = req.method ?? 'GET'
    if (asset.encoding !== 'br') {
      sendFile(res, method, stored, headers)
      return true
    }
    if (/\bbr\b/.test(req.headers['accept-encoding'] ?? '')) {
      sendFile(res, method, stored, { ...headers, 'content-encoding': 'br' })
      return true
    }
    // A client that does not take brotli: the sheet is decompressed, so it
    // is served rather than missing. Cached: the same few sheets are asked
    // for again on every reload of a page that never got them compressed.
    const cached = unpressed.get(name)
    if (cached !== undefined) {
      sendFile(res, method, stored, headers, cached)
      return true
    }
    if (!existsSync(stored)) {
      res.writeHead(404)
      res.end()
      return true
    }
    const body = brotliDecompressSync(readFileSync(stored))
    unpressed.set(name, body)
    sendFile(res, method, stored, headers, body)
    return true
  }

  return { sendFile, sendAsset }
}
