/**
 * The smoke's usage roll-up, in Node: the cost-meter ledger merged with the
 * fold over the stored logs by date, and the record that outlives them
 */
'use strict'
const fs = require('fs')
const path = require('path')
const { ROOT, same, check } = require('./shared.cjs')

/**
 * Run the usage checks against a scratch harness home.
 *
 * @param options.mod - the host-half module (lib/host/index.js).
 * @param options.fakeHost - the fake cordis context (host-half.cjs).
 * @param options.request - one request through a registered route (host-half.cjs).
 * @param options.browser - the headers of a same-origin loopback page.
 * @param options.scratchHome - the scratch harness home the checks read and write.
 * @param options.scratchCwd - the stored-session project directory inside it.
 */
async function hostUsage({ mod, fakeHost, request, browser, scratchHome, scratchCwd }) {
  // A ledger that stopped writing yesterday, and one stored log that settled on
  // one of its days and on today: the ledger's per-day `byProviderModel` becomes
  // the day's per-model map, one model served by two providers is one cell, and a
  // key without a provider prefix is the model itself. A day the ledger knows
  // stays the ledger's (the log's settlement on it is not added); today, past the
  // ledger's newest day, is the fold's whole day, with its model split, its
  // session and its hours.
  console.log('\nhost half — usage roll-up from the cost-meter ledger and the fold')
  const USAGE = '/dsh-claude-style/usage'
  const now = new Date()
  const at = (dayOffset, hour) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, 10)
  const localDay = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const today = localDay(at(0, 15))
  const yesterday = localDay(at(-1, 9))
  const dayBefore = localDay(at(-2, 9))
  fs.rmSync(scratchHome, { recursive: true, force: true })
  fs.mkdirSync(path.join(scratchHome, 'storages', 'cost-meter'), { recursive: true })
  const cell = (input, output) => ({ input, output, cacheRead: 0, cacheWrite: 0, calls: 1 })
  fs.writeFileSync(path.join(scratchHome, 'storages', 'cost-meter', 'ledger.json'), JSON.stringify({
    version: 1,
    days: {
      [yesterday]: {
        input: 700, output: 70, cacheRead: 0, cacheWrite: 0, calls: 3,
        sessions: [{ id: 'ledger-1' }, { id: 'ledger-2' }],
        byProviderModel: { 'alpha:model-a': cell(300, 30), 'beta:model-a': cell(200, 20), 'model-b': cell(200, 20) },
      },
      [dayBefore]: {
        input: 100, output: 10, cacheRead: 0, cacheWrite: 0, calls: 1,
        sessions: [{ id: 'ledger-1' }],
        byProviderModel: { 'alpha:model-b': cell(100, 10) },
      },
    },
  }))
  fs.mkdirSync(path.join(scratchCwd, 's1'), { recursive: true })
  fs.writeFileSync(path.join(scratchCwd, 's1', 'session.v4.jsonl.zstd'), 'x')
  const settlement = (date, turn) => ({
    type: 'assistant/message',
    time: date.getTime(),
    data: { turn, step: 0, usage: { inputTokens: 10, outputTokens: 1 }, message: { source: { model: 'model-b' } } },
  })
  /** Poll the usage route until the pass that is running has settled. */
  const settledUsage = async (host) => {
    let answer = { status: 0 }
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const reply = await request(host, USAGE, 'GET', '', browser)
      answer = reply.status === 200 ? JSON.parse(reply.body) : { status: reply.status }
      if (answer.value !== undefined && answer.value !== null && answer.computing !== true) break
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    return answer
  }
  const usageReads = []
  const usageListings = []
  const usageReleases = []
  const usageHost = fakeHost(mod, {
    fenced: true,
    home: scratchHome,
    events: { s1: [settlement(at(-1, 9), 1), settlement(at(0, 15), 2)] },
    reads: usageReads,
    listCalls: usageListings,
    releases: usageReleases,
  })
  let usage = null
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const answer = await request(usageHost, USAGE, 'GET', '', browser)
    usage = answer.status === 200 ? JSON.parse(answer.body) : { status: answer.status }
    if (usage.value !== undefined && usage.value !== null && usage.computing !== true) break
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  const value = usage?.value ?? {}
  const days = Array.isArray(value.days) ? value.days : []
  // A pass over a corpus costs one observation per changed session and no
  // listing of the stored corpus: a read that walked the whole archive first
  // would grow with the square of the changed sessions.
  check('no changed log is read through a whole stored-corpus listing',
    usageListings.length === 0, JSON.stringify({ usageListings, usageReads }))
  check('every changed log is still read, by id, and its lease released',
    same(usageReads, ['s1']) && same(usageReleases, ['s1']), JSON.stringify({ usageReads, usageReleases }))
  check('the ledger and the fold merge by date, the sessions are their union',
    value.source === 'cost-meter+local' && value.totals?.sessions === 3 && value.totals?.activeDays === 3 &&
      value.totals?.input === 810 && value.totals?.output === 81,
    JSON.stringify({ source: value.source, totals: value.totals }))
  check("each ledger day carries its per-model tokens, providers merged, the fold's settlement not added",
    days.length === 3 && days[0].date === dayBefore && days[1].date === yesterday &&
      JSON.stringify(days[0].models) === JSON.stringify({ 'model-b': 110 }) &&
      JSON.stringify(days[1].models) === JSON.stringify({ 'model-a': 550, 'model-b': 220 }),
    JSON.stringify(days.map((day) => [day.date, day.models])))
  check("the day past the ledger is the fold's, with its model split and its session",
    days[2]?.date === today && JSON.stringify(days[2].models) === JSON.stringify({ 'model-b': 11 }) &&
      JSON.stringify(days[2].sessionIds) === JSON.stringify(['s1']) && days[2].sessions === 1,
    JSON.stringify(days[2]))
  check('the ranked models carry the input/output split across days',
    Array.isArray(value.models) && value.models.length === 2 &&
      value.models[0].id === 'model-a' && value.models[0].input === 500 && value.models[0].output === 50 &&
      value.models[1].id === 'model-b' && value.models[1].tokens === 341,
    JSON.stringify(value.models))
  const hourOf = (hours) => (Array.isArray(hours) ? hours.indexOf(1) : null)
  const sum = (hours) => hours.reduce((total, count) => total + count, 0)
  check('only the folded day has an hour histogram, and the whole one is its own',
    Array.isArray(value.hours) && value.hours[15] === 1 && sum(value.hours) === 1 &&
      days[0]?.hours === undefined && days[1]?.hours === undefined &&
      hourOf(days[2]?.hours) === 15 && sum(days[2].hours) === 1,
    JSON.stringify({ hours: value.hours, days: days.map((day) => [day.date, day.hours]) }))
  // A warm start is the case the size and modification time cache exists for:
  // every fingerprint still matches, so the pass folds nothing and pays no
  // corpus listing at all.
  const warmListings = []
  const warmReads = []
  const warmHost = fakeHost(mod, {
    fenced: true,
    home: scratchHome,
    events: { s1: [settlement(at(-1, 9), 1), settlement(at(0, 15), 2)] },
    reads: warmReads,
    listCalls: warmListings,
  })
  let warm = null
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const answer = await request(warmHost, USAGE, 'GET', '', browser)
    warm = answer.status === 200 ? JSON.parse(answer.body) : { status: answer.status }
    if (warm.value !== undefined && warm.value !== null && warm.computing !== true) break
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  check('a warm start re-reads and re-lists nothing: the fingerprint cache still skips unchanged logs',
    warm.value?.read === 0 && warm.value?.sessions === 1 && warmReads.length === 0 && warmListings.length === 0,
    JSON.stringify({ value: warm.value && { read: warm.value.read, sessions: warm.value.sessions }, warmReads, warmListings }))
  // The cache window is what the panel's own period works around: a read inside
  // it is served the finished roll-up as it stands, so the panel drawing a number
  // the reader has just earned waits for both this window and its next ask.
  const repeat = JSON.parse((await request(warmHost, USAGE, 'GET', '', browser)).body)
  check('a read right after another is served the same finished roll-up rather than folded again',
    repeat.computing === false && repeat.value?.computedAt === warm.value?.computedAt && warmReads.length === 0,
    JSON.stringify({ first: warm.value?.computedAt, repeat: repeat.value?.computedAt, reads: warmReads }))
  // A session whose log is gone keeps the days the record holds for it: they are
  // the only account of them left, so deleting the conversation no longer takes
  // its tokens off the panel Nothing is folded again, and the entry loses
  // the fingerprint that described the log it no longer has.
  fs.rmSync(path.join(scratchCwd, 's1'), { recursive: true, force: true })
  const keptReads = []
  const keptHost = fakeHost(mod, {
    fenced: true,
    home: scratchHome,
    events: { s1: [settlement(at(-1, 9), 1), settlement(at(0, 15), 2)] },
    reads: keptReads,
  })
  let kept = null
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const answer = await request(keptHost, USAGE, 'GET', '', browser)
    kept = answer.status === 200 ? JSON.parse(answer.body) : { status: answer.status }
    if (kept.value !== undefined && kept.value !== null && kept.computing !== true) break
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  const keptDays = Array.isArray(kept.value?.days) ? kept.value.days : []
  check('a session whose log is gone keeps its day: the tokens, the model split and its id stay on the panel',
    kept.value?.read === 0 && keptReads.length === 0 && kept.value?.totals?.input === 810 &&
      kept.value?.totals?.sessions === 3 && keptDays.length === 3 && keptDays[2]?.date === today &&
      JSON.stringify(keptDays[2].models) === JSON.stringify({ 'model-b': 11 }) &&
      JSON.stringify(keptDays[2].sessionIds) === JSON.stringify(['s1']),
    JSON.stringify({ value: kept.value && { read: kept.value.read, totals: kept.value.totals }, keptDays, keptReads }))
  const keptRecord = JSON.parse(fs.readFileSync(path.join(scratchHome, 'dsh-claude-style', 'usage.json'), 'utf8'))
  const keptDay = keptRecord.sessions?.s1?.days?.[today]
  check('the record carries a day as its route cells and settled hours alone, and a log-less session without a fingerprint',
    keptRecord.version === 1 && keptRecord.sessions?.s1?.size === undefined && keptRecord.sessions?.s1?.hours === undefined &&
      JSON.stringify(keptDay?.m) === JSON.stringify({ 'model-b': [10, 1, 0, 0, 1] }) &&
      JSON.stringify(keptDay?.h) === JSON.stringify({ '15': 1 }),
    JSON.stringify({ version: keptRecord.version, s1: keptRecord.sessions?.s1 }))
  fs.rmSync(scratchHome, { recursive: true, force: true })

  // The fold cache this record replaced is migrated where the record does not
  // exist yet, so the days of the sessions deleted before it come across
  console.log('\nhost half — the previous fold cache is migrated into the record')
  {
    const home = path.join(ROOT, '.debug', 'smoke-home-usage-migrate')
    fs.rmSync(home, { recursive: true, force: true })
    const day = localDay(at(-3, 11))
    const slots = new Array(24).fill(0)
    slots[11] = 1
    fs.mkdirSync(path.join(home, 'cache', 'dsh-claude-style'), { recursive: true })
    fs.writeFileSync(path.join(home, 'cache', 'dsh-claude-style', 'usage.json'), JSON.stringify({
      version: 4,
      computedAt: 1,
      sessions: {
        'gone-1': {
          size: 12,
          mtimeMs: 34,
          days: { [day]: { input: 60, output: 6, cacheRead: 0, cacheWrite: 0, calls: 1, hours: slots, models: { 'model-c': { input: 60, output: 6, cacheRead: 0, cacheWrite: 0, calls: 1 } } } },
          hours: slots,
        },
      },
    }))
    const migrated = (await settledUsage(fakeHost(mod, { fenced: true, home }))).value ?? {}
    const migrateDays = Array.isArray(migrated.days) ? migrated.days : []
    check('the previous fold cache is migrated: its day answers the panel, its hours included',
      migrated.source === 'local' && migrateDays.length === 1 && migrateDays[0].date === day &&
        migrated.totals?.input === 60 && migrated.totals?.sessions === 1 && migrated.hours?.[11] === 1 &&
        JSON.stringify(migrateDays[0].sessionIds) === JSON.stringify(['gone-1']),
      JSON.stringify({ source: migrated.source, totals: migrated.totals, days: migrateDays }))
    const record = JSON.parse(fs.readFileSync(path.join(home, 'dsh-claude-style', 'usage.json'), 'utf8'))
    const writtenDay = record.sessions?.['gone-1']?.days?.[day]
    check('the migrated record holds the same day in the record\'s own shape, against no log at all',
      record.version === 1 && record.sessions?.['gone-1']?.size === undefined &&
        JSON.stringify(writtenDay?.m) === JSON.stringify({ 'model-c': [60, 6, 0, 0, 1] }) &&
        JSON.stringify(writtenDay?.h) === JSON.stringify({ '11': 1 }),
      JSON.stringify(record))
    check('the previous fold cache is removed once the record holding its days is written',
      !fs.existsSync(path.join(home, 'cache', 'dsh-claude-style', 'usage.json')),
      JSON.stringify(fs.readdirSync(path.join(home, 'cache', 'dsh-claude-style'))))
    fs.rmSync(home, { recursive: true, force: true })
  }

  // A record that does not parse may be the only place the days of deleted
  // sessions are left, so it is moved aside before the pass rebuilds it
  console.log('\nhost half — an unreadable record is moved aside before it is rebuilt')
  {
    const home = path.join(ROOT, '.debug', 'smoke-home-usage-corrupt')
    fs.rmSync(home, { recursive: true, force: true })
    const cwd = path.join(home, 'sessions', '--D-smoke--')
    fs.mkdirSync(path.join(cwd, 'r1'), { recursive: true })
    fs.writeFileSync(path.join(cwd, 'r1', 'session.v4.jsonl.zstd'), 'x')
    fs.mkdirSync(path.join(home, 'dsh-claude-style'), { recursive: true })
    fs.writeFileSync(path.join(home, 'dsh-claude-style', 'usage.json'), '{"version":1,"sessions":{')
    const rebuilt = (await settledUsage(fakeHost(mod, { fenced: true, home, events: { r1: [settlement(at(0, 15), 1)] } }))).value ?? {}
    const names = fs.readdirSync(path.join(home, 'dsh-claude-style'))
    const aside = names.find((name) => /^usage\.json\.corrupt-\d+$/.test(name))
    const record = JSON.parse(fs.readFileSync(path.join(home, 'dsh-claude-style', 'usage.json'), 'utf8'))
    check('an unreadable record is kept under a stamped name and the record is rebuilt from the logs',
      aside !== undefined && fs.readFileSync(path.join(home, 'dsh-claude-style', aside), 'utf8') === '{"version":1,"sessions":{' &&
        record.version === 1 && record.sessions?.r1?.days !== undefined && rebuilt.totals?.input === 10,
      JSON.stringify({ names, totals: rebuilt.totals }))
    fs.rmSync(home, { recursive: true, force: true })
  }

  // Two instances under one harness home each write the whole record. A write
  // lays its pass over what the file holds by then, so a session another instance
  // wrote while this pass was folding stays in it
  console.log('\nhost half — a write keeps what another instance wrote during the pass')
  {
    const home = path.join(ROOT, '.debug', 'smoke-home-usage-concurrent')
    fs.rmSync(home, { recursive: true, force: true })
    const cwd = path.join(home, 'sessions', '--D-smoke--')
    fs.mkdirSync(path.join(cwd, 'c1'), { recursive: true })
    fs.writeFileSync(path.join(cwd, 'c1', 'session.v4.jsonl.zstd'), 'x')
    const day = localDay(at(-2, 9))
    // The other instance's write lands while this pass reads c1's log.
    const reads = {
      push: () => {
        fs.mkdirSync(path.join(home, 'dsh-claude-style'), { recursive: true })
        fs.writeFileSync(path.join(home, 'dsh-claude-style', 'usage.json'), JSON.stringify({
          version: 1,
          computedAt: 1,
          sessions: { 'other-gone': { days: { [day]: { m: { 'model-d': [40, 4, 0, 0, 1] }, h: { '9': 1 } } } } },
        }))
      },
    }
    const answer = (await settledUsage(fakeHost(mod, { fenced: true, home, events: { c1: [settlement(at(0, 15), 1)] }, reads }))).value ?? {}
    const record = JSON.parse(fs.readFileSync(path.join(home, 'dsh-claude-style', 'usage.json'), 'utf8'))
    check("a record written during the pass keeps the other instance's session beside this pass's own",
      record.sessions?.['other-gone']?.days?.[day] !== undefined && record.sessions?.c1?.size !== undefined &&
        answer.totals?.input === 50 && answer.totals?.sessions === 2,
      JSON.stringify({ record, totals: answer.totals }))
    fs.rmSync(home, { recursive: true, force: true })
  }

  // The fallback a host keeps when it publishes only the per-id read: the fold
  // still answers, reading each session through a corpus listing — the shape
  // this half had before the observation existed (D12).
  console.log('\nhost half — the log reader a host without the observation still answers')
  {
    const home = path.join(ROOT, '.debug', 'smoke-home-readsession')
    fs.rmSync(home, { recursive: true, force: true })
    const cwd = path.join(home, 'sessions', '--D-smoke--')
    fs.mkdirSync(path.join(cwd, 'f1'), { recursive: true })
    fs.writeFileSync(path.join(cwd, 'f1', 'session.v4.jsonl.zstd'), 'x')
    const readIds = []
    const listings = []
    const host = fakeHost(mod, {
      fenced: true,
      home,
      events: { f1: [settlement(at(0, 15), 1)] },
      reads: readIds,
      listCalls: listings,
      queryShapes: ['readSession'],
    })
    const answer = await settledUsage(host)
    check('a host offering only the per-id read still folds its sessions, through its own listing',
      same(readIds, ['f1']) && same(listings, ['f1']) && answer.value?.read === 1 &&
        answer.value?.failed === 0 && answer.value?.unavailable !== true,
      JSON.stringify({ readIds, listings, value: answer.value && { read: answer.value.read, failed: answer.value.failed } }))
    fs.rmSync(home, { recursive: true, force: true })
  }
}

module.exports = { hostUsage }
