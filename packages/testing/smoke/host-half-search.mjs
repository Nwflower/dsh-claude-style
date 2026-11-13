/** Message-content search through the built host routes and their request fence (D75, D92). */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { runsPath } from '../../../scripts/shared/debug-paths.mjs'
import { ROOT, HOST, same, check } from './shared.mjs'

export const said = (seq, time, text, kind = 'user') => ({
  seq, time, type: 'user/message', data: { content: [{ type: 'text', text }], source: { kind } },
})

export async function hostSearch({ mod, fakeHost, request, browser, crossSite, scratchHome }) {
  // Message-content search over the query service's raw logs: a phrase inside
  // a Chinese sentence matches, case and runs of whitespace do not matter,
  // injected context, tool-call arguments and subagent children stay out, and a
  // stored session is read again only when the palette's prewarm re-lists a
  // moved revision.
  console.log('\nhost half — message content search')
  const SEARCH = '/dsh-claude-style/session-search'
  // The stored listing's own throttle (packages/host/src/search.ts LIST_INTERVAL_MS).
  const STORE_LIST_WAIT_MS = 2100
  const answered = (seq, time, content) => ({ seq, time, type: 'assistant/message', data: { message: { content } } })
  const searchEvents = {
    'session-a': [said(1, 1000, '我们能获得一个这样的搜索框吗？'), answered(2, 2000, [{ type: 'text', text: 'Yes.' }])],
    'session-b': [said(1, 3000, 'Open the SEARCH\n   box, please'),
      answered(2, 4000, [{ type: 'text', text: 'Done.' }, { type: 'tool-call', name: 'edit', arguments: '{"text":"搜索框"}' }]),
      // Injected context is a `user/message` too: its words are not the
      // reader's, so it must not become a hit (nor push the real one aside).
      said(3, 4500, 'injected: the SEARCH box lives in the sidebar', 'runtime-context')],
    'session-child': [said(1, 5000, '搜索框')],
  }
  const stored = [
    { header: { id: 'session-a' }, revision: 'a1' },
    { header: { id: 'session-b' }, revision: 'b1' },
    { header: { id: 'session-child', origin: 'subagent' }, revision: 'c1' },
  ]
  const reads = []
  const lists = []
  const listings = []
  const releases = []
  // The corpus cache lives under the harness home, so the fake host gets the
  // scratch one: a real home would take this lane's sessions and leave files in it.
  const searchHost = fakeHost(mod, { fenced: true, home: scratchHome, events: searchEvents, stored, reads, lists, listCalls: listings, releases })
  const ask = async (query, headers = browser) => {
    const answer = await request(searchHost, `${SEARCH}?q=${encodeURIComponent(query)}`, 'GET', '', headers)
    return { status: answer.status, body: answer.status === 200 ? JSON.parse(answer.body) : null }
  }
  const refusedSearch = await ask('搜索框', crossSite)
  check('cross-site page: content search refused', refusedSearch.status === 401 || refusedSearch.status === 403, `HTTP ${refusedSearch.status}`)
  const chinese = await ask('搜索框')
  const hit = chinese.body?.sessions?.[0] ?? {}
  check('a phrase inside a Chinese sentence matches, and the excerpt marks it',
    chinese.status === 200 && chinese.body.sessions.length === 1 && hit.sessionId === 'session-a' && hit.role === 'user' &&
      hit.snippet.slice(hit.match[0], hit.match[1]) === '搜索框',
    JSON.stringify(chinese))
  const english = await ask('search box')
  check('case and runs of whitespace do not matter; injected context, tool-call arguments and subagent children stay out',
    english.status === 200 && english.body.sessions.length === 1 && english.body.sessions[0].sessionId === 'session-b' &&
      english.body.sessions[0].snippet === 'Open the SEARCH box, please',
    JSON.stringify(english))
  check('each stored top-level session is read once while its revision holds',
    same(reads.slice().sort(), ['session-a', 'session-b']), JSON.stringify(reads))
  stored[1] = { header: { id: 'session-b' }, revision: 'b2' }
  // The listing is throttled and the palette's own prewarm is what pays it; a
  // content query reads the corpus as it stands.
  await new Promise((resolve) => setTimeout(resolve, STORE_LIST_WAIT_MS))
  await ask('')
  await ask('search box')
  check('a moved revision is read again by the prewarm, and only it',
    same(reads.slice().sort(), ['session-a', 'session-b', 'session-b']), JSON.stringify(reads))
  // Each stale session is read by id, without walking the stored corpus. The
  // panel's own revision listing is a separate, throttled pass and is not
  // counted here.
  check('the catch-up folds its stale sessions without a stored-corpus listing',
    same(listings, []), JSON.stringify(listings))
  check('every log the corpus search reads releases its observation',
    same(releases.slice().sort(), reads.slice().sort()), JSON.stringify({ reads, releases }))
  check('folding the corpus never preflights a session with a store listing',
    same(lists, [3, 3]), JSON.stringify(lists))
  // An open session is read again only when its log grows.
  const liveReads = []
  const liveLists = []
  // An open session contributes its growth through the live log's own tail. Its
  // own home, so the corpus is built here rather than read back from the pass above.
  const liveHome = runsPath(ROOT, 'smoke', 'home-live')
  fs.rmSync(liveHome, { recursive: true, force: true })
  const liveTails = []
  const liveEvents = { ...searchEvents, 'session-a': searchEvents['session-a'].slice() }
  const liveSearch = fakeHost(mod, { fenced: true, home: liveHome, events: liveEvents, stored, reads: liveReads, lists: liveLists, live: ['session-a'], tails: liveTails })
  const liveAsk = () => request(liveSearch, `${SEARCH}?q=${encodeURIComponent('搜索框')}`, 'GET', '', browser)
  await liveAsk()
  await liveAsk()
  const liveHeld = liveReads.filter((id) => id === 'session-a').length
  liveEvents['session-a'].push(said(3, 6000, '再看一次搜索框'))
  const grown = JSON.parse((await liveAsk()).body)
  check('an open session is read in full once, and its growth arrives through the live tail',
    liveHeld === 1 && liveReads.filter((id) => id === 'session-a').length === 1 &&
      liveTails.length === 1 && liveTails[0][0] === 'session-a' && liveTails[0][1] === 3 &&
      grown.sessions[0]?.seq === 3 && grown.sessions[0]?.snippet === '再看一次搜索框',
    JSON.stringify({ liveReads, liveTails, grown }))
  check("reading an open session's log costs the store one listing, the prewarm's own",
    same(liveLists, [3]), JSON.stringify(liveLists))
  fs.rmSync(liveHome, { recursive: true, force: true })
  await hostSearchBudget({ mod, fakeHost, scratchHome })
}

