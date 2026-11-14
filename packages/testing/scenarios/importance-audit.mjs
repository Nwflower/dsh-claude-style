/**
 * Decide on the live page which skin `!important` declarations are needed, by
 * dropping each through the CSSOM and comparing computed values. Unmatched
 * selectors fail; third-party and transient marks are excused (D9). States come
 * from packages/testing/scenarios/importance.mjs.
 */
import fs from 'node:fs'
import path from 'node:path'
import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'
import { minifyCss } from '../../../scripts/shared/minify-css.mjs'
import { ruleKey } from '../../../scripts/shared/rule-key.mjs'
import surfaceTable from '../data/surface.json' with { type: 'json' }

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
/** The marker declaration carrying each rule's index into the page's CSSOM. */
const MARK = '--dsh-audit-rule'
/** The skin's stylesheet, by the tag it wears (D9). */
const SHEET = 'style[data-plugin-css="dsh-claude-style/client.css"]'
/** Pseudo-elements the page can read a computed style for. */
const READABLE_PSEUDO = new Set(['::before', '::after', '::marker', '::placeholder'])
/**
 * A skin mark as a selector reads it, taken from the surface table: the marks
 * the list below already spells stay as they are, and one added now is read
 * rather than written down a second time (D92).
 */
function mark(id) {
  const entry = surfaceTable.surface.find((candidate) => candidate.id === id)
  if (entry === undefined) throw new Error(`importance: no surface entry "${id}" for the mark a rule waits on`)
  return `[${entry.attribute}]`
}
/**
 * Selectors whose rule only applies while a transient mark is on the page,
 * under a pointer state the walk cannot hold, or in a state the walk carries
 * only now and then: no audited state carries them reliably, so a run that
 * happened to catch the element called the weight removable and the next run,
 * which did not, called it unmatched. Each entry is a contract, not a
 * convenience: the skin's own marks that go on and come off within one
 * animation (`fold-motion.css`'s rolling door, `inline.css`'s active-composer
 * controls, the send flight, the wait badge's leave, the reveal of a panel, the
 * reasoning window whose markdown variant the walk's turn sometimes carries), a
 * state a pointer holds (a dragged effort knob, a file row swapping its
 * operation), the mark the page wears while it is off screen, which only a
 * hidden window carries, and the host's own mark for a theme transition. The
 * hover walk still covers the rules whose own trigger it can point at.
 */
const TRANSIENT_SELECTORS = [
  '[data-dsh-claude-rolling]', '[data-dsh-claude-composer-active]',
  '[data-dsh-claude-revealing]', '[data-dsh-claude-page-enter]', '[data-dsh-claude-page-leave]',
  '[data-dsh-claude-search-closing]', '[data-dsh-claude-turn-nav-landed]',
  '[data-dsh-claude-send-ghost]', '[data-dsh-claude-send-flight]', '[data-dsh-claude-send-link]',
  '[data-dsh-claude-follow-tail]', '[data-dsh-claude-follow-hold]',
  '[data-dsh-claude-reader-hold]', '[data-dsh-claude-summary-running]', '[data-dsh-claude-wait-badge-leaving]',
  '[data-dsh-claude-file-merge]', '[data-dsh-claude-chat-reveal]', '[data-dsh-claude-roll]',
  '[data-dsh-claude-dragging]', '[data-dsh-claude-swapping]',
  '[data-dsh-claude-reason-window]', mark('skin.asleep'),
  '[data-dsh-theme-transitioning]',
]

/**
 * Pseudo-classes that need an interaction or a form state: the sweep asks
 * whether a selector's element exists at all, so these come out before the
 * query. A `:not(...)` keeps its own — an element that is not hovered is the
 * ordinary case there.
 */
const STATE_PSEUDOS = new Set([
  ':hover', ':active', ':focus', ':focus-visible', ':focus-within', ':target',
  ':checked', ':disabled', ':enabled', ':required', ':optional', ':valid', ':invalid',
  ':user-invalid', ':in-range', ':out-of-range', ':placeholder-shown', ':autofill',
  ':indeterminate', ':default', ':read-only', ':read-write', ':open', ':popover-open',
  ':link', ':visited', ':any-link',
])

