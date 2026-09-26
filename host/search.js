/**
 * Message-content search for the browser half's search palette.
 *
 * The host's own content index (`@deepseek-ai/dsh-session-query-sqlite`) is
 * off in the shipped web composition (`openAt: never`), and where it is on its
 * `unicode61` tokenizer matches whole tokens only: a run of Chinese text with
 * no spaces is a single token, so part of a Chinese sentence never matches.
 * This search reads history through the host's query service instead and
 * matches the way the service's own `text` filter does — a literal,
 * case-insensitive, whitespace-flexible scan — over the text blocks of user
 * and assistant messages.
 *
 * Every session's message text is kept in memory beside a change token: the
 * persistence backend's revision (`sessionPersistence.list()`, a file stat for
 * JSONL), or the log length for a session the host holds open, whose log grows
 * in memory ahead of its file. A search re-reads only the sessions whose token
 * moved; the first search after start reads every top-level session once.
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

/**
 * The query service's own text rule (dsh-session-query `compileSessionTextFilter`):
 * whitespace-separated parts, each escaped, joined by `\s+`, Unicode and
 * case-insensitive.
 */
function compileQuery(query) {
  const pattern = query
    .trim()
    .split(/\s+/u)
    .map(part => part.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'))
    .join('\\s+')
  return new RegExp(pattern, 'iu')
}

/** The text blocks of one message's content, joined by newlines. */
function messageText(content) {
  const parts = []
  for (const block of content) {
    if (block.type === 'text' && block.text.trim() !== '') parts.push(block.text)
  }
  return parts.join('\n')
}

/** User and assistant messages of one raw log that carry text, as `{ seq, time, role, text }`. */
function messagesOf(events) {
  const messages = []
  for (const event of events) {
    let text = ''
    if (event.type === 'user/message') text = messageText(event.data.content)
    else if (event.type === 'assistant/message') text = messageText(event.data.message.content)
    else continue
    if (text !== '') messages.push({ seq: event.seq, time: event.time, role: event.type === 'user/message' ? 'user' : 'assistant', text })
  }
  return messages
}

/** One line of context around the match: whitespace collapsed, ellipses where cut. */
function snippetOf(text, index, length) {
  const start = Math.max(0, index - SNIPPET_LEAD)
  const end = Math.min(text.length, Math.max(start + SNIPPET_CHARS, index + length))
  const flat = (value) => value.replace(/\s+/gu, ' ')
  const head = `${start > 0 ? '…' : ''}${flat(text.slice(start, index)).trimStart()}`
  const match = flat(text.slice(index, index + length))
  const tail = `${flat(text.slice(index + length, end)).trimEnd()}${end < text.length ? '…' : ''}`
  return { snippet: head + match + tail, match: [head.length, head.length + match.length] }
}

export function createSessionSearch(ctx) {
  /** Session id → { revision, messages }; `revision` is `stored:<revision>` or `live:<log length>`. */
  const cache = new Map()
  /** The catch-up in flight, shared by the searches that arrive meanwhile. */
  let refreshing = null

  /**
   * One session's messages. The query service throws to say a stored log is
   * unreadable or went away between the listing and the read; that session
   * then holds nothing until its change token moves again, and the rest of
   * the history stays searchable (docs/architecture.md D12).
   */
  async function readMessages(query, sessionId) {
    try {
      const log = await query.readSession(sessionId)
      return messagesOf(log.events)
    } catch (error) {
      if (error?.code !== 'SESSION_QUERY_CORRUPT_SESSION' && error?.code !== 'SESSION_QUERY_SESSION_NOT_FOUND') throw error
      ctx.logger?.warn?.(`dsh-claude-style: session ${sessionId} left out of content search: ${error.message}`)
      return []
    }
  }

  /** Bring the cache level with the store and the live set. */
  async function refresh() {
    const query = ctx.get('sessionQuery')
    const persistence = ctx.get('sessionPersistence')
    const sessions = ctx.get('sessions')
    if (!query || !persistence || !sessions) throw new Error('the host exposes no session query, persistence or session service')
    const wanted = new Map()
    for (const snapshot of await persistence.list()) {
      if (snapshot.header.origin !== 'subagent') wanted.set(snapshot.header.id, `stored:${snapshot.revision}`)
    }
    // A session the host holds open grows in memory ahead of its file; its log
    // length (`seq`) is the token then.
    for (const session of sessions.list()) {
      if (session.header.origin !== 'subagent') wanted.set(session.id, `live:${session.seq}`)
    }
    for (const id of cache.keys()) {
      if (!wanted.has(id)) cache.delete(id)
    }
    const stale = []
    for (const [id, revision] of wanted) {
      const cached = cache.get(id)
      if (cached === undefined || cached.revision !== revision) stale.push([id, revision])
    }
    let next = 0
    const worker = async () => {
      while (next < stale.length) {
        const [id, revision] = stale[next++]
        cache.set(id, { revision, messages: await readMessages(query, id) })
      }
    }
    const workers = []
    for (let i = 0; i < READ_CONCURRENCY; i++) workers.push(worker())
    await Promise.all(workers)
  }

  function catchUp() {
    if (refreshing === null) {
      refreshing = refresh().finally(() => { refreshing = null })
    }
    return refreshing
  }

  /**
   * Sessions whose messages hold the query, newest hit first, each with its
   * newest hit: `{ sessions: [{ sessionId, seq, time, role, snippet, match }], scanned }`.
   */
  async function search(text) {
    await catchUp()
    const pattern = compileQuery(text)
    const hits = []
    for (const [sessionId, entry] of cache) {
      for (let i = entry.messages.length - 1; i >= 0; i--) {
        const message = entry.messages[i]
        const found = pattern.exec(message.text)
        if (found === null) continue
        hits.push({ sessionId, seq: message.seq, time: message.time, role: message.role, ...snippetOf(message.text, found.index, found[0].length) })
        break
      }
    }
    hits.sort((a, b) => b.time - a.time)
    return { sessions: hits.slice(0, SESSION_LIMIT), scanned: cache.size }
  }

  return { search, warm: catchUp }
}
