/**
 * A plugin's footer block — a section carrying its own heading and rows — keeps
 * its place above the account row, and the account menu carries a copy of it.
 *
 * @capability footer-mirror
 * @features account
 * @risk The takeover gathers the block into the account menu, so a plugin whose only sidebar entry is that block loses its entry point.
 */
import { afterEach, expect, test } from 'vitest'
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
