import { modelCopy, resolveModelBrand } from './model-copy'
import { buildElement } from '@dsh-claude-style/engine/dom'
import { COMBINE_SVGS, COMBINE_WORDS } from 'virtual:dsh-claude-style/generated'

/** Match the model vendor, never the reseller route; unmatched models have no lockup (D79). */
export function modelBrand(modelId: unknown, modelName: unknown) {
  return resolveModelBrand(modelCopy, modelId, modelName)
}

/** A lockup includes the vendor word, so it replaces that word in the catalog name when present. */
export function modelCombine(brand: string | null, name: string) {
  if (brand === null || !COMBINE_SVGS[brand]) return null
  const word = COMBINE_WORDS[brand]
  const at = word === undefined ? -1 : name.toLowerCase().indexOf(word.toLowerCase())
  return { id: brand, word, svg: COMBINE_SVGS[brand], at }
}

/** Keep the vendor word as hidden text because its visible lockup is aria-hidden. */
export function buildModelLabel(name: unknown, brand: string | null) {
  const el = buildElement('span', 'dsh-claude-model-name')
  const text = typeof name === 'string' ? name : ''
  const mark = modelCombine(brand, text)
  if (mark === null) {
    el.textContent = text
    return el
  }
  const box = buildElement('span', 'dsh-claude-model-combine')
  box.setAttribute('aria-hidden', 'true')
  box.innerHTML = mark.svg
  const head = mark.at === -1 ? '' : text.slice(0, mark.at)
  // The word's own separator goes with the word: the lockup's margin stands in
  // for it, so the label does not end up with two gaps.
  const tail = mark.at === -1 ? text : text.slice(mark.at + mark.word.length).replace(/^[\s\-–—]+/, '')
  if (head) el.appendChild(document.createTextNode(head))
  el.appendChild(box)
  el.appendChild(document.createTextNode(tail))
  el.appendChild(buildElement('span', 'dsh-claude-model-combine-alt', tail ? `${mark.word} ` : mark.word))
  return el
}
