/**
 * The account row's picture is decoupled from the page's opening path (#211):
 * it stands at the foot of the page, outside the first screen almost always,
 * so it is handed to the browser as a lazy, asynchronously decoded image and
 * the opening paint does not queue its fetch or its decode.
 *
 * @capability account-menu
 * @features account
 * @risk A reader's first paint stalls behind an off-screen picture's fetch and decode at the foot of the page.
 */
import { spec } from '../../fixtures/behaviour.mjs'

/** The row's picture: the image inside the account row the surface table names. */
async function photo(t) {
  return t.page.evaluate((row) => {
    const accountRow = document.querySelector(row)
    const image = accountRow === null ? null : accountRow.querySelector('img[loading]')
    return image === null ? null : {
      loading: image.getAttribute('loading'),
      decoding: image.getAttribute('decoding'),
    }
  }, t.surface('account.row'))
}

export default spec({ page: 'shell' }, ({ test }) => {
  test('the account row\'s picture loads lazily and decodes asynchronously', async (t) => {
    // The profile answers on its own clock: wait for the picture by name,
    // not for a slice of time.
    await t.page.waitForFunction((row) => {
      const accountRow = document.querySelector(row)
      return accountRow !== null && accountRow.querySelector('img') !== null
    }, t.surface('account.row'), { timeout: 10000 })
    await t.settle()
    const picture = await photo(t)
    t.expectThat.equal(picture, { loading: 'lazy', decoding: 'async' },
      'the picture is handed to the browser lazy and asynchronous')
  })
})
