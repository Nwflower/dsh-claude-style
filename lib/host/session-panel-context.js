// packages/host/src/session-panel-context.ts
function createPanelContext() {
  return { nodes: /* @__PURE__ */ new Map(), mcpShare: 0 };
}
function foldPanelContext(state, events, meter) {
  for (const event of events) {
    if (event.type === "request/header") {
      const tools = event.data?.header?.tools ?? [];
      let total = 0;
      let mcp = 0;
      for (const tool of tools) {
        const weight = JSON.stringify(tool).length;
        total += weight;
        if (tool.name.startsWith("mcp__")) mcp += weight;
      }
      state.mcpShare = total === 0 ? 0 : mcp / total;
    }
    const operation = event.surfaceOp;
    if (operation !== void 0 && operation !== "append") {
      for (const seq of state.nodes.keys()) {
        if (seq >= operation.startSeq && seq <= operation.endSeq) state.nodes.delete(seq);
      }
    }
    const message = event.data;
    if (event.type !== "user/message" || message === void 0 || event.seq === void 0) continue;
    const source = message.source;
    let kind;
    if (source?.kind === "skill-catalog" || source?.kind === "skill-invocation") kind = "skills";
    else if (source?.form === "instructions") kind = "memory";
    else if (source?.kind === "runtime-context") kind = "other";
    else continue;
    if (meter === null || meter === void 0) continue;
    state.nodes.set(event.seq, { kind, tokens: meter.estimateMessage(message) });
  }
}
function panelContextOf(projections, state) {
  const pressure = projections.contextPressure;
  const used = pressure?.projectedTokens ?? pressure?.pressureTokens;
  const window = pressure?.contextWindow;
  if (used === void 0 || window === void 0 || window <= 0) return null;
  const breakdown = projections.contextBreakdown;
  const system = breakdown?.systemTokens ?? 0;
  const tools = breakdown?.toolsTokens ?? 0;
  const messages = breakdown?.messageTokens ?? 0;
  const attributed = /* @__PURE__ */ new Map();
  for (const node of state.nodes.values()) attributed.set(node.kind, (attributed.get(node.kind) ?? 0) + node.tokens);
  const injected = [...attributed.values()].reduce((sum, tokens) => sum + tokens, 0);
  const scale = injected > messages ? messages / injected : 1;
  const mcp = tools * state.mcpShare;
  return {
    used,
    window,
    system,
    tools,
    messages,
    parts: [
      { kind: "messages", tokens: Math.max(0, messages - injected) },
      { kind: "tools", tokens: tools - mcp },
      { kind: "mcp", tokens: mcp },
      { kind: "system", tokens: system },
      ...[...attributed].map(([kind, tokens]) => ({ kind, tokens: tokens * scale }))
    ]
  };
}
export {
  createPanelContext,
  foldPanelContext,
  panelContextOf
};
