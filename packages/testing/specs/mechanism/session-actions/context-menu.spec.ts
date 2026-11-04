/**
 * @capability session-actions
 * @features session-actions
 * @risk Right-click navigation selects the wrong session, duplicate menu activation closes a native popup, or editing and keyboard gestures lose their original handlers.
 */
import { afterEach, expect, test } from 'vitest'
import { installSessionContextMenu } from '@dsh-claude-style/client/pure'
import { SIDEBAR_SLOT_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { hostElement } from '../../fixtures/host-markup'
import { surfaceAttribute } from '../../fixtures/surface'

const PART_ATTRIBUTE = surfaceAttribute('skin.part')
const releases: (() => void)[] = []

afterEach(() => {
  releases.splice(0).reverse().forEach(release => release())
})

/** These are host boundary listeners: row navigation and action click isolation remain native. */
function scene(root: Document | HTMLElement = document) {
  const sidebar = hostElement(SIDEBAR_SLOT_SELECTOR)
  const parent = root instanceof Document ? root.body : root
  parent.appendChild(sidebar)
  releases.push(() => sidebar.remove())
  const opened: string[] = []
  const entries: HTMLElement[] = []
  let selected = 'opening'

  function add(id: string, part = 'session-row') {
    const item = document.createElement('div')
    item.setAttribute(PART_ATTRIBUTE, part)
    item.setAttribute('aria-selected', String(id === selected))
    const label = document.createElement('span')
    label.setAttribute(PART_ATTRIBUTE, 'row-title')
    label.tabIndex = 0
    const text = document.createElement('span')
    text.textContent = id
    label.append(text)
    const actions = document.createElement('div')
    actions.setAttribute(PART_ATTRIBUTE, 'row-actions')
    const trigger = document.createElement('button')
    trigger.type = 'button'
    trigger.setAttribute('aria-label', 'Open native session menu')
    trigger.textContent = '⋯'
    actions.appendChild(trigger)
    item.append(label, actions)
    sidebar.appendChild(item)
    entries.push(item)
    item.addEventListener('click', () => {
      selected = id
      entries.forEach(entry => entry.setAttribute('aria-selected', String(entry === item)))
    })
    actions.addEventListener('click', event => event.stopPropagation())
    trigger.addEventListener('click', () => {
      opened.push(id)
      const isOpen = item.getAttribute(PART_ATTRIBUTE)?.split(/\s+/).includes('row-menu-open')
      item.setAttribute(PART_ATTRIBUTE, isOpen ? part : `${part} row-menu-open`)
    })
    return { row: item, title: label, text, actions, trigger }
  }

  const stop = root === document ? installSessionContextMenu() : installSessionContextMenu(root)
  releases.push(stop)
  return { sidebar, add, opened, stop, selected: () => selected }
}

function context(target: EventTarget): MouseEvent {
  const gesture = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 })
  target.dispatchEvent(gesture)
  return gesture
}

function keyboard(target: EventTarget, options: KeyboardEventInit): KeyboardEvent {
  const gesture = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...options })
  target.dispatchEvent(gesture)
  return gesture
}

function region(): HTMLElement {
  const wrapper = document.createElement('section')
  document.body.appendChild(wrapper)
  releases.push(() => wrapper.remove())
  return wrapper
}

test('right-click opens only the clicked row native menu and preserves the selected conversation', () => {
  const page = scene()
  const current = page.add('opening')
  const other = page.add('other')
  const originalButton = other.trigger
  const gesture = context(other.text)
  expect(gesture.defaultPrevented).toBe(true)
  expect(page.opened).toEqual(['other'])
  expect(page.selected()).toBe('opening')
  expect(current.row.getAttribute('aria-selected')).toBe('true')
  expect(other.row.getAttribute('aria-selected')).toBe('false')
  expect(document.activeElement).toBe(originalButton)
  expect(other.actions.firstElementChild).toBe(originalButton)
  expect(originalButton.getAttribute('aria-label')).toBe('Open native session menu')
})

test('ordinary left clicks retain row navigation and the native menu button retains its handler', () => {
  const page = scene()
  const first = page.add('first')
  const second = page.add('second')
  first.text.click()
  expect(page.selected()).toBe('first')
  expect(page.opened).toEqual([])
  second.trigger.click()
  expect(page.opened).toEqual(['second'])
  expect(page.selected()).toBe('first')
  expect(first.row.getAttribute('aria-selected')).toBe('true')
})

