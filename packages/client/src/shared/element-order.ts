/**
 * Move a set of sibling seats into a target order with as few DOM moves as the
 * target allows (D40). The longest increasing subsequence is already standing
 * in the target's relative order, so those seats stay where they are. Each
 * other seat is inserted once; an unchanged order writes nothing.
 *
 * Callers define hard boundaries by splitting their seats into segments first.
 * A date heading that is about to be rebuilt can stay inside a segment and be
 * crossed by a seat.
 */
export function moveElementsIntoOrder(elements: readonly HTMLElement[]): number {
  if (elements.length < 2) return 0
  const parent = elements[0]!.parentElement
  if (parent === null) throw new Error('ordered elements must be mounted')
  const seats = new Set(elements)
  if (seats.size !== elements.length) throw new Error('ordered elements must be unique')
  for (const element of elements) {
    if (element.parentElement !== parent) throw new Error('ordered elements must share a parent')
  }

  const current = Array.from(parent.children).filter((child): child is HTMLElement =>
    child instanceof HTMLElement && seats.has(child))
  if (current.length !== elements.length) throw new Error('ordered elements must hold their current seats')

  const targetAt = new Map(elements.map((element, at) => [element, at]))
  const positions = current.map(element => targetAt.get(element)!)
  const settled = new Set(increasingPositions(positions).map(at => current[at]!))
  const first = current[0]!
  let previous: HTMLElement | null = null
  let moved = 0
  for (const element of elements) {
    if (settled.has(element)) {
      previous = element
      continue
    }
    const before = previous === null ? first : previous.nextSibling
    if (element.nextSibling !== before) {
      parent.insertBefore(element, before)
      moved += 1
    }
    previous = element
  }
  return moved
}

/**
 * Split one parent's seats at every non-seat child. The caller may omit markers
 * whose order it owns and will rebuild, such as date headings.
 */
export function sessionSeatSegments<T>(
  list: Element,
  seats: ReadonlyMap<Element, T>,
  omit?: (child: Element) => boolean,
): T[][] {
  const segments: T[][] = []
  let segment: T[] = []
  for (const child of Array.from(list.children)) {
    if (seats.has(child)) {
      segment.push(seats.get(child)!)
      continue
    }
    if (omit?.(child) === true) continue
    if (segment.length > 0) {
      segments.push(segment)
      segment = []
    }
  }
  if (segment.length > 0) segments.push(segment)
  return segments
}

interface Suffix {
  length: number
  position: number
}

/**
 * Indexes of a longest increasing subsequence of target positions. Equal-length
 * answers keep the earliest current seat, which leaves a stable run of waiting
 * rows in place when running rows move forward.
 */
function increasingPositions(positions: readonly number[]): number[] {
  const size = positions.length
  const tree: (Suffix | null)[] = Array(size + 1).fill(null)

  function later(index: number): Suffix | null {
    let best: Suffix | null = null
    for (; index > 0; index -= index & -index) {
      const candidate = tree[index]
      if (candidate !== null && (best === null || candidate.length > best.length ||
        candidate.length === best.length && candidate.position < best.position)) {
        best = candidate
      }
    }
    return best
  }

  function keep(index: number, candidate: Suffix) {
    for (; index <= size; index += index & -index) {
      const standing = tree[index]
      if (standing === null || candidate.length > standing.length ||
        candidate.length === standing.length && candidate.position < standing.position) {
        tree[index] = candidate
      }
    }
  }

  const lengths = Array<number>(size).fill(1)
  const next = Array<number>(size).fill(-1)
  for (let at = size - 1; at >= 0; at -= 1) {
    const suffix = later(size - positions[at]! - 1)
    if (suffix !== null) {
      lengths[at] = suffix.length + 1
      next[at] = suffix.position
    }
    keep(size - positions[at]!, { length: lengths[at]!, position: at })
  }

  let start = 0
  for (let at = 1; at < size; at += 1) {
    if (lengths[at]! > lengths[start]!) start = at
  }
  const chain: number[] = []
  for (let at = start; at !== -1; at = next[at]!) chain.push(at)
  return chain
}
