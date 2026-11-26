// packages/contracts/src/session-rewind.ts
var REWIND_PEER_PACKAGE = "dsh-rewind-plugin";

// packages/host/src/rewind-peer.ts
var FIBER_ACTIVE = 2;
function rewindPeerActive(ctx) {
  const loader = ctx.get("loader");
  if (loader === null || loader === void 0) return false;
  if (typeof loader.entries !== "function") throw new Error("session rewind: the host loader lists no entries");
  for (const entry of loader.entries()) {
    if (entry.options?.name === REWIND_PEER_PACKAGE && entry.fiber?.state === FIBER_ACTIVE) return true;
  }
  return false;
}
export {
  rewindPeerActive
};
