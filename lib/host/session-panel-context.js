// packages/contracts/src/image-tokens.ts
var PATCH = 14;
var DOWNSAMPLE = 3;
var CELL = PATCH * DOWNSAMPLE;
var MAX_TOKENS = 1024;
var MIN_PIXELS = 544 * 544;
var ROUNDS = 10;
var gridTokens = (height, width) => height * (width + 1) + 2;
var gridCells = (padded) => Math.ceil(Math.floor(padded / PATCH) / DOWNSAMPLE);
function solvedGrid(height, width) {
  const aspect = height / width;
  const idealWidth = Math.sqrt((MAX_TOKENS - 2) / aspect + 0.25) - 0.5;
  const idealHeight = idealWidth * aspect;
  if (idealWidth < 1 || idealHeight < 1) {
    const cellsWide = idealWidth < 1 ? 1 : MAX_TOKENS - 3;
    const cellsHigh = idealWidth < 1 ? Math.floor((MAX_TOKENS - 2) / 2) : 1;
    const solvedWidth = cellsWide * CELL;
    const solvedHeight = cellsHigh * CELL;
    return { tokens: gridTokens(gridCells(solvedHeight), gridCells(solvedWidth)), width: solvedWidth, height: solvedHeight };
  }
  const scale = Math.min(Math.trunc(idealWidth) * CELL / width, Math.trunc(idealHeight) * CELL / height);
  const bestWidth = Math.trunc(width * scale / PATCH) * PATCH;
  const bestHeight = Math.trunc(height * scale / PATCH) * PATCH;
  return { tokens: gridTokens(gridCells(bestHeight), gridCells(bestWidth)), width: bestWidth, height: bestHeight };
}
function resizeOnce(width, height) {
  let scaledWidth = width;
  let scaledHeight = height;
  const pixels = scaledWidth * scaledHeight;
  if (pixels < MIN_PIXELS && pixels > 0) {
    const scale = Math.sqrt(MIN_PIXELS / pixels);
    scaledWidth = Math.trunc(scaledWidth * scale);
    scaledHeight = Math.trunc(scaledHeight * scale);
  }
  const paddedWidth = Math.ceil(scaledWidth / PATCH) * PATCH;
  const paddedHeight = Math.ceil(scaledHeight / PATCH) * PATCH;
  const direct = gridTokens(gridCells(paddedHeight), gridCells(paddedWidth));
  if (direct <= MAX_TOKENS) return { tokens: direct, width: paddedWidth, height: paddedHeight };
  return solvedGrid(scaledHeight, scaledWidth);
}
function imageTokens(width, height) {
  let grid = resizeOnce(width, height);
  for (let round = 1; round < ROUNDS; round += 1) {
    const next = resizeOnce(grid.width, grid.height);
    if (next.width === grid.width && next.height === grid.height) return grid.tokens;
    grid = next;
  }
  return grid.tokens;
}

