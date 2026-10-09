import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ChatSnapshot, UseChat } from '@deepseek-ai/dsh-client-ui-chat/client'
import { FOLD_TIMING, collapseRows, containsNewUser, flowRows, retiringKeys } from './fold-choreography'
import type { FoldPhase } from './fold-choreography'
import { FoldSummary } from './fold-summary'
import type { LiveStep, LiveTurnItem } from './live-turn'
import { layoutEnd, layoutStart } from './reader-follow'
import { StreamMotionContext } from './streaming'

/**
 * One turn's steps under the live fold's choreography (D57), ported from
 * dsh-better-display's ChoreographedFlow (MIT). While a fold shrinks, counts
 * and settles, the flow keeps showing the frame it started from; whatever
 * arrived meanwhile is revealed in one step at the end.
 */

const FlowSnapshot = createContext<ChatSnapshot | null>(null)

/** The flow's own frame of the chat: a step inside it reads what the flow shows, never the live store. */
export const useFlowChat: UseChat = (selector) => {
  const snapshot = useContext(FlowSnapshot)
  if (snapshot === null) throw new Error('dsh-claude-style: a flow step rendered outside its flow')
  return selector(snapshot)
}

/** What the flow presents: the turn's items and the chat they were read from. */
export interface PresentationFrame {
  items: readonly LiveTurnItem[]
  snapshot: ChatSnapshot
}

interface Transaction {
  phase: FoldPhase
  shown: PresentationFrame
  target: PresentationFrame
  retiring: readonly string[]
  beforeKeys: ReadonlySet<string>
}

const idle = (frame: PresentationFrame): Transaction => ({ phase: 'idle', shown: frame, target: frame, retiring: [], beforeKeys: new Set() })

/** The fold cells' own open and close (220 ms); a closing cell keeps its children until it has shrunk. */
const CELL_MS = 220

