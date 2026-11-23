/**
 * The canonical write-back for stored shapes an earlier build wrote
 * (packages/contracts/src/prefs.ts): the browser half writes this patch once
 * per generation, so the legacy mappings and the palette carry can retire.
 *
 * @capability preferences
 * @features core, contracts
 * @risk A reader who upgrades keeps a legacy stored value forever, or the write-back rewrites a choice no declaration maps, or a second pass writes again over what the reader changed since.
 */
import { expect, test } from 'vitest'
import { BRAND_DEEPSEEK, PALETTE_PRESETS, clampPrefs, migrationWriteBack } from '@dsh-claude-style/contracts/prefs'
import { parsePaletteScheme } from '@dsh-claude-style/contracts/palette-schemes'

test('every declared legacy value is written back as the value it reads as', () => {
  const patch = migrationWriteBack({ brand: 'off', statusDetail: 'simple', autoPopover: false, pageZoom: '0.8', chatAnimations: 'off', statsPosition: 'context' })
  expect(patch).toEqual({ brand: BRAND_DEEPSEEK, statusDetail: false, autoPopover: 'off', pageZoom: '80', chatAnimations: false, statsPosition: 'off' })
  expect(migrationWriteBack({ statsPosition: 'rail' })).toEqual({ statsPosition: 'inline' })
})

test('canonical, unmapped and absent values produce no write', () => {
  expect(migrationWriteBack({ brand: 'claude', statusDetail: true, autoPopover: 'all', pageZoom: '100', chatAnimations: true })).toBeNull()
  expect(migrationWriteBack({ brand: 'anthropic', pageZoom: 'wide' })).toBeNull()
  expect(migrationWriteBack({})).toBeNull()
  expect(migrationWriteBack(null)).toBeNull()
})

test('a stored accent becomes a scheme record and the earlier fields are emptied', () => {
  const patch = migrationWriteBack({ brandAccent: '#1A7F5A' })
  expect(patch).not.toBeNull()
  expect(patch!.brandAccent).toBe('')
  expect(patch!.customAccent).toBe('')
  expect(patch!.paletteColors).toBe('custom')
  const schemes = (patch!.paletteSchemes ?? []).map(entry => parsePaletteScheme(entry, PALETTE_PRESETS))
  expect(schemes).toEqual([{ id: 'custom', name: '', base: 'claude', accent: '#1a7f5a' }])
})

test('the earlier four-colour card is carried into the scheme records', () => {
  const patch = migrationWriteBack({ customAccent: '#1a7f5a', customCanvasLight: '#faf9f5', customCanvasDark: '#161616', paletteColors: 'custom' })
  expect(patch).not.toBeNull()
  expect(patch!.customAccent).toBe('')
  expect(patch!.customCanvasLight).toBe('')
  expect(patch!.customCanvasDark).toBe('')
  const schemes = (patch!.paletteSchemes ?? []).map(entry => parsePaletteScheme(entry, PALETTE_PRESETS))
  expect(schemes).toEqual([{ id: 'custom', name: '', base: 'claude', accent: '#1a7f5a', background: { light: '#faf9f5', dark: '#161616' } }])
})

test('the retired inline-code choice is carried and reads as the palette', () => {
  const patch = migrationWriteBack({ inlineCodeColor: 'classic' })
  expect(patch).not.toBeNull()
  expect(patch!.inlineCodeColor).toBe('palette')
  expect((patch!.paletteSchemes ?? []).length).toBeGreaterThan(0)
})

test('a value the write-back produced needs no second write', () => {
  for (const stored of [{ brand: 'off', pageZoom: '0.8' }, { brandAccent: '#1A7F5A' }, { customAccent: '#1a7f5a', paletteColors: 'custom' }, { inlineCodeColor: 'classic' }]) {
    const patch = migrationWriteBack(stored)
    expect(patch).not.toBeNull()
    expect(migrationWriteBack({ ...stored, ...patch })).toBeNull()
    expect(clampPrefs({ ...stored, ...patch })).toEqual(clampPrefs(stored))
  }
})
