// packages/host/src/session-panel.ts
import { panelEnvironment } from "./checkout.js";
import { JOB_OUTPUT_MAX, foldJobs } from "./session-panel-log.js";
import { createPanelContext, foldPanelContext, panelContextOf } from "./session-panel-context.js";
import { compactionThresholdOf } from "./session-compact.js";
import { belongsToPanelRound, createPanelRound, foldPanelRound } from "./session-panel-round.js";
import { isPanelProcess } from "./session-panel-call.js";
var KEPT_SESSIONS = 32;
var ANSWER_TTL_MS = 1200;
var CHILD_FACTS_TTL_MS = 8e3;
var NO_CHILD_FACTS = { settledMs: 0, activeSince: null, running: false, completed: false, tokens: 0, lastStartedAt: 0 };
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
function changeOf(url, ref, update) {
  const snapshot = update?.snapshot;
  const checks = snapshot?.checks ?? [];
  let failing = 0;
  for (const check of checks) if (check.state === "failure") failing += 1;
  const owner = ref?.repository?.owner;
  const name = ref?.repository?.name;
  return {
    url,
    number: number(ref?.number),
    repository: owner !== void 0 && name !== void 0 ? `${owner}/${name}` : null,
    title: text(snapshot?.title),
    state: snapshot?.state ?? null,
    draft: snapshot?.draft === true,
    checks: snapshot?.checksRollup ?? null,
    failing,
    total: checks.length
  };
}
function updateSignature(update) {
  const snapshot = update?.snapshot;
  return snapshot === void 0 ? "" : `${snapshot.title ?? ""}|${snapshot.state ?? ""}|${snapshot.checksRollup ?? ""}|${snapshot.checks?.length ?? 0}`;
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
    for (const stop of oldest[1].watches.values()) stop();
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
  function watchChange(entry, forge, url) {
    if (entry.watches.has(url) || typeof forge.changeRequestFromUrl !== "function" || typeof forge.watch !== "function") return;
    const ref = forge.changeRequestFromUrl(url);
    if (ref === void 0) return;
    const stop = forge.watch(ref, (update) => {
      const before = updateSignature(entry.updates.get(url));
      entry.updates.set(url, update);
      if (updateSignature(update) !== before) entry.at = 0;
    });
    entry.watches.set(url, stop);
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
  async function build(sessionId, entry, billing) {
    const observation = await observe(sessionId);
    try {
      const projections = observation.projections?.values ?? {};
      const directory = text(observation.header?.cwd) ?? projections.workingDirectory ?? null;
      const environment = await panelEnvironment(directory);
      const resolvedDirectory = environment?.directory ?? null;
      const events = observation.events ?? [];
      if (entry.cursor === -1 || events.length > 0) {
        const incoming = arrivals(events, entry.cursor);
        foldPanelContext(entry.context, incoming);
        foldPanelRound(entry.round, incoming, resolvedDirectory);
        foldJobs(entry, incoming);
        const last = incoming[incoming.length - 1];
        if (last !== void 0) entry.cursor = last.seq ?? entry.cursor;
      }
      const forge = ctx.get("forge");
      const jobs = ctx.get("jobs");
      const agents = ctx.get("agents");
      const changes = [];
      for (const binding of projections.forgeChangeRequests ?? []) {
        const url = text(binding.url);
        if (url === null || binding.dismissed === true) continue;
        if (forge !== null && forge !== void 0) watchChange(entry, forge, url);
        const ref = typeof forge?.changeRequestFromUrl === "function" ? forge.changeRequestFromUrl(url) : void 0;
        const update = entry.updates.get(url) ?? (ref === void 0 ? void 0 : forge?.latest?.(ref));
        if (update !== void 0) entry.updates.set(url, update);
        changes.push(changeOf(url, ref, update));
      }
      changes.reverse();
      const background = await backgroundOf(entry, projections, jobs, agents, sessionId);
      const thresholdTokens = compactionThresholdOf(ctx, agents, sessionId, entry.context, projections.contextPressure?.contextWindow);
      const value = {
        environment,
        context: panelContextOf(projections, entry.context, thresholdTokens),
        // Newest first: the row a reader just caused stands at the top of the list.
        outputs: [...entry.round.outputs].reverse(),
        changes,
        background,
        stats: await statsOf(projections, sessionId, billing)
      };
      entry.value = value;
      entry.at = Date.now();
      entry.touchedAt = Date.now();
      return value;
    } finally {
      release(observation);
    }
  }
  async function childFacts(id) {
    let observation;
    try {
      observation = await observe(id);
    } catch {
      return NO_CHILD_FACTS;
    }
    try {
      const values = observation.projections?.values ?? {};
      const timing = values.subagentTiming;
      const usage = values.tokenUsage;
      const active = timing?.active;
      const since = number(active?.since);
      const lastStart = observation.events?.findLast((event) => event.type === "turn/start");
      return {
        lastStartedAt: lastStart?.time ?? 0,
        settledMs: number(timing?.settledMs) ?? 0,
        activeSince: active === void 0 ? null : since,
        running: active !== void 0,
        completed: timing?.lastTurnCompleted === true,
        tokens: (number(usage?.uncachedInputTokens) ?? 0) + (number(usage?.cacheReadTokens) ?? 0) + (number(usage?.cacheWriteTokens) ?? 0) + (number(usage?.outputTokens) ?? 0)
      };
    } catch {
      return NO_CHILD_FACTS;
    } finally {
      release(observation);
    }
  }
  async function backgroundOf(entry, projections, jobs, agents, sessionId) {
    const live = /* @__PURE__ */ new Set();
    if (typeof jobs?.list === "function") {
      for (const job of jobs.list(sessionId)) {
        const id = String(job.id ?? "");
        if (id === "") continue;
        live.add(id);
        const known = entry.jobs.get(id);
        entry.jobs.set(id, {
          id,
          label: known?.label || text(job.label) || "",
          category: known?.category ?? (isPanelProcess(id, job.kind) ? "process" : "task"),
          execution: known?.execution ?? "unknown",
          controllable: true,
          status: text(job.status) ?? "running",
          startedAt: number(job.startedAt) ?? 0,
          finishedAt: number(job.finishedAt) ?? void 0,
          progress: text(job.progress) ?? void 0,
          detail: text(job.detail) ?? void 0
        });
      }
    }
    for (const job of entry.jobs.values()) {
      if (entry.jobOutputs.has(job.id) || !live.has(job.id)) continue;
      const read = jobOutput(sessionId, job.id);
      if (read !== null && read.text !== "") entry.jobOutputs.set(job.id, read);
    }
    const jobRows = [...entry.jobs.values()].sort((left, right) => {
      const leftRunning = left.status === "running" || left.status === "stopping" ? 0 : 1;
      const rightRunning = right.status === "running" || right.status === "stopping" ? 0 : 1;
      return leftRunning - rightRunning || right.startedAt - left.startedAt;
    });
    const running = (id) => {
      if (id === null || typeof agents?.get !== "function") return null;
      const agent = agents.get(id);
      if (agent === void 0 || agent === null) return null;
      return agent.status === "running";
    };
    const subagents = [];
    const catalog = [...projections.subagentCatalog ?? []].sort((left, right) => (number(right.createdAt) ?? 0) - (number(left.createdAt) ?? 0));
    for (const child of catalog) {
      const id = text(child.id);
      if (id === null) continue;
      const kept = entry.children.get(id);
      const facts = kept !== void 0 && Date.now() - kept.at < CHILD_FACTS_TTL_MS ? kept.facts : await childFacts(id);
      if (kept === void 0 || kept.facts !== facts) entry.children.set(id, { facts, at: Date.now() });
      const isRunning = running(id) ?? facts.running;
      const resumed = entry.round.since > 0 && facts.lastStartedAt >= entry.round.since;
      if (!isRunning && !resumed && !belongsToPanelRound(entry.round, "children", id, number(child.createdAt) ?? 0)) continue;
      subagents.push({
        id,
        label: text(child.label) ?? "",
        mode: text(child.mode) ?? "",
        settledMs: facts.settledMs,
        activeSince: facts.activeSince,
        running: isRunning,
        completed: facts.completed,
        tokens: facts.tokens
      });
    }
    const team = projections.agentTeam;
    let teamRows = null;
    if (team !== void 0 && team !== null && (team.members !== void 0 || team.tasks !== void 0)) {
      const members = [];
      for (const member of team.members ?? []) {
        const id = text(member.id);
        if (id === null) continue;
        members.push({
          id,
          name: text(member.name) ?? "",
          role: member.role === "lead" ? "lead" : "teammate",
          phase: text(member.phase) ?? "",
          running: running(id)
        });
      }
      const tasks = [];
      for (const task of team.tasks ?? []) {
        const status = text(task.status);
        if (status === null || status === "deleted") continue;
        tasks.push({
          id: String(task.id ?? ""),
          subject: text(task.subject) ?? "",
          status,
          ownerName: text(task.ownerName) ?? void 0
        });
      }
      teamRows = { members, tasks };
    }
    return { jobs: jobRows, subagents, team: teamRows };
  }
  async function get(sessionId, billing = { rows: [], currency: null }, fresh = false) {
    const held = entries.get(sessionId);
    if (held !== void 0) {
      held.touchedAt = Date.now();
      if (held.loading !== null) return held.loading;
      if (!fresh && Date.now() - held.at < ANSWER_TTL_MS) return held.value;
    }
    const entry = held ?? {
      value: { environment: null, context: null, outputs: [], changes: [], background: { jobs: [], subagents: [], team: null } },
      at: 0,
      cursor: -1,
      context: createPanelContext(),
      round: createPanelRound(),
      children: /* @__PURE__ */ new Map(),
      jobs: /* @__PURE__ */ new Map(),
      jobOutputs: /* @__PURE__ */ new Map(),
      jobCalls: /* @__PURE__ */ new Map(),
      jobInvocations: /* @__PURE__ */ new Map(),
      jobOrigins: /* @__PURE__ */ new Map(),
      updates: /* @__PURE__ */ new Map(),
      watches: /* @__PURE__ */ new Map(),
      loading: null,
      touchedAt: Date.now()
    };
    remember(sessionId, entry);
    const work = build(sessionId, entry, billing);
    entry.loading = work;
    try {
      return await work;
    } finally {
      entry.loading = null;
    }
  }
  function jobOutput(sessionId, jobId) {
    const cached = entries.get(sessionId)?.jobOutputs.get(jobId);
    if (cached !== void 0) return cached;
    const jobs = ctx.get("jobs");
    if (jobs === null || jobs === void 0 || typeof jobs.readAt !== "function") return null;
    let read;
    let status = "";
    try {
      read = jobs.readAt(jobId, 0, sessionId);
      status = text(jobs.get?.(jobId, sessionId)?.status) ?? "";
    } catch {
      return null;
    }
    let full = "";
    for (const chunk of read.chunks ?? []) full += text(chunk.text) ?? "";
    const textOfOutput = full.length > JOB_OUTPUT_MAX ? full.slice(full.length - JOB_OUTPUT_MAX) : full;
    return { text: textOfOutput, lossy: read.lossy === true || full.length > JOB_OUTPUT_MAX, status };
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
    jobOutput,
    ensure,
    dispose() {
      disposed = true;
      if (stopEvents !== null) stopEvents();
      stopEvents = null;
      for (const entry of entries.values()) for (const stop of entry.watches.values()) stop();
      entries.clear();
    }
  };
}
export {
  createSessionPanel
};
