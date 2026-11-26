/**
 * The draft's lines as the host's Lexical editor lays them out, read from its
 * DOM and never written (D115).
 */
import { COMPOSER_LINE_TEXT_SELECTOR, COMPOSER_TEXT_REF_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'

export interface DraftLine {
  /** 1-based element position of the line's paragraph among the input's children. */
  paragraph: number
  /** 1-based element positions of the line's own children inside its paragraph. */
  items: number[]
  /** 1-based element position of the `<br>` that ends the line, or null where the paragraph ends. */
  terminator: number | null
  text: string
  /** Holds one text span or nothing: no widget the host draws, which a block could not render. */
  plain: boolean
}

function isLineBreak(element: Element) {
  return element.tagName === 'BR'
}

function isPlainText(element: Element) {
  return element.matches(COMPOSER_LINE_TEXT_SELECTOR) && !element.hasAttribute(COMPOSER_TEXT_REF_ATTRIBUTE)
}

/**
 * Split each paragraph at its `<br>` children. After a final line break
 * Lexical keeps one more `<br>` so the empty last line has height; the empty
 * stretch after that `<br>` is no line of its own, and an empty paragraph,
 * which Lexical draws as a lone `<br>`, is one empty line.
 */
export function readDraftLines(input: HTMLElement): DraftLine[] {
  const lines: DraftLine[] = []
  let paragraph = 0
  for (const block of input.children) {
    paragraph += 1
    if (block.tagName !== 'P') {
      // A host node outside the paragraphs (a quoted selection) is a barrier the Markdown never crosses.
      lines.push({ paragraph, items: [], terminator: null, text: '', plain: false })
      continue
    }
    const children = [...block.children]
    let items: number[] = []
    const close = (terminator: number | null) => {
      const own = items.map(position => children[position - 1]!)
      lines.push({
        paragraph,
        items,
        terminator,
        text: own.map(element => element.textContent ?? '').join(''),
        plain: own.length === 0 || (own.length === 1 && isPlainText(own[0]!)),
      })
      items = []
    }
    children.forEach((child, index) => {
      if (isLineBreak(child)) close(index + 1)
      else items.push(index + 1)
    })
    const last = children.at(-1)
    if (last === undefined || !isLineBreak(last)) close(null)
  }
  return lines
}

/**
 * The line a selection boundary sits on, or null outside the input. A
 * boundary given as an element offset sits before that child: before a `<br>`
 * is on the line that `<br>` ends.
 */
export function lineAt(input: HTMLElement, lines: readonly DraftLine[], node: Node, offset: number): number | null {
  if (lines.length === 0) return null
  if (node === input) {
    if (offset >= input.children.length) return lines.length - 1
    const first = lines.findIndex(line => line.paragraph === offset + 1)
    return first === -1 ? null : first
  }
  let block: Node | null = node
  while (block !== null && block.parentNode !== input) block = block.parentNode
  if (!(block instanceof Element)) return null
  const paragraph = [...input.children].indexOf(block) + 1
  const own: number[] = []
  lines.forEach((line, index) => {
    if (line.paragraph === paragraph) own.push(index)
  })
  if (own.length === 0) return null
  let child: Node | null
  if (node === block) child = block.childNodes[offset] ?? null
  else {
    child = node
    while (child !== null && child.parentNode !== block) child = child.parentNode
  }
  if (!(child instanceof Element)) return own.at(-1)!
  const position = [...block.children].indexOf(child) + 1
  const found = own.find(index => lines[index]!.items.includes(position) || lines[index]!.terminator === position)
  return found ?? own.at(-1)!
}
