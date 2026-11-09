import { holdRelations, partRegions } from './parts-table'
import type { HoldRelation, PartTable, PartsTableVocabulary } from './parts-table'
import { localClassName, setAttributeIfChanged } from './dom'
import { subscribeMutations } from './bus'

/**
 * The marking pass behind the skin's part vocabulary (D3) and the holds a
 * stylesheet reads as structure (D9).
 *
 * The tables in packages/engine/src/parts-table.ts say which host class names
 * the skin reads and what it calls each one; this module walks the page once,
 * reads each host class name's local part exactly, and writes the skin's own
 * names for it onto the element as `data-dsh-claude-part`. A stylesheet then
 * matches one attribute whole, so a match cannot take a neighbour that merely
 * holds the same fragment, a host rename leaves the rule quiet instead of
 * wrong, and no other plugin's class name can collide with these rules.
 *
 * A region scopes a local name that means different things in different places
 * — the composer's `_row` is not the tool call's, the sidebar's `_title` is not
 * the conversation's — and keeps the walk off the rest of the page. A region is
 * entered where its anchor matches, so the walk carries the regions in force
 * down and asks each element once.
 *
 * A rule that names an element because of what its subtree contains used to ask
 * the browser the same question on every change below it. The walk visits every
 * node anyway, so the relations in the same table are answered here and written
 * as `data-dsh-claude-holds`: one attribute read in the stylesheet, and the
 * count behind a mark moves only where a held node arrived, left, or changed.
 */

/** One region's lookup, compiled from its table. */
interface RegionLookup {
  within: string
  parts: Map<string, string>
  rootParts: Map<string, string> | null
  /** The subtree the region does not read inside, or null for a region that reads everywhere it stands. */
  skip: string | null
}

/** What the skin handed over at install: its own attributes and the anchors its menus stand in (D73). */
export interface PartsVocabulary extends PartsTableVocabulary {
  /** The attribute a holder carries: the hold words it answers for. */
  holds: string
}

/** The vocabulary the current generation installed, or null before one did. */
let adopted: PartsVocabulary | null = null

/**
 * The last generation whose marking pass installed: a teardown that finds a
 * newer one here leaves the marks standing, because they are the newer one's.
 */
let lastPartsGeneration = 0

/**
 * The vocabulary, or a refusal: the marking pass writes the skin's own
 * attributes, so a pass running before the hand-over is a wiring mistake.
 */
function vocabulary(): PartsVocabulary {
  if (adopted === null) throw new Error('dsh-claude-style engine: parts were marked before the skin handed its vocabulary over')
  return adopted
}

/** Every region's lookup, compiled from the skin's own anchors. */
function buildLookups(vocabulary: PartsTableVocabulary): RegionLookup[] {
  return partRegions(vocabulary).map((region) => ({
    within: region.within,
    parts: new Map(Object.entries(region.parts)),
    rootParts: region.rootParts === undefined ? null : new Map(Object.entries(region.rootParts)),
    skip: region.skip ?? null,
  }))
}

/** Every region's anchor as one selector, so a subtree the walk enters is tested once. */
let ANCHOR_SELECTOR = ''

/** The regions the current generation installed, in the order the walk enters them. */
let LOOKUPS: RegionLookup[] = []

/** Every region's skipped subtree as one selector, so a walk tests an element once. */
let SKIP_SELECTOR = ''

/** The parts one element's class list carries, as one attribute value, or null when it plays none. */
function partsOf(element: Element, lookups: readonly RegionLookup[], rootParts: Map<string, string> | null) {
  if (element.classList.length === 0) return null
  if (lookups.length === 0 && rootParts === null) return null
  let parts: Set<string> | null = null
  for (const token of element.classList) {
    const local = localClassName(token)
    if (local === null) continue
    for (const lookup of lookups) {
      const part = lookup.parts.get(local)
      if (part === undefined) continue
      parts ??= new Set()
      parts.add(part)
    }
    const rootPart = rootParts?.get(local)
    if (rootPart !== undefined) {
      parts ??= new Set()
      parts.add(rootPart)
    }
  }
  return parts === null ? null : [...parts].join(' ')
}

/** Write one element's parts, or take the attribute off when it plays none. @returns whether the element's mark changed. */
function writeParts(element: Element, lookups: readonly RegionLookup[], rootParts: Map<string, string> | null) {
  const parts = partsOf(element, lookups, rootParts)
  if (parts === null) {
    if (!element.hasAttribute(vocabulary().part)) return false
    element.removeAttribute(vocabulary().part)
    return true
  }
  if (element.getAttribute(vocabulary().part) === parts) return false
  setAttributeIfChanged(element, vocabulary().part, parts)
  return true
}

