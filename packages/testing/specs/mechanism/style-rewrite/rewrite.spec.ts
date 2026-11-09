/**
 * The sodium rewrite's mechanism (D78): a rule is rewritten where it stands and
 * written back exactly; a selector the sheet refuses leaves the sheet as its
 * owner wrote it; a rule another writer changed is handed back; the flow-child
 * mark stands on every child through every change; and the table's flow rewrite
 * selects the same elements at the same specificity as the host's own rules.
 *
 * @capability style-rewrite
 * @features engine, sodium
 * @risk With the switch on, a flow item that should collapse keeps its height or its gap, a filled one stays collapsed while the host reads the layout and the conversation's position slides back, the running line's divider shows at the wrong moment, or a rule loses to one it used to beat.
 */
import { afterEach, expect, test } from 'vitest'
import { CHAT_FLOW_SLOT_SELECTOR, CHAT_GROUP_PART_ATTRIBUTE, CHAT_GROUP_PART_RESPONSE, CHAT_NODE_SELECTOR, CHAT_RUNNING_SELECTOR, CHAT_STEERING_BATCH_SELECTOR, FLOW_BLOCK_SELECTOR, FLOW_KIND_ATTRIBUTE, PENDING_STEERING_SELECTOR, SUBMISSION_ECHO_SELECTOR, TURN_PROCESS_ROW_KIND } from '@dsh-claude-style/contracts/dom'
import { applyRewrite, planRewrite, restoreRewrite } from '@dsh-claude-style/engine/sheet-rewrite'
import { SODIUM_MEMBERS, keepFlowChildMark } from '@dsh-claude-style/client/pure'
import { hostElement } from '../../fixtures/host-markup'

const settle = () => new Promise(resolve => setTimeout(resolve, 0))
const CHILD_MARK = 'data-test-child'
/** The host chat module's hashed classes stand in as these. */
const ITEM = 'hx_flowItem'
const COLUMN = 'hx_column'
const OLDER = 'hx_older'
const RUNNING = 'hx_running'
const TEXT_INTERACTION = 'hx_textInteraction'
/** The host's own test of an empty flow item, as its sheet writes it. */
const EMPTY = `.${ITEM}:is(:empty, :has(> ${CHAT_NODE_SELECTOR}:empty))`

const cleanups: (() => void)[] = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  document.body.replaceChildren()
})

function sheetOf(text: string) {
  const style = document.createElement('style')
  style.setAttribute('data-test-sheet', '')
  style.textContent = text
  document.head.append(style)
  cleanups.push(() => style.remove())
  return style.sheet!
}

type ItemKind = 'empty' | 'empty-node' | 'node' | 'text'

/** A flow item, as the host creates it a flow block: empty, holding a chat node (empty or with content), or holding text of its own. */
function item(kind: ItemKind, attributes: Record<string, string> = {}) {
  const element = hostElement(FLOW_BLOCK_SELECTOR, 'key')
  element.className = ITEM
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value)
  if (kind === 'text') element.append('words')
  if (kind === 'empty-node' || kind === 'node') {
    const node = hostElement(CHAT_NODE_SELECTOR)
    if (kind === 'node') node.append(document.createElement('p'))
    element.append(node)
  }
  return element
}

/** The host's running line: not a flow item, and the last child of the flow while a turn is live. */
function runningLine() {
  const running = hostElement(CHAT_RUNNING_SELECTOR)
  running.className = RUNNING
  running.append('working')
  return running
}

/** A user bubble the host mounts before the transcript takes the message in. */
function bubble(selector: string) {
  const element = hostElement(selector)
  element.append('words')
  return element
}

/** A steering row the host admits under one claim: its node holds the batch's first row. */
function steeringItem() {
  const element = item('node', { [FLOW_KIND_ATTRIBUTE]: 'steering' })
  const batch = document.createElement('div')
  batch.setAttribute(CHAT_STEERING_BATCH_SELECTOR.slice(1, -1), 'start')
  element.firstElementChild!.append(batch)
  return element
}

