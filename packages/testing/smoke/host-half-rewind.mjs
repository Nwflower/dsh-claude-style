/**
 * Host-side rewind evidence on a real Git work tree: exact tracked and ignored
 * file restoration, fork-inherited checkpoints, stale-plan refusal and D75 fences.
 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createHook } from 'node:async_hooks'
import { runsPath } from '../../../scripts/shared/debug-paths.mjs'
import { ROOT, check } from './shared.mjs'

const PLAN = '/dsh-claude-style/session-rewind-plan'
const COMMIT = '/dsh-claude-style/session-rewind-commit'
const REVISIONS = '/dsh-claude-style/session-revisions'

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
}

async function hostRewind({ mod, fakeHost, request, browser, crossSite }) {
  console.log('\nhost half — fork-backed session rewind')
  const root = runsPath(ROOT, 'smoke', 'rewind')
  const home = path.join(root, 'home')
  const repo = path.join(root, 'repo')
  fs.mkdirSync(repo, { recursive: true })
  git(repo, 'init')
  fs.writeFileSync(path.join(repo, '.gitignore'), 'ignored.txt\n')
  fs.writeFileSync(path.join(repo, 'note.txt'), 'before\n')
  fs.writeFileSync(path.join(repo, 'ignored.txt'), 'ignored-before\n')
  git(repo, 'add', 'note.txt')
  const rewindHome = path.join(home, 'dsh-claude-style', 'rewind')
  fs.mkdirSync(rewindHome, { recursive: true })
  fs.writeFileSync(path.join(rewindHome, 'state.json'), JSON.stringify({
    version: 1,
    checkpoints: {},
    links: {},
    conversations: [{
      id: 'session-stale',
      activeSessionId: 'session-stale',
      revisions: [{ sessionId: 'session-stale', sourceSessionId: null, cutSeq: null, action: 'origin', createdAt: 1, status: 'active' }],
    }],
  }))

  const sourceEvents = [
    { seq: 0, type: 'user/message', data: { turn: 1 } },
    { seq: 1, type: 'turn/start', data: { turn: 1 } },
  ]
  const events = {
    'session-source': sourceEvents,
    'session-child': sourceEvents.map(event => ({ ...event })),
    'session-racy': sourceEvents.map(event => ({ ...event })),
    'session-plain': [{ seq: 0, type: 'user/message', data: { turn: 1 } }, { seq: 1, type: 'turn/start', data: { turn: 1 } }],
  }
  const registry = {
    archivedSessionIds: [],
    pinnedSessionIds: ['session-source'],
    async archiveSession(id) {
      this.archivedSessionIds = [...new Set([...this.archivedSessionIds, id])]
      this.pinnedSessionIds = this.pinnedSessionIds.filter(pinned => pinned !== id)
    },
    async unarchiveSession(id) {
      this.archivedSessionIds = this.archivedSessionIds.filter(archived => archived !== id)
    },
    async pinSession(id) {
      if (this.archivedSessionIds.includes(id)) throw new Error('cannot pin an archived session')
      this.pinnedSessionIds = [id, ...this.pinnedSessionIds.filter(pinned => pinned !== id)]
    },
  }
  // The host loader's entries: dsh-rewind's row stands in it disabled, with no fiber, until a check
  // below starts it (D111).
  const loaderEntries = [{ options: { id: 'rewind-disabled', name: 'dsh-rewind-plugin' } }]
  const rewindReads = []
  const hostConfig = { messageActions: true, rewindCheckpoints: true, rewindStorageLimit: '512mb', rewindStorageDir: '' }
  const stored = Object.keys(events).map(id => ({ header: { id }, revision: 'r' }))
  const host = fakeHost(mod, {
    fenced: true,
    registry,
    home,
    listen: true,
    reads: rewindReads,
    config: hostConfig,
    loader: { entries: () => loaderEntries.values() },
    live: ['session-source', 'session-child', 'session-racy', 'session-plain'],
    events,
    stored,
    directories: Object.fromEntries(Object.keys(events).map(id => [id, repo])),
    filesystem: { processPath: target => target.path },
  })
  const session = host.ctx.get('sessions').get('session-source')
  await host.emit('session/event', session, { seq: 1, type: 'turn/start', data: { turn: 1 } })
  const execution = { agent: { session } }
  await host.emit('tools/pre-execute', execution, async () => {})
  fs.writeFileSync(path.join(repo, 'note.txt'), 'command-intermediate\n')
  await host.emit('fs/edit-intent', { path: path.join(repo, 'note.txt') }, execution, async () => ({}))
  await host.emit('fs/write-intent', { path: path.join(repo, 'ignored.txt') }, execution, async () => ({}))
  fs.writeFileSync(path.join(repo, 'note.txt'), 'after\n')
  fs.writeFileSync(path.join(repo, 'ignored.txt'), 'ignored-after\n')
  fs.writeFileSync(path.join(repo, 'new.txt'), 'new\n')
  sourceEvents.push({ seq: 2, type: 'turn/end', data: { turn: 1 } })
  events['session-child'] = sourceEvents.map(event => ({ ...event }))
  await host.emit('session/event', session, { seq: 2, type: 'turn/end', data: { turn: 1 } })

  const refused = await request(host, REVISIONS, 'GET', '', crossSite)
  check('a cross-site page cannot read logical revisions', refused.status === 401 || refused.status === 403, 'HTTP ' + refused.status)
  const shaped = await request(host, PLAN, 'POST', JSON.stringify({ sessionId: '../etc', messageSeq: 2, turn: 1 }), browser)
  check('the rewind plan refuses a session id that names a path', shaped.status === 400, 'HTTP ' + shaped.status)
  const wrongMethod = await request(host, PLAN, 'GET', '', browser)
  check('the rewind plan is POST only', wrongMethod.status === 405, 'HTTP ' + wrongMethod.status)

  const planned = await request(host, PLAN, 'POST', JSON.stringify({ sessionId: 'session-source', messageSeq: 2, turn: 1 }), browser)
  const plan = planned.status === 200 ? JSON.parse(planned.body).value : null
  check('the turn checkpoint offers tracked and ignored file restoration',
    plan?.restoreAvailable === true && plan.files.some(file => file.path === 'note.txt')
      && plan.files.some(file => file.path === 'new.txt') && plan.files.some(file => file.path === 'ignored.txt'),
    JSON.stringify(plan ?? JSON.parse(planned.body)))
  const committed = await request(host, COMMIT, 'POST', JSON.stringify({
    planId: plan?.id,
    childSessionId: 'session-child',
    action: 'edit',
    restore: true,
  }), browser)
  check('the confirmed fork commit succeeds', committed.status === 200, committed.body)
  check('tracked, new and ignored files all return to the turn-start bytes',
    fs.readFileSync(path.join(repo, 'note.txt'), 'utf8') === 'before\n'
      && fs.readFileSync(path.join(repo, 'ignored.txt'), 'utf8') === 'ignored-before\n'
      && !fs.existsSync(path.join(repo, 'new.txt')),
    JSON.stringify({
      note: fs.readFileSync(path.join(repo, 'note.txt'), 'utf8'),
      ignored: fs.readFileSync(path.join(repo, 'ignored.txt'), 'utf8'),
      added: fs.existsSync(path.join(repo, 'new.txt')),
    }))
  const listed = await request(host, REVISIONS, 'GET', '', browser)
  const listedBody = JSON.parse(listed.body)
  const conversation = listedBody.value?.find(item => item.id === 'session-source')
  check('the source is archived and its pin moves to the active child',
    registry.archivedSessionIds.includes('session-source') && !registry.archivedSessionIds.includes('session-child')
      && registry.pinnedSessionIds.includes('session-child') && !registry.pinnedSessionIds.includes('session-source'),
    JSON.stringify(registry))
  check('the logical conversation keeps the source and activates the child',
    conversation?.id === 'session-source' && conversation.activeSessionId === 'session-child'
      && conversation.revisions.some(revision => revision.sessionId === 'session-source' && revision.status === 'superseded' && revision.archived === true)
      && conversation.revisions.some(revision => revision.sessionId === 'session-child' && revision.status === 'active' && revision.archived === false),
    JSON.stringify(listedBody))

  const stale = listedBody.value?.find(item => item.id === 'session-stale')
  check('a deleted physical session is marked missing without being archived',
    stale?.revisions[0]?.missing === true && stale.revisions[0].archived === false && !registry.archivedSessionIds.includes('session-stale'),
    JSON.stringify(stale))

  const statePath = path.join(rewindHome, 'state.json')
  const missingState = async () => {
    const response = await request(host, REVISIONS, 'GET', '', browser)
    return JSON.parse(response.body).value.find(item => item.id === 'session-stale').revisions[0].missing
  }
  stored.push({ header: { id: 'session-stale' }, revision: 'r' })
  check('restoring a physical session makes its revision available', await missingState() === false, 'known session')
  stored.pop()
  check('removing a previously known session disables its revision', await missingState() === true, 'removed session')
  fs.utimesSync(statePath, 1, 1)
  const stamp = fs.statSync(statePath).mtimeMs
  await missingState()
  check('reading unchanged revision metadata leaves the state file untouched', fs.statSync(statePath).mtimeMs === stamp, String(stamp))

  fs.writeFileSync(path.join(repo, 'note.txt'), 'second-version\n')
  const inheritedAnswer = await request(host, PLAN, 'POST', JSON.stringify({ sessionId: 'session-child', messageSeq: 2, turn: 1 }), browser)
  const inherited = inheritedAnswer.status === 200 ? JSON.parse(inheritedAnswer.body).value : null
  check('a fork resolves checkpoints inherited from its source', inherited?.restoreAvailable === true, inheritedAnswer.body)
  const independent = { seq: 3, type: 'turn/start', data: { turn: 1 } }
  const inheritedEvents = events['session-child']
  events['session-child'] = [independent]
  const branch = await request(host, PLAN, 'POST', JSON.stringify({ sessionId: 'session-child', messageSeq: 2, turn: 1 }), browser)
  check('a new branch turn cannot inherit a same-numbered parent checkpoint past the cut', JSON.parse(branch.body).value?.reason === 'missing-target', branch.body)
  events['session-child'] = inheritedEvents
  fs.writeFileSync(path.join(repo, 'ignored.txt'), 'reader-edit\n')
  const conflict = await request(host, COMMIT, 'POST', JSON.stringify({
    planId: inherited.id, childSessionId: 'ignored-conflict', action: 'edit', restore: true,
  }), browser)
  check('a changed ignored file refuses the whole restore before touching tracked files', conflict.status === 409
    && fs.readFileSync(path.join(repo, 'ignored.txt'), 'utf8') === 'reader-edit\n'
    && fs.readFileSync(path.join(repo, 'note.txt'), 'utf8') === 'second-version\n', conflict.body)
  const secondPlan = await request(host, PLAN, 'POST', JSON.stringify({ sessionId: 'session-child', messageSeq: 2, turn: 1 }), browser)
  fs.writeFileSync(path.join(repo, 'note.txt'), 'racy\n')
  const racy = await request(host, COMMIT, 'POST', JSON.stringify({
    planId: JSON.parse(secondPlan.body).value.id,
    childSessionId: 'session-racy',
    action: 'retract',
    restore: true,
  }), browser)
  check('a work tree that changed after confirmation is refused', racy.status === 409, racy.body)
  check('the refused restore leaves the newer bytes and the previous active revision intact',
    fs.readFileSync(path.join(repo, 'note.txt'), 'utf8') === 'racy\n'
      && JSON.parse((await request(host, REVISIONS, 'GET', '', browser)).body).value.find(item => item.id === 'session-source').activeSessionId === 'session-child',
    fs.readFileSync(path.join(repo, 'note.txt'), 'utf8'))

  check('a failed fork is archived without archiving the active source',
    registry.archivedSessionIds.includes('session-racy') && !registry.archivedSessionIds.includes('session-child')
      && registry.pinnedSessionIds.includes('session-child'),
    JSON.stringify(registry))

  const plainAnswer = await request(host, PLAN, 'POST', JSON.stringify({ sessionId: 'session-plain', messageSeq: 2, turn: 1 }), browser)
  const plain = plainAnswer.status === 200 ? JSON.parse(plainAnswer.body).value : null
  check('a historical turn without a checkpoint explicitly offers message-only rewind',
    plain?.restoreAvailable === false && plain.reason !== '', JSON.stringify(plain ?? JSON.parse(plainAnswer.body)))

  // dsh-rewind running in the same host records its own checkpoints, so this half records none
  // while its entry's fiber is active, and records again once it stops (D111).
  const peer = { options: { id: 'rewind-active', name: 'dsh-rewind-plugin' }, fiber: { state: 2 } }
  const plainSession = host.ctx.get('sessions').get('session-plain')
  const plainExecution = { agent: { session: plainSession } }
  const runTurn = async (turn) => {
    await host.emit('session/event', plainSession, { seq: 10 + turn, type: 'turn/start', data: { turn } })
    await host.emit('tools/pre-execute', plainExecution, async () => {})
    await host.emit('fs/write-intent', { path: path.join(repo, 'note.txt') }, plainExecution, async () => ({}))
    await host.emit('session/event', plainSession, { seq: 20 + turn, type: 'turn/end', data: { turn } })
    // A later tool call waits for the recorder's queue, which ends once the checkpoint is written.
    await host.emit('tools/pre-execute', plainExecution, async () => {})
  }
  const plainTurns = () => (JSON.parse(fs.readFileSync(path.join(rewindHome, 'state.json'), 'utf8')).checkpoints['session-plain'] ?? []).map(row => row.turn)
  loaderEntries.push(peer)
  await runTurn(2)
  const whilePeer = plainTurns()
  loaderEntries.splice(loaderEntries.indexOf(peer), 1)
  await runTurn(3)
  const afterPeer = plainTurns()
  loaderEntries.push(peer)
  await runTurn(4)
  const peerBack = plainTurns()
  check('no checkpoint is recorded while dsh-rewind runs in the host', whilePeer.length === 0, JSON.stringify(whilePeer))
  check('a disabled dsh-rewind entry leaves the recording on', JSON.stringify(afterPeer) === '[3]', JSON.stringify(afterPeer))
  check('dsh-rewind starting again stops the recording at the next turn', JSON.stringify(peerBack) === '[3]', JSON.stringify(peerBack))

  // Reconciling archive state uses sessionPersistence.list() instead of opening non-live logs via observeSession.
  const readsBeforeRevisions = rewindReads.length
  await request(host, REVISIONS, 'GET', '', browser)
  check('reconcileArchiveState does not call observeSession when sessionPersistence lists stored sessions',
    rewindReads.length === readsBeforeRevisions, JSON.stringify({ before: readsBeforeRevisions, after: rewindReads.length }))

  // Configuration switches and custom storage directory (issue #475).
  loaderEntries.splice(loaderEntries.indexOf(peer), 1)
  hostConfig.rewindCheckpoints = false
  await runTurn(5)
  const whileCheckpointsOff = plainTurns()
  hostConfig.rewindCheckpoints = true
  hostConfig.messageActions = false
  await runTurn(6)
  const whileActionsOff = plainTurns()
  hostConfig.messageActions = true
  const customDir = path.join(root, 'custom-storage')
  hostConfig.rewindStorageDir = customDir
  await runTurn(7)
  const afterCustomDir = plainTurns()
  check('disabling rewindCheckpoints skips recording turn checkpoints', JSON.stringify(whileCheckpointsOff) === '[3]', JSON.stringify(whileCheckpointsOff))
  check('disabling messageActions also stops background checkpoint recording', JSON.stringify(whileActionsOff) === '[3]', JSON.stringify(whileActionsOff))
  check('custom rewindStorageDir writes objects into the configured directory',
    JSON.stringify(afterCustomDir) === '[3,7]' && fs.existsSync(path.join(customDir, 'objects')),
    JSON.stringify({ turns: afterCustomDir, customExists: fs.existsSync(path.join(customDir, 'objects')) }))

  // Oversized (>16 MB) files are skipped by the Git snapshot path (0 bytes into objects/) and stay untouched on restore.
  const storeMod = await import(pathToFileURL(path.join(ROOT, 'lib', 'host', 'session-rewind-store.js')).href)
  const gitMod = await import(pathToFileURL(path.join(ROOT, 'lib', 'host', 'session-rewind-git.js')).href)
  const bigDir = path.join(root, 'oversized-storage')
  hostConfig.rewindStorageDir = bigDir
  const bigFile = path.join(repo, 'huge-build.bin')
  const bigBuffer = Buffer.alloc(17 * 1024 * 1024, 0x41)
  fs.writeFileSync(bigFile, bigBuffer)
  fs.writeFileSync(path.join(repo, 'note.txt'), 'before-big\n')
  events['session-plain'].push({ seq: 30, type: 'turn/start', data: { turn: 8 } })
  await host.emit('session/event', plainSession, { seq: 30, type: 'turn/start', data: { turn: 8 } })
  await host.emit('tools/pre-execute', plainExecution, async () => {})
  fs.writeFileSync(path.join(repo, 'note.txt'), 'after-big\n')
  bigBuffer[0] = 0x42
  fs.writeFileSync(bigFile, bigBuffer)
  events['session-plain'].push({ seq: 31, type: 'turn/end', data: { turn: 8 } })
  await host.emit('session/event', plainSession, { seq: 31, type: 'turn/end', data: { turn: 8 } })
  await host.emit('tools/pre-execute', plainExecution, async () => {})
  const bigStorageBytes = await storeMod.measureRewindStorage(bigDir)
  check('a 17 MB untracked file is skipped by the Git snapshot layer instead of bloating rewind/objects',
    bigStorageBytes < 1024 * 1024, String(bigStorageBytes))
  events['session-plain-child'] = events['session-plain'].map(event => ({ ...event }))
  const bigPlanRes = await request(host, PLAN, 'POST', JSON.stringify({ sessionId: 'session-plain', messageSeq: 31, turn: 8 }), browser)
  const bigPlan = bigPlanRes.status === 200 ? JSON.parse(bigPlanRes.body).value : null
  const bigCommitRes = await request(host, COMMIT, 'POST', JSON.stringify({
    planId: bigPlan?.id,
    childSessionId: 'session-plain-child',
    action: 'edit',
    restore: true,
  }), browser)
  check('restoring a turn with a skipped >16 MB file restores normal code and leaves the >16 MB file untouched',
    bigCommitRes.status === 200
      && fs.readFileSync(path.join(repo, 'note.txt'), 'utf8') === 'before-big\n'
      && fs.existsSync(bigFile) && fs.readFileSync(bigFile)[0] === 0x42,
    JSON.stringify({ status: bigCommitRes.status, note: fs.readFileSync(path.join(repo, 'note.txt'), 'utf8'), exists: fs.existsSync(bigFile) }))
  fs.unlinkSync(bigFile)

  // Oldest-first storage pruning removes expired checkpoints and unreachable loose objects cleanly.
  const pruneStorage = path.join(root, 'prune-storage')
  const pruneWs = await gitMod.locateGit(repo, pruneStorage)
  const pruneCheckpoints = { 'session-prune': [] }
  for (let turn = 1; turn <= 4; turn += 1) {
    fs.writeFileSync(path.join(repo, 'prune-blob.bin'), Buffer.alloc(12_000, turn))
    const snap = await gitMod.snapshotTree(pruneWs, pruneStorage)
    pruneCheckpoints['session-prune'].push({
      sessionId: 'session-prune',
      turn,
      createdAt: turn * 1000,
      storage: pruneStorage,
      git: { root: pruneWs.root, gitDir: pruneWs.gitDir, repositoryObjects: pruneWs.repositoryObjects, beforeTree: snap.tree },
      captures: {},
    })
  }
  const bytesBeforePrune = await storeMod.measureRewindStorage(pruneStorage)
  const activeCapture = await storeMod.captureFile(path.join(repo, 'ignored.txt'), pruneStorage, 1024)
  const activeCheckpoint = { ...pruneCheckpoints['session-prune'][0], captures: { ignored: activeCapture } }
  const pruned = await storeMod.pruneRewindStorage({
    storageDir: pruneStorage,
    defaultStorageDir: pruneStorage,
    limitBytes: Math.max(100, Math.floor(bytesBeforePrune / 2)),
    checkpoints: pruneCheckpoints,
    protectedTrees: [],
    protectedCheckpoints: [activeCheckpoint],
    warn: () => {},
  })
  fs.unlinkSync(path.join(repo, 'prune-blob.bin'))
  check('a running turn keeps its unpublished capture and baseline through a quota sweep',
    fs.existsSync(path.join(pruneStorage, 'captures', activeCapture.hash))
      && (await gitMod.treePaths(pruneWs, activeCheckpoint.git.beforeTree)).has('prune-blob.bin'), activeCapture.hash)
  check('storage pruning evicts oldest checkpoints and shrinks loose objects under budget',
    pruned.changed && pruned.bytes < bytesBeforePrune && pruneCheckpoints['session-prune'].length < 4
      && pruneCheckpoints['session-prune'].at(-1)?.turn === 4,
    JSON.stringify({ before: bytesBeforePrune, after: pruned.bytes, turns: pruneCheckpoints['session-prune'].map(c => c.turn) }))

  // D111: count actual Node filesystem requests on the tool queue while the retained corpus grows.
  const countTurnRequests = async turn => {
    let requests = 0
    const hook = createHook({ init(_id, type) { if (type === 'FSREQPROMISE') requests++ } })
    hook.enable()
    try {
      await runTurn(turn)
      return requests
    } finally {
      hook.disable()
    }
  }
  const quotaDir = path.join(root, 'quota-cost')
  hostConfig.rewindStorageDir = quotaDir
  await runTurn(9)
  const initialRequests = await countTurnRequests(10)
  const extraCaptures = 128
  for (let i = 0; i < extraCaptures; i++) {
    fs.writeFileSync(path.join(quotaDir, 'captures', String(i).padStart(64, '0')), 'retained')
  }
  const laterRequests = await countTurnRequests(11)
  check('the next tool does not stat each retained capture after a turn', laterRequests < initialRequests + extraCaptures,
    JSON.stringify({ initialRequests, laterRequests, extraCaptures }))

  // Process-tree kill on timeout/abort and host disposal leaves no listeners or hanging git workers.
  const abortStart = Date.now()
  let timedOut = false
  try {
    await gitMod.runGit(['-c', 'alias.hang=!node -e "setTimeout(() => {}, 30000)"', 'hang'], repo, {}, { timeoutMs: 250 })
  } catch {
    timedOut = true
  }
  const abortElapsed = Date.now() - abortStart
  check('a timed-out git process tree terminates promptly without hanging',
    timedOut && abortElapsed < 5_000, JSON.stringify({ timedOut, abortElapsed }))

  // Default config keeps messageActions off, so no workspace checkpoints are recorded unless opted in.
  const defaultHome = path.join(root, 'default-off-home')
  const defaultHost = fakeHost(mod, {
    fenced: true,
    home: defaultHome,
    listen: true,
    live: ['session-default-off'],
    events: { 'session-default-off': [{ seq: 0, type: 'user/message', data: { turn: 1 } }, { seq: 1, type: 'turn/start', data: { turn: 1 } }] },
    directories: { 'session-default-off': repo },
    filesystem: { processPath: target => target.path },
  })
  const defaultSession = defaultHost.ctx.get('sessions').get('session-default-off')
  await defaultHost.emit('session/event', defaultSession, { seq: 1, type: 'turn/start', data: { turn: 1 } })
  await defaultHost.emit('session/event', defaultSession, { seq: 2, type: 'turn/end', data: { turn: 1 } })
  check('default configuration leaves messageActions off and records no workspace checkpoints',
    !fs.existsSync(path.join(defaultHome, 'dsh-claude-style', 'rewind', 'objects')),
    String(fs.existsSync(path.join(defaultHome, 'dsh-claude-style', 'rewind', 'objects'))))
  defaultHost.dispose()

  host.dispose()
  check('disposing the host routes unregisters SessionRewind listeners',
    (host.listeners['session/event']?.length ?? 0) === 0
      && (host.listeners['tools/pre-execute']?.length ?? 0) === 0
      && (host.listeners['fs/write-intent']?.length ?? 0) === 0,
    JSON.stringify({
      events: host.listeners['session/event']?.length ?? 0,
      preExec: host.listeners['tools/pre-execute']?.length ?? 0,
      writeIntent: host.listeners['fs/write-intent']?.length ?? 0,
    }))
}

export { hostRewind }
