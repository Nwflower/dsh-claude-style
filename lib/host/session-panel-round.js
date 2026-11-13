// packages/host/src/session-panel-round.ts
var IMAGE_EXT = /\.(?:png|jpe?g|webp|gif|svg|avif|bmp)$/i;
var DOCUMENT_EXT = /\.(?:md|markdown|txt|pdf|docx?|xlsx?|pptx?|csv|json|jsonl|yaml|yml|html?)$/i;
var WRITE_TOOLS = /* @__PURE__ */ new Set(["write", "edit", "str_replace_editor"]);
function createPanelRound() {
  return { round: 0, since: 0, outputs: [], calls: /* @__PURE__ */ new Map(), jobs: /* @__PURE__ */ new Map(), children: /* @__PURE__ */ new Map() };
}
function text(value) {
  return typeof value === "string" && value !== "" ? value : null;
}
function argumentsOf(value) {
  if (typeof value !== "string" || value === "") return null;
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  return typeof parsed === "object" && parsed !== null ? parsed : null;
}
function outputOf(path, origin, directory) {
  const normalized = path.replaceAll("\\", "/");
  const base = directory?.replaceAll("\\", "/");
  const display = base !== void 0 && base !== "" && normalized.startsWith(`${base}/`) ? normalized.slice(base.length + 1) : normalized;
  const name = display.slice(display.lastIndexOf("/") + 1);
  return { path: normalized, display, name, kind: IMAGE_EXT.test(name) ? "image" : DOCUMENT_EXT.test(name) ? "document" : "file", origin };
}
function rememberOutput(state, path, origin, directory) {
  const output = outputOf(path, origin, directory);
  const index = state.outputs.findIndex((known) => known.path === output.path);
  if (index !== -1) {
    if (state.outputs[index].origin === "presented") output.origin = "presented";
    state.outputs.splice(index, 1);
  }
  state.outputs.push(output);
}
function foldPanelRound(state, events, directory) {
  for (const event of events) {
    const data = event.data;
    if (data === void 0) continue;
    if (event.type === "user/message" && (event.surfaceOp === "append" || event.surfaceOp === void 0) && (data.source ?? data.message?.source)?.kind === "user") {
      state.round += 1;
      state.since = event.time ?? 0;
      state.outputs = [];
      continue;
    }
    if (event.type === "tool/call") {
      const id = text(data.callId);
      if (id === null) continue;
      const args = argumentsOf(data.arguments);
      const written = WRITE_TOOLS.has(String(data.name)) && args !== null ? text(args.path) ?? text(args.file_path) ?? text(args.target_file) ?? text(args.filePath) : null;
      const child = data.name === "send_message" && args !== null ? text(args.agent_id) : null;
      state.calls.set(id, { round: state.round, written, child });
      continue;
    }
    if (event.type === "job/registered") {
      const id = text(data.jobId);
      const call = text(data.toolCall?.callId);
      const root = text(data.toolCall?.rootCallId);
      const round = (call === null ? void 0 : state.calls.get(call)?.round) ?? (root === null ? void 0 : state.calls.get(root)?.round) ?? state.round;
      if (id !== null) state.jobs.set(id, round);
      continue;
    }
    if (event.type === "subagent/catalog") {
      const id = text(data.childId);
      if (id !== null) state.children.set(id, state.round);
      continue;
    }
    if (event.type === "deliverables/presented") {
      const callId = text(data.callId);
      const round = callId === null ? state.round : state.calls.get(callId)?.round ?? state.round;
      if (round !== state.round) continue;
      for (const file of data.files ?? []) {
        const path = text(file?.path);
        if (path !== null) rememberOutput(state, path, "presented", directory);
      }
      continue;
    }
    if (event.type === "tool/result") {
      const id = text(data.message?.source?.callId);
      const call = id === null ? void 0 : state.calls.get(id);
      if (call === void 0 || data.error !== void 0 || data.message?.isError === true) continue;
      if (call.child !== null) state.children.set(call.child, call.round);
      if (call.round === state.round && call.written !== null) rememberOutput(state, call.written, "written", directory);
    }
  }
}
function belongsToPanelRound(state, kind, id, createdAt) {
  const round = state[kind].get(id);
  return round === void 0 ? state.round === 0 || state.since > 0 && createdAt >= state.since : round === state.round;
}
function panelRoundJobs(state, jobs) {
  return jobs.filter((job) => job.status === "running" || job.status === "stopping" || belongsToPanelRound(state, "jobs", job.id, job.startedAt));
}
export {
  belongsToPanelRound,
  createPanelRound,
  foldPanelRound,
  panelRoundJobs
};
