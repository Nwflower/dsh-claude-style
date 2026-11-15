// packages/contracts/src/package.ts
var PACKAGE_NAME = "dsh-claude-style";

// packages/host/src/search.ts
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { cachePath, readJsonDocument, writeJsonDocument } from "./cache-file.js";

// packages/engine/node/session-events.ts
function eventsOf(events) {
  return Array.isArray(events) ? events : null;
}
function unreadableLog(error) {
  const failure = error;
  return failure?.code === "SESSION_QUERY_CORRUPT_SESSION" || failure?.code === "SESSION_QUERY_SESSION_NOT_FOUND" ? failure : null;
}
function reportUnreadable(ctx, packageName, error, sessionId, label) {
  ctx.logger?.warn?.(`${packageName}: session ${sessionId} left out of ${label}: ${unreadableLog(error)?.message}`);
}
function releaseObservation(observation) {
  const named = observation.dispose;
  if (typeof named === "function") named.call(observation);
  else if (Symbol.dispose in observation) observation[Symbol.dispose]();
}
async function readEvents(ctx, packageName, sessionId, label) {
  const query = ctx.get("sessionQuery");
  if (query === null || query === void 0) return null;
  try {
    if (typeof query.observeSession === "function") {
      const observation = await query.observeSession(sessionId, { projectionMode: "none" });
      try {
        return eventsOf(observation.events);
      } finally {
        releaseObservation(observation);
      }
    }
    if (typeof query.readSession !== "function") return null;
    const snapshot = await query.readSession(sessionId);
    return eventsOf(snapshot?.events);
  } catch (error) {
    if (unreadableLog(error) === null) throw error;
    reportUnreadable(ctx, packageName, error, sessionId, label);
    return null;
  }
}

