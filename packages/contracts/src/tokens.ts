/**
 * What content costs the tokenizers the hosts meter with, priced by the shape of
 * the text it carries.
 *
 * A run is a stretch of one character class: CJK characters, CJK marks, a Latin
 * word, a group of digits, whitespace, punctuation. Each shape carries the price
 * the provider's own tokenizer charges for it, so a figure follows a real count:
 * a flat characters-per-token rate charges a Chinese character a quarter token
 * where the tokenizer spends half of one, and every figure built on it drifts
 * with the language the session was written in.
 *
 * One pass, constant state: a character either extends the run it belongs to or
 * closes that run and opens the next. The strings of one block go in together, so
 * a word crossing a string boundary is priced once.
 */
import { imageTokens } from './image-tokens'

/** A Latin word's price by length; the tenth entry stands for ten letters and up. */
const WORD = [0, 0.496, 0.496, 0.62, 0.62, 0.62, 0.636, 0.636, 0.776, 0.776, 1.593]
/**
 * What each letter past the tenth costs. A longer run than any word is a URL, a hash,
 * a base64 payload or a minified line, and the tokenizer cuts it into whole pieces of
 * about four characters rather than reading it as one word.
 */
const WORD_TAIL = 0.25
// The character-class rates are fitted to the DeepSeek tokenizer (V3/V4 family) over a
// diverse corpus; the WORD table and DIGIT_GROUP stay at their exact anchors (three
// digits cost one token), and the rates below carry the corpus-fit adjustment (D104, D103).
const CJK = 0.5465
const CJK_MARK = 2.0938
const DIGIT_GROUP = 1
const NEWLINE = 1.3089
/**
 * A lone space and a run of them: the tokenizer keeps one space inside the piece that
 * follows it, so a lone space is nearly free and a longer run costs a whole token.
 */
const LONE_SPACE = 0.4192
const SPACE_RUN = 1.528
const PUNCT_RUN = 0.8391
const PUNCT_CHAR = 0.281

/** The classes a run can hold. */
const NONE = 0
const WIDE = 1
const WIDE_MARK = 2
const LETTER = 3
const DIGIT = 4
const SPACE = 5
const PUNCT = 6

/**
 * Whether a wide code point is a mark rather than a character: the tokenizer splits
 * its marks from the text around them, and a run of them costs more.
 */
const WIDE_MARK_TEST = /[\p{P}\p{S}]/u

/**
 * The class of every wide code point already met, by code point: zero is a code
 * point nothing has asked about yet. A page of Chinese asks about the same few
 * hundred code points over and over, and the member test costs more than reading
 * one byte.
 */
const WIDE_KINDS = new Uint8Array(0x10000)

function classOf(code: number): number {
  if (code >= 0x2e80) {
    if (code >= 0x10000) return WIDE_MARK_TEST.test(String.fromCodePoint(code)) ? WIDE_MARK : WIDE
    const known = WIDE_KINDS[code]
    if (known !== 0) return known
    const kind = WIDE_MARK_TEST.test(String.fromCodePoint(code)) ? WIDE_MARK : WIDE
    WIDE_KINDS[code] = kind
    return kind
  }
  if (code >= 0x30 && code <= 0x39) return DIGIT
  if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) return LETTER
  if (code === 0x20 || (code >= 0x09 && code <= 0x0d)) return SPACE
  return PUNCT
}

/**
 * The tokens `texts` are worth, read as one stream of runs.
 *
 * @param texts - the strings of one piece of content, in the order they are sent;
 *   a run crossing a string boundary is priced once, which is why they go in together.
 * @returns the priced tokens, unrounded so a caller may sum many before rounding.
 */
export function textTokens(texts: Iterable<string>): number {
  let total = 0
  let kind = NONE
  let length = 0
  let newline = false

  function close() {
    if (kind === WIDE) total += length * CJK
    else if (kind === WIDE_MARK) total += length * CJK_MARK
    else if (kind === LETTER) total += length <= 10 ? WORD[length] : WORD[10] + (length - 10) * WORD_TAIL
    else if (kind === DIGIT) total += Math.ceil(length / 3) * DIGIT_GROUP
    else if (kind === SPACE) total += newline ? NEWLINE : length === 1 ? LONE_SPACE : SPACE_RUN
    else if (kind === PUNCT) total += PUNCT_RUN + length * PUNCT_CHAR
    kind = NONE
    length = 0
    newline = false
  }

  for (const text of texts) {
    for (let index = 0; index < text.length; index++) {
      let code = text.charCodeAt(index)
      // A surrogate pair is one character, not two, and its code point is the one that
      // says whether it is an emoji (a mark) or a character.
      if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length) {
        code = text.codePointAt(index) as number
        index += 1
      }
      const next = classOf(code)
      if (next !== kind) {
        close()
        kind = next
      }
      length += 1
      if (next === SPACE && (code === 0x0a || code === 0x0d)) newline = true
    }
  }
  close()
  return total
}

/** The framing a request spends on one content block's own tags. */
const BLOCK_OVERHEAD = 4
/** The role framing every priced message carries. */
const ROLE_OVERHEAD = 4

