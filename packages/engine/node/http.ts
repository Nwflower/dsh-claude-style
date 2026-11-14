/**
 * The request handling every private route shares: the fence in front of the
 * user's own data, the method check, the bounded body read and the JSON answer.
 */
import type { DshContext, DshPeerScope, DshRequest, DshResponse } from './dsh'

/**
 * Current hosts fence and authenticate routes inside `webServer` before calling the
 * handler with an authenticated `peer` (requiring `owner` and non-aborted signal on
 * private routes). Earlier hosts fall back to `connection.requestRejection`, then a
 * loopback peer and Host/Origin check.
 */
export function refusalOf(ctx: DshContext, req: DshRequest, peer?: DshPeerScope) {
  if (peer !== undefined) {
    if (peer === null || typeof peer !== 'object' || peer.signal?.aborted === true) return 403
    return peer.principal?.kind === 'owner' ? undefined : 403
  }
  const connection = ctx.get('connection')
  if (typeof connection?.requestRejection === 'function') return connection.requestRejection(req)
  if (!isLoopbackPeer(req.socket.remoteAddress)) return 403
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

/** Accept IPv4 `127/8`, IPv6 `::1` and Node's IPv4-mapped dual-stack spelling. */
function isLoopbackPeer(address: string | undefined) {
  if (address === undefined) return false
  const plain = address.startsWith('::ffff:') ? address.slice('::ffff:'.length) : address
  return plain === '::1' || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(plain)
}

/** Send one JSON response. */
export function sendJson(res: DshResponse, status: number, payload: unknown) {
  const body = Buffer.from(JSON.stringify(payload))
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(body.byteLength),
    'cache-control': 'no-store',
  })
  res.end(body)
}

/** Send 405 with `Allow` for unsupported methods and report whether the request was refused. */
export function methodRefused(req: DshRequest, res: DshResponse, methods: string[]) {
  if (req.method !== undefined && methods.includes(req.method)) return false
  res.writeHead(405, { allow: methods.join(', ') })
  res.end()
  return true
}

/** Apply `refusalOf` before private-data routes and send its 401/403 JSON response. */
export function fenceRefused(ctx: DshContext, req: DshRequest, res: DshResponse, peer?: DshPeerScope) {
  const refused = refusalOf(ctx, req, peer)
  if (refused === undefined) return false
  sendJson(res, refused, { ok: false, error: refused === 401 ? 'unauthorized' : 'forbidden' })
  return true
}

/**
 * Return null for oversized/unreadable bodies. Drain oversized input without cutting
 * the socket so the caller can send 400/413 before ending it.
 */
export function readRequestBody(req: DshRequest, limit: number): Promise<Buffer | null> {
  return new Promise<Buffer | null>((settle) => {
    const chunks: Buffer[] = []
    let size = 0
    let over = false
    req.on('data', (chunk: Buffer | string) => {
      if (over) return
      size += chunk.length
      if (size > limit) {
        over = true
        settle(null)
        return
      }
      chunks.push(Buffer.from(chunk))
    })
    req.on('end', () => { if (!over) settle(Buffer.concat(chunks)) })
    req.on('error', () => { if (!over) settle(null) })
  })
}
