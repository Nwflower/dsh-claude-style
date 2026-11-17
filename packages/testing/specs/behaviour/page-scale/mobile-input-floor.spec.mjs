/**
 * Editable elements keep a semantic font size of at least 16px under the 768px
 * width mark: phone browsers zoom the whole page when focus lands below that
 * size and never zoom back on blur (#376). Desktop widths keep the compact
 * sizes the skin draws.
 *
 * @capability page-scale
 * @features core
 * @risk A phone browser zooms the page when the reader focuses the composer or a search field, and blur never restores it.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { readInputFloor } from '../../fixtures/input-floor.mjs'

export default spec({ page: 'automode-hero', bands: ['phone', 'wide'] }, ({ test }) => {
  test('editables keep the semantic floor under the width mark and the compact size past it', async t => {
    const reading = await readInputFloor(t)
    t.expectThat.equal(reading.under, reading.width < 768, 'the width mark stands where the viewport is under 768px')
    t.expectThat.equal(reading.sizes.length > 0, true, 'the page draws an editable element')
    t.expectThat.equal(reading.sizes.every((size) => (reading.under ? size >= 16 : size < 16)), true,
      'every editable keeps at least 16px under the mark and the compact size past it')
  })
})
