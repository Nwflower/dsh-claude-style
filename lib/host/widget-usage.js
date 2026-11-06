// packages/host/src/widget-usage.ts
import { createUsage } from "./usage.js";
var WIDGET_USAGE_CAPABILITY = "usage";
var WIDGET_USAGE_PROVIDER = "dsh-claude-style";
var WIDGET_BOARD_API_VERSION = 3;
var WIDGET_BOARD_SERVICE = "widgetBoard";
var WIDGET_USAGE_WAIT_MS = 12e3;
var NUMBER = { type: "number", minimum: 0 };
var WIDGET_USAGE_INPUT = { type: "object", additionalProperties: false, properties: {} };
var WIDGET_USAGE_OUTPUT = {
  type: "object",
  additionalProperties: false,
  required: ["ready", "computedAt", "error", "days", "models", "hours", "totals", "firstDay", "lastDay"],
  properties: {
    ready: { type: "boolean" },
    computedAt: { type: ["number", "null"] },
    error: { type: ["string", "null"] },
    days: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["date", "input", "output", "cacheRead", "cacheWrite", "calls", "sessions"],
        properties: {
          date: { type: "string" },
          input: NUMBER,
          output: NUMBER,
          cacheRead: NUMBER,
          cacheWrite: NUMBER,
          calls: NUMBER,
          sessions: NUMBER,
          hours: { type: "array", items: NUMBER }
        }
      }
    },
    models: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "tokens"],
        properties: { id: { type: "string" }, tokens: NUMBER }
      }
    },
    hours: { type: ["array", "null"], items: NUMBER },
    totals: {
      type: "object",
      additionalProperties: false,
      required: ["input", "output", "cacheRead", "cacheWrite", "calls", "sessions", "activeDays"],
      properties: {
        input: NUMBER,
        output: NUMBER,
        cacheRead: NUMBER,
        cacheWrite: NUMBER,
        calls: NUMBER,
        sessions: NUMBER,
        activeDays: NUMBER
      }
    },
    firstDay: { type: ["string", "null"] },
    lastDay: { type: ["string", "null"] }
  }
};
function count(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}
function pending(error) {
  return {
    ready: false,
    computedAt: null,
    error,
    days: [],
    models: [],
    hours: null,
    totals: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, calls: 0, sessions: 0, activeDays: 0 },
    firstDay: null,
    lastDay: null
  };
}
function widgetUsageAnswer(value) {
  const days = Array.isArray(value.days) ? value.days : [];
  const totals = value.totals ?? {};
  const hours = Array.isArray(value.hours) ? Array.from({ length: 24 }, (_, hour) => count(value.hours?.[hour])) : null;
  return {
    ready: true,
    computedAt: typeof value.computedAt === "number" ? value.computedAt : null,
    error: null,
    days: days.map((day) => ({
      date: String(day.date ?? ""),
      input: count(day.input),
      output: count(day.output),
      cacheRead: count(day.cacheRead),
      cacheWrite: count(day.cacheWrite),
      calls: count(day.calls),
      sessions: count(day.sessions),
      ...Array.isArray(day.hours) ? { hours: Array.from({ length: 24 }, (_, hour) => count(day.hours[hour])) } : {}
    })),
    models: (Array.isArray(value.models) ? value.models : []).map((model) => ({
      id: String(model.id ?? ""),
      tokens: count(model.tokens)
    })),
    hours,
    totals: {
      input: count(totals.input),
      output: count(totals.output),
      cacheRead: count(totals.cacheRead),
      cacheWrite: count(totals.cacheWrite),
      calls: count(totals.calls),
      sessions: count(totals.sessions),
      activeDays: count(totals.activeDays)
    },
    firstDay: typeof value.firstDay === "string" ? value.firstDay : null,
    lastDay: typeof value.lastDay === "string" ? value.lastDay : null
  };
}
async function waitForSummary(usage, signal) {
  const deadline = Date.now() + WIDGET_USAGE_WAIT_MS;
  let snapshot = usage.snapshot();
  while (snapshot.value === null && !signal.aborted && Date.now() < deadline) {
    usage.refresh();
    await new Promise((resolve) => setTimeout(resolve, 250));
    snapshot = usage.snapshot();
    if (snapshot.value === null && snapshot.computing !== true && snapshot.error !== void 0) return snapshot;
  }
  return snapshot;
}
function registerWidgetUsage(ctx) {
  const register = (scope) => {
    const board = scope.get(WIDGET_BOARD_SERVICE);
    if (board === void 0 || board.apiVersion !== WIDGET_BOARD_API_VERSION) return;
    const usage = createUsage(ctx);
    ctx.effect?.(() => {
      usage.dispose();
    });
    board.registerCapability({
      apiVersion: WIDGET_BOARD_API_VERSION,
      provider: WIDGET_USAGE_PROVIDER,
      id: WIDGET_USAGE_CAPABILITY,
      title: { zh: "\u7528\u91CF\u6C47\u603B", en: "Usage roll-up" },
      description: {
        zh: "\u8BFB\u53D6\u672C\u63D2\u4EF6\u5DF2\u7ECF\u6298\u597D\u7684\u4F1A\u8BDD\u7528\u91CF\uFF1A\u6BCF\u5929\u7684\u5206\u6876\u3001\u6309\u5C0F\u65F6\u7684\u7ED3\u7B97\u6B21\u6570\u4E0E\u5404\u6A21\u578B\u7684 token \u603B\u91CF\u3002",
        en: "Reads the session usage this plugin has already folded: per-day buckets, hourly settlements and per-model token totals."
      },
      permission: {},
      input: WIDGET_USAGE_INPUT,
      output: WIDGET_USAGE_OUTPUT,
      timeoutMs: 14e3,
      async call(_instance, _args, signal) {
        const snapshot = await waitForSummary(usage, signal);
        if (snapshot.value === null) return pending(snapshot.error ?? null);
        return widgetUsageAnswer(snapshot.value);
      }
    });
  };
  if (typeof ctx.inject === "function") ctx.inject([WIDGET_BOARD_SERVICE], register);
  else register(ctx);
}
export {
  WIDGET_USAGE_CAPABILITY,
  WIDGET_USAGE_PROVIDER,
  registerWidgetUsage,
  widgetUsageAnswer
};
