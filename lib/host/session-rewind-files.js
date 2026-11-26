// packages/host/src/session-rewind-files.ts
import { isDeepStrictEqual } from "node:util";
import { captureFile, restoreCapturedFile } from "./session-rewind-store.js";
import { ignoredPaths, pathInWorkspace, treePaths, DEFAULT_MAX_FILE_BYTES } from "./session-rewind-git.js";
async function planCapturedFiles(checkpoints, defaultStorage, workspace, before, changedPaths, skipped, signal) {
  const earliest = /* @__PURE__ */ new Map();
  for (const checkpoint of checkpoints) {
    for (const [path, capture] of Object.entries(checkpoint.captures)) {
      if (!earliest.has(path)) earliest.set(path, { capture, storage: checkpoint.storage ?? defaultStorage });
    }
  }
  if (workspace && before && earliest.size) {
    const gitPaths = await treePaths(workspace, before, signal);
    for (const { path } of changedPaths) gitPaths.add(path);
    for (const path of skipped) gitPaths.add(path);
    const candidates = /* @__PURE__ */ new Map();
    for (const absolute of earliest.keys()) {
      const path = pathInWorkspace(workspace.root, absolute);
      if (path === null) continue;
      if (gitPaths.has(path)) earliest.delete(absolute);
      else candidates.set(path, absolute);
    }
    const ignored = await ignoredPaths(workspace, [...candidates.keys()], signal);
    for (const [path, absolute] of candidates) {
      if (!ignored.has(path)) earliest.delete(absolute);
    }
  }
  const planned = /* @__PURE__ */ new Map();
  for (const [path, backup] of earliest) {
    const confirmed = await captureFile(path, null, DEFAULT_MAX_FILE_BYTES);
    planned.set(path, { ...backup, confirmed });
  }
  return planned;
}
async function verifyCapturedFiles(files, storage) {
  for (const [path, file] of files) {
    const current = await captureFile(path, storage, DEFAULT_MAX_FILE_BYTES);
    if (!isDeepStrictEqual(current, file.confirmed)) throw new Error("session rewind: file changed after confirmation: " + path);
  }
}
async function restorePlannedFiles(files, rollbackStorage) {
  for (const [path, file] of files) {
    await restoreCapturedFile(path, rollbackStorage === void 0 ? file.capture : file.confirmed, rollbackStorage ?? file.storage);
  }
}
export {
  planCapturedFiles,
  restorePlannedFiles,
  verifyCapturedFiles
};
