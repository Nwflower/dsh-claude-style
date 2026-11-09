/** Extract only ended English present/perfect progressive clauses; quotations and negation are excluded (D70).
 * Intl.Segmenter supplies sentence boundaries, and identical input reuses the last scan.
 */

/** How much of the reasoning's tail one scan reads, in characters. */
export const PHRASE_TAIL_CHARS = 800

/** A sentence has ended once it ends with one of these, closing marks aside. */
const SENTENCE_MARKS = /[.!?\u2026\u3002\uff01\uff1f]+$/
/** What may follow a sentence's end: whitespace, a closing quote or bracket. */
const CLOSERS = /[\s"'\u201d\u2019\u300d\u300f\uff09)\]]+$/
/** Where a clause stops inside its sentence: punctuation below the sentence's own end. */
const CLAUSE_END = /[,;:\u2014\u2013)\uff0c\uff1b\uff1a\uff09]/
/**
 * The quotations reasoning wraps what it read in: 「…」, 『…』, “…”, "...". A
 * single quote is left out — an apostrophe is not a quotation.
 */
const QUOTED = /「[^」]*」|『[^』]*』|“[^”]*”|"[^"]*"/g
/** A whole word, which is what an auxiliary, a qualifier and a participle are read as. */
const WORD = /[A-Za-z\u2019']+/g
/** Closed qualifier class; any other intervening word rejects the clause. */
const QUALIFIERS = new Set(['not', 'now', 'currently', 'still', 'just', 'already', 'again', 'simply', 'only', 'also', 'really'])
/** How many qualifiers one clause may carry. */
const QUALIFIER_LIMIT = 2
/**
 * `-ing` words that end a clause as nouns in reasoning ("It is morning", "There
 * is nothing left"), which the shape would otherwise read as a participle. An
 * entry belongs here only for a wording a real reasoning text carried.
 */
const NOMINAL_ING = new Set(['nothing', 'anything', 'everything', 'something', 'thing', 'morning', 'evening'])
/** The contraction tails that carry an auxiliary ("I'm", "it's", "I've"). */
const CONTRACTED_AUX = /['\u2019](m|re|s|ve)$/

/** The page's sentence rules, built once, at the runtime's own locale: the rules for prose in either language, and for the dots inside a token, come from there. */
let segmenter: Intl.Segmenter | null = null
/** What the last scan read, and what it answered, so a pass over an unchanged reasoning costs one comparison. */
let scannedText = ''
let scannedPhrase: string | null = null

/**
 * The sentences of `text` that have ended, newest first: a clause is never read
 * out of the sentence still growing at the end of the tail.
 */
function endedSentences(text: string): string[] {
  if (segmenter === null) segmenter = new Intl.Segmenter(undefined, { granularity: 'sentence' })
  const sentences: string[] = []
  for (const piece of segmenter.segment(text)) {
    if (SENTENCE_MARKS.test(piece.segment.replace(CLOSERS, ''))) sentences.push(piece.segment)
  }
  return sentences.reverse()
}

/** The clause without the markers reasoning is written with; a pair of `**` or `__` goes, a single `*` or `_` stays as an identifier's own. */
function stripMarkup(text: string) {
  return text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/`|\*\*|__|~~/g, '')
}

/**
 * The sentence with the content of every quotation blanked out, its length kept
 * so the offsets still name the same places. What a quotation carries is what
 * the model read or is talking about — the line's own waiting word among it —
 * and reading a clause out of one would hand the row a sentence the model never
 * said about its own work.
 */
function withoutQuotes(sentence: string) {
  return sentence.replace(QUOTED, (quoted) => ' '.repeat(quoted.length))
}

/** A participle: an `-ing` word the shape may anchor, the nominal ones left out. */
function isParticiple(token: string) {
  return /^[a-z]+ing$/i.test(token) && !NOMINAL_ING.has(token.toLowerCase())
}

/** What a token carries: the present auxiliary, the perfect one (which needs `been`), or either, as a bare `'s` can be. */
type Auxiliary = 'present' | 'perfect' | 'either'

function auxiliaryOf(token: string): Auxiliary | null {
  const lower = token.toLowerCase()
  const contracted = CONTRACTED_AUX.exec(lower)
  const form = contracted === null ? lower : contracted[1]
  if (form === 'am' || form === 'is' || form === 'are' || form === 'm' || form === 're') return 'present'
  if (form === 'have' || form === 'has' || form === 'had' || form === 've') return 'perfect'
  return form === 's' ? 'either' : null
}

/**
 * A clause's body: from the participle to the first stop inside the sentence, or
 * to the sentence's end. Where it stops is read off the sentence without its
 * quotations, so punctuation inside one does not cut a clause short, and the
 * words carried come from the sentence as the model wrote it.
 */
function clauseBody(scanned: string, sentence: string, from: number) {
  const stop = scanned.slice(from).search(CLAUSE_END)
  const end = stop === -1 ? sentence.length : from + stop
  const body = stripMarkup(sentence.slice(from, end))
  // The marks a sentence carries after its end go first: a sentence the segmenter
  // handed over keeps its own full stop and the space after it.
  return body.replace(CLOSERS, '').replace(SENTENCE_MARKS, '').replace(/\s+/g, ' ').trim()
}

/**
 * The model's own clause out of one English sentence, or null where the sentence
 * says nothing of the kind: the sentence's last clause whose auxiliary is
 * followed by at most two qualifiers and a participle ("I am now checking the
 * row", "I have been checking it"). A negated clause is passed over rather than
 * ending the scan, since a clause before it may still say what the model is on.
 */
function englishClause(sentence: string): string | null {
  const scanned = withoutQuotes(sentence)
  const words = [...scanned.matchAll(WORD)].map(match => ({ text: match[0], end: (match.index ?? 0) + match[0].length }))
  let phrase: string | null = null
  for (let at = 0; at < words.length; at++) {
    const head = auxiliaryOf(words[at].text)
    if (head === null) continue
    let next = at + 1
    const aspect = head === 'either' ? (words[next]?.text.toLowerCase() === 'been' ? 'perfect' : 'present') : head
    if (aspect === 'perfect') {
      if (words[next]?.text.toLowerCase() !== 'been') continue
      next += 1
    }
    let negated = false
    let taken = 0
    while (taken < QUALIFIER_LIMIT && next < words.length && QUALIFIERS.has(words[next].text.toLowerCase())) {
      if (words[next].text.toLowerCase() === 'not') negated = true
      next += 1
      taken += 1
    }
    if (negated || next >= words.length || !isParticiple(words[next].text)) continue
    const participle = words[next].text
    const body = clauseBody(scanned, sentence, words[next].end)
    phrase = `${participle.charAt(0).toUpperCase()}${participle.slice(1)}${body === '' ? '' : ` ${body}`}`
  }
  return phrase
}

/**
 * What the model says it is doing, off one reasoning text, or null where it says
 * nothing of the kind: the newest ended sentence of the tail that hands the line
 * a clause — a sentence saying nothing, saying only what the model is not doing,
 * or saying it inside a quotation, lets the one before it speak.
 */
export function activityPhrase(text: string): string | null {
  if (text === scannedText) return scannedPhrase
  const tail = text.length <= PHRASE_TAIL_CHARS ? text : text.slice(-PHRASE_TAIL_CHARS)
  scannedText = text
  scannedPhrase = null
  for (const sentence of endedSentences(tail)) {
    const clause = englishClause(sentence)
    if (clause !== null) {
      scannedPhrase = clause
      break
    }
  }
  return scannedPhrase
}
