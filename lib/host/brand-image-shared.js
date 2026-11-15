// packages/contracts/src/brand.ts
var BRAND_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

// packages/host/src/brand-image-shared.ts
import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// packages/engine/node/http.ts
function sendJson(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(body.byteLength),
    "cache-control": "no-store"
  });
  res.end(body);
}
function readRequestBody(req, limit) {
  return new Promise((settle) => {
    const chunks = [];
    let size = 0;
    let over = false;
    req.on("data", (chunk) => {
      if (over) return;
      size += chunk.length;
      if (size > limit) {
        over = true;
        settle(null);
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    req.on("end", () => {
      if (!over) settle(Buffer.concat(chunks));
    });
    req.on("error", () => {
      if (!over) settle(null);
    });
  });
}

// packages/host/src/brand-image-shared.ts
var IMAGE_HEADERS = {
  "cache-control": "no-cache",
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  "x-content-type-options": "nosniff"
};
var SIGNATURES = {
  "image/png": [{ offset: 0, bytes: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) }],
  "image/webp": [{ offset: 0, bytes: Buffer.from("RIFF", "latin1") }, { offset: 8, bytes: Buffer.from("WEBP", "latin1") }]
};
function matchesSignature(type, bytes) {
  const marks = SIGNATURES[type];
  if (marks === void 0) return true;
  return marks.every(({ offset, bytes: expected }) => bytes.subarray(offset, offset + expected.length).equals(expected));
}
function imageBytesValid(type, bytes) {
  return bytes.length > 0 && bytes.length <= BRAND_IMAGE_MAX_BYTES && matchesSignature(type, bytes);
}
function routeFailure(res, error) {
  if (res.headersSent) res.destroy();
  else sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
}
async function readImageUpload(req, res) {
  const type = (req.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
  if (type !== "image/png" && type !== "image/svg+xml" && type !== "image/webp") {
    sendJson(res, 415, { ok: false, error: "unsupported image type" });
    return null;
  }
  const bytes = await readRequestBody(req, BRAND_IMAGE_MAX_BYTES);
  if (bytes === null) {
    res.once("finish", () => req.destroy());
    sendJson(res, 413, { ok: false, error: "image too large" });
    return null;
  }
  if (!imageBytesValid(type, bytes)) {
    sendJson(res, 400, { ok: false, error: "not an image of the declared type" });
    return null;
  }
  return { type, bytes };
}
function writeAtomicFile(target, bytes, older) {
  mkdirSync(dirname(target), { recursive: true });
  const temporary = target + "." + process.pid + ".tmp";
  writeFileSync(temporary, bytes);
  renameSync(temporary, target);
  for (const path of older) rmSync(path, { force: true });
}
export {
  IMAGE_HEADERS,
  imageBytesValid,
  matchesSignature,
  readImageUpload,
  routeFailure,
  writeAtomicFile
};
