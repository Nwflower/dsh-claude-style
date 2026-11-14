/**
 * Build and validate the asset manifest. Large assets and deferred chunks (D72)
 * use content-hashed routes; unclaimed source files fail the build.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { brotliCompressSync } from 'node:zlib'

export const INLINE_LIMIT_BYTES = 16 * 1024
export const ASSETS_ROUTE = '/dsh-claude-style/assets/'
export const ASSETS_MANIFEST = 'manifest.json'
export const FONT_DIR = 'fonts'
/** Anthropic's fonts are repository-only and never enter the package. */
export const PRIVATE_FONT_DIR = 'anthropic'
/** OFL 1.1 requires the licence to travel with the shipped font faces. */
const SHIPPED_FONTS = [
  'JetBrainsMonoVariable.woff2',
  'JetBrainsMonoItalicVariable.woff2',
  'InterVariable.woff2',
  'NotoSerifVariable.woff2',
  'ClaudeStylePixel.woff2',
  'OFL.txt',
]

/** Content type per extension; an extension outside this table is refused. */
const CONTENT_TYPES = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
}

/** Declare drawing inputs explicitly so the manifest does not mistake them for omissions. */
export const SOURCE_ONLY = new Set([
  // scripts/art/draw-crab.py takes the crab's own laptop frames from these.
  'mascot/crab/crab-laptop-body.png',
  'mascot/crab/crab-laptop-ink.png',
  // scripts/data/fetch-lobe-combines.py composes the openai lockup from this mark.
  'icons/openai.svg',
  // No upstream icon carries Beam's vendor, so its lockup is composed from this
  // artwork the same way.
  'icons/reflection.svg',
  // Tencent Hunyuan's own mark: scripts/data/fetch-lobe-combines.py composes the
  // tencent lockup from this mark and Lobe's English wordmark.
  'icons/tencent.svg',
])

const SHEET_FILE = /^[a-z]+(?:-[a-z]+)*\.png$/

/** Reject sheets and animation entries that cannot produce a playable frame. */
export function checkSheets(table, sheets, grid, dir, filesOf) {
  const where = path.relative(process.cwd(), dir).replace(/\\/g, '/')
  const wanted = new Set(Object.keys(sheets).flatMap(filesOf))
  const files = fs.readdirSync(dir)
  for (const file of files) {
    if (!SHEET_FILE.test(file) || !wanted.has(file)) throw new Error(`build: ${where}/${file} has no entry in ${table}`)
  }
  for (const [name, sheet] of Object.entries(sheets)) {
    const [x, y, w, h] = Array.isArray(sheet.box) ? sheet.box : []
    const whole = [sheet.frames, sheet.still, x, y, w, h].every(Number.isInteger)
    if (!whole || sheet.frames < 1 || sheet.still < 0 || sheet.still >= sheet.frames || x < 0 || y < 0 || w < 1 || h < 1 || x + w > grid[0] || y + h > grid[1]) {
      throw new Error(`build: ${table}["${name}"] needs whole frames, still < frames and a box inside the ${grid[0]}×${grid[1]} grid`)
    }
    for (const file of filesOf(name)) {
      if (!files.includes(file)) throw new Error(`build: ${table}["${name}"] has no ${file} in ${where}/`)
    }
  }
}

/** Require the crop box to tile the sheet and contain every declared frame. */
export function checkSheetPixels(table, name, image, sheet, scale) {
  const innerWidth = sheet.box[2] * scale
  const innerHeight = sheet.box[3] * scale
  const cells = `${image.width}×${image.height} holds ${Math.round(image.width / innerWidth)}×${Math.round(image.height / innerHeight)} cells of ${innerWidth}×${innerHeight}px`
  if (image.width % innerWidth !== 0 || image.height % innerHeight !== 0) {
    throw new Error(`build: ${table}["${name}"]: ${cells}, which is not a whole number of cells`)
  }
  const columns = image.width / innerWidth
  const rows = image.height / innerHeight
  if (columns * rows < sheet.frames) {
    throw new Error(`build: ${table}["${name}"]: ${cells} holds ${columns * rows} frames, fewer than the ${sheet.frames} the table names`)
  }
  return { columns, rows }
}

