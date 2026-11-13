/** theme-tokens.mjs — resolve palette seed tones into build-time colors and generate the token stylesheet and table (D9, D30). */
import fs from 'node:fs'
import path from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import { parse, converter, formatHex, formatRgb } from 'culori'

/** The token document's place in the source tree: also the sheet list's marker for the generated sheet. */
export const TOKEN_SHEET = 'theme/tokens.json'
const TOKEN_SCHEMA = 'theme/tokens.schema.json'
/** The element and attribute every skin rule hangs off (scripts/build/css.mjs). */
const SCOPE = 'body[data-dsh-claude-style]'
/** The region of docs/STYLE.md the token table is written into. */
const TABLE_BEGIN = '<!-- generated:tokens (packages/client/src/theme/tokens.json) -->'
const TABLE_END = '<!-- /generated:tokens -->'
/** The schemes, in the order the tables show them. */
const SCHEMES = ['light', 'dark']

const oklch = converter('oklch')
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

/** A colour moved along its own lightness axis, for the link a card does not name. */
function shift(colour, dl, m) {
  const base = oklch(parse(colour))
  return formatHex({ mode: 'oklch', l: clamp(base.l + dl, 0, 1), c: base.c * m, h: base.h ?? 0 })
}

/** A card's link colour for one scheme: the one it names, or its accent moved along its lightness. */
export function cardLink(card, scheme) {
  return card.link?.[scheme] ?? shift(card.accent, scheme === 'light' ? -0.06 : 0.15, 1)
}

/** The colour a seed names for one card and scheme: a card's own seed, or a tone already resolved above. */
function seedColour(card, seed, scheme, resolved) {
  if (seed === 'canvas') return card.canvas[scheme]
  if (seed === 'text') return card.text[scheme]
  if (seed === 'accent') return card.accent
  if (seed === 'link') return cardLink(card, scheme)
  const tone = resolved.get(seed)
  if (tone === undefined) throw new Error(`build: a tone reads ${seed} before it is resolved`)
  return tone
}

/** One tone's colour: its lightness and chroma from the seed, its hue from the seed or another one. */
function toneColour(tone, step, card, scheme, resolved) {
  const base = oklch(parse(seedColour(card, step.seed ?? tone.seed, scheme, resolved)))
  const hueSeed = step.hue === undefined ? undefined : oklch(parse(seedColour(card, step.hue, scheme, resolved)))
  const l = clamp(step.l !== undefined ? step.l : base.l + (step.dl ?? 0), 0, 1)
  const c = clamp(step.c !== undefined ? step.c : step.m !== undefined ? base.c * step.m : base.c + (step.dc ?? 0), 0, 0.4)
  const h = (((hueSeed?.h ?? base.h) ?? 0) + (step.h ?? 0) + 360) % 360
  const colour = { mode: 'oklch', l, c, h, alpha: step.a ?? 1 }
  return step.a === undefined || step.a >= 1 ? formatHex(colour) : formatRgb(colour)
}

/** Every tone's value for one card and scheme, keyed by tone id, resolved in the document's order. */
function toneValues(doc, card, scheme) {
  const values = new Map()
  for (const tone of doc.palette.tones) {
    const step = tone[scheme]
    if (step === undefined) continue
    values.set(tone.id, toneColour(tone, step, card, scheme, values))
  }
  return values
}

/** The tone a token reads: its flat edge rung under a card with flat contours. */
function tokenTone(spec, card) {
  return card.edges === 'surface' && spec.flat !== undefined ? spec.flat : spec.tone
}

/** One token's value for one card and scheme, or undefined where the token does not paint that scheme. */
function tokenValue(spec, card, scheme, tones) {
  if (spec.schemes !== undefined && !spec.schemes.includes(scheme)) return undefined
  if (spec.literal !== undefined) return spec.literal[scheme]
  if (spec.alias !== undefined) return `var(${spec.alias})`
  if (spec.tone !== undefined) return tones.get(tokenTone(spec, card))
  if (spec.card === 'logoInk') return card.logoInk === 'ink' ? tones.get('ink') : card.accent
  if (spec.card === 'code') return card.code[scheme]
  if (spec.card === 'sidebar') return card.sidebar?.[scheme]
  if (spec.card === 'bubble') return card.bubble?.[scheme]
  throw new Error('build: a palette token names no colour source')
}

