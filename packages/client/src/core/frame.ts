/**
 * The frame pipeline (D40): every frame callback the skin needs goes through
 * one `requestAnimationFrame`, split into a read phase and a write phase.
 * Every task's `read` runs first, then every task's `write`, so the features
 * measure the layout the frame started with and never force a layout between
 * each other's writes. A `write` may still read; it then sees the writes made
 * before it in this frame.
 *
 * A task asked for while a frame runs belongs to the next frame. A task
 * cancelled while its frame runs is not called again in that frame. A task
 * that throws is reported and the rest of the frame runs (D12).
 */
export interface FrameTask {
  read?(now: number): void
  write?(now: number): void
}

/** The tasks the next frame runs, in request order. */
let queued: FrameTask[] = []
/** The tasks still wanted: cancelling removes a task here, so a running frame skips it. */
const live = new Set<FrameTask>()
let handle = 0

function runFrame(now: number) {
  handle = 0
  const tasks = queued
  queued = []
  for (const task of tasks) {
    if (task.read === undefined || !live.has(task)) continue
    try { task.read(now) } catch (error) { reportError(error) }
  }
  for (const task of tasks) {
    if (!live.has(task)) continue
    live.delete(task)
    if (task.write === undefined) continue
    try { task.write(now) } catch (error) { reportError(error) }
  }
}

/**
 * Run a task on the next frame.
 * @returns cancel: the task does not run, or does not run its remaining phase.
 */
export function requestFrame(task: FrameTask) {
  if (live.has(task)) throw new Error('frame: this task is already requested')
  live.add(task)
  queued.push(task)
  if (handle === 0) handle = requestAnimationFrame(runFrame)
  return () => {
    live.delete(task)
    const at = queued.indexOf(task)
    if (at !== -1) queued.splice(at, 1)
    if (queued.length === 0 && handle !== 0) {
      cancelAnimationFrame(handle)
      handle = 0
    }
  }
}
