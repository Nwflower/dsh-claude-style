/**
 * System sans on the real host: multilingual proportional text changes together,
 * while code, math, italic emphasis and language metadata keep their own rules.
 */
import path from 'node:path'
import { check } from '../lane.mjs'
import { sanitizePage } from '../../../scripts/shared/privacy.mjs'

function systemTypographyScenario() {
  return {
    script: 'typography',
    prompt: 'show the typography',
    viewport: { width: 1280, height: 1000 },
    patch: [
      '- id: ui-skin-claude-style',
      '  config:',
      '    typeface: system',
    ],
    async assert({ page, session, out }) {
      await page.evaluate(() => {
        const arabic = document.querySelector('h2')
        const hebrew = document.querySelector('h4')
        arabic?.setAttribute('lang', 'ar')
        arabic?.setAttribute('dir', 'rtl')
        hebrew?.setAttribute('lang', 'he')
        hebrew?.setAttribute('dir', 'rtl')
      })
      const reading = await page.evaluate(() => {
        const family = (selector) => [...document.querySelectorAll(selector)].map((element) => getComputedStyle(element).fontFamily)
        const code = document.querySelector('pre code')
        const math = document.querySelector('.katex')
        return {
          body: getComputedStyle(document.body).fontFamily,
          proportional: family('h1, h2, h3, h4, h5, h6, p, th, td'),
          headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
          tableCells: document.querySelectorAll('th, td').length,
          code: code === null ? null : getComputedStyle(code).fontFamily,
          math: math === null ? null : getComputedStyle(math).fontFamily,
          italics: [...document.querySelectorAll('em, i')].map((element) => getComputedStyle(element).fontStyle),
          languages: [...document.querySelectorAll('[lang]')].map((element) => [element.getAttribute('lang'), element.getAttribute('dir')]),
        }
      })
      for (const scheme of ['light', 'dark']) {
        await page.evaluate((name) => document.body.toggleAttribute('data-ds-dark-theme', name === 'dark'), scheme)
        await sanitizePage((expression) => page.evaluate(expression))
        await page.screenshot({ path: path.join(out, `system-sans-${scheme}.png`) })
      }
      const systemText = reading.body.includes('system-ui') && reading.proportional.length > 0 && reading.proportional.every((family) => family.includes('system-ui'))
      const codeMono = reading.code !== null && reading.code.includes('ui-monospace') && !reading.code.includes('Noto Serif')
      const mathOwn = reading.math !== null && !reading.math.includes('system-ui')
      return [
        check('界面、正文、H1–H6 与表格都读取系统无衬线字体', systemText && reading.headings === 6 && reading.tableCells > 0, JSON.stringify(reading)),
        check('代码保留独立等宽字体栈', codeMono, JSON.stringify(reading.code)),
        check('数学公式保留渲染器自己的字体', mathOwn, JSON.stringify(reading.math)),
        check('真正的斜体仍为斜体', reading.italics.length > 0 && reading.italics.every((style) => style === 'italic'), JSON.stringify(reading.italics)),
        check('语言与方向属性保留', reading.languages.some(([lang, dir]) => lang === 'ar' && dir === 'rtl') && reading.languages.some(([lang, dir]) => lang === 'he' && dir === 'rtl'), JSON.stringify(reading.languages)),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { systemTypographyScenario }
