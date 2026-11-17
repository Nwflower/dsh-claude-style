import type { HostChatSnapshot, HostSessionStatsProjection, HostTurn } from '@dsh-claude-style/contracts/services'

/**
 * When the model has kept the reader waiting, read off the host's chat
 * snapshot. The wait counts from the moment the move went back to the model,
 * not from the turn's first message, so the minutes a tool spent never count
 * against the model.
 */

/** The shortest a wait runs before it reads as the model not answering; the session's own pace stretches the margin past this (overtimeMargin). */
export const WAIT_OVERTIME_MS = 10_000

/**
 * The margin a wait runs past before the badge stands: twice the session's
 * average time to first token, never under the floor. A model whose first token
 * takes a quarter minute is at work through that stretch, and the floor alone
 * would call every such turn unresponsive. The average is the host's settled
 * statistics, summed over the steps that reported a first token; with no such
 * step there is nothing to average, and the floor is the whole margin.
 */
export function overtimeMargin(stats: HostSessionStatsProjection | null): number {
  if (stats === null || !(stats.ttftSteps > 0)) return WAIT_OVERTIME_MS
  return Math.max(2 * (stats.ttftMs / stats.ttftSteps), WAIT_OVERTIME_MS)
}

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

/**
 * How long one wording stands once it has been written. A turn moves through
 * several states a second — a step settles and the next one starts, a call that
 * lasts a frame, the model's own clause — and a line that swapped on every one
 * of them reads as flicker. The wording written here is locked for this long,
 * and the pass that finds the lock run out writes whatever stands then, so
 * nothing that came and went inside the second is played back.
 */
export const WORD_LOCK_MS = 1000

/** The wording standing on one row, and until when it may not be replaced. */
export interface StandingWords {
  word: string
  until: number
}

/** What one row holds between passes: the wording standing, the call words waiting for it, and the model's own words to fall back on. */
export interface RowWords {
  standing: StandingWords
  pending?: string
  /** The model's own words last read (wordForPass): what the line stands on between two of them. */
  held?: string
}

/** What one pass read: the words the state answers, the call the words are about, and the host's words under both. */
export interface PassReading {
  /** The words the state answers, or null where nothing can be said — the state is the bare thinking one, or no state can be read at all. */
  word: string | null
  /** The words are the model's own, read out of its reasoning (shared/turn-activity), rather than a state's copy. */
  own: boolean
  /** The words one call in flight carries of its own — the file it works on, or the description it declares — or null where the running call says none. */
  detail: string | null
  /** The state's own words are about a call: one being drawn up, or calls running with nothing of their own to say. */
  onCall: boolean
  /** The host's own words for a wait, which stand when nothing else does. */
  host: string
}

/**
 * The word one pass writes, and what the row holds after it. A wording written
 * is locked for a second: inside that second the newest state waits, and the
 * pass that finds the lock run out writes it. A call's own words are the one
 * thing the lock may not lose — a read of a small file is over inside a frame —
 * so they wait for the lock and are written as soon as it ends, ahead of
 * whatever the state says by then; a state about another call takes their place,
 * since that is newer work than the words they carry.
 *
 * The model's own words are held on their own account. A model writing at two
 * hundred tokens a second ends a sentence every fraction of a second, and the
 * stretches between its clauses read as the bare thinking state or as nothing at
 * all: the clause stands through them, so the line changes when the model says
 * something new rather than falling back to the waiting word and back again. A
 * state the line can read, or a call's own words, is newer work and takes the
 * line from the clause; what it read then is what stands.
 */
export function wordForPass(reading: PassReading, row: RowWords | undefined, now: number): { word: string, row: RowWords } {
  const waiting = reading.detail !== null
    ? reading.detail
    : (reading.onCall ? undefined : row?.pending)
  const held = reading.word === null ? row?.held : reading.own ? reading.word : undefined
  if (row !== undefined && now < row.standing.until) {
    return { word: row.standing.word, row: keeps(row.standing, waiting, held) }
  }
  const candidate = waiting ?? reading.word ?? held ?? reading.host
  // A wording the state still asks for is left alone: its lock is not renewed,
  // so a state that stayed put cannot hold the line.
  const standing = row !== undefined && row.standing.word === candidate ? row.standing : { word: candidate, until: now + WORD_LOCK_MS }
  return { word: candidate, row: keeps(standing, undefined, held) }
}

/** What the row holds after a pass: the standing word, and whichever of the call words and the model's own are in reach. */
function keeps(standing: StandingWords, pending: string | undefined, held: string | undefined): RowWords {
  const row: RowWords = { standing }
  if (pending !== undefined) row.pending = pending
  if (held !== undefined) row.held = held
  return row
}