/** Every card's resolved palette: card id → scheme → token → value. */
export function resolvePalette(doc) {
  const out = new Map()
  for (const card of doc.palette.cards) {
    const schemes = new Map()
    for (const scheme of SCHEMES) {
      const tones = toneValues(doc, card, scheme)
      const values = new Map()
      for (const spec of doc.palette.tokens) {
        const value = tokenValue(spec, card, scheme, tones)
        if (value !== undefined) values.set(spec.token, value)
      }
      schemes.set(scheme, values)
    }
    out.set(card.id, schemes)
  }
  return out
}

/** Read tokens.json and hold it to its schema, a name once per group, and every tone a token names. */
export function loadTokens(srcDir) {
  const schema = JSON.parse(fs.readFileSync(path.join(srcDir, TOKEN_SCHEMA), 'utf8'))
  const validate = new Ajv2020({ allErrors: true }).compile(schema)
  const doc = JSON.parse(fs.readFileSync(path.join(srcDir, TOKEN_SHEET), 'utf8'))
  if (!validate(doc)) throw new Error(`build: packages/client/src/${TOKEN_SHEET} ${validate.errors.map((error) => `${error.instancePath || '/'} ${error.message}`).join('; ')}`)
  for (const group of ['typeface', 'apex', 'motion', 'layer']) {
    const seen = new Set()
    for (const item of doc[group]) {
      if (seen.has(item.token)) throw new Error(`build: packages/client/src/${TOKEN_SHEET} names ${item.token} twice in ${group}`)
      seen.add(item.token)
    }
  }
  const tones = new Set()
  for (const tone of doc.palette.tones) {
    if (tones.has(tone.id)) throw new Error(`build: packages/client/src/${TOKEN_SHEET} names the tone ${tone.id} twice`)
    // A tone reads a card seed or a tone resolved above it: the ladder is one pass, in document order.
    for (const scheme of ['light', 'dark']) {
      const seed = tone[scheme]?.seed
      const hue = tone[scheme]?.hue
      if (seed === undefined) continue
      for (const name of [seed, hue]) {
        if (name === undefined || ['canvas', 'text', 'accent', 'link', 'code'].includes(name) || tones.has(name)) continue
        throw new Error(`build: packages/client/src/${TOKEN_SHEET} has the tone ${tone.id} read ${name}, which is neither a card seed nor a tone above it`)
      }
    }
    tones.add(tone.id)
  }
  const cards = new Set()
  for (const card of doc.palette.cards) {
    if (cards.has(card.id)) throw new Error(`build: packages/client/src/${TOKEN_SHEET} names the card ${card.id} twice`)
    cards.add(card.id)
  }
  const tokens = new Set()
  for (const spec of doc.palette.tokens) {
    if (tokens.has(spec.token)) throw new Error(`build: packages/client/src/${TOKEN_SHEET} names ${spec.token} twice in palette`)
    tokens.add(spec.token)
    for (const id of [spec.tone, spec.flat]) {
      if (id === undefined || tones.has(id)) continue
      throw new Error(`build: packages/client/src/${TOKEN_SHEET} gives ${spec.token} the tone ${id}, which no tone declares`)
    }
  }
  return doc
}

/** One rule of the token sheet; a block with nothing in it is left out. */
function tokenBlock(selector, declarations) {
  if (declarations.length === 0) return ''
  return `${selector} {\n${declarations.map(([token, value]) => `  ${token}: ${value};`).join('\n')}\n}\n`
}

/** The declarations one card paints with in one scheme, in the document's own order. */
function declarationsOf(doc, values) {
  return doc.palette.tokens.flatMap((spec) => {
    const value = values.get(spec.token)
    return value === undefined ? [] : [[spec.token, value]]
  })
}

/** The attribute selector a gate names. */
function gateOf({ attribute }, value) {
  return `[${attribute}="${value}"]`
}

/** The relative-colour form of one tone step: the seed's own colour, moved by the step. */
function relativeColour(seed, step) {
  const l = step.l !== undefined
    ? String(step.l)
    : step.dl === undefined || step.dl === 0 ? 'l' : `calc(l ${step.dl > 0 ? '+' : '-'} ${Math.abs(step.dl)})`
  const c = step.c !== undefined
    ? String(step.c)
    : step.m !== undefined ? `calc(c * ${step.m})`
      : step.dc === undefined || step.dc === 0 ? 'c' : `calc(c ${step.dc > 0 ? '+' : '-'} ${Math.abs(step.dc)})`
  const h = step.h === undefined || step.h === 0 ? 'h' : `calc(h ${step.h > 0 ? '+' : '-'} ${Math.abs(step.h)})`
  const alpha = step.a === undefined ? '' : ` / ${step.a}`
  return `oklch(from ${seed} ${l} ${c} ${h}${alpha})`
}

