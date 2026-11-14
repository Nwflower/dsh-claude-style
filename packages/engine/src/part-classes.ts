import { partRegions } from './parts-table'
import type { PartsTableVocabulary } from './parts-table'

/**
 * The part vocabulary resolved to the host's own class names (D101).
 *
 * A stylesheet names a host element by the skin's part name, and the host
 * names it by a hashed class a build cannot know. The marking pass reads every
 * mounted element's class names against the part tables
 * (packages/engine/src/parts.ts) and reports each hashed name it meets here;
 * this module finishes the sheet the build left open with them: each selector
 * that reads a part is written as selectors matching the classes behind it, one
 * per class where the part keys the last compound, so the browser buckets the
 * rule by a class the element carries from the moment the host inserts it.
 *
 * Only class names seen on the page go into the sheet. The host and its
 * plugins declare the common local names — `root`, `title`, `row` — once per
 * module, and a sheet written out for every declared hash grows with the number
 * of modules installed while a page shows a handful of them.
 *
 * A region's box, the subtree it does not read and the names read on its
 * anchor's children alone are conditions inside `:where()`, which weighs
 * nothing: a finished selector weighs what the part attribute weighed.
 */

/** One piece of a selector the build left open: text, or a part name with whether it keys the selector's last compound. */
export type SelectorPiece = string | readonly [part: string, keys: 0 | 1]

/** A sheet as the build ships it: `text[n]`, then the selector list of `rules[n]`, then `text[n + 1]`. */
export interface SheetTemplate {
  readonly text: readonly string[]
  readonly rules: readonly (readonly (readonly SelectorPiece[])[])[]
}

/** What the skin hands over: its vocabulary and the names no element carries (D73). */
export interface PartClassVocabulary extends PartsTableVocabulary {
  /** A class no element carries: the selector of a rule whose parts name no class on this page. */
  absent: string
  /** The attribute a feature writes a part name under where it names an element itself. */
  stamp: string
  /** The parts a feature stamps that way, which a finished selector reads beside their classes. */
  stamped: readonly string[]
}

/** Where one part is read from: the local names behind it and the condition its region puts on the element. */
interface PartSource {
  locals: readonly string[]
  condition: string
}

let adopted: PartClassVocabulary | null = null
/** Part name → where it is read from. */
let sources = new Map<string, PartSource[]>()
/** Local name → the hashed class names met on the page for it; a key for every local name a table reads. */
let classes = new Map<string, Set<string>>()
/** The compounds of each part as last resolved; cleared whenever a class arrives. */
const resolved = new Map<string, string[]>()
/** Whether a class name arrived since the listeners last heard. */
let arrived = false
/** Called when class names arrived: the sheets finished before have to be finished again. */
const listeners = new Set<() => void>()

function vocabulary(): PartClassVocabulary {
  if (adopted === null) throw new Error('dsh-claude-style engine: part classes were asked for before the skin handed its vocabulary over')
  return adopted
}

/**
 * Take the skin's vocabulary and compile the tables into what each part is
 * read from. A hand-over starts with no class name met: the names belong to
 * the page the marking pass reads from here on.
 */
export function adoptPartClasses(next: PartClassVocabulary) {
  adopted = next
  const built = new Map<string, PartSource[]>()
  const met = new Map<string, Set<string>>()
  const add = (table: Record<string, string>, condition: string) => {
    const byPart = new Map<string, string[]>()
    for (const [local, part] of Object.entries(table)) {
      if (!met.has(local)) met.set(local, new Set())
      byPart.set(part, [...byPart.get(part) ?? [], local])
    }
    for (const [part, names] of byPart) built.set(part, [...built.get(part) ?? [], { locals: names, condition }])
  }
  for (const region of partRegions(next)) {
    // The page-wide region puts no condition on an element: everything a rule can reach stands in `body`.
    const inside = region.within === 'body' ? '' : `:where(${region.within}, :is(${region.within}) *)`
    // A skipped subtree counts only where the region is in force above it, as the region's own box is.
    const skipped = region.skip === undefined ? '' : `:where(:not(:is(${region.within}, :is(${region.within}) *):is(${region.skip}) *))`
    add(region.parts, inside + skipped)
    if (region.rootParts !== undefined) add(region.rootParts, `:where(:is(${region.within}) > *)`)
  }
  sources = built
  classes = met
  arrived = false
  resolved.clear()
}

