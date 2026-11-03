import { DATE_VIEW_TOGGLE_EVENT } from '../date-groups/date-groups'
import { readPrefs, subscribePrefs } from '../../core/prefs'
import { observeMatches } from '@dsh-claude-style/engine/bus'
import { buildElement } from '@dsh-claude-style/engine/dom'
import { QUIET_ATTR } from '../../constants'
import { copy } from './copy'
import { watchSidebar } from '../../shared/sidebar-watch'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import type { HostContext } from '@dsh-claude-style/engine/host'

/**
 * The sidebar's workspace section header: the bell that switches the date view.
 *
 * 铃铛只做一件事：按下去把整个列表在「工作区 + 会话」和「按日期」之间换一次。
 * 日期视图开着时它带一层品牌色背光，读者一眼看出现在是哪种排法。
 *
 * 位置在宿主的「工作区」标题行右端，插在它自己的两枚分区动作之前：那一行本来就是
 * 分区的动作区，铃铛和它们同排读成一组。标题行只在侧栏宽的时候画出来，窄栏里铃铛
 * 就不挂。
 *
 * 搜索不从这一行给入口：皮肤自己的搜索框在「覆盖品牌」与「独立」两种风格里各就
 * 各位，`icon` 风格下宿主自己的搜索按钮就站在这一行，三种都已有入口，再加一枚只会
 * 重复。
 */

/** 日期视图开着：铃铛读它画按下态（无障碍也读它）。 */
const DATE_VIEW_ATTRIBUTE = 'data-dsh-claude-date-groups'
/** 分区的标题行（parts-table 的 section-header）。 */
const SECTION_HEADER_SELECTOR = '[data-dsh-claude-part~="section-header"]'
/** 标题行里的「工作区」小字：宿主在窄栏里不画它，那铃铛也就没有座位。 */
const SECTION_LABEL_SELECTOR = '[data-dsh-claude-part~="section-label"]'
/** 宿主自己的两枚分区动作（筛选与新建工作区）：铃铛插在它们前面。 */
const SECTION_ACTIONS_SELECTOR = '[data-dsh-claude-part~="section-actions"]'

/** 铃铛：同一套 16px 网格与 1px 描边，墨迹范围与旁边宿主的图标相当。 */
const BELL_SVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2.9a3.6 3.6 0 0 0-3.6 3.6v2.2c0 1.4-.5 2.5-1.4 3.4h10c-.9-.9-1.4-2-1.4-3.4V6.5A3.6 3.6 0 0 0 8 2.9Z"/><path d="M6.6 12.3a1.4 1.4 0 0 0 2.8 0"/></svg>'

/** 我们自己的写入打上静音标记：宽观测听见它们时不再算一次页面变化，免得自激。 */
function quiet(node: HTMLElement) {
  node.setAttribute(QUIET_ATTR, '')
}

export function install(ctx: HostContext) {
  /** 铃铛的盒子；标题行重建或窄栏时会被摘下来，下一遍再挂回去。 */
  let actions: HTMLElement | null = null
  /** 铃铛本身。 */
  let trigger: HTMLButtonElement | null = null
  /** 等这一帧写。 */
  let cancelFrame: (() => void) | null = null

  /** 铃铛：按下换视图。 */
  function buildTrigger() {
    const button = buildElement('button', 'dsh-claude-active-shelf-trigger')
    button.type = 'button'
    button.setAttribute('aria-label', copy('toggleDateView'))
    quiet(button)
    const icon = buildElement('span', 'dsh-claude-active-shelf-trigger-icon')
    icon.innerHTML = BELL_SVG
    button.appendChild(icon)
    button.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      // 默认还是宿主的「工作区 + 会话」，按它才把整个列表换成按日期排列，再按一次换回去。
      document.dispatchEvent(new CustomEvent(DATE_VIEW_TOGGLE_EVENT))
    })
    return button
  }

  /**
   * 会话列表所在的分区标题行：标题行与列表区是同一个盒子下的两个兄弟，靠这条关系
   * 认它，不靠标题文字。窄栏里宿主不画标题，这一遍就返回 null，铃铛随之摘走。
   */
  const LIST_AREA_SELECTOR = '[data-dsh-claude-part~="list-area"]'
  function findSectionHeader(): HTMLElement | null {
    for (const header of headerWatch.all()) {
      const parent = header.parentElement
      if (parent === null || parent.querySelector(LIST_AREA_SELECTOR) === null) continue
      if (header.querySelector(SECTION_LABEL_SELECTOR) === null) continue
      return header
    }
    return null
  }

  /** 挂进「工作区」标题行的右端，插在宿主自己的两枚分区动作之前；没有这一行时摘走。 */
  function seatActions() {
    const header = findSectionHeader()
    if (header === null) {
      if (actions !== null && actions.parentElement !== null) actions.parentElement.removeChild(actions)
      return
    }
    if (actions === null) {
      actions = buildElement('div', 'dsh-claude-active-shelf-actions')
      quiet(actions)
      trigger = buildTrigger()
      actions.appendChild(trigger)
    }
    // 铃铛跟着日期视图的开关：那边关掉之后页面里没有会接它的人，这里也就不挂出来。
    const wanted = readPrefs().dateGroups !== false
    if (trigger !== null) {
      const bellStands = trigger.parentElement === actions
      if (wanted && !bellStands) actions.appendChild(trigger)
      if (!wanted && bellStands) actions.removeChild(trigger)
    }
    const hostActions = header.querySelector<HTMLElement>(SECTION_ACTIONS_SELECTOR)
    const stands = actions.parentElement === header &&
      (hostActions !== null ? actions.nextElementSibling === hostActions : actions === header.lastElementChild)
    if (stands) return
    if (hostActions !== null) header.insertBefore(actions, hostActions)
    else header.appendChild(actions)
  }

  /** 一遍：挂好铃铛，再让它说实话（按下态）。 */
  function pass() {
    seatActions()
    if (trigger === null) return
    const pressed = document.body.hasAttribute(DATE_VIEW_ATTRIBUTE) ? 'true' : 'false'
    if (trigger.getAttribute('aria-pressed') !== pressed) trigger.setAttribute('aria-pressed', pressed)
  }

  /** 等这一帧写：宿主的重建会连着来几次，攒到一帧里只做一遍。 */
  function schedule() {
    if (cancelFrame !== null) return
    cancelFrame = requestFrame({
      write() {
        cancelFrame = null
        pass()
      },
    })
  }

  /** 宿主的顶行会重建、列表的行会在列表之间搬：都只算侧栏里的变化，挂好再走一遍。 */
  const stopWatch = watchSidebar(schedule)
  /** 侧栏里的分区标题行，由总线按选择器维护（D40）：标题行重建时铃铛跟着重挂。 */
  const headerWatch = observeMatches<HTMLElement>(SECTION_HEADER_SELECTOR, schedule)
  // 日期视图那个开关变了：铃铛跟着挂上或摘下。
  const stopPrefs = subscribePrefs(() => schedule())

  pass()

  return () => {
    stopPrefs()
    stopWatch()
    headerWatch.release()
    if (cancelFrame !== null) cancelFrame()
    if (actions !== null && actions.parentElement !== null) actions.parentElement.removeChild(actions)
    trigger = null
    actions = null
  }
}
