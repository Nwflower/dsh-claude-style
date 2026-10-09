import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { StreamBuffer } from './stream-buffer'

/**
 * Pacing one block's streaming text (D57), ported from dsh-better-display's
 * streaming hook (MIT). The view shows what the buffer has revealed; history,
 * a selection, held motion and a hidden page all show the source at once.
 */

/**
 * The view-wide presentation clock: whether text may be paced at all, when the
 * view mounted (text older than that is history), and whether the fold's
 * choreography is holding the reveal (`paused`) or handing a fold's content back (`resumed`).
 */
export const StreamMotionContext = createContext<{ enabled: boolean, activatedAt: number, paused?: boolean, resumed?: boolean }>({ enabled: false, activatedAt: 0 })

/** The longest a background frame may count while a fold hands its text back. */
const HANDOFF_FRAME_MS = 32

export function useStreamingText(source: string, streaming: boolean, options: { startedAt?: number, interrupted: boolean, selected: boolean }) {
  const { enabled, activatedAt, paused = false, resumed = false } = useContext(StreamMotionContext)
  const fresh = resumed || (options.startedAt ?? 0) >= activatedAt
  const buffer = useRef<StreamBuffer | null>(null)
  // Only text that arrives while this view watches is paced; a mounted prefix never replays.
  if (buffer.current === null) buffer.current = new StreamBuffer(enabled && (streaming || resumed) && fresh ? '' : source)
  const [display, setDisplay] = useState(() => ({ text: buffer.current!.visible, revision: 0 }))
  const frame = useRef(0)
  const immediate = !enabled || options.interrupted || options.selected
  const handoff = useRef(resumed)
  const clock = useRef(performance.now())
  const publish = () => {
    const current = buffer.current!
    setDisplay(previous => previous.text === current.visible && previous.revision === current.revision ? previous : { text: current.visible, revision: current.revision })
  }
  useLayoutEffect(() => {
    cancelAnimationFrame(frame.current)
    const current = buffer.current!
    // While the choreography holds the reveal the buffer still takes the source,
    // so the text never falls behind what arrived; only the frames stop.
    if (paused && !immediate && !document.hidden) {
      current.update(source, performance.now(), { immediate: false, finished: !streaming })
      publish()
      return
    }
    let previous = performance.now()
    current.update(source, handoff.current ? clock.current : previous, { immediate: immediate || document.hidden, finished: !streaming && !resumed })
    publish()
    const tick = (now: number) => {
      // A delayed frame must not dump a whole handed-back fold at once.
      clock.current += Math.min(HANDOFF_FRAME_MS, Math.max(0, now - previous))
      previous = now
      if (document.hidden) current.flush()
      else current.advance(handoff.current ? clock.current : now)
      publish()
      if (current.pending) frame.current = requestAnimationFrame(tick)
      else handoff.current = false
    }
    if (current.pending) frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [source, streaming, immediate, paused, resumed])
  useEffect(() => {
    const hidden = () => {
      if (!document.hidden) return
      cancelAnimationFrame(frame.current)
      buffer.current!.flush()
      publish()
    }
    document.addEventListener('visibilitychange', hidden)
    return () => document.removeEventListener('visibilitychange', hidden)
  }, [])
  return {
    text: immediate ? source : display.text,
    /** Whether this text fades in word by word. */
    fades: enabled && !options.interrupted && !options.selected,
    pending: !immediate && display.text !== source,
  }
}