/* ---------- the holds a stylesheet reads as structure ---------- */

/** One relation, with the held nodes the walk has found and the holders marked for each. */
interface HoldState {
  spec: HoldRelation
  held: Map<Element, Element[]>
}

let HOLD_STATES: HoldState[] = []

/** The held side of every relation as one selector: a node the pass can skip in a single test. */
let HELD_SELECTOR = ''

/** Every attribute whose change can move a mark. */
let HOLD_ATTRIBUTES = new Set<string>()

/** How many held nodes keep each relation's mark on an element. */
const HOLD_COUNTS = new Map<Element, Map<string, number>>()

/** Write one element's mark from its counts, or take the attribute off when nothing holds. */
function writeHolds(element: Element) {
  const counts = HOLD_COUNTS.get(element)
  const value = counts === undefined || counts.size === 0 ? '' : [...counts.keys()].sort().join(' ')
  if (value === '') {
    if (element.hasAttribute(vocabulary().holds)) element.removeAttribute(vocabulary().holds)
    return
  }
  setAttributeIfChanged(element, vocabulary().holds, value)
}

/** One more held node keeping `name` on this element. */
function addMark(element: Element, name: string) {
  let counts = HOLD_COUNTS.get(element)
  if (counts === undefined) {
    counts = new Map()
    HOLD_COUNTS.set(element, counts)
  }
  const next = (counts.get(name) ?? 0) + 1
  counts.set(name, next)
  if (next === 1) writeHolds(element)
}

/** One held node fewer keeping `name` on this element. */
function removeMark(element: Element, name: string) {
  const counts = HOLD_COUNTS.get(element)
  if (counts === undefined) return
  const next = (counts.get(name) ?? 0) - 1
  if (next > 0) {
    counts.set(name, next)
    return
  }
  counts.delete(name)
  if (counts.size === 0) HOLD_COUNTS.delete(element)
  writeHolds(element)
}

/**
 * The holders of one held node: the ancestors the relation's mark belongs on.
 *
 * A relation with a scope marks only nodes strictly inside it, so the answer is
 * empty for a node that stands outside the scope — the held side of a scoped
 * relation is a node the page may show anywhere, while the rule reads one box.
 */
function holdersOf(spec: HoldRelation, node: Element): Element[] {
  const parent = node.parentElement
  if (parent === null) return []
  if (spec.scope !== undefined && node.closest(spec.scope) === null) return []
  if (spec.direct === true) {
    if (spec.scope !== undefined && parent.matches(spec.scope)) return []
    return parent.matches(spec.holder) ? [parent] : []
  }
  const holders: Element[] = []
  for (let ancestor: Element | null = parent; ancestor !== null; ancestor = ancestor.parentElement) {
    if (spec.scope !== undefined && ancestor.matches(spec.scope)) break
    if (ancestor.matches(spec.holder)) holders.push(ancestor)
  }
  return holders
}

/** Whether two holder lists name the same elements, in the same order. */
function sameHolders(before: readonly Element[], after: readonly Element[]) {
  return before.length === after.length && before.every((element, at) => element === after[at])
}

/** Move one held node's marks from the holders that had them to the holders that should. */
function remark(state: HoldState, node: Element, next: Element[]): boolean {
  const before = state.held.get(node)
  if (before !== undefined && sameHolders(before, next)) return false
  if (before !== undefined) for (const holder of before) removeMark(holder, state.spec.name)
  if (next.length === 0) state.held.delete(node)
  else state.held.set(node, next)
  for (const holder of next) addMark(holder, state.spec.name)
  return true
}

/**
 * Answer the relations for one node the walk visits or a mutation moved: mark
 * its holders when it arrived, drop the marks when it left, move them when a
 * change around it took its holders away.
 */
function applyHolds(node: Element): boolean {
  let tracked = false
  for (const state of HOLD_STATES) if (state.held.has(node)) { tracked = true; break }
  if (!tracked && !node.matches(HELD_SELECTOR)) return false
  let changed = false
  for (const state of HOLD_STATES) {
    const was = state.held.has(node)
    const held = node.matches(state.spec.held)
    if (!was && !held) continue
    if (remark(state, node, held ? holdersOf(state.spec, node) : [])) changed = true
  }
  return changed
}

/** Drop a node's marks and those of everything under it, for a subtree the host took out. */
function dropHolds(node: Element): boolean {
  let changed = false
  for (const state of HOLD_STATES) {
    const holders = state.held.get(node)
    if (holders === undefined) continue
    state.held.delete(node)
    for (const holder of holders) removeMark(holder, state.spec.name)
    changed = true
  }
  for (const child of node.children) if (dropHolds(child)) changed = true
  return changed
}

