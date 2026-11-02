import { SIDEBAR_TOGGLE_SELECTOR } from '@dsh-claude-style/contracts/dom'

import { DATE_VIEW_TOGGLE_EVENT } from '../date-groups/date-groups'
import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { buildElement } from '@dsh-claude-style/engine/dom'
import { QUIET_ATTR } from '../../constants'
import { watchSidebar } from '../../shared/sidebar-watch'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { cacheFirstMatch, findSidebarLogoRow, hostSessions } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'

/**
 * The sidebar's top row: the bell and the magnifier, in the order Codex draws them.
 *
 * 铃铛只做两件事：有会话在跑时亮一个小圆点，按下去把整个列表在「工作区 + 会话」和
 * 「按日期」之间换一次。会话本身留在列表里（跑着的并进「今天」），所以这里不再有
 * 单独一块「优先级」、也没有那张卡片 —— 读者要的就是「不单独出来」。
 *
 * 放大镜不自己打开任何东西，只按真正的主人：皮肤自己的搜索框，或者 `icon` 风格下
 * 宿主的搜索按钮（搜索特性已经接管它的 click），调色板的路由因此只有一份。
 *
 * 这一对装在皮肤自己的盒子里：宿主的顶行是两列网格，一枚额外的直接子节点会被挤到
 * 第二行去，一个盒子正好占一格；折叠成窄栏时那一行没有 brand，这一对就不挂。
 */

/** 有会话在跑：铃铛右上角的小圆点由这个属性点亮。 */
const RUNNING_ATTRIBUTE = 'data-active-shelf-running'
/** 日期视图开着：铃铛读它画按下态（无障碍也读它）。 */
const DATE_VIEW_ATTRIBUTE = 'data-dsh-claude-date-groups'
/** 皮肤自己的搜索框（features/search）：放大镜按它，按的就是原先那个宽框。 */
const SKIN_SEARCH_SELECTOR = '.dsh-claude-search-trigger'
/** 宿主自己的侧栏搜索按钮：搜索特性接管它的 click，`icon` 风格下没有皮肤自己的框。 */
const HOST_SEARCH_SELECTOR = '[data-dsh-claude-part~="search-button"]'
/** 宽顶行里的 brand：折叠成窄栏时它不在，那对图标也就没有座位。 */
const BRAND_SELECTOR = '[data-dsh-claude-part~="brand-button"]'

/** 铃铛：宿主顶行图标用的同一套 16px 网格。 */
const BELL_SVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2.3a3.5 3.5 0 0 1 3.5 3.5c0 2.5.6 3.5 1.1 4.1H3.4c.5-.6 1.1-1.6 1.1-4.1A3.5 3.5 0 0 1 8 2.3Z"/><path d="M6.6 12.1a1.5 1.5 0 0 0 2.8 0"/></svg>'
/** 放大镜：同一套网格，和铃铛读成一对。 */
const MAGNIFIER_SVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="M10.4 10.4 13.5 13.5"/></svg>'

/** 这个模块装到页面上：顶行那一对按钮。 */
/** 我们自己的写入打上静音标记：宽观测听见它们时不再算一次页面变化，免得自激。 */
function quiet(node: HTMLElement) {
  node.setAttribute(QUIET_ATTR, '')
}

