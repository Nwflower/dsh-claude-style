/**
 * The composer renders a safe live Markdown preview without owning the draft.
 * @capability composer-markdown
 * @features composer-markdown, engine
 * @risk Unsafe draft HTML executes, editing changes the source, or previews outlive their composer.
 */
import { afterEach, expect, test, vi } from 'vitest'
import { installComposerMarkdown, renderComposerMarkdown } from '@dsh-claude-style/client/mechanisms'
import { COMPOSER_CARD_SELECTOR, COMPOSER_INPUT_SELECTOR, COMPOSER_SCROLL_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { adoptSkin } from '@dsh-claude-style/engine/skin'
import { hostElement } from '../../fixtures/host-markup'
import { surfaceSelector } from '../../fixtures/surface'
import { TEST_SKIN } from '../../fixtures/vocabulary'

adoptSkin(TEST_SKIN)
let stopPreview: (() => void) | null = null
afterEach(() => {
  stopPreview?.()
  stopPreview = null
  document.body.replaceChildren()
})

function composer(withScroll = true) {
  const card = hostElement(COMPOSER_CARD_SELECTOR)
  const grow = document.createElement('div')
  const input = hostElement(COMPOSER_INPUT_SELECTOR)
  input.contentEditable = 'true'
  grow.append(input)
  if (withScroll) {
    const scroll = hostElement(COMPOSER_SCROLL_SELECTOR)
    scroll.append(grow)
    card.append(scroll)
  } else card.append(grow)
  return { card, input }
}

function type(input: HTMLElement, source: string) {
  input.innerText = source
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
}

test('GFM renders while scripts, event handlers and inline styles stay out', () => {
  const container = document.createElement('div')
  container.innerHTML = renderComposerMarkdown('# Title\n\n- [x] done\n\n<img src=x onerror=alert(1) style="color:red"><script>alert(2)</script>')
  expect(container.querySelector('h1')?.textContent).toBe('Title')
  expect(container.querySelector('input[type="checkbox"]')?.hasAttribute('disabled')).toBe(true)
  expect(container.querySelector('script, style, [onerror], [style]')).toBeNull()
})

test('input updates the preview, links open safely and an empty draft hides it', async () => {
  const { card, input } = composer()
  document.body.append(card)
  stopPreview = installComposerMarkdown()
  const source = '# Heading\n\n**bold** [site](https://example.com)'
  type(input, source)
  await vi.waitFor(() => {
    const preview = card.querySelector(surfaceSelector('composer-markdown.preview'))
    expect(preview?.querySelector('h1')?.textContent).toBe('Heading')
    expect(preview?.querySelector('strong')?.textContent).toBe('bold')
  })
  const preview = card.querySelector(surfaceSelector('composer-markdown.preview'))
  expect(preview?.querySelector('a')).toMatchObject({ target: '_blank', rel: 'noopener noreferrer' })
  expect(input.innerText).toBe(source)
  expect(input.contentEditable).toBe('true')

  type(input, '')
  await vi.waitFor(() => {
    expect(preview).toMatchObject({ hidden: true, textContent: '' })
  })
})

test('a late composer gains a preview and teardown removes it', async () => {
  const stop = installComposerMarkdown()
  stopPreview = stop
  const { card, input } = composer(false)
  document.body.append(card)
  type(input, '> quoted')
  await vi.waitFor(() => {
    expect(card.querySelector(surfaceSelector('composer-markdown.preview'))?.querySelector('blockquote')?.textContent?.trim()).toBe('quoted')
  })
  stop()
  expect(card.querySelector(surfaceSelector('composer-markdown.preview'))).toBeNull()
  expect(input.innerText).toBe('> quoted')
})