/** Drive the shipped search module through the same session-service boundary as its route. */
async function hostSearchBudget({ mod, fakeHost, scratchHome }) {
  const { createSessionSearch, CORPUS_CACHE_CHARS, LOWER_CACHE_CHARS } = await import(pathToFileURL(path.join(path.dirname(HOST), 'search.js')).href)
  const events = {}
  const stored = []
  for (let index = 0; index < 6; index += 1) {
    const id = `budget-${index}`
    events[id] = [said(1, index, `${'x'.repeat(CORPUS_CACHE_CHARS / 4)} 搜索框 SEARCH\n box`)]
    stored.push({ header: { id }, revision: 'first' })
  }
  const reads = []
  const releases = []
  const home = path.join(scratchHome, 'search-budget')
  const host = fakeHost(mod, { fenced: true, home, events, stored, reads, releases })
  const search = createSessionSearch(host.ctx)
  const before = performance.now()
  const cold = await search.search('搜索框')
  const coldMs = performance.now() - before
  const first = search.memory()
  check('the resident corpus and lowercased copies stay within separate budgets while the full directory is scanned',
    cold.scanned === stored.length && cold.sessions.length === stored.length && first.sessions < first.catalog
      && first.corpusChars <= CORPUS_CACHE_CHARS && first.lowerChars <= LOWER_CACHE_CHARS,
    JSON.stringify({ cold, memory: first }))
  const readCount = reads.length
  const started = performance.now()
  const [chinese, english] = await Promise.all([search.search('搜索框'), search.search('search box')])
  const warmMs = performance.now() - started
  check('evicted sessions remain searchable, concurrent searches preserve snippets and newest-hit order, and disk documents avoid new log reads',
    chinese.scanned === stored.length && english.scanned === stored.length && reads.length === readCount
      && chinese.sessions[0].sessionId === 'budget-5' && english.sessions.length === stored.length
      && english.sessions.every(hit => hit.snippet.slice(...hit.match) === 'SEARCH box'),
    JSON.stringify({ reads, memory: search.memory(), coldMs, warmMs }))
  events.oversized = [said(1, 100, `${'y'.repeat(CORPUS_CACHE_CHARS + 1)} 搜索框`)]
  stored.push({ header: { id: 'oversized' }, revision: 'first' })
  // The listing throttle is part of the palette's prewarm contract.
  await new Promise(resolve => setTimeout(resolve, 2100))
  await search.warm()
  const oversized = await search.search('搜索框')
  check('a session larger than the entire corpus budget is still searched and leaves no oversized resident text',
    oversized.scanned === stored.length && oversized.sessions[0].sessionId === 'oversized'
      && search.memory().corpusChars <= CORPUS_CACHE_CHARS && search.memory().lowerChars <= LOWER_CACHE_CHARS,
    JSON.stringify({ scanned: oversized.scanned, memory: search.memory() }))
  search.dispose()
  check('dispose releases all resident text and directory entries',
    same(search.memory(), { corpusChars: 0, lowerChars: 0, sessions: 0, catalog: 0 }), JSON.stringify(search.memory()))
  const restored = createSessionSearch(host.ctx)
  const restoreReads = reads.length
  await restored.search('搜索框')
  check('a new instance reconstructs evicted corpora from their disk documents', reads.length === restoreReads, JSON.stringify(reads))
  stored.shift()
  stored[0].revision = 'second'
  events['budget-1'] = [said(2, 200, '修订后的内容')]
  await new Promise(resolve => setTimeout(resolve, 2100))
  await restored.warm()
  const revised = await restored.search('修订后的内容')
  const remaining = await restored.search('搜索框')
  check('deletions and moved revisions affect the complete directory after eviction',
    revised.sessions[0]?.sessionId === 'budget-1' && remaining.scanned === stored.length
      && remaining.sessions.every(hit => hit.sessionId !== 'budget-0' && hit.sessionId !== 'budget-1'),
    JSON.stringify({ revised, scanned: remaining.scanned }))
  restored.dispose()
  let cancelled
  const interrupted = fakeHost(mod, {
    fenced: true, home: path.join(home, 'interrupted'), events, stored,
    onRead() { cancelled.dispose() }, releases,
  })
  cancelled = createSessionSearch(interrupted.ctx)
  const stopped = await cancelled.search('搜索框')
  check('a log arriving after disposal cannot publish a hit or restore retained text',
    stopped.sessions.length === 0 && same(cancelled.memory(), { corpusChars: 0, lowerChars: 0, sessions: 0, catalog: 0 }),
    JSON.stringify({ stopped, memory: cancelled.memory() }))
  const broken = { 'budget-1': 'UNEXPECTED_READ_FAILURE' }
  const failing = fakeHost(mod, { fenced: true, home: path.join(home, 'failure'), events, stored, broken })
  const recovered = createSessionSearch(failing.ctx)
  let rejected = false
  try { await recovered.search('搜索框') } catch (error) {
    // The host boundary deliberately refuses this read; the failure must reach its caller (D12).
    rejected = error.code === 'UNEXPECTED_READ_FAILURE'
  }
  delete broken['budget-1']
  const retry = await recovered.search('搜索框')
  check('a failed read rejects its own search and releases the following search',
    rejected && retry.scanned === stored.length, JSON.stringify({ rejected, scanned: retry.scanned }))
  recovered.dispose()
  console.log(`  search budget — UTF-16 units: ${JSON.stringify(first)}, limits ${CORPUS_CACHE_CHARS}/${LOWER_CACHE_CHARS}; cold ${coldMs.toFixed(1)} ms, two warm searches ${warmMs.toFixed(1)} ms`)
}
