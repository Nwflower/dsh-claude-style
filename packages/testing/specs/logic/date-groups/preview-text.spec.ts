/**
 * The one line a date-view row carries under its title: a message body flattened
 * into plain text, cut at the row's width in characters.
 *
 * @capability date-groups
 * @features date-groups
 * @risk The row's second line shows markdown punctuation instead of the words, or runs past the row's own width because the limit is counted in the wrong unit.
 */
import { expect, test } from 'vitest'
import { plainPreview } from '@dsh-claude-style/client/pure'

test('prose keeps its words and loses the marks that only mean something rendered', () => {
  expect(plainPreview('**重点**：用 `pnpm test` 跑一遍')).toBe('重点：用 pnpm test 跑一遍')
  expect(plainPreview('~~旧值~~ 新值')).toBe('旧值 新值')
})

test('a link keeps its text and drops the address', () => {
  expect(plainPreview('见 [交接文档](https://example.com/a/b.md) 第三节')).toBe('见 交接文档 第三节')
  expect(plainPreview('![截图](https://example.com/x.png) 已附上')).toBe('截图 已附上')
})

test('a heading or quote marker goes while a word that wears one stays', () => {
  expect(plainPreview('## 先说结论')).toBe('先说结论')
  expect(plainPreview('> 引用的一行')).toBe('引用的一行')
  // A hash inside a word is not a heading marker.
  expect(plainPreview('C# 与 issue #216 都不该被切')).toBe('C# 与 issue #216 都不该被切')
})

test('a fenced block leaves its body and a table leaves no rule of dashes', () => {
  // The fence's own info string goes with the fence.
  expect(plainPreview('```sh\nnpm run build\n```\n构建产物在 lib')).toBe('npm run build 构建产物在 lib')
  expect(plainPreview('| 名称 | 值 |\n| --- | --- |\n| 端口 | 49830 |')).toBe('名称 值 端口 49830')
})

test('newlines and runs of spaces become one space, so the line stays one line', () => {
  expect(plainPreview('第一行\n\n\n   第二行')).toBe('第一行 第二行')
})

test('a long body is cut at the limit and says so, in characters rather than bytes', () => {
  const text = '一'.repeat(400)
  const cut = plainPreview(text)
  expect(cut.length).toBe(161)
  expect(cut.endsWith('…')).toBe(true)
  // Half of a Chinese character never survives a cut.
  expect(cut.slice(0, 160)).toBe('一'.repeat(160))
})
