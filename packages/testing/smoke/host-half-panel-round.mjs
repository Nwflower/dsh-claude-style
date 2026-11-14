/** Latest human-input round filtering through the built host route (D94). */
import { check } from './shared.mjs'

export async function hostPanelRound({ mod, fakeHost, request, browser, scratchHome }) {
  const user = time => ({ type: 'user/message', time, surfaceOp: 'append', data: { role: 'user', source: { kind: 'user' }, content: [] } })
  const call = (callId, name, args) => ({ type: 'tool/call', data: { callId, name, arguments: JSON.stringify(args) } })
  const result = (callId, isError = false) => ({ type: 'tool/result', data: { message: { source: { kind: 'tool', callId }, isError, content: [] } } })
  const catalog = childId => ({ type: 'subagent/catalog', data: { childId } })
  const registered = (jobId, startedAt, callId) => ({ type: 'job/registered', data: { jobId, startedAt, toolCall: { callId } } })
  const settled = jobId => ({ type: 'job/settled', data: { jobId, startedAt: 110, finishedAt: 190, status: 'completed' } })
  const presented = (path, callId) => ({ type: 'deliverables/presented', data: { callId, files: [{ path }] } })
  const initial = [
    user(100),
    call('old-call', 'pwsh', {}), registered('old-finished', 110, 'old-call'), settled('old-finished'),
    registered('old-running', 120, 'old-call'),
    catalog('stale-child'), catalog('reused-child'), catalog('running-child'), catalog('ui-resumed-child'),
    presented('/panel/old.md'),
    call('late-write', 'write', { file_path: '/panel/late.md' }),
    call('late-present', 'present', {}),
    user(200),
  ]
  const afterInput = [
    { type: 'user/message', surfaceOp: 'append', data: { source: { kind: 'job', form: 'notice' }, content: [] } },
    { type: 'user/message', surfaceOp: 'append', data: { source: { kind: 'goal' }, content: [] } },
    { type: 'user/message', surfaceOp: { startSeq: 0, endSeq: 1 }, data: { source: { kind: 'user' }, content: [] } },
    { type: 'turn/start', time: 210, data: { turn: 4 } },
    presented('/panel/new.md'),
    call('new-write', 'write', { file_path: '/panel/old.md' }), result('new-write'),
    call('new-present', 'present', {}), presented('/panel/old.md', 'new-present'),
    call('new-job-call', 'pwsh', {}), registered('new-finished', 220, 'new-job-call'), settled('new-finished'),
    call('reuse', 'send_message', { agent_id: 'reused-child' }), result('reuse'),
    call('failed-reuse', 'send_message', { agent_id: 'stale-child' }), result('failed-reuse', true),
    catalog('latest-child'),
    result('late-write'), presented('/panel/late-present.md', 'late-present'),
    { type: 'job/registered', data: { jobId: 'late-nested', startedAt: 230, toolCall: { callId: 'nested-call', rootCallId: 'old-call' } } },
    settled('late-nested'),
  ]
  const numbered = [...initial, ...afterInput].map((event, seq) => ({ ...event, seq }))
  const incremental = numbered.slice(0, initial.length)
  const catalogRows = ['stale-child', 'reused-child', 'running-child', 'ui-resumed-child', 'latest-child']
    .map(id => ({ id, createdAt: id === 'latest-child' ? 220 : 110, mode: 'continuable', label: id }))
  const projections = {
    incremental: { subagentCatalog: catalogRows.slice(0, -1) },
    restored: { subagentCatalog: catalogRows },
  }
  const events = { incremental, restored: numbered }
  for (const child of catalogRows) {
    projections[child.id] = { subagentTiming: child.id === 'running-child'
      ? { active: { since: 150 }, settledMs: 0 } : { settledMs: 100, lastTurnCompleted: true } }
    events[child.id] = [{ type: 'turn/start', seq: 0, time: child.id === 'ui-resumed-child' ? 230 : child.createdAt, data: { turn: 1 } }]
  }
  const host = fakeHost(mod, { fenced: true, home: scratchHome, events, projections })
  const read = async id => {
    const answer = await request(host, `/dsh-claude-style/session-panel?id=${id}&live=1`, 'GET', '', browser)
    const body = JSON.parse(answer.body)
    check(`latest round ${id}: route answers successfully`, answer.status === 200 && body.ok === true, answer.body)
    return body.value
  }
  const empty = await read('incremental')
  check('a new human input clears old outputs before a new delivery', empty.outputs.length === 0, JSON.stringify(empty.outputs))
  check('command history spans human inputs while running commands remain actionable',
    empty.background.jobs.map(job => job.id).sort().join() === 'old-finished,old-running', JSON.stringify(empty.background.jobs))
  check('every catalogued child keeps its row, settled ones included',
    empty.background.subagents.map(child => child.id).sort().join() === 'reused-child,running-child,stale-child,ui-resumed-child', JSON.stringify(empty.background.subagents))
  incremental.push(...numbered.slice(initial.length))
  projections.incremental.subagentCatalog = catalogRows
  const advanced = await read('incremental')
  const restored = await read('restored')
  check('incremental polling and a restored log answer identical latest-round rows',
    JSON.stringify(advanced) === JSON.stringify(restored), JSON.stringify({ advanced, restored }))
  check('notifications, automatic turns and surface replacements keep the human-input round',
    advanced.outputs.map(output => output.path).join() === '/panel/old.md,/panel/new.md', JSON.stringify(advanced.outputs))
  check('presenting a written file upgrades its row without duplicating it',
    advanced.outputs[0]?.origin === 'presented', JSON.stringify(advanced.outputs))
  check('late old-round writes and presentations stay out of the new round',
    !advanced.outputs.some(output => /late/.test(output.path)), JSON.stringify(advanced.outputs))
  check('a child started later joins the session list rather than a round',
    advanced.background.subagents.map(child => child.id).sort().join() === 'latest-child,reused-child,running-child,stale-child,ui-resumed-child', JSON.stringify(advanced.background.subagents))
  check('current and earlier commands remain in the session history',
    advanced.background.jobs.map(job => job.id).sort().join() === 'late-nested,new-finished,old-finished,old-running', JSON.stringify(advanced.background.jobs))
  incremental.push({ ...settled('old-running'), seq: numbered.length })
  const finished = await read('incremental')
  check('an older running command becomes a settled history entry',
    finished.background.jobs.find(job => job.id === 'old-running')?.status === 'completed', JSON.stringify(finished.background.jobs))
}
