import type { HostChatSnapshot, HostTurn } from '@dsh-claude-style/contracts/services'

/**
 * When the model has kept the reader waiting, read off the host's chat
 * snapshot. The wait follows dsh-better-display's waiting clock (MIT): it
 * counts from the moment the move went back to the model, not from the turn's
 * first message, so the minutes a tool spent never count against the model.
 */

/** Past this, a wait stops reading as a pause and reads as the model not answering. */
export const WAIT_OVERTIME_MS = 10_000

/**
 * Where a wait first seen at `now` began. Before the model has written anything
 * in the turn, the wait is the turn's own, from its start; after that the move
 * came back the moment the page saw the wait begin, which is as close as the
 * snapshot says — it carries no time for a tool's result.
 */
export function waitStart(turn: HostTurn, now: number) {
  const wrote = turn.steps.some(step => {
    const assistant = step.data.get('assistant-step')
    return assistant !== undefined && assistant.blocks.length > 0
  })
  return !wrote && turn.start !== undefined ? turn.start.time : now
}

/** The newest open turn of a snapshot, the one the running row speaks for. */
export function openTurn(snapshot: HostChatSnapshot): HostTurn | undefined {
  let found: HostTurn | undefined
  for (const turn of snapshot.timeline.turns.values()) {
    if (turn.status !== 'open') continue
    if (found === undefined || turn.turn > found.turn) found = turn
  }
  return found
}
