/**
 * assets.mjs — every image the skin ships, one directory and one manifest (D38).
 *
 * Two delivery forms, chosen by size:
 *
 *   inline   the file's own bytes ride the bundle as a data URI (an image) or
 *            as markup (the vendor lockups, which the picker stamps into a row
 *            with innerHTML so the mono layer inherits the row's color).
 *   route    the file is written to `lib/assets/<hash>.<ext>` and served by the
 *            host half under ASSETS_ROUTE; the name carries the content hash,
 *            so the address may be cached for good.
 *
 * The deferred features' chunks and their source maps (D39) ride the same route:
 * the build hands their text in (routeText), always routed.
 *
 * A file whose bytes are text (SVG, a chunk) is stored brotli-compressed beside
 * its name; the host half sends it as-is to a client that takes brotli and
 * decompresses it for one that does not, so the package carries the sheets
 * once, small.
 *
 * Deepy's sheets are drawn as PNG but ship as the vector the browser already
 * plays: the same cell layout as the sprite's own geometry — every frame keeps
 * DEEPY_GUTTER of transparency on all four sides, or the downscale that draws
 * it samples the frame above's shadow along the cell's edge — with one path per
 * color, each row's runs extended downwards into rectangles. The PNGs are
 * inputs of the build and never reach `lib/`.
 *
 * The manifest is also the gate: a file under `packages/assets/src/` that no table or
 * token claims fails the build, so an image added for one run cannot ship
 * unused. `packages/assets/src/fonts/` stands outside that gate: buildFonts copies the
 * faces and the licences the package ships into `lib/fonts/`, where the host
 * half's font route reads them, and Anthropic's own faces sit one directory
 * down, in `anthropic/`, because they never enter the package.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { brotliCompressSync } from 'node:zlib'

/** The largest file that rides the bundle rather than the route. */
export const INLINE_LIMIT_BYTES = 16 * 1024
/** Where the host half serves the routed assets. */
export const ASSETS_ROUTE = '/dsh-claude-style/assets/'
/** The manifest the host half reads to decide what it may serve. */
export const ASSETS_MANIFEST = 'manifest.json'
/** The fonts under packages/assets/src/, delivered by buildFonts rather than by the manifest. */
export const FONT_DIR = 'fonts'
/** The directory inside it for Anthropic's own faces, which the package never carries. */
export const PRIVATE_FONT_DIR = 'anthropic'
/**
 * What `packages/assets/src/fonts/` ships, in the order the build log counts it: the
 * four faces and the three licences plus the authors file, which OFL 1.1
 * requires to travel with the fonts it covers.
 */
const SHIPPED_FONTS = [
  'JetBrainsMonoVariable.ttf',
  'JetBrainsMonoItalicVariable.ttf',
  'InterVariable.woff2',
  'NotoSerifVariable.woff2',
  'OFL.txt',
  'OFL-Inter.txt',
  'OFL-NotoSerif.txt',
  'AUTHORS.txt',
]

/** Content type per extension; an extension outside this table is refused. */
const CONTENT_TYPES = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
}

/**
 * Files under packages/assets/src/ that the package does not ship: drawing material for
 * the hand-run scripts. They are inputs, so listing them here is what says the
 * manifest is not silently missing them.
 */
export const SOURCE_ONLY = new Set([
  // scripts/draw-crab.py takes the crab's own laptop frames from these.
  'mascot/crab-laptop-body.png',
  'mascot/crab-laptop-ink.png',
  // scripts/fetch-lobe-combines.py composes the openai lockup from this mark.
  'icons/openai.svg',
])

/**
 * The file name a mascot sheet may have, matching what the mascot's animation
 * table spells.
 */
const SHEET_FILE = /^[a-z]+(?:-[a-z]+)*\.png$/

/**
 * Hold one mascot's sheet directory to its animation table in packages/client/src/constants.ts.
 *
 * Each entry needs its files and a well-formed row — a frame count, a crop box
 * inside the character's grid, a still frame the sheet holds — and a file no
 * entry names is refused, so the package never ships a sheet the mascot cannot
 * play or an entry that would draw nothing.
 *
 * @param table - the table's name, for diagnostics.
 * @param sheets - animation → `{ frames, box, still }`.
 * @param grid - `[width, height]` of the character's grid.
 * @param dir - the sheet directory.
 * @param filesOf - animation → the file names its entry needs.
 */
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

/**
 * Hold a sheet's own pixels to its entry: the crop box has to tile it whole,
 * and the cells have to hold every frame the table names. A sheet drawn on a
 * different grid, or cropped differently, would play a wrong slice of itself.
 *
 * @param table - the table's name, for diagnostics.
 * @param name - the animation.
 * @param image - the decoded sheet (`{ width, height }`).
 * @param sheet - the table's entry.
 * @param scale - device pixels to a logical pixel in this character's sheets.
 * @returns the cell grid: `{ columns, rows }`.
 */
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

/**
 * Lay the sheet's frames out one cell each, with the transparent margin the
 * sprite's geometry expects, and read every run of one color per row.
 *
 * @param image - the decoded sheet (`{ width, height, data }`, RGBA).
 * @param box - the frame's crop box `[x, y, width, height]` in logical pixels.
 * @param scale - device pixels to a logical pixel in this character's sheets.
 * @param gutter - the transparent margin in logical pixels.
 * @returns `{ data, width, height }` of the laid-out pixels.
 */
