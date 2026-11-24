// packages/host/src/session-panel.ts
import { homedir } from "node:os";
import { resolve } from "node:path";
import { createPanelContext, foldPanelContext, panelContextOf } from "./session-panel-context.js";
import { compactionThresholdOf } from "./session-compact.js";
import { createPanelRound, foldPanelRound } from "./session-panel-round.js";
var KEPT_SESSIONS = 32;
var ANSWER_TTL_MS = 1200;
function number(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function text(value) {
  return typeof value === "string" && value !== "" ? value : null;
}
function release(observation) {
  if (typeof observation.dispose === "function") {
    observation.dispose();
    return;
  }
  const symbol = observation[Symbol.dispose];
  if (typeof symbol === "function") symbol.call(observation);
}
function createSessionPanel(ctx, cost) {
  const entries = /* @__PURE__ */ new Map();
  let stopEvents = null;
  let disposed = false;
  function query() {
    const reader = ctx.get("sessionQuery");
    return reader ?? null;
  }
  function remember(sessionId, entry) {
    entries.set(sessionId, entry);
    if (entries.size <= KEPT_SESSIONS) return;
    const oldest = [...entries.entries()].filter(([id]) => id !== sessionId).sort((left, right) => left[1].touchedAt - right[1].touchedAt)[0];
    if (oldest === void 0) return;
    entries.delete(oldest[0]);
  }
  function observe(sessionId) {
    const reader = query();
    if (reader === null || typeof reader.observeSession !== "function") {
      return Promise.reject(new Error("the host carries no session query service"));
    }
    return reader.observeSession(sessionId, { projectionMode: "all" });
  }
  function arrivals(events, cursor) {
    let index = events.length;
    while (index > 0 && (events[index - 1].seq ?? -1) > cursor) index -= 1;
    return index === events.length ? [] : events.slice(index);
  }
  async function statsOf(projections, sessionId, billing) {
    const stats = projections.sessionStats;
    const usage = projections.tokenUsage;
    if (stats === void 0 && usage === void 0) return null;
    let settled = null;
    if (cost !== void 0 && sessionId !== void 0 && billing !== void 0) {
      try {
        const answer = await cost.get(sessionId, billing);
        if (answer !== null) settled = { cny: answer.cny, usd: answer.usd };
      } catch {
      }
    }
    return {
      turns: number(stats?.turns) ?? 0,
      steps: number(stats?.steps) ?? 0,
      llmMs: number(stats?.llmMs) ?? 0,
      toolMs: number(stats?.toolMs) ?? 0,
      ttftMs: number(stats?.ttftMs) ?? 0,
      ttftSteps: number(stats?.ttftSteps) ?? 0,
      decodeMs: number(stats?.decodeMs) ?? 0,
      decodeTokens: number(stats?.decodeTokens) ?? 0,
      uncachedInputTokens: number(usage?.uncachedInputTokens) ?? 0,
      cacheReadTokens: number(usage?.cacheReadTokens) ?? 0,
      cacheWriteTokens: number(usage?.cacheWriteTokens) ?? 0,
      outputTokens: number(usage?.outputTokens) ?? 0,
      cost: settled
    };
  }
  function billingKeyOf(billing) {
    return billing.currency === null ? "" : billing.currency + ":" + billing.rows.map((row) => `${row.model}|${row.cacheMiss}|${row.cacheHit}|${row.output}`).join(";");
  }
  function liveSeqOf(sessionId) {
    const sessions = ctx.get("sessions");
    const seq = sessions?.get?.(sessionId)?.seq;
    return typeof seq === "number" && Number.isFinite(seq) ? seq : null;
  }
  async function build(sessionId, entry, billing, billingKey) {
    const observation = await observe(sessionId);
    try {
      const projections = observation.projections?.values ?? {};
      const recorded = text(observation.header?.cwd) ?? text(projections.workingDirectory);
      const resolvedDirectory = resolve(recorded ?? homedir());
      const events = observation.events ?? [];
      if (entry.cursor === -1 || events.length > 0) {
        const incoming = arrivals(events, entry.cursor);
        foldPanelContext(entry.context, incoming);
        foldPanelRound(entry.round, incoming, resolvedDirectory);
        const last = incoming[incoming.length - 1];
        if (last !== void 0) entry.cursor = last.seq ?? entry.cursor;
      }
      const agents = ctx.get("agents");
      const thresholdTokens = compactionThresholdOf(ctx, agents, sessionId, entry.context, projections.contextPressure?.contextWindow);
      const value = {
        directory: resolvedDirectory,
        context: panelContextOf(projections, entry.context, thresholdTokens),
        // Newest first: the row a reader just caused stands at the top of the list.
        outputs: [...entry.round.outputs].reverse(),
        stats: await statsOf(projections, sessionId, billing)
      };
      entry.value = value;
      entry.billingKey = billingKey;
      entry.at = Date.now();
      entry.touchedAt = Date.now();
      return value;
    } finally {
      release(observation);
    }
  }
  async function get(sessionId, billing = { rows: [], currency: null }, fresh = false) {
    const billingKey = billingKeyOf(billing);
    const held = entries.get(sessionId);
    if (held !== void 0) {
      held.touchedAt = Date.now();
      if (held.loading !== null) return held.loading;
      if (!fresh && held.at > 0 && held.billingKey === billingKey) {
        if (Date.now() - held.at < ANSWER_TTL_MS) return held.value;
        const liveSeq = liveSeqOf(sessionId);
        if (liveSeq !== null && liveSeq <= held.cursor + 1) return held.value;
      }
    }
    const entry = held ?? {
      value: { directory: null, context: null, outputs: [] },
      at: 0,
      cursor: -1,
      billingKey,
      context: createPanelContext(),
      round: createPanelRound(),
      loading: null,
      touchedAt: Date.now()
    };
    remember(sessionId, entry);
    const work = build(sessionId, entry, billing, billingKey);
    entry.loading = work;
    try {
      return await work;
    } finally {
      entry.loading = null;
    }
  }
  function ensure() {
    if (stopEvents !== null || typeof ctx.on !== "function") return;
    stopEvents = ctx.on("session/event", (session) => {
      if (disposed) return;
      const id = text(session?.id);
      if (id === null) return;
      const entry = entries.get(id);
      if (entry !== void 0) entry.at = 0;
    });
  }
  return {
    get,
    ensure,
    dispose() {
      disposed = true;
      if (stopEvents !== null) stopEvents();
      stopEvents = null;
      entries.clear();
    }
  };
}
export {
  createSessionPanel
};
