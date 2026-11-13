/**
 * What the stored colour schemes read back as: each record is one JSON string
 * in a plain string list, and the earlier single custom card carries in as the
 * scheme `custom`, so a reader's colours and selection survive the change of
 * shape and one unreadable record costs only itself.
 *
 * @capability preferences
 * @features core, contracts, brand, settings
 * @risk A reader who upgrades loses the colours they picked, or one hand-edited record empties the whole scheme list.
 */
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { PALETTE_COLORING_BRAND, PALETTE_PRESETS, clampPrefs } from '@dsh-claude-style/contracts/prefs'
import {
  PALETTE_SCHEME_LIMIT, PALETTE_SCHEME_NAME_MAX, carryCustomPalette, normalizePaletteSchemes, parsePaletteScheme, serializePaletteScheme,
} from '@dsh-claude-style/contracts/palette-schemes'

const PRESETS: readonly string[] = PALETTE_PRESETS

let reported: string[]
beforeEach(() => {
  reported = []
  // cost: D12 — a record left out is reported once through the console, which is the thing the read promises to do.
  vi.spyOn(console, 'error').mockImplementation((message: string) => { reported.push(message) })
})
afterEach(() => { vi.restoreAllMocks() })

test('a record reads back the colours it carries and falls to its base preset for the rest', () => {
  const scheme = parsePaletteScheme('{"id":"night","name":" Night ","base":"deepseek","accent":"#C9844F","background":{"dark":"#1B1A18"},"edges":"surface"}', PRESETS)
  expect(scheme).toEqual({ id: 'night', name: 'Night', base: 'deepseek', accent: '#c9844f', background: { dark: '#1b1a18' }, edges: 'surface' })
  expect(scheme.code).toBeUndefined()
})

test('a record written out reads back as the same scheme, in one fixed key order', () => {
  const scheme = parsePaletteScheme('{"link":{"light":"#112233","dark":"#445566"},"base":"claude","id":"night","code":{"light":"#000000"},"name":"Night"}', PRESETS)
  const text = serializePaletteScheme(scheme)
  expect(text).toBe('{"id":"night","name":"Night","base":"claude","code":{"light":"#000000"},"link":{"light":"#112233","dark":"#445566"}}')
  expect(parsePaletteScheme(text, PRESETS)).toEqual(scheme)
})

test('a preset\'s override record names the preset as its base and carries no name', () => {
  expect(parsePaletteScheme('{"id":"claude","code":{"dark":"#e8a08a"}}', PRESETS)).toEqual({ id: 'claude', name: '', base: 'claude', code: { dark: '#e8a08a' } })
  expect(serializePaletteScheme(parsePaletteScheme('{"id":"claude","base":"claude","accent":"#d97757"}', PRESETS))).toBe('{"id":"claude","accent":"#d97757"}')
  expect(() => parsePaletteScheme('{"id":"claude","base":"deepseek"}', PRESETS)).toThrow('starts from that preset')
  expect(() => parsePaletteScheme('{"id":"claude","name":"Mine"}', PRESETS)).toThrow('carries no name')
})

test('a record that breaks a rule is refused with the rule it broke', () => {
  const refused: [string, string][] = [
    ['not json', 'JSON'],
    ['[]', 'not an object'],
    ['{"base":"claude"}', 'the id'],
    ['{"id":"Night","base":"claude"}', 'the id'],
    ['{"id":"brand","base":"claude"}', 'follow-the-brand'],
    ['{"id":"night"}', 'base is not a preset'],
    ['{"id":"night","base":"pink"}', 'base is not a preset'],
    ['{"id":"night","base":"claude","accent":"red"}', 'accent is not a #rrggbb colour'],
    ['{"id":"night","base":"claude","background":["#ffffff","#000000"]}', 'background is not an object'],
    ['{"id":"night","base":"claude","code":{"dark":"#12"}}', 'code.dark is not a #rrggbb colour'],
    ['{"id":"night","base":"claude","edges":"glow"}', 'edges is not one of'],
    [`{"id":"night","base":"claude","name":"${'n'.repeat(PALETTE_SCHEME_NAME_MAX + 1)}"}`, 'longer than'],
  ]
  for (const [text, rule] of refused) expect(() => parsePaletteScheme(text, PRESETS), text).toThrow(rule)
})

test('keys this build does not know are left out of a record a newer build wrote', () => {
  expect(parsePaletteScheme('{"id":"night","base":"claude","glow":3}', PRESETS)).toEqual({ id: 'night', name: '', base: 'claude' })
})

