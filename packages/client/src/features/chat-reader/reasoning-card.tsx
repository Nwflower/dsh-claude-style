import { useCallback, useContext, useId, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { readerCopy } from '../../core/i18n'
import { REASON_CHASE_HOLD, REASON_HOLD, REASON_LINES, REASON_STEP, reasoningTarget } from './reasoning-follow'
import { StreamMotionContext } from './streaming'

/**
 * A thought (D57), ported from dsh-better-display's ReasoningCard (MIT). The
 * text sits in a card, which bounds it past the preview height; while the step
 * is live the card follows its own text at reading pace: the track slides on
 * a transform, two lines and a hold, and catches up in one step when the model
 * writes faster than that. The reader's wheel, a pointer, focus or a selection
 * hands the card back to native scrolling at once; scrolling it back to its
 * end resumes the follow. A thought inside a fold is one line (ThoughtLine).
 */

const EASE = 'cubic-bezier(.22,1,.36,1)'
/** A folded thought's frame growing to its whole text. */
const RESIZE_MS = 300

export function ReasoningCard({ children, active, motion, selected, onRead }: {
  children: ReactNode
  /** The step is live: its text is still arriving. */
  active: boolean
  motion: boolean
  selected: boolean
  onRead: () => void
}) {
  const viewport = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const [following, setFollowing] = useState(true)
  const [overflow, setOverflow] = useState(false)
  const [edges, setEdges] = useState('none')
  const stopFollow = useRef<() => void>(() => {})
  const { paused = false } = useContext(StreamMotionContext)
  const allowed = following && active && motion && !selected && !paused

  const pause = useCallback(() => {
    stopFollow.current()
    setFollowing(false)
    onRead()
  }, [onRead])

  // A selection elsewhere in the view can reach the card first; clearing it never resumes the follow.
  useLayoutEffect(() => {
    if (!selected) return
    stopFollow.current()
    setFollowing(false)
  }, [selected])

  useLayoutEffect(() => {
    const port = viewport.current
    const text = content.current
    const slide = track.current
    if (port === null || text === null || slide === null) return
    let frame = 0
    let timer: number | undefined
    let nextAt = performance.now() + REASON_HOLD
    let alive = true
    let automatic = false
    let lastPainted = port.scrollTop
    let targetOffset = lastPainted
    const tail = () => Math.max(0, text.offsetHeight - port.clientHeight)
    const clamp = (value: number) => Math.max(0, Math.min(tail(), value))
    const paintedOffset = () => {
      if (!automatic) return port.scrollTop
      const transform = getComputedStyle(slide).transform
      return clamp(transform === 'none' ? lastPainted : port.scrollTop - new DOMMatrixReadOnly(transform).m42)
    }
    const hasSelection = () => {
      const selection = document.getSelection()
      return selection !== null && !selection.isCollapsed && selection.anchorNode !== null && text.contains(selection.anchorNode)
    }
    const cancel = () => {
      cancelAnimationFrame(frame)
      frame = 0
      window.clearTimeout(timer)
      timer = undefined
      delete port.dataset.dshClaudeReaderMoving
    }
    // Native scrolling from where the slide had got to, set before a frame can paint.
    const manual = () => {
      if (!automatic) return
      const top = paintedOffset()
      automatic = false
      slide.style.transition = 'none'
      slide.style.transform = 'none'
      port.style.overflow = 'auto'
      port.scrollTop = top
      lastPainted = port.scrollTop
      port.dataset.dshClaudeReaderMode = 'manual'
    }
    const follow = () => {
      if (automatic) return
      targetOffset = lastPainted = clamp(port.scrollTop)
      slide.style.transition = 'none'
      slide.style.transform = `translateY(-${lastPainted}px)`
      port.scrollTop = 0
      port.style.overflow = 'hidden'
      automatic = true
      port.dataset.dshClaudeReaderMode = 'transform'
    }
    const measure = () => {
      const preview = parseFloat(getComputedStyle(port).getPropertyValue('--dsh-claude-reader-thought-preview'))
      setOverflow(text.offsetHeight > preview + 1)
      lastPainted = paintedOffset()
      const top = lastPainted > 1
      const bottom = tail() - lastPainted > 1
      const next = top ? bottom ? 'both' : 'top' : bottom ? 'bottom' : 'none'
      setEdges(value => value === next ? value : next)
    }
    stopFollow.current = () => {
      cancel()
      manual()
      measure()
    }
    // The reader scrolled a paused card back to its end: the card follows again.
    const resumeAtEnd = () => {
      if (automatic || !active || !motion || tail() - port.scrollTop > 1 || hasSelection()) return
      setFollowing(true)
    }
    const canFollow = () => allowed && alive && !document.hidden && !hasSelection()
    const schedule = () => {
      if (!canFollow() || frame !== 0 || timer !== undefined) return
      follow()
      if (tail() - paintedOffset() < 1) return
      timer = window.setTimeout(start, Math.max(0, nextAt - performance.now()))
    }
    const start = () => {
      timer = undefined
      if (!canFollow()) return
      const from = paintedOffset()
      const lineHeight = parseFloat(getComputedStyle(text).lineHeight) || 24
      const backlogLines = Math.max(0, (tail() - from) / lineHeight)
      const target = reasoningTarget(from, text.offsetHeight, port.clientHeight, lineHeight, backlogLines)
      if (target - from < 1) return
      const began = performance.now()
      // Still behind after this step: the next one follows almost at once.
      nextAt = began + (backlogLines > REASON_LINES ? REASON_CHASE_HOLD : REASON_HOLD)
      targetOffset = target
      // Commit the start pose, then transition the track: no per-frame scroll writes.
      slide.style.transition = 'none'
      slide.style.transform = `translateY(-${from}px)`
      void slide.offsetHeight
      slide.style.transition = `transform ${REASON_STEP}ms ${EASE}`
      slide.style.transform = `translateY(-${target}px)`
      port.dataset.dshClaudeReaderMoving = ''
      const tick = (now: number) => {
        frame = 0
        if (!canFollow()) {
          cancel()
          manual()
          return
        }
        measure()
        if (now - began < REASON_STEP || Math.abs(lastPainted - target) > 0.05) frame = requestAnimationFrame(tick)
        else {
          delete port.dataset.dshClaudeReaderMoving
          schedule()
        }
      }
      frame = requestAnimationFrame(tick)
    }
    const onScroll = () => {
      measure()
      if (automatic && port.scrollTop > 1) pause()
      else resumeAtEnd()
    }
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return
      // The compositor picked a scroller before this handler ran; a clipped
      // viewport would drop the first gesture, so this one is taken over once.
      const handoff = automatic && event.cancelable
      if (handoff) event.preventDefault()
      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? parseFloat(getComputedStyle(text).lineHeight) || 24
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? port.clientHeight : 1
      pause()
      if (handoff) {
        port.scrollTop = clamp(port.scrollTop + event.deltaY * unit)
        measure()
      }
      // Wheeling down at the end scrolls nothing, so no scroll event says the reader got there.
      if (event.deltaY > 0) resumeAtEnd()
    }
    const onSelection = () => {
      if (hasSelection()) pause()
    }
    const onVisibility = () => {
      cancel()
      manual()
      nextAt = performance.now() + REASON_HOLD
      if (!document.hidden) schedule()
    }
    const observer = new ResizeObserver(() => {
      if (automatic && targetOffset > tail() + 1) {
        cancel()
        manual()
        nextAt = performance.now() + REASON_HOLD
      }
      measure()
      schedule()
    })
    observer.observe(text)
    observer.observe(port)
    port.addEventListener('scroll', onScroll, { passive: true })
    port.addEventListener('wheel', onWheel, { passive: false })
    document.addEventListener('selectionchange', onSelection)
    document.addEventListener('visibilitychange', onVisibility)
    measure()
    schedule()
    return () => {
      alive = false
      cancel()
      manual()
      observer.disconnect()
      port.removeEventListener('scroll', onScroll)
      port.removeEventListener('wheel', onWheel)
      document.removeEventListener('selectionchange', onSelection)
      document.removeEventListener('visibilitychange', onVisibility)
      stopFollow.current = () => {}
    }
  }, [allowed, active, motion, pause])

  return <div className="dsh-claude-reader-thought" data-dsh-claude-reader-anchor=""
    data-dsh-claude-reader-following={allowed ? '' : undefined} data-dsh-claude-reader-overflow={overflow ? '' : undefined}>
    <div ref={viewport} className="dsh-claude-reader-thought-viewport" data-dsh-claude-reader-edges={edges} role="region"
      aria-label={overflow ? readerCopy('thoughtRegionScroll', 'Thinking, scrollable') : readerCopy('thoughtRegion', 'Thinking')}
      tabIndex={overflow ? 0 : undefined} onPointerDown={pause} onFocus={pause}>
      <div ref={track} className="dsh-claude-reader-thought-track">
        <div ref={content} className="dsh-claude-reader-thought-content">{children}</div>
      </div>
    </div>
  </div>
}