// packages/host/src/search.ts
var CORPUS_CACHE_CHARS = 8e6;
var SESSION_LIMIT = 40;
var SNIPPET_LEAD = 36;
var SNIPPET_CHARS = 140;
var QUERY_MAX = 200;
var CACHE_WRITE_INTERVAL_MS = 5e3;
var LIST_INTERVAL_MS = 2e3;
var CACHE_VERSION = 1;
var LOWER_CACHE_CHARS = 4e6;
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
  const snippet = Buffer.from(head + match + tail, "utf16le").toString("utf16le");
  return { snippet, match: span };
}
function isStoredMessage(value) {
  if (value === null || typeof value !== "object") return false;
  const message = value;
  return Number.isFinite(message.seq) && Number.isFinite(message.time) && (message.role === "user" || message.role === "assistant") && typeof message.text === "string";
}
function createSessionSearch(ctx) {
  const cache = /* @__PURE__ */ new Map();
  const sizes = /* @__PURE__ */ new Map();
  let corpusChars = 0;
  let catalog = /* @__PURE__ */ new Map();
  const lower = /* @__PURE__ */ new Map();
  let lowerChars = 0;
  const writtenAt = /* @__PURE__ */ new Map();
  let serial = Promise.resolve();
  let warming = null;
  let stored = null;
  let listedAt = 0;
  let disposed = false;
  function cacheFile(sessionId) {
    return cachePath(ctx, "search", `${createHash("sha256").update(sessionId).digest("hex")}.json`);
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
    if (disposed) return;
    hold(sessionId, entry);
    forgetLower(sessionId);
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
  function forgetLower(sessionId) {
    const held = lower.get(sessionId);
    if (held === void 0) return;
    for (const text of held) lowerChars -= text.length;
    lower.delete(sessionId);
  }
  function releaseCorpus(sessionId) {
    corpusChars -= sizes.get(sessionId) ?? 0;
    sizes.delete(sessionId);
    cache.delete(sessionId);
    forgetLower(sessionId);
  }
  function hold(sessionId, entry) {
    let size = 0;
    for (const message of entry.messages) size += message.text.length;
    releaseCorpus(sessionId);
    if (size > CORPUS_CACHE_CHARS) return;
    while (corpusChars + size > CORPUS_CACHE_CHARS && cache.size > 0) {
      releaseCorpus(cache.keys().next().value);
    }
    cache.set(sessionId, entry);
    sizes.set(sessionId, size);
    corpusChars += size;
  }
  function loweredFor(sessionId, entry) {
    const held = lower.get(sessionId);
    if (held !== void 0) {
      lower.delete(sessionId);
      lower.set(sessionId, held);
      return held;
    }
    if (!cache.has(sessionId) || (sizes.get(sessionId) ?? 0) > LOWER_CACHE_CHARS) return null;
    const texts = entry.messages.map((message) => message.text.toLowerCase());
    let size = 0;
    for (const text of texts) size += text.length;
    if (size > LOWER_CACHE_CHARS) return null;
    while (lowerChars + size > LOWER_CACHE_CHARS && lower.size > 0) {
      const oldest = lower.keys().next().value;
      if (oldest === void 0) break;
      forgetLower(oldest);
    }
    lower.set(sessionId, texts);
    lowerChars += size;
    return texts;
  }
  function forget(sessionId) {
    if (disposed) return;
    releaseCorpus(sessionId);
    writtenAt.delete(sessionId);
    writeJsonDocument(ctx, cacheFile(sessionId), "session search cache", null);
  }
  async function rebuild(sessionId, revision) {
    const events = await readEvents(ctx, PACKAGE_NAME, sessionId, "content search");
    if (disposed) return null;
    if (events === null) return null;
    const last = events[events.length - 1];
    const lastSeq = typeof last?.seq === "number" ? last.seq + 1 : 0;
    const entry = { revision, lastSeq, messages: messagesOf(events) };
    adopt(sessionId, entry, false);
    return entry;
  }
  async function corpusFor(id, want) {
    if (disposed) return null;
    const entry = cache.get(id) ?? readCached(id);
    if (entry === null || (want.live === null ? entry.revision !== want.revision : entry.lastSeq > want.live.seq)) {
      return await rebuild(id, want.revision) ?? entry;
    }
    if (want.live !== null && entry.lastSeq < want.live.seq) {
      entry.messages = entry.messages.concat(messagesOf(want.live.snapshotEvents(entry.lastSeq)));
      entry.lastSeq = want.live.seq;
      adopt(id, entry, false);
    } else if (!cache.has(id)) hold(id, entry);
    else {
      cache.delete(id);
      cache.set(id, entry);
    }
    return entry;
  }
  async function refresh(store) {
    if (disposed) return;
    const persistence = ctx.get("sessionPersistence");
    const sessions = ctx.get("sessions");
    if (!persistence || !sessions) throw new Error("the host exposes no session persistence or session service");
    if (store && (stored === null || Date.now() - listedAt >= LIST_INTERVAL_MS)) {
      const listing = /* @__PURE__ */ new Map();
      const snapshots = await persistence.list();
      if (disposed) return;
      for (const snapshot of snapshots) {
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
    for (const id of catalog.keys()) {
      if (!wanted.has(id)) forget(id);
    }
    catalog = wanted;
  }
  function enqueue(run) {
    const result = serial.then(run);
    serial = result.then(() => {
    }, () => {
    });
    return result;
  }
  async function search(text) {
    await refresh(stored === null);
    const query = text.trim();
    const parts = query.split(/\s+/u);
    const single = parts.length === 1 ? parts[0].toLowerCase() : "";
    const pattern = single === "" ? compileQuery(query) : null;
    const hits = [];
    let scanned = 0;
    for (const [sessionId, want] of catalog) {
      if (disposed) break;
      const entry = await corpusFor(sessionId, want);
      if (entry === null || disposed) continue;
      scanned += 1;
      const lowered = single === "" ? [] : loweredFor(sessionId, entry);
      for (let i = entry.messages.length - 1; i >= 0; i--) {
        const message = entry.messages[i];
        const found = single === "" ? pattern.exec(message.text) : null;
        const index = single === "" ? found?.index ?? -1 : (lowered?.[i] ?? message.text.toLowerCase()).indexOf(single);
        if (index < 0) continue;
        const length = single === "" ? found[0].length : single.length;
        hits.push({ sessionId, seq: message.seq, time: message.time, role: message.role, ...snippetOf(message.text, index, length) });
        break;
      }
    }
    hits.sort((a, b) => b.time - a.time);
    return { sessions: disposed ? [] : hits.slice(0, SESSION_LIMIT), scanned: disposed ? 0 : scanned };
  }
  function dispose() {
    disposed = true;
    cache.clear();
    sizes.clear();
    corpusChars = 0;
    catalog.clear();
    lower.clear();
    lowerChars = 0;
    writtenAt.clear();
    stored = null;
    warming = null;
  }
  function warm() {
    if (warming !== null) return warming;
    const done = enqueue(async () => {
      await refresh(true);
      for (const [id, want] of catalog) {
        if (disposed) break;
        await corpusFor(id, want);
      }
    }).finally(() => {
      if (warming === done) warming = null;
    });
    warming = done;
    return done;
  }
  return {
    search: (text) => enqueue(() => search(text)),
    warm,
    dispose,
    /** Resident UTF-16 units only; directory metadata and transient log reads are separate. */
    memory: () => ({ corpusChars, lowerChars, sessions: cache.size, catalog: catalog.size })
  };
}
export {
  CORPUS_CACHE_CHARS,
  LOWER_CACHE_CHARS,
  QUERY_MAX,
  createSessionSearch
};
