/**
 * Message-content search for the browser half's search palette.
 *
 * What is searchable is the conversation itself: the messages the reader sent
 * and the text the model answered with. Injected context arrives as
 * `user/message` too — environment snapshots, the Skill catalog, AGENTS.md and
 * compaction checkpoints — and carries a `data.source.kind` other than `user`,
 * so it is left out; reasoning blocks and tool calls and results are other block
 * and event types and never enter the corpus.
 *
 * Reading. The host's own content index (`@deepseek-ai/dsh-session-query-sqlite`)
 * is off in the shipped web composition (`openAt: never`), and its `unicode61`
 * tokenizer matches whitespace-delimited tokens only, so part of a Chinese
 * sentence never matches there. This search reads history through the host's
 * query service instead and matches the way the service's own `text` filter
 * does — a literal, case-insensitive, whitespace-flexible scan.
 *
 * Caching. Each session's corpus is kept in memory and in
 * `$DSH_HOME/cache/dsh-claude-style/search/<sessionId>.json` beside a change
 * token: the persistence revision for a stored log, the log length for a session
 * the host holds open. A warm start reads those files and re-reads only the
 * sessions whose token moved; a session the host holds open contributes only the
 * events appended since the last fold, because its log is in memory. The first
 * search on a machine with no cache reads every top-level session once.
 *
 * Everything here runs only while the reader has the search box switched on:
 * the route is called by the palette alone, so a corpus is never built for a
 * reader who does not search.
 *
 * @param ctx - host plugin context.
 * @returns `{ search(query), warm() }`.
 */

/** Stored logs read at once while the cache catches up. */
const READ_CONCURRENCY = 4
/** Sessions the answer lists, newest hit first. */
const SESSION_LIMIT = 40
/** Characters of context kept before the match in a snippet; the snippet runs to SNIPPET_CHARS. */
const SNIPPET_LEAD = 36
const SNIPPET_CHARS = 140
/** Longest query accepted, in characters. */
export const QUERY_MAX = 200
/** A session's cache file is rewritten at most this often while its log grows. */
const CACHE_WRITE_INTERVAL_MS = 5000
/**
 * How often the stored sessions may be listed. Listing opens every stored log's
 * header, which costs about a second across a few hundred sessions, so only the
 * palette's own prewarm asks for it and a repeat within this window reuses the
 * listing already held; a content query never lists at all.
 */
const LIST_INTERVAL_MS = 2000
/** The corpus cache document's version: a document from another build is discarded. */
const CACHE_VERSION = 1

/**
 * The host services this module reads, and the shapes it keeps between reads.
 * The host ships no types for them, so each is declared with the members the
 * reader touches.
 */
interface LogEvent {
  type: string
  seq: number
  time: number
  data?: {
    content?: ContentBlock[]
    message?: { content?: ContentBlock[] }
    /** Who sent a `user/message`: the reader (`user`), or the harness itself. */
    source?: { kind?: string }
  }
}

/** One block of a message's content; only text blocks carry searchable text. */
interface ContentBlock {
  type: string
  text?: string
}

/** The persistence service: one snapshot per stored session, with its revision. */
interface PersistenceService {
  list(): Promise<{ header: { id: string, origin?: string }, revision: string | number }[]>
}

/** One live session, as far as the tail read needs it. */
interface LiveSession {
  id: string
  seq: number
  header: { origin?: string }
  snapshotEvents(fromSeq?: number, toSeqExclusive?: number): readonly LogEvent[]
}

/** The sessions service: the sessions the host holds open right now. */
interface SessionsService {
  list(): LiveSession[]
}

/** One searchable message. */
interface SearchMessage {
  seq: number
  time: number
  role: 'user' | 'assistant'
  text: string
}

/** One cached session: the token it was read at, how far its log was folded, and its messages. */
interface CachedSession {
  /** The stored log's revision the corpus was rebuilt from; '' for a live-only fold. */
  revision: string
  /** The last seq folded in: a live session reads on from here. */
  lastSeq: number
  messages: SearchMessage[]
}

import type { DshContext } from './dsh.ts'
import { cachePath, readJsonDocument, writeJsonDocument } from './cache-file.js'
import { readEvents } from './session-events.js'

/**
 * The query service's own text rule (dsh-session-query `compileSessionTextFilter`):
 * whitespace-separated parts, each escaped, joined by `\s+`, Unicode and
 * case-insensitive. A one-part query takes the `indexOf` path in `search()`,
 * which says the same thing for one part.
 */