/**
 * A scheme's own palette (a reader's scheme, D97), resolved in the page as relative
 * colours over the seeds the brand layer writes on <body>. A link seed the scheme
 * does not carry follows its accent. The blocks stand under the scheme's contour
 * drawing, which the scheme owns, whichever brand the page shows.
 */
function customPaletteBlocks(doc, gates) {
  const blocks = []
  for (const edges of gates.customEdges.values) {
    for (const scheme of SCHEMES) {
      const custom = `[data-dsh-claude-custom-palette]${gateOf(gates.customEdges, edges)}`
      const accentLink = scheme === 'light'
        ? 'oklch(from var(--dsh-claude-custom-accent) calc(l - 0.06) c h)'
        : 'oklch(from var(--dsh-claude-custom-accent) calc(l + 0.15) c h)'
      const seeds = {
        canvas: `var(--dsh-claude-custom-canvas-${scheme})`,
        text: `var(--dsh-claude-custom-text-${scheme})`,
        accent: 'var(--dsh-claude-custom-accent)',
        code: `var(--dsh-claude-custom-code-${scheme})`,
        link: `var(--dsh-claude-custom-link-${scheme}, ${accentLink})`,
      }
      const declarations = []
      for (const tone of doc.palette.tones) {
        const step = tone[scheme]
        if (step === undefined) continue
        const seed = seeds[step.seed] ?? `var(--dsh-tone-${step.seed})`
        // A step that moves nothing is the seed itself: a direct reference keeps the value a plain colour.
        const plain = step.l === undefined && step.c === undefined && step.a === undefined &&
          (step.dl === undefined || step.dl === 0) && (step.dc === undefined || step.dc === 0) &&
          (step.m === undefined || step.m === 1) && (step.h === undefined || step.h === 0)
        declarations.push([`--dsh-tone-${tone.id}`, plain ? seed : relativeColour(seed, step)])
      }
      for (const spec of doc.palette.tokens) {
        if (spec.schemes !== undefined && !spec.schemes.includes(scheme)) continue
        // The brand art's ink belongs to the brand, not to the colour card.
        if (spec.card === 'logoInk') continue
        let value
        if (spec.tone !== undefined) value = `var(--dsh-tone-${edges === 'surface' && spec.flat !== undefined && scheme === 'dark' ? spec.flat : spec.tone})`
        else if (spec.literal !== undefined) value = spec.literal[scheme]
        else if (spec.alias !== undefined) value = `var(${spec.alias})`
        else if (spec.card === 'code') value = `var(--dsh-claude-custom-code-${scheme})`
        // The scheme's canvas carries its own sidebar step; a preset's override keeps the preset's hand-tuned colour while its background stands.
        else if (spec.card === 'sidebar') value = `var(--dsh-claude-custom-sidebar-${scheme}, var(--dsh-tone-sidebar))`
        // The bubble follows the scheme's canvas, a hand-tuned colour aside; contours drawn as surfaces read the dark rung.
        else if (spec.card === 'bubble') value = `var(--dsh-claude-custom-bubble-${scheme}, var(--dsh-tone-${edges === 'surface' && scheme === 'dark' ? 'bubble-flat' : 'bubble'}))`
        else throw new Error('build: a palette token names no colour source')
        declarations.push([spec.token, value])
      }
      // Text on a custom accent fill is picked by contrast, not derived from the canvas.
      declarations.push(['--dsw-alias-brand-text', 'var(--dsh-claude-custom-accent-ink)'])
      declarations.push(['--dsw-alias-label-primary-foreground', 'var(--dsh-claude-custom-accent-ink)'])
      blocks.push(tokenBlock(`${SCOPE}${gateOf(gates.palette, gates.palette.claude)}${custom}${scheme === 'dark' ? '[data-ds-dark-theme]' : ':not([data-ds-dark-theme])'}`, declarations))
    }
  }
  return blocks
}

