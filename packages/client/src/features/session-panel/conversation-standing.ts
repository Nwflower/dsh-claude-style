/**
 * Whether the conversation on the page is one the details rail stands beside (D94).
 *
 * The rail belongs to a conversation the reader is looking at: a session the
 * host shows in its active phase, in the main column, with its scroller visible
 * and a row in its transcript. The host names the next session on the frame a
 * switch starts and mounts that session's rows some frames later; a rail that
 * stood beside the conversation being left keeps standing through those frames,
 * so the chat's edge and the rail's edge stay where they are while one
 * transcript replaces another.
 */

/** What the page shows at one reading. */
export interface ConversationSight {
  /** The session the host shows in its active phase, or null while it shows none. */
  id: string | null
  /** The session's node is on the page, in the main column, and its scroller is visible. */
  shown: boolean
  /** The transcript holds a row. */
  rows: boolean
}

/** What the rail keeps between two readings. */
export interface ConversationStanding {
  id: string | null
  /** The rail may stand beside this conversation. */
  live: boolean
  /** The session took the place of a conversation the rail stood beside, and its rows are still to come. */
  arriving: boolean
}

/** The standing before the first reading. */
export const NO_CONVERSATION: ConversationStanding = { id: null, live: false, arriving: false }

/**
 * The standing after one reading of the page; the same object when nothing changed.
 * @param previous - the standing the last reading left.
 * @param sight - what the page shows now.
 */
export function conversationStanding(previous: ConversationStanding, sight: ConversationSight): ConversationStanding {
  const shown = sight.id !== null && sight.shown
  const replaces = previous.id !== null && previous.id !== sight.id
  const arriving = shown && !sight.rows && previous.live && (replaces || previous.arriving)
  const live = shown && (sight.rows || arriving)
  if (previous.id === sight.id && previous.live === live && previous.arriving === arriving) return previous
  return { id: sight.id, live, arriving }
}
