import { SESSION_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { subscribeMutations } from '@dsh-claude-style/engine/bus'

/** 侧栏那一块（宿主的 slot 名字）：只有它里面的变化才值得重排一遍。 */
const SIDEBAR_SELECTOR = '[data-slot="sidebar"]'

/** 只响应侧栏及新会话行；`skipQuiet` 防止皮肤自身写入反复触发调度。 */
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
