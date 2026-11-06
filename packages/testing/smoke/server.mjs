/**
 * The stand-in host's own server: the built bundle, the routed assets under the
 * build's manifest, the launcher's pictures, and one HTML page per name. The
 * smoke and the behaviour layer (D87) load their pages from it, so both read
 * the same stand-in and the same build output.
 */
import fs from 'fs'
import http from 'http'
import path from 'path'
import { ROOT, CLIENT, PNG_1PX, SKIN_FIXTURE, SKIN_CASES } from './shared.mjs'

/**
 * The build's asset manifest: which names the page may ask for, their type and
 * their storage. The page's own server answers from it exactly as the host
 * half does.
 */
function readAssets() {
  const manifest = path.join(ROOT, 'lib', 'assets', 'manifest.json')
  if (!fs.existsSync(manifest)) throw new Error('smoke: lib/assets/manifest.json is missing; run npm run build')
  return JSON.parse(fs.readFileSync(manifest, 'utf8')).assets
}

/**
 * Serve the stand-in pages on a free local port.
 * @param html - the page for a name, or undefined where there is none.
 * @returns the base URL and how to close the server.
 */
async function serveStandIn(html) {
  const assets = readAssets()
  /** The page whose HTML was served last; pages run at once, so a request is answered for the page named in its referer. */
  let current = null
  /**
   * Which page a request belongs to. Every request a page makes — the bundle,
   * the routed assets, the launcher's pictures — carries that page's own URL as
   * its referer, which is what keeps the pages apart while several of them are
   * being driven. A request with none is answered for the last page served.
   */
  const fromPage = (req) => {
    const referer = req.headers.referer
    if (referer === undefined) return current
    try {
      return new URL(referer).pathname.slice(1)
    } catch {
      return current
    }
  }
  const server = http.createServer((req, res) => {
    const name = new URL(req.url, 'http://x').pathname.slice(1)
    if (name === 'client.js') {
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' })
      res.end(fs.readFileSync(CLIENT))
    } else if (name === 'dsh-claude-style/hdsl-skin.png') {
      // The launcher's atlas, which the skin loads outside `fetch`, so the
      // page-side stand-in cannot answer it. `hdsl-broken` models a file the
      // player removed after the launcher wrote the contract.
      if (SKIN_CASES.indexOf(fromPage(req)) === -1) {
        res.writeHead(404, { 'cache-control': 'no-store' })
        res.end()
        return
      }
      res.writeHead(200, { 'content-type': 'image/png' })
      res.end(fs.readFileSync(SKIN_FIXTURE))
    } else if (name === 'dsh-claude-style/brand/mark' || name === 'dsh-claude-style/brand/wordmark') {
      // The custom-brand case's images, loaded outside `fetch` like the
      // launcher's atlas: a one-pixel mark, and a wordmark whose only size is
      // a 4:1 viewBox, so the measured proportions are observable.
      if (fromPage(req) !== 'custom-brand') {
        res.writeHead(404, { 'cache-control': 'no-store' })
        res.end()
        return
      }
      if (name.endsWith('/mark')) {
        res.writeHead(200, { 'content-type': 'image/png' })
        res.end(Buffer.from(PNG_1PX, 'base64'))
        return
      }
      res.writeHead(200, { 'content-type': 'image/svg+xml' })
      res.end('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100"><rect width="400" height="100"/></svg>')
    } else if (name.startsWith('dsh-claude-style/assets/')) {
      // The routed assets, from the build output the host half serves them
      // from. The manifest is the same gate here: a name the build did not
      // produce answers 404.
      const file = name.slice('dsh-claude-style/assets/'.length)
      const asset = assets[file]
      // The chunk-fault case's route carries none of the feature chunks, the
      // way a host still serving the bundle it read before an update answers (D72).
      const chunkRefused = fromPage(req) === 'chunk-fault' && file.endsWith('.js')
      if (asset === undefined || chunkRefused) {
        res.writeHead(404)
        res.end()
        return
      }
      const stored = path.join(ROOT, 'lib', 'assets', asset.encoding === 'br' ? `${file}.br` : file)
      if (!fs.existsSync(stored)) {
        res.writeHead(404)
        res.end()
        return
      }
      res.writeHead(200, {
        'content-type': asset.type,
        'cache-control': 'public, max-age=31536000, immutable',
        // The page is a browser: it takes the stored payload as it lies.
        ...(asset.encoding === 'br' ? { 'content-encoding': 'br' } : {}),
      })
      res.end(fs.readFileSync(stored))
    } else {
      const body = html(name)
      if (body === undefined) {
        res.writeHead(404)
        res.end()
        return
      }
      current = name
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(body)
    }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  }
}

export { serveStandIn }