/**
 * The token stylesheet, in cascade order: brand marks first, then the ungated motion
 * and layer blocks, the typeface and apex blocks, the palette, and the custom palette.
 *
 * Every block writing a host token carries the Claude gate, so "follow the host" keeps
 * the host's own tokens (D30). Dark names `[data-ds-dark-theme]` on purpose: the host's
 * own dark block weighs the same (0,1,1) as a bare `body[data-dsh-claude-style]`, and
 * naming the attribute lifts these to (0,2,1). The first card is the default look; every
 * later card states only the tokens that differ from it.
 *
 * @param images - brand mark name → its address (data URI or route).
 */
export function tokenSheet(doc, gates, images) {
  const dark = '[data-ds-dark-theme]'
  const light = ':not([data-ds-dark-theme])'
  const gate = gateOf
  const palette = `${SCOPE}${gate(gates.palette, gates.palette.claude)}`
  const gated = (card) => `${palette}${card === undefined ? '' : gate(gates.paletteCard, card)}`
  const typeface = (value) => `${SCOPE}${gate(gates.typeface, value)}`
  const values = resolvePalette(doc)
  const [first, ...rest] = doc.palette.cards
  // The brand art's ink is the brand's own: it stays under the brand attribute, whichever card paints the palette.
  const paletteTokens = (map) => declarationsOf(doc, map).filter(([token]) => token !== '--dsh-claude-logo-ink')
  const schemeOf = (scheme) => scheme === 'dark' ? dark : light
  const blocks = []
  for (const scheme of SCHEMES) {
    blocks.push(tokenBlock(`${gated(undefined)}${schemeOf(scheme)}`, paletteTokens(values.get(first.id).get(scheme))))
  }
  for (const card of rest) {
    for (const scheme of SCHEMES) {
      const mine = values.get(card.id).get(scheme)
      const base = values.get(first.id).get(scheme)
      const changed = new Map([...mine].filter(([token, value]) => base.get(token) !== value))
      blocks.push(tokenBlock(`${gated(card.id)}${schemeOf(scheme)}`, paletteTokens(changed)))
    }
  }
  for (const card of doc.palette.cards) {
    for (const scheme of SCHEMES) {
      blocks.push(tokenBlock(`${palette}${gate(gates.brand, card.id)}${schemeOf(scheme)}`, [
        ['--dsh-claude-logo-ink', values.get(card.id).get(scheme).get('--dsh-claude-logo-ink')],
      ]))
    }
  }
  return [
    `/* Generated from packages/client/src/${TOKEN_SHEET} by scripts/build/theme-tokens.mjs; edit the JSON. */\n`,
    tokenBlock(SCOPE, Object.entries(images).map(([name, url]) => [`--dsh-claude-image-${name}`, `url("${url}")`])),
    tokenBlock(SCOPE, doc.motion.map((item) => [item.token, item.value])),
    tokenBlock(SCOPE, doc.layer.map((item) => [item.token, item.value])),
    tokenBlock(`${typeface(gates.typeface.claude)}`, doc.typeface.flatMap((item) => (item.claude === undefined ? [] : [[item.token, item.claude]]))),
    tokenBlock(`${typeface(gates.typeface.system)}`, doc.typeface.flatMap((item) => (item.system === undefined ? [] : [[item.token, item.system]]))),
    tokenBlock(`${typeface(gates.typeface.host)}`, doc.typeface.flatMap((item) => (item.host === undefined ? [] : [[item.token, item.host]]))),
    tokenBlock(`${SCOPE}${dark}`, doc.apex.map((item) => [item.token, item.dark])),
    tokenBlock(`${SCOPE}${light}`, doc.apex.map((item) => [item.token, item.light])),
    ...blocks,
    ...customPaletteBlocks(doc, gates),
    tokenBlock(`${SCOPE}${gate(gates.palette, gates.palette.host)}`, doc.palette.tokens.flatMap((spec) => (spec.host === undefined ? [] : [[spec.token, spec.host]]))),
  ].filter((block) => block !== '').join('\n')
}

