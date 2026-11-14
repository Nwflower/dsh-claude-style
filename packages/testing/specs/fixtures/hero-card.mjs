/**
 * The stand-in page's composer card standing as the home page's hero: a model
 * name longer than any row it is given, the card at the width under test, and
 * the class the parts table reads for the hero part when the test needs it.
 */
import { CONVERSATION_PARTS } from '@dsh-claude-style/engine/parts-table'
import { host, surface } from './behaviour.mjs'
import { partClass } from './parts.mjs'

const CARD = host('composer.card')
const VARIANT = host('composer.variant')
const PART = surface.attribute('skin.part')
const LABEL = surface('model.seat-name')
const LONG = 'qwen4-max-preview · Bailian Token Plan Enterprise'

/**
 * Put the card in the hero's place.
 * @param width - the card's width in pixels.
 * @param hero - give the stack the home page's own class for the `composer-hero` part, so the parts walk names it and the sheet's rules for it reach the card.
 */
export async function heroCard(t, { width, hero = false }) {
  await t.page.evaluate(([card, variant, label, long, part, width, heroClass]) => {
    const stack = document.querySelector('[' + part + '~="composer-stack"]')
    if (stack === null) throw new Error('the composer stack is not on the page')
    if (heroClass !== null) stack.classList.add(heroClass)
    stack.setAttribute(variant, 'hero')
    const node = document.querySelector(label)
    if (node === null) throw new Error('the model label is not on the page')
    node.textContent = long
    const element = document.querySelector(card)
    element.style.setProperty('width', width + 'px')
    element.style.setProperty('max-width', width + 'px')
  }, [CARD, VARIANT, LABEL, LONG, PART, width, hero ? partClass(CONVERSATION_PARTS, 'composer-hero') : null])
  await t.settle()
}
