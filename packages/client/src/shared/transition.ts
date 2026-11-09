/** Force layout before restoring transitions so the start state paints without animating.
 * All elements are restored together before the next change.
 */
export function withoutTransition(elements: readonly HTMLElement[], write: () => void) {
  for (const element of elements) element.style.transition = 'none'
  write()
  for (const element of elements) void element.offsetWidth
  for (const element of elements) element.style.transition = ''
}
