// packages/host/src/session-panel-call.ts
var COMMAND_TOOLS = /* @__PURE__ */ new Set(["bash", "pwsh", "terminal_send"]);
var PROCESS_KINDS = /* @__PURE__ */ new Set(["bash", "pwsh", "pty-send"]);
function panelArguments(value) {
  if (typeof value !== "string" || value === "") return null;
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : null;
}
function panelInvocation(name, value) {
  const args = panelArguments(value);
  const process = typeof name === "string" && COMMAND_TOOLS.has(name);
  const label = [args?.description, args?.command, args?.text].find((part) => typeof part === "string" && part !== "");
  return { process, background: args?.run_in_background === true, label: typeof label === "string" ? label : "" };
}
function isPanelProcess(id, kind, invocation) {
  return invocation?.process === true || (typeof kind === "string" ? PROCESS_KINDS.has(kind) : /^(?:bash|pwsh|pty-send)-/.test(id));
}
export {
  isPanelProcess,
  panelArguments,
  panelInvocation
};