/**
 * Re-answer the relations of every held node inside one element. A holder's own
 * mark or a scope anchor can arrive after the node it holds: the host adds
 * `data-phase` to a box its transcript already stands in, and the box is the
 * holder the rule reads.
 */
function remarkInside(element: Element): boolean {
  let changed = false
  for (const state of HOLD_STATES) {
    for (const [node, holders] of state.held) {
      if (node === element || !element.contains(node)) continue
      if (remark(state, node, holdersOf(state.spec, node))) changed = true
    }
  }
  return changed
}

/**
 * Take up the held nodes under an element that has just become a holder. A node
 * the pass walked before the holder existed was never taken up — the relation
 * had no mark to give it — so its side is read here, once, on the attribute
 * that turned the element into a holder. Only the relations watching that
 * attribute are asked, so a walk of the page is never the price of one.
 */
function adoptHeldInside(element: Element, attribute: string): boolean {
  let changed = false
  for (const state of HOLD_STATES) {
    if (!state.spec.attributes.includes(attribute)) continue
    if (!element.matches(state.spec.holder)) continue
    for (const node of element.querySelectorAll(state.spec.held)) if (applyHolds(node)) changed = true
  }
  return changed
}

/**
 * The regions in force at one element, read off its ancestors: the walk passes
 * them down, and an element the host mounted on its own — a menu card portalled
 * to `<body>`, a row React moved — resolves them itself. The root parts are
 * those of a region whose anchor is this element's own parent, which is the one
 * place the host puts a region's box.
 */
function contextAt(element: Element): { lookups: RegionLookup[], roots: Map<string, string> | null } {
  const lookups: RegionLookup[] = []
  for (const lookup of LOOKUPS) {
    if (element.closest(lookup.within) === null) continue
    if (insideSkipped(element, lookup)) continue
    lookups.push(lookup)
  }
  const parent = element.parentElement
  let roots: Map<string, string> | null = null
  if (parent !== null) {
    for (const lookup of LOOKUPS) {
      if (lookup.rootParts !== null && parent.matches(lookup.within)) roots = lookup.rootParts
    }
  }
  return { lookups, roots }
}

/**
 * Whether a region's skip covers one element, which is everything standing in
 * the skipped subtree. The node carrying the skip keeps its own parts: a region
 * names its own box, not the separate element the host mounts in it.
 */
function insideSkipped(element: Element, lookup: RegionLookup) {
  if (lookup.skip === null) return false
  const skipped = element.closest(lookup.skip)
  return skipped !== null && skipped !== element
}

/**
 * The regions one element's children are read in: the ones whose skipped subtree
 * starts here are dropped, because nothing under it is the region's own.
 */
function lookupsBelow(element: Element, lookups: readonly RegionLookup[]): readonly RegionLookup[] {
  if (SKIP_SELECTOR === '' || !element.matches(SKIP_SELECTOR)) return lookups
  return lookups.filter((lookup) => lookup.skip === null || !element.matches(lookup.skip))
}

/**
 * Walk one subtree, carrying the regions in force down from its parent.
 *
 * A region's `rootParts` are read on the anchor's own element children — where
 * the host puts the subtree's box — and nowhere deeper: a local name as common
 * as `root` belongs to rows and tooltips further in. A region's `skip` drops
 * the region for everything inside that node; the node itself keeps its own
 * parts, because what the region names is its box, not what the host mounts in
 * it.
 *
 * The holds the marks decide are re-answered once for the walked root
 * (remarkInside), not once per changed element: the loop is over every held
 * node, so a call per element would multiply it by the mount's own size.
 */
function walk(element: Element, inherited: readonly RegionLookup[], roots: Map<string, string> | null): boolean {
  let lookups = inherited
  let childRoots: Map<string, string> | null = null
  if (element.matches(ANCHOR_SELECTOR)) {
    for (const lookup of LOOKUPS) {
      if (!element.matches(lookup.within)) continue
      if (!lookups.includes(lookup)) lookups = [...lookups, lookup]
      if (lookup.rootParts !== null) childRoots = lookup.rootParts
    }
  }
  let changed = writeParts(element, lookups, roots)
  const below = lookupsBelow(element, lookups)
  for (const child of element.children) if (walk(child, below, childRoots)) changed = true
  if (applyHolds(element)) changed = true
  return changed
}

/**
 * Write the parts of one subtree now, inside the task that built it (D40). A
 * feature that mounts its own list and measures it before handing the task back
 * asks here: the marking pass reads the batch in the observer's callback, which
 * is a task later than the one that wrote the nodes.
 */
export function markPartsWithin(root: Element) {
  const { lookups, roots } = contextAt(root)
  if (walk(root, lookups, roots)) remarkInside(root)
}