// packages/contracts/src/tokens.ts
var WORD = [0, 0.496, 0.496, 0.62, 0.62, 0.62, 0.636, 0.636, 0.776, 0.776, 1.593];
var WORD_TAIL = 0.25;
var CJK = 0.5235;
var CJK_MARK = 2.6312;
var DIGIT_GROUP = 1;
var NEWLINE = 1.5161;
var LONE_SPACE = 0.3398;
var SPACE_RUN = 1.421;
var PUNCT_RUN = 0.8153;
var PUNCT_CHAR = 0.1941;
var NONE = 0;
var WIDE = 1;
var WIDE_MARK = 2;
var LETTER = 3;
var DIGIT = 4;
var SPACE = 5;
var PUNCT = 6;
var WIDE_MARK_TEST = /[\p{P}\p{S}]/u;
var WIDE_KINDS = new Uint8Array(65536);
function classOf(code) {
  if (code >= 11904) {
    if (code >= 65536) return WIDE_MARK_TEST.test(String.fromCodePoint(code)) ? WIDE_MARK : WIDE;
    const known = WIDE_KINDS[code];
    if (known !== 0) return known;
    const kind = WIDE_MARK_TEST.test(String.fromCodePoint(code)) ? WIDE_MARK : WIDE;
    WIDE_KINDS[code] = kind;
    return kind;
  }
  if (code >= 48 && code <= 57) return DIGIT;
  if (code >= 65 && code <= 90 || code >= 97 && code <= 122) return LETTER;
  if (code === 32 || code >= 9 && code <= 13) return SPACE;
  return PUNCT;
}
function textTokens(texts) {
  let total = 0;
  let kind = NONE;
  let length = 0;
  let newline = false;
  function close() {
    if (kind === WIDE) total += length * CJK;
    else if (kind === WIDE_MARK) total += length * CJK_MARK;
    else if (kind === LETTER) total += length <= 10 ? WORD[length] : WORD[10] + (length - 10) * WORD_TAIL;
    else if (kind === DIGIT) total += Math.ceil(length / 3) * DIGIT_GROUP;
    else if (kind === SPACE) total += newline ? NEWLINE : length === 1 ? LONE_SPACE : SPACE_RUN;
    else if (kind === PUNCT) total += PUNCT_RUN + length * PUNCT_CHAR;
    kind = NONE;
    length = 0;
    newline = false;
  }
  for (const text of texts) {
    for (let index = 0; index < text.length; index++) {
      let code = text.charCodeAt(index);
      if (code >= 55296 && code <= 56319 && index + 1 < text.length) {
        code = text.codePointAt(index);
        index += 1;
      }
      const next = classOf(code);
      if (next !== kind) {
        close();
        kind = next;
      }
      length += 1;
      if (next === SPACE && (code === 10 || code === 13)) newline = true;
    }
  }
  close();
  return total;
}
var BLOCK_OVERHEAD = 4;
var ROLE_OVERHEAD = 4;
var structuralTokens = (block) => textTokens([JSON.stringify(block) ?? ""]);
function sizedOf(block) {
  const attachment = block.attachment;
  if (attachment === null || typeof attachment !== "object") return null;
  const { width, height } = attachment;
  return typeof width === "number" && typeof height === "number" && Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0 ? { width, height } : null;
}
function blockTokens(block) {
  if (block === null || typeof block !== "object") return BLOCK_OVERHEAD;
  const { type, text, name } = block;
  if (type === "text" || type === "reasoning") {
    return textTokens([typeof text === "string" ? text : ""]) + BLOCK_OVERHEAD;
  }
  if (type === "tool-call") {
    const args = block.arguments;
    return textTokens([typeof name === "string" ? name : "", typeof args === "string" ? args : ""]) + BLOCK_OVERHEAD;
  }
  if (type === "image") {
    const sized = sizedOf(block);
    if (sized !== null) return imageTokens(sized.width, sized.height) + BLOCK_OVERHEAD;
  }
  return structuralTokens(block) + BLOCK_OVERHEAD;
}
function messageTokens(message) {
  const content = message?.content;
  if (!Array.isArray(content) || content.length === 0) return 0;
  let tokens = ROLE_OVERHEAD;
  for (const block of content) tokens += blockTokens(block);
  return Math.round(tokens);
}
function toolSchemaTokens(tool) {
  return Math.round(structuralTokens(tool) + BLOCK_OVERHEAD);
}