/** One run's color: an opaque pixel keeps its hex, a translucent one its alpha. */
function colorAt(data, at) {
  const r = data[at]
  const g = data[at + 1]
  const b = data[at + 2]
  const a = data[at + 3]
  return a === 255
    ? `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
    : `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`
}

/** Preserve transparent gutters so fractional-scale drawing cannot sample adjacent frames. */
export function layoutCells(image, box, scale, gutter) {
  const innerWidth = box[2] * scale
  const innerHeight = box[3] * scale
  const margin = gutter * scale
  const cellWidth = innerWidth + margin * 2
  const cellHeight = innerHeight + margin * 2
  const columns = image.width / innerWidth
  const rows = image.height / innerHeight
  const width = columns * cellWidth
  const height = rows * cellHeight
  const data = Buffer.alloc(width * height * 4)
  const sourceWidth = image.width * 4
  for (let column = 0; column < columns; column++) {
    for (let row = 0; row < rows; row++) {
      for (let y = 0; y < innerHeight; y++) {
        const from = (row * innerHeight + y) * sourceWidth + column * innerWidth * 4
        const to = ((row * cellHeight + margin + y) * width + column * cellWidth + margin) * 4
        image.data.copy(data, to, from, from + innerWidth * 4)
      }
    }
  }
  return { data, width, height }
}

/** Merge matching vertical runs into SVG rectangles; omit transparent pixels. */
export function vectorizeSheet(image, box, scale, gutter) {
  const { data, width, height } = layoutCells(image, box, scale, gutter)
  /** Color string → the rectangles of that color, in drawing order. */
  const paths = new Map()
  const push = (color, chunk) => {
    const known = paths.get(color)
    if (known === undefined) paths.set(color, [chunk])
    else known.push(chunk)
  }
  /** The rectangles still open, keyed by their column span; the row each began on. */
  let open = new Map()
  for (let y = 0; y <= height; y++) {
    const next = new Map()
    if (y < height) {
      let x = 0
      while (x < width) {
        const at = (y * width + x) * 4
        const color = colorAt(data, at)
        let end = x + 1
        while (end < width && colorAt(data, (y * width + end) * 4) === color) end++
        if (data[at + 3] !== 0) {
          const span = `${x}:${end - x}`
          const running = open.get(span)
          next.set(span, running !== undefined && running.color === color ? running : { color, from: y })
        }
        x = end
      }
    }
    for (const [span, rect] of open) {
      if (next.get(span) === rect) continue
      const [x, run] = span.split(':').map(Number)
      push(rect.color, `M${x} ${rect.from}h${run}v${y - rect.from}h${-run}z`)
    }
    open = next
  }
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`]
  for (const [color, chunks] of paths) parts.push(`<path fill="${color}" d="${chunks.join('')}"/>`)
  parts.push('</svg>')
  return { svg: parts.join(''), width, height }
}

/** Plan inline and content-hashed routes; generated assets replace their source inputs. */
export function planAssets({ assetsDir, generated = new Map(), replaced = new Set(), sourceOnly = SOURCE_ONLY, limit = INLINE_LIMIT_BYTES, route = new Set() }) {
  const root = assetsDir
  const entries = new Map()
  const add = (file, bytes, text) => {
    const extension = path.extname(file)
    const type = CONTENT_TYPES[extension]
    if (type === undefined) throw new Error(`build: packages/assets/src/${file} has no content type; add its extension to packages/assets/assets.mjs`)
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12)
    const inline = bytes.byteLength <= limit && !route.has(file)
    const name = hash + extension
    // An SVG is text either way: it is read as one so a lockup can be stamped
    // into the DOM, and a mark is inlined as its own text rather than base64.
    const source = text ?? (type === 'image/svg+xml' ? bytes.toString('utf8').replace(/\r\n/g, '\n').trim() : undefined)
    // A data URI carries an image; text assets stay text, because the lockups
    // are stamped into the DOM rather than painted from a URL.
    const url = inline
      ? source === undefined
        ? `data:${type};base64,${bytes.toString('base64')}`
        : `data:${type},${encodeURIComponent(source)}`
      : ASSETS_ROUTE + name
    entries.set(file, { file, bytes, text: source, type, hash, name, url, inline })
  }
  const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((item) => {
    const file = dir === '' ? item.name : `${dir}/${item.name}`
    // The fonts are not routed assets: buildFonts copies them, and they are
    // not images an extension table could type.
    if (item.isDirectory()) return file === FONT_DIR ? [] : walk(file)
    return [file]
  })
  for (const file of walk('').sort()) {
    if (sourceOnly.has(file) || replaced.has(file) || generated.has(file)) continue
    add(file, fs.readFileSync(path.join(root, file)))
  }
  for (const [file, content] of generated) {
    if (Buffer.isBuffer(content)) add(file, content)
    else add(file, Buffer.from(content, 'utf8'), content)
  }
  return { entries, routed: [...entries.values()].filter((entry) => !entry.inline) }
}