function layoutCells(image, box, scale, gutter) {
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

/**
 * Rebuild one sheet as SVG text over the laid-out cells: a run of one color is
 * extended downwards for as long as the rows below carry the same color over
 * the same span, so a flat area becomes one rectangle instead of one per row.
 * Transparent pixels are simply absent.
 *
 * @param image - the decoded sheet.
 * @param box - the frame's crop box in logical pixels.
 * @param scale - device pixels to a logical pixel in this character's sheets.
 * @param gutter - the transparent margin in logical pixels.
 * @returns the SVG text and the box it draws into.
 */
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

/**
 * Every file under the assets directory, with its content hash and the address
 * it is reached by.
 *
 * @param options.assetsDir - the directory the images live in.
 * @param options.generated - assets the build produced rather than read:
 *     path under the directory → text (a mascot's vector, in place of its source PNG).
 * @param options.replaced - paths under assets/ whose generated asset takes
 *     their place: the file is an input of the build and does not ship.
 * @param options.sourceOnly - paths under assets/ that do not ship.
 * @param options.limit - the largest file inlined.
 * @returns `{ entries, routed }`; `entries` is keyed by the path under assets/.
 */
export function planAssets({ assetsDir, generated = new Map(), replaced = new Set(), sourceOnly = SOURCE_ONLY, limit = INLINE_LIMIT_BYTES }) {
  const root = assetsDir
  const entries = new Map()
  const add = (file, bytes, text) => {
    const extension = path.extname(file)
    const type = CONTENT_TYPES[extension]
    if (type === undefined) throw new Error(`build: packages/assets/src/${file} has no content type; add its extension to packages/assets/assets.mjs`)
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12)
    const inline = bytes.byteLength <= limit
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
  for (const [file, text] of generated) add(file, Buffer.from(text, 'utf8'), text)
  return { entries, routed: [...entries.values()].filter((entry) => !entry.inline) }
}

/**
 * Refuse an asset nothing names: a file under packages/assets/src/ that no animation
 * table, brand token or lockup reads would otherwise ship (or sit in the
 * repository) with nothing to say it is unused.
 *
 * @param plan - the plan (planAssets).
 * @param claimed - the paths the build read.
 */
export function checkClaimed(plan, claimed) {
  for (const file of plan.entries.keys()) {
    if (!claimed.has(file)) throw new Error(`build: packages/assets/src/${file} is read by nothing; name it in an animation table, a brand token or delete it`)
  }
}

/**
 * Route a text file the build produced rather than read from packages/assets/src/: a
 * feature chunk or its source map (D39). It is never inlined — a chunk inlined
 * into the bundle would put its feature back — and the build names it.
 *
 * @param plan - the plan (planAssets); the entry joins its routed files.
 * @param file - the key the plan holds it under.
 * @param name - its file name under lib/assets/, which its address carries.
 * @param type - its content type.
 * @param text - its contents.
 * @returns the entry, whose `url` is the route's address for it.
 */
export function routeText(plan, { file, name, type, text }) {
  const bytes = Buffer.from(text, 'utf8')
  const entry = { file, bytes, text, type, hash: name.split('.')[0], name, url: ASSETS_ROUTE + name, inline: false }
  plan.entries.set(file, entry)
  plan.routed.push(entry)
  return entry
}

/**
 * Write the routed assets and the manifest the host half serves them from.
 *
 * Text assets are stored brotli-compressed beside their name (the payload the
 * route prefers); everything else is stored as it is.
 *
 * The order is the point: the new files go down first and the manifest after
 * them, so every name the manifest carries is already on disk when a client
 * asks for it; files the new manifest does not name are removed last, so a page
 * still running the previous build keeps finding its own.
 *
 * `retain` carries the previous manifest's entries over, for the linked
 * checkout that rebuilds against a live page (D39): the page that booted the
 * previous bundle asks for that build's chunk names, and this keeps them
 * addressable. An entry whose file is gone is dropped, because the manifest is
 * the gate the route answers from.
 *
 * @param libDir - the build output directory.
 * @param plan - the plan (planAssets).
 * @param options.retain - whether the previous manifest's entries carry over.
 * @param options.compress - bytes → their brotli form; the build passes one that
 *     reads its cache (scripts/build-cache.mjs).
 * @returns `{ files, bytes, kept }` of what was written and what carried over, for the build log.
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

/**
 * Copy the faces the package ships, with the licences and the authors file that
 * OFL 1.1 requires to travel with them, from `packages/assets/src/fonts/` into
 * `<out>/fonts/`, where the host half's font route reads them.
 *
 * The file list is the whole contract for that directory, as the manifest is
 * for the rest of packages/assets/src/: a name it does not carry ships nothing, and
 * Anthropic's own faces live one directory down in `anthropic/`, out of the
 * package.
 *
 * @param options.assetsDir - the directory the fonts live in.
 * @param options.libDir - the build output directory.
 * @returns `{ files, bytes }` of what was written, for the build log.
 */
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
