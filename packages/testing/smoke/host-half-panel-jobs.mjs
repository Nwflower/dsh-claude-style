/** Command executions keep their session scope and their foreground/background provenance (D94). */
import { check } from './shared.mjs'

export async function hostPanelJobs({ mod, fakeHost, request, browser, scratchHome }) {
  const call = (callId, name, args) => ({ type: 'tool/call', time: 100, data: { callId, name, arguments: JSON.stringify(args) } })
  const register = (jobId, callId, kind = 'pwsh', rootCallId = callId) => ({ type: 'job/registered', data: { jobId, kind, label: jobId, startedAt: 100, toolCall: { callId, rootCallId } } })
  const settle = jobId => ({ type: 'job/settled', data: { jobId, finishedAt: 200, status: 'completed' } })
  const result = (callId, text) => ({ type: 'tool/result', time: 200, data: { message: { source: { kind: 'tool', callId }, content: [{ type: 'text', text }] } } })
  const events = [
    call('foreground', 'pwsh', { command: 'Get-Date', description: 'Read the clock' }),
    register('pwsh-foreground', 'foreground'), settle('pwsh-foreground'), result('foreground', 'clock output'),
    call('background', 'pwsh', { command: 'Start-Sleep 60', run_in_background: true }),
    register('pwsh-background', 'background'), result('background', 'started background job pwsh-background'),
    call('promoted', 'pwsh', { command: 'Start-Sleep 90' }), register('pwsh-promoted', 'promoted'),
    settle('pwsh-promoted'), result('promoted', '[still running after 10ms; moved to background job pwsh-promoted]'),
    call('terminal', 'terminal_send', { sessionId: 'pty', text: 'echo terminal' }), result('terminal', 'terminal output'),
    call('nested', 'js', { code: 'nested execution' }), register('pwsh-nested', 'nested-call', 'pwsh', 'nested'),
    result('nested', 'started background job pwsh-nested'),
    register('workflow-task', 'workflow', 'workflow'),
    { type: 'user/message', time: 300, data: { source: { kind: 'user' }, content: [] } },
    call('waiting', 'pwsh', { command: 'Get-ChildItem' }),
  ].map((event, seq) => ({ ...event, seq }))
  const host = fakeHost(mod, { fenced: true, home: scratchHome, events: { 'command-kinds': events }, projections: {} })
  const answer = await request(host, '/dsh-claude-style/session-panel?id=command-kinds&live=1', 'GET', '', browser)
  const value = JSON.parse(answer.body).value
  const jobs = value.background.jobs
  const find = id => jobs.find(job => job.id === id)
  check('foreground registration and tool invocation describe one execution',
    jobs.filter(job => job.label === 'Read the clock').length === 1 && find('pwsh-foreground')?.execution === 'foreground', JSON.stringify(jobs))
  check('explicit background and timeout promotion retain background provenance after settlement',
    find('pwsh-background')?.execution === 'background' && find('pwsh-promoted')?.execution === 'background', JSON.stringify(jobs))
  check('nested tool roots identify background work without inventing a second process',
    find('pwsh-nested')?.category === 'process' && find('pwsh-nested')?.execution === 'background', JSON.stringify(jobs))
  const terminal = jobs.find(job => job.label === 'echo terminal')
  check('a foreground command without a registry record keeps its output and cannot call registry cancellation',
    terminal?.status === 'completed' && terminal.execution === 'foreground' && terminal.controllable === false, JSON.stringify(terminal))
  const output = await request(host, `/dsh-claude-style/session-panel?id=command-kinds&job=${terminal?.id}`, 'GET', '', browser)
  check('an unregistered foreground command exposes its own retained output',
    JSON.parse(output.body).value?.text === 'terminal output', output.body)
  check('a new user input preserves earlier command history and a waiting call stays in the foreground',
    find('pwsh-foreground')?.status === 'completed' && jobs.some(job => job.label === 'Get-ChildItem' && job.status === 'running' && job.execution === 'foreground'), JSON.stringify(jobs))
  check('a non-command producer stays a task rather than a process',
    find('workflow-task')?.category === 'task' && find('workflow-task')?.execution === 'unknown', JSON.stringify(find('workflow-task')))
}
