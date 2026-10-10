// packages/host/src/search.ts
import { cachePath, readJsonDocument, writeJsonDocument } from "./cache-file.js";
import { readEvents } from "./session-events.js";
var READ_CONCURRENCY = 4;
var SESSION_LIMIT = 40;
var SNIPPET_LEAD = 36;
var SNIPPET_CHARS = 140;
var QUERY_MAX = 200;
var CACHE_WRITE_INTERVAL_MS = 5e3;
var LIST_INTERVAL_MS = 2e3;
var CACHE_VERSION = 1;
function compileQuery(query) {
  const pattern = query.trim().split(/\s+/u).map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("\\s+");
  return new RegExp(pattern, "iu");
}
function messageText(content) {
  const parts = [];
  for (const block of content) {
    if (block.type === "text" && typeof block.text === "string" && block.text.trim() !== "") parts.push(block.text);
  }
  return parts.join("\n");
}
function isHumanMessage(event) {
  return event.data?.source?.kind === "user";
}
function messagesOf(events) {
  const messages = [];
  for (const event of events) {
    let text = "";
    if (event.type === "user/message") {
      if (!isHumanMessage(event)) continue;
      text = messageText(event.data?.content ?? []);
    } else if (event.type === "assistant/message") {
      text = messageText(event.data?.message?.content ?? []);
    } else continue;
    if (typeof event.seq !== "number" || typeof event.time !== "number") continue;
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
function isStoredMessage(value) {
  if (value === null || typeof value !== "object") return false;
  const message = value;
  return Number.isFinite(message.seq) && Number.isFinite(message.time) && (message.role === "user" || message.role === "assistant") && typeof message.text === "string";
}
function createSessionSearch(ctx) {
  const cache = /* @__PURE__ */ new Map();
  const lower = /* @__PURE__ */ new Map();
  const writtenAt = /* @__PURE__ */ new Map();
  let refreshing = null;
  let refreshingStore = false;
  let stored = null;
  let listedAt = 0;
  function cacheFile(sessionId) {
    return cachePath(ctx, "search", `${sessionId}.json`);
  }
  function readCached(sessionId) {
    const parsed = readJsonDocument(ctx, cacheFile(sessionId), "session search cache");
    if (parsed === null || typeof parsed !== "object") return null;
    const document = parsed;
    if (document.version !== CACHE_VERSION) return null;
    if (typeof document.revision !== "string" || !Number.isFinite(document.lastSeq)) return null;
    if (!Array.isArray(document.messages)) return null;
    const messages = [];
    for (const value of document.messages) {
      if (!isStoredMessage(value)) return null;
      messages.push({ seq: Number(value.seq), time: Number(value.time), role: value.role, text: value.text });
    }
    return { revision: document.revision, lastSeq: Number(document.lastSeq), messages };
  }
  function adopt(sessionId, entry, force) {
    cache.set(sessionId, entry);
    lower.set(sessionId, entry.messages.map((message) => message.text.toLowerCase()));
    const now = Date.now();
    if (!force && now - (writtenAt.get(sessionId) ?? 0) < CACHE_WRITE_INTERVAL_MS) return;
    writtenAt.set(sessionId, now);
    writeJsonDocument(ctx, cacheFile(sessionId), "session search cache", {
      version: CACHE_VERSION,
      revision: entry.revision,
      lastSeq: entry.lastSeq,
      messages: entry.messages
    });
  }
  function forget(sessionId) {
    cache.delete(sessionId);
    lower.delete(sessionId);
    writtenAt.delete(sessionId);
    writeJsonDocument(ctx, cacheFile(sessionId), "session search cache", null);
  }
  async function rebuild(sessionId, revision) {
    const events = await readEvents(ctx, sessionId, "content search");
    const messages = events === null ? [] : messagesOf(events);
    const last = events === null ? void 0 : events[events.length - 1];
    const lastSeq = typeof last?.seq === "number" ? last.seq + 1 : 0;
    adopt(sessionId, { revision, lastSeq, messages }, false);
  }
  async function refresh(store) {
    const persistence = ctx.get("sessionPersistence");
    const sessions = ctx.get("sessions");
    if (!persistence || !sessions) throw new Error("the host exposes no session persistence or session service");
    if (store && (stored === null || Date.now() - listedAt >= LIST_INTERVAL_MS)) {
      const listing = /* @__PURE__ */ new Map();
      for (const snapshot of await persistence.list()) {
        if (snapshot.header.origin === "subagent") continue;
        listing.set(snapshot.header.id, String(snapshot.revision));
      }
      stored = listing;
      listedAt = Date.now();
    }
    if (stored === null) return;
    const live = /* @__PURE__ */ new Map();
    for (const session of sessions.list()) {
      if (session.header?.origin !== "subagent") live.set(session.id, session);
    }
    const wanted = /* @__PURE__ */ new Map();
    for (const [id, revision] of stored) {
      const held = live.get(id) ?? null;
      wanted.set(id, { revision: held === null ? revision : "", live: held });
    }
    for (const [id, session] of live) {
      if (!wanted.has(id)) wanted.set(id, { revision: "", live: session });
    }
    for (const id of [...cache.keys()]) {
      if (!wanted.has(id)) forget(id);
    }
    const stale = [];
    for (const [id, want] of wanted) {
      const entry = cache.get(id) ?? readCached(id);
      if (entry === null) {
        stale.push(id);
        continue;
      }
      cache.set(id, entry);
      if (!lower.has(id)) lower.set(id, entry.messages.map((message) => message.text.toLowerCase()));
      if (want.live !== null) {
        if (entry.lastSeq > want.live.seq) stale.push(id);
        else if (entry.lastSeq < want.live.seq) {
          const tail = messagesOf(want.live.snapshotEvents(entry.lastSeq));
          entry.messages = entry.messages.concat(tail);
          entry.lastSeq = want.live.seq;
          adopt(id, entry, false);
        }
        continue;
      }
      if (entry.revision !== want.revision) stale.push(id);
    }
    let next = 0;
    const worker = async () => {
      while (next < stale.length) {
        const id = stale[next++];
        const want = wanted.get(id);
        if (want !== void 0) await rebuild(id, want.revision);
      }
    };
    const workers = [];
    for (let i = 0; i < READ_CONCURRENCY; i++) workers.push(worker());
    await Promise.all(workers);
  }
  function catchUp(store) {
    if (refreshing !== null && (refreshingStore || !store)) return refreshing;
    refreshingStore = store;
    refreshing = refresh(store).finally(() => {
      refreshing = null;
      refreshingStore = false;
    });
    return refreshing;
  }
  async function search(text) {
    await catchUp(stored === null);
    const query = text.trim();
    const parts = query.split(/\s+/u);
    const single = parts.length === 1 ? parts[0].toLowerCase() : "";
    const pattern = single === "" ? compileQuery(query) : null;
    const hits = [];
    for (const [sessionId, entry] of cache) {
      const lowered = lower.get(sessionId) ?? [];
      for (let i = entry.messages.length - 1; i >= 0; i--) {
        const message = entry.messages[i];
        const found = single === "" ? pattern.exec(message.text) : null;
        const index = single === "" ? found?.index ?? -1 : (lowered[i] ?? message.text.toLowerCase()).indexOf(single);
        if (index < 0) continue;
        const length = single === "" ? found[0].length : single.length;
        hits.push({ sessionId, seq: message.seq, time: message.time, role: message.role, ...snippetOf(message.text, index, length) });
        break;
      }
    }
    hits.sort((a, b) => b.time - a.time);
    return { sessions: hits.slice(0, SESSION_LIMIT), scanned: cache.size };
  }
  return { search, warm: () => catchUp(true) };
}
export {
  QUERY_MAX,
  createSessionSearch
};
