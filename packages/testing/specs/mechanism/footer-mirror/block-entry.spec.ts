/**
 * A plugin's footer block — a section carrying its own heading and rows — keeps
 * its place above the account row, and the account menu carries a copy of it.
 *
 * @capability footer-mirror
 * @features account
 * @risk The takeover gathers the block into the account menu, so a plugin whose only sidebar entry is that block loses its entry point.
 */
import { afterEach, expect, test } from 'vitest'
import { SLOT_ITEM_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { hostElement } from '../../fixtures/host-markup'
import { surfaceAttribute, surfaceSelector } from '../../fixtures/surface'
import { footerMirrorHarness } from '../../fixtures/footer-mirror'

const FOOTER_BLOCK = surfaceAttribute('account.footer-block')
const FOOTER_ENTRY = surfaceAttribute('account.footer-entry')
const FOOTER_HIDDEN = surfaceAttribute('account.footer-hidden')
const EMBED = surfaceSelector('account.embed')

afterEach(() => {
  document.body.replaceChildren()
})

test('a section laid out in the footer keeps its place while the menu carries a copy', () => {
  const { footArea, slot, popover, mirror } = footerMirrorHarness()
  const block = document.createElement('section')
  const heading = document.createElement('button')
  heading.textContent = 'Enterprise apps'
  const row = document.createElement('button')
  row.textContent = 'Workbench'
  block.append(heading, row)
  slot.append(block)

  mirror.measure(footArea)
  mirror.sync(footArea)

  expect(block.hasAttribute(FOOTER_BLOCK)).toBe(true)
  expect(block.hasAttribute(FOOTER_ENTRY)).toBe(false)
  expect(block.hasAttribute(FOOTER_HIDDEN)).toBe(false)
  expect(popover.querySelector(`${EMBED} > section`)?.textContent).toContain('Workbench')

  mirror.clear(footArea)
  expect(block.hasAttribute(FOOTER_BLOCK)).toBe(false)
})

test('list-slot item wrappers unwrap rendered entries and ignore null-returning empty wrappers', () => {
  const { footArea, slot, popover, mirror } = footerMirrorHarness()
  const emptyItem = hostElement(SLOT_ITEM_SELECTOR)
  const blockItem = hostElement(SLOT_ITEM_SELECTOR)
  const block = document.createElement('section')
  const blockBtn = document.createElement('button')
  blockBtn.textContent = 'Workspace tools'
  block.append(blockBtn)
  blockItem.append(block)

  const actionItem = hostElement(SLOT_ITEM_SELECTOR)
  const action = document.createElement('button')
  action.textContent = 'Check status'
  actionItem.append(action)

  slot.append(emptyItem, blockItem, actionItem)

  mirror.measure(footArea)
  mirror.sync(footArea)

  expect(emptyItem.hasAttribute(FOOTER_ENTRY)).toBe(false)
  expect(emptyItem.hasAttribute(FOOTER_HIDDEN)).toBe(false)
  expect(block.hasAttribute(FOOTER_BLOCK)).toBe(true)
  expect(action.hasAttribute(FOOTER_ENTRY)).toBe(true)
  expect(action.hasAttribute(FOOTER_HIDDEN)).toBe(true)
  expect(popover.querySelector(`${EMBED} > section`)?.textContent).toContain('Workspace tools')
  expect(popover.textContent).toContain('Check status')
})
