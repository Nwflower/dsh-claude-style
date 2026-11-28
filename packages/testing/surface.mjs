/**
 * surface.mjs — canonical reader for packages/testing/data/surface.json (D92),
 * shared across behaviour specs, smoke helpers, and real-host scenarios.
 */
import registry from './data/surface.json' with { type: 'json' }

const entries = new Map(registry.surface.map((entry) => [entry.id, entry]))

/** Look up one surface entry by id, failing fast if absent. */
export function surfaceEntry(id) {
  const entry = entries.get(id)
  if (entry === undefined) throw new Error(`surface: no entry "${id}" in packages/testing/data/surface.json`)
  return entry
}

/** Selector of an element the skin draws. */
export function surfaceSelector(id) {
  const { selector } = surfaceEntry(id)
  if (selector === undefined) throw new Error(`surface: "${id}" names an attribute, not an element`)
  return selector
}

/** Attribute name the skin writes. */
export function surfaceAttribute(id) {
  const { attribute } = surfaceEntry(id)
  if (attribute === undefined) throw new Error(`surface: "${id}" names an element, not an attribute`)
  return attribute
}

/** CSS custom property the skin writes. */
export function surfaceProperty(id) {
  const { property } = surfaceEntry(id)
  if (property === undefined) throw new Error(`surface: "${id}" names no custom property`)
  return property
}
