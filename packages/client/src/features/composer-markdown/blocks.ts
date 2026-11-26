/**
 * The draft's Markdown blocks and their sanitized rendering (D115). Formulas
 * follow the host's message rules: `$…$` and `$$…$$` inside a line are inline,
 * `$$` fences on lines of their own are a display block, even straight under a
 * paragraph line.
 */
import DOMPurify from 'dompurify'
import katex from 'katex'
import { Marked } from 'marked'
import type { Token, Tokens, TokensList } from 'marked'
import markedKatex from 'marked-katex-extension'

/** Marks a formula placeholder; its text is the TeX source and its value the mode. */
const MATH_ATTRIBUTE = 'data-dsh-claude-math'

/** Placeholder markup for one formula: KaTeX draws it only after the HTML is sanitized. */
function placeholder(tag: 'span' | 'div', mode: 'inline' | 'display', tex: string) {
  const element = document.createElement(tag)
  element.setAttribute(MATH_ATTRIBUTE, mode)
  element.textContent = tex
  return element.outerHTML
}

/**
 * Where a `$$` fence line begins in a paragraph's remaining source. The host's
 * renderer lets such a fence interrupt the paragraph above it, as a code fence
 * does; Marked cuts a paragraph only where a block extension says one starts.
 * Marked hands over the source from its second character, so a match is
 * always preceded by its line break.
 */
function displayFenceStart(source: string) {
  const match = /\n\$\$(?=\n)/.exec(source)
  return match === null ? undefined : match.index + 1
}

// The extension's tokenizers find the formulas; the renderers registered after
// it take precedence and emit placeholders in place of KaTeX's styled HTML,
// which the sanitizer below would strip. Its non-standard rule accepts a `$`
// next to any character, as the host's message renderer does for Chinese text.
const katexExtension = markedKatex({ nonStandard: true })
const markdown = new Marked(
  { gfm: true, breaks: true },
  { extensions: katexExtension.extensions!.map(extension => extension.name === 'blockKatex' ? { ...extension, start: displayFenceStart } : extension) },
  {
    extensions: [
      { name: 'inlineKatex', renderer: token => placeholder('span', 'inline', (token as Tokens.Generic).text as string) },
      { name: 'blockKatex', renderer: token => placeholder('div', 'display', (token as Tokens.Generic).text as string) },
    ],
  },
)

export interface DraftBlock {
  /** Index of the block's first line in the draft. */
  first: number
  /** Index of the block's last line in the draft. */
  last: number
  token: Token
}

export interface DraftBlocks {
  blocks: DraftBlock[]
  /** Reference-style link definitions, which a block reads from anywhere in the draft. */
  links: TokensList['links']
}

/** Lex the draft and place each top-level block on the lines its source spans. */
export function splitBlocks(lines: readonly string[]): DraftBlocks {
  const tokens = markdown.lexer(lines.join('\n'))
  const blocks: DraftBlock[] = []
  let line = 0
  for (const token of tokens) {
    const breaks = token.raw.split('\n').length - 1
    if (token.type !== 'space') {
      const ownBreaks = token.raw.replace(/\n+$/, '').split('\n').length - 1
      blocks.push({ first: line, last: line + ownBreaks, token })
    }
    line += breaks
  }
  return { blocks, links: tokens.links }
}

/**
 * One block as sanitized DOM with its formulas drawn, or null where it renders
 * to nothing a reader could see (a link definition, an HTML comment).
 * Scripts, handlers and inline styles never reach the page; KaTeX builds its
 * own nodes, so the styles it needs come from KaTeX and the `trust: false`
 * default keeps `\href` and the like inert.
 */
export function renderBlock(token: Token, links: TokensList['links']): DocumentFragment | null {
  const list = Object.assign([token], { links }) as TokensList
  const html = markdown.parser(list)
  const fragment = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style'],
    FORBID_ATTR: ['style'],
    RETURN_DOM_FRAGMENT: true,
  })
  for (const element of fragment.querySelectorAll<HTMLElement>('[' + MATH_ATTRIBUTE + ']')) {
    katex.render(element.textContent ?? '', element, {
      displayMode: element.getAttribute(MATH_ATTRIBUTE) === 'display',
      throwOnError: false,
      strict: 'ignore',
    })
  }
  const visible = (fragment.textContent ?? '').trim() !== '' || fragment.querySelector('hr, img, input, table') !== null
  return visible ? fragment : null
}
