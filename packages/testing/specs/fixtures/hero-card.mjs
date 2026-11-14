/**
 * The stand-in page's composer card standing as the home page's hero: a model
 * name longer than any row it is given, the card at the width under test, and
 * the hero part the real page's parts walk writes when the test needs it.
 */
import { host, surface } from './behaviour.mjs'

const CARD = host('composer.card')
const VARIANT = host('composer.variant')
const PART = surface.attribute('skin.part')
const LABEL = surface('model.seat-name')
const LONG = 'qwen4-max-preview · Bailian Token Plan Enterprise'

/**
 * Put the card in the hero's place.
 * @param width - the card's width in pixels.
 * @param hero - write the `composer-hero` part on the stack, as the home page's walk does.
 */
export async function heroCard(t, { width, hero = false }) {
  await t.page.evaluate(([card, variant, label, long, part, width, hero]) => {
    const stack = document.querySelector('[' + part + '~="composer-stack"]')
    if (stack === null) throw new Error('the composer stack is not on the page')
    if (hero) {
      const parts = (stack.getAttribute(part) ?? '').split(/\s+/)
      stack.setAttribute(part, [...parts.filter(Boolean), 'composer-hero'].join(' '))
    }
    stack.setAttribute(variant, 'hero')
    const node = document.querySelector(label)
    if (node === null) throw new Error('the model label is not on the page')
    node.textContent = long
    const element = document.querySelector(card)
    element.style.setProperty('width', width + 'px')
    element.style.setProperty('max-width', width + 'px')
  }, [CARD, VARIANT, LABEL, LONG, PART, width, hero])
  await t.settle()
}