export function install(ctx: HostContext) {
  /** 宿主的会话列表：圆点看的就是它的 `running`。 */
  const sessions = hostSessions(ctx)
  /** 那一对按钮的盒子；顶行重建或窄栏时会被摘下来，下一遍再挂回去。 */
  let actions: HTMLElement | null = null
  /** 铃铛本身。 */
  let trigger: HTMLButtonElement | null = null
  /** 等这一帧写。 */
  let cancelFrame: (() => void) | null = null

  /** 现在有几个会话在跑：圆点只关心「有没有」。 */
  function runningCount(): number {
    const snapshot = sessions === null ? null : sessions.list.getSnapshot()
    if (snapshot === undefined || snapshot === null || snapshot.phase === 'pending') return 0
    if (!Array.isArray(snapshot.ids)) return 0
    let count = 0
    for (const id of snapshot.ids) {
      const summary = snapshot.byId?.[id]
      if (summary !== undefined && summary !== null && summary.running === true) count += 1
    }
    return count
  }

  /** 铃铛：圆点 + 按下换视图。 */
  function buildTrigger() {
    const button = buildElement('button', 'dsh-claude-active-shelf-trigger')
    button.type = 'button'
    button.setAttribute('aria-label', '切换日期视图')
    quiet(button)
    const icon = buildElement('span', 'dsh-claude-active-shelf-trigger-icon')
    icon.innerHTML = BELL_SVG
    button.appendChild(icon)
    // 圆点：有会话在跑才点亮，不写条数。
    button.appendChild(buildElement('span', 'dsh-claude-active-shelf-count'))
    button.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      // 默认还是宿主的「工作区 + 会话」，按它才把整个列表换成按日期排列，再按一次换回去。
      document.dispatchEvent(new CustomEvent(DATE_VIEW_TOGGLE_EVENT))
    })
    return button
  }

  /** 铃铛右手的放大镜：只按真正打开调色板的那个控件。 */
  function buildSearchTrigger() {
    const button = buildElement('button', 'dsh-claude-active-shelf-search')
    button.type = 'button'
    button.setAttribute('aria-label', '搜索')
    quiet(button)
    const icon = buildElement('span', 'dsh-claude-active-shelf-search-icon')
    icon.innerHTML = MAGNIFIER_SVG
    button.appendChild(icon)
    button.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      const control = findSkinSearch() ?? findHostSearch()
      if (control !== null) control.click()
    })
    return button
  }

  /** 皮肤自己的搜索框先找，宿主的搜索按钮兜底。 */
  const findSkinSearch = cacheFirstMatch<HTMLElement>(SKIN_SEARCH_SELECTOR)
  const findHostSearch = cacheFirstMatch<HTMLElement>(HOST_SEARCH_SELECTOR)

  /** 把这一对挂进宿主的顶行：位置在收起按钮之前；窄栏（没有 brand）时摘走。 */
  function seatActions() {
    const row = findSidebarLogoRow()
    const wide = row !== null && row.querySelector(BRAND_SELECTOR) !== null
    if (row === null || !wide) {
      if (actions !== null && actions.parentElement !== null) actions.parentElement.removeChild(actions)
      return
    }
    if (actions === null) {
      actions = buildElement('div', 'dsh-claude-active-shelf-actions')
      quiet(actions)
      trigger = buildTrigger()
      actions.appendChild(trigger)
      actions.appendChild(buildSearchTrigger())
    }
    // 收起按钮就在刚读到的这一行里：从行上读，不再从文档上找（整文件的
    // document 查询只剩搜索按钮那两处 cacheFirstMatch）。
    const toggle = row.querySelector(SIDEBAR_TOGGLE_SELECTOR)
    const anchor = toggle !== null && toggle.parentElement === row ? toggle : null
    const stands = actions.parentElement === row && (anchor === null || actions.nextElementSibling === anchor)
    if (stands) return
    if (anchor !== null) row.insertBefore(actions, anchor)
    else row.appendChild(actions)
  }

  /** 一遍：挂好按钮，再让它说实话（圆点、按下态）。 */
  function pass() {
    seatActions()
    if (trigger === null) return
    const running = runningCount()
    const stamp = running > 0 ? 'true' : 'false'
    if (trigger.getAttribute(RUNNING_ATTRIBUTE) !== stamp) trigger.setAttribute(RUNNING_ATTRIBUTE, stamp)
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
  // 运行状态在会话快照里，页面本身可能一动不动。
  let unsubscribe: (() => void) | null = null
  if (sessions !== null && typeof sessions.list.subscribe === 'function') unsubscribe = sessions.list.subscribe(() => schedule())

  pass()

  return () => {
    if (unsubscribe !== null) unsubscribe()
    stopWatch()
    if (cancelFrame !== null) cancelFrame()
    if (actions !== null && actions.parentElement !== null) actions.parentElement.removeChild(actions)
    trigger = null
    actions = null
  }
}
