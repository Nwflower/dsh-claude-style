/**
 * part-template.mjs — leave every selector that reads a part open for the page
 * to finish (D101).
 *
 * A part name stands for host class names the build cannot know, so the sheet
 * ships in pieces: its text, cut at each rule whose selector list reads a part,
 * and that list as pieces of its own — the text between the part reads, and each
 * part name with whether it keys the selector's last compound. The browser half
 * writes the class names in (packages/engine/src/part-classes.ts).
 */
import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'

/** Characters no stylesheet text holds, standing where a cut is made. */
const RULE_CUT = '\u0001'
const PART_CUT = '\u0002'

/** The index a selector's last compound starts at. */
function lastCompoundStart(selector) {
  let start = 0
  selector.nodes.forEach((node, index) => { if (node.type === 'combinator') start = index + 1 })
  return start
}

/**
 * One selector as pieces: text, and `[part, keys]` for each part read. The
 * first part standing in the last compound itself keys the selector, and the
 * page writes it out as one selector per class; a part read anywhere else — an
 * earlier compound, inside `:not()` or a list — stays one compound in place.
 */
function selectorPieces(selector, partAttribute, where) {
  const reads = []
  const start = lastCompoundStart(selector)
  let keyed = false
  selector.walkAttributes((attribute) => {
    if (attribute.attribute !== partAttribute) return
    if (attribute.operator !== '~=' || typeof attribute.value !== 'string') {
      throw new Error(`build: ${where} reads [${partAttribute}] without naming one part whole; a part is read as [${partAttribute}~="name"] (D101)`)
    }
    const keys = !keyed && attribute.parent === selector && selector.index(attribute) >= start
    if (keys) keyed = true
    reads.push([attribute.value, keys ? 1 : 0])
    attribute.replaceWith(selectorParser.string({ value: PART_CUT }))
  })
  const text = selector.toString().trim().split(PART_CUT)
  return text.flatMap((piece, at) => at < reads.length ? [piece, reads[at]] : [piece])
}

/**
 * Cut a finished sheet into the template the page finishes.
 *
 * @param text - the sheet as it would otherwise ship.
 * @param partAttribute - the attribute a selector names a part by.
 * @returns `text[n]`, then the selector list `rules[n]`, then `text[n + 1]`.
 */
export function sheetTemplate(text, partAttribute) {
  if (text.includes(RULE_CUT) || text.includes(PART_CUT)) throw new Error('build: the stylesheet holds a control character the part template cuts with')
  const root = postcss.parse(text)
  const rules = []
  root.walkRules((rule) => {
    if (rule.parent.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return
    if (!rule.selector.includes(partAttribute)) return
    const selectors = selectorParser().astSync(rule.selector)
    rules.push(selectors.nodes.map((selector) => selectorPieces(selector, partAttribute, `"${rule.selector.slice(0, 90)}"`)))
    rule.selector = RULE_CUT
  })
  const pieces = root.toString().split(RULE_CUT)
  if (pieces.length !== rules.length + 1) throw new Error('build: the part template lost a rule between cutting and joining')
  return { text: pieces, rules }
}
