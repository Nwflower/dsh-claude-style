import { CHAT_GROUP_PART_ATTRIBUTE, CHAT_NODE_KEY_ATTRIBUTE, FLOW_KIND_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'

/**
 * The height a chat row was laid out at, kept across the rows the host unmounts
 * and mounts again when a session is switched. A row can then carry that height
 * before its first layout, so the stylesheet may skip it from the first frame
 * instead of laying every row out and only then skipping (row-skip.ts).
 */

/** How many rows keep their height; a long session holds a few hundred, and the oldest leave first. */
export const ROW_HEIGHT_CACHE_LIMIT = 4096

/**
 * The key a row's height is kept under: its node key says which message, and
 * the kind and group part say which row of that message (a reasoning row and
 * the answer row of one step share the node key).
 */
export function rowHeightKey(row: Element) {
  const node = row.getAttribute(CHAT_NODE_KEY_ATTRIBUTE)
  if (node === null) return null
  const kind = row.getAttribute(FLOW_KIND_ATTRIBUTE) ?? ''
  const part = row.getAttribute(CHAT_GROUP_PART_ATTRIBUTE) ?? ''
  return `${node}|${kind}|${part}`
}

export interface RowHeightCache {
  get(key: string): number | undefined
  set(key: string, height: number): void
  clear(): void
  readonly size: number
}

/** Keep the most recently touched heights, dropping the oldest past the limit. */
export function createRowHeightCache(limit = ROW_HEIGHT_CACHE_LIMIT): RowHeightCache {
  const heights = new Map<string, number>()
  const touch = (key: string, height: number) => {
    heights.delete(key)
    heights.set(key, height)
  }
  return {
    get(key) {
      const height = heights.get(key)
      if (height !== undefined) touch(key, height)
      return height
    },
    set(key, height) {
      if (!Number.isFinite(height) || height <= 0) return
      touch(key, height)
      while (heights.size > limit) {
        const oldest = heights.keys().next().value
        if (oldest === undefined) break
        heights.delete(oldest)
      }
    },
    clear() {
      heights.clear()
    },
    get size() {
      return heights.size
    },
  }
}
