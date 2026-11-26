/**
 * The draft renders in place over the host's own lines without writing into the editor (D115).
 * @capability composer-markdown
 * @features composer-markdown, engine
 * @risk Unsafe draft HTML executes, a formula loses its layout, the editor's DOM or text changes, the block under the caret stays rendered, or a rendering outlives its composer.
 */
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { COMPOSER_MARKDOWN_SHEET, composerLineAt, installComposerMarkdown, readComposerLines, renderComposerBlock, splitComposerBlocks } from '@dsh-claude-style/client/mechanisms'
import { COMPOSER_CARD_SELECTOR, COMPOSER_COMPOSING_ATTRIBUTE, COMPOSER_INPUT_SELECTOR, COMPOSER_LINE_TEXT_SELECTOR, COMPOSER_SCROLL_SELECTOR, COMPOSER_TEXT_REF_ATTRIBUTE, HOST_MATH_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { adoptSkin } from '@dsh-claude-style/engine/skin'
import { hostElement } from '../../fixtures/host-markup'
import { surfaceAttribute, surfaceSelector } from '../../fixtures/surface'
import { TEST_SKIN } from '../../fixtures/vocabulary'

adoptSkin(TEST_SKIN)
const BLOCK = surfaceSelector('composer-markdown.block')
const CARD_MARK = surfaceAttribute('composer-markdown.card')
const SKIN_ROOT = surfaceAttribute('skin.root')
let stop: (() => void) | null = null
const sheets: HTMLStyleElement[] = []

beforeEach(() => {
  document.body.setAttribute(SKIN_ROOT, '')
  const sheet = document.createElement('style')
  sheet.textContent = COMPOSER_MARKDOWN_SHEET
  document.head.append(sheet)
  sheets.push(sheet)
})

afterEach(() => {
  stop?.()
  stop = null
  for (const sheet of sheets.splice(0)) sheet.remove()
  document.body.removeAttribute(SKIN_ROOT)
  document.body.replaceChildren()
})

/** A text span as Lexical mounts one line of text. */
function textSpan(text: string) {
  const span = hostElement(COMPOSER_LINE_TEXT_SELECTOR, 'true')
  span.textContent = text
  return span
}

/** One Lexical paragraph: a span per non-empty line, a `<br>` between lines, and the extra `<br>` after a final break. */
function paragraph(lines: string[]) {
  const element = document.createElement('p')
  lines.forEach((line, index) => {
    if (line !== '') element.append(textSpan(line))
    if (index < lines.length - 1) element.append(document.createElement('br'))
  })
  if (lines.at(-1) === '') element.append(document.createElement('br'))
  return element
}

function composer(lines: string[]) {
  const card = hostElement(COMPOSER_CARD_SELECTOR)
  const scroll = hostElement(COMPOSER_SCROLL_SELECTOR)
  const grow = document.createElement('div')
  grow.style.cssText = 'position: relative; width: 480px'
  const input = hostElement(COMPOSER_INPUT_SELECTOR)
  input.contentEditable = 'true'
  input.style.cssText = 'font: 14px/24px sans-serif; white-space: pre-wrap'
  input.append(paragraph(lines))
  grow.append(input)
  scroll.append(grow)
  card.append(scroll)
  document.body.append(card)
  return { card, input }
}

/** The line's own span: the paragraph's text children in order. */
function lineSpan(input: HTMLElement, index: number) {
  return input.querySelectorAll<HTMLElement>(COMPOSER_LINE_TEXT_SELECTOR)[index]!
}

function caretInto(node: Node, offset: number) {
  const range = document.createRange()
  range.setStart(node, offset)
  range.collapse(true)
  const selection = document.getSelection()!
  selection.removeAllRanges()
  selection.addRange(range)
}

test('blocks render sanitized, and a formula keeps the layout KaTeX builds for it', () => {
  const { blocks, links } = splitComposerBlocks(['<img src=x onerror=alert(1) style="color:red"><script>alert(2)</script>', '', '- [x] done', '', '能量 $E=mc^2$ 守恒'])
  const unsafe = renderComposerBlock(blocks[0]!.token, links)
  expect(unsafe?.querySelector('script, style, [onerror], [style]')).toBeNull()
  expect(renderComposerBlock(blocks[1]!.token, links)?.querySelector('input[type="checkbox"]')?.hasAttribute('disabled')).toBe(true)
  const formula = renderComposerBlock(blocks[2]!.token, links)!
  const math = formula.querySelector(HOST_MATH_SELECTOR)
  expect(math?.querySelector('annotation[encoding="application/x-tex"]')?.textContent).toBe('E=mc^2')
  expect(math?.querySelector('[style]')).not.toBeNull()
  expect(formula.textContent).toContain('能量')
})

test('a display fence interrupts the paragraph above it, as the host renders it, and blocks map onto the lines they span', () => {
  const { blocks, links } = splitComposerBlocks(['# Title', 'lead', '$$', '\\int_0^1 x^2\\,dx', '$$', 'tail', '', '[ref]: https://example.com'])
  expect(blocks.map(block => [block.token.type, block.first, block.last])).toEqual([['heading', 0, 0], ['paragraph', 1, 1], ['blockKatex', 2, 4], ['paragraph', 5, 5], ['def', 7, 7]])
  expect(renderComposerBlock(blocks[2]!.token, links)?.querySelector('.katex-display')).not.toBeNull()
  expect(renderComposerBlock(blocks[4]!.token, links)).toBeNull()
})

test('lines follow the editor’s breaks, and widgets make a line unrenderable', () => {
  const p = paragraph(['one', '', 'three', ''])
  const reference = textSpan('@file')
  reference.setAttribute(COMPOSER_TEXT_REF_ATTRIBUTE, '')
  const widgetLine = document.createElement('p')
  widgetLine.append(textSpan('see '), reference)
  const empty = document.createElement('p')
  empty.append(document.createElement('br'))
  const input = hostElement(COMPOSER_INPUT_SELECTOR)
  input.append(p, widgetLine, empty)
  const lines = readComposerLines(input)
  expect(lines.map(line => [line.paragraph, line.text, line.plain])).toEqual([[1, 'one', true], [1, '', true], [1, 'three', true], [1, '', true], [2, 'see @file', false], [3, '', true]])
  expect(lines[2]).toMatchObject({ items: [4], terminator: 5 })
  expect(composerLineAt(input, lines, p.children[3]!.firstChild!, 1)).toBe(2)
  expect(composerLineAt(input, lines, p, 1)).toBe(0)
  expect(composerLineAt(input, lines, p, p.childNodes.length)).toBe(3)
  expect(composerLineAt(input, lines, input, 2)).toBe(5)
})

test('an unfocused draft renders every block over its source, and the editor keeps its DOM', async () => {
  const { card, input } = composer(['# Heading', '', '$$', 'x^2', '$$', 'plain **bold**'])
  const before = input.innerHTML
  stop = installComposerMarkdown()
  await vi.waitFor(() => {
    expect(card.querySelectorAll(BLOCK)).toHaveLength(3)
    expect(getComputedStyle(lineSpan(input, 0)).color).toBe('rgba(0, 0, 0, 0)')
  })
  const blocks = [...card.querySelectorAll<HTMLElement>(BLOCK)]
  expect(blocks[0]!.querySelector('h1')?.textContent).toBe('Heading')
  expect(blocks[1]!.querySelector('.katex-display')).not.toBeNull()
  expect(blocks[2]!.querySelector('strong')?.textContent).toBe('bold')
  expect(card.hasAttribute(CARD_MARK)).toBe(true)
  // The fence's later lines leave the layout; its first line holds the rendering's height.
  expect(getComputedStyle(lineSpan(input, 2)).display).toBe('none')
  expect(getComputedStyle(lineSpan(input, 3)).display).toBe('none')
  await vi.waitFor(() => {
    expect(Math.round(lineSpan(input, 1).getBoundingClientRect().height)).toBe(Math.ceil(blocks[1]!.getBoundingClientRect().height))
    expect(Math.round(blocks[1]!.getBoundingClientRect().top)).toBe(Math.round(lineSpan(input, 1).getBoundingClientRect().top))
  })
  expect(input.innerHTML).toBe(before)
})

test('the block under the caret shows its source and the others stay rendered', async () => {
  const { card, input } = composer(['# Heading', '', 'plain **bold**'])
  stop = installComposerMarkdown()
  await vi.waitFor(() => expect(card.querySelectorAll(BLOCK)).toHaveLength(2))
  input.focus()
  caretInto(lineSpan(input, 0).firstChild!, 3)
  await vi.waitFor(() => {
    expect(card.querySelectorAll(BLOCK)).toHaveLength(1)
    expect(getComputedStyle(lineSpan(input, 0)).color).not.toBe('rgba(0, 0, 0, 0)')
  })
  expect(card.querySelector(BLOCK)?.querySelector('strong')).not.toBeNull()
  input.blur()
  await vi.waitFor(() => expect(card.querySelectorAll(BLOCK)).toHaveLength(2))
})

test('a composition in flight freezes the blocks, and a widget keeps its block in source', async () => {
  const { card, input } = composer(['**one**'])
  stop = installComposerMarkdown()
  await vi.waitFor(() => expect(card.querySelectorAll(BLOCK)).toHaveLength(1))
  input.setAttribute(COMPOSER_COMPOSING_ATTRIBUTE, '')
  lineSpan(input, 0).textContent = '**two**'
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  expect(card.querySelector(BLOCK)?.textContent?.trim()).toBe('one')
  input.removeAttribute(COMPOSER_COMPOSING_ATTRIBUTE)
  input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
  await vi.waitFor(() => expect(card.querySelector(BLOCK)?.textContent?.trim()).toBe('two'))

  const reference = textSpan('@file')
  reference.setAttribute(COMPOSER_TEXT_REF_ATTRIBUTE, '')
  input.firstElementChild!.append(reference)
  await vi.waitFor(() => expect(card.querySelectorAll(BLOCK)).toHaveLength(0))
})

test('a late composer renders and teardown hands every line back', async () => {
  stop = installComposerMarkdown()
  const { card, input } = composer(['> quoted'])
  await vi.waitFor(() => expect(card.querySelector(BLOCK)?.querySelector('blockquote')?.textContent?.trim()).toBe('quoted'))
  stop()
  stop = null
  expect(card.querySelector(BLOCK)).toBeNull()
  expect(card.hasAttribute(CARD_MARK)).toBe(false)
  expect(getComputedStyle(lineSpan(input, 0)).color).not.toBe('rgba(0, 0, 0, 0)')
  expect(input.textContent).toBe('> quoted')
})

test('editing a reference link definition updates blocks that reference it', async () => {
  const { card, input } = composer(['[site][ref]', '', '[ref]: https://one.example'])
  stop = installComposerMarkdown()
  await vi.waitFor(() => expect(card.querySelector<HTMLAnchorElement>(`${BLOCK} a`)?.href).toBe('https://one.example/'))
  lineSpan(input, 1).textContent = '[ref]: https://two.example'
  await vi.waitFor(() => expect(card.querySelector<HTMLAnchorElement>(`${BLOCK} a`)?.href).toBe('https://two.example/'))
})
