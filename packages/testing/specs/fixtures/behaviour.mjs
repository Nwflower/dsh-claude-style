/**
 * What a behaviour spec is written with (D87): `spec()` to declare its page and
 * its tests, the readers that take user-observable results off the built page,
 * and the predicates that judge them. A spec reaches the page only through the
 * host contract by id, the skin's surface by id, or what the reader sees.
 */
import parser from 'postcss-selector-parser'
import registry from '../../data/surface.json' with { type: 'json' }
import { loadModule } from '../../../../scripts/shared/ts-module.mjs'

const { HOST_DOM } = loadModule('packages/contracts/src/table.ts')

/** The skin's surface entry for an id, or a refusal naming the table. */
function surfaceEntry(id) {
  const entry = registry.surface.find((candidate) => candidate.id === id)
  if (entry === undefined) throw new Error(`surface: no entry "${id}" in packages/testing/data/surface.json`)
  return entry
}

/** The selector of an element the skin draws. */
function surface(id) {
  const { selector } = surfaceEntry(id)
  if (selector === undefined) throw new Error(`surface: "${id}" names an attribute, not an element`)
  return selector
}

/** An attribute the skin writes. */
surface.attribute = (id) => {
  const { attribute } = surfaceEntry(id)
  if (attribute === undefined) throw new Error(`surface: "${id}" names an element, not an attribute`)
  return attribute
}

/** A CSS custom property the skin writes, by its surface id. */
surface.property = (id) => {
  const { property } = surfaceEntry(id)
  if (property === undefined) throw new Error(`surface: "${id}" names no custom property`)
  return property
}

/** The literal the host writes, by its contract id. */
function host(id) {
  const entry = HOST_DOM.find((candidate) => candidate.id === id)
  if (entry === undefined) throw new Error(`host: no entry "${id}" in packages/contracts/src/table.ts`)
  return entry.value
}

/** The one attribute a `[name]` contract selector reads, for building that element in the page. */
host.attribute = (id) => {
  const root = parser().astSync(host(id))
  const only = root.nodes[0]?.nodes
  if (root.nodes.length !== 1 || only?.length !== 1 || only[0].type !== 'attribute') throw new Error(`host: "${id}" is not one attribute`)
  return only[0].attribute
}

/** The attributes a compound contract selector reads, as name and value pairs, for building that element in the page. */
host.attributes = (id) => {
  const root = parser().astSync(host(id))
  if (root.nodes.length !== 1) throw new Error(`host: "${id}" is a list, not one element`)
  return root.nodes[0].nodes.map((node) => {
    if (node.type !== 'attribute') throw new Error(`host: "${id}" holds ${node.type} "${String(node)}", not attributes alone`)
    return [node.attribute, node.value ?? '']
  })
}

/** Declare one spec: its stand-in page, the viewport bands it is judged at (`wide` unless named), and its tests as name and body. */
function spec(options, define) {
  const tests = []
  define({ test: (name, body) => tests.push({ name, body }) })
  return { page: options.page, bands: options.bands ?? ['wide'], densities: options.densities ?? [1], tests }
}

/** A failed predicate, with what was expected and what the page showed. */
class PredicateError extends Error {
  constructor(predicate, label, expected, actual) {
    super(`${predicate}: ${label}\n  expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`)
    this.evidence = { predicate, label, expected, actual }
  }
}

