/**
 * The smoke's session overview panel, in Node: the route the panel reads, its
 * answer folded from a session's log and projections, the child timing and job
 * output it carries, and the fence and id checks every read of the user's own
 * session runs (D75, D94).
 */
import { resolve } from 'node:path'
import { check } from './shared.mjs'

/**
 * Run the session overview checks.
 *
 * @param options.mod - the host-half module (lib/host/index.js).
 * @param options.fakeHost - the fake cordis context (host-half.mjs).
 * @param options.request - one request through a registered route (host-half.mjs).
 * @param options.browser - the headers of a same-origin loopback page.
 * @param options.crossSite - the headers of a page from another origin.
 * @param options.scratchHome - the scratch harness home.
 */
async function hostPanel({ mod, fakeHost, request, browser, crossSite, scratchHome }) {
  console.log('\nhost half — the session overview panel')
  const panelHost = fakeHost(mod, {
    fenced: true,
    home: scratchHome,
    events: {
      'session-overview': [
        {
          seq: 1,
          time: Date.parse('2026-10-17T02:00:00Z'),
          type: 'deliverables/presented',
          data: { turn: 1, callId: 'call-1', files: [{ path: '/panel/does-not-exist/notes.md' }] },
        },
        {
          seq: 2,
          time: Date.parse('2026-10-17T02:00:00Z'),
          type: 'job/registered',
          data: { jobId: 'bash-foreground', label: 'npm test', startedAt: 1_000, toolCall: { callId: 'call-fg', rootCallId: 'call-fg' } },
        },
        {
          seq: 3,
          time: Date.parse('2026-10-17T02:00:00Z'),
          type: 'job/settled',
          data: { jobId: 'bash-foreground', label: 'npm test', startedAt: 1_000, finishedAt: 9_000, status: 'completed', detail: 'exit code: 0' },
        },
        {
          // The foreground command's result carries its output; the registry's
          // ring is gone by the time the panel asks, so the log is the source.
          seq: 4,
          time: Date.parse('2026-10-17T02:00:00Z'),
          type: 'tool/result',
          data: { turn: 1, step: 1, message: { role: 'tool', source: { kind: 'tool', callId: 'call-fg' }, toolCallId: 'call-fg', content: [{ type: 'text', text: 'finished-line\n' }] } },
        },
      ],
      'child-recon': [],
    },
    projections: {
      'session-overview': {
        workingDirectory: '/panel/does-not-exist',
        contextPressure: { projectedTokens: 32_000, contextWindow: 1_000_000 },
        contextBreakdown: { systemTokens: 1_200, toolsTokens: 7_400, messageTokens: 8_000 },
        subagentCatalog: [{ id: 'child-recon', createdAt: Date.parse('2026-10-17T02:00:00Z'), mode: 'continuable', label: 'Recon child' }],
        sessionStats: { turns: 2, steps: 9, llmMs: 61_000, toolMs: 12_000, ttftMs: 3_000, ttftSteps: 2, decodeMs: 40_000, decodeTokens: 246 },
        tokenUsage: { uncachedInputTokens: 9_200, cacheReadTokens: 5_800, cacheWriteTokens: 92_000, outputTokens: 246 },
      },
      'child-recon': {
        // A child that closed its turn after 14m 20s with 2.05M tokens: the
        // panel takes the figures from the child's own log, not from its age.
        subagentTiming: { settledMs: 860_000, lastTurnCompleted: true },
        tokenUsage: { uncachedInputTokens: 1_000, cacheReadTokens: 2_000_000, cacheWriteTokens: 0, outputTokens: 50_000 },
      },
    },
    stored: [
      { header: { id: 'session-overview' }, revision: 'o1' },
      { header: { id: 'child-recon' }, revision: 'c1' },
    ],
    jobs: {
      list: () => [{ id: 'bash-panel-job', label: 'sleep 9 && echo panel', status: 'completed', startedAt: 1_000, finishedAt: 9_000, progress: 'done' }],
      get: () => ({ status: 'completed' }),
      readAt: () => ({ chunks: [{ text: 'panel job output\n' }], lossy: false }),
    },
  })
  const refusedPanel = await request(panelHost, '/dsh-claude-style/session-panel?id=session-overview', 'GET', '', crossSite)
  check('cross-site page: the session overview is refused',
    refusedPanel.status === 401 || refusedPanel.status === 403, `HTTP ${refusedPanel.status}`)
  const shapedPanel = await request(panelHost, '/dsh-claude-style/session-panel?id=..%2Fetc', 'GET', '', browser)
  check('a session id that names a path is refused by the overview', shapedPanel.status === 400, `HTTP ${shapedPanel.status}`)
  const panelAnswer = await request(panelHost, '/dsh-claude-style/session-panel?id=session-overview', 'GET', '', browser)
  const panelBody = panelAnswer.status === 200 ? JSON.parse(panelAnswer.body) : null
  check('the overview answers the working directory, the context reading and the presented file',
    panelBody !== null && panelBody.ok === true &&
      panelBody.value?.environment?.directory === resolve('/panel/does-not-exist') &&
      panelBody.value?.context?.used === 32_000 && panelBody.value?.context?.window === 1_000_000 &&
      panelBody.value?.outputs?.length === 1 && panelBody.value.outputs[0].name === 'notes.md' &&
      panelBody.value.outputs[0].origin === 'presented' && panelBody.value.outputs[0].kind === 'document' &&
      panelBody.value.changes.length === 0,
    JSON.stringify(panelBody?.value ?? panelBody))
  const child = panelBody?.value?.background?.subagents?.[0]
  check('the overview carries the session\'s own figures and token buckets',
    panelBody?.value?.stats?.turns === 2 && panelBody.value.stats.steps === 9 &&
      panelBody.value.stats.llmMs === 61_000 && panelBody.value.stats.decodeTokens === 246 &&
      panelBody.value.stats.cacheReadTokens === 5_800 && panelBody.value.stats.outputTokens === 246,
    JSON.stringify(panelBody?.value?.stats ?? null))
  check('a child session carries the turn time and tokens of its own log',
    panelBody?.value?.background?.subagents?.length === 1 && child?.settledMs === 860_000 &&
      child.completed === true && child.running === false && child.tokens === 2_051_000,
    JSON.stringify(child ?? null))
  const jobs = panelBody?.value?.background?.jobs ?? []
  check('the jobs registry\'s roster answers the background section',
    jobs.length === 2 && jobs.some((job) => job.label === 'sleep 9 && echo panel'),
    JSON.stringify(jobs))
  const finished = jobs.find((job) => job.id === 'bash-foreground')
  check('a settled command stays in the kept history after the registry drops it',
    finished !== undefined && finished.status === 'completed' && finished.detail === 'exit code: 0',
    JSON.stringify(finished ?? null))
  const jobAnswer = await request(panelHost, '/dsh-claude-style/session-panel?id=session-overview&job=bash-panel-job', 'GET', '', browser)
  const jobBody = jobAnswer.status === 200 ? JSON.parse(jobAnswer.body) : null
  check('one job\'s retained output answers the expanded row when asked for it',
    jobBody !== null && jobBody.ok === true && jobBody.value?.text === 'panel job output\n' && jobBody.value.status === 'completed',
    JSON.stringify(jobBody?.value ?? jobBody))
  const keptOutput = await request(panelHost, '/dsh-claude-style/session-panel?id=session-overview&job=bash-foreground', 'GET', '', browser)
  const keptBody = keptOutput.status === 200 ? JSON.parse(keptOutput.body) : null
  check('a dropped job keeps the output the session log carries',
    keptBody !== null && keptBody.ok === true && keptBody.value?.text === 'finished-line\n',
    JSON.stringify(keptBody?.value ?? keptBody))
  const shapedJob = await request(panelHost, '/dsh-claude-style/session-panel?id=session-overview&job=..%2Fetc', 'GET', '', browser)
  check('a job id that names a path is refused', shapedJob.status === 400, `HTTP ${shapedJob.status}`)
}

export { hostPanel }
