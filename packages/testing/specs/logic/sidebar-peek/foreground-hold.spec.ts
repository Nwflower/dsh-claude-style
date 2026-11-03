/**
 * The foreground the sidebar peek holds itself open for: a menu or a modal
 * dialog the reader faces. A node kept mounted while hidden — an overlay root
 * another plugin leaves in the document, a dialog between its exit frames —
 * stands off screen and is nothing to act behind.
 *
 * @capability sidebar-peek
 * @features sidebar-peek
 * @risk The sidebar stays over the page after the pointer leaves, and only a click on a session puts it back, because a hidden overlay root in the document reads as an open menu.
 */
import { afterEach, expect, test } from 'vitest'
import { findForeground } from '@dsh-claude-style/engine/host'

function overlay(role: 'dialog' | 'menu') {
  const node = document.createElement('div')
  node.setAttribute('role', role)
  if (role === 'dialog') node.setAttribute('aria-modal', 'true')
  document.body.append(node)
  return node
}

afterEach(() => {
  document.body.replaceChildren()
})

test('a modal dialog left mounted while hidden is no foreground', () => {
  overlay('dialog').style.display = 'none'
  expect(findForeground()).toBeNull()
})

test('a menu hidden by visibility is no foreground', () => {
  overlay('menu').style.visibility = 'hidden'
  expect(findForeground()).toBeNull()
})

test('a menu the reader sees is the foreground', () => {
  const menu = overlay('menu')
  expect(findForeground()).toBe(menu)
})

test('a hidden node standing first does not hide the menu behind it', () => {
  overlay('dialog').style.display = 'none'
  const menu = overlay('menu')
  expect(findForeground()).toBe(menu)
})
