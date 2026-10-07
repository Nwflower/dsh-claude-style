import { expect, test } from 'vitest'
import { BRAND_CLAUDE, BRAND_DEEPSEEK, BRAND_DEEPSEEK_LEGACY, MASCOT_CRAB, MASCOT_DEEPY, MASCOT_OFF, PREF_DEFAULTS, PROVIDER_ID_MAX, QUICK_PROVIDERS_MAX, USERNAME_MAX } from '../constants'
import { MODEL_OFFICIAL_GROUP } from '../features/model/copy-fallbacks'
import { normalizePrefs, resolveMascot } from './prefs'

test('an empty or unreadable value reads as the defaults', () => {
  expect(normalizePrefs({})).toEqual(PREF_DEFAULTS)
  expect(normalizePrefs(null)).toEqual(PREF_DEFAULTS)
  expect(normalizePrefs('nonsense')).toEqual(PREF_DEFAULTS)
})

test('a switch stays on unless stored as false', () => {
  expect(normalizePrefs({ turnNav: false }).turnNav).toBe(false)
  expect(normalizePrefs({ turnNav: 0 }).turnNav).toBe(true)
  expect(normalizePrefs({ turnNav: 'false' }).turnNav).toBe(true)
})

test('a choice outside its set reads as its default', () => {
  expect(normalizePrefs({ motion: 'reduced' }).motion).toBe('reduced')
  expect(normalizePrefs({ motion: 'sometimes' }).motion).toBe(PREF_DEFAULTS.motion)
  expect(normalizePrefs({ motion: 1 }).motion).toBe(PREF_DEFAULTS.motion)
})

test('the brand stored under its earlier name lands on its choice, anything else on Claude', () => {
  expect(normalizePrefs({ brand: BRAND_DEEPSEEK }).brand).toBe(BRAND_DEEPSEEK)
  expect(normalizePrefs({ brand: BRAND_DEEPSEEK_LEGACY }).brand).toBe(BRAND_DEEPSEEK)
  expect(normalizePrefs({ brand: 'anthropic' }).brand).toBe(BRAND_CLAUDE)
})

test('the hover-open preference takes its earlier boolean shape', () => {
  expect(normalizePrefs({ autoPopover: true }).autoPopover).toBe('all')
  expect(normalizePrefs({ autoPopover: false }).autoPopover).toBe('off')
  expect(normalizePrefs({ autoPopover: 'account' }).autoPopover).toBe('account')
  expect(normalizePrefs({ autoPopover: 'often' }).autoPopover).toBe(PREF_DEFAULTS.autoPopover)
})

test('quick providers keep distinct ids in order, without the official group, within both limits', () => {
  const long = 'x'.repeat(PROVIDER_ID_MAX + 1)
  expect(normalizePrefs({ quickProviders: ['a', 'b', 'a', '', 3, long, MODEL_OFFICIAL_GROUP, 'c'] }).quickProviders).toEqual(['a', 'b', 'c'])
  expect(normalizePrefs({ quickProviders: 'a' }).quickProviders).toEqual([])
  const many = Array.from({ length: QUICK_PROVIDERS_MAX + 5 }, (_, index) => `p${index}`)
  expect(normalizePrefs({ quickProviders: many }).quickProviders).toHaveLength(QUICK_PROVIDERS_MAX)
})

test('the username is trimmed and cut to its limit', () => {
  expect(normalizePrefs({ username: '  Ada  ' }).username).toBe('Ada')
  expect(normalizePrefs({ username: 'y'.repeat(USERNAME_MAX + 10) }).username).toHaveLength(USERNAME_MAX)
  expect(normalizePrefs({ username: 42 }).username).toBe('')
})

test('"follow the brand" puts the crab under Claude and Deepy under DeepSeek; a fixed choice stands', () => {
  expect(resolveMascot(normalizePrefs({ brand: BRAND_CLAUDE }))).toBe(MASCOT_CRAB)
  expect(resolveMascot(normalizePrefs({ brand: BRAND_DEEPSEEK }))).toBe(MASCOT_DEEPY)
  expect(resolveMascot(normalizePrefs({ brand: BRAND_DEEPSEEK, mascot: MASCOT_CRAB }))).toBe(MASCOT_CRAB)
  expect(resolveMascot(normalizePrefs({ mascot: MASCOT_OFF }))).toBe(MASCOT_OFF)
})
