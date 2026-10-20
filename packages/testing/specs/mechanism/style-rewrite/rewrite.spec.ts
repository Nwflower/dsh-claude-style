/**
 * The sodium rewrite's mechanism (D78): a rule is rewritten where it stands and
 * written back exactly; a selector the sheet refuses is an error that leaves the
 * sheet as its owner wrote it; a rule another writer changed since is left to
 * that writer and handed back; the flow-child mark stands on every child of the
 * flow's containers through every change; and the table's rewrite of the host's
 * flow rules selects the same elements as the rules themselves, at the same
 * specificity, as the browser's own cascade judges it — an item filled or
 * emptied included, in the very task that changed it.
 *
 * @capability style-rewrite
 * @features engine, sodium
 * @risk With the switch on, a flow item that should collapse keeps its height or its gap, a filled one stays collapsed while the host reads the layout and the conversation's position slides back, the running line's divider shows at the wrong moment, or a rule loses to one it used to beat.
 */
import { afterEach, expect, test } from 'vitest'
import { CHAT_FLOW_SLOT_SELECTOR, CHAT_GROUP_PART_ATTRIBUTE, CHAT_GROUP_PART_RESPONSE, CHAT_NODE_SELECTOR, CHAT_RUNNING_SELECTOR, FLOW_BLOCK_SELECTOR, FLOW_KIND_ATTRIBUTE, PENDING_STEERING_SELECTOR, SUBMISSION_ECHO_SELECTOR, TURN_PROCESS_ANSWER_ATTRIBUTE, TURN_PROCESS_ROW_KIND } from '@dsh-claude-style/contracts/dom'
import { keepFlowChildMark } from '@dsh-claude-style/engine/flow-items'
import { applyRewrite, planRewrite, restoreRewrite } from '@dsh-claude-style/engine/sheet-rewrite'
import { SODIUM_MEMBERS } from '@dsh-claude-style/client/pure'
import { hostElement } from '../../fixtures/host-markup'

const settle = () => new Promise(resolve => setTimeout(resolve, 0))
const CHILD_MARK = 'data-test-child'
/** The host chat module's hashed classes stand in as these. */
const ITEM = 'hx_flowItem'
const COLUMN = 'hx_column'
const OLDER = 'hx_older'
const RUNNING = 'hx_running'
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

/**
 * A chat column after older turns, its flow slot holding every kind of child
 * the host's rules tell apart and ending on the running line, and beside it a
 * process group's own list of items, which none of the flow rules spaces.
 */
function conversation() {
  const column = document.createElement('div')
  column.className = COLUMN
  const older = document.createElement('div')
  older.className = OLDER
  const slot = hostElement(CHAT_FLOW_SLOT_SELECTOR)
  slot.append(
    item('node'),
    item('empty'),
    item('empty-node'),
    item('text', { [CHAT_GROUP_PART_ATTRIBUTE]: CHAT_GROUP_PART_RESPONSE }),
    item('node'),
    item('node', { [FLOW_KIND_ATTRIBUTE]: TURN_PROCESS_ROW_KIND }),
    item('node', { [TURN_PROCESS_ANSWER_ATTRIBUTE]: '' }),
    item('node', { hidden: '' }),
    bubble(SUBMISSION_ECHO_SELECTOR),
    bubble(PENDING_STEERING_SELECTOR),
    runningLine(),
  )
  column.append(older, slot)
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

/** The host chat module's flow rules as its sheet writes them, with the stand-in classes. */
const VISIBLE = `:not([hidden]):not(${EMPTY})`
const SCOPE = `:is(.${COLUMN}, ${CHAT_FLOW_SLOT_SELECTOR})`
const HOST_RULES = [
  `${SCOPE} > ${VISIBLE} ~ ${VISIBLE}, .${COLUMN}:has(> .${OLDER}) > ${CHAT_FLOW_SLOT_SELECTOR} > ${VISIBLE} { margin-top: var(--gap, 6px) }`,
  `.${ITEM}[${CHAT_GROUP_PART_ATTRIBUTE}="${CHAT_GROUP_PART_RESPONSE}"], ${SCOPE} > [${CHAT_GROUP_PART_ATTRIBUTE}="${CHAT_GROUP_PART_RESPONSE}"]:not([hidden]):not(:empty) + ${VISIBLE}:not(.${RUNNING}) { --gap: 12px }`,
  `.${ITEM}[${FLOW_KIND_ATTRIBUTE}="${TURN_PROCESS_ROW_KIND}"], .${ITEM}[${TURN_PROCESS_ANSWER_ATTRIBUTE}], ${SCOPE} > [${FLOW_KIND_ATTRIBUTE}="${TURN_PROCESS_ROW_KIND}"] + ${VISIBLE}:not(.${RUNNING}) { --gap: 16px }`,
  `${EMPTY} { height: 0px }`,
]

/** The host rules whose subject is the visible item, the compound the browser cannot bucket: the ones the table spreads. */
const SPREAD = HOST_RULES.filter(rule => rule.includes(VISIBLE))

/** The table's chat flow entry, rewriting and keeping the mark on a sheet holding the host rules. */
function rewriteHostRules() {
  const adapter = SODIUM_MEMBERS.flatMap(member => member.adapters).find(entry => entry.id === 'chat-flow')!
  const sheet = sheetOf(HOST_RULES.join('\n'))
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
  // The host fills and empties items, takes the running line down and puts
  // the turn's last rows in, then reads the layout, all in one task: the
  // rewritten rules have to agree at that moment.
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
