import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'

/**
 * 消息控件行里的两个按钮，画成宿主自己的按钮：标签走宿主的 Tooltip
 * （primitives 包，与复制按钮同一份），图标是本地的一笔路径。
 *
 * 用 React 渲染是因为 Tooltip 只有组件一种用法；宿主自己的按钮也长在同一棵
 * 树上，两边悬停时出来的提示因此是同一个样式。
 */

/** 两个按钮自己的标记，值说明是哪一个。 */
export const ACTION_BUTTON_ATTRIBUTE = 'data-dsh-claude-message-action'
export const ACTION_BUTTON_CLASS = 'dsh-claude-message-action'
/** 承载两个按钮的盒子：contents 盒子，宿主那一行的排布因此不变。 */
export const BUTTONS_SEAT_ATTRIBUTE = 'data-dsh-claude-message-actions'
export const BUTTONS_SEAT_CLASS = 'dsh-claude-message-actions'
/** 撤回：一段往回折的箭头。 */
const RETRACT_PATH = 'M4.5 6.5H10a4 4 0 0 1 0 8H7M4.5 6.5 7 4M4.5 6.5 7 9'
/** 编辑：一支笔。 */
const EDIT_PATH = 'M10.8 2.7 13.3 5.2 5.8 12.7 2.9 13.4 3.6 10.5ZM9.6 3.9 12.1 6.4'
/** 重跑：沿原方向再走一次的环形箭头。 */
const RERUN_PATH = 'M13.5 5.5V2.8m0 2.7h-2.7M13.2 5.2a5.5 5.5 0 1 0 1 5.2'
/** 删除此轮：一个叉。 */
const DELETE_PATH = 'M4 4l8 8M12 4l-8 8'

export interface MessageActionLabels {
  retract: string
  edit: string
  rerun: string
  delete: string
}

export interface MessageActionHandlers {
  retract?(): void
  edit?(): void
  rerun?(): void
  delete?(): void
}

function icon(path: string) {
  return React.createElement('svg', {
    viewBox: '0 0 16 16',
    width: 15,
    height: 15,
    'aria-hidden': true,
    focusable: 'false',
  }, React.createElement('path', {
    d: path,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }))
}

function action(kind: 'retract' | 'edit' | 'rerun' | 'delete', label: string, path: string, press: () => void) {
  return React.createElement(primitives.Tooltip, {
    label,
    side: 'bottom',
    children: React.createElement('button', {
      type: 'button',
      className: ACTION_BUTTON_CLASS,
      [ACTION_BUTTON_ATTRIBUTE]: kind,
      'aria-label': label,
      onClick: (event: React.MouseEvent) => {
        event.stopPropagation()
        press()
      },
    }, icon(path)),
  })
}

/** 每一行只画它支持的动作；回答行是重跑与删除，用户行是撤回与编辑。 */
export function MessageActionButtons({ labels, handlers }: { labels: MessageActionLabels, handlers: MessageActionHandlers }) {
  return React.createElement(React.Fragment, null,
    handlers.rerun === undefined ? null : action('rerun', labels.rerun, RERUN_PATH, handlers.rerun),
    handlers.retract === undefined ? null : action('retract', labels.retract, RETRACT_PATH, handlers.retract),
    handlers.edit === undefined ? null : action('edit', labels.edit, EDIT_PATH, handlers.edit),
    handlers.delete === undefined ? null : action('delete', labels.delete, DELETE_PATH, handlers.delete))
}
