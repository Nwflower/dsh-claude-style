/**
 * What a stored preference reads back as: the settings namespace holds values
 * an earlier build, a hand-edited file or another client wrote, and the clamp
 * turns each into one the skin draws (packages/contracts/src/prefs.ts).
 *
 * @capability preferences
 * @features core, contracts, mascot
 * @risk A reader who upgrades keeps a choice they made under an earlier build, or a hand-edited settings file breaks the whole page instead of falling back to the defaults.
 */
import { expect, test } from 'vitest'
import fc from 'fast-check'
import { resolveMascot } from '@dsh-claude-style/client/pure'
import {
  BRAND_CLAUDE, BRAND_DEEPSEEK, BRAND_DEEPSEEK_LEGACY, BRAND_INK_ORIGINAL, BRAND_INK_TEXT, BRAND_NAME_MAX,
  CHAT_ANIMATIONS_OFF, MASCOT_CRAB, MASCOT_DEEPY, MASCOT_OFF, ONGOING_INDICATOR_BREATHE, ONGOING_INDICATOR_RING, ONGOING_INDICATOR_SHIMMER, PREFS, PREF_DEFAULTS,
  PROVIDER_ID_MAX, QUICK_PROVIDERS_MAX, STATUS_MOTION_WASH, USERNAME_MAX, clampPrefs,
} from '@dsh-claude-style/contracts/prefs'
import { OFFICIAL_MODEL_GROUP } from '@dsh-claude-style/contracts/services'

test('an empty or unreadable value reads as the defaults', () => {
  expect(clampPrefs({})).toEqual(PREF_DEFAULTS)
  expect(clampPrefs(null)).toEqual(PREF_DEFAULTS)
  expect(clampPrefs('nonsense')).toEqual(PREF_DEFAULTS)
})

/**
 * Stored values no build ever wrote that once broke the read: an object holding a
 * field with a built-in's name, and that name itself, which an earlier-shape
 * lookup took for one of its own entries.
 */
const ODD_VALUES = [{ brand: { toString: [] } }, { brand: 'toString' }, { statusDetail: 'constructor' }, { autoPopover: { valueOf: 1 } }]

test('a value no build ever wrote reads as the default instead of breaking the read', () => {
  for (const stored of ODD_VALUES) {
    const key = Object.keys(stored)[0] as keyof typeof PREF_DEFAULTS
    expect(clampPrefs(stored)[key]).toBe(PREF_DEFAULTS[key])
  }
})

test('whatever is stored, every key reads back as a value of its own kind', () => {
  fc.assert(fc.property(fc.dictionary(fc.constantFrom(...Object.keys(PREFS)), fc.anything()), (stored) => {
    const read = clampPrefs(stored)
    expect(Object.keys(read).sort()).toEqual(Object.keys(PREF_DEFAULTS).sort())
    for (const key of Object.keys(PREF_DEFAULTS) as (keyof typeof PREF_DEFAULTS)[]) {
      expect(Array.isArray(read[key])).toBe(Array.isArray(PREF_DEFAULTS[key]))
      if (!Array.isArray(PREF_DEFAULTS[key])) expect(typeof read[key]).toBe(typeof PREF_DEFAULTS[key])
    }
  }), { examples: ODD_VALUES.map((stored): [Record<string, unknown>] => [stored]) })
})

test('a value already read back reads back the same', () => {
  fc.assert(fc.property(fc.dictionary(fc.constantFrom(...Object.keys(PREFS)), fc.anything()), (stored) => {
    const once = clampPrefs(stored)
    expect(clampPrefs(once)).toEqual(once)
  }), { examples: ODD_VALUES.map((stored): [Record<string, unknown>] => [stored]) })
})

test('a switch stays on unless stored as false', () => {
  expect(clampPrefs({ turnNav: false }).turnNav).toBe(false)
  expect(clampPrefs({ turnNav: 0 }).turnNav).toBe(true)
  expect(clampPrefs({ turnNav: 'false' }).turnNav).toBe(true)
})

