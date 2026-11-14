// packages/contracts/src/compaction.ts
var positive = (value) => typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
var nonNegative = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
function compactionThreshold(inputs) {
  const window = positive(inputs.contextWindow);
  const ratio = positive(inputs.policy?.thresholdRatio);
  if (window === null || ratio === null || ratio > 1) return null;
  const headroom = nonNegative(inputs.policy?.headroomTokens) ?? 0;
  const reserved = nonNegative(inputs.reservedOutput) ?? nonNegative(inputs.policy?.maxTokens) ?? 0;
  const pressureBudget = window - reserved - headroom;
  if (pressureBudget <= 0) return null;
  return Math.floor(Math.min(window * ratio, pressureBudget));
}
var DEFAULT_COMPACTION_POLICY = { thresholdRatio: 0.8, headroomTokens: 65536 };

// packages/host/src/session-compact.ts
var COMPACT_COMMAND = "/compact";
var isRecord = (value) => value !== null && typeof value === "object";
function policyOf(config, provider, model) {
  if (!isRecord(config)) return DEFAULT_COMPACTION_POLICY;
  const overrides = Array.isArray(config.modelPolicies) ? config.modelPolicies : [];
  const match = overrides.find((entry) => isRecord(entry) && entry.provider === provider && entry.model === model);
  const stated = isRecord(match) ? match : {};
  return {
    thresholdRatio: stated.thresholdRatio ?? config.thresholdRatio ?? DEFAULT_COMPACTION_POLICY.thresholdRatio,
    headroomTokens: stated.headroomTokens ?? config.headroomTokens ?? DEFAULT_COMPACTION_POLICY.headroomTokens,
    maxTokens: stated.maxTokens ?? config.maxTokens ?? DEFAULT_COMPACTION_POLICY.maxTokens
  };
}
function backendConfigOf(ctx, agent) {
  const agentScope = agent?.ctx;
  const fromAgent = agentScope?.get?.("compaction");
  if (isRecord(fromAgent)) return fromAgent.config;
  const fromRoot = ctx.get?.("compaction");
  return isRecord(fromRoot) ? fromRoot.config : void 0;
}
function compactionThresholdOf(ctx, agents, sessionId, state, window) {
  const policy = policyOf(backendConfigOf(ctx, agents?.get?.(sessionId)), state.provider, state.model);
  return compactionThreshold({ contextWindow: window, reservedOutput: state.reservedOutput, policy });
}
async function compactSession(ctx, sessionId) {
  const agent = ctx.get("agents")?.get?.(sessionId);
  if (agent === void 0) return { ok: false, code: "no-agent" };
  const commands = ctx.get("commands");
  if (typeof commands?.execute !== "function") return { ok: false, code: "unavailable" };
  const execution = await commands.execute(agent, COMPACT_COMMAND, [], new AbortController().signal);
  if (execution === void 0) return { ok: false, code: "unavailable" };
  const result = execution.result ?? {};
  const text = typeof result.text === "string" && result.text !== "" ? result.text : void 0;
  return result.kind === "success" ? { ok: true, ...text === void 0 ? {} : { text } } : { ok: false, ...text === void 0 ? {} : { text } };
}
export {
  compactSession,
  compactionThresholdOf
};