/**
 * Report one class name the marking pass read on an element, with the local
 * name it carries. A name no table reads, or one met before, changes nothing.
 * Before a vocabulary is handed over no name is wanted, so the pass may run
 * without this module.
 */
export function meetClass(local: string, name: string) {
  const names = classes.get(local)
  if (names === undefined || names.has(name)) return
  names.add(name)
  arrived = true
}

/**
 * Tell the listeners once that class names arrived. The marking pass calls
 * this at the end of each batch it reads, in the task that read it, so a sheet
 * is finished again before the frame that shows the new elements.
 */
export function announceClasses() {
  if (!arrived) return
  arrived = false
  resolved.clear()
  for (const listener of [...listeners]) listener()
}

/** Hear when class names arrived. @returns the function that stops listening. */
export function onPartClasses(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/**
 * The compounds one part resolves to on this page: one per class and region,
 * each weighing one class, and the stamp where a feature names the element
 * itself. The stamp is an attribute of its own: the marking pass writes the part
 * attribute on every element it names, and a sheet that read that attribute
 * would have the browser look every such write up.
 */
function compounds(part: string): string[] {
  const known = resolved.get(part)
  if (known !== undefined) return known
  const found: string[] = []
  for (const source of sources.get(part) ?? []) {
    for (const local of source.locals) {
      for (const name of classes.get(local) ?? []) found.push(`.${CSS.escape(name)}${source.condition}`)
    }
  }
  if (vocabulary().stamped.includes(part)) found.push(`[${vocabulary().stamp}~="${part}"]`)
  resolved.set(part, found)
  return found
}

/** One part as a single compound: any of its classes, or the class nothing carries when the page shows none. */
function anyOf(part: string): string {
  const found = compounds(part)
  if (found.length === 0) return `.${vocabulary().absent}`
  return found.length === 1 ? found[0] : `:is(${found.join(',')})`
}

/**
 * Finish one selector: the part that keys its last compound is written out as
 * one selector per class, every other part as a list in place.
 * @returns the selectors, none when the keying part names no class on this page.
 */
function finishSelector(pieces: readonly SelectorPiece[]): string[] {
  const key = pieces.findIndex((piece) => typeof piece !== 'string' && piece[1] === 1)
  const written = pieces.map((piece, at) => typeof piece === 'string' || at === key ? piece : anyOf(piece[0]))
  if (key === -1) return [written.join('')]
  const before = written.slice(0, key).join('')
  const after = written.slice(key + 1).join('')
  return compounds((pieces[key] as readonly [string, 0 | 1])[0]).map((compound) => `${before}${compound}${after}`)
}

/**
 * The sheet's text for the page as it stands (D101). A rule none of whose
 * selectors names a class here keeps its place in the sheet under the class
 * nothing carries, so the rules around it keep their order.
 */
export function finishSheet(template: SheetTemplate): string {
  let text = template.text[0]
  template.rules.forEach((selectors, at) => {
    const finished = selectors.flatMap(finishSelector)
    text += (finished.length === 0 ? `.${vocabulary().absent}` : finished.join(',')) + template.text[at + 1]
  })
  return text
}

/**
 * A selector written in the part vocabulary, as one the page can match without
 * a mark: every `[part~="name"]` in it stands for the classes behind that part,
 * exactly as a finished sheet writes them in an earlier compound.
 */
export function partSelector(written: string): string {
  const attribute = vocabulary().part
  return written.replaceAll(new RegExp(`\\[${attribute}~="([\\w-]+)"\\]`, 'g'), (_match, part: string) => anyOf(part))
}
