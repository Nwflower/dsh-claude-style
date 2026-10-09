import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { readerCopy } from '../../core/i18n'
import { layoutEnd, layoutStart } from './reader-follow'

/**
 * The reading view's moving parts (D57), ported from dsh-better-display's
 * motion module (MIT): the process disclosure, a fragment that opens and closes
 * on its measured height, narration retiring once its turn completes, and the
 * status label's swap. Every height animation brackets itself in the layout
 * events, so the follow stands down while the column changes size.
 */

/** A height animation's watchdog: a cancelled or dropped animation must still settle. */
const ANIMATION_SLACK_MS = 240

/** The keys of the reading elements a live text selection touches; their rows hold still. */
export function usePinnedSelection(root: RefObject<HTMLElement>, selector: string): readonly string[] {
  const [keys, setKeys] = useState<readonly string[]>([])
  useEffect(() => {
    const update = () => {
      const selection = document.getSelection()
      const range = selection !== null && !selection.isCollapsed && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
      const next = range === null || root.current === null ? [] : [...new Set(
        Array.from(root.current.querySelectorAll<HTMLElement>(selector))
          .filter(element => range.intersectsNode(element))
          .map(element => element.dataset.dshClaudeReaderKey ?? '')
          .filter(key => key !== ''),
      )]
      setKeys(previous => previous.length === next.length && previous.every((key, index) => key === next[index]) ? previous : next)
    }
    document.addEventListener('selectionchange', update)
    return () => document.removeEventListener('selectionchange', update)
  }, [root, selector])
  return keys
}

/**
 * A status label that swaps its text the way the reference does: the old text
 * leaves upward, the new one rises 50 ms later, 150 ms each. A busy label
 * carries a shimmer. With motion held, the text simply changes.
 */
export function StatusText({ text, motion, shimmer = false }: { text: string, motion: boolean, shimmer?: boolean }) {
  const incoming = useRef<HTMLSpanElement>(null)
  const [frame, setFrame] = useState<{ text: string, id: number, phase: 'idle' | 'start' | 'running', outgoing: { text: string, id: number } | null }>({ text, id: 0, phase: 'idle', outgoing: null })
  // Adjusted during render, so a new label never paints once before its entry pose.
  if (frame.text !== text) setFrame({ text, id: frame.id + 1, phase: motion ? 'start' : 'idle', outgoing: motion ? { text: frame.text, id: frame.id } : null })
  useLayoutEffect(() => {
    const id = frame.id
    const settle = () => setFrame(current => current.id === id && current.outgoing !== null ? { ...current, phase: 'idle', outgoing: null } : current)
    if (!motion) {
      settle()
      return
    }
    if (frame.outgoing === null || incoming.current === null) return
    // The entry pose has to be committed before the transition is released.
    incoming.current.getBoundingClientRect()
    let timer = 0
    const tick = requestAnimationFrame(() => {
      setFrame(current => current.id === id ? { ...current, phase: 'running' } : current)
      timer = window.setTimeout(settle, 200)
    })
    return () => {
      cancelAnimationFrame(tick)
      window.clearTimeout(timer)
    }
  }, [frame.id, motion])
  const swapping = motion && frame.outgoing !== null
  return <span className="dsh-claude-reader-status">
    <span className="dsh-claude-reader-status-stage" aria-hidden="true" data-dsh-claude-reader-shimmer={shimmer && motion ? '' : undefined}>
      <span className="dsh-claude-reader-status-sizer">{text}</span>
      {swapping && <span key={frame.outgoing!.id} className="dsh-claude-reader-status-copy" data-dsh-claude-reader-swap={frame.phase === 'running' ? 'exit' : 'held'}>{frame.outgoing!.text}</span>}
      <span key={frame.id} ref={incoming} className="dsh-claude-reader-status-copy" data-dsh-claude-reader-swap={swapping && frame.phase === 'start' ? 'enter' : 'settled'} data-text={text}>{text}</span>
    </span>
    <span className="dsh-claude-reader-sr-only" role="status" aria-live="polite" aria-atomic="true">{text}</span>
  </span>
}

/** The process disclosure: its label, and a chevron that turns as it opens. */
export function Disclosure({ open, onChange, label, controls, buttonRef }: {
  open: boolean
  onChange: (open: boolean) => void
  label: ReactNode
  controls?: string
  buttonRef: RefObject<HTMLButtonElement>
}) {
  return <div className="dsh-claude-reader-disclosure" data-dsh-claude-reader-open={open ? '' : undefined}>
    <button ref={buttonRef} type="button" className="dsh-claude-reader-disclosure-button" aria-expanded={open} aria-controls={controls}
      aria-label={open ? readerCopy('processCollapse', 'Collapse the thinking and process') : readerCopy('processExpand', 'Expand the thinking and process')}
      onClick={() => onChange(!open)}>
      {label}
      <svg className="dsh-claude-reader-chevron" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="m6 4 4 4-4 4" /></svg>
    </button>
  </div>
}