test('a choice outside its set reads as its default', () => {
  expect(clampPrefs({ motion: 'reduced' }).motion).toBe('reduced')
  expect(clampPrefs({ motion: 'sometimes' }).motion).toBe(PREF_DEFAULTS.motion)
  expect(clampPrefs({ motion: 1 }).motion).toBe(PREF_DEFAULTS.motion)
  expect(clampPrefs({ statusMotion: STATUS_MOTION_WASH }).statusMotion).toBe(STATUS_MOTION_WASH)
  expect(clampPrefs({ statusMotion: 'glow' }).statusMotion).toBe(PREF_DEFAULTS.statusMotion)
  expect(clampPrefs({ statusDetail: 'simple' }).statusDetail).toBe(false)
  expect(clampPrefs({ statusDetail: 'precise' }).statusDetail).toBe(true)
  expect(clampPrefs({ statusDetail: 'verbose' }).statusDetail).toBe(PREF_DEFAULTS.statusDetail)
  expect(clampPrefs({ ongoingIndicator: ONGOING_INDICATOR_RING }).ongoingIndicator).toBe(ONGOING_INDICATOR_RING)
  expect(clampPrefs({ ongoingIndicator: 'pulse' }).ongoingIndicator).toBe(PREF_DEFAULTS.ongoingIndicator)
})

test('ongoing styles preserve breathe and ring and accept shimmer without changing the default', () => {
  expect(PREF_DEFAULTS.ongoingIndicator).toBe(ONGOING_INDICATOR_BREATHE)
  for (const choice of [ONGOING_INDICATOR_BREATHE, ONGOING_INDICATOR_RING, ONGOING_INDICATOR_SHIMMER]) {
    expect(clampPrefs({ ongoingIndicator: choice }).ongoingIndicator).toBe(choice)
  }
  expect(clampPrefs({}).ongoingIndicator).toBe(ONGOING_INDICATOR_BREATHE)
})

test('the retired overlay search style reads as the standalone button', () => {
  expect(clampPrefs({}).searchStyle).toBe('standalone')
  expect(clampPrefs({ searchStyle: 'overlay' }).searchStyle).toBe('standalone')
  expect(clampPrefs({ searchStyle: 'icon' }).searchStyle).toBe('icon')
})

test('the caret switch reads the retired explicit-moves tier as on', () => {
  expect(clampPrefs({ caretMotion: 'typing' }).caretMotion).toBe('typing')
  expect(clampPrefs({ caretMotion: 'off' }).caretMotion).toBe('off')
  expect(clampPrefs({ caretMotion: 'move' }).caretMotion).toBe(PREF_DEFAULTS.caretMotion)
})

test('the brand stored under its earlier name lands on its choice, anything else on Claude', () => {
  expect(clampPrefs({ brand: BRAND_DEEPSEEK }).brand).toBe(BRAND_DEEPSEEK)
  expect(clampPrefs({ brand: BRAND_DEEPSEEK_LEGACY }).brand).toBe(BRAND_DEEPSEEK)
  expect(clampPrefs({ brand: 'anthropic' }).brand).toBe(BRAND_CLAUDE)
})

test('the hover-open preference takes its earlier boolean shape', () => {
  expect(clampPrefs({ autoPopover: true }).autoPopover).toBe('all')
  expect(clampPrefs({ autoPopover: false }).autoPopover).toBe('off')
  expect(clampPrefs({ autoPopover: 'account' }).autoPopover).toBe('account')
  expect(clampPrefs({ autoPopover: 'often' }).autoPopover).toBe(PREF_DEFAULTS.autoPopover)
})

test('the chat-area animation switch keeps its boolean shape, and a value stored under the retired choice reads as on', () => {
  expect(clampPrefs({ chatAnimations: true }).chatAnimations).toBe(true)
  expect(clampPrefs({ chatAnimations: false }).chatAnimations).toBe(false)
  expect(clampPrefs({ chatAnimations: CHAT_ANIMATIONS_OFF }).chatAnimations).toBe(false)
  expect(clampPrefs({ chatAnimations: 'enhanced' }).chatAnimations).toBe(true)
  expect(clampPrefs({ chatAnimations: 'redraw' }).chatAnimations).toBe(true)
  expect(clampPrefs({ chatAnimations: 7 }).chatAnimations).toBe(PREF_DEFAULTS.chatAnimations)
})

