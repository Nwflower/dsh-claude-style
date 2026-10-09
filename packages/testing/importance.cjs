/**
 * importance.cjs — which of the skin's `!important` declarations the page needs (D51).
 *
 * The host's own styles carry a handful of `!important` and sit in no cascade
 * layer, so the skin's selectors — every one starting at
 * `body[data-dsh-claude-style]` — already outweigh the host's single-class rules
 * on specificity. A skin `!important` is needed where it beats a host
 * `!important`, an inline style, or another skin rule; everywhere else it only
 * adds weight. Which is which is decided on the real page, never by reading:
 *
 *   1. The page's stylesheet is parsed (PostCSS) and every style rule carries a
 *      marker declaration, so the page's CSSOM rules map back to the parsed ones.
 *   2. In each page state, the declarations not yet decided are tried in source
 *      order: the importance is dropped through the CSSOM and the computed value
 *      of every longhand on every matched element (and pseudo-element) is compared
 *      with the value before. Unchanged — and no transition started — means the
 *      `!important` is not needed here, and it stays dropped while the next one is
 *      tried, so the set grows consistently. Changed means it is needed.
 *   3. Before a state's trial, the set dropped in the earlier states is checked
 *      whole: the stylesheet with the set dropped against the original, every
 *      element's computed value of every property any `!important` names. A
 *      difference sends the declarations behind it back to "needed" — the ones
 *      whose rule reaches the element or an ancestor, or, when a value moved
 *      through the layout with no such rule, the one a halving search finds.
 *
 * Every read happens on a page held still: transitions and finite animations
 * landed, endless ones stopped at their first frame.
 *
 * A declaration that never matched an element is kept: no state showed what it
 * holds. So is one in theme/third-party.css, which answers other plugins' styles
 * the scratch host does not install, one whose property the rule declares
 * twice, and one whose rule stands under a conditional at-rule the page is not
 * in — dropping its importance cannot change a value the condition already
 * keeps out of the cascade.
 *
 * Run as the lane's scenario: `node packages/testing/e2e.cjs --scenario importance`.
 * With `DSH_IMPORTANCE_REFERENCE=<stylesheet>` every state is also compared, element
 * by element, with that earlier stylesheet: the proof that a cleanup changed nothing.
 */
'use strict'
const fs = require('node:fs')
const path = require('node:path')
const postcss = require('postcss')
const selectorParser = require('postcss-selector-parser')
const { minifyCss } = require('../../scripts/shared/minify-css.cjs')

const ROOT = path.resolve(__dirname, '..', '..')
/** The marker declaration carrying each rule's index into the page's CSSOM. */
const MARK = '--dsh-audit-rule'
/** The skin's stylesheet, by the tag it wears (D33). */
const SHEET = 'style[data-plugin-css="dsh-claude-style/client.css"]'
/** Pseudo-elements the page can read a computed style for. */
const READABLE_PSEUDO = new Set(['::before', '::after', '::marker', '::placeholder'])

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

/** One rule as text that survives the build: its selector and its declarations. */
function ruleKey(rule) {
  return `${rule.selector.replace(/\s+/g, ' ')}{${rule.nodes.filter((node) => node.type === 'decl').map((node) => `${node.prop}:${node.value}${node.important ? '!' : ''}`).join(';')}}`
}

/**
 * The page's stylesheet, marked, and every rule holding an `!important`.
 *
 * @param text - the stylesheet the page runs.
 * @returns `{ annotated, rules }`; a rule is `{ id, selector, parts, props, keep }`,
 *     `parts` its selector list split into `{ base, pseudo }`, `keep` why its
 *     declarations are kept untried (or null).
 */
function planImportance(text) {
  const thirdParty = ruleKeys(path.join(ROOT, 'packages', 'client', 'src', 'theme', 'third-party.css'))
  const root = postcss.parse(text)
  const rules = []
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
    else if (rule.parent.type === 'rule') keep = 'nested'
    else if (props.length !== important.length) keep = 'declared twice'
    else if (parts.every((part) => part.pseudo !== null && !READABLE_PSEUDO.has(part.pseudo))) keep = 'unreadable pseudo-element'
    rules.push({ id, selector: rule.selector, parts: parts.filter((part) => part.pseudo === null || READABLE_PSEUDO.has(part.pseudo)), props, keep, conditions })
  })
  return { annotated: root.toString(), rules }
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
  const longhandsOf = new Map()
  const longhands = (prop) => {
    if (prop.startsWith('--')) return [prop]
    if (!longhandsOf.has(prop)) {
      const probe = document.createElement('div').style
      probe.setProperty(prop, 'initial')
      const names = [...Array(probe.length)].map((_, at) => probe.item(at))
      longhandsOf.set(prop, names.length === 0 ? [prop] : names)
    }
    return longhandsOf.get(prop)
  }
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
  const original = await page.evaluate((sheet) => document.querySelector(sheet).textContent, SHEET)
  // The page functions below share one helper, defined on the page's window.
  await page.evaluate(`(() => { ${SETTLE}\nwindow.settleTransitions = settleTransitions })()`)
  const { annotated, rules } = planImportance(original)
  const tried = rules.filter((rule) => rule.keep === null)
  const props = [...new Set(rules.flatMap((rule) => rule.props))]
  // The drift check compares every property either sheet holds an `!important` on.
  const driftProps = reference === undefined ? [] : [...new Set([...props, ...planImportance(reference).rules.flatMap((rule) => rule.props)])]
  const drift = []
  const dropped = new Set()
  const needed = new Set()
  const matched = new Set()
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
    if (current !== annotated && current !== original) throw new Error(`importance: the skin's stylesheet changed during the audit (state ${name})`)
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

  /** What the states decided: every `!important`, and why each kept one stays. */
  function result() {
    const declarations = rules.flatMap((rule) => rule.props.map((prop) => {
      const key = `${rule.id}:${prop}`
      const verdict = rule.keep !== null ? rule.keep : dropped.has(key) ? 'removable' : needed.has(key) ? 'needed' : matched.has(key) ? 'needed' : 'unmatched'
      return { key, selector: rule.selector, prop, verdict }
    }))
    return { states, declarations, drift, sheet: original }
  }

  return { state, hoverTargets, result }
}

