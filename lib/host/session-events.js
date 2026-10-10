// packages/host/src/session-events.ts
async function readEvents(ctx, sessionId, label) {
  const query = ctx.get("sessionQuery");
  if (query === null || query === void 0 || typeof query.readSession !== "function") return null;
  let snapshot;
  try {
    snapshot = await query.readSession(sessionId);
  } catch (error) {
    const failure = error;
    if (failure?.code !== "SESSION_QUERY_CORRUPT_SESSION" && failure?.code !== "SESSION_QUERY_SESSION_NOT_FOUND") throw error;
    ctx.logger?.warn?.(`dsh-claude-style: session ${sessionId} left out of ${label}: ${failure.message}`);
    return null;
  }
  const events = snapshot?.events;
  return Array.isArray(events) ? events : null;
}
export {
  readEvents
};
