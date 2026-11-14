// packages/host/src/session-panel-log.ts
import { createHash } from "node:crypto";
import { isPanelProcess, panelInvocation } from "./session-panel-call.js";
var JOB_OUTPUT_MAX = 8e3;
function linkJobCall(state, callId, jobId) {
  let ids = state.jobCalls.get(callId);
  if (ids === void 0) {
    ids = /* @__PURE__ */ new Set();
    state.jobCalls.set(callId, ids);
  }
  ids.add(jobId);
}
function text(value) {
  return typeof value === "string" && value !== "" ? value : null;
}
function number(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function messageText(content) {
  if (!Array.isArray(content)) return "";
  let out = "";
  for (const block of content) {
    if (block?.type === "text" && typeof block.text === "string") out += block.text;
  }
  return out;
}
function rememberJobOutput(state, jobId, text2) {
  if (text2 === "") return;
  const capped = text2.length > JOB_OUTPUT_MAX ? text2.slice(text2.length - JOB_OUTPUT_MAX) : text2;
  state.jobOutputs.set(jobId, { text: capped, lossy: text2.length > JOB_OUTPUT_MAX, status: state.jobs.get(jobId)?.status ?? "" });
}
function foldJobs(state, events) {
  for (const event of events) {
    const data = event.data;
    if (data === void 0) continue;
    if (event.type === "tool/call") {
      const callId = text(data.callId);
      if (callId === null) continue;
      const invocation = panelInvocation(data.name, data.arguments);
      state.jobInvocations.set(callId, invocation);
      if (!invocation.process) continue;
      const id = `call-${createHash("sha256").update(callId).digest("hex").slice(0, 24)}`;
      linkJobCall(state, callId, id);
      state.jobOrigins.set(id, callId);
      state.jobs.set(id, {
        id,
        label: invocation.label,
        category: "process",
        execution: invocation.background ? "background" : "foreground",
        controllable: false,
        status: "running",
        startedAt: event.time ?? 0
      });
      continue;
    }
    if (event.type === "job/registered" || event.type === "job/settled") {
      const id = text(data.jobId);
      if (id === null) continue;
      if (event.type === "job/registered") {
        const callId = text(data.toolCall?.callId);
        const rootId = text(data.toolCall?.rootCallId) ?? callId;
        const invocation = (callId === null ? void 0 : state.jobInvocations.get(callId)) ?? (rootId === null ? void 0 : state.jobInvocations.get(rootId));
        const temporary = callId === null ? void 0 : [...state.jobCalls.get(callId) ?? []].find((candidate) => state.jobs.get(candidate)?.controllable === false);
        const called = temporary === void 0 ? void 0 : state.jobs.get(temporary);
        if (called?.controllable === false) {
          state.jobs.delete(called.id);
          state.jobOrigins.delete(called.id);
          state.jobCalls.get(callId).delete(called.id);
        }
        const known2 = state.jobs.get(id);
        state.jobs.set(id, {
          id,
          label: called?.label || known2?.label || text(data.label) || "",
          category: isPanelProcess(id, data.kind, invocation) ? "process" : "task",
          execution: invocation?.background === true ? "background" : invocation?.process === true ? "foreground" : "unknown",
          controllable: true,
          status: "running",
          startedAt: number(data.startedAt) ?? known2?.startedAt ?? 0
        });
        if (callId !== null) {
          linkJobCall(state, callId, id);
          state.jobOrigins.set(id, callId);
        }
        if (rootId !== null) linkJobCall(state, rootId, id);
        continue;
      }
      const known = state.jobs.get(id);
      state.jobs.set(id, {
        id,
        label: known?.label ?? text(data.label) ?? "",
        category: known?.category ?? (isPanelProcess(id, data.kind) ? "process" : "task"),
        execution: known?.execution ?? "unknown",
        controllable: true,
        status: text(data.status) ?? "completed",
        startedAt: number(data.startedAt) ?? known?.startedAt ?? 0,
        finishedAt: number(data.finishedAt) ?? void 0,
        detail: text(data.detail) ?? void 0
      });
      continue;
    }
    if (event.type === "tool/result") {
      const callId = text(data.message?.source?.callId);
      if (callId === null) continue;
      const output = messageText(data.message?.content);
      for (const jobId of state.jobCalls.get(callId) ?? []) {
        const known = state.jobs.get(jobId);
        const handedOut = output.includes(`started background job ${jobId}`) || output.includes(`moved to background job ${jobId}]`);
        const live = known.status === "running" || known.status === "stopping";
        const execution = known.execution === "background" || handedOut || known.controllable && live && data.message?.isError !== true ? "background" : known.execution;
        const settled = !known.controllable;
        state.jobs.set(jobId, {
          ...known,
          execution,
          ...settled ? { status: data.message?.isError === true ? "failed" : "completed", finishedAt: event.time ?? known.startedAt } : {}
        });
        if ((settled || !live) && state.jobOrigins.get(jobId) === callId) rememberJobOutput(state, jobId, output);
      }
      continue;
    }
    if (event.type === "user/message") {
      const message = data.message ?? data;
      if (message.source?.kind !== "job") continue;
      const notice = messageText(message.content);
      const match = notice.match(/background job ([A-Za-z0-9_-]+)/);
      if (match === null) continue;
      const known = state.jobs.get(match[1]);
      if (known === void 0) continue;
      state.jobs.set(known.id, { ...known, execution: "background" });
      const at = notice.indexOf("Output:");
      const output = at === -1 ? "" : notice.slice(at + "Output:".length).replace(/^\s*/, "");
      if (output !== "") rememberJobOutput(state, match[1], output);
    }
  }
}
export {
  JOB_OUTPUT_MAX,
  foldJobs,
  messageText,
  rememberJobOutput
};
