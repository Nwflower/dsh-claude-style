import { inPageBox } from './page-zoom'

/** Use the visible children's union when host layout makes the container wider than its content.
 * Fall back to the container; return null only when neither has extent.
 */
export function contentBox(container: Element) {
  let box: DOMRect | null = null
  for (const child of container.children) {
    const childBox = inPageBox(child.getBoundingClientRect())
    if (childBox.width === 0 && childBox.height === 0) continue
    box = box === null ? childBox : new DOMRect(
      Math.min(box.left, childBox.left),
      Math.min(box.top, childBox.top),
      Math.max(box.right, childBox.right) - Math.min(box.left, childBox.left),
      Math.max(box.bottom, childBox.bottom) - Math.min(box.top, childBox.top),
    )
  }
  if (box !== null) return box
  const own = inPageBox(container.getBoundingClientRect())
  return own.width === 0 && own.height === 0 ? null : own
}
