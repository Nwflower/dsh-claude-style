import { subscribeMutations } from './bus'
import { skin } from './skin'

/**
 * The custom properties the skin writes inline on <body>, held against a
 * wholesale replacement of the style attribute. That attribute is shared with
 * the host and every other plugin: a write that replaces all of it (`cssText`,
 * `setAttribute('style', …)`, `removeAttribute('style')`) drops the skin's
 * properties while the attributes that switch the rules reading them stay, and
 * those rules then resolve to nothing — a scheme's seeds gone leaves every
 * popover card transparent. The writers only run again on their own triggers,
 * so the dropped set is written back here as soon as the attribute changes.
 *
 * Only a replacement is undone: every held property gone at once, with the
 * skin's stamp still on <body>. One property removed by name is a deliberate
 * write and stays removed; this is also what keeps a generation a hot reload
 * left running from writing its stale values over the live one, whose own
 * writes always leave the rest of the set in place. A release removes the stamp
 * in the same task as the properties, so it is never undone.
 *
 * Each property is held as the browser reads it back, so a value the browser
 * normalizes on write compares equal and a restore settles after one write.
 */

interface HeldProperty {
  value: string
  previous: string
  priority: string
}
const held = new Map<string, HeldProperty>()
let stopWatch: (() => void) | null = null

function restore() {
  const body = document.body
  if (!body.hasAttribute(skin().stamp)) return
  for (const name of held.keys()) {
    if (body.style.getPropertyValue(name) !== '') return
  }
  for (const [name, property] of held) body.style.setProperty(name, property.value)
}

function watch() {
  if (held.size === 0) {
    stopWatch?.()
    stopWatch = null
  } else if (stopWatch === null) {
    // beforePaint: a seed restored after the paint would show one frame of the unpainted card.
    stopWatch = subscribeMutations(document.body, { attributes: true, attributeFilter: ['style'], beforePaint: true }, restore)
  }
}

/** Writes `value` as `name` on <body> and holds it there; null removes the property and stops holding it. */
export function writeBodyProperty(name: string, value: string | null) {
  const style = document.body.style
  const current = style.getPropertyValue(name)
  const priority = style.getPropertyPriority(name)
  const property = held.get(name)
  if (value === null) {
    if (property === undefined) return
    held.delete(name)
    // Restore only an override still owned by this generation (D74).
    if (current === property.value && priority === '') {
      style.setProperty(name, property.previous, property.priority)
    }
  } else {
    const owner = property !== undefined && current === property.value && priority === ''
      ? property : { value, previous: current, priority }
    if (current !== value || priority !== '') style.setProperty(name, value)
    owner.value = style.getPropertyValue(name)
    held.set(name, owner)
  }
  watch()
}