/**
 * A thought inside a fold — a live fold the reader opened or a finished
 * turn's process: one line in the thought's frame, "Thinking · " and its
 * text; a press grows the frame to the whole text.
 */
export function ThoughtLine({ text, motion, onRead }: { text: string, motion: boolean, onRead: () => void }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const frame = useRef<HTMLDivElement>(null)
  const height = useRef(0)
  const previousOpen = useRef(open)
  const toggle = () => {
    onRead()
    if (frame.current !== null) height.current = frame.current.getBoundingClientRect().height
    setOpen(value => !value)
  }
  /** The text toggles in both states; a press that ended as a selection closes nothing. */
  const toggleText = () => {
    if (open && (document.getSelection()?.isCollapsed ?? true) === false) return
    toggle()
  }
  // The frame grows from the line to the whole text, and back.
  useLayoutEffect(() => {
    const element = frame.current
    if (element === null || open === previousOpen.current) return
    previousOpen.current = open
    const to = element.getBoundingClientRect().height
    if (!motion || Math.abs(to - height.current) < 1) return
    const animation = element.animate([{ height: `${height.current}px` }, { height: `${to}px` }], { duration: RESIZE_MS, easing: EASE })
    return () => animation.cancel()
  }, [open, motion])
  return <div ref={frame} className="dsh-claude-reader-thought-line" data-dsh-claude-reader-open={open ? '' : undefined}>
    {/* The line itself opens and closes; open, its text stays selectable, so a press that made a selection does not close it. */}
    <div id={id} className="dsh-claude-reader-thought-line-text" onClick={toggleText}>
      <span className="dsh-claude-reader-thought-line-label">{readerCopy('thoughtLabel', 'Thinking')}</span>
      {' · '}
      {open ? text : text.replace(/\s+/g, ' ').trim()}
    </div>
    <button type="button" className="dsh-claude-reader-thought-line-toggle" aria-expanded={open} aria-controls={id}
      aria-label={open ? readerCopy('thoughtLineCollapse', 'Collapse this thought') : readerCopy('thoughtLineExpand', 'Expand this thought')} onClick={toggle}>
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="m6 4 4 4-4 4" /></svg>
    </button>
  </div>
}
