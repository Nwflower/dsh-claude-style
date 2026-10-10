// packages/contracts/src/prefs.ts
var PREFS_DEFAULT = Object.freeze({
  brand: "claude",
  motion: "system",
  collapseFooter: true,
  autoPopover: "all",
  composerScope: "all",
  modelPicker: true,
  peakrate: true,
  quickProviders: [],
  username: "",
  banLocale: "en",
  homeLayout: "studio",
  palette: "claude",
  typeface: "claude",
  mascot: "brand",
  mascotScope: "all",
  permissionsControl: true,
  statsPosition: "inline",
  workspaceView: true,
  dockCards: true,
  sidebarSearch: true,
  searchStyle: "overlay",
  turnStatus: true,
  turnNav: true,
  viewTabs: true,
  headerBand: true,
  chatAnimations: true,
  caretMotion: "typing"
});

// packages/host/src/settings.ts
async function resolveSchemaFactory() {
  try {
    const { createRequire } = await import("node:module");
    const anchor = typeof process.argv[1] === "string" && process.argv[1] !== "" ? process.argv[1] : process.execPath;
    const factory = createRequire(anchor)("@deepseek-ai/schemastery");
    if (factory !== null && factory !== void 0 && typeof factory.object === "function") return factory;
  } catch {
  }
  try {
    const specifier = "@deepseek-ai/schemastery";
    const resolved = await import(specifier);
    const factory = resolved?.default ?? resolved?.Schema ?? null;
    return factory !== null && factory !== void 0 && typeof factory.object === "function" ? factory : null;
  } catch {
    return null;
  }
}
var SchemaFactory = await resolveSchemaFactory();
function volatileField(field) {
  return typeof field?.volatile === "function" ? field.volatile() : field;
}
var PREFS_WITH_EARLIER_TYPE = ["autoPopover", "chatAnimations"];
function prefsField(Schema, key) {
  const value = PREFS_DEFAULT[key];
  const field = PREFS_WITH_EARLIER_TYPE.includes(key) ? Schema.union([Schema.boolean(), Schema.string()]) : Array.isArray(value) ? Schema.array(Schema.string()) : typeof value === "boolean" ? Schema.boolean() : Schema.string();
  return field.default(value);
}
var Config = SchemaFactory === null ? void 0 : SchemaFactory.object(Object.fromEntries(
  Object.keys(PREFS_DEFAULT).map((key) => [key, volatileField(prefsField(SchemaFactory, key))])
));
function registerSettings(ctx) {
  if (typeof ctx.inject !== "function") return;
  ctx.inject(["settings"], (scope) => {
    const settings = scope.settings;
    if (typeof settings?.configure !== "function") return;
    scope.effect(
      () => settings.configure({ auto: false }, ctx.fiber),
      "dsh-claude-style: settings presentation"
    );
  });
}
export {
  Config,
  registerSettings
};