test('an unreadable or repeated record is left out and named, and the others stay', () => {
  const { entries, problems } = normalizePaletteSchemes([
    '{"id":"a","base":"claude"}',
    'broken',
    '{"id":"a","base":"deepseek"}',
    '{"id":"b","base":"deepseek"}',
  ], PRESETS)
  expect(entries).toEqual(['{"id":"a","base":"claude"}', '{"id":"b","base":"deepseek"}'])
  expect(problems).toHaveLength(2)
  expect(problems[0]).toContain('scheme 2')
  expect(problems[1]).toContain('repeats an earlier record')
})

test('the stored list is cut to its limit', () => {
  const many = Array.from({ length: PALETTE_SCHEME_LIMIT + 4 }, (_, at) => `{"id":"s${at}","base":"claude"}`)
  expect(clampPrefs({ paletteSchemes: many }).paletteSchemes).toHaveLength(PALETTE_SCHEME_LIMIT)
})

test('the earlier custom card carries in as the scheme custom: one code colour for both appearances, the brand it was drawn over as its base', () => {
  const read = clampPrefs({ brand: 'deepseek', paletteColors: 'custom', customAccent: '#1A7F5A', customCanvasLight: '#fafafa', customCode: '#123456' })
  expect(read.paletteSchemes.map(entry => parsePaletteScheme(entry, PRESETS))).toEqual([{
    id: 'custom', name: '', base: 'deepseek', accent: '#1a7f5a', background: { light: '#fafafa' }, code: { light: '#123456', dark: '#123456' },
  }])
  expect([read.customAccent, read.customCanvasLight, read.customCanvasDark, read.customCode]).toEqual(['', '', '', ''])
  expect(read.paletteColors).toBe('custom')
})

test('the custom card selected with no colour picked carries in as a scheme with nothing of its own; unselected and unpicked, nothing is carried in', () => {
  expect(clampPrefs({ paletteColors: 'custom' }).paletteSchemes).toEqual(['{"id":"custom","base":"claude"}'])
  expect(clampPrefs({}).paletteSchemes).toEqual([])
  expect(clampPrefs({ paletteColors: 'claude' }).paletteSchemes).toEqual([])
})

test('a colour picked while another card was selected is still carried in, and the selection stays', () => {
  const read = clampPrefs({ paletteColors: 'deepseek', customCode: '#123456' })
  expect(read.paletteColors).toBe('deepseek')
  expect(read.paletteSchemes).toHaveLength(1)
})

test('a custom scheme already stored wins over the earlier card\'s fields', () => {
  const stored = '{"id":"custom","base":"claude","accent":"#111111"}'
  const read = clampPrefs({ paletteSchemes: [stored], paletteColors: 'custom', customAccent: '#222222' })
  expect(read.paletteSchemes).toEqual([stored])
  expect(read.customAccent).toBe('')
})

test('carrying the card in leaves the records alone when there is nothing to carry', () => {
  const records = ['{"id":"night","base":"claude"}']
  expect(carryCustomPalette(records, { accent: '', canvasLight: '', canvasDark: '', code: '' }, 'claude', false, PRESETS)).toEqual(records)
})

test('a selection that names no scheme reads as following the brand and is reported', () => {
  const read = clampPrefs({ paletteColors: 'pink', paletteSchemes: ['{"id":"night","base":"claude"}'] })
  expect(read.paletteColors).toBe(PALETTE_COLORING_BRAND)
  expect(reported).toHaveLength(1)
  expect(reported[0]).toContain('"pink"')
  expect(clampPrefs({ paletteColors: 'night', paletteSchemes: ['{"id":"night","base":"claude"}'] }).paletteColors).toBe('night')
})

test('an unreadable record is reported once and costs only itself', () => {
  const read = clampPrefs({ paletteSchemes: ['{"id":"night","base":"claude"}', '{oops'] })
  expect(read.paletteSchemes).toEqual(['{"id":"night","base":"claude"}'])
  expect(reported).toHaveLength(1)
})

test('what was read back reads back the same, the carried card included', () => {
  const once = clampPrefs({ brand: 'deepseek', paletteColors: 'custom', customAccent: '#1a7f5a', customCode: '#123456', paletteSchemes: ['{"id":"night","base":"claude"}'] })
  expect(clampPrefs(once)).toEqual(once)
})
