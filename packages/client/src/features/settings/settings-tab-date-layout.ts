import { hostWorkspaces } from '@dsh-claude-style/engine/host'
import { copy } from './copy'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { HostWorkspacesService } from '@dsh-claude-style/contracts/services'
import type { SettingsRow, SettingsTab, SettingsView } from './settings-controls'

/**
 * The settings page's Date layout tab: which workspaces the date layout leaves alone.
 *
 * 日期视图把所有会话按天排队，可有些工作区本来就是随手记的地方，按天排反而更难找。
 * 这里给每个工作区一行开关：开着 = 进日期排列，关掉 = 让开。选中结果是一份工作区
 * 标识的列表（packages/contracts/src/prefs.ts 的 dateSkipWorkspaces），日期视图每次
 * 重排都读它一次。
 *
 * 工作区清单由这一页自己从宿主的 workspaces 服务读：日期视图那边被它自己的开关管着，
 * 关掉之后就不在页面上，设置页不能指望它替自己带数据。
 */

/** One workspace the date layout can leave alone. */
export interface KnownWorkspace {
  id: string
  title: string
}

let known: readonly KnownWorkspace[] = []
const listeners = new Set<() => void>()

/** The workspaces the date layout can leave alone, in the host's own order. */
export function knownWorkspaces() {
  return known
}

/** Called whenever that list changes; returns the unsubscribe. */
export function onKnownWorkspaces(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** 换一批；和手上的一样就不叫。 */
function publish(next: KnownWorkspace[]) {
  const same = next.length === known.length && next.every((item, at) => item.id === known[at]?.id && item.title === known[at]?.title)
  if (same) return
  known = next
  for (const listener of listeners) listener()
}

/**
 * 读宿主的 workspaces 服务，并在它变化时把这一份带到最新。
 *
 * @param ctx - host plugin context, for the service lookup.
 * @returns the unsubscribe; a page without that service keeps the empty list.
 */
export function attachWorkspaces(ctx: HostContext): () => void {
  const service: HostWorkspacesService | null = hostWorkspaces(ctx)
  if (service === null) return () => {}
  const read = () => {
    const snapshot = typeof service.list?.getSnapshot === 'function' ? service.list.getSnapshot() : undefined
    if (snapshot === undefined || snapshot === null || snapshot.phase === 'pending') return
    if (!Array.isArray(snapshot.items)) return
    const next: KnownWorkspace[] = []
    for (const row of snapshot.items) {
      if (typeof row.workspaceId === 'string' && typeof row.title === 'string') next.push({ id: row.workspaceId, title: row.title })
    }
    publish(next)
  }
  read()
  const stop = typeof service.list?.subscribe === 'function' ? service.list.subscribe(read) : null
  // 摘掉订阅就够：另一份设置实例可能还在页面上，清空会把它的行也一起抽走。
  return () => { if (stop !== null) stop() }
}

export function createSettingsDateLayoutTab(): SettingsTab {
  const rows = (view: SettingsView): SettingsRow[] => {
    const prefs = view.prefs
    const write = view.write
    const controls = view.controls
    const skip = prefs.dateSkipWorkspaces
    const names = knownWorkspaces()
    if (names.length === 0) {
      // 一个工作区都还没有（或宿主还没有答出来）：这一页先说实话，别画一排空行。
      return [{
        rank: 10,
        node: controls.row('dateSkipEmpty', copy('dateSkipEmptyTitle'), copy('dateSkipEmptyDesc'), null),
      }]
    }
    return names.map((workspace, index) => {
      const skipped = skip.includes(workspace.id)
      return {
        rank: (index + 1) * 10,
        node: controls.row(
          'dateSkip:' + workspace.id,
          workspace.title,
          copy('dateSkipRowDesc'),
          controls.toggle(!skipped, on => {
            // 开 = 进日期排列（从名单里去掉），关 = 让开（加进名单）。
            const next = on ? skip.filter(id => id !== workspace.id) : [...skip, workspace.id]
            write({ dateSkipWorkspaces: next })
          }),
        ),
      }
    })
  }
  return { id: 'date-layout', label: () => copy('tabDateLayout'), rows }
}
