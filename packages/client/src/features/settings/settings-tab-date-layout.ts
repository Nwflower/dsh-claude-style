import * as React from 'react'
import { workspaceNames } from '../date-groups/date-groups'
import { copy } from './copy'
import type { SettingsRow, SettingsTab, SettingsView } from './settings-controls'

/**
 * The settings page's Date layout tab: which workspaces the date layout leaves alone.
 *
 * 日期视图把所有会话按天排队，可有些工作区本来就是随手记的地方（默认「闲聊」），
 * 按天排反而更难找。这里给每个工作区一行开关：开着 = 进日期排列，关掉 = 让开。
 * 选中结果是一份工作区标题的列表（packages/contracts/src/prefs.ts 的
 * dateSkipWorkspaces），日期视图每次重排都读它一次。
 *
 * 工作区标题来自 date-groups 收的那份小仓库：设置页没有宿主的 workspaces 句柄，
 * 而那个功能有。新开的工作区在下次打开这一页时出现。
 */
export function createSettingsDateLayoutTab(): SettingsTab {
  const rows = (view: SettingsView): SettingsRow[] => {
    const prefs = view.prefs
    const write = view.write
    const controls = view.controls
    const skip = prefs.dateSkipWorkspaces
    const names = workspaceNames()
    if (names.length === 0) {
      // 一个工作区都还没有：这一页先说实话，别画一排空行。
      return [{
        rank: 10,
        node: controls.row('dateSkipEmpty', copy('dateSkipEmptyTitle'), copy('dateSkipEmptyDesc'), null),
      }]
    }
    return names.map((name, index) => {
      const skipped = skip.includes(name)
      return {
        rank: (index + 1) * 10,
        node: controls.row(
          'dateSkip:' + name,
          name,
          copy('dateSkipRowDesc'),
          controls.toggle(!skipped, on => {
            // 开 = 进日期排列（从名单里去掉），关 = 让开（加进名单）。
            const next = on ? skip.filter(title => title !== name) : [...skip, name]
            write({ dateSkipWorkspaces: next })
          }),
        ),
      }
    })
  }
  return { id: 'date-layout', label: () => copy('tabDateLayout'), rows }
}
