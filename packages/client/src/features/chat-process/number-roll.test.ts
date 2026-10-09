import { afterEach, expect, test, vi } from 'vitest'
import { createNumberRoll } from './number-roll'

const rolls: ReturnType<typeof createNumberRoll>[] = []
afterEach(() => {
  vi.useRealTimers()
  for (const roll of rolls.splice(0)) roll.remove()
})

/** The figures painted right now, in order: the outgoing one, then the incoming. */
function digits(root: HTMLElement): string[] {
  return [...root.querySelectorAll('[data-dsh-claude-number-roll-digit]')].map((digit) => digit.textContent ?? '')
}

function roll(initial: number) {
  const created = createNumberRoll(initial)
  document.body.append(created.root)
  rolls.push(created)
  return created
}

test('a fresh figure paints its value once, with no outgoing digit', () => {
  const figure = roll(1)
  expect(digits(figure.root)).toEqual(['1'])
  expect(figure.root.getAttribute('aria-hidden')).toBe('true')
})

test('a jump keeps the old figure sliding out while the new one rises, then lands on the new one', () => {
  vi.useFakeTimers()
  const figure = roll(1)
  figure.show(4, true)
  expect(digits(figure.root)).toEqual(['1', '4'])
  expect(figure.root.querySelector('[data-dsh-claude-number-roll-sizer]')?.textContent).toBe('4')
  vi.advanceTimersByTime(160)
  expect(digits(figure.root)).toEqual(['4'])
})

test('an unchanged figure paints nothing, and a motionless reader gets the value written straight in', () => {
  const figure = roll(2)
  figure.show(2, true)
  expect(digits(figure.root)).toEqual(['2'])
  figure.show(5, false)
  expect(digits(figure.root)).toEqual(['5'])
})
