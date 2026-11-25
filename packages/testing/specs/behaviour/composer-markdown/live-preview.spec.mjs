/**
 * The built plugin's preference mounts a live preview and hands the editor back.
 *
 * @capability composer-markdown
 * @features composer-markdown
 * @risk The setting mounts no preview, typing does not update it, or disabling leaves foreign DOM in the host composer.
 */
import { host, spec, surface } from '../../fixtures/behaviour.mjs'

const INPUT = host('composer.input')
const PREVIEW = surface('composer-markdown.preview')

export default spec({ page: 'composer' }, ({ test }) => {
  test('the preference mounts, updates and removes the Markdown preview', async (t) => {
    const input = t.page.locator(INPUT).first()
    t.expectThat.equal(await t.page.locator(PREVIEW).count(), 0, 'the default leaves the host composer untouched')

    await t.prefs({ composerMarkdown: true })
    await input.fill('# Preview title\n\n**live**')
    const source = await input.innerText()
    const preview = t.page.locator(PREVIEW).first()
    await preview.locator('h1').waitFor({ state: 'visible' })
    t.expectThat.equal(await preview.locator('h1').textContent(), 'Preview title', 'the heading renders from the current draft')
    t.expectThat.equal(await preview.locator('strong').textContent(), 'live', 'inline markup follows the input')
    t.expectThat.equal(await input.innerText(), source, 'the host editor keeps the Markdown source')

    await t.prefs({ composerMarkdown: false })
    t.expectThat.equal(await t.page.locator(PREVIEW).count(), 0, 'disabling removes the preview node')
    t.expectThat.equal(await input.innerText(), source, 'disabling leaves the draft untouched')
  })
})
