import { useEffect, useMemo, useState } from 'react'
import type { RefObject } from 'react'
import type { UseChat } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { readerCopy } from '../../core/i18n'
import { Disclosure, StatusText } from './motion'
import { boundaryOf, processChoiceKey, processExpanded } from './projection'
import type { ReaderGroup } from './projection'
import { useChoice } from './reader-state'
import { flowIdOf, groupStatus, turnHasProcess } from './turn-group'
import type { WaitingAnchor } from './waiting-clock'

/**
 * The conversation's one live status line (D57), under the newest message:
 * the model's silence before it answers, timed, or what the running turn is
 * doing now. A running turn's process opens and closes from this line; a
 * closed turn carries its own line at its top, with the time it took.
 */

/** Past this, a wait stops reading as a pause and reads as the model not answering. */
const WAIT_OVERTIME_MS = 10_000

function waitText(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  return seconds < 60
    ? readerCopy('waitSeconds', '{seconds}s', { seconds })
    : readerCopy('waitMinutes', '{minutes}m {seconds}s', { minutes: Math.floor(seconds / 60), seconds: String(seconds % 60).padStart(2, '0') })
}

/** How long the model has had the move, counted from the event that handed it over. */
function WaitClock({ startTime }: { startTime: number | null }) {
  const [mountedAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [])
  const waited = Math.max(0, now - (startTime ?? mountedAt))
  const overtime = waited >= WAIT_OVERTIME_MS
  return <span className="dsh-claude-reader-wait-clock" data-dsh-claude-reader-overtime={overtime ? '' : undefined}>
    <span className="dsh-claude-reader-wait-seconds">{waitText(waited)}</span>
    {overtime && <span className="dsh-claude-reader-wait-badge">{readerCopy('waitOvertime', 'No response yet')}</span>}
  </span>
}

export function TurnStatus({ group, sessionId, useChat, awaiting, anchor, waitingLabel, waitingForYou, motion, buttonRef }: {
  /** The conversation's newest group. */
  group: ReaderGroup | undefined
  sessionId: SessionId
  useChat: UseChat
  /** The model owes the next move: the line times its silence. */
  awaiting: boolean
  anchor: WaitingAnchor
  waitingLabel: string
  /** A question or an approval waits on the reader. */
  waitingForYou: boolean
  motion: boolean
  buttonRef: RefObject<HTMLButtonElement>
}) {
  const turn = useChat(snapshot => group?.turn === null || group?.turn === undefined ? undefined : snapshot.timeline.turns.get(group.turn))
  const boundary = useMemo(() => boundaryOf(turn), [turn])
  const running = group !== undefined && boundary.status === 'open'
  const status = useChat(snapshot => running ? groupStatus(snapshot, group, waitingForYou) : '')
  const hasProcess = useChat(snapshot => running && turnHasProcess(group, key => snapshot.nodes.get(key), boundary))
  const [choice, setChoice] = useChoice(sessionId, group === undefined ? '' : processChoiceKey(group.key, boundary))
  if (!awaiting && !running) return null
  const busy = awaiting || !waitingForYou
  const label = <StatusText text={awaiting ? waitingLabel : status} motion={motion} shimmer={busy} />
  return <div className="dsh-claude-reader-live-status" role="status" data-chat-running={busy ? '' : undefined}>
    {hasProcess
      ? <Disclosure open={processExpanded(choice, boundary)} onChange={setChoice} controls={flowIdOf(group!.key)} buttonRef={buttonRef} label={label} />
      : label}
    {awaiting && <WaitClock key={anchor.key} startTime={anchor.time} />}
  </div>
}
