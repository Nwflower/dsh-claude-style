/**
 * The edits the colour scheme manager makes to the stored records: a scheme is
 * stored, selected, copied and deleted, and a preset's override is dropped
 * once it carries nothing, so every way out of the manager leaves a list the
 * preference clamp reads back whole.
 *
 * @capability preferences
 * @features settings, contracts
 * @risk Deleting or editing a scheme leaves a selection that names nothing, an empty override record that keeps a preset on the slow path, or a copy that shares its source's id.
 */
import { expect, test } from 'vitest'
import { clampPrefs } from '@dsh-claude-style/contracts/prefs'
import { PALETTE_SCHEME_LIMIT, parsePaletteScheme } from '@dsh-claude-style/contracts/palette-schemes'
import { canAddScheme, contrastRatio, duplicateScheme, newSchemeId, removeSchemePatch, selectSchemePatch, storedSchemes, storeSchemePatch } from '@dsh-claude-style/client/pure'

const PRESETS = ['claude', 'deepseek']
const NIGHT = '{"id":"night","name":"Night","base":"deepseek","accent":"#112233"}'

/** The preferences after a patch, read back through the clamp as the store would. */
function applied(prefs: ReturnType<typeof clampPrefs>, patch: object) {
  return clampPrefs({ ...prefs, ...patch })
}

test('a new scheme is stored after the others and an edited one is replaced in place', () => {
  const prefs = clampPrefs({ paletteSchemes: [NIGHT] })
  const added = applied(prefs, storeSchemePatch(prefs, { id: 'dawn', name: 'Dawn', base: 'claude' }))
  expect(storedSchemes(added).map((scheme) => scheme.id)).toEqual(['night', 'dawn'])
  const edited = applied(added, storeSchemePatch(added, { id: 'night', name: 'Night', base: 'deepseek', accent: '#445566' }))
  expect(storedSchemes(edited).map((scheme) => [scheme.id, scheme.accent])).toEqual([['night', '#445566'], ['dawn', undefined]])
})

test('storing a scheme leaves the selection alone and selecting stores it and names it', () => {
  const prefs = clampPrefs({ paletteColors: 'deepseek' })
  const scheme = { id: 'dawn', name: 'Dawn', base: 'claude' }
  expect(applied(prefs, storeSchemePatch(prefs, scheme)).paletteColors).toBe('deepseek')
  const selected = applied(prefs, selectSchemePatch(prefs, scheme))
  expect(selected.paletteColors).toBe('dawn')
  expect(storedSchemes(selected)).toHaveLength(1)
})

test('a preset\'s override is dropped once it carries no colour, and stays while it carries one', () => {
  const prefs = clampPrefs({ paletteSchemes: ['{"id":"claude","accent":"#112233"}'] })
  const kept = applied(prefs, storeSchemePatch(prefs, { id: 'claude', name: '', base: 'claude', accent: '#445566' }))
  expect(kept.paletteSchemes).toEqual(['{"id":"claude","accent":"#445566"}'])
  const dropped = applied(prefs, storeSchemePatch(prefs, { id: 'claude', name: '', base: 'claude' }))
  expect(dropped.paletteSchemes).toEqual([])
  expect(applied(clampPrefs({}), storeSchemePatch(clampPrefs({}), { id: 'claude', name: '', base: 'claude' })).paletteSchemes).toEqual([])
})

test('deleting the selected scheme returns the selection to following the brand; deleting another leaves it', () => {
  const prefs = clampPrefs({ paletteSchemes: [NIGHT, '{"id":"dawn","base":"claude"}'], paletteColors: 'night' })
  const gone = applied(prefs, removeSchemePatch(prefs, 'night'))
  expect(gone.paletteColors).toBe('brand')
  expect(storedSchemes(gone).map((scheme) => scheme.id)).toEqual(['dawn'])
  expect(applied(prefs, removeSchemePatch(prefs, 'dawn')).paletteColors).toBe('night')
})

test('dropping a selected preset\'s override keeps that preset selected', () => {
  const prefs = clampPrefs({ paletteSchemes: ['{"id":"claude","accent":"#112233"}'], paletteColors: 'claude' })
  const restored = applied(prefs, removeSchemePatch(prefs, 'claude'))
  expect(restored.paletteColors).toBe('claude')
  expect(restored.paletteSchemes).toEqual([])
})

test('a new id is the first one no record uses', () => {
  expect(newSchemeId(clampPrefs({}))).toBe('scheme-1')
  const prefs = clampPrefs({ paletteSchemes: ['{"id":"scheme-1","base":"claude"}', '{"id":"scheme-3","base":"claude"}'] })
  expect(newSchemeId(prefs)).toBe('scheme-2')
})

test('a copy takes a new id and name and keeps every colour of its source, a preset\'s override included', () => {
  const prefs = clampPrefs({ paletteSchemes: [NIGHT, '{"id":"claude","code":{"dark":"#e8a08a"}}'] })
  const [night, claude] = storedSchemes(prefs)
  const fromNight = duplicateScheme(prefs, night, 'Night copy')
  expect(fromNight).toEqual({ id: 'scheme-1', name: 'Night copy', base: 'deepseek', accent: '#112233' })
  const fromPreset = duplicateScheme(prefs, claude, 'Claude copy')
  expect(fromPreset).toEqual({ id: 'scheme-1', name: 'Claude copy', base: 'claude', code: { dark: '#e8a08a' } })
  expect(parsePaletteScheme(JSON.stringify(fromPreset), PRESETS).id).toBe('scheme-1')
})

test('another scheme fits only while the records are under the limit', () => {
  const many = Array.from({ length: PALETTE_SCHEME_LIMIT }, (_, at) => `{"id":"s${at}","base":"claude"}`)
  expect(canAddScheme(clampPrefs({ paletteSchemes: many.slice(0, PALETTE_SCHEME_LIMIT - 1) }))).toBe(true)
  expect(canAddScheme(clampPrefs({ paletteSchemes: many }))).toBe(false)
  const full = clampPrefs({ paletteSchemes: many })
  expect(() => storeSchemePatch(full, { id: 'extra', name: '', base: 'claude' })).toThrow('record limit')
  expect(() => storeSchemePatch(full, { id: 'claude', name: '', base: 'claude', accent: '#112233' })).toThrow('record limit')
  const edited = applied(full, storeSchemePatch(full, { id: 's0', name: 'Updated', base: 'claude' }))
  expect(storedSchemes(edited)).toHaveLength(PALETTE_SCHEME_LIMIT)
  expect(storedSchemes(edited)[0].name).toBe('Updated')
})

test('the contrast read-out follows WCAG: black on white is 21, a colour on itself is 1, and the order of the pair does not matter', () => {
  expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
  expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1, 5)
  expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(contrastRatio('#ffffff', '#777777'), 10)
  expect(contrastRatio('#777777', '#ffffff')).toBeGreaterThan(4.4)
  expect(contrastRatio('#777777', '#ffffff')).toBeLessThan(4.6)
})