test('ContextMenu and Shift+F10 focus and activate the same native trigger', () => {
  const page = scene()
  const entry = page.add('keyboard')
  for (const options of [{ key: 'ContextMenu' }, { key: 'F10', shiftKey: true }]) {
    entry.row.setAttribute(PART_ATTRIBUTE, 'session-row')
    entry.title.focus()
    const gesture = keyboard(entry.text, options)
    expect(gesture.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(entry.trigger)
  }
  expect(page.opened).toEqual(['keyboard', 'keyboard'])
  expect(page.selected()).toBe('opening')
})

test('unrelated keys, modified shortcuts and keyboard repeats remain unhandled', () => {
  const page = scene()
  const entry = page.add('shortcuts')
  entry.title.focus()
  for (const options of [
    { key: 'F10' }, { key: 'Enter' }, { key: ' ' },
    { key: 'ContextMenu', ctrlKey: true }, { key: 'F10', shiftKey: true, altKey: true },
    { key: 'ContextMenu', metaKey: true }, { key: 'ContextMenu', repeat: true },
  ]) expect(keyboard(entry.title, options).defaultPrevented).toBe(false)
  expect(page.opened).toEqual([])
  expect(document.activeElement).toBe(entry.title)
})

test('repeated gestures keep an already-open native menu open without another click', () => {
  const page = scene()
  const entry = page.add('persistent-menu')
  expect(context(entry.title).defaultPrevented).toBe(true)
  entry.title.focus()
  expect(context(entry.text).defaultPrevented).toBe(true)
  expect(keyboard(entry.title, { key: 'ContextMenu' }).defaultPrevented).toBe(true)
  expect(page.opened).toEqual(['persistent-menu'])
  expect(document.activeElement).toBe(entry.trigger)
  expect(entry.row.getAttribute(PART_ATTRIBUTE)?.split(/\s+/)).toContain('row-menu-open')
})

test('native editors and their descendants preserve context menus, shortcuts and focus', () => {
  const page = scene()
  const entry = page.add('editing')
  for (const [tag, attribute, value] of [
    ['input', '', ''], ['textarea', '', ''], ['select', '', ''],
    ['div', 'role', 'textbox'], ['div', 'contenteditable', 'true'],
    ['div', 'contenteditable', ''], ['div', 'contenteditable', 'plaintext-only'],
  ]) {
    const editor = document.createElement(tag)
    if (attribute.length > 0) editor.setAttribute(attribute, value)
    editor.tabIndex = 0
    entry.row.appendChild(editor)
    const target = tag === 'div' ? editor.appendChild(document.createElement('span')) : editor
    editor.focus()
    expect(context(target).defaultPrevented).toBe(false)
    expect(keyboard(target, { key: 'F10', shiftKey: true }).defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(editor)
    editor.remove()
  }
  expect(page.opened).toEqual([])
  expect(page.selected()).toBe('opening')
})

test('contenteditable false remains an ordinary row target', () => {
  const page = scene()
  const entry = page.add('non-editable')
  const content = document.createElement('span')
  content.setAttribute('contenteditable', 'false')
  content.textContent = 'Read-only label'
  entry.title.appendChild(content)
  expect(context(content).defaultPrevented).toBe(true)
  expect(page.opened).toEqual(['non-editable'])
  expect(document.activeElement).toBe(entry.trigger)
})

test('events already prevented by a native descendant do not invoke the bridge', () => {
  const page = scene()
  const entry = page.add('claimed')
  entry.title.addEventListener('contextmenu', event => event.preventDefault())
  entry.title.addEventListener('keydown', event => event.preventDefault())
  entry.title.focus()
  expect(context(entry.text).defaultPrevented).toBe(true)
  expect(keyboard(entry.text, { key: 'ContextMenu' }).defaultPrevented).toBe(true)
  expect(page.opened).toEqual([])
  expect(document.activeElement).toBe(entry.title)
})

test('disabled or missing triggers, sidebar blank space and non-session rows remain native', () => {
  const page = scene()
  const disabled = page.add('disabled')
  disabled.trigger.disabled = true
  const ariaDisabled = page.add('aria-disabled')
  ariaDisabled.trigger.setAttribute('aria-disabled', 'true')
  const missing = page.add('missing')
  missing.trigger.remove()
  const misplaced = page.add('misplaced')
  misplaced.actions.remove()
  misplaced.title.appendChild(misplaced.trigger)
  const project = page.add('project', 'project-row')
  const outside = page.add('outside')
  region().appendChild(outside.row)
  for (const target of [page.sidebar, disabled.text, ariaDisabled.text, missing.text, misplaced.text, project.text, outside.text]) {
    expect(context(target).defaultPrevented).toBe(false)
    expect(keyboard(target, { key: 'ContextMenu' }).defaultPrevented).toBe(false)
  }
  expect(page.opened).toEqual([])
  expect(page.selected()).toBe('opening')
})

test('an HTMLElement installation handles later rows only inside its own sidebar root', () => {
  const scope = region()
  const page = scene(scope)
  const outsideSidebar = hostElement(SIDEBAR_SLOT_SELECTOR)
  region().appendChild(outsideSidebar)
  const outside = page.add('outside-scope')
  outsideSidebar.appendChild(outside.row)
  expect(context(outside.text).defaultPrevented).toBe(false)
  const late = page.add('late-arrival')
  expect(context(late.text).defaultPrevented).toBe(true)
  expect(page.opened).toEqual(['late-arrival'])
  expect(document.activeElement).toBe(late.trigger)
})

test('teardown releases both listeners and pending focus while preserving native clicks', async () => {
  for (const root of [document, region()]) {
    const page = scene(root)
    const entry = page.add('after-teardown')
    context(entry.title)
    expect(page.opened).toEqual(['after-teardown'])
    page.stop()
    page.stop()
    entry.title.focus()
    await Promise.resolve()
    expect(document.activeElement).toBe(entry.title)
    expect(context(entry.text).defaultPrevented).toBe(false)
    expect(keyboard(entry.text, { key: 'F10', shiftKey: true }).defaultPrevented).toBe(false)
    expect(page.opened).toEqual(['after-teardown'])
    expect(document.activeElement).toBe(entry.title)
    entry.text.click()
    expect(page.selected()).toBe('after-teardown')
    entry.trigger.click()
    expect(page.opened).toEqual(['after-teardown', 'after-teardown'])
  }
})

test('keyboard activation focuses a native trigger revealed by the menu commit microtask', async () => {
  const page = scene()
  const entry = page.add('revealed-after-commit')
  entry.trigger.style.display = 'none'
  entry.trigger.addEventListener('click', () => {
    queueMicrotask(() => { entry.trigger.style.display = '' })
  })
  entry.title.focus()
  expect(keyboard(entry.title, { key: 'F10', shiftKey: true }).defaultPrevented).toBe(true)
  expect(page.opened).toEqual(['revealed-after-commit'])
  expect(document.activeElement).toBe(entry.title)
  await Promise.resolve()
  expect(document.activeElement).toBe(entry.trigger)
  expect(page.selected()).toBe('opening')
})
