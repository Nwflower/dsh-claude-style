/** D111. Batch quota checks off the turn queue and give each sweep a stable set of roots. */
export class RewindMaintenance {
  private readonly dirty = new Set<string>()
  private timer?: ReturnType<typeof setTimeout>
  private sweeping: Promise<void> = Promise.resolve()
  private users = 0
  private stopped = false
  private checking = false

  constructor(
    private readonly overQuota: (directory: string) => Promise<boolean>,
    private readonly prune: (directory: string) => Promise<void>,
    private readonly report: (error: unknown) => void,
  ) {}

  async use<T>(work: () => Promise<T>): Promise<T> {
    this.users++
    try {
      await this.sweeping
      return await work()
    } finally {
      this.users--
    }
  }

  schedule(directory: string): void {
    if (this.stopped) return
    this.dirty.add(directory)
    this.arm()
  }

  private arm(): void {
    if (this.timer || this.checking || this.stopped || this.dirty.size === 0) return
    this.timer = setTimeout(() => { void this.check() }, 60_000)
    this.timer.unref()
  }

  private async check(): Promise<void> {
    this.timer = undefined
    this.checking = true
    const directories = [...this.dirty]
    this.dirty.clear()
    try {
      for (const directory of directories) {
        try {
          // An ordinary size scan can run alongside recorders; only deletion needs a stable root set.
          if (!await this.overQuota(directory) || this.stopped) continue
          if (this.users > 0) this.dirty.add(directory)
          else {
            // Isolate a failed sweep from the tools waiting for it (D12).
            this.sweeping = this.prune(directory).catch(this.report)
            await this.sweeping
          }
        } catch (error) {
          this.report(error)
        }
      }
    } finally {
      this.checking = false
      this.arm()
    }
  }

  dispose(): void {
    this.stopped = true
    clearTimeout(this.timer)
    this.dirty.clear()
  }
}
