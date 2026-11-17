// packages/host/src/json-document.ts
function asRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}
export {
  asRecord
};
