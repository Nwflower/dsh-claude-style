// packages/host/src/refresh-loop.ts
function createRefreshLoop(options) {
  let lastAskedAt = 0;
  let timer;
  let refreshing = null;
  function refresh() {
    refreshing ??= options.fetch().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }
  function refreshIfStale() {
    if (options.disposed() || refreshing !== null) return;
    if (Date.now() - options.fetchedAt() <= options.refreshMs) return;
    void refresh();
  }
  function stop() {
    if (timer === void 0) return;
    clearInterval(timer);
    timer = void 0;
  }
  return {
    ensure() {
      lastAskedAt = Date.now();
      refreshIfStale();
      if (timer !== void 0) return;
      timer = setInterval(() => {
        if (Date.now() - lastAskedAt > options.idleMs) {
          stop();
          return;
        }
        void refresh();
      }, options.refreshMs);
      timer.unref?.();
    },
    refreshIfStale,
    refresh,
    stop
  };
}
export {
  createRefreshLoop
};
