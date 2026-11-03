/**
 * ds-bot's Agent item follows the account menu's first separator; a signed-in
 * menu appends its sign-out group after it.
 *
 * @capability surface
 * @features surface
 * @risk A signed-in reader presses Code and the old last-group selector presses Sign out instead of Agent mode.
 */
import { afterEach, expect, test } from 'vitest'
import { DS_BOT_AGENT_ITEM_SELECTOR } from '@dsh-claude-style/contracts/dom'

function mountMenu(signedIn: boolean) {
  const menu = document.createElement('div')
  menu.className = 'bt-account-menu'
  menu.innerHTML = `
    <button type="button" role="menuitem" id="usage">Usage</button>
    <button type="button" role="menuitem" id="settings">Bot settings</button>
    <div class="bt-menu-sep" role="separator"></div>
    <button type="button" role="menuitem" id="agent">Agent</button>
    ${signedIn ? '<div class="bt-menu-sep" role="separator"></div><button type="button" role="menuitem" id="sign-out">Sign out</button>' : ''}`
  document.body.append(menu)
  return menu
}

afterEach(() => {
  document.body.replaceChildren()
})

test('the signed-out menu keeps its Agent item', () => {
  const menu = mountMenu(false)
  expect(menu.querySelector(DS_BOT_AGENT_ITEM_SELECTOR)?.id).toBe('agent')
})

test('the signed-in menu does not select its appended Sign out item', () => {
  const menu = mountMenu(true)
  expect(menu.querySelector(DS_BOT_AGENT_ITEM_SELECTOR)?.id).toBe('agent')
})

test('a menu without the Agent group has no item to press', () => {
  const menu = document.createElement('div')
  menu.className = 'bt-account-menu'
  menu.innerHTML = '<button type="button" role="menuitem" id="usage">Usage</button>'
  document.body.append(menu)
  expect(menu.querySelector(DS_BOT_AGENT_ITEM_SELECTOR)).toBeNull()
})
