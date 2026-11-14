/**
 * selector-buckets.mjs — give the last compound of every shipped selector a key
 * the browser buckets rules by (D101).
 *
 * A browser finds an element's rules by the class names, id, attribute names and
 * tag in each selector's last compound; a selector with none of them there is
 * tried on every element of the page. Two things keep the skin's sheet out of
 * that path. A last compound that takes its key from a multi-argument `:is()`
 * or `:where()` is written out as one selector per argument, each keyed on its
 * own. A last compound left with no key after that is refused unless the
 * record of unkeyed selectors names it with its reason.
 */
import selectorParser from 'postcss-selector-parser'
import { compare, selectorSpecificity } from '@csstools/selector-specificity'
import { loadModule } from '../shared/ts-module.mjs'

/**
 * A class, id and tag no element carries: negated, each is a condition every
 * element meets, and it weighs what its argument weighs. A written-out argument
 * lighter than the list it came from takes these to stand at the list's weight.
 */
const ABSENT = loadModule('packages/client/src/constants.ts').ABSENT_NAME
const PADDING = { a: `:not(#${ABSENT})`, b: `:not(.${ABSENT})`, c: `:not(${ABSENT})` }

/** The pseudo-classes that hold a selector list and match what any argument matches. */
const LISTS = new Set([':is', ':where'])

/** A selector's last compound: the nodes after its last combinator. */
function lastCompound(selector) {
  let start = 0
  selector.nodes.forEach((node, index) => { if (node.type === 'combinator') start = index + 1 })
  return selector.nodes.slice(start)
}

/** Whether a node is `:is()` or `:where()` holding at least one argument. */
function isList(node) {
  return node.type === 'pseudo' && LISTS.has(node.value.toLowerCase()) && node.nodes.length > 0
}

/**
 * Whether a compound carries a key: a class, an id, an attribute or a tag of its
 * own, or a single-argument list whose argument ends in a keyed compound — a
 * browser reads through a list of one to the selector inside it.
 */
function keyed(compound) {
  if (compound.some((node) => node.type === 'class' || node.type === 'id' || node.type === 'attribute' || node.type === 'tag')) return true
  return compound.some((node) => isList(node) && node.nodes.length === 1 && keyed(lastCompound(node.nodes[0])))
}

/** One selector as text, without the space a list leaves around its arguments. */
function text(selector) {
  return selector.toString().trim()
}

/** Parse one selector's text back into its node. */
function parse(selectorText) {
  return selectorParser().astSync(selectorText).nodes[0]
}

/**
 * Write a selector out until its last compound is keyed, or no list in it is
 * left to write out.
 *
 * The first multi-argument list of the last compound is taken apart: each
 * argument replaces the list in a copy of the selector. An argument that weighs
 * what the list weighed and holds no combinator stands in the compound itself,
 * at its start, where a tag has to be. Any other argument stays in a list of
 * one — `:is()` when it weighs the same, `:where()` plus the padding that makes
 * up the difference when it is lighter — so every copy weighs what the original
 * did, and matches what that one argument matched.
 *
 * @param selectorText - one complex selector.
 * @returns the selectors that replace it, as text; the original alone when
 *          nothing was written out.
 */
function writeOut(selectorText) {
  const selector = parse(selectorText)
  const compound = lastCompound(selector)
  if (keyed(compound)) return [text(selector)]
  const list = compound.find((node) => isList(node) && (node.nodes.length > 1 || writeOut(text(node.nodes[0])).length > 1))
  if (list === undefined) return [text(selector)]
  const weight = selectorSpecificity(list)
  const zero = list.value.toLowerCase() === ':where'
  const start = selector.nodes.indexOf(compound[0])
  const at = selector.nodes.indexOf(list)
  // A tag has to open its compound, which a universal selector already does here.
  const open = compound[0].type !== 'universal'
  const piece = (from, to) => selector.nodes.slice(from, to).map((node) => node.toString()).join('')
  const out = []
  for (const argument of list.nodes.flatMap((node) => writeOut(text(node)))) {
    const own = selectorSpecificity(parse(argument))
    const simple = !parse(argument).nodes.some((node) => node.type === 'combinator')
    let written
    if (!zero && simple && open && compare(own, weight) === 0) {
      written = `${piece(0, start)}${argument}${piece(start, at)}${piece(at + 1)}`
    } else if (!zero && compare(own, weight) === 0) {
      written = `${piece(0, at)}:is(${argument})${piece(at + 1)}`
    } else {
      const padding = zero ? '' : PADDING.a.repeat(weight.a) + PADDING.b.repeat(weight.b) + PADDING.c.repeat(weight.c)
      written = `${piece(0, at)}:where(${argument})${padding}${piece(at + 1)}`
    }
    out.push(...writeOut(written))
  }
  return out
}

/**
 * The selectors one rule's selector list ships as (D101).
 * @returns each written-out selector with whether its last compound is keyed.
 * @throws when a written-out selector weighs other than the one it came from:
 *         the cascade would then order the rule differently than its source says.
 */
function bucketSelectors(ruleSelector) {
  return selectorParser().astSync(ruleSelector).nodes.flatMap((selector) => {
    const weight = selectorSpecificity(selector)
    return writeOut(text(selector)).map((written) => {
      const node = parse(written)
      if (compare(selectorSpecificity(node), weight) !== 0) throw new Error(`build: "${written}" does not weigh what "${text(selector)}" weighs (D101)`)
      return { selector: written, keyed: keyed(lastCompound(node)) }
    })
  })
}

/** One selector as the record of unkeyed selectors spells it: single spaces, none at the ends. */
function recordKey(selector) {
  return selector.replace(/\s+/g, ' ').trim()
}

export { bucketSelectors, recordKey }