/**
 * One piece of a turn's process, kept in source order beside its narration.
 * It opens and closes on its measured height (380 ms); a closed fragment
 * unmounts once the animation settles, and focus inside it returns to the
 * disclosure that closed it.
 */
export function ProcessFragment({ open, motion, onRead, returnFocusTo, nodeKey, framed = false, children }: {
  open: boolean
  motion: boolean
  onRead: () => void
  returnFocusTo: RefObject<HTMLElement>
  nodeKey: string
  framed?: boolean
  children: ReactNode
}) {
  const body = useRef<HTMLDivElement>(null)
  const running = useRef<Animation | null>(null)
  const previous = useRef(open)
  const [present, setPresent] = useState(open)
  useLayoutEffect(() => {
    const element = body.current
    if (element === null) return
    const from = running.current !== null ? element.getBoundingClientRect().height : previous.current ? element.scrollHeight : 0
    running.current?.cancel()
    running.current = null
    const changed = previous.current !== open
    previous.current = open
    if (open) setPresent(true)
    if (!open && document.activeElement !== null && element.contains(document.activeElement)) returnFocusTo.current?.focus()
    element.style.height = open ? 'auto' : '0px'
    const target = open ? element.scrollHeight : 0
    if (!motion || !changed || Math.abs(from - target) < 1) {
      setPresent(open)
      return
    }
    const frames = from > target
      ? [
          { offset: 0, height: `${from}px`, opacity: 1, transform: 'scaleY(1) translateY(0)' },
          { offset: 0.32, height: `${Math.round(from * 0.92)}px`, opacity: 0.35, transform: 'scaleY(0.96) translateY(-2px)' },
          { offset: 1, height: `${target}px`, opacity: 0, transform: 'scaleY(0.68) translateY(-8px)' },
        ]
      : [
          { offset: 0, height: `${from}px`, opacity: 0, transform: 'scaleY(0.8) translateY(6px)' },
          { offset: 0.3, height: `${Math.round(target * 0.4)}px`, opacity: 0.4, transform: 'scaleY(0.92) translateY(3px)' },
          { offset: 1, height: `${target}px`, opacity: 1, transform: 'scaleY(1) translateY(0)' },
        ]
    layoutStart(element)
    const animation = element.animate(frames, { duration: 380, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' })
    running.current = animation
    let settled = false
    const settle = () => {
      if (settled) return
      settled = true
      if (running.current === animation) running.current = null
      // `fill: both` holds the first keyframe while the animation lives: one that
      // never finished would leave the fragment invisible.
      animation.cancel()
      layoutEnd(element)
      setPresent(open)
    }
    animation.onfinish = settle
    const deadline = window.setTimeout(settle, 380 + ANIMATION_SLACK_MS)
    return () => {
      window.clearTimeout(deadline)
      if (!settled) {
        settled = true
        running.current?.cancel()
        layoutEnd(element)
      }
    }
  }, [open, motion, returnFocusTo])
  if (!open && !present) return null
  return <div ref={body} className="dsh-claude-reader-fragment" data-dsh-claude-reader-process="" data-dsh-claude-reader-key={nodeKey}
    aria-hidden={!open} {...(open ? {} : { inert: '' })} onPointerDown={() => { if (open) onRead() }} onFocusCapture={() => { if (open) onRead() }}>
    <div className={framed ? 'dsh-claude-reader-frame' : 'dsh-claude-reader-contents'}>{children}</div>
  </div>
}

/** Narration that leaves once its turn completes: only text the reader saw retires with motion; history is simply absent. */
export function RetiringContent({ visible, motion, children }: { visible: boolean, motion: boolean, children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  const animation = useRef<Animation | null>(null)
  const [present, setPresent] = useState(visible)
  const [focusHeld, setFocusHeld] = useState(false)
  useLayoutEffect(() => {
    const element = root.current
    if (visible) {
      animation.current?.cancel()
      animation.current = null
      setPresent(true)
      return
    }
    if (element === null) return
    // The reader is working inside it: it waits for focus to leave.
    if (document.activeElement !== null && element.contains(document.activeElement)) {
      setFocusHeld(true)
      return
    }
    if (focusHeld) return
    const from = element.getBoundingClientRect().height
    animation.current?.cancel()
    animation.current = null
    if (!motion || from < 1) {
      setPresent(false)
      return
    }
    layoutStart(element)
    const next = element.animate([{ height: `${from}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 220, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' })
    animation.current = next
    // A cancelled run (the turn reopened, the view left) closes its bracket too.
    let bracketed = true
    const close = () => {
      if (!bracketed) return
      bracketed = false
      layoutEnd(element)
    }
    next.addEventListener('cancel', close)
    next.onfinish = () => {
      close()
      if (animation.current !== next) return
      animation.current = null
      next.cancel()
      setPresent(false)
    }
  }, [visible, motion, focusHeld])
  useEffect(() => () => animation.current?.cancel(), [])
  if (!visible && !present) return null
  return <div ref={root} className="dsh-claude-reader-retiring" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocusHeld(false) }}>
    {children}
  </div>
}
