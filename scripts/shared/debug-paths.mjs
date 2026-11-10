/**
 * The homes under `.debug/` (D83). Every tool writes through one of these, and
 * `npm run lint` refuses any other entry at the top of `.debug/`.
 *
 *   tmp/        session scratch, owned and collected by `npm run tmp`
 *   work/       work orders, owned by `npm run work`
 *   cache/      what a tool may rebuild from the tree: build, verify verdicts, generated modules
 *   runs/       what a run leaves behind: reports, traces, captures, scratch homes, the verify lock
 *   worktrees/  scratch worktrees, owned by `scripts/dev/worktree.mjs`
 */
import path from 'node:path'

export const DEBUG_HOMES = ['tmp', 'work', 'cache', 'runs', 'worktrees']

export const debugPath = (root, ...parts) => path.join(root, '.debug', ...parts)
export const cachePath = (root, ...parts) => debugPath(root, 'cache', ...parts)
export const runsPath = (root, ...parts) => debugPath(root, 'runs', ...parts)
