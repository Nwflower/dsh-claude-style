/**
 * Skin-side section folding for the host's session panel and automatic rollback
 * when the host's section contract changes (D113).
 *
 * @capability session-panel
 * @features session-panel
 * @risk Sections fail to fold or persist, keyboard interaction breaks, or a
 *   host update adding native folding / changing section structure leaves
 *   conflicting skin marks behind instead of rolling back cleanly.
 */
import { afterEach, beforeEach, expect, test } from 'vitest'
import { installSectionFold, isSectionFoldActive, probeSectionContract, SECTION_FOLD_STORAGE_KEY } from '@dsh-claude-style/client/mechanisms'
import {
  SESSION_PANEL_SECTION_ATTRIBUTE,
  SESSION_PANEL_SELECTOR,
  SLOT_ANCHOR_SELECTOR,
} from '@dsh-claude-style/contracts/dom'
import { surfaceAttribute } from '../../fixtures/surface'

const FOLDABLE_ATTR = surfaceAttribute('session-panel.foldable')
const FOLDED_ATTR = surfaceAttribute('session-panel.folded')
const FOLD_HEAD_ATTR = surfaceAttribute('session-panel.fold-head')
const PANEL_ATTR = SESSION_PANEL_SELECTOR.slice(1, -1)
const SLOT_ATTR = SLOT_ANCHOR_SELECTOR.slice(1, -1)

let panel: HTMLElement | null = null
let dispose: (() => void) | null = null

function buildSection(id: string, title: string): HTMLElement {
  const section = document.createElement('section')
  section.setAttribute(SESSION_PANEL_SECTION_ATTRIBUTE, id)
  const head = document.createElement('div')
  const h2 = document.createElement('h2')
  h2.textContent = title
  const actions = document.createElement('div')
  const actionsSlot = document.createElement('span')
  actionsSlot.setAttribute(SLOT_ATTR, 'conversation.session.panel.section.actions')
  actions.append(actionsSlot)
  head.append(h2, actions)
  const body = document.createElement('div')
  const bodySlot = document.createElement('span')
  bodySlot.setAttribute(SLOT_ATTR, 'conversation.session.panel.section')
  bodySlot.textContent = `${title} body`
  body.append(bodySlot)
  section.append(head, body)
  return section
}

function sectionById(root: Element, id: string): Element {
  const found = root.querySelector(`[${SESSION_PANEL_SECTION_ATTRIBUTE}="${id}"]`)
  if (found === null) throw new Error(`missing section ${id}`)
  return found
}

function mountPanel(ids: readonly [string, string][]) {
  const aside = document.createElement('aside')
  aside.setAttribute(PANEL_ATTR, 'docked')
  for (const [id, title] of ids) aside.append(buildSection(id, title))
  document.body.append(aside)
  panel = aside
  return aside
}

const flush = () => new Promise(resolve => setTimeout(resolve, 20))

beforeEach(() => {
  localStorage.removeItem(SECTION_FOLD_STORAGE_KEY)
})

afterEach(() => {
  if (dispose !== null) dispose()
  dispose = null
  if (panel !== null) panel.remove()
  panel = null
  localStorage.removeItem(SECTION_FOLD_STORAGE_KEY)
})

test('applies default fold state, toggles on click and keyboard, and persists choices', () => {
  const aside = mountPanel([
    ['environment', '环境'],
    ['claude-style-context', '上下文'],
    ['claude-style-stats', '会话统计'],
    ['claude-style-tokens', 'Token 用量'],
  ])
  dispose = installSectionFold()

  const env = sectionById(aside, 'environment')
  const context = sectionById(aside, 'claude-style-context')
  const stats = sectionById(aside, 'claude-style-stats')
  const tokens = sectionById(aside, 'claude-style-tokens')

  expect(isSectionFoldActive()).toBe(true)
  expect(env.hasAttribute(FOLDABLE_ATTR)).toBe(true)
  expect(env.hasAttribute(FOLDED_ATTR)).toBe(false)
  expect(context.hasAttribute(FOLDED_ATTR)).toBe(false)
  expect(stats.hasAttribute(FOLDED_ATTR)).toBe(true)
  expect(tokens.hasAttribute(FOLDED_ATTR)).toBe(true)
  expect(stats.firstElementChild?.getAttribute('aria-expanded')).toBe('false')

  // Clicking the title toggles fold state and writes storage.
  stats.firstElementChild!.querySelector('h2')!.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }))
  expect(stats.hasAttribute(FOLDED_ATTR)).toBe(false)
  expect(stats.firstElementChild?.getAttribute('aria-expanded')).toBe('true')

  // Keyboard Enter/Space toggles fold state as well.
  env.firstElementChild!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
  expect(env.hasAttribute(FOLDED_ATTR)).toBe(true)
  expect(env.firstElementChild?.getAttribute('aria-expanded')).toBe('false')

  // Re-installing restores the persisted choices.
  dispose()
  dispose = installSectionFold()
  expect(stats.hasAttribute(FOLDED_ATTR)).toBe(false)
  expect(env.hasAttribute(FOLDED_ATTR)).toBe(true)
})

test('rolls back cleanly when the host introduces native folding or alters section structure', async () => {
  const aside = mountPanel([
    ['environment', '环境'],
    ['claude-style-stats', '会话统计'],
  ])
  dispose = installSectionFold()

  const env = sectionById(aside, 'environment')
  const stats = sectionById(aside, 'claude-style-stats')
  expect(isSectionFoldActive()).toBe(true)
  expect(stats.hasAttribute(FOLDED_ATTR)).toBe(true)

  // Host adds a native fold button inside a section header outside section.actions.
  const nativeToggle = document.createElement('button')
  nativeToggle.type = 'button'
  nativeToggle.setAttribute('aria-expanded', 'true')
  env.firstElementChild!.append(nativeToggle)

  await flush()
  expect(isSectionFoldActive()).toBe(false)
  expect(env.hasAttribute(FOLDABLE_ATTR)).toBe(false)
  expect(stats.hasAttribute(FOLDABLE_ATTR)).toBe(false)
  expect(stats.hasAttribute(FOLDED_ATTR)).toBe(false)
  expect(stats.firstElementChild?.hasAttribute(FOLD_HEAD_ATTR)).toBe(false)
  expect(stats.firstElementChild?.hasAttribute('aria-expanded')).toBe(false)

  // Clicks after rollback do not re-apply skin folding.
  stats.firstElementChild!.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }))
  expect(stats.hasAttribute(FOLDED_ATTR)).toBe(false)
})

test('probeSectionContract rejects details elements, native fold attributes, and structural drift', () => {
  const valid = buildSection('claude-style-context', '上下文')
  expect(probeSectionContract(valid)).toBe(true)

  const details = document.createElement('details')
  details.setAttribute(SESSION_PANEL_SECTION_ATTRIBUTE, 'claude-style-context')
  expect(probeSectionContract(details)).toBe(false)

  const withNativeAttr = buildSection('claude-style-context', '上下文')
  withNativeAttr.setAttribute('open', '')
  expect(probeSectionContract(withNativeAttr)).toBe(false)

  const extraChild = buildSection('claude-style-context', '上下文')
  extraChild.append(document.createElement('footer'))
  expect(probeSectionContract(extraChild)).toBe(false)

  const noSlotBody = buildSection('claude-style-context', '上下文')
  noSlotBody.lastElementChild!.innerHTML = '<p>plain</p>'
  expect(probeSectionContract(noSlotBody)).toBe(false)
})
