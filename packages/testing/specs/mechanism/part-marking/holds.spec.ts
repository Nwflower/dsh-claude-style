/**
 * The part walk turns the host's hashed class names into stable part marks and
 * answers the structural relations a stylesheet asks (`A:has(B)`) as one hold
 * mark on the holder, from the same walk (D9); the class names come from the
 * engine's own tables, so a host rename is one table line.
 *
 * @capability part-marking
 * @features engine
 * @risk After the host re-renders, a header keeps a hold mark for a tab strip it lost (or never gains it), so the skin's styling of the header, the sidebar column or the account row is wrong until a reload.
 */
import { expect, test } from 'vitest'
import { installParts } from '@dsh-claude-style/engine/parts'
import { holdRelations } from '@dsh-claude-style/engine/parts-table'
import { COMPOSER_CARD_SELECTOR, CONVERSATION_HEADER_SLOT_SELECTOR, CONVERSATION_SCROLL_SELECTOR, PHASE_ATTRIBUTE, ROOT_SLOT_SELECTOR, SIDEBAR_SLOT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { partRegion } from '../../fixtures/part-region'
import { hostElement } from '../../fixtures/host-markup'
import { pageCleanups } from '../../fixtures/page'
import { HOLDS_ATTR, PART_ATTR, TEST_PARTS } from '../../fixtures/vocabulary'

const settle = () => new Promise(resolve => setTimeout(resolve, 0))
const cleanups = pageCleanups()

/** One region of the host's tables, by the selector it is walked within. */
const region = (within: string) => partRegion(within, TEST_PARTS)

/** A hold word the relations table answers. */
function hold(name: string) {
  if (!holdRelations(TEST_PARTS).some(relation => relation.name === name)) throw new Error(`no hold relation "${name}"`)
  return name
}

const holds = (element: Element | null) => element === null ? null : element.getAttribute(HOLDS_ATTR)
const marked = (part: string) => document.querySelector(`[${PART_ATTR}~="${part}"]`)
const mount = (...nodes: Node[]) => document.body.append(...nodes)
const install = () => cleanups.push(installParts(TEST_PARTS))
/** The slot anchor a region is walked within, holding its content. */
const slot = (selector: string, ...children: Node[]) => {
  const element = hostElement(selector)
  element.append(...children)
  return element
}

test('a header holding the tab strip reads the mark, and loses it with the strip', async () => {
  const header = region(CONVERSATION_HEADER_SLOT_SELECTOR)
  mount(slot(CONVERSATION_HEADER_SLOT_SELECTOR, header.box('header', header.box('titleRow'), header.box('tabs'))))
  install()
  const bar = marked(header.part('header'))
  expect(holds(bar)).toBe(hold('view-tabs'))
  expect(marked(header.part('tabs'))?.getAttribute(PART_ATTR)).toBe(header.part('tabs'))
  marked(header.part('tabs'))!.remove()
  await settle()
  expect(holds(bar)).toBeNull()
})

test('a hold as its own child counts the direct child alone', async () => {
  const frame = region(ROOT_SLOT_SELECTOR)
  mount(slot(ROOT_SLOT_SELECTOR, frame.box('frame', frame.box('sidebarCol'), frame.box('centerCol'))))
  install()
  const root = marked(frame.part('frame'))
  expect(holds(root)).toBe(hold('sidebar-column'))
  // The same column one box deeper is not the frame's own child, so the rule
  // that reads `A:has(> B)` stays quiet.
  const column = marked(frame.part('sidebarCol'))!
  const wrapper = document.createElement('div')
  column.parentElement!.append(wrapper)
  wrapper.append(column)
  await settle()
  expect(holds(root)).toBeNull()
})

test('an unnamed wrapper takes the mark for what it holds, the scope anchor does not', async () => {
  const conversation = region(CONVERSATION_SCROLL_SELECTOR)
  const seat = document.createElement('div')
  seat.append(conversation.box('headline', conversation.box('fishHitbox')))
  const tray = document.createElement('div')
  tray.append(hostElement(COMPOSER_CARD_SELECTOR))
  mount(slot(CONVERSATION_SCROLL_SELECTOR, conversation.box('composerHero', seat, conversation.box('composerStack', tray))))
  install()
  expect(holds(seat)).toBe(hold('hero-headline'))
  expect(holds(marked(conversation.part('composerHero')))).toBeNull()
  expect(holds(marked(conversation.part('headline')))).toBe(hold('hero-mark'))
  expect(holds(tray)).toBe(hold('composer-card'))
  expect(holds(marked(conversation.part('composerStack')))).toBeNull()
  expect(holds(document.querySelector(COMPOSER_CARD_SELECTOR))).toBeNull()
})

test('a holder that takes its attribute after the node it holds still marks it', async () => {
  const phase = document.createElement('div')
  phase.append(hostElement(CONVERSATION_SCROLL_SELECTOR))
  mount(phase)
  install()
  expect(holds(phase)).toBeNull()
  phase.setAttribute(PHASE_ATTRIBUTE, 'active')
  await settle()
  expect(holds(phase)).toBe(hold('conversation-scroll'))
})

test('a dialog holding the host\'s statistics reads the mark, and one outside the relation does not', () => {
  const relation = holdRelations(TEST_PARTS).find(candidate => candidate.name === 'host-stats')!
  const withStats = hostElement(relation.holder)
  const stats = document.createElement('div')
  stats.setAttribute(relation.attributes[0]!, '')
  withStats.append(stats)
  const without = hostElement(relation.holder)
  without.append(document.createElement('div'))
  mount(withStats, without)
  install()
  expect(holds(withStats)).toBe(hold('host-stats'))
  expect(holds(without)).toBeNull()
})

test('the foot area marks its boxes around the host row, and nothing above the scope', async () => {
  const sidebar = region(SIDEBAR_SLOT_SELECTOR)
  const relation = holdRelations(TEST_PARTS).find(candidate => candidate.name === 'account-row')!
  const row = document.createElement('button')
  row.setAttribute(relation.attributes[0]!, '')
  mount(slot(SIDEBAR_SLOT_SELECTOR, sidebar.box('root', sidebar.box('footArea', sidebar.box('settingsArea', sidebar.box('triggerRow', row))))))
  install()
  expect(holds(marked(sidebar.part('triggerRow')))).toBe(hold('account-row'))
  expect(holds(marked(sidebar.part('settingsArea')))).toBe(hold('account-row'))
  expect(holds(marked(sidebar.part('root')))).toBeNull()
  expect(holds(marked(sidebar.part('footArea')))).toBeNull()
  row.remove()
  await settle()
  expect(holds(marked(sidebar.part('triggerRow')))).toBeNull()
})

test('the settings dialog marks its section rail outside the conversation box', () => {
  const page = region('body')
  const dialog = document.createElement('div')
  dialog.setAttribute('role', 'dialog')
  dialog.append(page.box('navList', document.createElement('button')))
  mount(page.box('overlay', dialog))
  install()
  expect(marked(page.part('navList'))?.getAttribute(PART_ATTR)).toBe(page.part('navList'))
})

test('the sidebar scroll viewport and panel entry wrapper carry their own parts', () => {
  const sidebar = region(SIDEBAR_SLOT_SELECTOR)
  const entry = sidebar.box('panelEntry', sidebar.box('panelRow'))
  const area = sidebar.box('scrollArea', sidebar.box('panelList', entry))
  mount(slot(SIDEBAR_SLOT_SELECTOR, sidebar.box('root', sidebar.box('scrollRegion', area))))
  install()
  expect(marked(sidebar.part('scrollRegion'))).not.toBeNull()
  expect(marked(sidebar.part('scrollArea'))).toBe(area)
  expect(marked(sidebar.part('panelEntry'))).toBe(entry)
  expect(marked(sidebar.part('panelRow'))).toBe(entry.firstChild)
})

test('the teardown takes every hold mark off with the parts', () => {
  const header = region(CONVERSATION_HEADER_SLOT_SELECTOR)
  mount(slot(CONVERSATION_HEADER_SLOT_SELECTOR, header.box('header', header.box('tabs'))))
  const dispose = installParts(TEST_PARTS)
  expect(holds(marked(header.part('header')))).toBe(hold('view-tabs'))
  dispose()
  expect(document.querySelectorAll(`[${HOLDS_ATTR}]`).length).toBe(0)
  expect(document.querySelectorAll(`[${PART_ATTR}]`).length).toBe(0)
})
