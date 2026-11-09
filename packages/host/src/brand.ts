/**
 * The reader's own brand images (D30), kept under the harness home's
 * `dsh-claude-style/brand/` as `mark.<ext>` and `wordmark.<ext>`.
 *
 * The status route answers which images are in place; each image's route serves,
 * replaces or removes its bytes. The files are the reader's and a write changes
 * what every page of this host paints, so every request runs the fence. The
 * directory is read per request, so a file dropped in by hand shows up on the
 * next status read.
 */
import { BRAND_IMAGE_KINDS, BRAND_IMAGE_MAX_BYTES, BRAND_IMAGE_TYPES } from '@dsh-claude-style/contracts/brand'
import type { BrandAnswer, BrandImageKind, BrandImageState } from '@dsh-claude-style/contracts/brand'
import { BRAND_MARK_PATH, BRAND_PATH, BRAND_WORDMARK_PATH } from '@dsh-claude-style/contracts/routes'
import { mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { DshContext, DshRequest, DshResponse, DshRoute } from '@dsh-claude-style/engine/node/dsh'
import { pluginPath } from './harness-home.js'
import { fenceRefused, methodRefused, readRequestBody, sendJson } from '@dsh-claude-style/engine/node/http'

/** Each image's route. */
const IMAGE_PATHS: Record<BrandImageKind, string> = { mark: BRAND_MARK_PATH, wordmark: BRAND_WORDMARK_PATH }

/**
 * Headers on every image answer. An SVG is a document that can carry script:
 * opened at its own address, `sandbox` keeps it from running any, and
 * `nosniff` keeps the browser from reading the bytes as another type.
 */
const IMAGE_HEADERS = {
  'cache-control': 'no-cache',
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  'x-content-type-options': 'nosniff',
}

/** The bytes a raster format opens with at a fixed offset; an SVG is text and carries none. */
const SIGNATURES: Readonly<Record<string, readonly { offset: number, bytes: Buffer }[]>> = {
  'image/png': [{ offset: 0, bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }],
  'image/webp': [{ offset: 0, bytes: Buffer.from('RIFF', 'latin1') }, { offset: 8, bytes: Buffer.from('WEBP', 'latin1') }],
}

/** One image file found on disk. */
interface StoredImage {
  path: string
  type: string
  state: BrandImageState
}

/**
 * The brand image directory and the reads and writes on it.
 *
 * @param ctx - host plugin context, for the harness home.
 */
function createBrandStore(ctx: DshContext) {
  const dir = () => pluginPath(ctx, 'brand')

  /** The file holding one image, in the type table's order, or null when there is none. */
  const find = (kind: BrandImageKind): StoredImage | null => {
    for (const [type, extension] of Object.entries(BRAND_IMAGE_TYPES)) {
      const path = join(dir(), `${kind}.${extension}`)
      const stat = statSync(path, { throwIfNoEntry: false })
      if (stat?.isFile() !== true) continue
      return { path, type, state: { type, version: `${Math.round(stat.mtimeMs)}-${stat.size}` } }
    }
    return null
  }

  const answer = (): BrandAnswer => ({ ok: true, mark: find('mark')?.state ?? null, wordmark: find('wordmark')?.state ?? null })

  /**
   * Replace one image. The bytes land through a temporary file and a rename, so
   * a read never sees half an image; the same image under another extension
   * goes afterwards, so the status read finds one file at every moment.
   */
  const write = (kind: BrandImageKind, type: string, bytes: Buffer) => {
    const extension = BRAND_IMAGE_TYPES[type]
    mkdirSync(dir(), { recursive: true })
    const target = join(dir(), `${kind}.${extension}`)
    const temporary = `${target}.${process.pid}.tmp`
    writeFileSync(temporary, bytes)
    renameSync(temporary, target)
    for (const other of Object.values(BRAND_IMAGE_TYPES)) {
      if (other !== extension) rmSync(join(dir(), `${kind}.${other}`), { force: true })
    }
  }

  const remove = (kind: BrandImageKind) => {
    for (const extension of Object.values(BRAND_IMAGE_TYPES)) rmSync(join(dir(), `${kind}.${extension}`), { force: true })
  }

  return { find, answer, write, remove }
}

/** Whether the bytes open the way their declared raster format requires. */
function matchesSignature(type: string, bytes: Buffer) {
  const marks = SIGNATURES[type]
  if (marks === undefined) return true
  return marks.every(({ offset, bytes: expected }) => bytes.subarray(offset, offset + expected.length).equals(expected))
}

/**
 * Store one uploaded image: the content type names the format, and the body is
 * held to the size limit and, for a raster format, to its signature.
 */
async function storeImage(store: ReturnType<typeof createBrandStore>, kind: BrandImageKind, req: DshRequest, res: DshResponse) {
  const type = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase()
  if (BRAND_IMAGE_TYPES[type] === undefined) {
    sendJson(res, 415, { ok: false, error: 'unsupported image type' })
    return
  }
  const bytes = await readRequestBody(req, BRAND_IMAGE_MAX_BYTES)
  if (bytes === null) {
    // The remainder of an oversized body stays unread: the socket is ended
    // once this answer is out, never before it.
    res.once('finish', () => req.destroy())
    sendJson(res, 413, { ok: false, error: 'image too large' })
    return
  }
  if (bytes.length === 0 || !matchesSignature(type, bytes)) {
    sendJson(res, 400, { ok: false, error: 'not an image of the declared type' })
    return
  }
  store.write(kind, type, bytes)
  sendJson(res, 200, store.answer())
}

/**
 * The brand routes, for the caller to register one by one.
 *
 * @param ctx - host plugin context.
 * @returns each route with the label its registration failure is reported under.
 */
export function brandRoutes(ctx: DshContext): { label: string, route: DshRoute }[] {
  const store = createBrandStore(ctx)
  const status: DshRoute = {
    kind: 'exact',
    path: BRAND_PATH,
    handler: (req, res) => {
      if (methodRefused(req, res, ['GET'])) return
      if (fenceRefused(ctx, req, res)) return
      sendJson(res, 200, store.answer())
    },
  }
  const images = BRAND_IMAGE_KINDS.map((kind): { label: string, route: DshRoute } => ({
    label: `brand ${kind}`,
    route: {
      kind: 'exact',
      path: IMAGE_PATHS[kind],
      handler: (req, res) => {
        if (methodRefused(req, res, ['GET', 'HEAD', 'PUT', 'DELETE'])) return
        if (fenceRefused(ctx, req, res)) return
        if (req.method === 'PUT' || req.method === 'DELETE') {
          // A storage fault answers 500 with the OS error (D12).
          const done = req.method === 'PUT'
            ? storeImage(store, kind, req, res)
            : Promise.resolve().then(() => {
              store.remove(kind)
              sendJson(res, 200, store.answer())
            })
          void done.catch((error: unknown) => {
            if (res.headersSent) res.destroy()
            else sendJson(res, 500, { ok: false, error: String((error as { message?: string } | null)?.message ?? String(error)) })
          })
          return
        }
        const found = store.find(kind)
        if (found === null) {
          res.writeHead(404, { 'cache-control': 'no-store' })
          res.end()
          return
        }
        const body = readFileSync(found.path)
        res.writeHead(200, { ...IMAGE_HEADERS, 'content-type': found.type, 'content-length': String(body.byteLength) })
        res.end(req.method === 'HEAD' ? undefined : body)
      },
    },
  }))
  return [{ label: 'brand status', route: status }, ...images]
}