/**
 * A chat column after older turns, its flow slot holding every kind of child the
 * host's rules tell apart and ending on the running line, beside a process
 * group's own item list that none of the flow rules spaces. The column holds the
 * host's text-interaction surface too, and the column's gap rule leaves it out.
 */
function conversation() {
  const column = document.createElement('div')
  column.className = COLUMN
  const older = document.createElement('div')
  older.className = OLDER
  const surface = document.createElement('div')
  surface.className = TEXT_INTERACTION
  const slot = hostElement(CHAT_FLOW_SLOT_SELECTOR)
  slot.append(
    item('node'),
    item('empty'),
    item('empty-node'),
    item('text', { [CHAT_GROUP_PART_ATTRIBUTE]: CHAT_GROUP_PART_RESPONSE }),
    item('node'),
    item('node', { [FLOW_KIND_ATTRIBUTE]: TURN_PROCESS_ROW_KIND }),
    item('node', { [FLOW_KIND_ATTRIBUTE]: 'assistant-step' }),
    steeringItem(),
    item('node', { hidden: '' }),
    bubble(SUBMISSION_ECHO_SELECTOR),
    bubble(PENDING_STEERING_SELECTOR),
    runningLine(),
  )
  column.append(older, surface, slot)
  const process = document.createElement('div')
  process.append(item('node'), item('empty-node'), item('node'), item('empty'))
  document.body.append(column, process)
  return { column, slot, process }
}

function expectChildrenMarked() {
  for (const container of document.querySelectorAll(`.${COLUMN}, ${CHAT_FLOW_SLOT_SELECTOR}`)) {
    for (const child of container.children) expect(child.hasAttribute(CHILD_MARK)).toBe(true)
  }
}

test('a rewritten rule keeps its place, and writing it back restores the sheet as it was', () => {
  const sheet = sheetOf('.a { color: red } @media (min-width: 1px) { .b:hover { color: blue } } .c { color: green }')
  const before = [...sheet.cssRules].map(rule => rule.cssText)
  const shape = { rewrite: (selector: string) => selector === '.b:hover' ? { selector: '.b.x', captured: { name: 'b' } } : null }
  const planned = planRewrite(sheet, shape)
  expect(planned.map(entry => [entry.original, entry.rewritten, entry.captured])).toEqual([['.b:hover', '.b.x', { name: 'b' }]])
  const rewritten = applyRewrite(planned)
  expect([...sheet.cssRules].map(rule => rule.cssText)).toEqual([before[0], '@media (min-width: 1px) {\n  .b.x { color: blue; }\n}', before[2]])
  expect(planRewrite(sheet, shape, new Set(rewritten.map(entry => entry.rule)))).toEqual([])
  restoreRewrite(rewritten)
  expect([...sheet.cssRules].map(rule => rule.cssText)).toEqual(before)
})

test('a selector the sheet refuses is an error, and the rules written before it go back', () => {
  const sheet = sheetOf('.a { color: red } .b { color: blue }')
  const before = [...sheet.cssRules].map(rule => rule.cssText)
  const shape = {
    rewrite: (selector: string) => selector === '.b' ? { selector: '.b[[', captured: {} } : { selector: '.a.x', captured: {} },
  }
  expect(() => applyRewrite(planRewrite(sheet, shape))).toThrow()
  expect([...sheet.cssRules].map(rule => rule.cssText)).toEqual(before)
})

test('a rule another writer changed since the rewrite stays theirs, and is handed back', () => {
  const sheet = sheetOf('.a { color: red }')
  const rewritten = applyRewrite(planRewrite(sheet, { rewrite: () => ({ selector: '.a.x', captured: {} }) }))
  const rule = sheet.cssRules[0] as CSSStyleRule
  rule.selectorText = '.a.y'
  expect(restoreRewrite(rewritten)).toEqual([expect.objectContaining({ rewritten: '.a.x' })])
  expect(rule.selectorText).toBe('.a.y')
})

