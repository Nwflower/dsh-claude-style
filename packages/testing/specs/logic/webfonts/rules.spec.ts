/**
 * The `@font-face` rules the browser half writes for the optional faces the drop
 * point holds (D75): an install without them declares nothing, so the page sends
 * no font request that would answer 404, and each face in place is declared under
 * the family the stacks name and the address the fonts route serves.
 *
 * @capability webfonts
 * @features contracts
 * @risk A face the reader supplied is never declared and the stacks keep their look-alikes, or a face that is not there is declared and the page requests a file it cannot get.
 */
import { expect, test } from 'vitest'
import { OPTIONAL_WEBFONTS } from '@dsh-claude-style/contracts/webfonts'
import { FONT_FILES_PATH } from '@dsh-claude-style/contracts/routes'
import { webfontRules } from '@dsh-claude-style/client/pure'

test('a drop point with no face in place declares nothing, so the page asks for no font', () => {
  expect(webfontRules([])).toBe('')
  expect(webfontRules(['SomeOtherFace.ttf'])).toBe('')
})

test('each face in place is declared under the family the stacks name and the address the fonts route serves', () => {
  for (const face of OPTIONAL_WEBFONTS) {
    const rules = webfontRules([face.file])
    expect(rules).toContain(`font-family: '${face.family}'`)
    expect(rules).toContain(`url('${FONT_FILES_PATH}${face.file}')`)
  }
})

test('only the faces reported get a declaration, and they keep the contract order', () => {
  const rules = webfontRules([OPTIONAL_WEBFONTS[2].file, OPTIONAL_WEBFONTS[0].file])
  expect(rules).not.toContain(OPTIONAL_WEBFONTS[1].family)
  expect(rules.indexOf(OPTIONAL_WEBFONTS[0].family)).toBeLessThan(rules.indexOf(OPTIONAL_WEBFONTS[2].family))
})

test('a face the package ships is left to the stylesheet that declares it', () => {
  expect(webfontRules(['JetBrainsMonoVariable.woff2', 'InterVariable.woff2'])).toBe('')
})