test('quick providers keep distinct ids in order, without the official group, within both limits', () => {
  const long = 'x'.repeat(PROVIDER_ID_MAX + 1)
  expect(clampPrefs({ quickProviders: ['a', 'b', 'a', '', 3, long, OFFICIAL_MODEL_GROUP, 'c'] }).quickProviders).toEqual(['a', 'b', 'c'])
  expect(clampPrefs({ quickProviders: 'a' }).quickProviders).toEqual([])
  const many = Array.from({ length: QUICK_PROVIDERS_MAX + 5 }, (_, index) => `p${index}`)
  expect(clampPrefs({ quickProviders: many }).quickProviders).toHaveLength(QUICK_PROVIDERS_MAX)
})

test('the typeface, reasoning and interface font choices survive storage', () => {
  const stored = clampPrefs({
    typeface: 'system',
    reasoningDisplay: 'stepped',
    interfaceFontSize: ' 125 ',
  })
  expect(stored.typeface).toBe('system')
  expect(stored.reasoningDisplay).toBe('stepped')
  expect(stored.interfaceFontSize).toBe('125')
  expect(clampPrefs({ typeface: 'other' }).typeface).toBe(PREF_DEFAULTS.typeface)
  expect(clampPrefs({ reasoningDisplay: 'other' }).reasoningDisplay).toBe(PREF_DEFAULTS.reasoningDisplay)
  expect(clampPrefs({}).interfaceFontSize).toBe('100')
})

test('the username is trimmed and cut to its limit', () => {
  expect(clampPrefs({ username: '  Ada  ' }).username).toBe('Ada')
  expect(clampPrefs({ username: 'y'.repeat(USERNAME_MAX + 10) }).username).toHaveLength(USERNAME_MAX)
  expect(clampPrefs({ username: 42 }).username).toBe('')
})

test('the brand name is trimmed and cut to its limit', () => {
  expect(clampPrefs({ brandName: '  Acme  ' }).brandName).toBe('Acme')
  expect(clampPrefs({ brandName: 'n'.repeat(BRAND_NAME_MAX + 10) }).brandName).toHaveLength(BRAND_NAME_MAX)
  expect(clampPrefs({ brandName: false }).brandName).toBe('')
})

test('a stored accent moves into the custom card, keeping its colour, and the card takes over', () => {
  const migrated = clampPrefs({ brandAccent: '#1A7F5A' })
  expect(migrated.customAccent).toBe('#1a7f5a')
  expect(migrated.paletteColors).toBe('custom')
  expect(migrated.brandAccent).toBe('')
  expect(clampPrefs({ brandAccent: '#abc' }).customAccent).toBe('')
  expect(clampPrefs({ brandAccent: 'red' }).customAccent).toBe('')
  expect(clampPrefs({}).paletteColors).toBe('brand')
  expect(clampPrefs({ paletteColors: 'claude' }).paletteColors).toBe('claude')
  expect(clampPrefs({ paletteColors: 'deepseek' }).paletteColors).toBe('deepseek')
  expect(clampPrefs({ paletteColors: 'pink' }).paletteColors).toBe('brand')
})

test('the custom images keep their own colours unless the text colour is chosen', () => {
  expect(clampPrefs({}).brandInk).toBe(BRAND_INK_ORIGINAL)
  expect(clampPrefs({ brandInk: BRAND_INK_TEXT }).brandInk).toBe(BRAND_INK_TEXT)
  expect(clampPrefs({ brandInk: 'mono' }).brandInk).toBe(BRAND_INK_ORIGINAL)
})

test('"follow the brand" puts the crab under Claude and Deepy under DeepSeek; a fixed choice stands', () => {
  expect(resolveMascot(clampPrefs({ brand: BRAND_CLAUDE }))).toBe(MASCOT_CRAB)
  expect(resolveMascot(clampPrefs({ brand: BRAND_DEEPSEEK }))).toBe(MASCOT_DEEPY)
  expect(resolveMascot(clampPrefs({ brand: BRAND_DEEPSEEK, mascot: MASCOT_CRAB }))).toBe(MASCOT_CRAB)
  expect(resolveMascot(clampPrefs({ mascot: MASCOT_OFF }))).toBe(MASCOT_OFF)
})
