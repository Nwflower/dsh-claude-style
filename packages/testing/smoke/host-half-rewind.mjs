/**
 * Host-side rewind evidence on a real Git work tree: exact tracked and ignored
 * file restoration, fork-inherited checkpoints, stale-plan refusal and D75 fences.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
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
  const host = fakeHost(mod, {
    fenced: true,
    registry,
    home,
    listen: true,
    loader: { entries: () => loaderEntries.values() },
    live: ['session-source', 'session-child', 'session-racy', 'session-plain'],
    events,
    stored: Object.keys(events).map(id => ({ header: { id }, revision: 'r' })),
    directories: Object.fromEntries(Object.keys(events).map(id => [id, repo])),
    filesystem: { processPath: target => target.path },
  })
  const session = host.ctx.get('sessions').get('session-source')
  await host.emit('session/event', session, { seq: 1, type: 'turn/start', data: { turn: 1 } })
  const execution = { agent: { session } }
  await host.emit('tools/pre-execute', execution, async () => {})
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

  fs.writeFileSync(path.join(repo, 'note.txt'), 'second-version\n')
  const inheritedAnswer = await request(host, PLAN, 'POST', JSON.stringify({ sessionId: 'session-child', messageSeq: 2, turn: 1 }), browser)
  const inherited = inheritedAnswer.status === 200 ? JSON.parse(inheritedAnswer.body).value : null
  check('a fork resolves checkpoints inherited from its source', inherited?.restoreAvailable === true, inheritedAnswer.body)
  fs.writeFileSync(path.join(repo, 'note.txt'), 'racy\n')
  const racy = await request(host, COMMIT, 'POST', JSON.stringify({
    planId: inherited?.id,
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
}

export { hostRewind }
