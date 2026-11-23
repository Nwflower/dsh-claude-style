/** The fork-backed logical conversation and rewind plan shared by the browser and host halves (D111). */

/**
 * dsh-rewind's package name: its entry id in the boot graph, the tag on its
 * stylesheet and the module name of its loader entry. While it runs, the write
 * actions and the turn checkpoints are its own (D111).
 */
export const REWIND_PEER_PACKAGE = 'dsh-rewind-plugin'

export type RewindAction = 'retract' | 'edit' | 'rerun' | 'delete'

export interface RewindFile {
  /** Repository-relative slash path, or an absolute path captured outside a repository. */
  path: string
  status: 'added' | 'modified' | 'deleted' | 'captured'
}

export interface RewindPlan {
  /** Opaque, short-lived host handle binding the confirmation to one session head and work-tree snapshot. */
  id: string
  sessionId: string
  /** Inclusive source event boundary used for the fork. */
  atSeq: number
  turn: number
  laterTurns: number
  restoreAvailable: boolean
  /** Why code restoration is unavailable; empty when it is available. */
  reason: string
  files: RewindFile[]
}

export interface ConversationRevision {
  sessionId: string
  sourceSessionId: string | null
  cutSeq: number | null
  action: RewindAction | 'origin'
  createdAt: number
  status: 'active' | 'superseded' | 'failed'
  /** The host archive state; inactive revisions are archived after every commit and on reads. */
  archived?: boolean
  /** The physical Session no longer exists; archive and navigation are both skipped. */
  missing?: boolean
}

export interface LogicalConversation {
  /** The first physical session id; unlike activeSessionId it never changes. */
  id: string
  activeSessionId: string
  revisions: ConversationRevision[]
}

export interface RewindCommitRequest {
  planId: string
  childSessionId: string
  action: RewindAction
  restore: boolean
}
