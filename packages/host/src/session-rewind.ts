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
import { dirname, isAbsolute, join, relative, sep } from 'node:path'
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
import { pluginPath } from './paths.js'
import { rewindPeerActive } from './rewind-peer.js'
import { readRewindConfig, type HostConfigSource, type RewindRuntimeConfig } from './session-rewind-config.js'
import {
  applyTree,
  DEFAULT_MAX_SNAPSHOT_BYTES,
  diffTrees,
  locateGit,
  snapshotTree,
  type GitWorkspace,
  type SnapshotOptions,
} from './session-rewind-git.js'
import {
  captureFile,
  pruneRewindStorage,
  restoreCapturedFile,
  type Capture,
  type ProtectedTree,
} from './session-rewind-store.js'

const DOCUMENT_VERSION = 1
const MAX_CAPTURE_BYTES = 16 * 1024 * 1024
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

interface LiveSession {
  id: string
  header?: { cwd?: unknown, origin?: unknown }
  seq?: number
}

interface WorkspaceRegistry {
  archivedSessionIds?: readonly string[]
  pinnedSessionIds?: readonly string[]
  archiveSession?(sessionId: string, options?: { stopActivity?: boolean }): Promise<void>
  unarchiveSession?(sessionId: string): Promise<void>
  pinSession?(sessionId: string): Promise<void>
}

interface ActiveTurn {
  turn: number
  cwd: string
  storage: string
  captures: Map<string, Capture>
  git: GitWorkspace | null
  beforeTree: string | null
  oversized: string[]
  complete: boolean
  reason: string
}

