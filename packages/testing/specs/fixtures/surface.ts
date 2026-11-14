import registry from '../../data/surface.json'

/**
 * The skin's own names, read from the surface table by id (packages/testing/data/surface.json,
 * D92). A spec never spells one, so a rename in the skin moves the table alone.
 */
interface SurfaceEntry {
  id: string
  selector?: string
  attribute?: string
  property?: string
}

function entry(id: string): SurfaceEntry {
  const found = (registry.surface as SurfaceEntry[]).find((candidate) => candidate.id === id)
  if (found === undefined) throw new Error(`surface: no entry "${id}" in packages/testing/data/surface.json`)
  return found
}

/** The selector of an element the skin draws. */
export function surfaceSelector(id: string): string {
  const { selector } = entry(id)
  if (selector === undefined) throw new Error(`surface: "${id}" names an attribute, not an element`)
  return selector
}

/** The one class a single-class surface selector names, for building that element. */
export function surfaceClass(id: string): string {
  const selector = surfaceSelector(id)
  if (!/^\.[\w-]+$/.test(selector)) throw new Error(`surface: "${id}" is not one class`)
  return selector.slice(1)
}

/** A CSS custom property the skin writes. */
export function surfaceProperty(id: string): string {
  const { property } = entry(id)
  if (property === undefined) throw new Error(`surface: "${id}" names no custom property`)
  return property
}

/** An attribute the skin writes. */
export function surfaceAttribute(id: string): string {
  const { attribute } = entry(id)
  if (attribute === undefined) throw new Error(`surface: "${id}" names an element, not an attribute`)
  return attribute
}