/* ---------- the lane's scenario ---------- */

/** The skin's own triggers, each opening the surface its rules paint. */
const SURFACES = [
  ['model picker', '.dsh-claude-model-btn'],
  ['effort picker', '.dsh-claude-effort-btn'],
  ['permission picker', '.dsh-claude-perm-btn'],
  ['account card', '.dsh-claude-account-btn'],
  ['search panel', '.dsh-claude-search-trigger'],
]

/**
 * Where on the page an element can take the pointer: the centre of the first
 * visible match that is the topmost thing at its own centre.
 */
function pointAtInPage(selectors) {
  for (const selector of selectors) {
    let elements = []
    try { elements = [...document.querySelectorAll(selector)] } catch { continue }
    for (const element of elements) {
      const box = element.getBoundingClientRect()
      if (box.width < 2 || box.height < 2 || box.bottom < 0 || box.top > innerHeight) continue
      const x = box.left + box.width / 2
      const y = box.top + box.height / 2
      const top = document.elementFromPoint(x, y)
      if (top !== null && (top === element || element.contains(top))) return { x, y }
    }
  }
  return null
}

/**
 * The lane's `importance` scenario (packages/testing/e2e.cjs): the skin's
 * `!important` declarations audited across the page states the scratch host
 * reaches — the empty page and a conversation, a draft in the composer, the
 * answer streaming, each of the skin's popovers and a host menu open, the dark
 * flip, the DeepSeek brand, the host's palette, and the pointer on every element
 * a `:hover` rule waits for. One the states show to change nothing fails it; the
 * full verdict is written to importance-verdicts.json.
 *
 * @param lane - the lane's `check`, `sendPrompt`, `waitForTurn` and its table of host marks.
 */
