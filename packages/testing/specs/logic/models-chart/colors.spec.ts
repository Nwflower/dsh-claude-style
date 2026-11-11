/**
 * Model identity, rather than usage rank, selects a categorical colour shared by
 * the chart and its legend.
 *
 * @capability models-chart
 * @features home
 * @risk Models become indistinguishable or change colour when their token order moves.
 */
import { expect, test } from 'vitest'
import { HOME_MODEL_COLOUR_COUNT, createHomeModelColours } from '@dsh-claude-style/client/pure'

const ids = Array.from({ length: HOME_MODEL_COLOUR_COUNT }, (_, index) => `model-${index}`)

test('a full chart gives every model a different colour in the declared wheel', () => {
  const colours = createHomeModelColours()(ids)
  expect(new Set(Object.values(colours)).size).toBe(HOME_MODEL_COLOUR_COUNT)
  expect(Object.values(colours)).toEqual(expect.arrayContaining(Array.from({ length: HOME_MODEL_COLOUR_COUNT }, (_, index) => index)))
})

test('rank and input order changes keep every model on the same colour', () => {
  const assign = createHomeModelColours()
  const before = assign(ids)
  expect(assign([...ids].reverse())).toEqual(before)
  expect(assign(['model-8', 'model-2', 'model-5'])).toEqual({
    'model-2': before['model-2'],
    'model-5': before['model-5'],
    'model-8': before['model-8'],
  })
})

test('models beyond the wheel keep a valid colour', () => {
  const colours = createHomeModelColours()([...ids, 'model-extra', 'model-other'])
  for (const colour of Object.values(colours)) {
    expect(Number.isInteger(colour)).toBe(true)
    expect(colour >= 0 && colour < HOME_MODEL_COLOUR_COUNT).toBe(true)
  }
})
