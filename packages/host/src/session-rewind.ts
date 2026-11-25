/**
 * Plugin-owned turn checkpoints and logical conversations (D111).
 *
 * DSH still owns every physical Session and every configured Agent. This module
 * records exact turn-start trees, records whole files before file-tool mutations,
 * and joins the browser's fork to one logical conversation. The source Session is
 * never rewritten. A plan binds a confirmation to the source head and work-tree
 * tree so a late press cannot restore over newer activity.
 */
import { randomUUID } from 'node:crypto'
import { chmod, mkdir, rename, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type {
  ConversationRevision,
  LogicalConversation,
  RewindAction,
  RewindCommitRequest,
  RewindFile,
  RewindPlan,
} from '@dsh-claude-style/contracts/session-rewind'
import type { DshContext, DshSessionObservation } from '@dsh-claude-style/engine/node/dsh'
import { readEvents } from '@dsh-claude-style/engine/node/session-events'
import type { HostLiveSession, HostSessionPersistence, HostSessionsService, HostWorkspaceRegistry } from './host-services.js'
import { pluginPath } from './paths.js'
import { SESSION_ID_RE } from './session-name.js'
import { rewindPeerActive } from './rewind-peer.js'
import { RewindMaintenance } from './session-rewind-maintenance.js'
import { planCapturedFiles, restorePlannedFiles, verifyCapturedFiles, type PlannedFile } from './session-rewind-files.js'
import { readRewindConfig, type HostConfigSource, type RewindRuntimeConfig } from './session-rewind-config.js'
import {
  applyTree,
  DEFAULT_MAX_SNAPSHOT_BYTES,
  DEFAULT_MAX_FILE_BYTES,
  diffTrees,
  locateGit,
  pathInWorkspace,
  snapshotTree,
  type GitWorkspace,
  type SnapshotOptions,
} from './session-rewind-git.js'
import {
  captureFile,
  measureRewindStorage,
  pruneRewindStorage,
  type Capture,
  type ProtectedTree,
} from './session-rewind-store.js'

const DOCUMENT_VERSION = 1
const PLAN_LIFETIME_MS = 5 * 60_000
const PLAN_LIMIT = 32

interface StoredGit {
  cwd: string
  root: string
  gitDir: string
  repositoryObjects: string
  beforeTree: string
  oversized?: string[]
}

interface TurnCheckpoint {
  sessionId: string
  turn: number
  cwd: string
  createdAt: number
  storage?: string
  git: StoredGit | null
  captures: Record<string, Capture>
  complete: boolean
  reason: string
}

interface ForkLink {
  sourceSessionId: string
  cutSeq: number
}

interface RewindDocument {
  version: number
  checkpoints: Record<string, TurnCheckpoint[]>
  links: Record<string, ForkLink>
  conversations: LogicalConversation[]
}

interface SessionEvent {
  seq?: number
  type?: string
  data?: { turn?: number }
}

interface PendingPlan extends RewindPlan {
  createdAt: number
  headSeq: number
  storage: string
  checkpoints: TurnCheckpoint[]
  workspace: GitWorkspace | null
  currentTree: string | null
  skipPaths: ReadonlySet<string>
  capturedFiles: Map<string, PlannedFile>
}

function emptyDocument(): RewindDocument {
  return { version: DOCUMENT_VERSION, checkpoints: {}, links: {}, conversations: [] }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function validDocument(value: unknown): RewindDocument {
  if (!isRecord(value) || value.version !== DOCUMENT_VERSION || !isRecord(value.checkpoints)
    || !isRecord(value.links) || !Array.isArray(value.conversations)) {
    throw new Error('session rewind document has an unsupported shape')
  }
  return value as unknown as RewindDocument
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function sessionCwd(session: HostLiveSession | undefined): string | null {
  return typeof session?.header?.cwd === 'string' && session.header.cwd !== '' ? session.header.cwd : null
}

/**
 * The public half of a pending plan. RewindPlan's declaration is the contract,
 * so this lists its fields once: a new private field on PendingPlan then needs
 * no change here.
 */
function publicPlan(plan: PendingPlan): RewindPlan {
  return {
    id: plan.id,
    sessionId: plan.sessionId,
    atSeq: plan.atSeq,
    turn: plan.turn,
    laterTurns: plan.laterTurns,
    restoreAvailable: plan.restoreAvailable,
    reason: plan.reason,
    files: plan.files,
  }
}

export class SessionRewind {
  private readonly defaultStorage: string
  private readonly documentPath: string
  private document: RewindDocument
  private readonly recorders = new Map<string, SessionRecorder>()
  private readonly mutations = new WeakMap<object, SessionRecorder>()
  private readonly plans = new Map<string, PendingPlan>()
  private readonly disposers: (() => void)[] = []
  private readonly abort = new AbortController()
  private disposed = false
  private writes: Promise<void> = Promise.resolve()
  readonly maintenance = new RewindMaintenance(
    async directory => (await measureRewindStorage(directory)) > this.runtimeConfig().storageLimitBytes,
    directory => this.prune(directory),
    error => { if (!this.disposed) this.warn('storage prune failed: ' + messageOf(error)) },
  )
  readonly activeCheckpoints = new Set<TurnCheckpoint>()
  private commitChain: Promise<void> = Promise.resolve()

  constructor(private readonly ctx: DshContext, private readonly config?: HostConfigSource) {
    this.defaultStorage = pluginPath(ctx, 'rewind')
    this.documentPath = join(this.defaultStorage, 'state.json')
    this.document = existsSync(this.documentPath)
      ? validDocument(JSON.parse(readFileSync(this.documentPath, 'utf8')))
      : emptyDocument()
    this.listen()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.abort.abort()
    this.maintenance.dispose()
    this.activeCheckpoints.clear()
    for (const off of this.disposers) {
      try { off() } catch { /* listener already dropped with host generation */ }
    }
    this.disposers.length = 0
    this.recorders.clear()
    this.plans.clear()
  }

  private runtimeConfig(): RewindRuntimeConfig {
    return readRewindConfig(this.ctx, this.config, this.defaultStorage)
  }

  private storageOf(checkpoint?: { storage?: string }): string {
    return checkpoint?.storage ?? this.defaultStorage
  }

  snapshotOptions(): SnapshotOptions {
    const budget = this.runtimeConfig().storageLimitBytes
    return {
      maxFileBytes: DEFAULT_MAX_FILE_BYTES,
      maxSnapshotBytes: Math.min(DEFAULT_MAX_SNAPSHOT_BYTES, Math.max(DEFAULT_MAX_FILE_BYTES, Math.floor(budget / 2))),
      signal: this.abort.signal,
    }
  }

  signal(): AbortSignal {
    return this.abort.signal
  }

  private save(): Promise<void> {
    this.writes = this.writes.then(async () => {
      await mkdir(dirname(this.documentPath), { recursive: true, mode: 0o700 })
      const temporary = this.documentPath + '.' + process.pid + '.tmp'
      await writeFile(temporary, JSON.stringify(this.document), { mode: 0o600 })
      await chmod(temporary, 0o600)
      await rename(temporary, this.documentPath)
    })
    return this.writes
  }

  private liveSessions(): HostSessionsService | null {
    const sessions = this.ctx.get('sessions') as HostSessionsService | null | undefined
    return sessions !== null && typeof sessions === 'object' ? sessions : null
  }

  private recorderFor(session: HostLiveSession, cwd: string): SessionRecorder {
    let recorder = this.recorders.get(session.id)
    if (recorder === undefined) {
      recorder = new SessionRecorder(this, session.id, cwd)
      this.recorders.set(session.id, recorder)
    }
    return recorder
  }

  private listen(): void {
    if (typeof this.ctx.on !== 'function') return
    const listen = (name: string, handler: (...args: any[]) => unknown, options?: { prepend?: boolean }) => {
      const off = this.ctx.on?.(name, handler, options)
      if (typeof off === 'function') this.disposers.push(off as () => void)
    }
    listen('session/event', (session: HostLiveSession | null, event: SessionEvent) => {
      if (this.disposed || session === null || typeof session.id !== 'string') return
      const recorder = this.recorders.get(session.id)
      if (event.type === 'turn/start' && typeof event.data?.turn === 'number') {
        // Yield when dsh-rewind is active (D111) or when workspace checkpoints are switched off.
        if (rewindPeerActive(this.ctx) || !this.runtimeConfig().checkpointsEnabled) {
          recorder?.discard()
          this.recorders.delete(session.id)
          return
        }
        const cwd = sessionCwd(session)
        if (cwd !== null && session.header?.origin !== 'subagent') this.recorderFor(session, cwd).start(event.data.turn)
      } else if (event.type === 'turn/end' && typeof event.data?.turn === 'number') {
        recorder?.end(event.data.turn)
      }
    })
    listen('session/disposed', (session: HostLiveSession) => {
      // Durable checkpoints outlive the in-memory queue; only that queue is released.
      this.recorders.get(session.id)?.discard()
      this.recorders.delete(session.id)
    })
    listen('tools/pre-execute', async (exec: { agent?: { session?: HostLiveSession } }, next: () => Promise<unknown>) => {
      const recorder = exec.agent?.session === undefined ? undefined : this.recorders.get(exec.agent.session.id)
      if (recorder !== undefined) {
        this.mutations.set(exec as object, recorder)
        await recorder.settled()
      }
      return next()
    })
    const capture = async (target: unknown, actor: object | undefined): Promise<void> => {
      const recorder = actor === undefined ? undefined : this.mutations.get(actor)
      if (recorder === undefined) return
      const fs = this.ctx.get('fs')
      if (typeof fs?.processPath !== 'function') throw new Error('session rewind: host fs.processPath is unavailable')
      await recorder.capture(fs.processPath(target))
      await recorder.settled()
    }
    for (const name of ['fs/write-intent', 'fs/edit-intent', 'fs/delete-intent']) {
      listen(name, async (target: unknown, actor: object | undefined, next: () => Promise<unknown>) => {
        const intent = await next()
        await capture(target, actor)
        return intent
      }, { prepend: true })
    }
  }

  async putCheckpoint(checkpoint: TurnCheckpoint): Promise<void> {
    if (this.disposed) return
    const rows = this.document.checkpoints[checkpoint.sessionId] ?? []
    const next = rows.filter(row => row.turn !== checkpoint.turn)
    next.push(checkpoint)
    next.sort((a, b) => a.turn - b.turn)
    this.document.checkpoints[checkpoint.sessionId] = next
    await this.save()
    this.maintenance.schedule(this.storageOf(checkpoint))
  }

  private async prune(storageDir: string): Promise<void> {
    const protectedCheckpoints = new Set(this.activeCheckpoints)
    const protectedTrees: ProtectedTree[] = []
    for (const plan of this.plans.values()) {
      if (Date.now() - plan.createdAt > PLAN_LIFETIME_MS) continue
      for (const checkpoint of plan.checkpoints) protectedCheckpoints.add(checkpoint)
      if (plan.workspace && plan.currentTree) protectedTrees.push({ workspace: plan.workspace, tree: plan.currentTree })
    }
    const result = await pruneRewindStorage({
      storageDir, defaultStorageDir: this.defaultStorage, limitBytes: this.runtimeConfig().storageLimitBytes,
      checkpoints: this.document.checkpoints, protectedCheckpoints: [...protectedCheckpoints], protectedTrees,
      signal: this.abort.signal, warn: message => this.warn(message),
    })
    if (result.changed && !this.disposed) await this.save()
  }

  checkpointStorage(): string {
    return this.runtimeConfig().storageDir
  }

  warn(message: string): void {
    this.ctx.logger?.warn?.('dsh-claude-style: session rewind: ' + message)
  }

  private checkpoint(sessionId: string, turn: number, seq: number | undefined, seen = new Set<string>()): TurnCheckpoint | undefined {
    if (seen.has(sessionId)) throw new Error('session rewind: fork lineage contains a cycle')
    seen.add(sessionId)
    const direct = this.document.checkpoints[sessionId]?.find(row => row.turn === turn)
    if (direct !== undefined) return direct
    const link = this.document.links[sessionId]
    return link === undefined || seq === undefined || seq > link.cutSeq
      ? undefined : this.checkpoint(link.sourceSessionId, turn, seq, seen)
  }

  private workspaceOf(stored: StoredGit, storage: string): GitWorkspace {
    const objects = join(storage, 'objects')
    return {
      root: stored.root,
      gitDir: stored.gitDir,
      repositoryObjects: stored.repositoryObjects,
      objects,
      env: {
        GIT_OBJECT_DIRECTORY: objects,
        GIT_ALTERNATE_OBJECT_DIRECTORIES: stored.repositoryObjects,
      },
    }
  }

  private conversationFor(sessionId: string): LogicalConversation | undefined {
    return this.document.conversations.find(conversation => conversation.activeSessionId === sessionId)
      ?? this.document.conversations.find(conversation => conversation.revisions.some(revision => revision.sessionId === sessionId))
  }

  private workspaceRegistry(): HostWorkspaceRegistry | null {
    const registry = this.ctx.get('workspaceRegistry') as HostWorkspaceRegistry | null | undefined
    return registry !== null && typeof registry === 'object' ? registry : null
  }

  private async storedSessionIds(): Promise<Set<string> | null> {
    const persistence = this.ctx.get('sessionPersistence') as HostSessionPersistence | null | undefined
    if (typeof persistence?.list !== 'function') return null
    const listed = await persistence.list()
    const ids = new Set<string>()
    for (const entry of listed) {
      const id = entry?.header?.id
      if (typeof id === 'string' && id !== '') ids.add(id)
    }
    return ids
  }

  private async sessionKnown(sessionId: string, storedIds: ReadonlySet<string> | null): Promise<boolean> {
    if (this.liveSessions()?.get?.(sessionId) !== undefined) return true
    if (storedIds !== null) return storedIds.has(sessionId)
    const query = this.ctx.get('sessionQuery') as {
      observeSession?(id: string, options?: { projectionMode?: string }): Promise<DshSessionObservation>
    } | null | undefined
    if (typeof query?.observeSession !== 'function') return true
    try {
      const observation = await query.observeSession(sessionId, { projectionMode: 'none' })
      if (typeof observation.dispose === 'function') observation.dispose()
      else if (Symbol.dispose in observation) (observation as unknown as { [Symbol.dispose](): void })[Symbol.dispose]()
      return true
    } catch (error) {
      if ((error as { code?: unknown }).code === 'SESSION_QUERY_SESSION_NOT_FOUND') return false
      throw error
    }
  }

  /** Reconcile old plugin revisions with the native archive, including records written before archival existed. */
  private async reconcileArchiveState(pinSessionId: string | null = null): Promise<void> {
    const registry = this.workspaceRegistry()
    if (registry === null) return
    const storedIds = this.document.conversations.length === 0 ? null : await this.storedSessionIds()
    let changed = false
    for (const conversation of this.document.conversations) {
      for (const revision of conversation.revisions) {
        const active = revision.sessionId === conversation.activeSessionId
        const known = await this.sessionKnown(revision.sessionId, storedIds)
        if (!active && known && !registry.archivedSessionIds?.includes(revision.sessionId) && typeof registry.archiveSession === 'function') {
          try {
            await registry.archiveSession(revision.sessionId, { stopActivity: true })
          } catch (error) {
            // A store reset may delete the physical Session between the check and the archive write.
            if ((error as { name?: unknown }).name !== 'WorkspaceUnknownSessionError') throw error
          }
        }
        const archived = active ? registry.archivedSessionIds?.includes(revision.sessionId) === true : known
        if (revision.archived !== archived || revision.missing !== !known) {
          revision.archived = archived
          revision.missing = !known
          changed = true
        }
      }
    }
    if (pinSessionId !== null && typeof registry.pinSession === 'function') await registry.pinSession(pinSessionId)
    if (changed) await this.save()
  }

  private async register(sourceSessionId: string, childSessionId: string, cutSeq: number, action: RewindAction, failed: boolean): Promise<LogicalConversation> {
    const inheritPin = this.workspaceRegistry()?.pinnedSessionIds?.includes(sourceSessionId) === true
    let conversation = this.conversationFor(sourceSessionId)
    if (conversation === undefined) {
      conversation = {
        id: sourceSessionId,
        activeSessionId: sourceSessionId,
        revisions: [{ sessionId: sourceSessionId, sourceSessionId: null, cutSeq: null, action: 'origin', createdAt: Date.now(), status: 'active' }],
      }
      this.document.conversations.push(conversation)
    }
    for (const revision of conversation.revisions) if (revision.status === 'active') revision.status = 'superseded'
    if (!failed) conversation.activeSessionId = childSessionId
    else {
      const active = conversation.revisions.find(revision => revision.sessionId === conversation.activeSessionId)
      if (active !== undefined) active.status = 'active'
    }
    conversation.revisions.push({
      sessionId: childSessionId,
      sourceSessionId,
      cutSeq,
      action,
      createdAt: Date.now(),
      status: failed ? 'failed' : 'active',
    })
    this.document.links[childSessionId] = { sourceSessionId, cutSeq }
    await this.save()
    await this.reconcileArchiveState(failed || !inheritPin ? null : childSessionId)
    return structuredClone(conversation)
  }

  async conversations(): Promise<LogicalConversation[]> {
    await this.commitChain
    await this.reconcileArchiveState()
    return structuredClone(this.document.conversations)
  }

  async plan(sessionId: string, messageSeq: number, turn: number): Promise<RewindPlan> {
    await this.commitChain
    await this.recorders.get(sessionId)?.settled()
    return this.maintenance.use(() => this.prepare(sessionId, messageSeq, turn))
  }

  private async prepare(sessionId: string, messageSeq: number, turn: number): Promise<RewindPlan> {
    if (!Number.isSafeInteger(messageSeq) || messageSeq <= 0 || !Number.isSafeInteger(turn) || turn <= 0) {
      throw new Error('session rewind: invalid message boundary')
    }
    const events = await readEvents<SessionEvent>(this.ctx, 'dsh-claude-style', sessionId, 'the rewind plan')
    if (events === null) throw new Error('session rewind: session history is unavailable')
    const turns = events.flatMap(event => event.type === 'turn/start' && typeof event.data?.turn === 'number' && event.data.turn >= turn
      ? [{ number: event.data.turn, seq: event.seq }] : [])
    if (!turns.some(candidate => candidate.number === turn)) throw new Error(`session rewind: turn ${turn} does not exist`)
    const headSeq = events.at(-1)?.seq ?? -1
    const checkpoints = turns.map(candidate => this.checkpoint(sessionId, candidate.number, candidate.seq))
    const target = checkpoints[0]
    let reason = target === undefined ? 'missing-target' : ''
    if (reason === '' && checkpoints.some(checkpoint => checkpoint === undefined)) reason = 'incomplete-later'
    if (checkpoints.some(checkpoint => checkpoint?.complete === false)) {
      reason = checkpoints.find(checkpoint => checkpoint?.complete === false)?.reason || 'unrestorable-files'
    }
    if (target?.git != null && checkpoints.some(checkpoint => checkpoint?.git?.root !== target.git?.root)) {
      reason = 'workspace-moved'
    }
    const storage = this.storageOf(target)
    let workspace: GitWorkspace | null = null
    let currentTree: string | null = null
    let skipPaths = new Set<string>()
    let files: RewindFile[] = []
    if (reason === '' && target?.git != null) {
      workspace = this.workspaceOf(target.git, storage)
      const currentSnap = await snapshotTree(workspace, storage, this.snapshotOptions())
      currentTree = currentSnap.tree
      skipPaths = new Set([...(target.git.oversized ?? []), ...currentSnap.oversized])
      files = await diffTrees(workspace, target.git.beforeTree, currentTree, skipPaths, this.abort.signal)
    }
    const recorded = checkpoints.filter((row): row is TurnCheckpoint => row !== undefined)
    const capturedFiles = reason === '' ? await planCapturedFiles(recorded, this.defaultStorage, workspace,
      target?.git?.beforeTree, files, skipPaths, this.abort.signal) : new Map<string, PlannedFile>()
    for (const [absolute, file] of capturedFiles) {
      const path = workspace && pathInWorkspace(workspace.root, absolute)
      files.push({ path: path ?? absolute, status: 'captured' })
      if (file.confirmed.kind === 'oversized' || file.confirmed.kind === 'unsupported') reason = 'unrestorable-files'
    }
    const now = Date.now()
    this.makeRoomForPlan(now)
    const id = randomUUID()
    const plan: PendingPlan = {
      id,
      sessionId,
      atSeq: messageSeq - 1,
      turn,
      laterTurns: turns.filter(candidate => candidate.number > turn).length,
      restoreAvailable: reason === '',
      reason,
      files,
      createdAt: now,
      headSeq,
      storage,
      checkpoints: recorded,
      capturedFiles,
      workspace,
      currentTree,
      skipPaths,
    }
    this.plans.set(id, plan)
    return publicPlan(plan)
  }

  /**
   * Expire confirmations past their lifetime, then drop the oldest until the
   * table has room for the plan about to be inserted. A reader's open dialog
   * survives an unrelated call: only plans over the limit leave, and the
   * newest ones stay.
   */
  private makeRoomForPlan(now: number): void {
    for (const [id, plan] of this.plans) {
      if (now - plan.createdAt > PLAN_LIFETIME_MS) this.plans.delete(id)
    }
    while (this.plans.size >= PLAN_LIMIT) {
      let oldestId: string | null = null
      let oldestAt = Number.POSITIVE_INFINITY
      for (const [id, plan] of this.plans) {
        if (plan.createdAt < oldestAt) {
          oldestAt = plan.createdAt
          oldestId = id
        }
      }
      if (oldestId === null) return
      this.plans.delete(oldestId)
    }
  }

  async commit(request: RewindCommitRequest): Promise<LogicalConversation> {
    const run = this.commitChain.then(() => this.maintenance.use(() => this.commitNow(request)))
    // Only the queue continuation consumes a rejection; each caller still receives its own commit result.
    this.commitChain = run.then(() => undefined, () => undefined)
    return run
  }

  private async commitNow(request: RewindCommitRequest): Promise<LogicalConversation> {
    const plan = this.plans.get(request.planId)
    if (plan === undefined || Date.now() - plan.createdAt > PLAN_LIFETIME_MS) throw new Error('session rewind: confirmation expired')
    this.plans.delete(request.planId)
    if (!SESSION_ID_RE.test(request.childSessionId)) throw new Error('session rewind: invalid child session id')
    const events = await readEvents<SessionEvent>(this.ctx, 'dsh-claude-style', plan.sessionId, 'the rewind commit')
    const headSeq = events?.at(-1)?.seq ?? -1
    if (events === null || headSeq !== plan.headSeq) {
      // The browser already created this fork; keep it hidden without changing the active source.
      await this.register(plan.sessionId, request.childSessionId, plan.atSeq, request.action, true)
      throw new Error('session rewind: the session changed after confirmation')
    }
    if (request.restore && !plan.restoreAvailable) throw new Error('session rewind: code restoration is unavailable')
    try {
      if (request.restore) await this.restore(plan)
    } catch (error) {
      // The fork already exists; retain it as a hidden failed revision while the source stays active.
      await this.register(plan.sessionId, request.childSessionId, plan.atSeq, request.action, true)
      throw error
    }
    return this.register(plan.sessionId, request.childSessionId, plan.atSeq, request.action, false)
  }

  private async restore(plan: PendingPlan): Promise<void> {
    let skipPaths = plan.skipPaths
    if (plan.workspace !== null && plan.currentTree !== null) {
      const currentSnap = await snapshotTree(plan.workspace, plan.storage, this.snapshotOptions())
      if (currentSnap.tree !== plan.currentTree) throw new Error('session rewind: the work tree changed after confirmation')
      skipPaths = new Set([...plan.skipPaths, ...currentSnap.oversized])
    }
    await verifyCapturedFiles(plan.capturedFiles, plan.storage)
    const target = plan.checkpoints.find(checkpoint => checkpoint.turn === plan.turn)
    try {
      if (plan.workspace !== null && plan.currentTree !== null && target?.git != null) {
        await applyTree(plan.workspace, plan.storage, target.git.beforeTree, plan.currentTree, skipPaths, this.abort.signal)
      }
      await restorePlannedFiles(plan.capturedFiles)
    } catch (error) {
      // Restoration is isolated from the already-created fork: put the original work tree back before reporting.
      try {
        await restorePlannedFiles(plan.capturedFiles, plan.storage)
        if (plan.workspace !== null && plan.currentTree !== null && target?.git != null) {
          await applyTree(plan.workspace, plan.storage, plan.currentTree, target.git.beforeTree, skipPaths, this.abort.signal)
        }
      } catch (rollback) {
        throw new AggregateError([error, rollback], 'session rewind: restoration and its safety restoration both failed')
      }
      throw error
    }
  }
}

class SessionRecorder {
  private chain: Promise<void> = Promise.resolve()
  private active: (TurnCheckpoint & { storage: string }) | null = null

  constructor(private readonly owner: SessionRewind, private readonly sessionId: string, private readonly cwd: string) {}

  start(turn: number): void {
    const state: TurnCheckpoint & { storage: string } = {
      sessionId: this.sessionId,
      turn,
      createdAt: Date.now(),
      cwd: this.cwd,
      storage: this.owner.checkpointStorage(),
      captures: {},
      git: null,
      complete: true,
      reason: '',
    }
    this.enqueue(async () => {
      this.release()
      this.active = state
      this.owner.activeCheckpoints.add(state)
      try {
        const workspace = await locateGit(state.cwd, state.storage, this.owner.signal())
        if (workspace !== null) {
          const snap = await snapshotTree(workspace, state.storage, this.owner.snapshotOptions())
          state.git = { cwd: state.cwd, root: workspace.root, gitDir: workspace.gitDir,
            repositoryObjects: workspace.repositoryObjects, beforeTree: snap.tree, oversized: snap.oversized }
        }
      } catch (error) {
        // A checkpoint failure must not stop the Agent's turn; the dialog later refuses code restoration explicitly.
        state.complete = false
        state.reason = messageOf(error)
        this.owner.warn(`turn ${turn} baseline unavailable: ${state.reason}`)
      }
    })
  }

  end(turn: number): void {
    this.enqueue(async () => {
      if (this.active?.turn !== turn) return
      await this.owner.putCheckpoint(this.active)
      this.release()
    })
  }

  async capture(path: string): Promise<void> {
    await this.enqueue(async () => {
      const state = this.active
      if (state === null || Object.hasOwn(state.captures, path)) return
      try {
        const capture = await captureFile(path, state.storage, DEFAULT_MAX_FILE_BYTES)
        state.captures[path] = capture
        if (capture.kind === 'oversized' || capture.kind === 'unsupported') state.complete = false
      } catch (error) {
        // Keep the turn running and make the affected checkpoint unavailable for code restoration.
        state.complete = false
        state.reason = messageOf(error)
        this.owner.warn(`capture failed for ${path}: ${state.reason}`)
      }
    })
  }

  private release(): void {
    if (this.active) this.owner.activeCheckpoints.delete(this.active)
    this.active = null
  }

  discard(): void {
    this.enqueue(async () => this.release())
  }

  settled(): Promise<void> {
    return this.chain
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    this.chain = this.chain.then(() => this.owner.maintenance.use(task))
    return this.chain
  }
}