interface PendingPlan extends RewindPlan {
  createdAt: number
  headSeq: number
  storage: string
  checkpoints: TurnCheckpoint[]
  workspace: GitWorkspace | null
  currentTree: string | null
  skipPaths: ReadonlySet<string>
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

function sessionCwd(session: LiveSession | undefined): string | null {
  return typeof session?.header?.cwd === 'string' && session.header.cwd !== '' ? session.header.cwd : null
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
  private pruning: Promise<void> = Promise.resolve()
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
      maxFileBytes: MAX_CAPTURE_BYTES,
      maxSnapshotBytes: Math.min(DEFAULT_MAX_SNAPSHOT_BYTES, Math.max(MAX_CAPTURE_BYTES, Math.floor(budget / 2))),
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

  private liveSessions(): { get?(id: string): LiveSession | undefined } | null {
    const sessions = this.ctx.get('sessions')
    return sessions !== null && typeof sessions === 'object' ? sessions as { get?(id: string): LiveSession | undefined } : null
  }

  private recorderFor(session: LiveSession, cwd: string): SessionRecorder {
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
    listen('session/event', (session: LiveSession | null, event: SessionEvent) => {
      if (this.disposed || session === null || typeof session.id !== 'string') return
      const recorder = this.recorders.get(session.id)
      if (event.type === 'turn/start' && typeof event.data?.turn === 'number') {
        // Yield when dsh-rewind is active (D111) or when workspace checkpoints are switched off.
        if (rewindPeerActive(this.ctx) || !this.runtimeConfig().checkpointsEnabled) {
          this.recorders.delete(session.id)
          return
        }
        const cwd = sessionCwd(session)
        if (cwd !== null && session.header?.origin !== 'subagent') this.recorderFor(session, cwd).start(event.data.turn)
      } else if (event.type === 'turn/end' && typeof event.data?.turn === 'number') {
        recorder?.end(event.data.turn)
      }
    })
    listen('session/disposed', (session: LiveSession) => {
      // Durable checkpoints outlive the in-memory queue; only that queue is released.
      this.recorders.delete(session.id)
    })
    listen('tools/pre-execute', async (exec: { agent?: { session?: LiveSession } }, next: () => Promise<unknown>) => {
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

  private protectedTrees(): ProtectedTree[] {
    const out: ProtectedTree[] = []
    for (const plan of this.plans.values()) {
      if (plan.workspace === null) continue
      if (plan.currentTree !== null) out.push({ workspace: plan.workspace, tree: plan.currentTree })
      for (const checkpoint of plan.checkpoints) {
        if (checkpoint.git !== null) out.push({ workspace: plan.workspace, tree: checkpoint.git.beforeTree })
      }
    }
    return out
  }

  async putCheckpoint(checkpoint: TurnCheckpoint): Promise<void> {
    if (this.disposed) return
    const rows = this.document.checkpoints[checkpoint.sessionId] ?? []
    const next = rows.filter(row => row.turn !== checkpoint.turn)
    next.push(checkpoint)
    next.sort((a, b) => a.turn - b.turn)
    this.document.checkpoints[checkpoint.sessionId] = next
    await this.save()
    const storageDir = this.storageOf(checkpoint)
    const runPrune = this.pruning.then(async () => {
      if (this.disposed) return
      try {
        const result = await pruneRewindStorage({
          storageDir,
          defaultStorageDir: this.defaultStorage,
          limitBytes: this.runtimeConfig().storageLimitBytes,
          checkpoints: this.document.checkpoints,
          protectedTrees: this.protectedTrees(),
          signal: this.abort.signal,
          warn: message => this.warn(message),
        })
        if (result.changed && !this.disposed) await this.save()
      } catch (error) {
        if (!this.disposed) this.warn('storage prune failed: ' + messageOf(error))
      }
    })
    this.pruning = runPrune.then(() => undefined, () => undefined)
    await runPrune
  }

  checkpointStorage(): string {
    return this.runtimeConfig().storageDir
  }

  warn(message: string): void {
    this.ctx.logger?.warn?.('dsh-claude-style: session rewind: ' + message)
  }

  private checkpoint(sessionId: string, turn: number, seen = new Set<string>()): TurnCheckpoint | undefined {
    if (seen.has(sessionId)) throw new Error('session rewind: fork lineage contains a cycle')
    seen.add(sessionId)
    const direct = this.document.checkpoints[sessionId]?.find(row => row.turn === turn)
    if (direct !== undefined) return direct
    const link = this.document.links[sessionId]
    return link === undefined ? undefined : this.checkpoint(link.sourceSessionId, turn, seen)
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

  private capture(absolute: string, storage: string): Promise<Capture> {
    return captureFile(absolute, storage, MAX_CAPTURE_BYTES)
  }

  async captureFor(recorder: SessionRecorder, absolute: string, turn: number, storage: string): Promise<void> {
    const capture = await this.capture(absolute, storage)
    recorder.remember(absolute, capture, turn)
  }

  private restoreCapture(absolute: string, capture: Capture, storage: string): Promise<void> {
    return restoreCapturedFile(absolute, capture, storage)
  }

  private conversationFor(sessionId: string): LogicalConversation | undefined {
    return this.document.conversations.find(conversation => conversation.activeSessionId === sessionId)
      ?? this.document.conversations.find(conversation => conversation.revisions.some(revision => revision.sessionId === sessionId))
  }

  private workspaceRegistry(): WorkspaceRegistry | null {
    const registry = this.ctx.get('workspaceRegistry')
    return registry !== null && typeof registry === 'object' ? registry as WorkspaceRegistry : null
  }

  private async storedSessionIds(): Promise<Set<string> | null> {
    const persistence = this.ctx.get('sessionPersistence') as {
      list?(): Promise<readonly { header?: { id?: unknown } }[]>
    } | null | undefined
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
        if (!active && known && typeof registry.archiveSession === 'function') {
          try {
            await registry.archiveSession(revision.sessionId, { stopActivity: true })
          } catch (error) {
            // A store reset may delete the physical Session between the check and the archive write.
            if ((error as { name?: unknown }).name !== 'WorkspaceUnknownSessionError') throw error
          }
        }
        const archived = active ? registry.archivedSessionIds?.includes(revision.sessionId) === true : known
        if (revision.archived !== archived || revision.missing === !known) {
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
    if (!Number.isSafeInteger(messageSeq) || messageSeq <= 0 || !Number.isSafeInteger(turn) || turn <= 0) {
      throw new Error('session rewind: invalid message boundary')
    }
    await this.recorders.get(sessionId)?.settled()
    const events = await readEvents<SessionEvent>(this.ctx, 'dsh-claude-style', sessionId, 'the rewind plan')
    if (events === null) throw new Error('session rewind: session history is unavailable')
    const turns = events.filter(event => event.type === 'turn/start' && typeof event.data?.turn === 'number')
      .map(event => event.data?.turn as number)
    if (!turns.includes(turn)) throw new Error(`session rewind: turn ${turn} does not exist`)
    const headSeq = events.at(-1)?.seq ?? -1
    const checkpoints = turns.filter(candidate => candidate >= turn)
      .map(candidate => this.checkpoint(sessionId, candidate))
    const target = checkpoints[0]
    let reason = target === undefined ? '这个目标轮次还没有插件检查点' : ''
    if (checkpoints.some(checkpoint => checkpoint === undefined)) reason = '部分后续轮次没有完整检查点'
    if (checkpoints.some(checkpoint => checkpoint?.complete === false)) {
      reason = checkpoints.find(checkpoint => checkpoint?.complete === false)?.reason || '检查点包含无法恢复的文件'
    }
    if (target?.git != null && checkpoints.some(checkpoint => checkpoint?.git?.root !== target.git?.root)) {
      reason = '目标之后的工作目录发生了变化，无法安全恢复'
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
    const listed = new Set(files.map(file => file.path))
    for (const checkpoint of checkpoints) {
      for (const absolute of Object.keys(checkpoint?.captures ?? {})) {
        const inside = target?.git == null ? '' : relative(target.git.root, absolute)
        const path = target?.git != null && inside !== '' && !isAbsolute(inside) && !inside.startsWith('..' + sep)
          ? inside.split(sep).join('/')
          : absolute
        if (!listed.has(path)) {
          files.push({ path, status: 'captured' })
          listed.add(path)
        }
      }
    }
    const now = Date.now()
    for (const [id, plan] of this.plans) {
      if (now - plan.createdAt > PLAN_LIFETIME_MS || this.plans.size >= PLAN_LIMIT) this.plans.delete(id)
    }
    const id = randomUUID()
    const plan: PendingPlan = {
      id,
      sessionId,
      atSeq: messageSeq - 1,
      turn,
      laterTurns: turns.filter(candidate => candidate > turn).length,
      restoreAvailable: reason === '',
      reason,
      files,
      createdAt: now,
      headSeq,
      storage,
      checkpoints: checkpoints.filter((checkpoint): checkpoint is TurnCheckpoint => checkpoint !== undefined),
      workspace,
      currentTree,
      skipPaths,
    }
    this.plans.set(id, plan)
    const {
      createdAt: _createdAt,
      headSeq: _headSeq,
      storage: _storage,
      checkpoints: _checkpoints,
      workspace: _workspace,
      currentTree: _currentTree,
      skipPaths: _skipPaths,
      ...answer
    } = plan
    return answer
  }

  async commit(request: RewindCommitRequest): Promise<LogicalConversation> {
    const run = this.commitChain.then(() => this.commitNow(request))
    // Only the queue continuation consumes a rejection; each caller still receives its own commit result.
    this.commitChain = run.then(() => undefined, () => undefined)
    return run
  }

  private async commitNow(request: RewindCommitRequest): Promise<LogicalConversation> {
    const plan = this.plans.get(request.planId)
    if (plan === undefined || Date.now() - plan.createdAt > PLAN_LIFETIME_MS) throw new Error('session rewind: confirmation expired')
    this.plans.delete(request.planId)
    if (!/^[A-Za-z0-9._\-:@]{1,200}$/.test(request.childSessionId)) throw new Error('session rewind: invalid child session id')
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
    const paths = [...new Set(plan.checkpoints.flatMap(checkpoint => Object.keys(checkpoint.captures)))]
    const safety = new Map<string, Capture>()
    for (const path of paths) {
      const capture = await this.capture(path, plan.storage)
      if (capture.kind === 'oversized' || capture.kind === 'unsupported') throw new Error(`cannot protect current file ${path}`)
      safety.set(path, capture)
    }
    const target = plan.checkpoints.find(checkpoint => checkpoint.turn === plan.turn)
    try {
      if (plan.workspace !== null && plan.currentTree !== null && target?.git != null) {
        await applyTree(plan.workspace, plan.storage, target.git.beforeTree, plan.currentTree, skipPaths, this.abort.signal)
      }
      const ordered = [...plan.checkpoints].sort((a, b) => b.turn - a.turn)
      for (const checkpoint of ordered) {
        const storage = this.storageOf(checkpoint)
        for (const [path, capture] of Object.entries(checkpoint.captures)) await this.restoreCapture(path, capture, storage)
      }
    } catch (error) {
      // Restoration is isolated from the already-created fork: put the original work tree back before reporting.
      try {
        for (const [path, capture] of safety) await this.restoreCapture(path, capture, plan.storage)
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
  private active: ActiveTurn | null = null

  constructor(private readonly owner: SessionRewind, private readonly sessionId: string, private readonly cwd: string) {}

  start(turn: number): void {
    const state: ActiveTurn = {
      turn,
      cwd: this.cwd,
      storage: this.owner.checkpointStorage(),
      captures: new Map(),
      git: null,
      beforeTree: null,
      oversized: [],
      complete: true,
      reason: '',
    }
    this.active = state
    this.enqueue(async () => {
      try {
        state.git = await locateGit(state.cwd, state.storage, this.owner.signal())
        if (state.git !== null) {
          const snap = await snapshotTree(state.git, state.storage, this.owner.snapshotOptions())
          state.beforeTree = snap.tree
          state.oversized = snap.oversized
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
    const state = this.active
    if (state === null || state.turn !== turn) return
    this.enqueue(async () => {
      await this.owner.putCheckpoint({
        sessionId: this.sessionId,
        turn,
        cwd: state.cwd,
        createdAt: Date.now(),
        storage: state.storage,
        git: state.git !== null && state.beforeTree !== null ? {
          cwd: state.cwd,
          root: state.git.root,
          gitDir: state.git.gitDir,
          repositoryObjects: state.git.repositoryObjects,
          beforeTree: state.beforeTree,
          ...(state.oversized.length > 0 ? { oversized: state.oversized } : {}),
        } : null,
        captures: Object.fromEntries(state.captures),
        complete: state.complete && [...state.captures.values()].every(capture => capture.kind !== 'oversized' && capture.kind !== 'unsupported'),
        reason: state.reason,
      })
    })
  }

  async capture(path: string): Promise<void> {
    await this.enqueue(async () => {
      const state = this.active
      if (state === null || state.captures.has(path)) return
      try {
        await this.owner.captureFor(this, path, state.turn, state.storage)
      } catch (error) {
        // Keep the turn running and make the affected checkpoint unavailable for code restoration.
        state.complete = false
        state.reason = messageOf(error)
        this.owner.warn(`capture failed for ${path}: ${state.reason}`)
      }
    })
  }

  remember(path: string, capture: Capture, turn: number): void {
    if (this.active?.turn === turn) this.active.captures.set(path, capture)
  }

  settled(): Promise<void> {
    return this.chain
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    this.chain = this.chain.then(task)
    return this.chain
  }
}