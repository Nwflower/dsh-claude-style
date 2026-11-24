// packages/host/src/session-panel-event.ts
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
export {
  panelArguments
};
