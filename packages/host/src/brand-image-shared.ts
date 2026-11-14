/** Security headers and byte checks shared by legacy and named brand images. */

import { BRAND_IMAGE_MAX_BYTES } from '@dsh-claude-style/contracts/brand'
import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { readRequestBody, sendJson } from '@dsh-claude-style/engine/node/http'
import type { DshRequest, DshResponse } from '@dsh-claude-style/engine/node/dsh'

export const IMAGE_HEADERS = {
  'cache-control': 'no-cache',
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  'x-content-type-options': 'nosniff',
}

const SIGNATURES: Readonly<Record<string, readonly { offset: number, bytes: Buffer }[]>> = {
  'image/png': [{ offset: 0, bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }],
  'image/webp': [{ offset: 0, bytes: Buffer.from('RIFF', 'latin1') }, { offset: 8, bytes: Buffer.from('WEBP', 'latin1') }],
}

export function matchesSignature(type: string, bytes: Buffer) {
  const marks = SIGNATURES[type]
  if (marks === undefined) return true
  return marks.every(({ offset, bytes: expected }) => bytes.subarray(offset, offset + expected.length).equals(expected))
}

export function imageBytesValid(type: string, bytes: Buffer) {
  return bytes.length > 0 && bytes.length <= BRAND_IMAGE_MAX_BYTES && matchesSignature(type, bytes)
}

/** Answer a route failure without writing past the response headers. */
export function routeFailure(res: DshResponse, error: unknown) {
  if (res.headersSent) res.destroy()
  else sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
}

/** Read and validate one upload, answering a refusal before any storage write. */
export async function readImageUpload(req: DshRequest, res: DshResponse) {
  const type = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase()
  if (type !== 'image/png' && type !== 'image/svg+xml' && type !== 'image/webp') {
    sendJson(res, 415, { ok: false, error: 'unsupported image type' })
    return null
  }
  const bytes = await readRequestBody(req, BRAND_IMAGE_MAX_BYTES)
  if (bytes === null) {
    res.once('finish', () => req.destroy())
    sendJson(res, 413, { ok: false, error: 'image too large' })
    return null
  }
  if (!imageBytesValid(type, bytes)) {
    sendJson(res, 400, { ok: false, error: 'not an image of the declared type' })
    return null
  }
  return { type, bytes }
}

/** Replace one file atomically, then remove any older variants by name. */
export function writeAtomicFile(target: string, bytes: Buffer, older: readonly string[]) {
  mkdirSync(dirname(target), { recursive: true })
  const temporary = target + '.' + process.pid + '.tmp'
  writeFileSync(temporary, bytes)
  renameSync(temporary, target)
  for (const path of older) rmSync(path, { force: true })
}