function FlowCell({ hidden, instant, motion, rowKey, summary = false, children }: {
  hidden: boolean
  instant: boolean
  motion: boolean
  rowKey: string
  summary?: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [present, setPresent] = useState(!hidden)
  const previous = useRef(hidden)
  if (!hidden && !present) setPresent(true)
  useLayoutEffect(() => {
    const element = ref.current
    const changed = previous.current !== hidden
    previous.current = hidden
    if (element === null) return
    if (!changed || instant || !motion) {
      setPresent(!hidden)
      return
    }
    const height = element.scrollHeight
    const animation = element.animate([
      { height: `${hidden ? height : 0}px`, opacity: hidden ? 1 : 0 },
      { height: `${hidden ? 0 : height}px`, opacity: hidden ? 0 : 1 },
    ], { duration: CELL_MS, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' })
    layoutStart(element)
    let released = false
    const release = () => {
      if (released) return
      released = true
      layoutEnd(element)
    }
    // A closing cell is held at zero by the fill until React has removed its
    // children; cancelling on finish would show it at full height for a frame.
    // The cleanup below cancels once `present` has been committed.
    let settled = false
    const settle = () => {
      if (settled) return
      settled = true
      // An opening cell's fill only pins the measured height, which a later shrink would hold open.
      if (!hidden) animation.cancel()
      setPresent(!hidden)
      release()
    }
    animation.onfinish = settle
    // A cancelled or skipped animation never finishes, and its fill would keep the cell invisible.
    const deadline = window.setTimeout(settle, CELL_MS + FOLD_TIMING.watchdogSlack)
    return () => {
      window.clearTimeout(deadline)
      animation.cancel()
      release()
    }
  }, [hidden, instant, motion, present])
  return <div ref={ref} className="dsh-claude-reader-flow-cell" data-dsh-claude-reader-flow-key={rowKey} data-dsh-claude-reader-flow-summary={summary ? '' : undefined}
    hidden={hidden && !present} aria-hidden={hidden || undefined} {...(hidden ? { inert: '' } : {})}>
    {present && <div className="dsh-claude-reader-flow-inner">{children}</div>}
  </div>
}

/** Rendered frames that count toward a phase; a busy browser that skips painting does not shorten it. */
function usePhaseClock(phase: FoldPhase, advance: (phase: FoldPhase) => void) {
  useEffect(() => {
    if (phase !== 'count' && phase !== 'settle' && phase !== 'reveal') return
    let done = false
    const finish = () => {
      if (done) return
      done = true
      advance(phase)
    }
    let elapsed = 0
    let previous: number | undefined
    let frame = 0
    const tick = (now: number) => {
      if (previous !== undefined) elapsed += Math.min(40, now - previous)
      previous = now
      if (elapsed < FOLD_TIMING[phase]) {
        frame = requestAnimationFrame(tick)
        return
      }
      finish()
    }
    frame = requestAnimationFrame(tick)
    // A hidden page gets no frames; the deadline moves the phase on regardless.
    const deadline = window.setTimeout(finish, FOLD_TIMING[phase] + FOLD_TIMING.watchdogSlack)
    return () => {
      window.clearTimeout(deadline)
      cancelAnimationFrame(frame)
    }
  }, [phase, advance])
}

export function ChoreographedFlow({ id, frame, motion, enabled, urgent, open, onOpenChange, processOpen, renderStep }: {
  id: string
  frame: PresentationFrame
  motion: boolean
  /** Whether a fold may animate at all: the turn is open and the reader is not selecting in it. */
  enabled: boolean
  /** Something the reader must see now (an error, a question, the turn stopped): skip to the new frame. */
  urgent: boolean
  open: Readonly<Record<string, boolean>>
  onOpenChange: (key: string, open: boolean) => void
  processOpen: boolean
  renderStep: (step: LiveStep, folded: boolean) => ReactNode
}) {
  const root = useRef<HTMLDivElement>(null)
  const stream = useContext(StreamMotionContext)
  const latest = useRef(frame)
  latest.current = frame
  const [visible, setVisible] = useState(() => !document.hidden)
  const [state, setState] = useState<Transaction>(() => idle(frame))
  const bypass = !motion || !enabled || urgent || !visible || !processOpen || (state.phase !== 'idle' && Object.values(open).some(Boolean))
  // Adjusted during render, so the new layout never paints once before its fold.
  if ((bypass || containsNewUser(state.shown.items, frame.items)) && (state.phase !== 'idle' || state.shown !== frame)) {
    setState(idle(frame))
  } else if (state.phase === 'idle' && state.shown !== frame) {
    const retiring = retiringKeys(state.shown.items, frame.items, open)
    setState(retiring.length > 0
      ? { ...state, phase: 'collapse', target: frame, retiring, beforeKeys: new Set(flowRows(state.shown.items).map(row => row.key)) }
      : idle(frame))
  }
  useEffect(() => {
    const update = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  useLayoutEffect(() => {
    if (state.phase !== 'collapse') return
    const element = root.current
    if (element === null) return
    const retiring = new Set(state.retiring)
    const animations: Animation[] = []
    layoutStart(element)
    for (const cell of element.querySelectorAll<HTMLElement>(':scope > [data-dsh-claude-reader-flow-key]')) {
      const key = cell.dataset.dshClaudeReaderFlowKey!
      const header = cell.dataset.dshClaudeReaderFlowSummary !== undefined && !state.beforeKeys.has(key)
      if (!retiring.has(key) && !header) continue
      const height = cell.getBoundingClientRect().height
      animations.push(cell.animate(header
        ? [{ height: '0px', opacity: 0 }, { height: `${height}px`, opacity: 1 }]
        : [{ height: `${height}px`, opacity: 1 }, { height: `${height * 0.5}px`, opacity: 0.85, offset: 0.5 }, { height: '0px', opacity: 0 }],
      { duration: FOLD_TIMING.collapse, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' }))
    }
    // Whatever arrived during the shrink is taken once, without restarting it.
    // The promise and the deadline race; the first one moves the phase on.
    let cancelled = false
    let advanced = false
    const advance = () => {
      if (cancelled || advanced) return
      advanced = true
      setState(current => current.phase === 'collapse' ? { ...current, phase: 'count', target: latest.current } : current)
    }
    // `finished` rejects on cancel and can stay pending on a compositor that never runs it.
    const deadline = window.setTimeout(advance, FOLD_TIMING.collapse + FOLD_TIMING.watchdogSlack)
    Promise.all(animations.map(animation => animation.finished)).then(advance, advance)
    return () => {
      cancelled = true
      window.clearTimeout(deadline)
      animations.forEach(animation => animation.cancel())
      layoutEnd(element)
    }
  }, [state.phase])
  const [advancePhase] = useState(() => (phase: FoldPhase) => setState(current => {
    if (current.phase !== phase) return current
    if (phase === 'count') return { ...current, phase: 'settle' }
    if (phase === 'settle') return { ...current, phase: 'reveal' }
    return idle(current.target)
  }))
  usePhaseClock(state.phase, advancePhase)
  useLayoutEffect(() => {
    if (state.phase !== 'reveal' || root.current === null) return
    const element = root.current
    layoutStart(element)
    // Opacity alone would insert the new layout in one frame: real space opens first,
    // and the text stays paused until it has, then catches up.
    const animations = Array.from(element.children as HTMLCollectionOf<HTMLElement>)
      .filter(child => !child.hidden && !state.beforeKeys.has(child.dataset.dshClaudeReaderFlowKey!))
      .map(child => child.animate([
        { height: '0px', opacity: 0 },
        { height: `${child.getBoundingClientRect().height}px`, opacity: 1 },
      ], { duration: FOLD_TIMING.reveal, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' }))
    return () => {
      animations.forEach(animation => animation.cancel())
      layoutEnd(element)
    }
  }, [state.phase])

  const blocked = state.phase === 'collapse' || state.phase === 'count' || state.phase === 'settle'
  const source = state.phase === 'idle' || state.phase === 'collapse' ? state.shown : state.target
  const rows = state.phase === 'collapse' ? collapseRows(state.shown.items, state.target.items) : flowRows(source.items)
  return <FlowSnapshot.Provider value={source.snapshot}>
    <StreamMotionContext.Provider value={{ ...stream, paused: state.phase !== 'idle', resumed: state.phase === 'reveal' }}>
      <div id={id} ref={root} className="dsh-claude-reader-flow" data-dsh-claude-reader-transition={state.phase}>
        {rows.map(row => {
          if (row.kind === 'summary') {
            return <FlowCell key={row.key} rowKey={row.key} hidden={false} instant motion={motion} summary>
              <FoldSummary kind="live" summary={row.item.summary} steps={row.item.steps} open={processOpen && open[row.key] === true}
                onChange={value => onOpenChange(row.key, value)} motion={motion && state.phase !== 'collapse'} />
            </FlowCell>
          }
          const folded = row.foldKey !== undefined
          const hidden = (folded && (!processOpen || open[row.foldKey!] !== true)) || (blocked && state.phase !== 'collapse' && !state.beforeKeys.has(row.key))
          // A retiring step keeps its props until it has actually shrunk.
          return <FlowCell key={row.key} rowKey={row.key} hidden={hidden} instant={state.phase !== 'idle'} motion={motion}>
            {renderStep(row.step, folded)}
          </FlowCell>
        })}
      </div>
    </StreamMotionContext.Provider>
  </FlowSnapshot.Provider>
}
