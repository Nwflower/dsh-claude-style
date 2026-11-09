/**
 * Shared read → scroll → write frame phases (D40); scroll writes run before layout-invalidating writes.
 * Requests during a frame wait for the next; cancellation skips remaining phases; errors are isolated (D12).
 */
export interface FrameTask {
  read?(now: number): void
  scroll?(now: number): void
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
    if (task.scroll === undefined || !live.has(task)) continue
    try { task.scroll(now) } catch (error) { reportError(error) }
  }
  for (const task of tasks) {
    if (!live.has(task)) continue
    live.delete(task)
    if (task.write === undefined) continue
    try { task.write(now) } catch (error) { reportError(error) }
  }
}

/** Queue for the next frame; returned cancellation also skips remaining phases of a running task. */
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