test('the flow-child mark stands on every child of the flow\'s containers through every change', async () => {
  const { slot, process } = conversation()
  cleanups.push(keepFlowChildMark([COLUMN], CHILD_MARK))
  expectChildrenMarked()
  slot.prepend(item('empty'))
  slot.append(item('node'))
  process.append(item('node'))
  await settle()
  expectChildrenMarked()
  const later = document.createElement('section')
  const column = document.createElement('div')
  column.className = COLUMN
  column.append(item('empty'), item('node'))
  later.append(column)
  document.body.append(later)
  await settle()
  expectChildrenMarked()
  expect(process.querySelectorAll(`[${CHILD_MARK}]`).length).toBe(0)
})

test('stopping the keeper takes the mark off', () => {
  conversation()
  const stop = keepFlowChildMark([COLUMN], CHILD_MARK)
  expect(document.querySelectorAll(`[${CHILD_MARK}]`).length).toBeGreaterThan(0)
  stop()
  expect(document.querySelectorAll(`[${CHILD_MARK}]`).length).toBe(0)
})

/**
 * The host chat module's flow rules as its sheet writes them, with the stand-in
 * classes.
 */
const VISIBLE = `:not([hidden]):not(${EMPTY})`
/** The visible item as the column's rule names it: the surface stands out of it. */
const SURFACE_VISIBLE = `:not([hidden]):not(.${TEXT_INTERACTION}):not(${EMPTY})`
const NOT_RUNNING = `:not(.${RUNNING})`
const NOT_BATCH = `:not(:has(> ${CHAT_NODE_SELECTOR} > ${CHAT_STEERING_BATCH_SELECTOR}))`
const NOT_OPENING = `:not(${SUBMISSION_ECHO_SELECTOR}, ${PENDING_STEERING_SELECTOR})`
const SCOPE = `:is(.${COLUMN}, ${CHAT_FLOW_SLOT_SELECTOR})`
/** The rules as the host writes them. */
const HOST_RULES = [
  `${SCOPE} > ${SURFACE_VISIBLE} ~ ${SURFACE_VISIBLE}, .${COLUMN} > .${OLDER} + ${CHAT_FLOW_SLOT_SELECTOR} > ${SURFACE_VISIBLE} { margin-top: var(--gap, 6px) }`,
  `.${ITEM}[${CHAT_GROUP_PART_ATTRIBUTE}="${CHAT_GROUP_PART_RESPONSE}"], ${SCOPE} > [${CHAT_GROUP_PART_ATTRIBUTE}="${CHAT_GROUP_PART_RESPONSE}"]:not([hidden]):not(:empty) + ${VISIBLE}${NOT_RUNNING}${NOT_BATCH} { --gap: 12px }`,
  `.${ITEM}[${FLOW_KIND_ATTRIBUTE}="${TURN_PROCESS_ROW_KIND}"], ${SCOPE} > [${FLOW_KIND_ATTRIBUTE}="${TURN_PROCESS_ROW_KIND}"]:not(:empty, :has(> ${CHAT_NODE_SELECTOR}:empty)) + ${VISIBLE}${NOT_RUNNING}${NOT_BATCH}, ${SCOPE} > [${FLOW_KIND_ATTRIBUTE}="${TURN_PROCESS_ROW_KIND}"] + ${VISIBLE}${NOT_RUNNING}${NOT_OPENING}${NOT_BATCH} { --gap: 16px }`,
  `${EMPTY} { height: 0px }`,
]
/** The host rules whose subject is the visible item, the compound the browser cannot bucket: the ones the table spreads. */
const SPREAD = HOST_RULES.filter(rule => rule.includes(VISIBLE) || rule.includes(SURFACE_VISIBLE))