/** The page readers: each takes a selector and answers what the reader sees there, as plain data. */
function readers(page) {
  return {
    /** The first visible element's box in the viewport, or null where nothing matching is drawn. */
    box: (selector) => page.evaluate((s) => {
      for (const element of document.querySelectorAll(s)) {
        const rect = element.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0 && element.checkVisibility({ visibilityProperty: true, opacityProperty: true })) {
          return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }
        }
      }
      return null
    }, selector),
    /** How many elements match. */
    count: (selector) => page.evaluate((s) => document.querySelectorAll(s).length, selector),
    /**
     * Every animation running on a matching element: play state and one cycle's
     * length. Iteration count is left out: an infinite one crosses the page
     * boundary as null, and a judgement reading it would answer about the transport.
     */
    animations: (selector) => page.evaluate((s) => document.getAnimations()
      .filter((animation) => animation.effect !== null && animation.effect.target instanceof Element && animation.effect.target.matches(s))
      .map((animation) => {
        const timing = animation.effect.getComputedTiming()
        return { playState: animation.playState, duration: Number(timing.duration) }
      }), selector),
    /** The first match's content against its box, both ways. */
    overflow: (selector) => page.evaluate((s) => {
      const element = document.querySelector(s)
      return element === null ? null : { scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight }
    }, selector),
    /** An attribute of the first match, or null. */
    attribute: (selector, name) => page.evaluate(([s, n]) => document.querySelector(s)?.getAttribute(n) ?? null, [selector, name]),
    /** The first match's text as laid out, or null. */
    text: (selector) => page.evaluate((s) => document.querySelector(s)?.innerText ?? null, selector),
    /** One computed property of the first match, or null. */
    computed: (selector, property, pseudo) => page.evaluate(([s, p, e]) => {
      const element = document.querySelector(s)
      return element === null ? null : getComputedStyle(element, e ?? null).getPropertyValue(p)
    }, [selector, property, pseudo]),
  }
}

/** The predicates a behaviour spec judges with; each throws a PredicateError carrying its evidence. */
const expectThat = {
  /** Something is drawn: a box with an area. */
  visible(box, label) {
    if (box === null || box === undefined || !(box.width > 0 && box.height > 0)) throw new PredicateError('visible', label, 'a drawn box', box)
  },
  /** Nothing is there: null, zero, or an empty list. */
  absent(value, label) {
    if (!(value === null || value === undefined || value === 0 || (Array.isArray(value) && value.length === 0))) throw new PredicateError('absent', label, 'nothing', value)
  },
  /** Two readings are the same. */
  equal(actual, expected, label) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new PredicateError('equal', label, expected, actual)
  },
  /** A box lies inside another, to `slack` pixels on each edge. */
  boxWithin(inner, outer, label, slack = 0.5) {
    const inside = inner !== null && outer !== null && inner.left >= outer.left - slack && inner.right <= outer.right + slack && inner.top >= outer.top - slack && inner.bottom <= outer.bottom + slack
    if (!inside) throw new PredicateError('boxWithin', label, { within: outer }, inner)
  },
  /** Two boxes do not overlap. */
  boxesApart(a, b, label, slack = 0.5) {
    const apart = a !== null && b !== null && (a.right <= b.left + slack || b.right <= a.left + slack || a.bottom <= b.top + slack || b.bottom <= a.top + slack)
    if (!apart) throw new PredicateError('boxesApart', label, 'two boxes that do not overlap', { a, b })
  },
  /**
   * The content fits its box across: no horizontal scrollbar can appear. A
   * clipped sub-pixel child reads one pixel past its box without any bar being
   * possible, so one step is the tolerance the reading needs.
   */
  noHorizontalOverflow(overflow, label) {
    if (overflow === null || overflow.scrollWidth - overflow.clientWidth > 1) throw new PredicateError('noHorizontalOverflow', label, 'scrollWidth <= clientWidth', overflow)
  },
  /**
   * Nothing moves: no animation with a cycle a reader can see. The
   * reduced-motion net forces a 0.01ms cycle but leaves iteration count alone,
   * so an infinite animation keeps reporting `running` over one still frame;
   * `moving` reads the same floor.
   */
  still(animations, label) {
    const moving = animations.filter((animation) => animation.playState === 'running' && animation.duration >= 100)
    if (moving.length > 0) throw new PredicateError('still', label, 'no running animation', moving.slice(0, 3))
  },
  /** Something moves: at least one animation running with a visible cycle. */
  moving(animations, label, shortestMs = 100) {
    if (!animations.some((animation) => animation.playState === 'running' && animation.duration >= shortestMs)) {
      throw new PredicateError('moving', label, `a running animation of at least ${shortestMs} ms`, animations.slice(0, 3))
    }
  },
  /** A sequence the page recorded runs one way: never back, and through more than one value. */
  sequenceMonotonic(values, label, direction = 'up') {
    const backwards = values.some((value, at) => at > 0 && (direction === 'up' ? value < values[at - 1] : value > values[at - 1]))
    if (backwards || new Set(values).size < 2) throw new PredicateError('sequenceMonotonic', label, `a sequence that only goes ${direction}`, values)
  },
}

export { spec, surface, host, readers, expectThat, PredicateError }
