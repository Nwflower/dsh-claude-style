// packages/host/src/session-panel-log.ts
var JOB_OUTPUT_MAX = 8e3;
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
  if (text2 === "" || state.jobOutputs.has(jobId)) return;
  const capped = text2.length > JOB_OUTPUT_MAX ? text2.slice(text2.length - JOB_OUTPUT_MAX) : text2;
  state.jobOutputs.set(jobId, { text: capped, lossy: false, status: state.jobs.get(jobId)?.status ?? "" });
}
function foldJobs(state, events) {
  for (const event of events) {
    const data = event.data;
    if (data === void 0) continue;
    if (event.type === "job/registered" || event.type === "job/settled") {
      const id = text(data.jobId);
      if (id === null) continue;
      if (event.type === "job/registered") {
        const known2 = state.jobs.get(id);
        state.jobs.set(id, {
          id,
          label: known2?.label ?? text(data.label) ?? "",
          status: "running",
          startedAt: number(data.startedAt) ?? known2?.startedAt ?? 0
        });
        const callId = text(data.toolCall?.callId);
        if (callId !== null) state.jobCalls.set(callId, id);
        continue;
      }
      const known = state.jobs.get(id);
      state.jobs.set(id, {
        id,
        label: known?.label ?? text(data.label) ?? "",
        status: text(data.status) ?? "completed",
        startedAt: number(data.startedAt) ?? known?.startedAt ?? 0,
        finishedAt: number(data.finishedAt) ?? void 0,
        detail: text(data.detail) ?? void 0
      });
      continue;
    }
    if (event.type === "tool/result") {
      const callId = text(data.message?.source?.callId);
      const jobId = callId === null ? void 0 : state.jobCalls.get(callId);
      if (jobId === void 0) continue;
      const known = state.jobs.get(jobId);
      if (known === void 0 || known.status === "running" || known.status === "stopping") continue;
      rememberJobOutput(state, jobId, messageText(data.message?.content));
      continue;
    }
    if (event.type === "user/message") {
      const notice = messageText(data.message?.content);
      const match = notice.match(/background job ([A-Za-z0-9_-]+)/);
      if (match === null) continue;
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
