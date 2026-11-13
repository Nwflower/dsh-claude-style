/**
 * Persistent hint text and first placement ordering across pointer and keyboard owners.
 * @capability pointer-hint
 * @features home, settings
 * @risk A hint travels from its previous hidden position, measures the previous label, or keeps showing after pointer exit or keyboard blur.
 */
import { afterEach, expect, test } from 'vitest'
import { hidePointerHint, POINTER_HINT_SHOWN_ATTRIBUTE, showPointerHint } from '@dsh-claude-style/client/pure'

afterEach(() => document.body.replaceChildren())
test('the new label is read before placement and only hidden arrivals suppress travel', () => {
  const hint = document.createElement('span')
  hint.append(document.createElement('span'))
  document.body.append(hint)
  const calls: string[] = []
  const place = (text: HTMLElement) => {
    calls.push(`read:${text.textContent}`)
    return () => { calls.push(`write:${hint.style.transition}`) }
  }
  showPointerHint(hint, 'first', place)
  expect(hint.hasAttribute(POINTER_HINT_SHOWN_ATTRIBUTE)).toBe(true)
  showPointerHint(hint, 'second', place)
  expect(calls).toEqual(['read:first', 'write:none', 'read:second', 'write:'])
  hidePointerHint(hint)
  expect(hint.hasAttribute(POINTER_HINT_SHOWN_ATTRIBUTE)).toBe(false)
  showPointerHint(hint, 'keyboard', place)
  expect(calls.slice(-2)).toEqual(['read:keyboard', 'write:none'])
})

test('owners keep their own showing attribute and replacement text is measured on the new element', () => {
  const hint = document.createElement('span')
  hint.append(document.createElement('span'))
  showPointerHint(hint, 'old', () => () => {}, 'open')
  hint.replaceChildren(document.createElement('span'))
  showPointerHint(hint, 'new', text => {
    expect(text).toBe(hint.firstElementChild)
    expect(text.textContent).toBe('new')
    return () => {}
  }, 'open')
  hidePointerHint(hint, 'open')
  expect(hint.hasAttribute('open')).toBe(false)
})