/** Fail on unclaimed assets so unused files cannot ship unnoticed. */
export function checkClaimed(plan, claimed) {
  for (const file of plan.entries.keys()) {
    if (!claimed.has(file)) throw new Error(`build: packages/assets/src/${file} is read by nothing; name it in an animation table, a brand token or delete it`)
  }
}

/** Route generated chunks and source maps; inlining would defeat deferred loading (D72). */
export function routeText(plan, { file, name, type, text }) {
  const bytes = Buffer.from(text, 'utf8')
  const entry = { file, bytes, text, type, hash: name.split('.')[0], name, url: ASSETS_ROUTE + name, inline: false }
  plan.entries.set(file, entry)
  plan.routed.push(entry)
  return entry
}

/**
 * Write assets before their manifest and prune old files last so live pages
 * never see a missing route; retain keeps previous chunks addressable (D72).
 */
export function writeAssets(libDir, plan, { retain = false, compress = brotliCompressSync } = {}) {
  const dir = path.join(libDir, 'assets')
  fs.mkdirSync(dir, { recursive: true })
  const manifestPath = path.join(dir, ASSETS_MANIFEST)
  // This manifest is the build's own output: one that does not parse is a build
  // that was killed, and it fails here instead of quietly dropping the set.
  const previous = retain && fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')).assets ?? {}
    : {}
  const assets = {}
  let bytes = 0
  for (const entry of plan.routed) {
    const compressed = entry.text !== undefined
    const payload = compressed ? compress(entry.bytes) : entry.bytes
    fs.writeFileSync(path.join(dir, entry.name + (compressed ? '.br' : '')), payload)
    assets[entry.name] = { type: entry.type, encoding: compressed ? 'br' : null, bytes: entry.bytes.byteLength }
    bytes += payload.byteLength
  }
  let kept = 0
  for (const [name, asset] of Object.entries(previous)) {
    if (assets[name] !== undefined) continue
    const stored = asset.encoding === 'br' ? `${name}.br` : name
    if (!fs.existsSync(path.join(dir, stored))) continue
    assets[name] = asset
    kept += 1
  }
  fs.writeFileSync(manifestPath, JSON.stringify({ version: 1, assets }, null, 2) + '\n')
  for (const file of fs.readdirSync(dir)) {
    if (file === ASSETS_MANIFEST) continue
    // A stored asset is its own name, or that name plus `.br`; no asset name
    // ends in `.br`, so the suffix is unambiguous.
    if (assets[file.endsWith('.br') ? file.slice(0, -3) : file] !== undefined) continue
    fs.rmSync(path.join(dir, file))
  }
  return { files: plan.routed.length, bytes, kept }
}

/** Copy only listed font faces and their OFL licence; Anthropic's private directory never ships. */
export function buildFonts({ assetsDir, libDir }) {
  const source = path.join(assetsDir, FONT_DIR)
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name !== PRIVATE_FONT_DIR) throw new Error(`build: packages/assets/src/${FONT_DIR}/${entry.name}/ is a directory the build does not ship; only ${PRIVATE_FONT_DIR}/ is one`)
      continue
    }
    if (!SHIPPED_FONTS.includes(entry.name)) throw new Error(`build: packages/assets/src/${FONT_DIR}/${entry.name} ships nothing; add it to SHIPPED_FONTS or delete it`)
  }
  const target = path.join(libDir, FONT_DIR)
  fs.rmSync(target, { recursive: true, force: true })
  fs.mkdirSync(target, { recursive: true })
  let bytes = 0
  for (const name of SHIPPED_FONTS) {
    // The file list was checked against the directory above, so a missing one
    // is a build bug rather than a state a user can reach.
    fs.copyFileSync(path.join(source, name), path.join(target, name))
    bytes += fs.statSync(path.join(target, name)).size
  }
  return { files: SHIPPED_FONTS.length, bytes }
}
