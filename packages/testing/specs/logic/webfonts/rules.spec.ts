/**
 * The `@font-face` rules the browser half writes for the optional faces the drop
 * point holds (D75), and the faces it reports as undrawable: an install without
 * them declares nothing, so the page sends no font request that would answer 404,
 * and a face the page can draw counts as present wherever it comes from — the
 * system's own copy or the drop point's file.
 *
 * @capability webfonts
 * @features contracts
 * @risk A face the reader supplied is never declared and the stacks keep their look-alikes, or a face that is not there is declared and the page requests a file it cannot get; or the settings page reports a face as missing while the page draws it.
 */
import { expect, test } from 'vitest'
import { OPTIONAL_WEBFONTS } from '@dsh-claude-style/contracts/webfonts'
import { FONT_FILES_PATH } from '@dsh-claude-style/contracts/routes'
import { unavailableWebfonts, webfontRules } from '@dsh-claude-style/client/pure'

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

test('the faces the page cannot draw are named as a reader knows them, in the contract order', () => {
  expect(unavailableWebfonts(() => true)).toEqual([])
  expect(unavailableWebfonts(() => false)).toEqual(['Anthropic Sans', 'Anthropic Serif', 'Anthropic Mono'])
  expect(unavailableWebfonts(face => face.file !== OPTIONAL_WEBFONTS[1].file)).toEqual(['Anthropic Serif'])
})

test('a stack names the dropped file\'s family and the names a system copy registers under, so either copy can answer for the face', () => {
  for (const face of OPTIONAL_WEBFONTS) {
    expect(face.stack[0]).toBe(face.family)
  }
  const mono = OPTIONAL_WEBFONTS[2]
  // Anthropic's variable cut registers under this name, which the dropped file does not use.
  expect(mono.stack).toContain('Anthropic Mono Variable')
})