function compileQuery(query: string) {
  const pattern = query
    .trim()
    .split(/\s+/u)
    .map(part => part.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'))
    .join('\\s+')
  return new RegExp(pattern, 'iu')
}

/** The text blocks of one message's content, joined by newlines. */
function messageText(content: ContentBlock[]) {
  const parts: string[] = []
  for (const block of content) {
    if (block.type === 'text' && typeof block.text === 'string' && block.text.trim() !== '') parts.push(block.text)
  }
  return parts.join('\n')
}

/**
 * Whether one `user/message` carries the reader's own words. The harness records
 * the context it injects as user messages too — environment snapshots, the Skill
 * catalog, AGENTS.md, compaction checkpoints — each naming itself in `source`.
 */
function isHumanMessage(event: LogEvent) {
  return event.data?.source?.kind === 'user'
}

/** The reader's messages and the model's answers in one run of events, as `{ seq, time, role, text }`. */
function messagesOf(events: readonly LogEvent[]) {
  const messages: SearchMessage[] = []
  for (const event of events) {
    let text = ''
    if (event.type === 'user/message') {
      if (!isHumanMessage(event)) continue
      text = messageText(event.data?.content ?? [])
    } else if (event.type === 'assistant/message') {
      text = messageText(event.data?.message?.content ?? [])
    } else continue
    if (typeof event.seq !== 'number' || typeof event.time !== 'number') continue
    if (text !== '') messages.push({ seq: event.seq, time: event.time, role: event.type === 'user/message' ? 'user' : 'assistant', text })
  }
  return messages
}

/** One line of context around the match: whitespace collapsed, ellipses where cut. */
function snippetOf(text: string, index: number, length: number) {
  const start = Math.max(0, index - SNIPPET_LEAD)
  const end = Math.min(text.length, Math.max(start + SNIPPET_CHARS, index + length))
  const flat = (value: string) => value.replace(/\s+/gu, ' ')
  const head = `${start > 0 ? '…' : ''}${flat(text.slice(start, index)).trimStart()}`
  const match = flat(text.slice(index, index + length))
  const tail = `${flat(text.slice(index + length, end)).trimEnd()}${end < text.length ? '…' : ''}`
  const span: [number, number] = [head.length, head.length + match.length]
  return { snippet: head + match + tail, match: span }
}

/** One message as a cache document stores it. */
function isStoredMessage(value: unknown): value is SearchMessage {
  if (value === null || typeof value !== 'object') return false
  const message = value as { seq?: unknown, time?: unknown, role?: unknown, text?: unknown }
  return Number.isFinite(message.seq) && Number.isFinite(message.time)
    && (message.role === 'user' || message.role === 'assistant')
    && typeof message.text === 'string'
}

export function createSessionSearch(ctx: DshContext) {
  /** Session id → its corpus. */
  const cache = new Map<string, CachedSession>()
  /** Lowercased message text per session, built with the corpus and dropped with it. */
  const lower = new Map<string, string[]>()
  /** When each session's cache file was last written, for the write throttle. */
  const writtenAt = new Map<string, number>()
  /** The catch-up in flight, shared by the searches that arrive meanwhile, and whether it lists the store. */
  let refreshing: Promise<void> | null = null
  let refreshingStore = false
  /** The stored sessions' id → revision, and when it was last listed. */
  let stored: Map<string, string> | null = null
  let listedAt = 0

  function cacheFile(sessionId: string) {
    return cachePath(ctx, 'search', `${sessionId}.json`)
  }

  /** One session's corpus from its cache file, or null when there is none this build can read. */
  function readCached(sessionId: string): CachedSession | null {
    const parsed = readJsonDocument(ctx, cacheFile(sessionId), 'session search cache')
    if (parsed === null || typeof parsed !== 'object') return null
    const document = parsed as { version?: unknown, revision?: unknown, lastSeq?: unknown, messages?: unknown }
    if (document.version !== CACHE_VERSION) return null
    if (typeof document.revision !== 'string' || !Number.isFinite(document.lastSeq)) return null
    if (!Array.isArray(document.messages)) return null
    const messages: SearchMessage[] = []
    for (const value of document.messages) {
      if (!isStoredMessage(value)) return null
      messages.push({ seq: Number(value.seq), time: Number(value.time), role: value.role, text: value.text })
    }
    return { revision: document.revision, lastSeq: Number(document.lastSeq), messages }
  }

  /** Hold one session's corpus in memory and, at the write interval, on disk. */
  function adopt(sessionId: string, entry: CachedSession, force: boolean) {
    cache.set(sessionId, entry)
    lower.set(sessionId, entry.messages.map(message => message.text.toLowerCase()))
    const now = Date.now()
    if (!force && now - (writtenAt.get(sessionId) ?? 0) < CACHE_WRITE_INTERVAL_MS) return
    writtenAt.set(sessionId, now)
    writeJsonDocument(ctx, cacheFile(sessionId), 'session search cache', {
      version: CACHE_VERSION,
      revision: entry.revision,
      lastSeq: entry.lastSeq,
      messages: entry.messages,
    })
  }

  /** Drop one session's corpus from memory and from disk. */
  function forget(sessionId: string) {
    cache.delete(sessionId)
    lower.delete(sessionId)
    writtenAt.delete(sessionId)
    writeJsonDocument(ctx, cacheFile(sessionId), 'session search cache', null)
  }

  /** Fold one session's complete log into a corpus. */
  async function rebuild(sessionId: string, revision: string) {
    const events = await readEvents<LogEvent>(ctx, sessionId, 'content search')
    const messages = events === null ? [] : messagesOf(events)
    // The next seq to read, off the log itself: a fold that stopped at the last
    // message would re-read the events after it on every live tail read.
    const last = events === null ? undefined : events[events.length - 1]
    const lastSeq = typeof last?.seq === 'number' ? last.seq + 1 : 0
    adopt(sessionId, { revision, lastSeq, messages }, false)
  }

  /**
   * Bring the corpus level with the host. `store` is what the caller needs: a
   * search over stored sessions lists them, a search that only wants the newest
   * tail leaves the listing alone (it costs about a second across a few hundred
   * sessions and only the palette's own prewarm pays it).
   */
  async function refresh(store: boolean) {
    const persistence = ctx.get('sessionPersistence') as PersistenceService | null | undefined
    const sessions = ctx.get('sessions') as SessionsService | null | undefined
    if (!persistence || !sessions) throw new Error('the host exposes no session persistence or session service')
    if (store && (stored === null || Date.now() - listedAt >= LIST_INTERVAL_MS)) {
      const listing = new Map<string, string>()
      for (const snapshot of await persistence.list()) {
        if (snapshot.header.origin === 'subagent') continue
        listing.set(snapshot.header.id, String(snapshot.revision))
      }
      stored = listing
      listedAt = Date.now()
    }
    if (stored === null) return
    const live = new Map<string, LiveSession>()
    for (const session of sessions.list()) {
      if (session.header?.origin !== 'subagent') live.set(session.id, session)
    }
    const wanted = new Map<string, { revision: string, live: LiveSession | null }>()
    for (const [id, revision] of stored) {
      const held = live.get(id) ?? null
      // A session the host holds open grows in memory ahead of its file: the
      // live log is what it contributes, so its stored revision is not read.
      wanted.set(id, { revision: held === null ? revision : '', live: held })
    }
    for (const [id, session] of live) {
      if (!wanted.has(id)) wanted.set(id, { revision: '', live: session })
    }
    for (const id of [...cache.keys()]) {
      if (!wanted.has(id)) forget(id)
    }
    const stale: string[] = []
    for (const [id, want] of wanted) {
      const entry = cache.get(id) ?? readCached(id)
      if (entry === null) {
        stale.push(id)
        continue
      }
      cache.set(id, entry)
      if (!lower.has(id)) lower.set(id, entry.messages.map(message => message.text.toLowerCase()))
      if (want.live !== null) {
        if (entry.lastSeq > want.live.seq) stale.push(id)
        else if (entry.lastSeq < want.live.seq) {
          // A live log only appends, so everything from `lastSeq` on is new.
          const tail = messagesOf(want.live.snapshotEvents(entry.lastSeq))
          entry.messages = entry.messages.concat(tail)
          entry.lastSeq = want.live.seq
          adopt(id, entry, false)
        }
        continue
      }
      if (entry.revision !== want.revision) stale.push(id)
    }
    let next = 0
    const worker = async () => {
      while (next < stale.length) {
        const id = stale[next++]
        const want = wanted.get(id)
        if (want !== undefined) await rebuild(id, want.revision)
      }
    }
    const workers: Promise<void>[] = []
    for (let i = 0; i < READ_CONCURRENCY; i++) workers.push(worker())
    await Promise.all(workers)
  }

  function catchUp(store: boolean) {
    // A store listing supersedes a tail-only pass already in flight; the other
    // way round, a search waits for the pass that is running.
    if (refreshing !== null && (refreshingStore || !store)) return refreshing
    refreshingStore = store
    refreshing = refresh(store).finally(() => {
      refreshing = null
      refreshingStore = false
    })
    return refreshing
  }

  /**
   * Sessions whose messages hold the query, newest hit first, each with its
   * newest hit: `{ sessions: [{ sessionId, seq, time, role, snippet, match }], scanned }`.
   */
  async function search(text: string) {
    // Nothing listed yet means no corpus at all: the first search reads the
    // store itself; later ones read the running sessions' new tails only.
    await catchUp(stored === null)
    const query = text.trim()
    const parts = query.split(/\s+/u)
    const single = parts.length === 1 ? parts[0].toLowerCase() : ''
    const pattern = single === '' ? compileQuery(query) : null
    const hits: { sessionId: string, seq: number, time: number, role: string, snippet: string, match: [number, number] }[] = []
    for (const [sessionId, entry] of cache) {
      const lowered = lower.get(sessionId) ?? []
      for (let i = entry.messages.length - 1; i >= 0; i--) {
        const message = entry.messages[i]
        // One part is the common case, and a substring search over the
        // lowercased text says exactly what the regex says for one part.
        const found = single === '' ? pattern!.exec(message.text) : null
        const index = single === '' ? found?.index ?? -1 : (lowered[i] ?? message.text.toLowerCase()).indexOf(single)
        if (index < 0) continue
        const length = single === '' ? found![0].length : single.length
        hits.push({ sessionId, seq: message.seq, time: message.time, role: message.role, ...snippetOf(message.text, index, length) })
        break
      }
    }
    hits.sort((a, b) => b.time - a.time)
    return { sessions: hits.slice(0, SESSION_LIMIT), scanned: cache.size }
  }

  return { search, warm: () => catchUp(true) }
}
