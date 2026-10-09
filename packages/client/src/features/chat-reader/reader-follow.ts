import { useCallback, useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'
import { CONVERSATION_SCROLL_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { requestFrame } from '../../core/frame'
import { joinScrollOwner, readerHolds, releaseReader, writeScroll } from '../../shared/scroll-owner'

/**
 * The reading view's tail follow (D57): dsh-better-display's exponential
 * approach, written through the scroll owner (D41) as the `stream` source.
 * The owner already knows when the reader has taken the conversation (their
 * wheel, a key, a drag) and refuses the follow until they come back to the end;
 * the view only asks. Height animations announce themselves with the layout
 * events, and the follow pins the end while one runs instead of easing behind it.
 */

const LAYOUT_START = 'dsh-claude-reader-layout-start'
const LAYOUT_END = 'dsh-claude-reader-layout-end'

/** A height animation starts under `element`. */
export function layoutStart(element: Element) {
  element.dispatchEvent(new CustomEvent(LAYOUT_START, { bubbles: true }))
}

/** The height animation started under `element` has settled. */
export function layoutEnd(element: Element) {
  element.dispatchEvent(new CustomEvent(LAYOUT_END, { bubbles: true }))
}

/** The reference's time constant: each frame closes `1 − e^(−δ/52)` of the gap. */
export const FOLLOW_TAU_MS = 52
/** A longer frame is clamped, so a stalled tab does not jump the whole distance. */
export const FOLLOW_MAX_FRAME_MS = 48

/** One follow frame's new position. */
export function approach(top: number, gap: number, deltaMs: number): number {
  const delta = Math.min(FOLLOW_MAX_FRAME_MS, Math.max(1, deltaMs))
  return top + gap * (1 - Math.exp(-delta / FOLLOW_TAU_MS))
}

const scrollEnd = (scroller: HTMLElement) => Math.max(0, scroller.scrollHeight - scroller.clientHeight)

/**
 * Follow the end of the conversation while the reader reads it. `detached` is
 * true while the reader holds a position away from the end; `jump` takes them
 * back and resumes the follow.
 */
export function useReaderFollow(root: RefObject<HTMLElement>, motion: boolean): { detached: boolean, jump: () => void } {
  const [detached, setDetached] = useState(false)
  const [scroller, setScroller] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => {
    const content = root.current
    const found = content?.closest<HTMLElement>(CONVERSATION_SCROLL_SELECTOR) ?? null
    if (content === null || content === undefined || found === null) return
    setScroller(found)
    const leave = joinScrollOwner()
    let cancel: (() => void) | null = null
    let lastAt = 0
    let layoutDepth = 0
    const selecting = () => {
      const selection = document.getSelection()
      return selection !== null && !selection.isCollapsed && selection.anchorNode !== null && content.contains(selection.anchorNode)
    }
    const step = () => {
      cancel = requestFrame({
        write(now) {
          cancel = null
          if (readerHolds(found) || selecting()) return
          const gap = scrollEnd(found) - found.scrollTop
          const settle = !motion || layoutDepth > 0 || Math.abs(gap) < 1.5
          const target = settle ? scrollEnd(found) : approach(found.scrollTop, gap, now - lastAt)
          lastAt = now
          if (!writeScroll(found, target, 'stream')) return
          if (!settle) step()
        },
      })
    }
    const follow = () => {
      if (cancel !== null) return
      lastAt = performance.now()
      step()
    }
    const onLayoutStart = () => {
      layoutDepth += 1
    }
    const onLayoutEnd = () => {
      layoutDepth = Math.max(0, layoutDepth - 1)
      follow()
    }
    const onScroll = () => setDetached(readerHolds(found))
    const observer = new ResizeObserver(follow)
    observer.observe(content)
    content.addEventListener(LAYOUT_START, onLayoutStart)
    content.addEventListener(LAYOUT_END, onLayoutEnd)
    found.addEventListener('scroll', onScroll, { passive: true })
    // A conversation opens at its end.
    writeScroll(found, scrollEnd(found), 'jump')
    return () => {
      if (cancel !== null) cancel()
      observer.disconnect()
      content.removeEventListener(LAYOUT_START, onLayoutStart)
      content.removeEventListener(LAYOUT_END, onLayoutEnd)
      found.removeEventListener('scroll', onScroll)
      leave()
    }
  }, [root, motion])
  const jump = useCallback(() => {
    if (scroller === null) return
    releaseReader(scroller)
    writeScroll(scroller, scrollEnd(scroller), 'jump')
    setDetached(false)
  }, [scroller])
  return { detached, jump }
}
