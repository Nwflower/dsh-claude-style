/**
 * The list a bisecting run hands the bundle before it boots (docs/DEBUGGING.md,
 * 功能二分): a name in the list installs nothing, and anything the page did not
 * set — or a value that is not a list at all — leaves every feature on.
 *
 * @capability feature-switch
 * @features engine
 * @risk A test run that names a feature still gets it installed, so a bisection points at the wrong feature, or a page that never set the list loses features it needs.
 */
import { expect, test } from 'vitest'
import { switchedOff } from '@dsh-claude-style/client/pure'

test('a name in the list stands down', () => {
  expect(switchedOff('composer', ['composer'])).toBe(true)
  expect(switchedOff('composer', ['chatFold', 'composer'])).toBe(true)
})

test('a feature the list does not name installs', () => {
  expect(switchedOff('composer', ['chatFold'])).toBe(false)
  expect(switchedOff('composer', [])).toBe(false)
})

test('a page that set no list keeps every feature', () => {
  expect(switchedOff('composer', undefined)).toBe(false)
  expect(switchedOff('composer', null)).toBe(false)
  expect(switchedOff('composer', 'composer')).toBe(false)
})
