/** D111. Git owns the bounded work tree; file-tool backups also cover ignored and external paths. */
import { isDeepStrictEqual } from 'node:util'
import { captureFile, restoreCapturedFile, type Capture } from './session-rewind-store.js'
import { ignoredPaths, pathInWorkspace, treePaths, DEFAULT_MAX_FILE_BYTES, type GitWorkspace } from './session-rewind-git.js'

interface FileBackup {
  capture: Capture
  storage: string
}

export interface PlannedFile extends FileBackup {
  confirmed: Capture
}

export async function planCapturedFiles(
  checkpoints: readonly { captures: Record<string, Capture>, storage?: string }[],
  defaultStorage: string,
  workspace: GitWorkspace | null,
  before: string | undefined,
  changedPaths: readonly { path: string }[],
  skipped: ReadonlySet<string>,
  signal: AbortSignal,
): Promise<Map<string, PlannedFile>> {
  const earliest = new Map<string, FileBackup>()
  for (const checkpoint of checkpoints) {
    for (const [path, capture] of Object.entries(checkpoint.captures)) {
      if (!earliest.has(path)) earliest.set(path, { capture, storage: checkpoint.storage ?? defaultStorage })
    }
  }
  if (workspace && before && earliest.size) {
    const gitPaths = await treePaths(workspace, before, signal)
    for (const { path } of changedPaths) gitPaths.add(path)
    for (const path of skipped) gitPaths.add(path)
    const candidates = new Map<string, string>()
    for (const absolute of earliest.keys()) {
      const path = pathInWorkspace(workspace.root, absolute)
      if (path === null) continue
      if (gitPaths.has(path)) earliest.delete(absolute)
      else candidates.set(path, absolute)
    }
    const ignored = await ignoredPaths(workspace, [...candidates.keys()], signal)
    for (const [path, absolute] of candidates) {
      // Absent from both trees and visible to Git: restoring an intermediate backup would create a file.
      if (!ignored.has(path)) earliest.delete(absolute)
    }
  }
  const planned = new Map<string, PlannedFile>()
  for (const [path, backup] of earliest) {
    const confirmed = await captureFile(path, null, DEFAULT_MAX_FILE_BYTES)
    planned.set(path, { ...backup, confirmed })
  }
  return planned
}

/** Verify every file before the first mutation, retaining its current bytes for failure recovery. */
export async function verifyCapturedFiles(files: Map<string, PlannedFile>, storage: string): Promise<void> {
  for (const [path, file] of files) {
    const current = await captureFile(path, storage, DEFAULT_MAX_FILE_BYTES)
    if (!isDeepStrictEqual(current, file.confirmed)) throw new Error('session rewind: file changed after confirmation: ' + path)
  }
}

export async function restorePlannedFiles(files: Map<string, PlannedFile>, rollbackStorage?: string): Promise<void> {
  for (const [path, file] of files) {
    await restoreCapturedFile(path, rollbackStorage === undefined ? file.capture : file.confirmed, rollbackStorage ?? file.storage)
  }
}
