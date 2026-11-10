/**
 * Which workspace rows carry a running conversation's mark.
 *
 * The host renders a workspace's session rows only while that workspace stands
 * open (ui-workspace drops them from the grouped tree otherwise), so a running
 * session inside a closed workspace leaves nothing on the page to read. The
 * answer comes from the host's own lists instead: the sessions each workspace
 * accounts, and every session running now. Under the workspace-tree grouping a
 * workspace may sit inside another by its directory, and a closed parent hides
 * its child workspaces too, so a running session marks every ancestor on the
 * way up. A session no workspace accounts stands in the host's ungrouped
 * bucket, whose key is the empty string.
 */

/** One workspace as the mark reads it: the host's id, its directory, and its sessions. */
export interface RunningWorkspace {
  workspaceId: string
  path: string
  sessionIds: readonly string[]
}

/** The host's own spelling of a directory (ui-workspace's folderPath). */
function folderPath(path: string) {
  return (/^[A-Za-z]:[/\\]/.test(path) || path.startsWith('\\\\') ? path.replaceAll('\\', '/') : path).replace(/\/+$/, '')
}

/**
 * The nearest registered ancestor directory, by the host's own rule: the
 * longest registered path that contains this one, compared on directory
 * boundaries so `C:/work/app` is not inside `C:/work/a`.
 */
function owningParent(path: string, paths: readonly string[]): string | undefined {
  const child = folderPath(path)
  let owner: string | undefined
  let length = -1
  for (const candidate of paths) {
    const root = folderPath(candidate)
    if (root.length > length && child !== root && child.startsWith(`${root}/`)) {
      owner = candidate
      length = root.length
    }
  }
  return owner
}

/**
 * @param workspaces - the host's Workspace list, each with the sessions it accounts.
 * @param running - the sessions running right now, subagent sessions left out.
 * @param nested - whether the host groups the list as a workspace tree.
 * @returns the workspace ids whose row carries the mark, and '' for the ungrouped bucket.
 */
export function runningWorkspaces(workspaces: readonly RunningWorkspace[], running: ReadonlySet<string>, nested: boolean): Set<string> {
  const accounted = new Set<string>()
  const marked = new Set<string>()
  for (const workspace of workspaces) {
    for (const id of workspace.sessionIds) {
      accounted.add(id)
      if (running.has(id)) marked.add(workspace.workspaceId)
    }
  }
  if (nested) {
    const paths = workspaces.map(workspace => workspace.path)
    const idByPath = new Map<string, string>()
    for (const workspace of workspaces) idByPath.set(folderPath(workspace.path), workspace.workspaceId)
    const parents = new Map<string, string>()
    for (const workspace of workspaces) {
      const parent = owningParent(workspace.path, paths)
      const parentId = parent === undefined ? undefined : idByPath.get(folderPath(parent))
      if (parentId !== undefined) parents.set(workspace.workspaceId, parentId)
    }
    for (const id of [...marked]) {
      for (let parent = parents.get(id); parent !== undefined; parent = parents.get(parent)) marked.add(parent)
    }
  }
  for (const id of running) if (!accounted.has(id)) marked.add('')
  return marked
}