/** Take every part and hold mark off, for the teardown. */
export function clearParts(root: ParentNode = document) {
  for (const element of root.querySelectorAll(`[${vocabulary().part}], [${vocabulary().holds}]`)) {
    element.removeAttribute(vocabulary().part)
    element.removeAttribute(vocabulary().holds)
  }
  for (const state of HOLD_STATES) state.held.clear()
  HOLD_COUNTS.clear()
}

/**
 * Install the marking pass: one walk of the page, then one walk of each subtree
 * the host mounts and a rewrite of each element whose class list or region stamp
 * changed. A part is written only where it differs, and the attribute the pass
 * writes is not one it watches, so it never feeds itself (D9).
 *
 * A part a feature reads can move that feature's own measurement — which rows a
 * menu card holds, what height it draws — so a batch that wrote anything asks
 * for one more pass, through `onMarked`. The next pass writes nothing (every
 * mark already holds) and the walk settles.
 *
 * A teardown that runs after a newer generation has installed leaves the marks
 * standing: they are the newer generation's, and clearing them would hand it a
 * page without the parts its sheet reads (D74, as mountStylesheet guards its
 * own sheet).
 *
 * @param next - the skin's own attribute vocabulary and menu anchors (D73).
 * @param onMarked - called once per batch that changed a mark.
 */
export function installParts(next: PartsVocabulary, onMarked?: () => void) {
  const generation = ++lastPartsGeneration
  adopted = next
  LOOKUPS = buildLookups(next)
  ANCHOR_SELECTOR = partRegions(next).map((region) => region.within).join(', ')
  SKIP_SELECTOR = partRegions(next).flatMap((region) => region.skip === undefined ? [] : [region.skip]).join(', ')
  HOLD_STATES = holdRelations(next).map((spec) => ({ spec, held: new Map() }))
  HELD_SELECTOR = holdRelations(next).map((relation) => relation.held).join(', ')
  HOLD_ATTRIBUTES = new Set(holdRelations(next).flatMap((relation) => relation.attributes))
  const settle = () => { if (onMarked !== undefined) onMarked() }
  if (walk(document.body, [], null)) {
    remarkInside(document.body)
    settle()
  }
  const stop = subscribeMutations(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    // A class rewrite moves an element's parts, and a menu stamp turns the card
    // under it into a region. Nothing else a class or a stamp means here. The
    // relations' own attributes are watched too: the node they belong to can
    // take one after it was mounted, and the mark answers what the subtree
    // holds from there on.
    attributeFilter: ['class', next.regions.account, next.regions.hero, next.regions.more, ...HOLD_ATTRIBUTES],
    skipQuiet: true,
    // The marks this pass writes are what the sheet draws the frame with: the
    // prose's face and line height, the table's widths. A session switch mounts
    // its transcript in one large batch, and a pass that waited for the task
    // after the paint drew that frame in the host's own type and then moved it
    // (#178). The pass a batch asks for afterwards (`onMarked`) is the
    // features' schedule, and that one still waits for its frame.
    beforePaint: true,
  }, (records) => {
    let changed = false
    for (const record of records) {
      if (record.type === 'attributes') {
        if (record.target instanceof Element) {
          const { lookups, roots } = contextAt(record.target)
          // A stamp — or a class rewrite — can turn the element into a region's
          // anchor, which is how a menu card portalled to `<body>` becomes one;
          // the rows under it are read inside that region, so the whole subtree
          // is walked. A plain class rewrite only moves the element's own parts.
          const moved = record.target.matches(ANCHOR_SELECTOR)
            ? walk(record.target, lookups, roots)
            : writeParts(record.target, lookups, roots)
          if (moved) {
            changed = true
            remarkInside(record.target)
          }
          if (applyHolds(record.target)) changed = true
          // A holder's own attribute — the host's phase mark, the skin's row
          // mark — can arrive under a held node that is already standing.
          if (record.attributeName !== null && HOLD_ATTRIBUTES.has(record.attributeName)) {
            if (adoptHeldInside(record.target, record.attributeName)) changed = true
            if (remarkInside(record.target)) changed = true
          }
        }
        continue
      }
      for (const node of record.removedNodes) {
        if (node instanceof Element && dropHolds(node)) changed = true
      }
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue
        const { lookups, roots } = contextAt(node)
        if (walk(node, lookups, roots)) {
          changed = true
          remarkInside(node)
        }
      }
    }
    if (changed) settle()
  })
  return () => {
    stop()
    // A newer generation installed after this one: its marks are the ones
    // standing, and clearing them here would strip the page it just marked.
    if (lastPartsGeneration === generation) clearParts()
  }
}