/** Whether a pseudo-class sits inside a `:not(...)`, where removing it would change the question. */
function insideNot(node) {
  for (let parent = node.parent; parent !== undefined; parent = parent.parent) {
    if (parent.type === 'pseudo' && parent.value.toLowerCase() === ':not') return true
  }
  return false
}

/**
 * A rule's selector list as the sweep reads it: pseudo-elements and the
 * pseudo-classes of a state taken out, one entry per selector of the list.
 */
function sweepParts(selector) {
  const parts = []
  selectorParser((selectors) => {
    selectors.each((selector) => {
      const base = selector.clone()
      base.walkPseudos((node) => {
        const value = node.value.toLowerCase()
        if (value.startsWith('::') || value === ':before' || value === ':after') node.remove()
        else if (STATE_PSEUDOS.has(value) && !insideNot(node)) node.remove()
      })
      parts.push(base.toString().trim())
    })
  }).processSync(selector)
  return parts
}

/**
 * The rules of a stylesheet file, as `selector{declarations}` keys. The file
 * goes through the build's minifier first, so its keys spell the way the
 * page's rules do.
 */
function ruleKeys(file) {
  const keys = new Set()
  postcss.parse(minifyCss(fs.readFileSync(file, 'utf8'))).walkRules((rule) => { keys.add(ruleKey(rule)) })
  return keys
}

/**
 * The page's stylesheet, marked, and every rule holding an `!important`.
 *
 * @param text - the stylesheet the page runs.
 * @returns `{ annotated, rules, selectors }`; a rule is `{ id, selector, parts, props, keep }`,
 *     `parts` its selector list split into `{ base, pseudo }`, `keep` why its
 *     declarations are kept untried (or null); `selectors` the dead-selector
 *     sweep's inventory, each selector of the sheet mapped to why no state can
 *     be asked about it (or null).
 */