function importanceScenario(lane) {
  /** Type a draft into the composer without sending it, audit, and clear it again. */
  const withDraft = async (page, audit, name) => {
    await page.click('[data-composer-input]')
    await page.keyboard.type('a draft that stays in the composer')
    await page.waitForTimeout(300)
    await audit.state(name)
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(300)
  }
  /** Open what each visible trigger opens, audit, and close it with Escape. */
  const withOpen = async (page, audit, name, selector, limit = 1) => {
    const triggers = page.locator(selector).filter({ visible: true })
    const count = Math.min(await triggers.count(), limit)
    for (let at = 0; at < count; at++) {
      await triggers.nth(at).click()
      await page.waitForTimeout(500)
      await audit.state(count === 1 ? name : `${name} ${at + 1}`)
      await page.keyboard.press('Escape')
      await page.mouse.move(1, 1)
      await page.waitForTimeout(400)
    }
  }
  /** The host's own menus and dialogs: every visible trigger the page offers. */
  const HOST_TRIGGERS = '[aria-haspopup="menu"]:not([class*="dsh-claude"]), button[aria-haspopup="dialog"]:not([class*="dsh-claude"])'
  /**
   * Set or remove a body attribute, then let the page answer it: the skin's
   * theme flip holds transitions off for the frames around a palette change, and
   * a state audited inside that window would read the hold, not the page.
   */
  const attribute = async (page, name, value) => {
    await page.evaluate(([key, to]) => {
      if (to === null) document.body.removeAttribute(key)
      else document.body.setAttribute(key, to)
    }, [name, value])
    await page.waitForTimeout(400)
  }

  return {
    script: 'inspect',
    prompt: 'look at the workspace',
    // A slow stream, so the second answer is still arriving while it is audited.
    delayMs: 400,
    async beforeSend(context) {
      const { page } = context
      const reference = process.env.DSH_IMPORTANCE_REFERENCE
      context.audit = await createImportanceAudit(page, reference === undefined ? undefined : fs.readFileSync(reference, 'utf8'))
      await context.audit.state('hero')
      await withDraft(page, context.audit, 'hero draft')
      await withOpen(page, context.audit, 'hero host surface', HOST_TRIGGERS, 6)
    },
    async afterTurn(context) {
      const { page, audit } = context
      await audit.state('conversation')
      await withDraft(page, audit, 'conversation draft')
      for (const [name, selector] of SURFACES) await withOpen(page, audit, name, selector)
      await withOpen(page, audit, 'host surface', HOST_TRIGGERS, 8)
      // A second turn: audited while its answer streams in (once the skin's pass
      // has marked the stop button), then with two turns in the rail.
      const second = lane.sendPrompt(page, 'look again')
      await page.waitForSelector(lane.host.streaming, { state: 'attached', timeout: 20000 })
      await page.waitForTimeout(150)
      await audit.state('streaming')
      await second
      await lane.waitForTurn(page)
      const rail = await page.evaluate(pointAtInPage, ['.dsh-claude-turn-rail'])
      if (rail !== null) {
        await page.mouse.move(rail.x, rail.y)
        await page.waitForTimeout(400)
        await audit.state('turn navigator')
        await page.mouse.move(1, 1)
        await page.waitForTimeout(400)
      }
      for (const target of audit.hoverTargets()) {
        const point = await page.evaluate(pointAtInPage, target.selectors)
        if (point === null) continue
        await page.mouse.move(point.x, point.y)
        await page.waitForTimeout(200)
        await audit.state(`hover ${target.id}`, target.only)
        await page.mouse.move(1, 1)
        await page.waitForTimeout(200)
      }
      // An image waiting in the composer: the attachment rail and its card.
      const picker = page.locator('input[type="file"]').first()
      if (await picker.count() > 0) {
        await picker.setInputFiles(path.join(ROOT, 'packages', 'assets', 'src', 'mascot', 'crab', 'idle.png'))
        await page.waitForTimeout(800)
        await audit.state('attachment')
      }
      // The document attributes the stylesheet switches on, each as the page
      // itself carries it: the dark flip, the DeepSeek brand, and the host's own
      // palette and typefaces.
      await attribute(page, 'data-ds-dark-theme', '')
      await audit.state('dark')
      await attribute(page, 'data-dsh-claude-brand', 'deepseek')
      await audit.state('deepseek dark')
      await attribute(page, 'data-ds-dark-theme', null)
      await audit.state('deepseek light')
      await attribute(page, 'data-dsh-claude-brand', 'claude')
      await attribute(page, 'data-dsh-claude-palette', 'host')
      await attribute(page, 'data-dsh-claude-typeface', 'host')
      await audit.state('host palette')
      await attribute(page, 'data-dsh-claude-palette', 'claude')
      await attribute(page, 'data-dsh-claude-typeface', 'claude')
    },
    async assert({ session, audit, out }) {
      const { states, declarations, drift, sheet } = audit.result()
      fs.writeFileSync(path.join(out, 'importance-verdicts.json'), `${JSON.stringify({ states, declarations, drift }, null, 2)}\n`)
      // The stylesheet the verdicts number their rules in, for whoever acts on them.
      fs.writeFileSync(path.join(out, 'importance-sheet.css'), sheet)
      const count = (verdict) => declarations.filter((item) => item.verdict === verdict).length
      const idle = declarations.filter((item) => item.verdict === 'removable')
      const hovered = states.filter((item) => item.name.startsWith('hover ')).length
      const named = states.filter((item) => !item.name.startsWith('hover '))
      const checks = [
        lane.check('每个页面形态都审过', named.length >= 12, `${named.map((item) => `${item.name}: ${item.removable}/${item.needed}${item.sentBack === 0 ? '' : `/退回 ${item.sentBack}`}`).join('；')}；悬停 ${hovered} 处`),
        // A declaration the audit proved removable — one that matched an element
        // in a state and changed nothing there — is weight to drop. One that
        // never matched an element is not: the host element it dresses (a docked
        // panel, a scrollable table, the settings area) is outside the surfaces
        // this scenario walks, and no state could decide it.
        lane.check('没有多余的 !important', idle.length === 0, `${declarations.length} 处：需要 ${count('needed')}，多余 ${idle.length}${idle.length === 0 ? '' : `（${idle.slice(0, 3).map((item) => `${item.selector.replace(/\s+/g, ' ').slice(0, 70)} { ${item.prop} }`).join('；')}…）`}；另有 ${count('unmatched')} 处从未匹配到元素（本次页面形态未覆盖），${count('declared twice')} 处重复声明，${count('third-party')} 处属于第三方应答，${count('unreadable pseudo-element')} 处伪元素读不到计算值`),
        lane.check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
      if (process.env.DSH_IMPORTANCE_REFERENCE !== undefined) {
        checks.push(lane.check('与参照样式表画出的页面一致', drift.length === 0, drift.length === 0 ? `${states.length} 个状态逐元素比对` : drift.map((item) => `${item.state}: ${item.count} 处，如 ${JSON.stringify(item.first[0])}`).join('；')))
      }
      return checks
    },
  }
}

module.exports = { createImportanceAudit, importanceScenario, planImportance, dropImportance }