// packages/host/src/session-panel-context.ts
var KIND_ORDER = ["system", "tools", "mcp", "user", "assistant", "tool-result", "memory", "skills", "other"];
function createPanelContext() {
  return {
    nodes: /* @__PURE__ */ new Map(),
    sums: { user: 0, assistant: 0, "tool-result": 0, memory: 0, skills: 0, other: 0 },
    system: null,
    tools: 0,
    mcp: 0,
    provider: "",
    model: "",
    reservedOutput: null
  };
}
var SKILL_CONTENT = "<skill_content";
function opensSkill(content) {
  if (!Array.isArray(content)) return false;
  for (const block of content) {
    if (block === null || typeof block !== "object") continue;
    const { type, text } = block;
    if (type !== "text" || typeof text !== "string") continue;
    return text.startsWith(SKILL_CONTENT);
  }
  return false;
}
function kindOf(event, message) {
  switch (event.type) {
    case "system/message":
      return "system";
    case "assistant/message":
      return "assistant";
    case "tool/result":
      return opensSkill(message.content) ? "skills" : "tool-result";
    case "developer/message":
      return message.source?.form === "instructions" ? "memory" : "other";
    case "user/message": {
      const source = message.source;
      if (source?.kind === "skill-catalog" || source?.kind === "skill-invocation") return "skills";
      if (source?.form === "instructions") return "memory";
      if (source?.kind !== void 0 && source.kind !== "" && source.kind !== "user") return "other";
      if (source?.form !== void 0) return "other";
      return "user";
    }
    default:
      return null;
  }
}
function retire(state, startSeq, endSeq) {
  for (const [seq, node] of state.nodes) {
    if (seq < startSeq || seq > endSeq) continue;
    if (node.kind !== "system") state.sums[node.kind] -= node.tokens;
    state.nodes.delete(seq);
  }
  const system = state.system;
  if (system !== null && system.seq >= startSeq && system.seq <= endSeq) state.system = null;
}
function priceTools(state, tools) {
  let plain = 0;
  let mcp = 0;
  for (const tool of tools) {
    const tokens = toolSchemaTokens(tool);
    const name = tool?.name;
    if (typeof name === "string" && name.startsWith("mcp__")) mcp += tokens;
    else plain += tokens;
  }
  state.tools = plain;
  state.mcp = mcp;
}
function foldPanelContext(state, events) {
  for (const event of events) {
    const operation = event.surfaceOp;
    if (operation !== void 0 && operation !== "append") retire(state, operation.startSeq, operation.endSeq);
    const data = event.data;
    if (event.type === "request/header") {
      const tools = data?.header?.tools;
      priceTools(state, Array.isArray(tools) ? tools : []);
      const config = data?.header?.config;
      if (typeof config?.provider === "string") state.provider = config.provider;
      if (typeof config?.model === "string") state.model = config.model;
      state.reservedOutput = typeof config?.maxTokens === "number" && Number.isFinite(config.maxTokens) && config.maxTokens > 0 ? config.maxTokens : null;
      continue;
    }
    if (data === void 0 || event.seq === void 0) continue;
    const message = data.message ?? data;
    const kind = kindOf(event, message);
    if (kind === null) continue;
    const tokens = messageTokens(message);
    if (kind === "system") {
      const previous = state.system;
      if (previous !== null && previous.seq !== event.seq) {
        const kept = state.nodes.get(previous.seq);
        if (kept !== void 0) {
          kept.kind = "other";
          state.sums.other += kept.tokens;
        }
      }
      state.system = { seq: event.seq, tokens };
      state.nodes.set(event.seq, { kind: "system", tokens });
      continue;
    }
    const existing = state.nodes.get(event.seq);
    if (existing !== void 0) retire(state, event.seq, event.seq);
    state.nodes.set(event.seq, { kind, tokens });
    state.sums[kind] += tokens;
  }
}
function panelContextOf(projections, state, thresholdTokens = null) {
  const pressure = projections.contextPressure;
  const used = pressure?.projectedTokens ?? pressure?.pressureTokens;
  const window = pressure?.contextWindow;
  if (used === void 0 || window === void 0 || window <= 0) return null;
  const counts = {
    system: state.system?.tokens ?? 0,
    tools: state.tools,
    mcp: state.mcp,
    user: state.sums.user,
    assistant: state.sums.assistant,
    "tool-result": state.sums["tool-result"],
    memory: state.sums.memory,
    skills: state.sums.skills,
    other: state.sums.other
  };
  const parts = [];
  for (const kind of KIND_ORDER) {
    const tokens = Math.max(0, Math.round(counts[kind]));
    if (tokens > 0) parts.push({ kind, tokens });
  }
  return {
    used,
    window,
    parts,
    ...thresholdTokens !== null && thresholdTokens > 0 ? { compaction: { thresholdTokens } } : {}
  };
}
export {
  createPanelContext,
  foldPanelContext,
  panelContextOf
};
