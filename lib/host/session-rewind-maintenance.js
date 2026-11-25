// packages/host/src/session-rewind-maintenance.ts
var RewindMaintenance = class {
  constructor(overQuota, prune, report) {
    this.overQuota = overQuota;
    this.prune = prune;
    this.report = report;
  }
  overQuota;
  prune;
  report;
  dirty = /* @__PURE__ */ new Set();
  timer;
  sweeping = Promise.resolve();
  users = 0;
  stopped = false;
  checking = false;
  async use(work) {
    this.users++;
    try {
      await this.sweeping;
      return await work();
    } finally {
      this.users--;
    }
  }
  schedule(directory) {
    if (this.stopped) return;
    this.dirty.add(directory);
    this.arm();
  }
  arm() {
    if (this.timer || this.checking || this.stopped || this.dirty.size === 0) return;
    this.timer = setTimeout(() => {
      void this.check();
    }, 6e4);
    this.timer.unref();
  }
  async check() {
    this.timer = void 0;
    this.checking = true;
    const directories = [...this.dirty];
    this.dirty.clear();
    try {
      for (const directory of directories) {
        try {
          if (!await this.overQuota(directory) || this.stopped) continue;
          if (this.users > 0) this.dirty.add(directory);
          else {
            this.sweeping = this.prune(directory).catch(this.report);
            await this.sweeping;
          }
        } catch (error) {
          this.report(error);
        }
      }
    } finally {
      this.checking = false;
      this.arm();
    }
  }
  dispose() {
    this.stopped = true;
    clearTimeout(this.timer);
    this.dirty.clear();
  }
};
export {
  RewindMaintenance
};