function planImportance(text) {
  const thirdParty = ruleKeys(path.join(ROOT, 'packages', 'client', 'src', 'theme', 'third-party.css'))
  const root = postcss.parse(text)
  const rules = []
  const selectors = new Map()
  let next = 0
  root.walkRules((rule) => {
    if (rule.parent.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return
    const id = next++
    // What the rule waits on besides its selector: a rule under a conditional
    // at-rule the page is not in changes no computed value when its importance
    // is dropped, so the page decides the condition before the rule is tried.
    const conditions = []
    for (let node = rule.parent; node !== undefined && node.type === 'atrule'; node = node.parent) {
      if (!/keyframes$/i.test(node.name)) conditions.unshift({ name: node.name.toLowerCase(), params: node.params })
    }
    const important = rule.nodes.filter((node) => node.type === 'decl' && node.important).map((node) => node.prop.toLowerCase())
    const key = ruleKey(rule)
    // Every rule feeds the sweep, `!important` or not: a selector no page state
    // ever matches is weight whether or not its declarations carry any.
    const sweepKeep = thirdParty.has(key) ? 'third-party' : TRANSIENT_SELECTORS.some((needle) => rule.selector.includes(needle)) ? 'transient state' : rule.parent.type === 'rule' ? 'nested' : null
    for (const part of sweepParts(rule.selector)) if (!selectors.has(part)) selectors.set(part, sweepKeep)
    rule.prepend({ prop: MARK, value: String(id) })
    if (important.length === 0) return
    const parts = []
    selectorParser((selectors) => {
      selectors.each((selector) => {
        let pseudo = null
        const base = selector.clone()
        base.walkPseudos((node) => {
          const value = node.value.toLowerCase()
          if (value.startsWith('::') || [':before', ':after'].includes(value)) {
            pseudo = value.startsWith('::') ? value : `:${value}`
            node.remove()
          }
        })
        parts.push({ base: base.toString().trim(), pseudo })
      })
    }).processSync(rule.selector)
    const props = [...new Set(important)]
    let keep = null
    if (thirdParty.has(key)) keep = 'third-party'
    // A rule that only holds while a transient, self-inflicted mark is on the
    // page (the fold's rolling door) is judged by nothing the scenario can walk:
    // no state carries the mark, the declarations match no element there, and
    // whether the weight is needed is what the rule's own contract says. It
    // stays untried, like a third-party answer.
    else if (TRANSIENT_SELECTORS.some((needle) => rule.selector.includes(needle))) keep = 'transient state'
    else if (rule.parent.type === 'rule') keep = 'nested'
    else if (props.length !== important.length) keep = 'declared twice'
    else if (parts.every((part) => part.pseudo !== null && !READABLE_PSEUDO.has(part.pseudo))) keep = 'unreadable pseudo-element'
    rules.push({ id, key, selector: rule.selector, parts: parts.filter((part) => part.pseudo === null || READABLE_PSEUDO.has(part.pseudo)), props, keep, conditions })
  })
  return { annotated: root.toString(), rules, selectors }
}

/**
 * The stylesheet with the given declarations' `!important` dropped.
 *
 * @param text - the annotated stylesheet (planImportance).
 * @param dropped - `"<rule id>:<property>"` keys.
 */
function dropImportance(text, dropped) {
  const root = postcss.parse(text)
  root.walkRules((rule) => {
    const mark = rule.nodes.find((node) => node.type === 'decl' && node.prop === MARK)
    if (mark === undefined) return
    for (const node of rule.nodes) {
      if (node.type !== 'decl' || !node.important || !dropped.has(`${mark.value}:${node.prop.toLowerCase()}`)) continue
      node.important = false
      delete node.raws.important
    }
  })
  return root.toString()
}

/* ---------- in the page ---------- */

/**
 * Hold the page still: every transition and every finite animation brought to
 * its end, every endless one stopped at its first frame — a stylesheet swap
 * restarts the animations it declares, and a value read mid-flight is the
 * clock's, not the cascade's. The style pass comes first: a transition the
 * last change asks for exists only once styles are computed. Landing one can
 * start the next — a child inheriting the value runs a transition of its own —
 * so it repeats until nothing moves.
 */
const SETTLE = `function settleTransitions() {
  for (let round = 0; round < 40; round++) {
    void document.documentElement.offsetHeight
    // An element out of the layout tree (display: none) has its style computed
    // only when asked, so one read of each brings it up to date before anyone compares.
    for (const element of document.querySelectorAll('*')) {
      for (const pseudo of [null, '::before', '::after']) void getComputedStyle(element, pseudo).color
    }
    // Scroll-driven ones follow the scroll position, which holds still on its own.
    const moving = document.getAnimations().filter((animation) => animation.timeline === document.timeline).filter((animation) => animation.playState === 'running' || (animation.playState === 'paused' && animation.currentTime !== 0 && !Number.isFinite(animation.effect?.getComputedTiming().endTime)))
    if (moving.length === 0) return
    for (const animation of moving) {
      if (Number.isFinite(animation.effect?.getComputedTiming().endTime)) animation.finish()
      else {
        animation.pause()
        animation.currentTime = 0
      }
    }
  }
  throw new Error('importance: animations keep starting after forty rounds of landing them')
}
/**
 * The longhands a property stands for, cached for the page's lifetime: a
 * shorthand is decided by the values under it, and no computed style exposes the
 * shorthand itself, so every comparison here goes through these names.
 */
const longhandCache = new Map()
window.longhandsOf = (prop) => {
  if (prop.startsWith('--')) return [prop]
  if (!longhandCache.has(prop)) {
    const probe = document.createElement('div').style
    probe.setProperty(prop, 'initial')
    const names = [...Array(probe.length)].map((_, at) => probe.item(at))
    longhandCache.set(prop, names.length === 0 ? [prop] : names)
  }
  return longhandCache.get(prop)
}`

/**
 * Try the undecided declarations of this page state, in source order (step 2
 * above). Runs inside the page; everything it needs comes in `input`.
 *
 * @returns `{ removable, needed, matched }` key lists.
 */
function tryInPage({ sheet, mark, rules, skip }) {
  const style = document.querySelector(sheet)
  const byId = new Map()
  const walk = (list) => {
    for (const rule of list) {
      if (rule.type === CSSRule.KEYFRAMES_RULE) continue
      if (rule.type === CSSRule.STYLE_RULE) {
        const id = rule.style.getPropertyValue(mark).trim()
        if (id !== '') byId.set(Number(id), rule)
      }
      if (rule.cssRules !== undefined) walk(rule.cssRules)
    }
  }
  walk(style.sheet.cssRules)
  // Land what the last state change set moving, so each trial starts from settled values.
  settleTransitions()
  const longhands = (prop) => window.longhandsOf(prop)
  const transitions = () => new Set(document.getAnimations().filter((animation) => animation instanceof CSSTransition))
  /** Every matched element and pseudo-element's value of each longhand, in one string per target. */
  const read = (targets, names) => targets.map(([element, pseudo]) => {
    const computed = getComputedStyle(element, pseudo)
    return names.map((name) => computed.getPropertyValue(name)).join('\u0001')
  })
  /** Drop the importance of `props` in a CSSOM rule; false when a value cannot be read back. */
  const drop = (rule, props) => {
    for (const prop of props) {
      const value = rule.style.getPropertyValue(prop)
      if (value === '') return false
      rule.style.setProperty(prop, value, '')
    }
    return true
  }
  /** Whether dropping `props` in `rule` leaves every target as it was; the drop stays when it does. */
  const attempt = (rule, targets, props) => {
    const names = [...new Set(props.flatMap(longhands))]
    const saved = rule.style.cssText
    const before = read(targets, names)
    const running = transitions()
    let same = drop(rule, props)
    if (same) {
      const after = read(targets, names)
      same = after.every((value, at) => value === before[at])
      const started = [...transitions()].filter((animation) => !running.has(animation))
      if (started.length > 0) same = false
      for (const animation of started) animation.cancel()
    }
    if (!same) {
      const restoring = transitions()
      rule.style.cssText = saved
      for (const animation of transitions()) if (!restoring.has(animation)) animation.cancel()
    }
    return same
  }
  const removable = []
  const needed = []
  const matched = []
  /** Whether the conditions a rule stands under hold right now; a rule whose condition does not is left for another state. */
  const conditionHolds = (conditions) => conditions.every((condition) => {
    if (condition.name === 'media') return matchMedia(condition.params).matches
    if (condition.name === 'supports') return CSS.supports(condition.params)
    return false
  })
  for (const plan of rules) {
    if (!conditionHolds(plan.conditions)) continue
    const rule = byId.get(plan.id)
    if (rule === undefined) continue
    const props = plan.props.filter((prop) => !skip.includes(`${plan.id}:${prop}`))
    if (props.length === 0) continue
    const targets = []
    for (const part of plan.parts) {
      let elements = []
      try { elements = [...document.querySelectorAll(part.base)] } catch { continue }
      for (const element of elements) targets.push([element, part.pseudo])
    }
    if (targets.length === 0) continue
    for (const prop of props) matched.push(`${plan.id}:${prop}`)
    // The whole rule first: most rules need none of their importance, and one
    // style pass then decides all of their declarations.
    if (props.length > 1 && attempt(rule, targets, props)) {
      for (const prop of props) removable.push(`${plan.id}:${prop}`)
      continue
    }
    for (const prop of props) (attempt(rule, targets, [prop]) ? removable : needed).push(`${plan.id}:${prop}`)
  }
  return { removable, needed, matched }
}

/**
 * Compare the page under two stylesheets (step 3 above): every element's and
 * its ::before / ::after's computed value of each named property. Transitions
 * the swap starts are finished, so the values read are where each one lands.
 *
 * @returns the differences as `{ element, pseudo, prop }`, element as an index into `*`.
 */
function diffInPage({ sheet, original, candidate, props }) {
  const style = document.querySelector(sheet)
  const elements = [...document.querySelectorAll('*')]
  const settle = () => settleTransitions()
  const snapshot = () => {
    settle()
    return elements.map((element) => [null, '::before', '::after'].map((pseudo) => {
      const computed = getComputedStyle(element, pseudo)
      return props.map((prop) => computed.getPropertyValue(prop))
    }))
  }
  style.textContent = original
  const before = snapshot()
  style.textContent = candidate
  const after = snapshot()
  style.textContent = original
  settle()
  const differences = []
  elements.forEach((element, at) => {
    ;[null, '::before', '::after'].forEach((pseudo, slot) => {
      props.forEach((prop, index) => {
        if (before[at][slot][index] !== after[at][slot][index]) differences.push({ element: at, pseudo, prop, before: before[at][slot][index], after: after[at][slot][index] })
      })
    })
  })
  return differences
}

/**
 * The dropped declarations behind each difference: those whose rule matches the
 * element (with its pseudo-element) or one of its ancestors — a value is
 * inherited — and whose property governs the one that moved, or is a custom
 * property the moved one may read through `var()`.
 */
function culpritsInPage({ rules, dropped, differences }) {
  const elements = [...document.querySelectorAll('*')]
  const droppedSet = new Set(dropped)
  const suspects = rules.filter((plan) => plan.props.some((prop) => droppedSet.has(`${plan.id}:${prop}`)))
  const longhandsOf = new Map()
  const covers = (prop, longhand) => {
    if (prop === longhand || prop.startsWith('--')) return true
    if (!longhandsOf.has(prop)) {
      const probe = document.createElement('div').style
      probe.setProperty(prop, 'initial')
      longhandsOf.set(prop, new Set([...Array(probe.length)].map((_, at) => probe.item(at))))
    }
    return longhandsOf.get(prop).has(longhand)
  }
  const matches = (element, base) => { try { return element.matches(base) } catch { return false } }
  /** For one element and pseudo-element: the suspect rules that reach it. */
  const reaching = new Map()
  const reach = (index, pseudo) => {
    const id = `${index}${pseudo ?? ''}`
    if (reaching.has(id)) return reaching.get(id)
    const element = elements[index]
    const chain = []
    for (let node = element; node !== null; node = node.parentElement) chain.push(node)
    const found = suspects.filter((plan) => plan.parts.some((part) => (part.pseudo === pseudo && matches(element, part.base))
      || (part.pseudo === null && chain.some((node) => (node !== element || pseudo !== null) && matches(node, part.base)))))
    reaching.set(id, found)
    return found
  }
  const culprits = new Set()
  for (const difference of differences) {
    for (const plan of reach(difference.element, difference.pseudo)) {
      for (const prop of plan.props) {
        const key = `${plan.id}:${prop}`
        if (droppedSet.has(key) && covers(prop, difference.prop)) culprits.add(key)
      }
    }
  }
  return [...culprits]
}

/**
 * What stands in a declaration's place once its `!important` is gone (D9).
 *
 * The stylesheet is installed with that one declaration's importance already
 * dropped, so the value read here is the one the page falls back to. Every other
 * candidate for the same property — the element's own inline style, and each
 * rule of each stylesheet that matches the element and declares it — is then
 * taken away in turn: the value moves only where that candidate was the one in
 * force, so the answer comes from the browser's own cascade rather than from
 * cascade arithmetic written here. Each candidate is put back before the next.
 *
 * @returns `{ after, opponents }`: the value without the importance, and one
 *     entry per candidate that held it, `{ kind, owner }` — `kind` one of
 *     `inline`, `host-important`, `host-rule`, `another-skin-rule`.
 */
function opponentsInPage({ sheet, selector, prop, pseudo }) {
  const style = document.querySelector(sheet)
  let targets = []
  try { targets = [...document.querySelectorAll(selector)] } catch { return null }
  if (targets.length === 0) return null
  const names = window.longhandsOf(prop)
  const read = () => targets.map((element) => {
    const computed = getComputedStyle(element, pseudo ?? undefined)
    return names.map((name) => computed.getPropertyValue(name)).join('\u0001')
  }).join('\u0002')
  const after = read()
  const opponents = []
  const note = (kind, owner) => {
    if (opponents.some((entry) => entry.kind === kind && entry.owner === owner)) return
    opponents.push({ kind, owner })
  }
  /** Every rule of every sheet the page can read, grouping rules walked into. */
  const rulesOf = () => {
    const found = []
    const walk = (list, owner) => {
      for (const rule of list) {
        if (rule.cssRules !== undefined) walk(rule.cssRules, owner)
        else if (rule.style !== undefined) found.push({ rule, owner })
      }
    }
    for (const sheet of document.styleSheets) {
      let list = null
      try { list = sheet.cssRules } catch { continue }
      walk(list, sheet.ownerNode === style ? 'skin' : 'host')
    }
    return found
  }
  const declaredNames = (style) => [prop, ...names].filter((name) => style.getPropertyValue(name) !== '')
  const takeAway = (style, only) => {
    const wanted = only ?? declaredNames(style)
    const saved = wanted.filter((name) => style.getPropertyValue(name) !== '')
      .map((name) => [name, style.getPropertyValue(name), style.getPropertyPriority(name)])
    for (const [name] of saved) style.removeProperty(name)
    return () => { for (const [name, value, priority] of saved) style.setProperty(name, value, priority) }
  }
  const transitions = () => new Set(document.getAnimations().filter((animation) => animation instanceof CSSTransition))
  /**
   * Whether taking one candidate away is what the value was standing on: the
   * reading moves, or a transition starts — the audit counts both, since a
   * declaration's weight can be the only thing holding a transitionable property
   * at its resolved value. The candidate goes back either way, and a transition
   * the trial started is cancelled.
   */
  const held = (take) => {
    const running = transitions()
    const restore = take()
    const moved = read() !== after
    const started = [...transitions()].filter((animation) => !running.has(animation))
    restore()
    for (const animation of started) animation.cancel()
    return moved || started.length > 0
  }
  for (const element of targets) {
    if (declaredNames(element.style).length === 0) continue
    if (held(() => takeAway(element.style))) note('inline', 'element')
  }
  for (const { rule, owner } of rulesOf()) {
    if (!targets.some((element) => { try { return element.matches(rule.selectorText) } catch { return false } })) continue
    // On the rule the audit is asking about, only the declaration under test has
    // lost its importance: what may still be holding the value there is another
    // declaration of the same property's names — a longhand written beside the
    // shorthand — so those are what get taken away, and the dropped shorthand is
    // left where the audit put it.
    const isTest = owner === 'skin' && rule.selectorText === selector
    const candidates = isTest ? declaredNames(rule.style).filter((name) => name !== prop) : declaredNames(rule.style)
    if (candidates.length === 0) continue
    const priority = rule.style.getPropertyPriority(prop)
    if (!held(() => takeAway(rule.style, candidates))) continue
    if (owner === 'skin') note('another-skin-rule', rule.selectorText)
    else note(priority === 'important' ? 'host-important' : 'host-rule', rule.selectorText)
  }
  return { after, opponents }
}

/**
 * The dead-selector sweep's one question, asked of the page as it stands: which
 * of these selectors match an element here. A selector the page cannot parse is
 * reported apart — the sweep never calls it dead, and a selector list of its
 * own is what a reader has to look at.
 */
function sweepInPage(selectors) {
  const matched = []
  const unparsed = []
  for (const selector of selectors) {
    let found = false
    try { found = document.querySelector(selector) !== null } catch { unparsed.push(selector); continue }
    if (found) matched.push(selector)
  }
  return { matched, unparsed }
}

/* ---------- one audit over several page states ---------- */

/**
 * An audit of one page: call `state(name)` once per page state, in order, then
 * `result()`.
 *
 * @param page - a Playwright page with the skin running.
 * @param reference - an earlier stylesheet the page's own must paint exactly
 *     like, state by state: a change that only takes `!important` away (or
 *     any other refactor) shows here as zero drift.
 */
async function createImportanceAudit(page, reference) {
  // The authored sheet the build recorded its verdicts against: the page runs a
  // finished sheet whose part selectors read host class names (D101), while the
  // ledger and the build's own check read the sources' spelling (D9).
  const authored = fs.readFileSync(path.join(ROOT, 'lib', 'audit', 'importance-sheet.css'), 'utf8')
  const original = authored
  // The page functions below share one helper, defined on the page's window.
  await page.evaluate(`(() => { ${SETTLE}\nwindow.settleTransitions = settleTransitions })()`)
  const plan = planImportance(original)
  const annotated = plan.annotated
  const { rules, selectors } = plan
  const tried = rules.filter((rule) => rule.keep === null)
  const props = [...new Set(rules.flatMap((rule) => rule.props))]
  // The drift check compares every property either sheet holds an `!important` on.
  const driftProps = reference === undefined ? [] : [...new Set([...props, ...planImportance(reference).rules.flatMap((rule) => rule.props)])]
  const drift = []
  const dropped = new Set()
  const needed = new Set()
  const matched = new Set()
  /** `"<rule id>:<property>"` → what that declaration beats where it was decided (D9). */
  const evidence = new Map()
  /** Selectors of the sheet a state matched an element with, and the ones the page could not parse. */
  const swept = new Set()
  const unparsed = new Set()
  const states = []
  const install = (text) => page.evaluate(([sheet, value]) => { document.querySelector(sheet).textContent = value }, [SHEET, text])
  /** The computed values that move when these declarations lose their importance. */
  const differencesWith = (keys) => page.evaluate(diffInPage, { sheet: SHEET, original: annotated, candidate: dropImportance(annotated, new Set(keys)), props })

  /**
   * The first dropped declaration, in the order they were dropped, whose drop
   * brings back one of these differences: the shortest prefix of the dropped
   * set that still shows one ends with it.
   */
  async function bisectCulprit(differences) {
    const order = [...dropped]
    const wanted = new Set(differences.map((item) => `${item.element}|${item.pseudo}|${item.prop}`))
    const shows = async (count) => (await differencesWith(order.slice(0, count))).some((item) => wanted.has(`${item.element}|${item.pseudo}|${item.prop}`))
    let low = 0
    let high = order.length
    while (high - low > 1) {
      const middle = (low + high) >> 1
      if (await shows(middle)) high = middle
      else low = middle
    }
    return order[high - 1]
  }

  /**
   * Audit the page as it stands now, under the given name.
   * @param only - rule ids to try in this state; every rule when absent.
   */
  async function state(name, only) {
    // The skin can mount its sheet anew between states; the audit's own text goes back in.
    const current = await page.evaluate((sheet) => document.querySelector(sheet).textContent, SHEET)
    if (current !== annotated && current !== original) {
      // The skin finishes its sheet again when the page meets host class
      // names (D101); the audit judges the authored sheet, so its own text
      // goes back in for the measurements that follow.
      await install(annotated)
    }
    if (reference !== undefined) {
      const moved = await page.evaluate(diffInPage, { sheet: SHEET, original: reference, candidate: original, props: driftProps })
      if (moved.length > 0) drift.push({ state: name, count: moved.length, first: moved.slice(0, 3) })
      await install(original)
    }
    let sentBack = 0
    for (let pass = 0; pass < 40 && dropped.size > 0; pass++) {
      const differences = await differencesWith([...dropped])
      if (differences.length === 0) break
      let culprits = await page.evaluate(culpritsInPage, { rules: tried, dropped: [...dropped], differences })
      // A value can also move through the layout — a container query, a size the
      // rule never names — with no matching rule to point at; the dropped set is
      // then halved until the one declaration that brings the difference is found.
      if (culprits.length === 0) culprits = [await bisectCulprit(differences)]
      for (const key of culprits) { dropped.delete(key); needed.add(key) }
      sentBack += culprits.length
    }
    await install(dropImportance(annotated, dropped))
    const rulesHere = only === undefined ? tried : tried.filter((rule) => only.includes(rule.id))
    const verdict = await page.evaluate(tryInPage, { sheet: SHEET, mark: MARK, rules: rulesHere, skip: [...dropped, ...needed] })
    await install(original)
    for (const key of verdict.matched) matched.add(key)
    for (const key of verdict.removable) dropped.add(key)
    for (const key of verdict.needed) needed.add(key)
    // What each declaration that has to keep its weight beats where it was
    // decided: the sheet goes in with that one importance dropped, the fall-back
    // value is read, and every candidate that held it is named (D9).
    for (const key of verdict.needed) {
      if (evidence.has(key)) continue
      const separatrix = key.lastIndexOf(':')
      const rule = rules.find((own) => own.id === Number(key.slice(0, separatrix)))
      if (rule === undefined) continue
      const prop = key.slice(separatrix + 1)
      await install(dropImportance(annotated, new Set([key])))
      for (const part of rule.parts) {
        const found = await page.evaluate(opponentsInPage, { sheet: SHEET, selector: part.base, prop, pseudo: part.pseudo })
        if (found === null) continue
        evidence.set(key, { ruleKey: rule.key, selector: rule.selector, prop, state: name, after: found.after, opponents: found.opponents })
        break
      }
      await install(original)
    }
    // The dead-selector sweep: ask this state about every selector no state has
    // matched yet, so a selector that never matches one costs one pass per state.
    const pending = [...selectors.keys()].filter((selector) => selectors.get(selector) === null && !swept.has(selector) && !unparsed.has(selector))
    if (pending.length > 0) {
      const found = await page.evaluate(sweepInPage, pending)
      for (const selector of found.matched) swept.add(selector)
      for (const selector of found.unparsed) unparsed.add(selector)
    }
    states.push({ name, removable: verdict.removable.length, needed: verdict.needed.length, sentBack })
  }

  /**
   * The rules that wait on a hovered element: each with its selectors as they
   * read with `:hover` taken out, which find the element to put the pointer on.
   * Hovering it hovers its ancestors too, so `A:hover B` is reached through B.
   * Without a reference these are the rules still undecided; with one, every
   * hover rule that held an `!important` in the reference, so each of those
   * states is compared too.
   */
  function hoverTargets() {
    const open = (rule) => rule.props.some((prop) => !dropped.has(`${rule.id}:${prop}`) && !needed.has(`${rule.id}:${prop}`))
    const unhover = (base) => selectorParser((selectors) => {
      selectors.walkPseudos((node) => { if (node.value.toLowerCase() === ':hover') node.remove() })
    }).processSync(base)
    const target = (rule) => ({ id: rule.id, selectors: rule.parts.filter((part) => /:hover/i.test(part.base)).map((part) => unhover(part.base)) })
    if (reference !== undefined) {
      const tryHere = new Set(tried.filter(open).map((rule) => rule.selector))
      return planImportance(reference).rules.filter((rule) => rule.keep === null && /:hover/i.test(rule.selector))
        .map((rule) => ({ ...target(rule), only: tried.filter((own) => own.selector === rule.selector && tryHere.has(own.selector)).map((own) => own.id) }))
    }
    return tried.filter((rule) => open(rule) && /:hover/i.test(rule.selector)).map((rule) => ({ ...target(rule), only: [rule.id] }))
  }

  /**
   * What the states decided: every `!important`, and why each kept one stays;
   * what each declaration that has to keep its weight beats; and the sweep's
   * tally — the selectors some state matched an element with, the ones none did,
   * the ones the page could not parse, and the ones the inventory already
   * excused.
   */
  function result() {
    const declarations = rules.flatMap((rule) => rule.props.map((prop) => {
      const key = `${rule.id}:${prop}`
      const verdict = rule.keep !== null ? rule.keep : dropped.has(key) ? 'removable' : needed.has(key) ? 'needed' : matched.has(key) ? 'needed' : 'unmatched'
      const beaten = evidence.get(key)
      return { key, ruleKey: rule.key, selector: rule.selector, prop, verdict, opponents: beaten === undefined ? [] : beaten.opponents }
    }))
    const excused = [...selectors].filter(([, keep]) => keep !== null)
    const dead = [...selectors].filter(([selector, keep]) => keep === null && !swept.has(selector) && !unparsed.has(selector)).map(([selector]) => selector)
    const sweep = {
      total: selectors.size,
      matched: swept.size,
      dead,
      unparsed: [...unparsed],
      excused: Object.fromEntries([...new Set(excused.map(([, keep]) => keep))].map((keep) => [keep, excused.filter(([, own]) => own === keep).length])),
    }
    return { states, declarations, drift, sheet: original, sweep, evidence: [...evidence].map(([key, value]) => ({ key, ...value })) }
  }

  return { state, hoverTargets, result }
}

export { createImportanceAudit, planImportance, dropImportance, ruleKey, ruleKeys, sweepParts, ROOT }
