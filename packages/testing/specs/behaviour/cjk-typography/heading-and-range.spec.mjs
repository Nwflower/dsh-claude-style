/**
 * Under the Claude typeface, bundled Latin faces declare their Unicode coverage,
 * Markdown prose skips Western serif fallbacks ahead of CJK fonts, and CJK locales
 * keep natural heading letter-spacing while Latin locales keep display tracking.
 *
 * @capability cjk-typography
 * @features shared
 * @risk Bundled Latin fonts intercept CJK lookup, Georgia or Times thins fallback strokes, or negative tracking squeezes Chinese headings.
 */
import { spec } from '../../fixtures/behaviour.mjs'

export default spec({ page: 'chat-fold' }, ({ test }) => {
  test('Claude typeface declares Latin unicode-range, drops Georgia fallback, and resets CJK heading tracking', async (t) => {
    await t.prefs({ typeface: 'claude' })
    const reading = await t.page.evaluate(async (flowSel) => {
      const flow = document.querySelector(flowSel)
      if (flow === null) throw new Error('missing chat flow')
      const wrap = document.createElement('div')
      wrap.className = 'abc' + '_markdown'
      const zhHeading = document.createElement('h1')
      zhHeading.lang = 'zh-CN'
      zhHeading.textContent = '中文标题自然字距'
      const enHeading = document.createElement('h1')
      enHeading.lang = 'en'
      enHeading.textContent = 'Editorial Heading'
      const prose = document.createElement('p')
      prose.textContent = '混合排版 Mixed prose'
      wrap.append(zhHeading, enHeading, prose)
      flow.append(wrap)
      await document.fonts.ready
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      const proseFamily = getComputedStyle(prose).fontFamily
      const zhSpacing = getComputedStyle(zhHeading).letterSpacing
      const enSpacing = Number.parseFloat(getComputedStyle(enHeading).letterSpacing)
      const ranges = [...document.fonts]
        .filter((f) => f.family === 'Claude Style Inter' || f.family === 'Claude Style Noto Serif')
        .map((f) => f.unicodeRange)
      wrap.remove()
      return { proseFamily, zhSpacing, enSpacing, ranges }
    }, t.host('chat.flow'))

    t.expectThat.equal(reading.proseFamily.includes('Georgia'), false, 'prose stack drops Georgia ahead of CJK fonts')
    t.expectThat.equal(reading.proseFamily.includes('Times New Roman'), false, 'prose stack drops Times New Roman ahead of CJK fonts')
    t.expectThat.equal(reading.zhSpacing, 'normal', 'Chinese headings keep natural letter-spacing')
    t.expectThat.equal(reading.enSpacing < 0, true, `English headings keep negative display tracking (${reading.enSpacing}px)`)
    t.expectThat.equal(
      reading.ranges.length === 2 && reading.ranges.every((range) => !range.includes('10FFFF')),
      true,
      `bundled Latin faces declare bounded unicode-range (${JSON.stringify(reading.ranges)})`,
    )
  })
})