/** What a block costs when its members are unknown to this reader: the JSON it is sent as. */
const structuralTokens = (block: unknown) => textTokens([JSON.stringify(block) ?? ''])

/** The picture's intrinsic size, when the attachment reference carries a usable one. */
function sizedOf(block: object): { width: number, height: number } | null {
  const attachment = (block as { attachment?: unknown }).attachment
  if (attachment === null || typeof attachment !== 'object') return null
  const { width, height } = attachment as { width?: unknown, height?: unknown }
  return typeof width === 'number' && typeof height === 'number'
    && Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
    ? { width, height }
    : null
}

/** What one content block costs, its own structural framing included. */
function blockTokens(block: unknown): number {
  if (block === null || typeof block !== 'object') return BLOCK_OVERHEAD
  const { type, text, name } = block as { type?: unknown, text?: unknown, name?: unknown }
  if (type === 'text' || type === 'reasoning') {
    return textTokens([typeof text === 'string' ? text : '']) + BLOCK_OVERHEAD
  }
  if (type === 'tool-call') {
    const args = (block as { arguments?: unknown }).arguments
    return textTokens([typeof name === 'string' ? name : '', typeof args === 'string' ? args : '']) + BLOCK_OVERHEAD
  }
  if (type === 'image') {
    const sized = sizedOf(block)
    // A reference without an intrinsic size is priced as the reference it is sent
    // as: the route that carries the bytes owns what they cost.
    if (sized !== null) return imageTokens(sized.width, sized.height) + BLOCK_OVERHEAD
  }
  return structuralTokens(block) + BLOCK_OVERHEAD
}

/**
 * What one model-visible message costs.
 *
 * @param message - the message as the session log carries it, or null before one exists.
 * @returns the tokens the message is billed at, rounded once at the end.
 */
export function messageTokens(message: { content?: unknown } | null | undefined): number {
  const content = message?.content
  if (!Array.isArray(content) || content.length === 0) return 0
  let tokens = ROLE_OVERHEAD
  for (const block of content) tokens += blockTokens(block)
  return Math.round(tokens)
}

/**
 * What one tool definition costs.
 *
 * @param tool - the schema as the request header declares it.
 * @returns the tokens the definition adds to every request.
 */
export function toolSchemaTokens(tool: unknown): number {
  return Math.round(structuralTokens(tool) + BLOCK_OVERHEAD)
}

/** Whether a content block carries a file or picture rather than model-readable text. */
function isAttachment(block: object): boolean {
  const type = (block as { type?: unknown }).type
  if (type === 'image' || type === 'file' || type === 'audio' || type === 'video' || type === 'document') return true
  const attachment = (block as { attachment?: unknown }).attachment
  return attachment !== null && typeof attachment === 'object'
}

/** A message's price split by content-block form, the parts summing to {@link messageTokens}. */
export interface MessageBlockParts {
  text: number
  reasoning: number
  toolCall: number
  attachment: number
  /** Unknown blocks plus the role framing; the assistant's reasoning residual absorbs these. */
  other: number
}

/**
 * What one message costs by content-block form (D104). The block forms are priced apart so
 * the context fold can route reasoning, tool calls and attachments to their own categories
 * regardless of the message carrying them. The five parts are integer shares of the message's
 * rounded total, allocated in order so they sum to it exactly; the role framing rides with
 * `other`, which the assistant's reasoning residual (total less text, calls and attachments)
 * takes — so invisible reasoning and unknown blocks land there too.
 *
 * @param message - the message as the session log carries it, or null before one exists.
 * @returns the message's price by block form, summing to {@link messageTokens}.
 */
export function messageBlockParts(message: { content?: unknown } | null | undefined): MessageBlockParts {
  const parts: MessageBlockParts = { text: 0, reasoning: 0, toolCall: 0, attachment: 0, other: 0 }
  const content = message?.content
  if (!Array.isArray(content) || content.length === 0) return parts
  let text = 0, reasoning = 0, toolCall = 0, attachment = 0, other = 0
  for (const block of content) {
    const price = blockTokens(block)
    if (block !== null && typeof block === 'object') {
      const type = (block as { type?: unknown }).type
      if (type === 'text') { text += price; continue }
      if (type === 'reasoning') { reasoning += price; continue }
      if (type === 'tool-call') { toolCall += price; continue }
      if (isAttachment(block)) { attachment += price; continue }
    }
    other += price
  }
  const weights = [text, reasoning, toolCall, attachment, other + ROLE_OVERHEAD]
  const keys = ['text', 'reasoning', 'toolCall', 'attachment', 'other'] as const
  const total = messageTokens(message)
  const sum = weights.reduce((acc, weight) => acc + weight, 0)
  let allocated = 0, cumulative = 0
  for (let index = 0; index < weights.length; index++) {
    cumulative += weights[index]
    const next = index === weights.length - 1 ? total : Math.round(total * cumulative / sum)
    parts[keys[index]] = next - allocated
    allocated = next
  }
  return parts
}
