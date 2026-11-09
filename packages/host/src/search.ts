/**
 * Message-content search for the browser half's search palette.
 *
 * The corpus is the reader's own messages and the model's answers, matched the
 * way the host's own `text` filter does: literal, case-insensitive, whitespace
 * flexible — the host's content index matches whitespace-delimited tokens only,
 * so part of a Chinese sentence never matches there, and it is off in the
 * shipped web composition anyway.
 *
 * `user/message` also carries injected context, which names itself in
 * `data.source.kind`, so only `user` counts. Each session's corpus is cached
 * beside a change token, so a warm start re-reads only what moved, and nothing
 * is built unless the palette asks for a search or a prewarm.
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
 * header, so only the palette's own prewarm asks for it and a repeat within this
 * window reuses the listing already held.
 */
const LIST_INTERVAL_MS = 2000
/** The corpus cache document's version: a document from another build is discarded. */
const CACHE_VERSION = 1
/**
 * Characters of lowercased text kept across sessions. A search reads every
 * corpus, so keeping all of them lowercased would double the memory the
 * corpora themselves take; the sessions a search just read stay at the end of
 * the table and are the last to go.
 */
const LOWER_CACHE_CHARS = 4_000_000

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

import { PACKAGE_NAME } from '@dsh-claude-style/contracts/package'
import { createHash } from 'node:crypto'
import type { DshContext } from '@dsh-claude-style/engine/node/dsh'
import { cachePath, readJsonDocument, writeJsonDocument } from './cache-file.js'
import { readEvents } from '@dsh-claude-style/engine/node/session-events'

/**
 * The query service's own text rule (dsh-session-query `compileSessionTextFilter`):
 * whitespace-separated parts, each escaped, joined by `\s+`, Unicode and
 * case-insensitive.
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
 * Whether one `user/message` carries the reader's own words: the harness records
 * the context it injects as user messages too, each naming itself in `source`.
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

/**
 * The search the palette's route serves.
 *
 * @param ctx - host plugin context.
 * @returns `{ search(query), warm(), dispose() }`.
 */
export function createSessionSearch(ctx: DshContext) {
  /** Session id → its corpus. */
  const cache = new Map<string, CachedSession>()
  /**
   * Lowercased message text per session, built by the first search that needs
   * it and dropped by the newest one when the table is full: keeping it for
   * every session doubled what the corpus itself holds.
   */
  const lower = new Map<string, string[]>()
  /** How many characters the lowercased table holds. */
  let lowerChars = 0
  /** When each session's cache file was last written, for the write throttle. */
  const writtenAt = new Map<string, number>()
  /** The catch-up in flight, shared by the searches that arrive meanwhile, and whether it lists the store. */
  let refreshing: Promise<void> | null = null
  let refreshingStore = false
  /** The stored sessions' id → revision, and when it was last listed. */
  let stored: Map<string, string> | null = null
  let listedAt = 0
  /** Set by dispose: a pass that outlives its routes must not write a cache file. */
  let disposed = false

  /**
   * The cache file for one session: its id hashed, because an id can carry `:`,
   * `/` or `..` and the entry has to stay one file inside this directory.
   */
  function cacheFile(sessionId: string) {
    return cachePath(ctx, 'search', `${createHash('sha256').update(sessionId).digest('hex')}.json`)
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
    // A corpus rebuilt after the routes left belongs to no page: it must not
    // write the cache file of a plugin that is no longer installed.
    if (disposed) return
    cache.set(sessionId, entry)
    // The lowercased copy is built by the search that needs it: a session no
    // query reaches never holds a second copy of its text.
    forgetLower(sessionId)
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

  /** Drop one session's lowercased copy, with its characters from the table's count. */
  function forgetLower(sessionId: string) {
    const held = lower.get(sessionId)
    if (held === undefined) return
    for (const text of held) lowerChars -= text.length
    lower.delete(sessionId)
  }

  /**
   * One session's lowercased text, built the first time a search reads it and
   * moved to the end of the table on every later read. A corpus larger than
   * the whole table is answered for this query alone: it would evict every
   * other session and be rebuilt on the next one.
   */
  function loweredFor(sessionId: string, entry: CachedSession) {
    const held = lower.get(sessionId)
    if (held !== undefined) {
      lower.delete(sessionId)
      lower.set(sessionId, held)
      return held
    }
    const texts = entry.messages.map(message => message.text.toLowerCase())
    let size = 0
    for (const text of texts) size += text.length
    if (size > LOWER_CACHE_CHARS) return texts
    while (lowerChars + size > LOWER_CACHE_CHARS && lower.size > 0) {
      const oldest = lower.keys().next().value
      if (oldest === undefined) break
      forgetLower(oldest)
    }
    lower.set(sessionId, texts)
    lowerChars += size
    return texts
  }

  /** Drop one session's corpus from memory and from disk. */
  function forget(sessionId: string) {
    if (disposed) return
    cache.delete(sessionId)
    forgetLower(sessionId)
    writtenAt.delete(sessionId)
    writeJsonDocument(ctx, cacheFile(sessionId), 'session search cache', null)
  }

  /** Fold one session's complete log into a corpus. */
  async function rebuild(sessionId: string, revision: string) {
    const events = await readEvents<LogEvent>(ctx, PACKAGE_NAME, sessionId, 'content search')
    if (disposed) return
    // A null is a log the host would not hand back this pass: adopt nothing, so
    // the entry already held stands and the next pass retries, rather than an
    // empty corpus frozen at the current revision.
    if (events === null) return
    // The next seq to read, off the log itself: a fold that stopped at the last
    // message would re-read the events after it on every live tail read.
    const last = events[events.length - 1]
    const lastSeq = typeof last?.seq === 'number' ? last.seq + 1 : 0
    adopt(sessionId, { revision, lastSeq, messages: messagesOf(events) }, false)
  }

  /**
   * Bring the corpus level with the host. `store` is what the caller needs: a
   * search over stored sessions lists them, a tail-only pass leaves the listing
   * alone.
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
    // Each stale session is read by id, which costs one log open per session and
    // no listing of the stored corpus, so a handful run at once.
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
    const pass = refresh(store)
    // Only the pass that is still current clears the shared state: a store
    // listing replaces a tail-only pass, whose end must not admit a third one.
    const done = pass.finally(() => {
      if (refreshing === done) {
        refreshing = null
        refreshingStore = false
      }
    })
    refreshing = done
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
      // A multi-part query reads the corpus itself through the regex: the
      // lowercased copy is what one part is matched on, and it is built only
      // for the sessions a one-part query reaches.
      const lowered = single === '' ? [] : loweredFor(sessionId, entry)
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

  /**
   * Drop the corpora with the routes that serve them: a reloaded plugin builds a
   * fresh one from the cache files.
   */
  function dispose() {
    disposed = true
    cache.clear()
    lower.clear()
    lowerChars = 0
    writtenAt.clear()
    stored = null
    refreshing = null
  }

  return { search, warm: () => catchUp(true), dispose }
}
