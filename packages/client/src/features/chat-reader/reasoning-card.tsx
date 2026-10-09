import { useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CONVERSATION_SCROLL_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { readerCopy } from '../../core/i18n'
import { writeScroll } from '../../shared/scroll-owner'
import { REASON_CHASE_HOLD, REASON_HOLD, REASON_LINES, REASON_STEP, reasoningTarget } from './reasoning-follow'
import { StreamMotionContext } from './streaming'

/**
 * A thought, in a card that bounds it (D57), ported from dsh-better-display's
 * ReasoningCard (MIT). While the step is live the card follows its own text at
 * reading pace: the track slides on a transform, two lines and a hold, and
 * catches up in one step when the model writes faster than that. The reader's
 * wheel, a pointer, focus or a selection hands the card back to native
 * scrolling at once; "Follow latest" resumes. Expanding grows the same
 * transcript to the reading height without changing where it is.
 */

/** The host's own layout variable for the composer's height; the card fits above it. */
const COMPOSER_HEIGHT_PROPERTY = '--dsh-composer-height'
const COMPOSER_HEIGHT_FALLBACK = 152
const EASE = 'cubic-bezier(.22,1,.36,1)'
const RESIZE_MS = 300
const RESIZE_SLACK_MS = 240

export function ReasoningCard({ children, step, active, motion, selected, onRead }: {
  children: ReactNode
  step: number
  /** The step is live: its text is still arriving. */
  active: boolean
  motion: boolean
  selected: boolean
  onRead: () => void
}) {
  const viewport = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const controls = useId()
  const [expanded, setExpanded] = useState(false)
  const [following, setFollowing] = useState(true)
  const [overflow, setOverflow] = useState(false)
  const [edges, setEdges] = useState('none')
  const lastHeight = useRef(0)
  const resize = useRef<Animation | null>(null)
  const previousExpanded = useRef(expanded)
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

  // The reading height: what the conversation leaves above the composer.
  useLayoutEffect(() => {
    if (!expanded) return
    const port = viewport.current
    const host = port?.closest<HTMLElement>(CONVERSATION_SCROLL_SELECTOR)
    if (port === null || port === undefined || host === null || host === undefined) return
    const fit = () => {
      const composer = parseFloat(getComputedStyle(host).getPropertyValue(COMPOSER_HEIGHT_PROPERTY)) || COMPOSER_HEIGHT_FALLBACK
      const heading = port.parentElement?.querySelector<HTMLElement>('.dsh-claude-reader-thought-heading')?.offsetHeight ?? 30
      const footer = port.parentElement?.querySelector<HTMLElement>('.dsh-claude-reader-thought-footer')?.offsetHeight ?? 38
      port.style.setProperty('--dsh-claude-reader-thought-reading', `${Math.max(120, host.clientHeight - composer - heading - footer - 32)}px`)
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(host)
    return () => observer.disconnect()
  }, [expanded])

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
    const measure = (recordHeight = true) => {
      const preview = parseFloat(getComputedStyle(port).getPropertyValue('--dsh-claude-reader-thought-preview'))
      setOverflow(text.offsetHeight > preview + 1)
      lastPainted = paintedOffset()
      const top = lastPainted > 1
      const bottom = tail() - lastPainted > 1
      const next = top ? bottom ? 'both' : 'top' : bottom ? 'bottom' : 'none'
      setEdges(value => value === next ? value : next)
      if (recordHeight && resize.current === null) lastHeight.current = port.clientHeight
    }
    stopFollow.current = () => {
      cancel()
      manual()
      measure(false)
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
    measure(false)
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
  }, [allowed, pause])

  // Growing or shrinking the card keeps it in view and animates its height.
  useLayoutEffect(() => {
    const port = viewport.current
    if (port === null) return
    const changed = expanded !== previousExpanded.current
    previousExpanded.current = expanded
    const from = resize.current !== null ? port.clientHeight : lastHeight.current
    resize.current?.cancel()
    resize.current = null
    port.style.maxHeight = ''
    port.style.height = ''
    const target = port.clientHeight
    if (changed && !selected) keepInView(port)
    if (!changed || !motion || from < 1 || Math.abs(target - from) < 1) {
      lastHeight.current = target
      return
    }
    // The cap would clamp the first frame of a collapse.
    port.style.maxHeight = 'none'
    const animation = port.animate([{ height: `${from}px` }, { height: `${target}px` }], { duration: RESIZE_MS, easing: EASE, fill: 'both' })
    resize.current = animation
    let settled = false
    const settle = () => {
      if (settled) return
      settled = true
      if (resize.current === animation) resize.current = null
      animation.cancel()
      port.style.maxHeight = ''
      port.style.height = ''
      lastHeight.current = port.clientHeight
    }
    animation.onfinish = settle
    const deadline = window.setTimeout(settle, RESIZE_MS + RESIZE_SLACK_MS)
    return () => window.clearTimeout(deadline)
  }, [expanded, motion, selected])
  useEffect(() => () => resize.current?.cancel(), [])

  const label = readerCopy('thoughtStep', 'Step {step}', { step })
  return <div className="dsh-claude-reader-thought" data-dsh-claude-reader-anchor="" data-dsh-claude-reader-expanded={expanded ? '' : undefined}
    data-dsh-claude-reader-following={allowed ? '' : undefined} data-dsh-claude-reader-overflow={overflow ? '' : undefined}>
    <div className="dsh-claude-reader-thought-heading">
      <span className="dsh-claude-reader-thought-label">{readerCopy('thoughtLabel', 'Thinking')}</span>
      <span>{label}</span>
    </div>
    <div ref={viewport} id={controls} className="dsh-claude-reader-thought-viewport" data-dsh-claude-reader-edges={edges} role="region"
      aria-label={overflow ? readerCopy('thoughtRegionScroll', '{step} thinking, scrollable', { step: label }) : readerCopy('thoughtRegion', '{step} thinking', { step: label })}
      tabIndex={overflow ? 0 : undefined} onPointerDown={pause} onFocus={pause}>
      <div ref={track} className="dsh-claude-reader-thought-track">
        <div ref={content} className="dsh-claude-reader-thought-content">{children}</div>
      </div>
    </div>
    {(overflow || expanded) && <div className="dsh-claude-reader-thought-footer">
      {active && motion
        ? <button type="button" className="dsh-claude-reader-thought-action" disabled={selected} aria-controls={controls}
            title={selected ? readerCopy('thoughtFollowSelected', 'Clear the selection to follow again') : undefined}
            onClick={() => {
              if (following) pause()
              else {
                onRead()
                setFollowing(true)
              }
            }}>
            <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">{following ? <path d="M5.5 4v8m5-8v8" /> : <path d="M8 3v10m-4-4 4 4 4-4" />}</svg>
            {following ? readerCopy('thoughtPause', 'Pause following') : readerCopy('thoughtFollow', 'Follow latest')}
          </button>
        : <span className="dsh-claude-reader-thought-caption">{expanded ? readerCopy('thoughtManual', 'Reading by hand') : readerCopy('thoughtScrollable', 'Scroll to read')}</span>}
      <button type="button" className="dsh-claude-reader-thought-action" aria-expanded={expanded} aria-controls={controls} onClick={() => {
        onRead()
        setExpanded(value => !value)
      }}>
        {expanded ? readerCopy('thoughtCollapse', 'Collapse') : readerCopy('thoughtExpand', 'Read in full')}
        <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">{expanded ? <path d="m4 10 4-4 4 4" /> : <path d="m4 6 4 4 4-4" />}</svg>
      </button>
    </div>}
  </div>
}

/** Bring a resized card back into the conversation's reading area, above the composer (D41). */
function keepInView(port: HTMLElement) {
  const card = port.parentElement
  const host = port.closest<HTMLElement>(CONVERSATION_SCROLL_SELECTOR)
  if (card === null || host === null) return
  const composer = parseFloat(getComputedStyle(host).getPropertyValue(COMPOSER_HEIGHT_PROPERTY)) || COMPOSER_HEIGHT_FALLBACK
  const region = host.getBoundingClientRect()
  const box = card.getBoundingClientRect()
  const top = region.top + 16
  const bottom = region.bottom - composer - 16
  const delta = box.top < top ? box.top - top : box.bottom > bottom ? Math.min(box.bottom - bottom, box.top - top) : 0
  if (Math.abs(delta) > 1) writeScroll(host, Math.max(0, host.scrollTop + delta), 'fold')
}
