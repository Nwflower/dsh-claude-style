// packages/host/src/search.ts
var READ_CONCURRENCY = 4;
var SESSION_LIMIT = 40;
var SNIPPET_LEAD = 36;
var SNIPPET_CHARS = 140;
var QUERY_MAX = 200;
function compileQuery(query) {
  const pattern = query.trim().split(/\s+/u).map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("\\s+");
  return new RegExp(pattern, "iu");
}
function messageText(content) {
  const parts = [];
  for (const block of content) {
    if (block.type === "text" && block.text.trim() !== "") parts.push(block.text);
  }
  return parts.join("\n");
}
function messagesOf(events) {
  const messages = [];
  for (const event of events) {
    let text = "";
    if (event.type === "user/message") text = messageText(event.data.content ?? []);
    else if (event.type === "assistant/message") text = messageText(event.data.message?.content ?? []);
    else continue;
    if (text !== "") messages.push({ seq: event.seq, time: event.time, role: event.type === "user/message" ? "user" : "assistant", text });
  }
  return messages;
}
function snippetOf(text, index, length) {
  const start = Math.max(0, index - SNIPPET_LEAD);
  const end = Math.min(text.length, Math.max(start + SNIPPET_CHARS, index + length));
  const flat = (value) => value.replace(/\s+/gu, " ");
  const head = `${start > 0 ? "\u2026" : ""}${flat(text.slice(start, index)).trimStart()}`;
  const match = flat(text.slice(index, index + length));
  const tail = `${flat(text.slice(index + length, end)).trimEnd()}${end < text.length ? "\u2026" : ""}`;
  const span = [head.length, head.length + match.length];
  return { snippet: head + match + tail, match: span };
}
function createSessionSearch(ctx) {
  const cache = /* @__PURE__ */ new Map();
  let refreshing = null;
  async function readMessages(query, sessionId) {
    try {
      const log = await query.readSession(sessionId);
      return messagesOf(log.events);
    } catch (error) {
      const failure = error;
      if (failure?.code !== "SESSION_QUERY_CORRUPT_SESSION" && failure?.code !== "SESSION_QUERY_SESSION_NOT_FOUND") throw error;
      ctx.logger?.warn?.(`dsh-claude-style: session ${sessionId} left out of content search: ${failure.message}`);
      return [];
    }
  }
  async function refresh() {
    const query = ctx.get("sessionQuery");
    const persistence = ctx.get("sessionPersistence");
    const sessions = ctx.get("sessions");
    if (!query || !persistence || !sessions) throw new Error("the host exposes no session query, persistence or session service");
    const wanted = /* @__PURE__ */ new Map();
    for (const snapshot of await persistence.list()) {
      if (snapshot.header.origin !== "subagent") wanted.set(snapshot.header.id, `stored:${snapshot.revision}`);
    }
    for (const session of sessions.list()) {
      if (session.header.origin !== "subagent") wanted.set(session.id, `live:${session.seq}`);
    }
    for (const id of cache.keys()) {
      if (!wanted.has(id)) cache.delete(id);
    }
    const stale = [];
    for (const [id, revision] of wanted) {
      const cached = cache.get(id);
      if (cached === void 0 || cached.revision !== revision) stale.push([id, revision]);
    }
    let next = 0;
    const worker = async () => {
      while (next < stale.length) {
        const [id, revision] = stale[next++];
        cache.set(id, { revision, messages: await readMessages(query, id) });
      }
    };
    const workers = [];
    for (let i = 0; i < READ_CONCURRENCY; i++) workers.push(worker());
    await Promise.all(workers);
  }
  function catchUp() {
    if (refreshing === null) {
      refreshing = refresh().finally(() => {
        refreshing = null;
      });
    }
    return refreshing;
  }
  async function search(text) {
    await catchUp();
    const pattern = compileQuery(text);
    const hits = [];
    for (const [sessionId, entry] of cache) {
      for (let i = entry.messages.length - 1; i >= 0; i--) {
        const message = entry.messages[i];
        const found = pattern.exec(message.text);
        if (found === null) continue;
        hits.push({ sessionId, seq: message.seq, time: message.time, role: message.role, ...snippetOf(message.text, found.index, found[0].length) });
        break;
      }
    }
    hits.sort((a, b) => b.time - a.time);
    return { sessions: hits.slice(0, SESSION_LIMIT), scanned: cache.size };
  }
  return { search, warm: catchUp };
}
export {
  QUERY_MAX,
  createSessionSearch
};
