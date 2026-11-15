/**
 * Ctrl+U / Cmd+U opens the composer's native file picker through the same input
 * the host's File action uses, without also running an editor shortcut.
 *
 * @capability composer
 * @features composer
 * @risk The shortcut opens the wrong card, opens repeatedly while held, or deletes text in an editor that also handles Ctrl+U.
 */
import { spec } from '../../fixtures/behaviour.mjs'

async function instrument(t) {
  await t.page.evaluate(() => {
    window.__uploadPicks = 0
    window.__uploadKeys = 0
    const input = document.getElementById('file-picker')
    input.addEventListener('click', (event) => {
      event.preventDefault()
      window.__uploadPicks += 1
    })
    document.getElementById('editor').addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() === 'u') window.__uploadKeys += 1
    })
    document.getElementById('editor').focus()
  })
}

async function counts(t) {
  return t.page.evaluate(() => ({ picks: window.__uploadPicks, keys: window.__uploadKeys }))
}

export default spec({ page: 'composer' }, ({ test }) => {
  test('Ctrl+U and Cmd+U open the native picker once and stop before the editor', async (t) => {
    await instrument(t)
    await t.page.keyboard.press('Control+u')
    await t.page.keyboard.press('Meta+u')
    t.expectThat.equal(await counts(t), { picks: 2, keys: 0 }, 'both platform modifiers open the picker without reaching the editor')
    await t.page.evaluate(() => {
      document.getElementById('editor').dispatchEvent(new KeyboardEvent('keydown', { key: 'u', ctrlKey: true, repeat: true, bubbles: true, cancelable: true }))
    })
    t.expectThat.equal(await counts(t), { picks: 2, keys: 0 }, 'a held key does not open another dialog')
  })

  test('a disabled picker and non-shortcut modifiers leave the key alone', async (t) => {
    await instrument(t)
    await t.page.evaluate(() => { document.getElementById('file-picker').disabled = true })
    await t.page.keyboard.press('Control+u')
    t.expectThat.equal(await counts(t), { picks: 0, keys: 1 }, "a disabled picker leaves the editor's own key route intact")
    await t.page.evaluate(() => { document.getElementById('file-picker').disabled = false })
    await t.page.keyboard.press('Control+Shift+u')
    await t.page.keyboard.press('Alt+Control+u')
    t.expectThat.equal(await counts(t), { picks: 0, keys: 3 }, 'other modifier combinations are not taken')
  })
})