/** A token value as a Markdown table cell: a code span, with the backslash escaped before the pipe. */
function tableCell(value) {
  return '`' + value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|') + '`'
}

/** One tone step as a cell: the lightness step, its chroma, hue shift and alpha. */
function toneCell(step) {
  if (step === undefined) return '—'
  const parts = [`Δl ${step.dl === undefined ? 0 : step.dl > 0 ? `+${step.dl}` : step.dl}`]
  if (step.c !== undefined) parts.push(`C ${step.c}`)
  if (step.dc !== undefined) parts.push(`ΔC ${step.dc > 0 ? `+${step.dc}` : step.dc}`)
  if (step.m !== undefined) parts.push(`C ×${step.m}`)
  if (step.h !== undefined) parts.push(`h ${step.h > 0 ? `+${step.h}` : step.h}`)
  if (step.a !== undefined) parts.push(`α ${step.a}`)
  return tableCell(parts.join(' · '))
}

/** One Markdown row. */
function row(cells) {
  return `| ${cells.join(' | ')} |`
}

/**
 * The palette as Markdown tables: the cards with their seeds, the tones with
 * their steps, and every token with its resolved value in the card × scheme
 * cells, its host alias and its use.
 */
function tokenTable(doc) {
  const values = resolvePalette(doc)
  const cards = doc.palette.cards
  const cell = (value) => (value === undefined ? '—' : tableCell(value))
  const cardRows = cards.map((card, index) => row([
    index === 0 ? `${card.id} (default)` : card.id,
    tableCell(card.accent),
    tableCell(card.canvas.light),
    tableCell(card.canvas.dark),
    tableCell(card.text.light),
    tableCell(card.text.dark),
    cell(card.sidebar?.light),
    cell(card.sidebar?.dark),
    cell(card.bubble?.light),
    cell(card.bubble?.dark),
    cell(card.link?.light),
    cell(card.link?.dark),
    card.edges,
    card.logoInk,
    tableCell(card.code.light),
    tableCell(card.code.dark),
  ]))
  const toneRows = doc.palette.tones.map((tone) => row([`\`${tone.id}\``, tone.seed, toneCell(tone.light), toneCell(tone.dark)]))
  const schemeHeader = cards.flatMap((card) => [`${card.id} light`, `${card.id} dark`])
  const tokenRows = doc.palette.tokens.map((spec) => {
    const source = spec.tone !== undefined ? `\`${spec.tone}\`${spec.flat === undefined ? '' : ` / \`${spec.flat}\``}` : spec.literal !== undefined ? 'literal' : spec.alias !== undefined ? `\`${spec.alias}\`` : `card \`${spec.card}\``
    const byCard = cards.flatMap((card) => {
      const byScheme = values.get(card.id)
      return [cell(byScheme.get('light').get(spec.token)), cell(byScheme.get('dark').get(spec.token))]
    })
    const host = spec.host === undefined && spec.token.startsWith('--dsw-') ? "host's own" : cell(spec.host)
    return row([`\`${spec.token}\``, source, ...byCard, host, spec.use ?? ''])
  })
  const tokenHeader = ['Token', 'Tone', ...schemeHeader, 'Host alias', 'Use']
  return [
    row(['Card', 'Accent', 'Canvas light', 'Canvas dark', 'Text light', 'Text dark', 'Sidebar light', 'Sidebar dark', 'Bubble light', 'Bubble dark', 'Link light', 'Link dark', 'Edges', 'Logo ink', 'Code light', 'Code dark']),
    row(['---', '---', '---', '---', '---', '---', '---', '---', '---', '---', '---', '---', '---', '---', '---', '---']),
    ...cardRows,
    '',
    row(['Tone', 'Seed', 'Light', 'Dark']),
    row(['---', '---', '---', '---']),
    ...toneRows,
    '',
    row(tokenHeader),
    row(tokenHeader.map(() => '---')),
    ...tokenRows,
  ].join('\n')
}

/**
 * Write the card, tone and token tables into the region of docs/STYLE.md.
 * @returns whether the file changed.
 */
export function writeTokenTable(stylePath, doc) {
  const text = fs.readFileSync(stylePath, 'utf8')
  const from = text.indexOf(TABLE_BEGIN)
  const to = text.indexOf(TABLE_END)
  if (from === -1 || to < from) throw new Error(`build: ${path.basename(stylePath)} lacks the ${TABLE_BEGIN} … ${TABLE_END} region`)
  const next = text.slice(0, from + TABLE_BEGIN.length) + '\n' + tokenTable(doc) + '\n' + text.slice(to)
  if (next === text) return false
  fs.writeFileSync(stylePath, next)
  return true
}
