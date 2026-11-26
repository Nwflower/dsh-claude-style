/**
 * The draft renders in place on the real host's Lexical editor (D115): blocks
 * the caret is not in are drawn over their own source lines, the block under
 * the caret shows its source, formulas are laid out by the host's KaTeX sheet,
 * and the editor's text stays the one the reader typed.
 */
import path from 'node:path'
import { COMPOSER_CARD_SELECTOR, COMPOSER_INPUT_SELECTOR, COMPOSER_LINE_TEXT_SELECTOR, HOST_MATH_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { check } from '../lane.mjs'
import { sanitizePage } from '../../../scripts/shared/privacy.mjs'
import { surface } from '../specs/fixtures/behaviour.mjs'

const BLOCK = surface('composer-markdown.block')
/** The draft, line by line; each line is typed and the lines are joined by Shift+Enter, the host's soft break. */
const DRAFT = ['# Heading', '', '能量 $E=mc^2$ and **bold**', '$$', '\\frac{1}{3}', '$$']

async function read(page) {
  return page.evaluate(({ card: cardSelector, input: inputSelector, line, block, math }) => {
    const input = [...document.querySelectorAll(inputSelector)].find((element) => element.getClientRects().length > 0)
    if (input === undefined) throw new Error('the composer is missing')
    const card = input.closest(cardSelector) ?? document
    const blocks = [...card.querySelectorAll(block)]
    const spans = [...input.querySelectorAll(line)]
    const first = spans[0]
    const katex = card.querySelector(`${block} ${math}`)
    return {
      text: input.textContent,
      blocks: blocks.map((element) => element.textContent.trim().slice(0, 40)),
      heading: blocks[0]?.querySelector('h1')?.textContent ?? null,
      display: card.querySelector(`${block} .katex-display`) !== null,
      mathFace: katex === null ? null : getComputedStyle(katex).fontFamily,
      // The first block's rendering stands on its first source line, which is
      // sized to it and carries no visible text of its own.
      aligned: blocks[0] === undefined || first === undefined ? null : {
        top: Math.round(blocks[0].getBoundingClientRect().top - first.getBoundingClientRect().top),
        height: Math.round(blocks[0].getBoundingClientRect().height - first.getBoundingClientRect().height),
        sourceColour: getComputedStyle(first).color,
      },
    }
  }, { card: COMPOSER_CARD_SELECTOR, input: COMPOSER_INPUT_SELECTOR, line: COMPOSER_LINE_TEXT_SELECTOR, block: BLOCK, math: HOST_MATH_SELECTOR })
}

/** Wait for the deferred feature and its measured line rules to reach the expected block count and alignment. */
async function waitForBlocks(page, count, requireAligned) {
  await page.waitForFunction(({ card: cardSelector, input: inputSelector, line, block, count, requireAligned }) => {
    const input = [...document.querySelectorAll(inputSelector)].find((element) => element.getClientRects().length > 0)
    if (input === undefined) return false
    const card = input.closest(cardSelector) ?? document
    const blocks = [...card.querySelectorAll(block)]
    if (blocks.length !== count) return false
    if (!requireAligned) return true
    const first = input.querySelector(line)
    if (first === null) return false
    const top = Math.abs(Math.round(blocks[0].getBoundingClientRect().top - first.getBoundingClientRect().top))
    const height = Math.abs(Math.round(blocks[0].getBoundingClientRect().height - first.getBoundingClientRect().height))
    return top <= 1 && height <= 1 && getComputedStyle(first).color === 'rgba(0, 0, 0, 0)'
  }, { card: COMPOSER_CARD_SELECTOR, input: COMPOSER_INPUT_SELECTOR, line: COMPOSER_LINE_TEXT_SELECTOR, block: BLOCK, count, requireAligned }, { timeout: 15000 }).catch(() => {
    // Let the assertions below read and report the actual state on timeout (D12).
  })
}

function composerLiveScenario() {
  return {
    script: 'greeting',
    prompt: 'hello there',
    async assert({ page, session, out }) {
      const input = page.locator(COMPOSER_INPUT_SELECTOR).filter({ visible: true }).last()
      await input.focus()
      for (const [index, line] of DRAFT.entries()) {
        if (index > 0) await page.keyboard.press('Shift+Enter')
        if (line !== '') await page.keyboard.type(line)
      }
      await waitForBlocks(page, 2, false)
      const typing = await read(page)
      await input.evaluate((element) => element.blur())
      await waitForBlocks(page, 3, true)
      const resting = await read(page)
      await sanitizePage((expression) => page.evaluate(expression))
      await page.screenshot({ path: path.join(out, 'composer-live.png') })
      return [
        check('光标所在的公式块显示源码，其余块显示渲染结果', typing.blocks.length === 2 && typing.heading === 'Heading' && typing.display === false, JSON.stringify(typing.blocks)),
        check('失去焦点后三个块都显示渲染结果', resting.blocks.length === 3 && resting.display === true, JSON.stringify(resting.blocks)),
        check('公式由宿主加载的 KaTeX 样式排版', resting.mathFace !== null && resting.mathFace.includes('KaTeX_Main'), String(resting.mathFace)),
        check('渲染块与源码首行同高、同位置，源码文字透明', resting.aligned !== null && Math.abs(resting.aligned.top) <= 1 && Math.abs(resting.aligned.height) <= 1 && resting.aligned.sourceColour === 'rgba(0, 0, 0, 0)', JSON.stringify(resting.aligned)),
        check('编辑器里的文字仍是输入的原文', resting.text === DRAFT.join(''), JSON.stringify(resting.text)),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { composerLiveScenario }