/**
 * The table's chat flow entry, rewriting and keeping the mark on a sheet holding
 * the host rules.
 *
 * @param rules - the host's rules, in the shape the sheet carries.
 */
function rewriteHostRules(rules: readonly string[] = HOST_RULES) {
  const adapter = SODIUM_MEMBERS.flatMap(member => member.adapters).find(entry => entry.id === 'chat-flow')!
  const sheet = sheetOf(rules.join('\n'))
  const planned = planRewrite(sheet, adapter)
  const roles = new Map<string, string[]>()
  for (const entry of planned) for (const [role, name] of Object.entries(entry.captured)) roles.set(role, [name])
  cleanups.push(adapter.maintain(roles))
  return applyRewrite(planned)
}

/** Each rewritten rule's elements beside the elements the host rule it stands for selects. */
function selections(rewritten: ReturnType<typeof rewriteHostRules>) {
  return rewritten.map(entry => ({ original: [...document.querySelectorAll(entry.original)], rewritten: [...document.querySelectorAll(entry.rewritten)] }))
}

test('the table rewrites every host gap rule to select the same elements, and leaves the collapse rule as the host wrote it', () => {
  conversation()
  const rewritten = rewriteHostRules()
  expect(rewritten.length).toBe(SPREAD.length)
  expect(rewritten.map(entry => entry.original)).not.toContain(EMPTY)
  for (const { original, rewritten: now } of selections(rewritten)) {
    expect(original.length).toBeGreaterThan(0)
    expect(now).toEqual(original)
  }
})

test('a turn ending in one task is read by the rewritten rules as the host rules read it, before any observer runs', () => {
  const { slot } = conversation()
  const rewritten = rewriteHostRules()
  const [, empty, emptyNode, , full] = [...slot.children]
  // The host fills and empties items, takes the running line down and puts the
  // turn's last rows in, then reads the layout, all in one task.
  empty.append('arrived')
  emptyNode.firstElementChild!.append('streamed')
  full.firstElementChild!.replaceChildren()
  slot.lastElementChild!.remove()
  slot.append(item('node'), bubble(SUBMISSION_ECHO_SELECTOR), item('text'), runningLine())
  for (const { original, rewritten: now } of selections(rewritten)) expect(now).toEqual(original)
})

test('a child of a kind the host writes no key on is spaced once the keeper\'s observer has run', async () => {
  const { slot } = conversation()
  const rewritten = rewriteHostRules()
  const stranger = document.createElement('section')
  stranger.append('a plugin\'s row')
  slot.insertBefore(stranger, slot.lastElementChild)
  await settle()
  for (const { original, rewritten: now } of selections(rewritten)) expect(now).toEqual(original)
  expect(selections(rewritten).some(({ rewritten: now }) => now.includes(stranger))).toBe(true)
})

test('every rewritten flow rule weighs what the host rule weighs', () => {
  conversation()
  const verdicts = rewriteHostRules().flatMap((entry) => [...document.querySelectorAll(entry.rewritten)].map((target) => {
    // Equal specificity: whichever of the two stands later wins, in either order.
    const first = sheetOf(`${entry.original} { --weigh: original } ${entry.rewritten} { --weigh: rewritten }`)
    const rewrittenLater = getComputedStyle(target).getPropertyValue('--weigh')
    first.ownerNode!.remove()
    const second = sheetOf(`${entry.rewritten} { --weigh: rewritten } ${entry.original} { --weigh: original }`)
    const originalLater = getComputedStyle(target).getPropertyValue('--weigh')
    second.ownerNode!.remove()
    return { rule: entry.original.slice(0, 60), target: target.outerHTML.slice(0, 80), rewrittenLater, originalLater }
  }))
  expect(verdicts.filter(verdict => verdict.rewrittenLater !== 'rewritten' || verdict.originalLater !== 'original')).toEqual([])
})
