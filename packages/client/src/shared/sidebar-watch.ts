import { SESSION_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { subscribeMutations } from '@dsh-claude-style/engine/bus'

/** 侧栏那一块（宿主的 slot 名字）：只有它里面的变化才值得重排一遍。 */
const SIDEBAR_SELECTOR = '[data-slot="sidebar"]'

/**
 * 只在侧栏里变了才叫醒一遍。
 *
 * 宿主的会话行、顶行、列表容器都在侧栏这一块里重建；聊天流、首页卡片的大块重画
 * 与侧栏无关，跟着排一遍只会让页面安定不下来（读者不动时 scheduler 不该还在跑）。
 * 我们自己插的节点都带静音标记，`skipQuiet` 把那些记录滤掉，写入不会自激。
 *
 * @param schedule - 侧栏真的变了时叫醒的那一遍。
 * @returns 退订函数。
 */
export function watchSidebar(schedule: () => void): () => void {
  return subscribeMutations(document.body, { childList: true, subtree: true, skipQuiet: true }, records => {
    for (const record of records) {
      const target = record.target instanceof Element ? record.target : record.target.parentElement
      // 变化就发生在侧栏里（行被换掉、列表被重画、段落被宿主挤掉）。
      if (target !== null && target.closest(SIDEBAR_SELECTOR) !== null) {
        schedule()
        return
      }
      // 整块侧栏被换掉：新节点自己带着会话行。
      for (const node of record.addedNodes) {
        if (node instanceof Element && (node.matches(SESSION_ROW_SELECTOR) || node.querySelector(SESSION_ROW_SELECTOR) !== null)) {
          schedule()
          return
        }
      }
    }
  })
}
